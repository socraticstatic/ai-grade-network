import { describe, it, expect, vi } from 'vitest';
import { cloudConnectTour, activeCloudConnectTour } from './cloudConnectTour';
import { readCopy } from '../../components/tour/ProductTour';
import { DEMO_BEATS } from '../demo/demoScript';
import { CC } from '../../engine';

/** A step's route may carry a query (`/govern?tab=groups`); the SECTION it
 *  belongs to is the path in front of it. */
const sectionOf = (route: string) => route.split('?')[0];

/** Sections in order of first appearance. */
function sections(): string[] {
  const seen: string[] = [];
  for (const step of cloudConnectTour) {
    const s = sectionOf(step.route);
    if (seen[seen.length - 1] !== s) seen.push(s);
  }
  return seen;
}

describe('cloudConnectTour', () => {
  /* The old form of this test compared step routes to DEMO_BEATS one for one,
     which forbade a second beat inside a section as much as it forbade a
     wrong section. The invariant that actually matters survives the groups
     thread: the tour visits the six demo sections in the demo's order and
     never leaves a section and comes back to it — a viewer is walked
     forward, never bounced.

     Four sections have joined since, each opening the leg whose subject it
     introduces (see the module doc): /tasks closes the estate leg, /naas/home
     opens the NaaS leg, /ai/keys and /ai/observe open the AI leg. Stated here
     as the exact expected list, so an accidental extra section still fails. */
  const EXPECTED_SECTIONS = [
    '/discover',
    '/tasks', // two beats: the queue, then the intent switch that controls
    '/naas/home',
    '/naas/connect',
    '/naas/govern',
    '/naas/observe',
    '/naas/cost',
    '/ai/keys',
    '/ai/observe',
    '/ai/govern',
  ];

  it('visits exactly the expected sections, in order, and never doubles back', () => {
    expect(sections()).toEqual(EXPECTED_SECTIONS);
  });

  /* The spine itself. The list above can be edited to anything; this asserts
     the property the list is supposed to preserve — every DEMO_BEATS section
     still appears, in the demo's own order, with the additions interleaved
     rather than reordering the arc. */
  it('keeps the six demo sections as a subsequence, in the demo’s order', () => {
    const visited = sections();
    let cursor = -1;
    for (const route of DEMO_BEATS.map(b => b.route)) {
      const next = visited.indexOf(route, cursor + 1);
      expect(next, `demo section ${route} is missing or out of order`).toBeGreaterThan(cursor);
      cursor = next;
    }
  });

  it('does not route to /netops (dropped from the MVP demo arc)', () => {
    expect(cloudConnectTour.map(s => sectionOf(s.route))).not.toContain('/netops');
  });

  it('binds the cost step title/description to the cost DEMO_BEAT', () => {
    const costStep = cloudConnectTour.find(s => sectionOf(s.route) === '/naas/cost');
    const costBeat = DEMO_BEATS.find(b => b.route === '/naas/cost')!;
    expect(costStep).toBeDefined();
    expect(costStep!.title).toBe(costBeat.title);
    expect(readCopy(costStep!.description)).toBe(costBeat.narration);
    expect(costStep!.targetSelector).toBe('[data-tour="cost-hero"]');
  });

  it('gives every step an id, a title, copy and a target', () => {
    const ids = cloudConnectTour.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of cloudConnectTour) {
      expect(s.title.length, `step ${s.id} has no title`).toBeGreaterThan(0);
      expect(readCopy(s.description).length, `step ${s.id} has no copy`).toBeGreaterThan(0);
      expect(s.targetSelector, `step ${s.id} points at nothing`).toBeTruthy();
    }
  });

  /* --------------------------- the groups thread --------------------------- */

  const beat = (id: string) => cloudConnectTour.find(s => s.id === id)!;

  it('narrates the whole groups arc, not just the existence of groups', () => {
    for (const id of ['discover-sites', 'govern-groups', 'group-policy']) {
      expect(beat(id), `missing beat "${id}"`).toBeTruthy();
    }
    // Discover names it; Govern reads it back; Policies writes it into a rule.
    expect(sectionOf(beat('discover-sites').route)).toBe('/discover');
    expect(beat('govern-groups').route).toBe('/naas/govern?tab=groups');
    expect(beat('group-policy').route).toBe('/naas/govern?tab=policies');
  });

  it('threads the groups beats inside the arc rather than appending them', () => {
    const at = (id: string) => cloudConnectTour.findIndex(s => s.id === id);
    // Naming happens while looking at the sites, before anything is attached.
    expect(at('discover-sites')).toBeLessThan(at('connect'));
    // The payoff lands before Cost and AI Fabric close the story.
    expect(at('group-policy')).toBeLessThan(at('cost'));
    expect(at('group-policy')).toBeLessThan(at('ai-fabric'));
  });

  it('makes the group beats DO something, not merely point', () => {
    expect(beat('discover-sites').action).toBeTruthy();
    expect(beat('group-policy').action).toBeTruthy();
  });

  /* Figures. A beat that says "12 flows" as literal copy is wrong the moment
     the estate moves — and the beats before this one move it deliberately. */
  it('derives every figure it speaks from the engine, at the moment it is shown', () => {
    const sitesCopy = beat('discover-sites').description;
    const policyCopy = beat('group-policy').description;
    expect(typeof sitesCopy, 'sites copy is frozen at module load').toBe('function');
    expect(typeof policyCopy, 'policy copy is frozen at module load').toBe('function');

    expect(readCopy(sitesCopy)).toContain(String((CC.branches as unknown[]).length));

    const dry = CC.dryRun({
      src: { group: 'all-branch-sites' },
      dst: { group: 'west-workloads' },
      ports: 'any',
      action: 'allow',
      chain: [],
    }) as { matched: unknown[]; gbps: number };
    const text = readCopy(policyCopy);
    expect(text).toContain(String(dry.matched.length));
    expect(text).toContain(String(dry.gbps));
  });

  /* THE REHEARSAL CASE, at the unit level. addGroup returns null on a
     duplicate id and addRule appends without deduping, so a second click of
     either action is where a naive implementation breaks. */
  it('is idempotent: running both mutating beats twice changes nothing the second time', () => {
    const ids = () => (CC.groupList() as { id: string }[]).map(g => g.id).sort();
    const names = () => (CC.ruleList() as { name: string }[]).map(r => r.name).sort();

    beat('discover-sites').action!.onClick();
    beat('group-policy').action!.onClick();
    const afterFirst = { groups: ids(), rules: names() };

    expect(afterFirst.groups).toContain('all-branch-sites');
    expect(afterFirst.rules.filter(n => /branch sites/i.test(n))).toHaveLength(1);

    beat('discover-sites').action!.onClick();
    beat('group-policy').action!.onClick();

    expect(ids()).toEqual(afterFirst.groups);
    expect(names()).toEqual(afterFirst.rules);
  });

  it('leaves the rule it authored enforced, and resolving to real objects', () => {
    // depends on the beat above having run — same file, same engine singleton.
    const rule = (CC.ruleList() as { id: string; name: string }[]).find(r =>
      /branch sites/i.test(r.name),
    )!;
    expect(rule).toBeTruthy();
    expect(CC.ruleEnforced(rule)).toBe(true);

    const resolved = CC.resolveGroup('all-branch-sites') as {
      branchIds: string[];
      vpcIds: string[];
      count: number;
    };
    expect(resolved.count).toBe((CC.branches as unknown[]).length);
    // kind:'site' — a site group must never absorb a VPC.
    expect(resolved.vpcIds).toEqual([]);
  });
});

/* --------------------------- review-fix regression tests --------------------------- */

describe('cloudConnectTour — review fixes', () => {
  const beat = (id: string) => cloudConnectTour.find(s => s.id === id)!;

  it('derives "spanning N clouds" from resolveGroup(west-workloads), not a hardcoded figure', () => {
    const original = CC.resolveGroup.bind(CC);
    const real = original('west-workloads') as { vpcIds: string[] };

    // A fake resolution confined to AWS vpcs only. If the copy still says
    // "spanning three clouds" against this fake, it isn't reading
    // resolveGroup at all — it's a literal.
    const regions = CC.regions as Record<string, { id: string }[]>;
    const vpcsByRegion = CC.vpcs as Record<string, { id: string }[]>;
    const awsVpcIds = new Set(
      (regions.aws || []).flatMap(r => (vpcsByRegion[r.id] || []).map(v => v.id)),
    );
    const awsOnly = real.vpcIds.filter(id => awsVpcIds.has(id));
    expect(awsOnly.length, 'fixture needs at least one AWS vpc in west-workloads').toBeGreaterThan(0);

    const spy = vi.spyOn(CC, 'resolveGroup').mockImplementation((id: string) =>
      id === 'west-workloads'
        ? { vpcIds: awsOnly, branchIds: [], cidrs: [], count: awsOnly.length }
        : original(id),
    );
    try {
      const text = readCopy(beat('group-policy').description);
      expect(text).toMatch(/spanning 1 cloud\b/);
      expect(text).not.toContain('spanning three clouds');
    } finally {
      spy.mockRestore();
    }
  });

  it('splits the live-resolution claim from "All branch sites" — attaches it to the predicate group instead', () => {
    const text = readCopy(beat('govern-groups').description);
    // The claim belongs to West workloads (a predicate group), not to the
    // hand-picked sites group.
    expect(text).toMatch(/West workloads.*predicate/i);
    // "All branch sites" is described as a picked set, not as something
    // that re-resolves on its own.
    expect(text).toMatch(/All branch sites.*you named it/i);
  });

  it('says "in Discover", not a positional "N beats ago"', () => {
    const text = readCopy(beat('govern-groups').description);
    expect(text).toContain('in Discover');
    expect(text).not.toMatch(/beats? ago/i);
  });

  it('ensurePayoffRule never calls addRule when west-workloads is missing — guards before authoring rather than relying on the discarded null', () => {
    const savedWest = (CC._ as { groups: Record<string, unknown> }).groups['west-workloads'];
    expect(savedWest, 'west-workloads must be seeded for this test to mean anything').toBeTruthy();

    // Clear out any payoff rule left by earlier tests so ensurePayoffRule
    // takes the "author a new rule" branch, not "re-enforce the existing
    // one" — the branch where the discarded addRule() return lives.
    const existingPayoff = (CC.ruleList() as { id: string; name: string }[]).find(
      r => /branch sites/i.test(r.name) && /west workloads/i.test(r.name),
    );
    if (existingPayoff) CC.removeRule(existingPayoff.id);

    const addRuleSpy = vi.spyOn(CC, 'addRule');
    try {
      delete (CC._ as { groups: Record<string, unknown> }).groups['west-workloads'];
      expect(() => beat('group-policy').action!.onClick()).not.toThrow();
      expect(addRuleSpy).not.toHaveBeenCalled();
    } finally {
      (CC._ as { groups: Record<string, unknown> }).groups['west-workloads'] = savedWest;
      addRuleSpy.mockRestore();
    }

    // Restored: the same click now succeeds without throwing.
    expect(() => beat('group-policy').action!.onClick()).not.toThrow();
  });

  it('self-heals: reading govern-groups or group-policy never reports the sites group as empty, even if it was never named', () => {
    const savedSites = (CC._ as { groups: Record<string, unknown> }).groups['all-branch-sites'];
    try {
      delete (CC._ as { groups: Record<string, unknown> }).groups['all-branch-sites'];

      const govText = readCopy(beat('govern-groups').description);
      expect(govText).not.toMatch(/All branch sites.*holds 0\b/);

      // group-policy's thunk self-heals independently of govern-groups above.
      delete (CC._ as { groups: Record<string, unknown> }).groups['all-branch-sites'];
      const policyText = readCopy(beat('group-policy').description);
      const figures = policyText.match(/\bmatches (\d+) modelled flows/);
      expect(figures, 'no dry-run figure found in the payoff beat').toBeTruthy();
      expect(Number(figures![1])).toBeGreaterThan(0);
    } finally {
      if (savedSites) {
        (CC._ as { groups: Record<string, unknown> }).groups['all-branch-sites'] = savedSites;
      }
    }
  });

  it('does not instruct a gesture the action never performs ("tick the ones that belong together")', () => {
    const text = readCopy(beat('discover-sites').description);
    expect(text).not.toMatch(/tick the ones/i);
  });

  it('does not claim the viewer wrote the rule sentence by clicking a button', () => {
    const text = readCopy(beat('group-policy').description);
    expect(text).not.toMatch(/sentence you wrote/i);
  });

  it('beat 4 (govern) foreshadows that the rule grammar widens from tag to name, so beat 5 does not contradict it', () => {
    const govText = readCopy(beat('govern').description);
    expect(govText).toMatch(/FROM a tag.*name/i);
  });
});

/* ------------------- this week's surfaces: four new beats ------------------- */

describe('cloudConnectTour — assessment, intents, Andi, Insights', () => {
  const at = (id: string) => cloudConnectTour.findIndex(s => s.id === id);
  const beat = (id: string) => cloudConnectTour.find(s => s.id === id)!;

  it('threads each surface where the arc carries its subject, not onto the end', () => {
    // The assessment answers the question the Discover opener raises.
    expect(at('assessment')).toBe(at('discover') + 1);
    // Intents follow naming: you named what you have, now declare what must
    // stay true of it. Andi follows intents, because the intents band's own
    // empty state says "tell Andi the outcome you want".
    expect(at('intents')).toBe(at('discover-sites') + 1);
    expect(at('andi')).toBe(at('intents') + 1);
    // All three land before anything attaches.
    expect(at('andi')).toBeLessThan(at('connect'));
    // Insights opens the AI leg; the token-policy close stays the close.
    expect(at('insights')).toBe(cloudConnectTour.length - 2);
    expect(cloudConnectTour[cloudConnectTour.length - 1].id).toBe('ai-fabric');
  });

  it('anchors each beat to a surface that renders without preconditions', () => {
    expect(beat('intents').targetSelector).toBe('[data-testid="intent-threads"]');
    expect(beat('andi').targetSelector).toBe('[data-testid="andi-toggle"]');
    expect(beat('assessment').targetSelector).toBe('[data-testid="assessment-banner"]');
    expect(beat('insights').targetSelector).toBe('[data-tour="insights-kpis"]');
    expect(beat('insights').route).toBe('/ai/observe');
  });

  it('the new beats point, never mutate — no action, and no thunk, because none of them speaks a figure', () => {
    for (const id of ['assessment', 'intents', 'andi', 'insights', 'twin', 'tasks', 'layer-home', 'proposals', 'gateway']) {
      expect(beat(id).action, `${id} must not mutate the estate`).toBeUndefined();
      expect(typeof beat(id).description, `${id} speaks no figure`).toBe('string');
    }
  });

  /* The e2e position guard (tour.spec.ts) treats every beat whose text says
     "group" as part of the groups thread, and exempts only the FINAL beat
     from its placement rule. Insights sits one before the final beat, so the
     word would put it exactly on the boundary the guard exists to catch. */
  it('keeps the word "group" out of the insights beat', () => {
    const text = beat('insights').title + ' ' + readCopy(beat('insights').description);
    expect(text).not.toMatch(/\bgroup/i);
  });

  /* The skip mechanism. The assessment banner is the one anchor that can be
     absent for good (stage 'closed'); its beat must leave the run rather
     than spotlight nothing. */
  it('drops the assessment beat — and only it — when the assessment is closed', () => {
    expect(activeCloudConnectTour().map(s => s.id)).toEqual(cloudConnectTour.map(s => s.id));

    const spy = vi
      .spyOn(CC, 'assessment')
      .mockReturnValue({ stage: 'closed', day: 14, startedAt: null });
    try {
      const active = activeCloudConnectTour().map(s => s.id);
      expect(active).not.toContain('assessment');
      expect(active).toEqual(cloudConnectTour.map(s => s.id).filter(id => id !== 'assessment'));
    } finally {
      spy.mockRestore();
    }
  });

  /* The dismissal inference. A missing banner only means "dismissed" when
     the Discover surface is actually rendered — /discover is a lazy route,
     and at launch time its chunk may not have mounted yet. The intents band
     is the always-present sibling that proves the page is really there. */
  it('keeps the assessment beat when Discover is not mounted, drops it only when Discover renders without the banner', () => {
    const ids = () => activeCloudConnectTour().map(s => s.id);
    try {
      // Discover rendered, banner dismissed: the beat leaves the run.
      document.body.innerHTML = '<section data-testid="intent-threads"></section>';
      expect(ids()).not.toContain('assessment');

      // Discover rendered with the banner: the beat runs.
      document.body.innerHTML =
        '<div data-testid="assessment-banner"></div><section data-testid="intent-threads"></section>';
      expect(ids()).toContain('assessment');

      // Nothing of Discover in the DOM (lazy chunk not mounted, or another
      // page): navigation will remount it fresh, so the beat stays in.
      document.body.innerHTML = '';
      expect(ids()).toContain('assessment');
    } finally {
      document.body.innerHTML = '';
    }
  });

  it('speaks the shipped vocabulary: 14 days, the three intent verdicts, drafts-never-commits, the sankey', () => {
    expect(readCopy(beat('assessment').description)).toMatch(/14 days/);
    expect(readCopy(beat('assessment').description)).toMatch(/nothing is blocked or routed/i);
    expect(readCopy(beat('intents').description)).toMatch(/aligned, drifting, or violated/i);
    expect(readCopy(beat('andi').description)).toMatch(/drafts, never commits/i);
    expect(readCopy(beat('insights').description)).toMatch(/derives from the engine/i);
    expect(readCopy(beat('insights').description)).toMatch(/sankey/i);
  });

  /* The claim the product removed from itself and the tour kept telling.
     steerFlow and setTokenPolicy push no undo entry (isUndoCovered,
     stackFigures.ts), which is why StackPanel's commit banner states
     coverage per commit instead of promising it. A tour that promises
     blanket undo is a demo that gets contradicted live. */
  it('never promises that Undo covers every committed move', () => {
    for (const step of cloudConnectTour) {
      const text = readCopy(step.description);
      expect(
        text,
        `beat "${step.id}" promises blanket undo coverage`,
      ).not.toMatch(/undo covers every|undo reverts every|undo (?:covers|reverts) (?:all|any) (?:change|move)/i);
    }
  });
});

/* -------------------- the twin, tasks, layer Home, proposals, the gateway --------------------

   Five surfaces shipped after the demo arc was written and after the last
   tour refresh: the design tray on the twin, the /tasks office, the layer
   Home widget boards, Andi's proposal band on Govern, and the AI gateway's
   identity rail. Each is asserted by POSITION as well as presence — the whole
   argument in the module doc is about where they sit, and "the beat exists"
   would pass a version that bolted all five onto the end. */

describe('cloudConnectTour — the twin, Tasks, layer Home, proposals, the gateway', () => {
  const at = (id: string) => cloudConnectTour.findIndex(s => s.id === id);
  const beat = (id: string) => cloudConnectTour.find(s => s.id === id)!;

  it('carries a beat for every one of them', () => {
    for (const id of ['twin', 'tasks', 'layer-home', 'proposals', 'gateway']) {
      expect(beat(id), `missing beat "${id}"`).toBeTruthy();
    }
  });

  it('closes the estate leg with the twin then Tasks, before any layer opens', () => {
    // Andi ends on "drafts, never commits"; the twin is that sentence's surface.
    expect(at('twin')).toBe(at('andi') + 1);
    // Tasks is the accumulation of what the twin beat just explained.
    expect(at('tasks')).toBe(at('twin') + 1);
    // Both land before a layer is entered at all.
    expect(at('tasks')).toBeLessThan(at('layer-home'));
    expect(sectionOf(beat('twin').route)).toBe('/discover');
    expect(beat('tasks').route).toBe('/tasks');
  });

  it('opens the NaaS leg on Home, because that is what picking a layer does', () => {
    expect(beat('layer-home').route).toBe('/naas/home');
    expect(at('layer-home')).toBe(at('connect') - 1);
  });

  it('puts the proposal band above the rules table, and before the beat that drains it', () => {
    expect(beat('proposals').route).toBe('/naas/govern');
    // Before `govern`, whose action enforces pol-insp and retires the finding
    // behind one of the rows this beat is pointing at.
    expect(at('proposals')).toBeLessThan(at('govern'));
    expect(at('proposals')).toBeGreaterThan(at('connect'));
  });

  it('opens the AI leg on identity, before evidence and before governance', () => {
    expect(beat('gateway').route).toBe('/ai/keys');
    expect(at('gateway')).toBeLessThan(at('insights'));
    expect(at('insights')).toBeLessThan(at('ai-fabric'));
  });

  it('anchors each beat to something that renders without a precondition — or carries a `when`', () => {
    // The twin's toggle, not its tray: the tray exists only while moves are staged.
    expect(beat('twin').targetSelector).toBe('[data-testid="design-toggle"]');
    // The Tasks header, not the queue: the queue is swapped for an empty state.
    expect(beat('tasks').targetSelector).toBe('[data-tour="tasks-office"]');
    expect(beat('layer-home').targetSelector).toBe('[data-tour="layer-board"]');
    expect(beat('gateway').targetSelector).toBe('[data-testid="keys-table"]');
    // The one that genuinely can be absent declares itself skippable.
    expect(beat('proposals').targetSelector).toBe('[data-testid="proposal-band"]');
    expect(typeof beat('proposals').when, 'the proposals beat can be dead; it needs a `when`').toBe('function');
  });

  it('drops the proposals beat once no active finding names an unenforced rule', () => {
    expect(activeCloudConnectTour().map(s => s.id)).toContain('proposals');

    // Every finding resolved: the band is replaced by its one-line empty
    // state, and a beat pointing at the band would spotlight nothing.
    const spy = vi.spyOn(CC, 'threatFindings').mockReturnValue([]);
    try {
      const active = activeCloudConnectTour().map(s => s.id);
      expect(active).not.toContain('proposals');
      // …and nothing else leaves with it.
      expect(active).toEqual(cloudConnectTour.map(s => s.id).filter(id => id !== 'proposals'));
    } finally {
      spy.mockRestore();
    }
  });

  it('speaks each surface in its own shipped vocabulary', () => {
    // The three tray controls, by their real labels.
    const twin = readCopy(beat('twin').description);
    expect(twin).toMatch(/design on the twin/i);
    expect(twin).toMatch(/share proposal/i);
    expect(twin).toMatch(/commit to the estate/i);

    /* Tasks: state not a place, one queue, stage-grouped, commits elsewhere.
       The "commits elsewhere" claim is scoped to the QUEUE ROWS on purpose —
       the standing-intents band below them renders in manage mode on this
       page, and its Watch/Enforce switch applies a control on the spot. A
       blanket "nothing commits on this page" is false here. */
    const tasks = readCopy(beat('tasks').description);
    expect(tasks).toMatch(/lifecycle stage/i);
    expect(tasks).toMatch(/no row commits from here/i);
    expect(tasks, 'the page-wide claim is false — the intent switch commits a control')
      .not.toMatch(/nothing commits on this page/i);

    // The IA claim the nav actually implements.
    const home = readCopy(beat('layer-home').description);
    expect(home).toMatch(/connect, govern, observe, cost/i);
    expect(home).toMatch(/layers across, lifecycle down/i);

    // The proposal band's own loop: detect, then prevent, and retire itself.
    const proposals = readCopy(beat('proposals').description);
    expect(proposals).toMatch(/enforce it/i);
    expect(proposals).toMatch(/tighten it/i);
    expect(proposals).toMatch(/retires itself/i);

    // A virtual key is an identity with scopes.
    expect(readCopy(beat('gateway').description)).toMatch(/scopes/i);

    // Token-policy authoring reached the close.
    const close = readCopy(beat('ai-fabric').description);
    expect(close).toMatch(/new policy/i);
    expect(close).toMatch(/stages? it on the twin/i);
  });

  /* ------------------------ controlling by intent ------------------------

     Declaring an intent and controlling by one are two decisions in the
     product, and the tour showed only the first: the Discover band the
     `intents` beat points at is the `manage={false}` render, which has no
     mode switch on it at all. */

  it('carries a beat for arming an intent, on the render that actually has the switch', () => {
    expect(beat('intent-control'), 'nothing in the tour arms an intent').toBeTruthy();
    // /tasks, not /discover — StackPanel passes manage={false}.
    expect(beat('intent-control').route).toBe('/tasks');
    expect(beat('intent-control').targetSelector).toBe('[data-testid="intent-threads"]');
    // Declaring comes first, on Discover; controlling follows the queue.
    expect(at('intents')).toBeLessThan(at('intent-control'));
    expect(at('intent-control')).toBe(at('tasks') + 1);
  });

  it('separates watch from enforce, and does not claim arming is the machine committing', () => {
    const text = readCopy(beat('intent-control').description);
    expect(text).toMatch(/watch mode/i);
    // Phrased about any declared intent, never "its row" — the Next-only path
    // looks at an empty band. Guarded end to end in tour.spec.ts too.
    expect(text).not.toMatch(/\b(?:its|the) row\b/i);
    // The counterfactual watch mode actually reports.
    expect(text).toMatch(/would have denied/i);
    // The standing control, and what Armed actually means.
    expect(text).toMatch(/standing control/i);
    expect(text).toMatch(/denies nothing on budget/i);
    /* Verified against the running app: arming sets `enforced` and makes the
       cap cover the tag in the same click, so the pill goes Draft → Enforcing
       and never shows Armed on this path. Copy claiming that transition is a
       demo that gets contradicted on screen. */
    expect(text, 'the pill never passes through Armed on this path').not.toMatch(/armed to enforcing/i);
    // The law the engine states about itself: enforce mode applies standing
    // controls only; repairs stay moves for the twin's tray.
    expect(text).toMatch(/repairs still stage/i);
  });

  it('arms an intent when clicked, and is idempotent across rehearsals', () => {
    const caps = () =>
      (CC.intentList() as { key: string; mode: string; scope: { id: string } }[])
        .filter(i => i.key === 'cap-token-spend');

    expect(caps()).toHaveLength(0);

    beat('intent-control').action!.onClick();
    const first = caps();
    expect(first, 'no cap intent was declared').toHaveLength(1);
    expect(first[0].mode, 'the intent was declared but never armed').toBe('enforce');

    // Twice more — declareIntent dedupes on (key, scope) and setIntentMode is
    // a no-op on the mode it already holds, but the tour is the thing a person
    // clicks over and over, so this is asserted rather than assumed.
    beat('intent-control').action!.onClick();
    beat('intent-control').action!.onClick();
    expect(caps()).toHaveLength(1);
    expect(caps()[0].mode).toBe('enforce');
    expect(caps()[0].scope.id).toBe(first[0].scope.id);
  });

  it('arms a tag the engine actually meters, and the arming reaches the token policy', () => {
    // depends on the beat above having run — same file, same engine singleton.
    const cap = (CC.intentList() as { key: string; scope: { id: string } }[])
      .find(i => i.key === 'cap-token-spend')!;
    const metered = (CC.tokenMeterList() as { tag: string }[]).map(m => m.tag);
    expect(metered, 'the cap is scoped to a tag the engine does not meter').toContain(cap.scope.id);

    // The standing control cap-token-spend applies is the policy's enforced
    // flag — this is what turns that row's pill from Armed to Enforcing.
    const pol = (CC.tokenPolicyList() as { tag: string; enforced: boolean }[])
      .find(p => p.tag === cap.scope.id);
    expect(pol, 'the armed identity has no token policy to control').toBeTruthy();
    expect(pol!.enforced, 'arming the intent did not apply the standing control').toBe(true);

    // …and the gate agrees an enforce-mode cap now covers this tag.
    expect(CC.intentCapEnforced(cap.scope.id)).toBe(true);
  });

  /* The e2e position guard treats any beat whose text says "group" as part of
     the groups thread and exempts only the FINAL beat. `gateway` and
     `insights` are the two beats nearest that boundary. */
  it('keeps the word "group" out of the two beats before the close', () => {
    for (const id of ['gateway', 'insights']) {
      const text = beat(id).title + ' ' + readCopy(beat(id).description);
      expect(text, `beat "${id}" joins the groups thread by accident`).not.toMatch(/\bgroup/i);
    }
  });
});
