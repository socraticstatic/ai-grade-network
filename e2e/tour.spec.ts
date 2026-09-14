import { test, expect, type Page } from '@playwright/test';

/* The guided tour is the one artifact built to show the product off, and it
   is the thing a person clicks REPEATEDLY while rehearsing. Two properties
   matter and neither is provable by reading the step array:

   1. No dead beat. A step whose target is not in the DOM when its turn comes
      still renders a tooltip — ProductTour just falls back to a flat dark
      overlay. The spotlight cutout is the only thing that proves the target
      was actually found, so it is what this spec asserts, once per step.

   2. It survives a second run in the same session. Beats that mutate must be
      idempotent: the second pass must not fail, and must not leave a
      duplicate group or a duplicate rule behind. */

const TOUR_LAUNCH = /start guided tour/i;

async function firstVisit(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  // A genuine first visit may open a demo modal. Close whichever is present
  // rather than pre-seeding flags to hide it. The tour launcher's own button
  // is excluded — that is the thing under test.
  const btn = page.getByRole('button', {
    name: /^(skip|skip tour|close|got it|maybe later|no thanks)$/i,
  });
  while (await btn.first().isVisible().catch(() => false)) {
    await btn.first().click();
    await page.waitForTimeout(150);
  }
  await page.keyboard.press('Escape').catch(() => {});
}

interface Beat {
  title: string;
  /** Everything the beat puts on screen: title, copy and action label. */
  text: string;
}

/** Walks the tour end to end, clicking each beat's action when it has one.
 *  Returns every beat, in order. */
async function runTour(page: Page): Promise<Beat[]> {
  await page.getByRole('button', { name: TOUR_LAUNCH }).click();

  const counter = page.getByTestId('tour-progress');
  await expect(counter).toBeVisible();
  const total = Number(/of (\d+)/.exec((await counter.textContent()) ?? '')![1]);
  expect(total).toBeGreaterThan(0);

  const beats: Beat[] = [];
  for (let i = 1; i <= total; i++) {
    await expect(counter).toHaveText(`Step ${i} of ${total}`);

    /* The proof that this beat is not dead. The cutout renders only when
       document.querySelector(step.targetSelector) returned an element on
       the route the step navigated to. */
    await expect(page.getByTestId('tour-spotlight')).toBeVisible();

    beats.push({
      title: ((await page.getByTestId('tour-title').textContent()) ?? '').trim(),
      text: (await page.getByTestId('tour-tooltip').innerText()) ?? '',
    });

    const action = page.getByTestId('tour-action');
    if (await action.count()) await action.click();

    await page
      .getByRole('button', { name: i === total ? /^finish$/i : /^next$/i })
      .click();
  }

  // Finishing closes the tour.
  await expect(page.getByTestId('tour-progress')).toHaveCount(0);
  return beats;
}

/** Walks the tour end to end pressing only Next — never clicking a beat's
 *  action. This is the path the existing `runTour` helper can't see: it
 *  clicks every action, so it can't catch a beat that narrates something
 *  that never happened because no action ever ran. */
async function runTourNextOnly(page: Page): Promise<Beat[]> {
  await page.getByRole('button', { name: TOUR_LAUNCH }).click();

  const counter = page.getByTestId('tour-progress');
  await expect(counter).toBeVisible();
  const total = Number(/of (\d+)/.exec((await counter.textContent()) ?? '')![1]);
  expect(total).toBeGreaterThan(0);

  const beats: Beat[] = [];
  for (let i = 1; i <= total; i++) {
    await expect(counter).toHaveText(`Step ${i} of ${total}`);
    await expect(page.getByTestId('tour-spotlight')).toBeVisible();

    beats.push({
      title: ((await page.getByTestId('tour-title').textContent()) ?? '').trim(),
      text: (await page.getByTestId('tour-tooltip').innerText()) ?? '',
    });

    // Deliberately never click tour-action — this is the skip path.
    await page
      .getByRole('button', { name: i === total ? /^finish$/i : /^next$/i })
      .click();
  }

  await expect(page.getByTestId('tour-progress')).toHaveCount(0);
  return beats;
}

const groupBeatsIn = (beats: Beat[]) => beats.filter(b => /\bgroup/i.test(b.text));

interface Grp { id: string }
interface Rl { id: string; name: string }
interface Itn { id: string; key: string; mode: string; scope: { id: string } }
interface Pol { tag: string; enforced: boolean }
type Win = {
  CC: {
    groupList: () => Grp[];
    ruleList: () => Rl[];
    ruleEnforced: (r: Rl) => boolean;
    resolveGroup: (id: string) => { count: number };
    intentList: () => Itn[];
    tokenPolicyList: () => Pol[];
    intentCapEnforced: (tag: string) => boolean;
  };
};

const groupIds = (page: Page) =>
  page.evaluate(() => (window as unknown as Win).CC.groupList().map(g => g.id));

const ruleNames = (page: Page) =>
  page.evaluate(() => (window as unknown as Win).CC.ruleList().map(r => r.name));

/** Every declared intent as `key:scope:mode`, so a rehearsal that declared a
 *  second copy, or left one un-armed, is visible as a changed multiset. */
const intentKeys = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as Win).CC.intentList().map(i => `${i.key}:${i.scope.id}:${i.mode}`),
  );

test('the tour teaches groups, and every beat finds its target', async ({ page }) => {
  await firstVisit(page);

  const groupsBefore = await groupIds(page);
  expect(groupsBefore).not.toContain('all-branch-sites');

  const beats = await runTour(page);

  /* The arc the feature exists for has to be NARRATED across the tour, not
     compressed into one aside: naming a set in Discover, reading it back in
     Govern, and writing that name into a policy are three distinct beats. */
  const groupBeats = groupBeatsIn(beats);
  expect(
    groupBeats.length,
    `groups are narrated by too few beats; titles were: ${beats.map(b => b.title).join(' | ')}`,
  ).toBeGreaterThanOrEqual(3);

  /* …and they are spread through the arc rather than bolted onto the end.

     ONE deliberate exception: the FINAL beat (ai-fabric) names the group on
     purpose — the stakeholder ask is that the grouping vocabulary reaches
     the token layer, and the closing beat says so out loud. So the final
     beat is exempt from the position guard, and ONLY the final beat: a
     group beat landing at beats.length - 2 is still the bolted-on-epilogue
     failure this assertion exists to catch. */
  const idx = groupBeats.map(b => beats.indexOf(b));
  const threadIdx = idx.filter(i => i !== beats.length - 1);
  expect(Math.min(...threadIdx), 'the groups thread starts too late').toBeLessThan(3);
  expect(Math.max(...threadIdx), 'the groups thread runs past the close').toBeLessThan(beats.length - 2);

  // The exception is load-bearing, not vestigial: the closing beat MUST be
  // a group beat — grouping reaching the AI Fabric is part of the close,
  // visible to this guard rather than phrased around it.
  expect(idx, 'the closing beat no longer names the group').toContain(beats.length - 1);
  expect(beats[beats.length - 1].text).toContain('west-workloads');

  // The payoff beat states its dry-run in figures, and they are not zero.
  const payoffBeat = groupBeats.find(b => /dry-run/i.test(b.text))!;
  expect(payoffBeat, 'no beat dry-runs the group policy').toBeTruthy();
  const figures = payoffBeat.text.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
  expect(figures.some(f => Number(f) > 0)).toBe(true);

  // …and the beats DID something. A beat that only points is weaker.
  expect(await groupIds(page)).toContain('all-branch-sites');

  const resolved = await page.evaluate(
    () => (window as unknown as Win).CC.resolveGroup('all-branch-sites').count,
  );
  expect(resolved).toBeGreaterThan(0);

  const names = await ruleNames(page);
  const payoff = names.filter(n => /branch sites/i.test(n) && /west workloads/i.test(n));
  expect(payoff, `no group-to-group rule authored; rules were: ${names.join(' | ')}`)
    .toHaveLength(1);

  const enforced = await page.evaluate(() => {
    const CC = (window as unknown as Win).CC;
    const r = CC.ruleList().find(x => /branch sites/i.test(x.name))!;
    return CC.ruleEnforced(r);
  });
  expect(enforced).toBe(true);
});

/* THE OVERLAP CASE. Every beat asks for `placement: 'top'`, and every one of
   them used to render at `top: 16` — squarely over the cutout it was supposed
   to sit above. The tooltip runs 314–456px tall and the old code centred each
   target in the viewport, which leaves ~316px clear on either side of it, so
   the on-screen clamp fired on every beat regardless of how big the target was.

   The assertion is deliberately not one flat number. A beat whose target and
   tooltip both fit the viewport has NO excuse for any overlap at all, and that
   is asserted exactly. A beat pointing at something taller than the viewport
   can spare has nowhere clean to put the tooltip — the cutout covers the whole
   screen — so what is asserted there is that the tooltip went as far away as
   the viewport allows: pinned to an edge, and off the majority of the
   spotlight. A single `< 0.5` would pass on beats that should be at zero.

   And EVERY beat, oversized or not, has to keep its spotlight on screen. That
   is not a given: the tooltip is placed to minimise how much of the spotlight
   it covers, and a target scrolled clean off the page covers nothing — so an
   objective that only counted overlap would happily push the spotlight into
   the void and score it perfect. The visibility floor below is what caught
   exactly that during the fix (two Discover beats whose targets load far below
   the fold were being left there). */

const VIEWPORT_MARGIN = 16;
/** Loosest overlap tolerated on a beat whose target cannot share the viewport
 *  with the tooltip. Pre-fix those beats measured 0.16–0.34; they now measure
 *  0.05–0.16. The ceiling sits above the worst survivor — the AI Fabric close,
 *  whose `/ai/govern` page has only ~126px of scroll, so its 366px spotlight
 *  and 418px tooltip cannot be prised apart further than 0.162 — while staying
 *  far below the ~0.3+ a genuine "tooltip parked over the middle" regression
 *  would produce. */
const UNAVOIDABLE_OVERLAP_MAX = 0.2;
/** Every spotlight must keep at least this many pixels on screen (or all of it,
 *  if it is shorter). Guards the off-screen-target regression the overlap
 *  objective is blind to. */
const MIN_SPOTLIGHT_VISIBLE_PX = 120;

interface Box { x: number; y: number; width: number; height: number }

function overlapFraction(spot: Box, tip: Box): number {
  const w = Math.max(0, Math.min(spot.x + spot.width, tip.x + tip.width) - Math.max(spot.x, tip.x));
  const h = Math.max(0, Math.min(spot.y + spot.height, tip.y + tip.height) - Math.max(spot.y, tip.y));
  return (w * h) / (spot.width * spot.height);
}

/** Pixels of the spotlight's height that lie within the viewport. */
function visibleHeight(spot: Box, viewportHeight: number): number {
  return Math.max(0, Math.min(spot.y + spot.height, viewportHeight) - Math.max(spot.y, 0));
}

/** Read the spotlight and tooltip boxes only once BOTH have stopped moving.
 *  ProductTour smooth-scrolls the target into place and settles the tooltip a
 *  few frames later; a fixed delay races that and occasionally samples a beat
 *  mid-motion (a tooltip 30px shy of its cleared position reads as a few px of
 *  overlap). Polling until two consecutive samples agree measures the position
 *  the user actually ends up looking at. */
async function stableBoxes(page: Page): Promise<{ spot: Box; tip: Box }> {
  const read = async () => ({
    // Either can be momentarily null: during settle the spotlight drops to the
    // flat overlay for a frame if the target rect is being recomputed. A null
    // sample just means "not settled yet", never a stable answer.
    spot: await page.getByTestId('tour-spotlight').boundingBox(),
    tip: await page.getByTestId('tour-tooltip').boundingBox(),
  });
  const same = (a: Box | null, b: Box | null) =>
    !!a && !!b &&
    Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

  let prev = await read();
  let last = prev;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(100);
    const next = await read();
    if (next.spot && next.tip) last = { spot: next.spot, tip: next.tip };
    if (same(prev.spot, next.spot) && same(prev.tip, next.tip)) {
      return { spot: next.spot!, tip: next.tip! };
    }
    prev = next;
  }
  // Best effort: the last fully-non-null sample seen, or force a final read.
  if (last.spot && last.tip) return { spot: last.spot, tip: last.tip };
  return {
    spot: (await page.getByTestId('tour-spotlight').boundingBox())!,
    tip: (await page.getByTestId('tour-tooltip').boundingBox())!,
  };
}

test('no beat covers the spotlight it points at', async ({ page }) => {
  await firstVisit(page);
  const viewport = page.viewportSize()!;

  await page.getByRole('button', { name: TOUR_LAUNCH }).click();
  const counter = page.getByTestId('tour-progress');
  await expect(counter).toBeVisible();
  const total = Number(/of (\d+)/.exec((await counter.textContent()) ?? '')![1]);

  let beatsThatMustBeClean = 0;

  for (let i = 1; i <= total; i++) {
    await expect(counter).toHaveText(`Step ${i} of ${total}`);
    await expect(page.getByTestId('tour-spotlight')).toBeVisible();

    const title = ((await page.getByTestId('tour-title').textContent()) ?? '').trim();
    const { spot, tip } = await stableBoxes(page);
    const where = `beat ${i} (“${title}”): spot ${JSON.stringify(spot)} tip ${JSON.stringify(tip)}`;
    const overlap = overlapFraction(spot, tip);

    /* First, non-negotiable for every beat: the spotlight is actually on
       screen. `toBeVisible` above only proves it is in the DOM — an element
       scrolled below the fold still passes that but shows the user nothing. */
    expect(
      visibleHeight(spot, viewport.height),
      `${where} — the spotlight is off screen; the user sees no highlight`,
    ).toBeGreaterThanOrEqual(Math.min(spot.height, MIN_SPOTLIGHT_VISIBLE_PX));

    /* Can this target and this tooltip both be on screen at once? If so the
       flip-and-scroll has a clean answer available and must have found it. */
    const canCoexist =
      spot.height + tip.height + VIEWPORT_MARGIN * 2 <= viewport.height;

    if (canCoexist) {
      beatsThatMustBeClean++;
      expect(overlap, `${where} — target and tooltip both fit; nothing should overlap`).toBe(0);
    } else {
      expect(overlap, `${where} — oversized target, but the tooltip must still clear most of it`)
        .toBeLessThan(UNAVOIDABLE_OVERLAP_MAX);
      const pinnedToAnEdge =
        tip.y <= VIEWPORT_MARGIN + 1 ||
        tip.y + tip.height >= viewport.height - VIEWPORT_MARGIN - 1;
      expect(pinnedToAnEdge, `${where} — oversized target, so the tooltip belongs at a viewport edge`)
        .toBe(true);
    }

    await page.getByRole('button', { name: i === total ? /^finish$/i : /^next$/i }).click();
  }

  /* Guard against a vacuous pass: if every target grew until nothing could
     coexist, the strict branch above would stop running and this test would
     assert almost nothing. */
  expect(beatsThatMustBeClean, 'no beat exercised the zero-overlap branch').toBeGreaterThanOrEqual(3);
});

/* THE REHEARSAL CASE. addGroup returns null for an id that already exists,
   and addRule happily appends a second copy of the same rule — so a naive
   second pass either throws or silently doubles the estate. */
test('a second run in the same session completes, and duplicates nothing', async ({ page }) => {
  await firstVisit(page);

  await runTour(page);
  const afterFirst = {
    groups: await groupIds(page),
    rules: await ruleNames(page),
    intents: await intentKeys(page),
  };

  const beats = await runTour(page);
  expect(groupBeatsIn(beats).length).toBeGreaterThanOrEqual(3);

  const afterSecond = {
    groups: await groupIds(page),
    rules: await ruleNames(page),
    intents: await intentKeys(page),
  };

  // Not "still contains" — exactly the same multiset. One extra
  // "all-branch-sites" or one extra payoff rule is the failure this catches.
  expect(afterSecond.groups.slice().sort()).toEqual(afterFirst.groups.slice().sort());
  expect(afterSecond.rules.slice().sort()).toEqual(afterFirst.rules.slice().sort());
  // Same for the intent the control beat declares and arms: declareIntent
  // dedupes and setIntentMode no-ops, and this is what proves it.
  expect(afterSecond.intents.slice().sort()).toEqual(afterFirst.intents.slice().sort());

  expect(afterSecond.groups.filter(id => id === 'all-branch-sites')).toHaveLength(1);
  expect(
    afterSecond.rules.filter(n => /branch sites/i.test(n) && /west workloads/i.test(n)),
  ).toHaveLength(1);
});

/* THE SKIP-PATH CASE. `runTour` clicks every action, so it can never see a
   viewer who presses Next through discover-sites without naming the group —
   which used to leave govern-groups and group-policy narrating "holds 0"
   and "matches 0 modelled flows" for a group that was never made. */
test('pressing only Next never narrates a group that was never named', async ({ page }) => {
  await firstVisit(page);

  const groupsBefore = await groupIds(page);
  expect(groupsBefore).not.toContain('all-branch-sites');

  const beats = await runTourNextOnly(page);

  const groupBeats = groupBeatsIn(beats);
  expect(
    groupBeats.length,
    `groups are narrated by too few beats; titles were: ${beats.map(b => b.title).join(' | ')}`,
  ).toBeGreaterThanOrEqual(3);

  // The beat that reads the sites group back must not report it empty.
  const readBackBeat = groupBeats.find(b => /holds/i.test(b.text));
  expect(readBackBeat, 'no beat reads a group\'s membership back').toBeTruthy();
  expect(readBackBeat!.text).not.toMatch(/holds 0\b/);

  // The dry-run beat must not report zero flows/zero Gbps for a group
  // nobody named.
  const payoffBeat = groupBeats.find(b => /dry-run/i.test(b.text));
  expect(payoffBeat, 'no beat dry-runs the group policy').toBeTruthy();
  const figures = payoffBeat!.text.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
  expect(figures.some(f => Number(f) > 0)).toBe(true);
  expect(payoffBeat!.text).not.toMatch(/matches 0 modelled flows/);

  /* Same rule, applied to the intent-control beat. On this path nothing was
     declared, so the standing-intents band under its spotlight renders
     "Nothing declared yet" — a beat pointing at "the switch on its row" would
     be naming a row the viewer is looking at the absence of. */
  const control = beats.find(b => /^arm an intent and it controls$/i.test(b.title))!;
  expect(control, 'no beat arms an intent').toBeTruthy();
  expect(control.text, 'the beat names a row that this path never created')
    .not.toMatch(/\b(?:its|the) row\b/i);
  // …while still teaching the switch itself, phrased about any declared intent.
  expect(control.text).toMatch(/watch\/enforce switch/i);

  /* The closing beat names west-workloads at the token layer on this path
     too — and it must stay TRUE here: pressing only Next never authored a
     Govern policy referencing west-workloads (ensurePayoffRule never ran),
     so the beat may speak of the group itself, which is seeded and was read
     back by govern-groups, but never of a policy the viewer supposedly
     wrote. */
  const closing = beats[beats.length - 1];
  expect(closing.text, 'the closing beat no longer names the group').toContain('west-workloads');
  expect(closing.text).not.toMatch(/polic\w* (?:that )?you (?:wrote|authored|named|enforced)/i);
});

/* THIS WEEK'S SURFACES. Four beats joined the arc — the assessment banner,
   the standing-intents band, Andi's top-bar toggle, and the Insights screen.
   Each is asserted by POSITION, not just presence: threading them where
   their subject lives is the point, and a regression that shuffles them to
   the end would still pass a bare "the beat exists" check. Walked on the
   Next-only path so every claim these beats speak must hold with no action
   ever clicked. The per-step spotlight assertion in the walker already
   proves each new anchor was found on its route. */
test('the tour meets the assessment, standing intents, Andi, and Insights, each in its place in the arc', async ({ page }) => {
  await firstVisit(page);
  const beats = await runTourNextOnly(page);

  const find = (name: string, re: RegExp) => {
    const i = beats.findIndex(b => re.test(b.title) || re.test(b.text));
    expect(
      i,
      `no beat for ${name}; titles were: ${beats.map(b => b.title).join(' | ')}`,
    ).toBeGreaterThan(-1);
    return i;
  };

  const assessment = find('the assessment', /measure for 14 days/i);
  const intents = find('standing intents', /standing intent/i);
  const andi = find('Andi', /^ask in words$/i);
  const insights = find('Insights', /sankey/i);
  const connect = find('the connect beat', /NaaS in one click/i);

  // The Discover leg carries all three — met before anything attaches...
  expect(assessment, 'the assessment beat left the Discover leg').toBeLessThan(connect);
  expect(intents, 'the intents beat left the Discover leg').toBeLessThan(connect);
  expect(andi, 'the Andi beat left the Discover leg').toBeLessThan(connect);
  // ...and in narrative order: measure, then declare, then ask. (The sites
  // beat sits between the first two; its own placement is guarded above.)
  expect(assessment).toBeLessThan(intents);
  expect(intents).toBeLessThan(andi);

  // Insights opens the AI leg: immediately before the token-policy close,
  // never after it — the closing beat stays the closing beat.
  expect(insights, 'Insights must sit directly before the close').toBe(beats.length - 2);

  // Copy honesty, spot-checked against the shipped components' own words.
  expect(beats[assessment].text).toMatch(/nothing is blocked or routed/i);
  expect(beats[andi].text).toMatch(/drafts, never commits/i);
  expect(beats[insights].text).toMatch(/derives from the engine/i);
});

/* THE SURFACES THAT SHIPPED AFTER THE ARC. Five more beats joined — the
   design tray on the twin, the /tasks office, a layer's Home board, Andi's
   proposal band, and the gateway's virtual keys. Same discipline as the test
   above: each asserted by POSITION, because threading them into the leg that
   already carries their subject is the whole point and a bolt-on-the-end
   regression would still pass a presence check. Walked Next-only, so every
   claim must hold with no action ever clicked; the walker's own per-step
   spotlight assertion is what proves each new anchor was found on its route. */
test('the tour meets the twin, Tasks, layer Home, proposals and the gateway, each in its leg', async ({ page }) => {
  await firstVisit(page);
  const beats = await runTourNextOnly(page);

  const find = (name: string, re: RegExp) => {
    const i = beats.findIndex(b => re.test(b.title) || re.test(b.text));
    expect(
      i,
      `no beat for ${name}; titles were: ${beats.map(b => b.title).join(' | ')}`,
    ).toBeGreaterThan(-1);
    return i;
  };

  const andi = find('Andi', /^ask in words$/i);
  const twin = find('the twin', /commit to the estate/i);
  const tasks = find('Tasks', /^one queue, many doors$/i);
  const control = find('arming an intent', /^arm an intent and it controls$/i);
  const home = find('layer Home', /layers across, lifecycle down/i);
  const connect = find('the connect beat', /NaaS in one click/i);
  const proposals = find('the proposal band', /^detect, then prevent$/i);
  const govern = find('the govern beat', /^govern with real rules$/i);
  const gateway = find('virtual keys', /^who is allowed to call a model$/i);
  const insights = find('Insights', /sankey/i);

  // The estate leg closes on the twin, then Tasks, then the intent switch —
  // all before a layer opens.
  expect(twin, 'the twin beat must follow Andi').toBe(andi + 1);
  expect(tasks, 'Tasks must follow the twin').toBe(twin + 1);
  expect(control, 'arming an intent must follow the queue, on the same page').toBe(tasks + 1);
  expect(control, 'the estate leg must close before a layer opens').toBeLessThan(home);

  // The NaaS leg opens on Home, because that is what picking a layer does.
  expect(home, 'Home must open the NaaS leg, ahead of Connect').toBe(connect - 1);

  // Proposals sit above the rules table, and before the beat whose action
  // enforces pol-insp and retires one of the rows they show.
  expect(proposals, 'proposals must precede the rules beat').toBeLessThan(govern);
  expect(proposals, 'proposals belong on the Govern leg, after Connect').toBeGreaterThan(connect);

  // The AI leg opens on identity; the close stays the close.
  expect(gateway, 'the gateway beat must open the AI leg').toBeLessThan(insights);
  expect(insights, 'Insights must still sit directly before the close').toBe(beats.length - 2);

  // Copy honesty, spot-checked against the shipped components' own words.
  expect(beats[twin].text).toMatch(/share proposal/i);
  expect(beats[home].text).toMatch(/connect, govern, observe, cost/i);
  expect(beats[proposals].text).toMatch(/retires itself/i);
  expect(beats[beats.length - 1].text).toMatch(/new policy/i);

  /* The Tasks page carries the intents band in `manage` mode, and its
     Watch/Enforce switch applies a control on the spot — so the "commits
     elsewhere" claim has to be scoped to the queue rows, never to the page. */
  expect(beats[tasks].text).toMatch(/no row commits from here/i);
  expect(beats[tasks].text).not.toMatch(/nothing commits on this page/i);

  // Watch versus enforce, stated as two things rather than one.
  expect(beats[control].text).toMatch(/watch mode/i);
  expect(beats[control].text).toMatch(/standing control/i);

  /* And the claim the product stopped making about itself: steerFlow and
     setTokenPolicy push no undo entry, so no beat may promise that Undo
     takes back everything a commit did. */
  for (const b of beats) {
    expect(
      b.text,
      `beat “${b.title}” promises blanket undo coverage`,
    ).not.toMatch(/undo covers every|undo reverts every/i);
  }
});

/* CONTROLLING BY INTENT, not just declaring one. The tour used to stop at
   "declare an outcome and the estate keeps checking it" — which is watch mode,
   and watch mode gates nothing. The control is the mode switch, and it lives
   only in the band's `manage` render on /tasks.

   This walks the tour clicking actions and then asks the ENGINE what changed:
   an armed cap intent has to have reached the token policy's enforced flag
   (the standing control cap-token-spend applies), and the budget gate has to
   agree a cap now covers that identity. Copy asserting itself is not proof. */
test('arming the intent in the tour applies a standing control the engine agrees with', async ({ page }) => {
  await firstVisit(page);

  const before = await page.evaluate(() =>
    (window as unknown as Win).CC.intentList().filter(i => i.key === 'cap-token-spend').length,
  );
  expect(before, 'a cap intent was already declared; this test proves nothing').toBe(0);

  await runTour(page);

  const armed = await page.evaluate(() => {
    const CC = (window as unknown as Win).CC;
    const caps = CC.intentList().filter(i => i.key === 'cap-token-spend');
    if (caps.length !== 1) return { count: caps.length };
    const tag = caps[0].scope.id;
    return {
      count: caps.length,
      mode: caps[0].mode,
      tag,
      // The standing control itself — cap-token-spend's enforceControl is
      // CC.setTokenPolicy(tag, {enforced: true}).
      policyEnforced: CC.tokenPolicyList().find(p => p.tag === tag)?.enforced,
      // …and promptTrace's budget gate reading the same fact back.
      gateCovers: CC.intentCapEnforced(tag),
    };
  });

  expect(armed.count, 'the tour declared no cap intent, or declared two').toBe(1);
  expect(armed.mode, 'the intent was declared but left in watch mode — that controls nothing').toBe('enforce');
  expect(armed.policyEnforced, 'arming did not reach the token policy').toBe(true);
  expect(armed.gateCovers, 'the budget gate does not see an enforce-mode cap for this tag').toBe(true);
});

/* The twin beat points at a control that must actually be there and do what
   the beat says. `runTourNextOnly` proves the spotlight found it; this proves
   the thing under the spotlight is the design-mode toggle, and that pressing
   it opens the tray the beat describes rather than committing anything. */
test('the control the twin beat spotlights opens a tray, and commits nothing by itself', async ({ page }) => {
  await firstVisit(page);

  const rulesBefore = await ruleNames(page);
  const toggle = page.getByTestId('design-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText(/design on the twin/i);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  // Entering design mode alone changes nothing on the estate.
  expect(await ruleNames(page)).toEqual(rulesBefore);
});

/* THE SAME-ROUTE SCROLL CASE. The sites beat sits at the premises table far
   down /discover; the intents beat that follows it sits back near the top of
   the SAME route, so no navigation resets the scroll between them. ProductTour
   used to re-issue its smooth scrollIntoView from its own scroll listener,
   each scroll event cancelling the scroll that caused it — the page froze
   where the previous beat left it and the spotlight sat hundreds of pixels
   above the viewport. `toBeVisible()` cannot catch that (an off-viewport
   element still has a box), so this asserts geometry: the spotlight must
   actually be on screen. */
test('a beat that shares a route with the beat before it still scrolls its target into view', async ({ page }) => {
  await firstVisit(page);
  await page.getByRole('button', { name: TOUR_LAUNCH }).click();

  const title = page.getByTestId('tour-title');
  await expect(page.getByTestId('tour-progress')).toBeVisible();

  // Walk forward to the intents beat — the beat after the sites beat.
  while (!/declare a standing intent/i.test((await title.textContent()) ?? '')) {
    await page.getByRole('button', { name: /^next$/i }).click();
  }

  // ProductTour scrolls on step entry, then measures at +300ms; give the
  // smooth scroll room to land before holding it to the geometry.
  await page.waitForTimeout(900);

  const vh = page.viewportSize()!.height;
  const box = (await page.getByTestId('tour-spotlight').boundingBox())!;
  expect(box.y + box.height, 'spotlight sits above the viewport').toBeGreaterThan(0);
  expect(box.y, 'spotlight sits below the viewport').toBeLessThan(vh);
  // Not merely clipped at an edge: the majority of the cutout is on screen.
  const onScreen = Math.min(box.y + box.height, vh) - Math.max(box.y, 0);
  expect(onScreen / box.height).toBeGreaterThan(0.6);
});

/* The Discover beat's spotlight is a cutout the size of its anchor. When the
   anchor was the wrapper around all three domain sections it measured 364px
   at 1280x800 and 708px in an 812px-tall viewport — 87% of a phone screen,
   which highlights nothing — and ProductTour's `Math.max(16, …)` on-screen
   clamp (ProductTour.tsx:142) then dropped the 'top'-placed tooltip onto the
   spotlight it should sit above. The anchor is now the Cloud section alone,
   which is what the beat's copy actually speaks about ("clouds, regions, and
   VPCs"). Asserted as a fraction of the viewport, so it stays a guard rather
   than a pinned pixel count. */
test('the Discover spotlight highlights one section, not the whole estate header', async ({ page }) => {
  await firstVisit(page);
  await page.getByRole('button', { name: TOUR_LAUNCH }).click();
  await expect(page.getByTestId('tour-progress')).toHaveText(/Step 1 of/);

  const spotlight = page.getByTestId('tour-spotlight');
  await expect(spotlight).toBeVisible();
  await page.waitForTimeout(900); // ProductTour smooth-scrolls, then settles the tooltip

  const vh = page.viewportSize()!.height;
  const box = (await spotlight.boundingBox())!;
  const tip = (await page.getByTestId('tour-tooltip').boundingBox())!;

  expect(
    box.height / vh,
    `spotlight covers ${Math.round((box.height / vh) * 100)}% of the viewport — it should highlight a section, not the screen`,
  ).toBeLessThan(0.3);

  // The cutout is the Cloud section, not the wrapper around all three.
  const cloudBox = (await page.getByTestId('estate-cloud').boundingBox())!;
  expect(Math.abs(box.height - cloudBox.height)).toBeLessThan(40); // highlightPadding is 12 a side

  /* The tooltip must now CLEAR the spotlight outright, not merely cover less
     than half of it. The Cloud section (~159px) and the 366px tooltip fit a
     720px viewport together with room to spare, so ProductTour scrolls the
     section into a band and seats the tooltip fully on the other side —
     overlap zero. The old `< 0.5` was a ceiling from when the tooltip was
     pinned onto the cutout by the `Math.max(16, …)` clamp; with the flip and
     scroll-to-fit landed, a positive overlap here is a regression, so this is
     tightened to require none. (`overlap` goes negative when the tooltip sits
     clear above or below — hence `<= 0`, not `=== 0`.) */
  const overlap = Math.min(box.y + box.height, tip.y + tip.height) - Math.max(box.y, tip.y);
  expect(
    overlap,
    `the tooltip covers ${Math.round(overlap)}px of the spotlight; it should clear it entirely`,
  ).toBeLessThanOrEqual(0);
});
