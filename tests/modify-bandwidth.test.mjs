import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as R from '../naas-round2.js';
import * as X from '../naas-connections.js';
import * as OD from '../naas-observe-dash.js';
import * as BW from '../naas-bandwidth.js';
import { vals, defaults, DEMO_KEYS, mailDomain } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Modify bandwidth (Micah, 2026-09-30: "option to resize bandwidth like the
// netbond advanced flow"). The flow is transcribed from NetBond Advanced,
// ~/Developer/att-netbond-sdci/src/components/connection/modals/ModifyBandwidthModal.tsx
// and the choices it reads, src/data/providerBandwidth.ts: current bandwidth,
// the provider's choices, the price change (Current monthly, New monthly,
// Difference), then Apply change.
//
// Round 2 (skeptic, 2026-09-30): one price for one connection, the one Cost
// > By leg bills; the approval step the retired Resize had; an order that
// lands on its day by the one clock and shows under Connect > Orders as an
// order; a size that drops traffic confirmed twice, in warning; Capacity rows
// open in place again; Escape and outside click close it, focus moves in.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const SRC = readFileSync(new URL('../naas-app.js', import.meta.url), 'utf8');
const ESTATES = ['partial', 'mature', 'trust', 'small', 'empty'];
const cap = (view) => { const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv); return OD.capacity(X.connections(est, ob), '30d'); };
const growingEast = () => cap('partial').find(r => r.id === 'cx-us-east-1');
const observe = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn', ...patch });
const where = (st) => JSON.stringify([st.screen, st.tab, st.obPage, st.obPanel, st.costPanel]);
const AT = Date.parse('2026-09-29T12:00:00Z'); // the harness's pinned clock, a Tuesday
const LATER = '2026-10-05T15:00:00Z'; // the Monday demo
// Cost > By leg's NetBond line: its regions and what one region costs.
const nbLine = (view) => { const est = D.ESTATES[view]; return R.attChargeRows(est, A.inventory(est)).find(r => r.key === 'nb') || { v: 0, regions: [] }; };
const bwOrders = (st) => (st.orders || []).filter(o => o.kind === 'bandwidth');
// Pick, Apply change, (Apply anyway), Submit: the whole flow, as a person clicks it.
function order(c, pick) {
  c.setState({ bwPick: { id: c.state.bwFor, ...pick } });
  let v = vals(c);
  v.bw.apply(); v = vals(c);
  if (v.bw.isConfirm) { v.bw.applyAnyway(); v = vals(c); }
  assert.equal(v.bw.isReview, true, 'Apply change reaches the approval step');
  v.bw.submit();
  return vals(c);
}

test('the choices are NetBond Advanced\'s, cloud by cloud, in its words', () => {
  const labels = (cloud) => BW.tiersFor(cloud).map(t => t.label);
  assert.deepEqual(labels('AWS'), ['50 Mbps', '100 Mbps', '200 Mbps', '300 Mbps', '400 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps', '25 Gbps']);
  assert.deepEqual(labels('Azure'), ['50 Mbps', '100 Mbps', '200 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps']);
  assert.deepEqual(labels('GCP'), ['50 Mbps', '100 Mbps', '200 Mbps', '300 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps', '20 Gbps', '50 Gbps']);
  assert.deepEqual(labels('Oracle'), ['1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps']);
  assert.deepEqual(labels('CoreWeave'), ['100 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps']);
  assert.equal(BW.burstNoteFor('AWS'), 'Traffic exceeding provisioned rate is dropped (traffic policing).');
  assert.equal(BW.burstNoteFor('Azure'), 'Can burst up to 2x provisioned bandwidth using redundancy link. Not for sustained use.');
  assert.equal(BW.burstNoteFor('GCP'), 'Capacity is approximate. Attachments may exceed provisioned bandwidth. Rate limiting on your router recommended.');
  assert.equal(BW.burstNoteFor('Oracle'), 'Fixed provisioned bandwidth. Can be modified after creation.');
  assert.equal(BW.AWS_HOSTED_NOTE, 'AWS hosted connections require provisioning new connections at the new speed. Existing connections will be replaced.');
  const src = readFileSync(new URL('../naas-bandwidth.js', import.meta.url), 'utf8');
  assert.ok(src.includes('att-netbond-sdci/src/components/connection/modals/ModifyBandwidthModal.tsx'));
  assert.ok(src.includes('att-netbond-sdci/src/data/providerBandwidth.ts'));
});

test('AT&T sells the bandwidth on NetBond only, never on a direct connect or Equinix port', () => {
  assert.equal(BW.sells({ ramp: 'NetBond' }), true);
  for (const ramp of ['DX', 'ER', 'Interconnect', 'EQX']) assert.equal(BW.sells({ ramp }), false, ramp);
  assert.equal(BW.sells(null), false);
});

test('one price for one connection: the drawer reads the NetBond line Cost > By leg bills', () => {
  // Every connection AT&T sells is one NetBond region on Cost's line, at its one price.
  for (const view of ['partial', 'mature', 'trust']) {
    const nb = nbLine(view), unit = nb.v / nb.regions.length;
    assert.equal(unit, 1800, `${view}: the catalog's NetBond for Cloud`);
    const sold = cap(view).filter(BW.sells);
    assert.deepEqual(sold.map(r => r.region).sort(), [...nb.regions].sort(), `${view}: one NetBond connection per region Cost bills`);
    let sum = 0;
    for (const r of sold) {
      const v = vals(observe(view, { bwFor: r.id }));
      assert.equal(v.bw.money[0].l, 'Current monthly');
      assert.equal(v.bw.money[0].v, '$1,800/mo', `${view} ${r.id}`);
      sum += 1800;
    }
    assert.equal(sum, nb.v, `${view}: the drawers add up to Cost's NetBond line`);
  }
  // Resize keeps the connection, so it never claims the whole NetBond bill back.
  const c = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { id: 'cx-us-east-1', ports: 2, mbps: 10000 } });
  const v = vals(c);
  assert.deepEqual(v.bw.money.map(m => m.v), ['$1,800/mo', '$1,800/mo', 'No change']);
  assert.equal(v.bw.money[2].ink, 'var(--text-heading)', 'no change reads plain, never the savings ink');
  assert.match(v.bw.priceLine, /1 region × \$1,800/, 'the price says whose rule it is');
  assert.ok(!/-\$1,800/.test(JSON.stringify(v.bw)));
  // Bank scale: $1,800 on each, never $37,800 or $9,000.
  for (const id of ['cx-us-east-1', 'cx-us-central1']) assert.equal(vals(observe('trust', { bwFor: id })).bw.money[0].v, '$1,800/mo', id);
});

test('a port past the catalog\'s 10 Gbps line is priced by AT&T after review, never stretched', () => {
  assert.equal(BW.PORT_CEIL_MBPS, 10000, 'the catalog says Up to 10 Gbps');
  const c = observe('trust', { bwFor: 'cx-us-east-1', bwPick: { id: 'cx-us-east-1', ports: 20, mbps: 25000 } });
  const v = vals(c);
  assert.deepEqual(v.bw.money.map(m => m.v), ['$1,800/mo', 'After review', 'After review']);
  assert.ok(!/\$90,000/.test(JSON.stringify(v.bw)));
  assert.match(v.bw.priceLine, /^25 Gbps a port is past the catalog's 10 Gbps line\. Priced by AT&T after review\.$/);
});

test('Growing us-east-1: the peak, the average and the headroom are the Capacity row\'s own', () => {
  const cp = growingEast();
  const v = vals(observe('partial', { bwFor: 'cx-us-east-1' }));
  const g = v.gaugeRows.find(x => x.id === 'cx-us-east-1');
  assert.equal(v.bw.title, 'AWS us-east-1');
  assert.equal(v.bw.sub, 'NetBond', 'the size is said once, under Current bandwidth');
  assert.equal(v.bw.nowLabel, '3 × 10 Gbps'); assert.equal(v.bw.nowF, '30 Gbps');
  assert.deepEqual(v.bw.stats.map(x => x.l), ['Peak', 'Average', 'Headroom']);
  assert.equal(v.bw.stats[0].v, g.peakF); assert.equal(v.bw.stats[0].v, `${cp.peakG} Gbps`);
  assert.equal(v.bw.stats[1].v, g.avgF, 'one average: the Capacity row\'s, over the same window');
  assert.equal(v.bw.stats[1].sub, `${Math.round(cp.avgG / cp.capG * 100)}% over 30 days`, 'the window the Capacity row reads');
  assert.equal(v.bw.stats[2].v, g.headF);
  // Nothing in the drawer leaves it: the figures are figures, not doors that throw the pick away.
  for (const x of v.bw.stats) assert.equal(x.go, undefined, x.l);
});

test('picking a size moves the headroom; the fit line reads plainly, in warning when it is short', () => {
  const cp = growingEast();
  const two = BW.plan(cp, { ports: 2, mbps: 10000 });
  assert.equal(two.changed, true);
  assert.equal(two.pick.label, '2 × 10 Gbps');
  assert.equal(Math.round(two.pick.peakPct), cp.resizePct);
  assert.equal(two.pick.state, 'ok');
  assert.equal(BW.fitLine(two), '', 'a size that holds the peak needs no word');
  const five = BW.plan(cp, { ports: 3, mbps: 5000 });
  assert.equal(five.pick.state, 'risk');
  assert.equal(BW.fitLine(five), 'Over 80% at the 12.3 Gbps peak.');
  const one = BW.plan(cp, { ports: 3, mbps: 1000 });
  assert.equal(one.pick.state, 'down');
  assert.equal(BW.fitLine(one), 'Short of the 12.3 Gbps peak.');
  assert.equal(BW.dropLine(one), 'Short of the 12.3 Gbps peak. Traffic exceeding provisioned rate is dropped (traffic policing).', 'the confirm and approval say what happens, in AWS\'s words');
  assert.equal(BW.dropLine(five), '');
  assert.equal(BW.FIT_INK.down, 'var(--warning)', 'a size that drops traffic reads in warning');
  assert.equal(BW.FIT_INK.risk, 'var(--warning)');
  assert.equal(BW.FIT_INK.ok, 'var(--success)');
  assert.equal(BW.plan(cp, { ports: 0, mbps: 10000 }).ports, 3, 'no pick of ports keeps today\'s');
  assert.equal(BW.plan(cp, { ports: -2, mbps: 10000 }).ports, 1);
  // The ladder draws each size in its fit ink; none in the savings or error ink by accident.
  const v = vals(observe('partial', { bwFor: 'cx-us-east-1' }));
  assert.equal(v.bw.choices.find(ch => ch.label === '10 Gbps').ink, 'var(--success)');
  assert.equal(v.bw.choices.find(ch => ch.label === '1 Gbps').ink, 'var(--warning)');
  assert.equal(v.bw.choices.find(ch => ch.label === '1 Gbps').rad, '2px', 'short of the peak keeps its own mark');
});

test('Apply change asks for approval, as the retired Resize did; Submit places an order under Connect > Orders', () => {
  const c = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { id: 'cx-us-east-1', ports: 2, mbps: 10000 } });
  const before = where(c.state);
  let v = vals(c);
  assert.equal(v.bw.isPick, true); assert.equal(v.bw.applyLabel, 'Apply change'); assert.equal(v.bw.applyOff, false);
  v.bw.apply(); v = vals(c);
  assert.equal(v.bw.isReview, true, 'a size that holds the peak goes straight to approval');
  assert.equal(bwOrders(c.state).length, 0, 'nothing is ordered before Submit');
  const approver = `j.martinez@${mailDomain(D.ESTATES.partial)}`;
  assert.equal(v.bw.approver, approver, 'the approver on the estate\'s own domain, as Review names it');
  assert.deepEqual(v.bw.review.map(r => r.k), ['Change', 'Monthly', 'Timeline', 'Notify']);
  assert.deepEqual(v.bw.review.map(r => r.v), ['3 × 10 Gbps to 2 × 10 Gbps', '$1,800/mo, no change', '1 business day, takes effect Wed, Sep 30', approver]);
  // Back keeps the pick.
  v.bw.back(); v = vals(c);
  assert.equal(v.bw.isPick, true); assert.equal(v.bw.newLabel, '2 × 10 Gbps');
  v.bw.apply(); v = vals(c);
  v.bw.setApprover({ target: { value: 'k.osei@acme.com' } }); v = vals(c);
  v.bw.submit(); v = vals(c);
  assert.equal(where(c.state), before, 'nothing leaves the page');
  // One order list: the app's own, never a list of its own.
  assert.ok(!('bwOrders' in c.state) || !c.state.bwOrders || !c.state.bwOrders.length, 'no separate list');
  const [o] = bwOrders(c.state);
  assert.ok(o, JSON.stringify(c.state.orders));
  assert.equal(o.est, 'partial'); assert.equal(o.conn, 'cx-us-east-1'); assert.equal(o.approver, 'k.osei@acme.com');
  assert.equal(o.from, '3 × 10 Gbps'); assert.equal(o.to, '2 × 10 Gbps'); assert.equal(o.effectiveF, 'Wed, Sep 30');
  // The drawer says it is sent and waits for it.
  assert.equal(v.bw.locked, true); assert.equal(v.bw.isPick, true);
  assert.equal(v.bw.orderLine, 'Submitted for approval to k.osei@acme.com: 3 × 10 Gbps to 2 × 10 Gbps, takes effect Wed, Sep 30.');
  assert.equal(v.bw.applyOff, true);
  // Connect > Orders lists it, with its stage, beside the orders the connect flow placed.
  c.setState({ bwFor: null, bwStep: null, tab: 'connect', cnPage: 'orders', obPage: null });
  v = vals(c);
  const row = v.ordRows.find(r => r.kind === 'bandwidth');
  assert.ok(row, JSON.stringify(v.ordRows));
  assert.equal(row.title, 'Modify bandwidth, AWS us-east-1');
  assert.equal(row.type, 'NetBond'); assert.equal(row.what, '3 × 10 Gbps to 2 × 10 Gbps');
  assert.equal(row.monthly, '$1,800/mo, no change');
  assert.equal(row.stage, 'Submitted for approval');
  assert.equal(row.atLine, 'Takes effect Wed, Sep 30');
  assert.equal(row.sub, 'Placed at 07:00 · approver k.osei@acme.com');
  assert.equal(v.hasOrdRows, true);
  // Another estate's Orders do not list it.
  assert.ok(!vals(mkC({ view: 'mature', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders', orders: c.state.orders })).ordRows.some(r => r.kind === 'bandwidth'));
  // Deliver now validates the region a connect-flow order reaches, never a bandwidth change's.
  assert.ok(/kind !== 'bandwidth'/.test(SRC.slice(SRC.indexOf('deliverNow:'), SRC.indexOf('deliverNow:') + 400)), 'Deliver now skips bandwidth orders');
});

test('a size that drops traffic needs a second confirm, in warning', () => {
  const c = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { id: 'cx-us-east-1', ports: 3, mbps: 1000 } });
  let v = vals(c);
  assert.equal(v.bw.hasFit, true); assert.equal(v.bw.fitInk, 'var(--warning)');
  v.bw.apply(); v = vals(c);
  assert.equal(v.bw.isConfirm, true, 'Apply change on a short size asks again');
  assert.equal(v.bw.isReview, false);
  assert.equal(v.bw.confirmLine, '3 × 1 Gbps is short of the 12.3 Gbps peak. Traffic exceeding provisioned rate is dropped (traffic policing).');
  assert.equal(v.bw.confirmInk, 'var(--warning)');
  assert.equal(v.bw.confirmLabel, 'Apply anyway');
  v.bw.back(); v = vals(c);
  assert.equal(v.bw.isPick, true); assert.equal(v.bw.newLabel, '3 × 1 Gbps', 'Back keeps the pick');
  v.bw.apply(); vals(c).bw.applyAnyway(); v = vals(c);
  assert.equal(v.bw.isReview, true);
  assert.equal(v.bw.reviewWarn, 'Short of the 12.3 Gbps peak. Traffic exceeding provisioned rate is dropped (traffic policing).', 'approval still says it drops traffic');
  // A size over 80% but holding the peak goes straight on.
  const r = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { id: 'cx-us-east-1', ports: 3, mbps: 5000 } });
  vals(r).bw.apply();
  assert.equal(vals(r).bw.isReview, true);
});

test('an order lands on its day, by the one clock', () => {
  // Ordered on a Tuesday, it lands Wednesday; on a Friday, Monday.
  const cp = growingEast();
  assert.equal(BW.dayF(BW.effectiveAt(AT)), 'Wed, Sep 30');
  assert.equal(BW.dayF(BW.effectiveAt(Date.parse('2026-10-02T15:00:00Z'))), 'Mon, Oct 5');
  const o = BW.orderOf(cp, { ports: 2, mbps: 10000 }, AT, 'partial', { n: 1, approver: 'a@b.com', unit: 1800 });
  assert.equal(BW.stageOf(o, AT), 'pending');
  assert.equal(BW.stageOf(o, o.effectiveAt - 1), 'pending');
  assert.equal(BW.stageOf(o, o.effectiveAt), 'live');
  assert.equal(BW.inFlight([o], 'partial', 'cx-us-east-1', AT), o);
  assert.equal(BW.inFlight([o], 'partial', 'cx-us-east-1', Date.parse(LATER)), null, 'landed, it is no longer in flight');
  assert.equal(BW.inFlight([o], 'mature', 'cx-us-east-1', AT), null, 'an order belongs to its estate');
  // Placed Tuesday in the app, read the next Monday.
  const c = observe('partial', { bwFor: 'cx-us-east-1' });
  order(c, { ports: 2, mbps: 10000 });
  c.setState({ nowIso: LATER, bwFor: null, bwStep: null, bwPick: null });
  let v = vals(c);
  // The connection is the size it was changed to, everywhere the size is read.
  const g = v.gaugeRows.find(x => x.id === 'cx-us-east-1');
  assert.equal(g.portsF, '2 × 10G');
  assert.equal(g.hasPortsNote, false, 'nothing in progress');
  assert.equal(g.capG, 20);
  c.setState({ bwFor: 'cx-us-east-1' }); v = vals(c);
  assert.equal(v.bw.locked, false, 'the connection is unlocked once it lands');
  assert.equal(v.bw.nowLabel, '2 × 10 Gbps');
  // Changes lists it on the day it took effect, no longer planned.
  c.setState({ bwFor: null, obPanel: 'changes' }); v = vals(c);
  const ch = v.changeAll.find(r => r.text === 'Bandwidth 3 × 10 Gbps to 2 × 10 Gbps');
  assert.ok(ch, v.changeAll.map(r => r.text).join(' | '));
  assert.equal(ch.upcoming, false); assert.equal(ch.touched, 'AWS us-east-1'); assert.equal(ch.source, 'AT&T');
  // Orders reads it live.
  c.setState({ tab: 'connect', cnPage: 'orders' }); v = vals(c);
  const row = v.ordRows.find(r => r.kind === 'bandwidth');
  assert.equal(row.stage, 'Live'); assert.equal(row.atLine, 'Took effect Wed, Sep 30'); assert.equal(row.stageInk, 'var(--success)');
  // Optimize has nothing left to resize there: two ports hold the peak at 62%.
  c.setState({ tab: 'cost', costPanel: 'optimize' }); v = vals(c);
  const opt = v.optRows.find(r => r.key === 'capacity');
  assert.equal(opt.empty, true, opt.head);
  // Before it lands, Changes has it ahead, planned.
  const p = observe('partial', { bwFor: 'cx-us-east-1' });
  order(p, { ports: 2, mbps: 10000 });
  p.setState({ bwFor: null, obPanel: 'changes' });
  const up = vals(p).changeAll.find(r => r.text === 'Bandwidth 3 × 10 Gbps to 2 × 10 Gbps');
  assert.equal(up.upcoming, true); assert.equal(up.whenF, 'Sep 30, planned');
});

test('User activity says what the person did: submitted, for approval', () => {
  const c = observe('partial', { bwFor: 'cx-us-east-1' });
  order(c, { ports: 2, mbps: 10000 });
  c.setState({ bwFor: null, obPage: 'logs', logTab: 'user' });
  const v = vals(c);
  const approver = `j.martinez@${mailDomain(D.ESTATES.partial)}`;
  const row = v.actRows.find(r => r.verb === 'Submitted a bandwidth change');
  assert.ok(row, JSON.stringify(v.actRows.slice(0, 3)));
  assert.equal(row.target, 'AWS us-east-1');
  assert.equal(row.detail, `3 × 10 Gbps to 2 × 10 Gbps, for ${approver} to approve`);
  assert.equal(row.result, 'Submitted', 'never Applied beside a change that has not landed');
  // The submission is not itself a network change; the day it lands is.
  c.setState({ obPage: 'perf', obPanel: 'changes' });
  assert.ok(!vals(c).changeAll.some(r => /Submitted a bandwidth change/.test(r.text)));
});

test('Observe > Capacity rows open the connection panel in place, as on 3659e9a; the panel offers the flow', () => {
  let offered = 0;
  for (const view of ESTATES) {
    for (const g of vals(observe(view)).gaugeRows) {
      assert.equal(typeof g.click, 'function');
      for (const k of ['logsGo', 'bwGo', 'impactGo']) assert.equal(g[k], undefined, `${view} ${g.label}: ${k} is back`);
      const c = observe(view);
      const before = where(c.state);
      vals(c).gaugeRows.find(x => x.id === g.id).click();
      assert.equal(c.state.mapSel, g.id); assert.equal(where(c.state), before, 'nothing leaves the page');
      const p = vals(c).panel;
      const sold = g.ramp === 'NetBond';
      assert.equal(p.actions.some(a => a.label === 'Modify bandwidth'), sold, `${view} ${g.label}`);
      if (sold) { offered++; assert.equal(p.primary.label, 'Modify bandwidth'); p.primary.go(); assert.equal(c.state.bwFor, g.id); assert.equal(where(c.state), before); }
    }
  }
  assert.equal(offered, 5, 'Growing 1, Established 2, Bank scale 2');
  // A saturating NetBond connection's Add a port is the same flow, one port up.
  const t = observe('trust', { mapSel: 'cx-us-central1', panelTab: 'actions' });
  vals(t).panel.actions.find(a => a.label === 'Add a port').go();
  assert.equal(t.state.bwFor, 'cx-us-central1');
  assert.deepEqual({ ports: t.state.bwPick.ports, mbps: t.state.bwPick.mbps }, { ports: 6, mbps: 10000 });
  // The Traffic map's region node counts the region's flows, not the connection: it does not open the flow.
  const m = vals(observe('partial', { obPanel: 'map', mapOpen: ['cloud:AWS'], mapSel: 'cloud:AWS/us-east-1' }));
  assert.ok(!m.panel.actions.some(a => a.label === 'Modify bandwidth'), m.panel.actions.map(a => a.label).join(' | '));
  // Health's queue feeds a count; it never claimed a door it does not draw.
  assert.ok(!/q\.action === 'port' && soldBw/.test(SRC), 'the dead queue route is gone');
});

test('in progress: the Capacity row, the panel and Optimize say so, and only for what was ordered', () => {
  const c = observe('mature', { bwFor: 'cx-us-east-1' });
  order(c, { ports: 5, mbps: 10000 });
  c.setState({ bwFor: null, bwStep: null });
  let v = vals(c);
  const g = v.gaugeRows.find(x => x.id === 'cx-us-east-1');
  assert.equal(g.hasPortsNote, true); assert.equal(g.portsNote, 'to 5 × 10G'); assert.equal(g.rampLine, 'NetBond · in progress');
  assert.equal(v.gaugeRows.find(x => x.id === 'cx-us-central1').hasPortsNote, false);
  assert.equal(v.gaugeRows.find(x => x.id === 'cx-us-central1').rampLine, 'NetBond');
  c.setState({ mapSel: 'cx-us-east-1', panelTab: 'overview' }); v = vals(c);
  assert.equal(v.panel.primary.label, 'In progress', 'the panel\'s primary says the change is under way');
  v.panel.primary.go();
  assert.equal(c.state.bwFor, 'cx-us-east-1');
  assert.equal(vals(c).bw.locked, true);
  // Optimize counts the connections a resize can act on: AT&T's NetBond, never an ExpressRoute port.
  const e = mkC({ view: 'mature', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'optimize' });
  const row = vals(e).optRows.find(r => r.key === 'capacity');
  assert.equal(row.head, '1 connection is bought bigger than it is used');
  assert.equal(row.figureF, '10 Gbps to spare');
  assert.equal(row.lines.length, 1); assert.match(row.lines[0], /^AWS us-east-1: 6 × 10 Gbps bought/);
  assert.equal(row.state, '');
  c.setState({ tab: 'cost', costPanel: 'optimize', mapSel: null, bwFor: null });
  const after = vals(c).optRows.find(r => r.key === 'capacity');
  assert.equal(after.state, 'In progress', 'the one connection it counts is ordered');
  // Several counted, one ordered: it says how many.
  assert.equal(BW.moveState([{ id: 'a' }, { id: 'b' }], [{ kind: 'bandwidth', est: 'x', conn: 'a', effectiveAt: AT + 1 }], 'x', AT), '1 of 2 in progress');
  assert.equal(BW.moveState([{ id: 'a' }], [{ kind: 'bandwidth', est: 'x', conn: 'a', effectiveAt: AT + 1 }], 'x', AT), 'In progress');
  assert.equal(BW.moveState([{ id: 'a' }], [], 'x', AT), '');
});

test('Cost > Optimize: Resize opens the flow in place at the size that holds the peak', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost' });
  const row = vals(c).optRows.find(r => r.key === 'capacity');
  assert.equal(row.cta, 'Resize');
  row.go();
  assert.equal(c.state.screen, 's3'); assert.equal(c.state.tab, 'cost'); assert.equal(c.state.order, null);
  assert.equal(c.state.bwFor, 'cx-us-east-1');
  assert.deepEqual({ ports: c.state.bwPick.ports, mbps: c.state.bwPick.mbps }, { ports: 2, mbps: 10000 });
  assert.equal(vals(c).bw.newLabel, '2 × 10 Gbps');
  const t = mkC({ view: 'trust', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost' });
  const tr = vals(t).optRows.find(r => r.key === 'capacity');
  assert.equal(tr.cta, 'Add a port');
  tr.go();
  assert.equal(t.state.bwFor, 'cx-us-central1'); assert.equal(t.state.bwPick.ports, 6);
});

test('the drawer never throws the pick away: dismiss keeps it, Cancel drops it', () => {
  const c = observe('partial', { mapSel: 'cx-us-east-1', panelTab: 'overview' });
  vals(c).panel.primary.go();
  let v = vals(c);
  v.bw.choices.find(ch => ch.label === '5 Gbps').go(); v = vals(c);
  assert.equal(v.bw.newLabel, '3 × 5 Gbps');
  v.bw.close(); // Escape, outside click, the Close button
  assert.equal(c.state.bwFor, null);
  vals(c).panel.primary.go(); v = vals(c);
  assert.equal(v.bw.newLabel, '3 × 5 Gbps', 'reopened on the same connection, the pick is still there');
  v.bw.cancel();
  vals(c).panel.primary.go(); v = vals(c);
  assert.equal(v.bw.changed, false, 'Cancel means cancel');
  // A pick belongs to its connection.
  c.setState({ bwPick: { id: 'cx-us-central1', ports: 1, mbps: 1000 } });
  assert.equal(vals(c).bw.changed, false);
});

test('the radios move with the arrow keys and only the chosen one is a tab stop', () => {
  const c = observe('partial', { bwFor: 'cx-us-east-1' });
  let v = vals(c);
  assert.deepEqual(v.bw.choices.filter(ch => ch.tab === 0).map(ch => ch.label), ['10 Gbps']);
  assert.ok(v.bw.choices.filter(ch => ch.tab === -1).length === v.bw.choices.length - 1);
  const key = (k) => { let prevented = false; vals(c).bw.radioKey({ key: k, preventDefault: () => { prevented = true; } }); return prevented; };
  assert.equal(key('ArrowDown'), true); v = vals(c);
  assert.equal(v.bw.newLabel, '3 × 25 Gbps');
  key('ArrowUp'); key('ArrowUp'); v = vals(c);
  assert.equal(v.bw.newLabel, '3 × 5 Gbps');
  key('Home'); assert.equal(vals(c).bw.newLabel, '3 × 50 Mbps');
  key('End'); assert.equal(vals(c).bw.newLabel, '3 × 25 Gbps');
  assert.equal(key('Tab'), false, 'Tab leaves the group');
});

test('small and empty: no connection, no flow, no NaN; an estate switch closes the flow', () => {
  for (const view of ['small', 'empty']) {
    const v = vals(observe(view, { bwFor: 'cx-us-east-1' }));
    assert.equal(v.bwOpen, false, `${view}: a connection the estate lacks never opens`);
    assert.ok(!/NaN|undefined/.test(JSON.stringify(v.gaugeRows)), view);
  }
  const c = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { id: 'cx-us-east-1', ports: 2, mbps: 10000 }, bwStep: 'review' });
  vals(c).setView({ target: { value: 'mature' } });
  assert.equal(c.state.bwFor, null); assert.equal(c.state.bwPick, null); assert.equal(c.state.bwStep, null);
  const r = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { id: 'cx-us-east-1', ports: 2, mbps: 10000 } });
  vals(r).railGroups.find(g => g.title === 'Cost').items.find(i => i.label === 'Optimize').go();
  assert.equal(r.state.tab, 'cost'); assert.equal(r.state.bwFor, null);
  for (const view of ['partial', 'mature', 'trust']) for (const g of vals(observe(view)).gaugeRows.filter(x => x.ramp === 'NetBond')) {
    for (const step of ['pick', 'confirm', 'review']) {
      const v = vals(observe(view, { bwFor: g.id, bwStep: step, bwPick: { id: g.id, ports: 1, mbps: 50 } }));
      assert.equal(v.bwOpen, true, `${view} ${g.id}`);
      assert.ok(!/NaN|undefined|Infinity/.test(JSON.stringify(v.bw)), `${view} ${g.id} ${step}`);
    }
  }
});

test('state keys live in defaults() and in the markup constructor; no list of its own', () => {
  const d = defaults();
  for (const k of ['bwFor', 'bwPick', 'bwStep']) assert.ok(k in d, `defaults() lacks ${k}`);
  assert.ok(!('bwOrders' in d), 'bandwidth orders live in the one order list');
  const ctor = HTML.slice(HTML.indexOf('constructor(p)'), HTML.indexOf('componentDidUpdate'));
  for (const k of ['bwFor: null', 'bwPick: null', 'bwStep: null']) assert.ok(ctor.includes(k), `the constructor lacks ${k}`);
  assert.ok(!ctor.includes('bwOrders'));
  assert.ok(!DEMO_KEYS.includes('naas.bw'), 'nothing of its own to save; orders are placed this session');
});

// The block an <sc-if value="{{ key }}"> opens, through its matching close.
const gate = (html, key) => {
  const i = html.indexOf(`<sc-if value="{{ ${key} }}"`);
  if (i < 0) return '';
  const re = /<sc-if\b|<\/sc-if>/g; re.lastIndex = i;
  let depth = 0, m;
  while ((m = re.exec(html))) { depth += m[0] === '</sc-if>' ? -1 : 1; if (!depth) return html.slice(i, re.lastIndex); }
  return '';
};

test('the markup: a modal drawer that closes on Escape and outside click, focus inside, radios that rove', () => {
  const drawer = gate(HTML, 'bwOpen');
  assert.ok(drawer, 'the drawer is not in the markup');
  assert.equal(HTML.split('<sc-if value="{{ bwOpen }}"').length, 2, 'one drawer');
  assert.match(drawer, /<aside role="dialog" aria-modal="true" aria-label="Modify bandwidth"[^>]*tabindex="-1"/);
  assert.match(drawer, /<div data-bw-scrim="1"[^>]*onClick="\{\{ bw\.close \}\}"/, 'a click outside closes it');
  assert.match(drawer, /role="radiogroup"[^>]*onKeyDown="\{\{ bw\.radioKey \}\}"/);
  assert.match(drawer, /role="radio"[^>]*tabindex="\{\{ ch\.tab \}\}"/);
  for (const b of ['{{ bw.approver }}', '{{ bw.setApprover }}', '{{ bw.submit }}', '{{ bw.back }}', '{{ bw.applyAnyway }}', '{{ bw.confirmLine }}', '{{ bw.review }}', '{{ bw.priceLine }}', '{{ bw.orderLine }}', '{{ bw.viewOrders }}']) assert.ok(drawer.includes(b), `${b} is not bound`);
  assert.ok(!/disabled(=""|\s|>)/.test(drawer), 'every disabled is bound');
  assert.ok(!/<svg/.test(drawer));
  for (const bad of [/<svg[^>]*>(?:(?!<\/svg>)[\s\S])*<sc-for/, /<table[^>]*>(?:(?!<\/table>)[\s\S])*<sc-for/, /<select[^>]*>(?:(?!<\/select>)[\s\S])*<sc-for/]) assert.ok(!bad.test(drawer));
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(drawer), 'theme tokens only');
  assert.ok(!/—/.test(drawer));
  // The component: Escape closes this drawer first, an outside click closes it, focus moves in and back.
  const comp = HTML.slice(HTML.indexOf('class Component extends DCLogic'));
  assert.match(comp, /if \(e\.key === 'Escape' && this\.state\.bwFor\)/);
  assert.match(comp, /data-bw-scrim/);
  assert.match(comp, /\[aria-label="Modify bandwidth"\]/);
  assert.match(comp, /this\._bwReturn/);
  // Observe > Capacity: one button per row again, opening the panel.
  const conn = gate(HTML, 'obPanelConn');
  const row = conn.slice(conn.indexOf('<sc-for list="{{ gaugeRows }}"'), conn.indexOf('</sc-for>', conn.indexOf('{{ g.stateWord }}')));
  assert.equal((row.match(/<button\b/g) || []).length, 1, 'one button per Capacity row');
  assert.match(row, /<button onClick="\{\{ g\.click \}\}"/);
  assert.ok(row.includes('{{ g.portsNote }}'));
  assert.ok(!/cap-wide|class="cap-/.test(HTML), 'the per-figure grid is gone with its container query');
});
