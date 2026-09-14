import { TourStep } from '../../components/tour/ProductTour';
import { CC } from '../../engine';
import type { CloudControl } from '../../engine/types';
import { DEMO_BEATS } from '../demo/demoScript';
import { ruleProposals } from '../govern/ruleProposals';

// The Cost beat is the single source of truth for the Cost step's copy — the
// six-beat demo arc (demoScript.ts) owns the narrative; the Tour renders it.
const COST_BEAT = DEMO_BEATS.find(b => b.route === '/naas/cost')!;

/* ------------------------- the groups thread -------------------------

   Three beats carry one arc: the premises are visible in Discover, naming a
   set of them makes an id, and that id is what a policy is written against.
   Both mutating beats are IDEMPOTENT, because the tour is the thing a person
   clicks over and over while rehearsing:

   - addGroup returns null for an id that already exists, so the second run
     would otherwise fail silently and leave the later beats narrating a
     group that was never made. ensureSitesGroup checks first and treats
     "already named" as success — the estate ends in the same state either
     way, which is what idempotent means.
   - addRule does NOT dedupe; it appends. A second run would leave two
     identical policies in the rules table with the demo still on screen.
     ensurePayoffRule looks the rule up by name and re-enforces the one that
     exists instead of authoring a twin. enforceRule is itself a no-op on an
     already-enforced rule, so the third and fourth runs are free too. */

const SITES_GROUP_ID = 'all-branch-sites';
const SITES_GROUP_LABEL = 'All branch sites';
const WEST_WORKLOADS = 'west-workloads';
const PAYOFF_RULE_NAME = `Allow ${SITES_GROUP_LABEL.toLowerCase()} to reach west workloads`;

interface Group { id: string; label: string }
interface Rule { id: string; name: string }

const groups = () => CC.groupList() as Group[];
const rules = () => CC.ruleList() as Rule[];
const branchIds = () => (CC.branches as { id: string }[]).map(b => b.id);

/** Maps each id in `vpcIds` to the cloud that owns it — via `CC.regions`
 *  (keyed by cloud) and `CC.vpcs` (keyed by region) — and counts the
 *  distinct clouds. "west-workloads" happens to span three clouds today,
 *  but that is a fact about the seeded estate, not a number the copy gets
 *  to assume; this reads it fresh every time the beat is shown. */
function cloudCountFor(vpcIds: string[]): number {
  const regions = CC.regions as Record<string, { id: string }[]>;
  const vpcsByRegion = CC.vpcs as Record<string, { id: string }[]>;
  const cloudOfVpc: Record<string, string> = {};
  Object.keys(regions).forEach(cloudId => {
    (regions[cloudId] || []).forEach(r => {
      (vpcsByRegion[r.id] || []).forEach(v => {
        cloudOfVpc[v.id] = cloudId;
      });
    });
  });
  return new Set(vpcIds.map(id => cloudOfVpc[id]).filter(Boolean)).size;
}

function ensureSitesGroup(): void {
  if (groups().some(g => g.id === SITES_GROUP_ID)) return;
  CC.addGroup({
    id: SITES_GROUP_ID,
    label: SITES_GROUP_LABEL,
    kind: 'site',
    members: branchIds(),
    predicates: [],
    desc: 'Named from the guided tour',
  });
}

/** The rule the whole feature exists for, as a spec — dry-runnable before it
 *  is ever authored, and the exact shape `ensurePayoffRule` commits. */
const payoffSpec = () => ({
  name: PAYOFF_RULE_NAME,
  src: { group: SITES_GROUP_ID },
  dst: { group: WEST_WORKLOADS },
  ports: 'any',
  action: 'allow',
  chain: [] as string[],
});

/* ------------------- the intent-control thread -------------------

   Declaring an intent and CONTROLLING by one are two different things, and
   the tour used to show only the first. `declareIntent` always lands in watch
   mode (IntentThreads' DeclareMenu forces it — "enforcement stays a separate,
   visible decision on the row"), and watch mode gates nothing: it counts what
   enforcing WOULD have denied.

   Enforce mode is the control. `setIntentMode(id,'enforce')` calls the
   catalog entry's `enforceControl`, and today exactly one of the eighteen
   entries carries one: cap-token-spend, whose control is the token policy's
   own `enforced` flag. The gate in promptTrace (state-console.ts) then needs
   all three — policy enforced, meter at or over its ceiling, and an
   enforce-mode cap intent covering the tag — before a request is denied.

   Both steps are idempotent, for the same reason the groups beats are.
   declareIntent already returns null on a duplicate (key + scope), and
   setIntentMode returns false when the mode is already what you asked for, so
   the second and third rehearsals are free. */

const CAP_INTENT = 'cap-token-spend';

interface Meter { tag: string }
interface Intent { id: string; key: string; scope: { kind: string; id: string }; mode: string }

/** The identity the cap is declared against. Read from the live meter list
 *  rather than pinned, so a renamed or removed tag makes this beat a no-op
 *  instead of a beat narrating a scope the engine would reject. Prefers the
 *  classified identity — it is the one the closing beat's denial story is
 *  about — and falls back to whatever the estate does meter. */
function capTag(): string | null {
  const tags = (CC.tokenMeterList() as Meter[]).map(m => m.tag);
  return tags.find(t => t === 'classified-helion') ?? tags[0] ?? null;
}

/** Declare the cap intent if it is not already declared, then arm it. Leaves
 *  the estate identical whether it runs once or five times. */
function ensureEnforcedCapIntent(): void {
  const tag = capTag();
  if (!tag) return; // nothing metered: declaring would be rejected anyway
  const scope = { kind: 'identity', id: tag, label: tag };
  const declared = () =>
    (CC.intentList() as Intent[]).find(i => i.key === CAP_INTENT && i.scope.id === tag);

  // declareIntent dedupes on (key, scope) and returns null rather than
  // throwing, but check first so a second run does not push an undo entry
  // for a declaration it did not make.
  if (!declared()) CC.declareIntent(CAP_INTENT, scope, 'watch');

  const it = declared();
  // Still absent means the engine refused the scope (a tag the catalog does
  // not offer). Say nothing and change nothing rather than throwing inside a
  // tour click.
  if (it && it.mode !== 'enforce') CC.setIntentMode(it.id, 'enforce');
}

/** Whether Andi currently has anything to propose — an active finding whose
 *  preventive rule exists and is not already enforced. Read through the same
 *  derivation the band itself renders (`ruleProposals`, a pure module with a
 *  type-only engine import, so the tour costs nothing to import it) rather
 *  than a second copy of the predicate that could drift from it. The band's
 *  empty state is a bare <p> with a DIFFERENT testid, so an empty estate
 *  would leave the proposals beat spotlighting nothing. */
const hasProposals = () => ruleProposals(CC as unknown as CloudControl).length > 0;

function ensurePayoffRule(): void {
  ensureSitesGroup(); // the rule cannot name a group that was never made
  const existing = rules().find(r => r.name === PAYOFF_RULE_NAME);
  if (existing) {
    CC.enforceAny(existing.id);
    return;
  }
  // addRule returns null (and authors nothing) when dst.group does not name
  // a live group — validDst fails closed. Guard here so a west-workloads
  // that was renamed or removed can't make this click a no-op while the
  // beat above still promises the rule will join the table.
  if (!groups().some(g => g.id === WEST_WORKLOADS)) return;
  CC.addRule({ ...payoffSpec(), enforceNow: true });
}

/**
 * Guided tour of the AI-grade network. The six-beat MVP demo arc — Discover, then
 * NaaS's Connect → Govern → Observe → Cost, closing on the AI Fabric's own
 * Govern — is the spine, and step
 * order is still bound to `DEMO_BEATS` (demoScript.ts): the tour visits those
 * sections in that order and never doubles back to one it has left.
 *
 * THREE LEGS, matching the layer-first IA the nav shipped. Sections that are
 * not in DEMO_BEATS were added inside the leg their subject already belongs
 * to, never between legs:
 *
 * - The ESTATE leg (`/discover`, `/tasks`) is everything above the layers.
 *   Discover is the front door; Tasks is the one queue every layer's work
 *   drains into, which is why it closes this leg rather than opening a
 *   layer's.
 * - The NAAS leg opens on `/naas/home`, because that is what picking a layer
 *   in the bar actually does now — a layer opens onto its board, never onto
 *   a verb. Then the four verbs, in lifecycle order.
 * - The AI leg opens on `/ai/keys`, the gateway's identity surface, for the
 *   same reason the NaaS leg opens on Connect: you attach and identify
 *   before you govern. Then Insights, then the token-policy close.
 *
 * Three beats are threaded INSIDE that spine rather than appended after it,
 * because groups are not an epilogue. Naming a set of premises is something
 * you do while looking at them, so it belongs in Discover; reading the group
 * back and writing it into a policy belong in Govern, next to the rule beat
 * that already explains how a rule is shaped. Bolting all three onto the end
 * would have made the payoff arrive after Cost and the AI Fabric had already
 * closed the story.
 *
 * Beats that meet surfaces shipped since the demo arc was written, each
 * threaded where the arc already carries its subject rather than bolted onto
 * the end:
 *
 * - `assessment` sits right after the Discover opener, because "measure for
 *   14 days first" is the answer to the question the scan raises.
 * - `intents` follows the naming beat on Discover: you named what you have,
 *   now declare what must stay true of it. The standing-intents band is the
 *   surface.
 * - `andi` follows intents. The intents band's own empty state says "tell
 *   Andi the outcome you want", so the beat that introduces Andi is the one
 *   that follows it. The toggle lives in the top bar, which renders on every
 *   route, so the beat stays on /discover and changes no section.
 * - `twin` follows Andi, and closes /discover. Andi's beat ends on "drafts,
 *   never commits"; this is the surface that sentence describes — the tray
 *   where a staged move is priced, shared and committed. Every mutating beat
 *   later in the tour commits directly, so if this beat is not shown the
 *   viewer never learns that the product's normal path does not.
 * - `tasks` closes the estate leg. It is the only surface that spans both
 *   layers, so it cannot sit inside one of them; and it is the accumulation
 *   of exactly what the twin beat just explained (one queue, priced, drained
 *   through the twin), so it reads as that beat's consequence.
 * - `intent-control` follows Tasks and stays on it, because the Watch/Enforce
 *   switch exists ONLY in the band's `manage` render, which /tasks carries and
 *   Discover deliberately does not (IntentThreads: "the cross-section is where
 *   promises are SEEN, Work is where they are kept"). The `intents` beat on
 *   Discover therefore could not carry this — it is pointing at a render with
 *   no switch on it. Declaring and controlling are two beats because they are
 *   two decisions in the product.
 * - `layer-home` opens the NaaS leg, ahead of Connect, because it is what
 *   the bar does: pick a layer, land on its board. It is also the only beat
 *   that states the IA out loud — layers across, lifecycle down.
 * - `proposals` opens the Govern leg, ahead of the rules table, which is
 *   where the band physically sits. It must come BEFORE the `govern` beat
 *   for a second reason: that beat's action enforces pol-insp, which drains
 *   the finding behind one of the proposals the band is showing.
 * - `gateway` opens the AI leg. A token policy is written against an
 *   identity, so the identities come first — the same order the NaaS leg
 *   uses when Connect precedes Govern.
 * - `insights` sits directly before the token-policy close: evidence first,
 *   then governance, mirroring the NaaS half of the arc.
 *
 * Each step's `targetSelector` is a `data-tour` attribute added to the
 * relevant component, or an existing stable `data-testid` other specs
 * already hold in place, and each `route` is the HashRouter path for that
 * section. `ProductTour` is route-agnostic — the consuming `TourLauncher`
 * navigates on `onStepChange` before the spotlight looks for the target on
 * the new page.
 *
 * SKIP MECHANISM. A step may carry `when`; `activeCloudConnectTour()`
 * evaluates it once per launch and leaves the step out of that run when it
 * returns false. It exists for the anchors that can legitimately be absent —
 * the assessment banner, and the proposal band on an estate with nothing to
 * propose — because a beat whose target is missing renders a flat overlay
 * with nothing spotlighted, which reads as a broken tour. Steps without
 * `when` always run.
 *
 * A step's target is only spotlighted if it's already in the DOM. Govern's
 * tab is therefore carried in the route (`?tab=groups`) rather than left to
 * component state — a beat pointing at the Groups table on a page that opens
 * on Policies is a dead beat.
 *
 * Any figure a beat SPEAKS is a thunk, evaluated when the beat is shown, so
 * it reads the estate as the beats before it left it.
 */
export type CloudConnectTourStep = TourStep & {
  route: string;
  /** Skip predicate, read once per launch by `activeCloudConnectTour`. */
  when?: () => boolean;
};

/** The steps a launch actually runs: every step whose `when` is absent or
 *  true at the moment the tour opens. Evaluated per launch, not per module
 *  load, because the estate (and the DOM) move between rehearsals. */
export function activeCloudConnectTour(): CloudConnectTourStep[] {
  return cloudConnectTour.filter(s => !s.when || s.when());
}

export const cloudConnectTour: CloudConnectTourStep[] = [
  {
    id: 'discover',
    title: 'Discover the estate',
    description:
      'A read-only scan mapped the estate — clouds, regions, and VPCs — with no agents installed and nothing changed. This table is the finding: most of it reaches the world over public internet, including the GPU clouds. Bytes → workloads → tokens starts here.',
    route: '/discover',
    targetSelector: '[data-tour="discover-estate"]',
    placement: 'top',
    highlightPadding: 12,
  },
  {
    id: 'assessment',
    title: 'Measure before you commit',
    description:
      'Discovery shows what exists, not what moves. Not sure what you have? Measure for 14 days first: the assessment counts AI traffic in the background, and nothing is blocked or routed while it runs.',
    route: '/discover',
    targetSelector: '[data-testid="assessment-banner"]',
    placement: 'bottom',
    highlightPadding: 12,
    // The one anchor that can be absent. Closing the assessment removes the
    // banner for good (stage 'closed'), and an in-session dismissal hides it
    // until DiscoverPage remounts. Launching from any other page remounts
    // Discover on navigate, so a missing banner only means "dismissed" when
    // the Discover surface is actually rendered right now — the intents band
    // is its always-present sibling, and /discover is a lazy route, so an
    // absent band means the page merely has not mounted (or is another page
    // entirely) and the beat must stay in.
    when: () => {
      if ((CC.assessment() as { stage: string }).stage === 'closed') return false;
      const discoverRendered = !!document.querySelector('[data-testid="intent-threads"]');
      return !discoverRendered || !!document.querySelector('[data-testid="assessment-banner"]');
    },
  },
  {
    id: 'discover-sites',
    title: 'Name what you found',
    description: () =>
      `The scan found more than clouds. These ${(CC.branches as unknown[]).length} premises are your own buildings — a city and a CIDR each, not a resource any hyperscaler holds. Group them under one name, and policy stops being a list of addresses. Nothing in the estate moves; you are naming what is already there.`,
    route: '/discover',
    targetSelector: '[data-tour="discover-sites"]',
    placement: 'top',
    highlightPadding: 12,
    action: {
      label: `Group all sites as “${SITES_GROUP_LABEL}”`,
      onClick: ensureSitesGroup,
    },
  },
  {
    id: 'intents',
    title: 'Declare a standing intent',
    description:
      'Declare an outcome and the estate keeps checking it. Tell Andi "keep AI private" or "cap token spend" and it stands here as a promise: aligned, drifting, or violated, re-derived every time you look. When one drifts, Synchronize stages the repair as a draft on the twin. The machine never commits.',
    route: '/discover',
    targetSelector: '[data-testid="intent-threads"]',
    // 'bottom', because the band sits near the top of /discover: a 'top'
    // tooltip cannot fit above it, and ProductTour's on-screen clamp would
    // drop it onto the very band the beat is pointing at.
    placement: 'bottom',
    highlightPadding: 12,
  },
  {
    id: 'andi',
    title: 'Ask in words',
    description:
      // NOT "Undo covers every change you accept" — it does not. steerFlow
      // and setTokenPolicy push no undo entry (the per-kind truth table is
      // isUndoCovered in stackFigures.ts), which is why the commit banner
      // was taught to state coverage per commit instead of promising it.
      // The tour was still telling the lie the product had stopped telling.
      'Andi rides the top bar on every screen. Ask in words and the answer comes from the same engine every figure derives from. Actions come back as proposals you confirm to run: Andi drafts, never commits, and the banner after a commit names exactly which of those moves Undo can take back.',
    route: '/discover',
    targetSelector: '[data-testid="andi-toggle"]',
    placement: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 'twin',
    title: 'Design on the twin, then commit',
    description:
      'This is where a draft lands. Design on the twin and a move stages instead of firing — priced by the same engine the screens read, so the tray can never offer what the estate would refuse. Share proposal mints a link that opens with your moves already staged, for someone else to approve. Commit to the estate is the only control here that changes anything.',
    route: '/discover',
    // The toggle, not the tray: the tray renders only while moves are staged,
    // and this beat stages nothing. The button is always in the panel header.
    targetSelector: '[data-testid="design-toggle"]',
    placement: 'bottom',
    highlightPadding: 10,
  },
  {
    id: 'tasks',
    title: 'One queue, many doors',
    description:
      // NOT "nothing commits on this page". The standing-intents block below
      // this queue renders in `manage` mode here, and its Watch/Enforce switch
      // applies a control the moment it is flipped — see the next beat. The
      // claim is true of the QUEUE ROWS and is scoped to them.
      'Tasks is state, not a place — the badge beside the bell counts what waits. Every priced move the advisor found and every intent that has drifted lands in this one queue, grouped by the lifecycle stage it belongs to and filterable by layer. No row commits from here: it synchronizes back into the twin, and a human commits it there.',
    route: '/tasks',
    targetSelector: '[data-tour="tasks-office"]',
    placement: 'bottom',
    highlightPadding: 12,
  },
  {
    id: 'intent-control',
    title: 'Arm an intent and it controls',
    description:
      /* NOT "the pill turns from Armed to Enforcing". Verified in the running
         app: on a seeded estate the policy is Draft, and arming the intent
         sets `enforced` (that IS cap-token-spend's enforceControl) at the same
         moment it makes the cap cover the tag — so the pill goes Draft →
         Enforcing and never passes through Armed. Armed is the OTHER
         situation: enforced, but no cap covering it, which the pill's own
         tooltip calls out as denying nothing on budget. Stated that way here,
         because it is the reason this beat exists at all. */
      /* NOT "the switch on ITS row". Seen in the running app on the Next-only
         path: nothing has been declared, so the band renders its empty state
         ("Nothing declared yet") and there is no row to carry a switch. The
         claim is phrased about any declared intent, which is true of an empty
         band and of a full one — and clicking this beat's action makes a row
         with that switch appear live, under the spotlight, while the beat is
         still on screen. Same discipline as the groups thread: a beat may not
         narrate something a viewer who only presses Next never made. */
      'Declaring is not controlling. An intent starts in watch mode — counted, changing nothing — and it reports how many requests enforcing would have denied. Each declared intent carries a Watch/Enforce switch, and that is the other half. Armed, the intent applies a standing control: cap token spend enforces that identity’s budget, and the gateway denies a request past the ceiling. Enforcement alone would not do it — a policy no cap covers reads Armed, and denies nothing on budget. Repairs still stage on the twin; arming is not the machine committing moves.',
    route: '/tasks',
    // The `manage` render of the band — the Discover one (beat 4) deliberately
    // has no mode switch, which is exactly why that beat could not carry this.
    targetSelector: '[data-testid="intent-threads"]',
    placement: 'top',
    highlightPadding: 12,
    action: {
      label: 'Declare “cap token spend”, and arm it',
      onClick: ensureEnforcedCapIntent,
    },
  },
  {
    id: 'layer-home',
    title: 'Pick a layer, land on its board',
    /* Kept short on purpose. The board is the tallest spotlight in the tour,
       so this beat lives in the overlap guard's oversized-target branch and
       every line of tooltip eats into the 0.2 ceiling — widening
       estate-figures to w:2 took it to 0.204 and failed the spec. Two
       sentences were cut rather than raising the ceiling. */
    description:
      'Two layers ride the bar — NaaS and the AI Fabric — and each carries the same four verbs down the rail: Connect, Govern, Observe, Cost. Layers across, lifecycle down, and a verb is never a destination you enter through. Picking a layer opens its Home, and this board is live: every widget reads the same getters its verb pages read.',
    route: '/naas/home',
    targetSelector: '[data-tour="layer-board"]',
    placement: 'top',
    highlightPadding: 12,
  },
  {
    id: 'connect',
    title: 'Attach — NaaS in one click',
    description:
      'Connectivity as a service: no circuits ordered, no boxes racked. This provisions a NetBond on-ramp and attaches the GPU clouds. Watch the fabric lines turn green and start flowing — private paths replace the public-internet routes from Discover.',
    route: '/naas/connect',
    targetSelector: '[data-tour="connect-onramp"]',
    placement: 'top',
    highlightPadding: 12,
    action: {
      label: 'Provision & attach the GPU clouds',
      onClick: () => CC.activateOnramp('nb2'),
    },
  },
  {
    id: 'proposals',
    title: 'Detect, then prevent',
    description:
      'Above the rules, Andi states what the estate is doing that deserves one. Each row is a live behavioural finding — GuardDuty, Access Analyzer, Security Hub — joined to the preventive rule that answers it and priced by the same dry-run the builder uses. Enforce it stages that rule on the twin; Tighten it opens the builder pre-filled so you can narrow it first. Nothing here is stored or dismissed: fix the behaviour and the row retires itself.',
    route: '/naas/govern',
    targetSelector: '[data-testid="proposal-band"]',
    placement: 'bottom',
    highlightPadding: 12,
    // The band is replaced by a one-line empty state (a different testid) when
    // no active finding names an unenforced rule — a real state after a
    // rehearsal that enforced them all.
    when: hasProposals,
  },
  {
    id: 'govern',
    title: 'Govern with real rules',
    description:
      'Policy the way operators write it: IF traffic FROM a tag — or, as you’ll see, a name — TO destination THEN action, with a dry-run preview against live flows before anything enforces. Enforcing this rule inserts an inline inspection point — the routes in Discover physically rewire.',
    route: '/naas/govern',
    targetSelector: '[data-tour="govern-rules"]',
    placement: 'top',
    highlightPadding: 12,
    action: {
      label: 'Enforce: inspect classified egress',
      onClick: () => CC.enforceAny('pol-insp'),
    },
  },
  {
    id: 'govern-groups',
    title: 'A group is what a policy names',
    description: () => {
      // Self-heal: a viewer who pressed Next through discover-sites without
      // clicking its action never named the group this beat reads back. The
      // action there is idempotent and cheap — calling it here means this
      // beat, and group-policy after it, describe a group that actually
      // exists instead of narrating one that was skipped.
      ensureSitesGroup();
      const list = groups();
      const objects = new Set(
        list.flatMap(g => {
          const r = CC.resolveGroup(g.id) as { branchIds: string[]; vpcIds: string[] };
          return [...r.branchIds, ...r.vpcIds];
        }),
      ).size;
      const mine = CC.resolveGroup(SITES_GROUP_ID) as { count: number };
      const west = CC.resolveGroup(WEST_WORKLOADS) as { count: number };
      // The live-resolution claim is illustrated by "West workloads" — a
      // PREDICATE group, so it genuinely re-evaluates as the estate
      // changes. "All branch sites" is the opposite kind of group: a
      // hand-picked, literal membership. Pointing the same claim at it
      // would be true of the product and false of the example.
      return `${list.length} groups covering ${objects} estate objects. Every one is resolved right now, not stored — “West workloads” holds ${west.count} by matching a predicate, so a workload tagged tomorrow is in it tomorrow. “${SITES_GROUP_LABEL}” holds ${mine.count}: you named it in Discover, so it holds exactly the sites you picked, no more and no fewer. The id underneath each label is what every rule stores; the label is only what you read.`;
    },
    route: '/naas/govern?tab=groups',
    targetSelector: '[data-tour="govern-groups"]',
    placement: 'top',
    highlightPadding: 12,
  },
  {
    id: 'group-policy',
    title: 'Write the group into policy',
    description: () => {
      // Self-heal, same reasoning as govern-groups above: the dry-run below
      // has to run against a group that actually exists, whether or not the
      // viewer clicked discover-sites' action.
      ensureSitesGroup();
      const dry = CC.dryRun(payoffSpec()) as { matched: unknown[]; gbps: number };
      const resolved = CC.resolveGroup(WEST_WORKLOADS) as { vpcIds: string[] };
      const cloudCount = cloudCountFor(resolved.vpcIds);
      return `The sentence the whole thing exists for: allow ${SITES_GROUP_LABEL.toLowerCase()} to talk to west workloads — two names, no addresses, spanning ${cloudCount} cloud${cloudCount === 1 ? '' : 's'}. Dry-run first: it matches ${dry.matched.length} modelled flows carrying ${dry.gbps} Gbps, every one of them named. Enforce it and the rule joins the table above, still reading as that sentence — not a table of addresses.`;
    },
    route: '/naas/govern?tab=policies',
    targetSelector: '[data-tour="govern-rules"]',
    placement: 'top',
    highlightPadding: 12,
    action: {
      label: 'Dry-run, then enforce the group policy',
      onClick: ensurePayoffRule,
    },
  },
  {
    id: 'observe',
    title: 'Observe the bytes',
    description:
      'Telemetry derives from the same model every other tab reads. Attaching an on-ramp steps these latency lines down to the private envelope, and egress shifts toward committed pricing. Hover for the crosshair; the charts are live, not a snapshot.',
    route: '/naas/observe',
    targetSelector: '[data-tour="observe-telemetry"]',
    placement: 'top',
    highlightPadding: 12,
  },
  {
    id: 'cost',
    title: COST_BEAT.title,
    description: COST_BEAT.narration,
    route: '/naas/cost',
    targetSelector: '[data-tour="cost-hero"]',
    placement: 'top',
    highlightPadding: 12,
  },
  {
    id: 'gateway',
    // Keep the word "group" out of this copy for the same reason the insights
    // beat does — see the note on that beat.
    title: 'Who is allowed to call a model',
    /* Length is load-bearing here, and the ceiling is tighter than the
       arithmetic suggests. /ai/keys seats the table at y≈140 and the page has
       almost no scroll below it, so ProductTour cannot lift the target to make
       room: the tooltip has to fit in the ~340px between the table's bottom
       edge and the viewport floor. The e2e overlap guard treats "they both fit
       a 720px viewport" as a promise of ZERO overlap, so a tooltip that only
       fits in principle fails. Measured: 470px → 0.238, 418px → 0.143, this
       one → 0. Trim something before adding a sentence here.

       The lifecycle claim this beat used to open with ("the AI rail speaks the
       same lifecycle as NaaS") was the sentence cut, because the layer-home
       beat already states it for both layers — this beat keeps only what is
       true of THIS screen. */
    description:
      'A virtual key is an identity: an agent, its app tag, and exactly the scopes it may invoke. Suspend one and the gateway stops honouring it. Providers and Virtual keys sit under Connect in this layer’s rail — and budgets are written against these identities.',
    route: '/ai/keys',
    targetSelector: '[data-testid="keys-table"]',
    placement: 'top',
    highlightPadding: 10,
  },
  {
    id: 'insights',
    title: 'Every figure, derived live',
    // Keep the word "group" out of this copy: the e2e position guard
    // (tour.spec.ts) exempts only the FINAL beat from the groups-thread
    // placement rule, and this beat sits one before it.
    description:
      'The AI layer keeps its own evidence, on one strip: tokens, cost, time to first token, requests, blocked. Every figure derives from the engine at the moment you read it; move the estate and the strip moves. Below, the sankey traces where each dollar flows: identity, to source, to route, to provider.',
    route: '/ai/observe',
    targetSelector: '[data-tour="insights-kpis"]',
    placement: 'bottom',
    highlightPadding: 12,
  },
  {
    id: 'ai-fabric',
    title: 'Token policies under governance',
    description:
      // "you saw in NaaS · Govern" must stay true on BOTH tour paths: it
      // refers to the govern-groups beat reading the seeded group back —
      // which renders whether or not the viewer clicked any action — never
      // to a policy the Next-only path did not author. The tour spec's
      // groups-thread position guard exempts this final beat deliberately
      // (see tour.spec.ts), and also forbids claiming the viewer authored
      // anything here, hence "New policy previews" rather than "the policy
      // you wrote".
      //
      // Length matters on THIS beat specifically: /ai/govern has ~126px of
      // scroll, so the tooltip and the spotlight cannot be prised apart and
      // the e2e overlap guard holds this beat to a 0.2 ceiling. Measured, at
      // 1280x720: 361 chars → 418px tooltip → 0.162; 477 chars → 470px →
      // 0.216, a failure. Authoring had to be added by tightening the
      // sentences already here, not by appending to them. Roughly 0.45px of
      // tooltip per character — budget ~380 chars and re-run the spec.
      // "Enforce one and a classified request … is denied" was the old close,
      // and it misattributed the denial. TokenPolicies' own status pill spells
      // the truth out: the SCOPE gate (no-external / self-hosted) denies
      // "independent of whether the policy is enforced", while the enforced
      // flag governs the BUDGET gate — which stays shut until an enforce-mode
      // cap intent covers the identity, hence the pill's Armed state. The
      // intent-control beat now carries that half; this one states the scope
      // gate accurately instead of borrowing its effect for enforcement.
      'Tokens get the same treatment as bytes: a budget, a scope, an optional guardrail. The west-workloads group you saw in NaaS · Govern scopes a policy here, resolved live. New policy previews the ceiling against real token spend, then stages it on the twin’s tray. A no-external scope denies a classified request whether the policy is enforced or not — the network never carries it.',
    route: '/ai/govern',
    targetSelector: '[data-tour="aifabric-policies"]',
    placement: 'top',
    highlightPadding: 12,
  },
];
