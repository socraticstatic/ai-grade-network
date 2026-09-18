import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import { vals, defaults } from '../naas-app.js';

// Fix round 2, finding D: the gap route now goes through the real go() (like
// composeFor does) to pick up its scroll-to-top and hover/drill/andi reset
// effects, not just its compose object. go() calls window.scrollTo(0, 0)
// unconditionally; Node has no window. A no-op stub is enough - no test here
// asserts on the scroll position itself (that is proven live, in the browser).
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { scrollTo: () => {}, scrollY: 0 };
}

const est = D.ESTATES.trust;

test('the gap is 2,898 sites, not 3 rows', () => {
  assert.equal(S.gapSiteCount(est), 2898);
  const rows = (est.sites || []).filter(x => !x.priv);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(x => S.countOf(x.name)), [1640, 1210, 48]);
});

test('every estate reports a gap it can defend', () => {
  for (const id of ['empty', 'partial', 'mature', 'trust']) {
    const e = D.ESTATES[id];
    const n = S.gapSiteCount(e);
    const rows = (e.sites || []).filter(x => !x.priv);
    assert.ok(n >= rows.length, `${id}: ${n} sites across ${rows.length} rows`);
  }
});

// vals()-level: the summary counts sites (not rows), each row leads with its
// own count, and the row's `go` carries the quantity all the way into the
// compose order and the alert that announces where it came from.
//
// setState supports the functional-updater form (`c.setState(st => ({...}))`)
// because parseText (naas-app.js) writes that way - a plain Object.assign
// merge would silently no-op on a function argument instead of calling it.
function mkC(extra = {}) {
  const state = { ...defaults(), view: 'trust', screen: 's3', layer: 'cloud', tab: 'connect', ...extra };
  return {
    state,
    setState: (p) => { const patch = typeof p === 'function' ? p(state) : p; if (patch) Object.assign(state, patch); },
  };
}

test('the gap summary counts sites, not rows', () => {
  const c = mkC();
  const v = vals(c);
  assert.equal(
    v.gapSummary,
    '2 cloud regions and 2,898 sites are still on the public internet, in 5 groups.'
  );
});

test('the East site row leads with its own count, strips the parenthetical from its name, and its go enters Compose exactly as the base did', () => {
  const c = mkC();
  const v = vals(c);
  const rawName = (est.sites || []).find(x => !x.priv && /East/.test(x.name)).name;
  assert.equal(rawName, 'Remote sites, East (1,640)');

  // R2 / M2: the row's own name is stripped of the count suffix - the count
  // lives in `sub` now, not doubled between the title and the line under it.
  const row = v.gapRows.find(r => r.name === 'Remote sites, East');
  assert.ok(row, 'the East gap row is missing from gapRows (name should be stripped of "(1,640)")');
  assert.equal(row.qty, 1640);
  assert.match(row.sub, /^1,640 sites · /);

  row.go();

  // M1: composeFor(go, x) on the base entered at step 5 with metro Ashburn -
  // the gap route reproduces that exactly, so the two row kinds in this card
  // (region and site) behave as one card again.
  assert.equal(c.state.compose.step, 5);
  assert.deepEqual(c.state.compose.metros, ['Ashburn']);
  assert.equal(c.state.compose.outcome, 'u1');
  assert.deepEqual(c.state.compose.control, ['Private path required']);

  // I1: the source label lives inside `compose`, not at the top level of
  // state, so the next prefillCompose-based route wipes it automatically.
  assert.equal(c.state.compose.sourceLabel, 'Not connected yet');
  assert.equal(c.state.parsedNoteTitle, undefined, 'parsedNoteTitle must not be written at the top level of state');

  // I2: the quantity rides into `compose` and composeOrder reads it back.
  assert.equal(c.state.compose.bulk, '1,640 sites · Remote sites, East');
  assert.equal(c.state.compose.qty, 1640);
  // Fix round 3, R1: the note itself moved from top-level `parsedNote` into
  // `compose.note` - the root fix. There is no more `c.state.parsedNote`.
  assert.equal(c.state.parsedNote, undefined, 'parsedNote must not exist at the top level of state any more');
  assert.equal(
    c.state.compose.note,
    'Attach 1,640 sites · Remote sites, East. One order, one policy, 1,640 circuits.'
  );
  assert.equal(c.state.screen, 's4');

  // Fix round 2, finding A: the alert renders on the step it was written for.
  // The gap route lands at step 5 and writes noteStep: 5, so hasParsedNote
  // must be true right there - not only computable, but actually shown.
  assert.equal(c.state.compose.noteStep, 5);
  const landed = vals(c);
  assert.equal(landed.hasParsedNote, true, 'the alert must render on the gap route\'s landing step');
  assert.equal(landed.parsedNoteTitle, 'Not connected yet');

  // parsedNoteTitle is derived (`cp.sourceLabel || 'From the drawer'`), read
  // through vals(), not off raw state.
  assert.equal(vals(c).parsedNoteTitle, 'Not connected yet');
});

// Fix round 2, finding A, the other half: one step away from noteStep, the
// alert must not render, even though parsedNote is still sitting in state.
test('the gap route\'s alert is gone one step away from where it landed', () => {
  const c = mkC();
  const v0 = vals(c);
  v0.gapRows.find(r => r.name === 'Remote sites, East').go();
  assert.equal(c.state.compose.step, 5);
  assert.equal(vals(c).hasParsedNote, true);

  c.state.compose.step = 4;
  const v = vals(c);
  assert.equal(v.hasParsedNote, false, 'one step away from noteStep, the alert must be hidden');
  assert.ok(c.state.compose.note, 'compose.note itself is still set - hasParsedNote is what gates it, not the text going away');
});

test('every other route into Compose keeps the default alert title', () => {
  const c = mkC();
  const v = vals(c);
  assert.equal(v.parsedNoteTitle, 'From the drawer');
});

// I1's reproduction, fixed: the reviewer's exact walk - gap row first, then
// leave Compose for the Sites drawer, descend to a metro, and press the
// drawer's own bulk Attach. Before the fix this left "Not connected yet"
// title over a sentence the drawer bulk attach wrote. It must not now.
test('the drawer bulk attach clears the gap route\'s source label (the reviewer\'s stale-title walk, fixed)', () => {
  const c = mkC();
  let v = vals(c);
  const eastRow = v.gapRows.find(r => r.name === 'Remote sites, East');
  eastRow.go();
  assert.equal(vals(c).parsedNoteTitle, 'Not connected yet');

  v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  v.drawer.rows.find(r => /East/.test(r.id)).descend();
  v = vals(c);
  v.drawer.rows.find(r => /Atlanta/.test(r.id)).descend();
  v = vals(c);
  assert.equal(v.drawer.canBulk, true);
  v.drawer.bulkAttach();

  v = vals(c);
  assert.equal(v.parsedNoteTitle, 'From the drawer');
  assert.match(c.state.compose.note, /^Attach \d+ remote sites in Atlanta on a public first mile\./);
});

// The reverse order (from the review's "the reverse order is fine" section):
// drawer bulk attach first, then the gap row. Both titles must read correct
// at each step - this was never broken, but it is the control case for the
// test above.
test('the reverse order is fine: drawer bulk attach, then the gap row', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  v.drawer.rows.find(r => /East/.test(r.id)).descend();
  v = vals(c);
  v.drawer.rows.find(r => /Atlanta/.test(r.id)).descend();
  v = vals(c);
  v.drawer.bulkAttach();
  assert.equal(vals(c).parsedNoteTitle, 'From the drawer');

  v = vals(c);
  const eastRow = v.gapRows.find(r => r.name === 'Remote sites, East');
  eastRow.go();
  assert.equal(vals(c).parsedNoteTitle, 'Not connected yet');
});

// I1, worst case from the review: the free-text parser writes `parsedNote`
// without rebuilding `compose` through prefillCompose (it spreads the live
// compose instead), so it is the one writer that can inherit a stale
// sourceLabel/bulk/qty. It must not - a sentence the user just typed
// themselves must never be titled after a card they didn't touch this time,
// and must never inherit someone else's site count.
test('the free-text parser clears the gap route\'s source label, bulk and qty', () => {
  const c = mkC();
  let v = vals(c);
  const eastRow = v.gapRows.find(r => r.name === 'Remote sites, East');
  eastRow.go();
  assert.equal(c.state.compose.qty, 1640);

  c.state.freeText = 'reach a cloud privately from data center to clouds via dallas';
  v = vals(c);
  v.parseText();

  v = vals(c);
  assert.equal(v.parsedNoteTitle, 'From the drawer');
  assert.equal(c.state.compose.sourceLabel, null);
  assert.equal(c.state.compose.bulk, null);
  assert.equal(c.state.compose.qty, 1);
  assert.match(c.state.compose.note, /^Understood: reach a cloud privately/);
});

// I2: composeOrder reads cp.qty and scales the NetBond line - the connectivity
// product a site-attach order's count belongs on. The hosted VPC, policy and
// observability lines are per-region/account, not per-site, so they stay at
// qty 1. The Monthly column shows the per-site rate; the order's total (which
// feeds pricedTotalF/termTotalF) is the real extended total, unit × qty.
test('the S6 Review for the East attach shows Quantity 1,640 and a total that scales with it', () => {
  const c = mkC();
  const v0 = vals(c);
  const eastRow = v0.gapRows.find(r => r.name === 'Remote sites, East');
  eastRow.go();

  const v = vals(c);
  const netbond = v.orderLines.find(l => l.product === 'NetBond for Cloud');
  assert.ok(netbond, 'the NetBond line is missing from orderLines');
  assert.equal(netbond.qty, 1640);
  // Fix round 2, finding G: the Quantity column binds qtyF, not the raw
  // number, so 1,640 renders with its thousands separator.
  assert.equal(netbond.qtyF, '1,640');
  assert.equal(netbond.monthlyF, '$1,800/mo per site');
  assert.equal(netbond.monthly, 1800 * 1640);

  const vpc = v.orderLines.find(l => /AT&T-hosted VPC per region/.test(l.product));
  assert.ok(vpc, 'the hosted VPC line is missing from orderLines');
  assert.equal(vpc.qty, 1, 'the hosted VPC is per-region, not per-site');
  assert.equal(vpc.qtyF, '1');
  assert.equal(vpc.monthlyF, '$2,400/mo');

  assert.equal(v.pricedTotalF, '$2,954,400/mo');
  assert.equal(v.termTotalF, '$1,477,200/mo');
});

// Fix round 2, finding B: Govern's "Author policy" spreads the live compose
// (`...cp`), so it is a compose writer the round-1 audit (framed around
// `parsedNote` writers) missed. After a gap order it must not carry the gap
// route's label or quantity into a policy order - a policy-authoring order
// must not be priced or titled as a 1,640-site attach.
test('authorPolicy clears the gap route\'s label and quantity (a NEW order)', () => {
  const c = mkC();
  const v0 = vals(c);
  v0.gapRows.find(r => r.name === 'Remote sites, East').go();
  assert.equal(c.state.compose.qty, 1640);
  assert.equal(c.state.compose.sourceLabel, 'Not connected yet');

  const v1 = vals(c);
  v1.authorPolicy();

  const v = vals(c);
  assert.equal(v.parsedNoteTitle, 'From the drawer');
  assert.equal(c.state.compose.sourceLabel, null);
  assert.equal(c.state.compose.bulk, null);
  assert.equal(c.state.compose.qty, 1);
  assert.equal(v.hasParsedNote, false, 'the stale alert must not resurface even if the wizard is later stepped to noteStep 0');

  const netbond = v.orderLines.find(l => l.product === 'NetBond for Cloud');
  assert.equal(netbond.qty, 1);
  assert.equal(netbond.monthlyF, '$1,800/mo');
  assert.equal(v.pricedTotalF, '$4,200/mo', 'the base\'s total for a plain attach on Ashburn - not the 1,640-site total');
});

// Fix round 2, finding C: qty is a site count. Isolating exposed workloads is
// not a site-attach route - it must never set compose.qty, or NetBond prices
// as if each isolated workload were its own circuit.
test('a workload bulk Isolate never sets compose.qty (qty is a site count, not a workload count)', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('clouds');
  v = vals(c);
  v.drawer.rows.find(r => r.isDoor).descend(); // a region
  v = vals(c);
  v.drawer.rows.find(r => r.isDoor).descend(); // a VPC (subnet listing)
  v = vals(c);
  v.drawer.goFlat();
  v = vals(c);
  assert.match(v.drawer.bulkLabel, /^Isolate 6 exposed/, 'this is the reviewer\'s 6-workload reproduction');
  assert.equal(v.drawer.canBulk, true);
  v.drawer.bulkAttach();

  assert.equal(c.state.compose.qty, undefined, 'Isolate must leave qty unset so composeOrder defaults to 1');
  assert.match(c.state.compose.note, /^Isolate 6 exposed workloads in us-east-1: bring them off the public path\.$/);

  const v2 = vals(c);
  const netbond = v2.orderLines.find(l => l.product === 'NetBond for Cloud');
  assert.equal(netbond.qty, 1);
  assert.equal(netbond.qtyF, '1');
  assert.equal(netbond.monthlyF, '$1,800/mo', 'no "per site" suffix - six workloads did not buy six circuits');
  assert.equal(v2.pricedTotalF, '$4,200/mo', 'the base\'s total, unchanged by the workload count');
});

// Fix round 2, finding D: composeFor and the gap route now share one prefill
// (prefillAttach) and both go through go(), so a region row and a site row
// leave identical reset state apart from the fields the gap route adds on
// top (bulk/qty/sourceLabel/noteStep/note). Both also reset `order` to null
// (fix round 3, R3) - newOrder() is the one thing every fresh-compose writer
// spreads alongside its compose.
test('a region row and a site row leave identical state apart from bulk/qty/sourceLabel/noteStep/note', () => {
  const dirty = () => ({
    hoverRegion: 'r', andiScope: { kind: 'region', id: 'r', label: 'r' }, drill: ['a'], cloudDrill: ['b'], fabDrill: ['c'], laneFocus: true, order: { lines: [], monthly: 999 },
  });

  const cRegion = mkC(dirty());
  const vRegion = vals(cRegion);
  vRegion.gapRows.find(r => r.kind === 'region').go();

  const cSite = mkC(dirty());
  const vSite = vals(cSite);
  vSite.gapRows.find(r => r.name === 'Remote sites, East').go();

  // go()'s effects: both routes clear the same hover/drill/andi/laneFocus
  // state, region row or site row alike; both also clear a stale `order`.
  for (const c of [cRegion, cSite]) {
    assert.equal(c.state.hoverRegion, null);
    assert.equal(c.state.andiScope, null);
    assert.deepEqual(c.state.drill, []);
    assert.deepEqual(c.state.cloudDrill, []);
    assert.deepEqual(c.state.fabDrill, []);
    assert.equal(c.state.laneFocus, false);
    assert.equal(c.state.screen, 's4');
    assert.equal(c.state.order, null, 'newOrder() must reset a stale order snapshot');
  }

  // compose fields apart from the site-route additions must match exactly.
  const { bulk: rb, qty: rq, sourceLabel: rs, noteStep: rn, note: rnote, prefillRegion: rpr, prefillWl: rpw, ...regionRest } = cRegion.state.compose;
  const { bulk: sb, qty: sq, sourceLabel: ss, noteStep: sn, note: snote, prefillRegion: spr, prefillWl: spw, ...siteRest } = cSite.state.compose;
  assert.deepEqual(regionRest, siteRest, 'composeFor and the gap route must prefill identically apart from bulk/qty/sourceLabel/noteStep/note/prefillRegion/prefillWl');
  assert.equal(rb, undefined);
  assert.equal(rq, undefined);
  assert.equal(rs, undefined);
  assert.equal(rn, undefined);
  assert.equal(rnote, undefined);
  assert.equal(sb, '1,640 sites · Remote sites, East');
  assert.equal(sq, 1640);
  assert.equal(ss, 'Not connected yet');
  assert.equal(sn, 5);
  assert.equal(snote, 'Attach 1,640 sites · Remote sites, East. One order, one policy, 1,640 circuits.');
});

// Fix round 2, finding E: switching the outcome on a sourceLabel-bearing
// compose is a NEW order - u3 never consumes `qty`, so the alert and the
// price must not keep claiming 1,640 circuits once the outcome no longer is one.
test('switching the outcome after a gap order clears the label, quantity and stale alert text', () => {
  const c = mkC();
  const v0 = vals(c);
  v0.gapRows.find(r => r.name === 'Remote sites, East').go();
  assert.equal(c.state.compose.qty, 1640);

  const v1 = vals(c);
  const u3 = v1.outcomeCards.find(o => o.key === 'u3');
  u3.click();

  const v = vals(c);
  assert.equal(c.state.compose.sourceLabel, null);
  assert.equal(c.state.compose.qty, 1);
  assert.equal(v.parsedNoteTitle, 'From the drawer');
  assert.equal(v.hasParsedNote, false, 'no alert at all - not even a correctly-titled one over stale text');
  assert.equal(c.state.compose.note, null, 'the 1,640-circuits sentence must not survive to be shown at any step');
  assert.equal(v.pricedTotalF, '$2,000/mo', 'u3\'s own price, not the 1,640-site total');
});

// Every wizard-built order (no gap/drawer/panel route behind it) leaves
// `compose.qty` unset, so composeOrder defaults to 1 and every line renders
// exactly as it did before this fix - no regression for the normal flow.
test('a plain wizard order (no compose.qty set) still renders Quantity 1 and the plain monthly text', () => {
  const c = mkC({
    compose: { outcome: 'u1', source: ['Data center'], dest: ['Clouds'], regionTab: 'US East', metros: ['Ashburn'], resiliency: 'Standard', control: ['Private path required'] },
  });
  const v = vals(c);
  const netbond = v.orderLines.find(l => l.product === 'NetBond for Cloud');
  assert.equal(netbond.qty, 1);
  assert.equal(netbond.monthlyF, '$1,800/mo');
  assert.equal(netbond.monthly, 1800);
});

// ---------------------------------------------------------------------------
// Fix round 3: the root fix. `parsedNote` moved from top-level state into
// `compose.note`, so a fresh compose clears it by construction - no writer
// has to remember to. `carriesOrder(cp)` replaces the `sourceLabel`-only
// guard (finding H), and `newOrder()` resets a stale `s.order` snapshot on
// every NEW-order writer (R3).
// ---------------------------------------------------------------------------

// Finding H: the round-2 guard keyed on `cp.sourceLabel`, which only the gap
// route writes. The drawer's bulk attach carries `bulk` + `qty` with no
// label, so it slipped through uncleaned. carriesOrder(cp) catches it.
test('finding H: switching the outcome after the drawer\'s bulk attach (no sourceLabel, but bulk+qty) clears cleanly', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  v.drawer.rows.find(r => /East/.test(r.id)).descend();
  v = vals(c);
  v.drawer.rows.find(r => /Atlanta/.test(r.id)).descend();
  v = vals(c);
  v.drawer.bulkAttach();

  assert.equal(c.state.compose.qty, 353);
  assert.equal(c.state.compose.sourceLabel, undefined, 'the drawer never writes a label - this is the gap the round-2 guard missed');
  assert.equal(vals(c).pricedTotalF, '$637,800/mo');

  v = vals(c);
  const u3 = v.outcomeCards.find(o => o.key === 'u3');
  u3.click();

  v = vals(c);
  assert.equal(v.hasParsedNote, false, 'the alert must be gone, not just mistitled');
  assert.equal(c.state.compose.qty, 1);
  assert.equal(c.state.compose.bulk, null);
  assert.equal(v.pricedTotalF, '$2,000/mo', 'u3\'s own price, not the 353-site total');

  // Switching back to u1 must not resurrect the 353-site order either - it
  // was cleaned, not hidden.
  const u1 = v.outcomeCards.find(o => o.key === 'u1');
  u1.click();
  v = vals(c);
  const netbond = v.orderLines.find(l => l.product === 'NetBond for Cloud');
  assert.equal(netbond.qty, 1, 'switching back to u1 must not silently restore the 353-site quantity');
  assert.equal(netbond.monthlyF, '$1,800/mo');
  assert.equal(v.pricedTotalF, '$4,200/mo', 'the base\'s plain-attach total, not $637,800');
});

// Finding I: chooseTier, steerBucket and startOrder build fresh compose
// literals with no `step` and, before the root fix, no way to clear a
// top-level `parsedNote` they never touched. Now that the note lives inside
// `compose`, these routes are clean by construction - no per-writer clear
// was added to any of them.
test('finding I: chooseTier (Steer tier), steerBucket and startOrder leave no note after a gap order', () => {
  // chooseTier via a "Steer this bucket on the fabric" cost-tab tier.
  {
    const c = mkC();
    let v = vals(c);
    v.gapRows.find(r => r.name === 'Remote sites, East').go();
    v = vals(c);
    const tier = v.costFindings.flatMap(f => f.tiers || []).find(t => /^Steer/.test(t.name));
    assert.ok(tier, 'no "Steer" tier found to reproduce chooseTier\'s compose-writing branch');
    tier.choose();
    v = vals(c);
    assert.equal(c.state.screen, 's4');
    assert.equal(v.hasParsedNote, false, 'chooseTier');
    assert.equal(c.state.compose.note, undefined, 'chooseTier');
  }
  // steerBucket, from a Cost-tab bucket's own "Steer this bucket" door.
  {
    const c = mkC();
    let v = vals(c);
    v.gapRows.find(r => r.name === 'Remote sites, East').go();
    v = vals(c);
    assert.ok(v.buckets.length, 'no steerable buckets to reproduce steerBucket with');
    v.buckets[0].steer();
    v = vals(c);
    assert.equal(c.state.screen, 's4');
    assert.equal(v.hasParsedNote, false, 'steerBucket');
    assert.equal(c.state.compose.note, undefined, 'steerBucket');
  }
  // startOrder, the Connect tab's path/buy picker "start order" button.
  {
    const c = mkC();
    let v = vals(c);
    v.gapRows.find(r => r.name === 'Remote sites, East').go();
    v = vals(c);
    v.startOrder();
    v = vals(c);
    assert.equal(c.state.screen, 's4');
    assert.equal(v.hasParsedNote, false, 'startOrder');
    assert.equal(c.state.compose.note, undefined, 'startOrder');
  }
});

// The invariant, walked across every fresh-compose route this file can
// reach through vals(): after a gap order (note set, label set, qty 1,640),
// a route that writes its own note shows exactly that note and nothing
// stale; a route that writes no note at all shows no note at all. No route
// ever shows the gap order's leftover text.
test('the invariant: no fresh-compose route ever shows a note it did not itself write', () => {
  const freshRoutesWithNoNote = [
    ['composeFor via a region gap row', (v) => v.gapRows.find(r => r.kind === 'region').go()],
    ['chooseTier (Steer tier)', (v) => v.costFindings.flatMap(f => f.tiers || []).find(t => /^Steer/.test(t.name)).choose()],
    ['steerBucket', (v) => v.buckets[0].steer()],
    ['startOrder', (v) => v.startOrder()],
    ['authorPolicy', (v) => v.authorPolicy()],
  ];
  for (const [label, run] of freshRoutesWithNoNote) {
    const c = mkC();
    let v = vals(c);
    v.gapRows.find(r => r.name === 'Remote sites, East').go();
    assert.equal(c.state.compose.note, 'Attach 1,640 sites · Remote sites, East. One order, one policy, 1,640 circuits.', `${label}: setup`);
    v = vals(c);
    run(v);
    v = vals(c);
    assert.equal(v.hasParsedNote, false, `${label}: must show no alert`);
    // Fresh-literal writers (composeFor, chooseTier, steerBucket, startOrder)
    // never had a `note` key, so it reads undefined; cleanCompose-based
    // writers (authorPolicy) explicitly null it. Both are "no note" - the
    // invariant is falsiness, not a specific JS value.
    assert.ok(!c.state.compose.note, `${label}: must carry no note at all, not even a cleared empty one masquerading as set`);
  }

  // The gap route, on its own fresh state, must show exactly its own note
  // (not a leftover from nothing, and not empty) - the counterpart case to
  // the "no note" routes above. The free-text parser's own-note case is
  // already covered by "the free-text parser clears the gap route's source
  // label, bulk and qty" earlier in this file.
  {
    const c = mkC();
    const v0 = vals(c);
    v0.gapRows.find(r => r.name === 'Remote sites, East').go();
    const v = vals(c);
    assert.equal(v.hasParsedNote, true);
    assert.equal(c.state.compose.note, 'Attach 1,640 sites · Remote sites, East. One order, one policy, 1,640 circuits.');
  }
});

// R3: `s.order` freezes whatever Review last showed - set by choosing a
// marketplace product - and nothing reset it when a NEW order started from
// Compose, so Review kept showing the frozen $2,400 product order under an
// S4 screen that said $2,954,400/mo. newOrder() fixes this: every NEW-order
// writer resets `order: null`, so Review's `s.order || composed` falls
// through to the live, correct order.
test('R3: a marketplace product choice does not survive into a later gap order\'s Review', () => {
  const c = mkC();
  let v = vals(c);
  const product = v.mostChosen.find(p => p.id === 'hosted-vpc');
  assert.ok(product, 'the $2,400 hosted-vpc product card is not in mostChosen');
  assert.equal(product.priceLine, 'Starting at $2,400/mo');
  product.choose();

  assert.equal(c.state.screen, 's6');
  assert.equal(c.state.order.monthly, 2400, 'choosing a product freezes s.order at $2,400');

  v = vals(c);
  const row = v.gapRows.find(r => r.name === 'Remote sites, East');
  row.go();

  assert.equal(c.state.screen, 's4');
  assert.equal(c.state.order, null, 'the gap route must reset the frozen product order');

  v = vals(c);
  assert.equal(v.pricedTotalF, '$2,954,400/mo', 'S4 already promised this number');
  const netbond = v.orderLines.find(l => l.product === 'NetBond for Cloud');
  assert.ok(netbond, 'Review\'s order lines must include the NetBond line, not the frozen product order');
  assert.equal(netbond.qty, 1640);
  assert.equal(netbond.qtyF, '1,640');
  assert.equal(v.pricedTotalF, '$2,954,400/mo', 'Review must show the same total S4 promised, not the stale $2,400');
});

// ---------------------------------------------------------------------------
// Fix round 4: two non-blocking findings left by the round-3 re-review.
// ---------------------------------------------------------------------------

// N1: round 3's `startsNew = patch.outcome !== undefined && carriesOrder(cp)`
// gated BOTH halves (cleanCompose and order:null) on carriesOrder, so a plain
// wizard order (no count, no label, no note - e.g. a region row) still left
// a stale Review snapshot behind on an outcome switch. carriesOrder should
// only gate whether the compose itself needs cleaning; an outcome switch is
// always a new order, so `order: null` must be unconditional.
test('N1: an outcome switch always drops the stale Review, even for a plain wizard order (no count, no label, no note)', () => {
  const c = mkC();
  let v = vals(c);
  v.gapRows.find(r => r.kind === 'region').go();
  v = vals(c);
  assert.equal(c.state.compose.outcome, 'u1');
  assert.equal(c.state.compose.sourceLabel, undefined, 'a plain wizard order carries no label');
  assert.equal(c.state.compose.bulk, undefined, 'a plain wizard order carries no bulk count');
  v.reviewOrder();
  assert.ok(c.state.order, 'Review must freeze an order to reproduce the stale-Review bug');
  assert.equal(c.state.screen, 's6');

  // Back to Compose (implicitly - state.order/compose don't change on their
  // own), switch the outcome. carriesOrder(cp) is false for this compose, so
  // round 3 left the stale order behind here; it must be dropped regardless.
  v = vals(c);
  const u3 = v.outcomeCards.find(o => o.key === 'u3');
  u3.click();
  assert.equal(c.state.order, null, 'switching the outcome must always drop the stale Review, carriesOrder or not');
  assert.equal(c.state.compose.outcome, 'u3');

  // A SAME-order edit (setC with no outcome key) must still leave a live
  // order untouched - carriesOrder still gates the cleanCompose half.
  v = vals(c);
  v.reviewOrder();
  assert.ok(c.state.order, 'Review must freeze the u3 order to test the SAME-order path');
  v = vals(c);
  const metro = v.metroChips.find(m => !m.on);
  assert.ok(metro, 'need an unselected metro chip to toggle');
  metro.click();
  assert.ok(c.state.order, 'a metro change carries no outcome key and must not touch order');
});

// N2: `goCompose`'s fresh branch called `newOrder(...)`, which nulls
// `s.order` even when the live compose has not started an outcome yet - the
// exact state right after a marketplace product pick. The fresh branch must
// keep `s.order` alive; only starting an outcome (via setC) should reset it.
test('N2: the header Compose shortcut keeps a live product order when the compose has no outcome yet', () => {
  const c = mkC();
  let v = vals(c);
  const product = v.mostChosen.find(p => p.id === 'hosted-vpc');
  assert.ok(product, 'the $2,400 hosted-vpc product card is not in mostChosen');
  product.choose();

  assert.equal(c.state.screen, 's6');
  assert.equal(c.state.order.monthly, 2400, 'choosing a product freezes s.order at $2,400');
  assert.equal(c.state.compose.outcome, null, 'the product path never touches compose');

  v = vals(c);
  v.goCompose();

  assert.equal(c.state.screen, 's4');
  assert.equal(c.state.order.monthly, 2400, 'the header Compose shortcut must not discard an order the user has not submitted');
});
