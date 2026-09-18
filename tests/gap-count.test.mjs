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
  assert.equal(
    c.state.parsedNote,
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
  assert.ok(c.state.parsedNote, 'parsedNote itself is still set - hasParsedNote is what gates it, not the text going away');
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
  assert.match(c.state.parsedNote, /^Attach \d+ remote sites in Atlanta on a public first mile\./);
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
  assert.match(c.state.parsedNote, /^Understood: reach a cloud privately/);
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
  assert.match(c.state.parsedNote, /^Isolate 6 exposed workloads in us-east-1: bring them off the public path\.$/);

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
// top (bulk/qty/sourceLabel/noteStep/parsedNote).
test('a region row and a site row leave identical state apart from bulk/qty/sourceLabel/noteStep/parsedNote', () => {
  const dirty = () => ({
    hoverRegion: 'r', andiScope: { kind: 'region', id: 'r', label: 'r' }, drill: ['a'], cloudDrill: ['b'], fabDrill: ['c'], laneFocus: true,
  });

  const cRegion = mkC(dirty());
  const vRegion = vals(cRegion);
  vRegion.gapRows.find(r => r.kind === 'region').go();

  const cSite = mkC(dirty());
  const vSite = vals(cSite);
  vSite.gapRows.find(r => r.name === 'Remote sites, East').go();

  // go()'s effects: both routes clear the same hover/drill/andi/laneFocus
  // state, region row or site row alike.
  for (const c of [cRegion, cSite]) {
    assert.equal(c.state.hoverRegion, null);
    assert.equal(c.state.andiScope, null);
    assert.deepEqual(c.state.drill, []);
    assert.deepEqual(c.state.cloudDrill, []);
    assert.deepEqual(c.state.fabDrill, []);
    assert.equal(c.state.laneFocus, false);
    assert.equal(c.state.screen, 's4');
  }

  // compose fields apart from the site-route additions must match exactly.
  const { bulk: rb, qty: rq, sourceLabel: rs, noteStep: rn, prefillRegion: rpr, prefillWl: rpw, ...regionRest } = cRegion.state.compose;
  const { bulk: sb, qty: sq, sourceLabel: ss, noteStep: sn, prefillRegion: spr, prefillWl: spw, ...siteRest } = cSite.state.compose;
  assert.deepEqual(regionRest, siteRest, 'composeFor and the gap route must prefill identically apart from bulk/qty/sourceLabel/noteStep/prefillRegion/prefillWl');
  assert.equal(rb, undefined);
  assert.equal(rq, undefined);
  assert.equal(rs, undefined);
  assert.equal(rn, undefined);
  assert.equal(sb, '1,640 sites · Remote sites, East');
  assert.equal(sq, 1640);
  assert.equal(ss, 'Not connected yet');
  assert.equal(sn, 5);
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
  assert.equal(c.state.parsedNote, '', 'the 1,640-circuits sentence must not survive to be shown at any step');
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
