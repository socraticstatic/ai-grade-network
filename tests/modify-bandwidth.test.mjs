import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import * as OD from '../naas-observe-dash.js';
import * as BW from '../naas-bandwidth.js';
import { vals, defaults, init, DEMO_KEYS } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Modify bandwidth (Micah, 2026-09-30: "option to resize bandwidth like the
// netbond advanced flow"). The flow is transcribed from NetBond Advanced,
// ~/Developer/att-netbond-sdci/src/components/connection/modals/ModifyBandwidthModal.tsx
// and the choices it reads, src/data/providerBandwidth.ts: current bandwidth,
// the provider's choices, the price change (Current monthly, New monthly,
// Difference), when it takes effect, Apply change. It opens in place on every
// connection where AT&T sells the bandwidth (NetBond), from Observe > Capacity,
// the connection panel, the Traffic map's connection detail and Cost >
// Optimize's Resize, and Apply records an order in progress.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const ESTATES = ['partial', 'mature', 'trust', 'small', 'empty'];
const cap = (view) => { const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv); return OD.capacity(X.connections(est, ob), '30d'); };
const growingEast = () => cap('partial').find(r => r.id === 'cx-us-east-1');
const observe = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn', ...patch });
const where = (st) => JSON.stringify([st.screen, st.tab, st.obPage, st.obPanel, st.costPanel]);
const AT = Date.parse('2026-09-29T12:00:00Z'); // the harness's pinned clock, a Tuesday

test('the choices are NetBond Advanced\'s, cloud by cloud, in its words', () => {
  const labels = (cloud) => BW.tiersFor(cloud).map(t => t.label);
  assert.deepEqual(labels('AWS'), ['50 Mbps', '100 Mbps', '200 Mbps', '300 Mbps', '400 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps', '25 Gbps']);
  assert.deepEqual(labels('Azure'), ['50 Mbps', '100 Mbps', '200 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps']);
  assert.deepEqual(labels('GCP'), ['50 Mbps', '100 Mbps', '200 Mbps', '300 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps', '20 Gbps', '50 Gbps']);
  assert.deepEqual(labels('Oracle'), ['1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps']);
  assert.deepEqual(labels('CoreWeave'), ['100 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps']);
  assert.equal(BW.tiersFor('AWS')[0].mbps, 50);
  assert.equal(BW.burstNoteFor('AWS'), 'Traffic exceeding provisioned rate is dropped (traffic policing).');
  assert.equal(BW.burstNoteFor('Azure'), 'Can burst up to 2x provisioned bandwidth using redundancy link. Not for sustained use.');
  assert.equal(BW.burstNoteFor('GCP'), 'Capacity is approximate. Attachments may exceed provisioned bandwidth. Rate limiting on your router recommended.');
  assert.equal(BW.burstNoteFor('Oracle'), 'Fixed provisioned bandwidth. Can be modified after creation.');
  assert.equal(BW.AWS_HOSTED_NOTE, 'AWS hosted connections require provisioning new connections at the new speed. Existing connections will be replaced.');
  // The module says where it was transcribed from.
  const src = readFileSync(new URL('../naas-bandwidth.js', import.meta.url), 'utf8');
  assert.ok(src.includes('att-netbond-sdci/src/components/connection/modals/ModifyBandwidthModal.tsx'));
  assert.ok(src.includes('att-netbond-sdci/src/data/providerBandwidth.ts'));
});

test('AT&T sells the bandwidth on NetBond only, never on a direct connect or Equinix port', () => {
  for (const ramp of ['NetBond']) assert.equal(BW.sells({ ramp }), true, ramp);
  for (const ramp of ['DX', 'ER', 'Interconnect', 'EQX']) assert.equal(BW.sells({ ramp }), false, ramp);
  assert.equal(BW.sells(null), false);
});

test('the price is the catalog\'s NetBond rate read per Mbps, marked modelled', () => {
  const nb = D.CATALOG.find(p => p.id === 'netbond');
  assert.equal(BW.RATE.price, nb.price);
  assert.equal(BW.RATE.upToMbps, 10000, 'the catalog says Up to 10 Gbps');
  assert.equal(BW.RATE.perMbps, nb.price / 10000);
  assert.equal(BW.RATE.modelled, true);
  assert.match(BW.MODELLED_TITLE, /^NetBond for Cloud at \$1,800 a month for up to 10 Gbps, read per Mbps\. A list price applied to a size, not a quote\.$/);
});

test('Growing us-east-1: now 3 × 10 Gbps, its peak and 6-month average from the capacity function', () => {
  const cp = growingEast(), p = BW.plan(cp);
  assert.equal(p.where, 'AWS us-east-1');
  assert.equal(p.now.label, '3 × 10 Gbps');
  assert.equal(p.now.capF, '30 Gbps');
  assert.equal(p.peakF, `${cp.peakG} Gbps`);
  assert.equal(p.avgPct, cp.avg6mPct);
  assert.equal(p.avgF, `${+(cp.capG * cp.avg6mPct / 100).toFixed(1)} Gbps`);
  assert.equal(p.now.monthly, 30000 * BW.RATE.perMbps);
  assert.equal(p.now.monthlyF, '$5,400');
  assert.equal(p.changed, false);
  assert.equal(p.choices.length, 11);
  const now = p.choices.filter(ch => ch.now);
  assert.equal(now.length, 1); assert.equal(now[0].label, '10 Gbps'); assert.equal(now[0].on, true);
  assert.equal(p.hostedNote, BW.AWS_HOSTED_NOTE, 'an AWS hosted connection is replaced at the new speed');
  assert.equal(BW.plan(cap('mature').find(r => r.id === 'cx-us-central1')).hostedNote, '', 'the hosted note is AWS\'s alone');
});

test('picking a size moves the headroom and the price, and says when it drops traffic', () => {
  const cp = growingEast();
  // Optimize's Resize: one port fewer holds the peak at the capacity function's resizePct.
  const two = BW.plan(cp, { ports: 2, mbps: 10000 });
  assert.equal(two.changed, true);
  assert.equal(two.pick.label, '2 × 10 Gbps');
  assert.equal(two.pick.capF, '20 Gbps');
  assert.equal(Math.round(two.pick.peakPct), cp.resizePct);
  assert.equal(two.pick.headroomF, `${+(20 - cp.peakG).toFixed(1)} Gbps`);
  assert.equal(two.pick.state, 'ok');
  assert.equal(two.pick.fitWord, 'Holds the peak');
  assert.equal(two.pick.monthlyF, '$3,600');
  assert.equal(two.diff, -1800);
  assert.equal(two.diffF, '-$1,800/mo');
  // Every row of the ladder is priced and sized at the ports chosen; none is today's at two ports.
  assert.equal(two.choices.filter(ch => ch.now).length, 0);
  for (const ch of two.choices) {
    assert.equal(ch.monthly, 2 * ch.mbps * BW.RATE.perMbps, ch.label);
    assert.equal(ch.headroomMbps, 2 * ch.mbps - Math.round(cp.peakG * 1000), ch.label);
  }
  // 3 × 5 Gbps holds the peak above 80%: at risk.
  const five = BW.plan(cp, { ports: 3, mbps: 5000 });
  assert.equal(five.pick.capF, '15 Gbps');
  assert.equal(five.pick.state, 'risk');
  assert.equal(five.pick.fitWord, 'Over 80% at peak');
  assert.equal(five.diffF, '-$2,700/mo');
  // 3 × 1 Gbps is under the peak: AWS polices the excess, so it is dropped.
  const one = BW.plan(cp, { ports: 3, mbps: 1000 });
  assert.equal(one.pick.state, 'down');
  assert.equal(one.pick.fitWord, 'Short of the peak');
  assert.ok(one.pick.headroomMbps < 0);
  assert.match(one.pick.headroomF, /^-\d/);
  // One more port adds the catalog price; the stepper never goes under one port.
  assert.equal(BW.plan(cp, { ports: 4, mbps: 10000 }).diffF, '+$1,800/mo');
  assert.equal(BW.plan(cp, { ports: 0, mbps: 10000 }).ports, 3, 'no pick of ports keeps today\'s');
  assert.equal(BW.plan(cp, { ports: -2, mbps: 10000 }).ports, 1);
  assert.equal(BW.plan(cp, { ports: 99, mbps: 10000 }).ports, BW.portsRange(3).max);
});

test('the order records the change in progress, for one estate, and when it lands', () => {
  const cp = growingEast();
  const o = BW.orderOf(cp, { ports: 2, mbps: 10000 }, AT, 'partial');
  assert.equal(o.id, 'cx-us-east-1');
  assert.equal(o.est, 'partial');
  assert.equal(o.where, 'AWS us-east-1');
  assert.equal(o.from, '3 × 10 Gbps');
  assert.equal(o.to, '2 × 10 Gbps');
  assert.equal(o.state, 'progress');
  assert.equal(o.stateWord, 'In progress');
  assert.equal(o.at, AT);
  assert.equal(o.diff, -1800);
  assert.equal(o.days, 1);
  assert.equal(o.effectiveF, 'Wed, Sep 30', 'one business day after a Tuesday');
  // Ordered on a Friday, it lands on Monday.
  assert.equal(BW.orderOf(cp, { ports: 2, mbps: 10000 }, Date.parse('2026-10-02T15:00:00Z'), 'partial').effectiveF, 'Mon, Oct 5');
  assert.equal(BW.inFlight([o], 'partial', 'cx-us-east-1'), o);
  assert.equal(BW.inFlight([o], 'mature', 'cx-us-east-1'), null, 'an order belongs to its estate');
});

test('every connection AT&T sells bandwidth on offers Modify bandwidth on Observe > Capacity; the rest do not', () => {
  let offered = 0;
  for (const view of ESTATES) {
    const v = vals(observe(view));
    for (const g of v.gaugeRows) {
      const sold = g.ramp === 'NetBond';
      assert.equal(g.sold, sold, `${view} ${g.label}`);
      assert.equal(g.bwLabel, sold ? 'Modify bandwidth' : '', `${view} ${g.label}`);
      assert.equal(g.hasBw, sold, `${view} ${g.label}`);
      if (sold) offered++;
    }
  }
  assert.equal(offered, 5, 'Growing 1, Established 2, Bank scale 2');
});

test('Modify bandwidth opens in place from a Capacity row, the connection panel and the Traffic map', () => {
  // Capacity row.
  let c = observe('partial');
  const before = where(c.state);
  vals(c).gaugeRows.find(g => g.id === 'cx-us-east-1').bwGo();
  assert.equal(c.state.bwFor, 'cx-us-east-1');
  assert.equal(where(c.state), before, 'nothing leaves the page');
  let v = vals(c);
  assert.equal(v.bwOpen, true);
  assert.equal(v.bw.title, 'AWS us-east-1');
  assert.equal(v.bw.sub, 'NetBond · 3 × 10 Gbps bought');
  assert.equal(v.bw.nowLabel, '3 × 10 Gbps');
  assert.equal(v.bw.nowF, '30 Gbps');
  // The connection panel.
  c = observe('mature', { mapSel: 'cx-us-central1', panelTab: 'actions' });
  v = vals(c);
  const act = v.panel.actions.find(a => a.label === 'Modify bandwidth');
  assert.ok(act, v.panel.actions.map(a => a.label).join(' | '));
  assert.equal(v.panel.primary.label, 'Modify bandwidth');
  act.go();
  assert.equal(c.state.bwFor, 'cx-us-central1');
  assert.equal(c.state.screen, 's3'); assert.equal(c.state.tab, 'observe');
  v = vals(c);
  v.panel.primary.go();
  assert.equal(c.state.bwFor, 'cx-us-central1', 'the panel\'s primary opens the same flow');
  // A direct connect's panel does not offer it.
  v = vals(observe('mature', { mapSel: 'cx-us-west-2', panelTab: 'actions' }));
  assert.ok(!v.panel.actions.some(a => a.label === 'Modify bandwidth'));
  // A saturating NetBond connection's Add a port is the same flow, one port up.
  c = observe('trust', { mapSel: 'cx-us-central1', panelTab: 'actions' });
  vals(c).panel.actions.find(a => a.label === 'Add a port').go();
  assert.equal(c.state.bwFor, 'cx-us-central1');
  assert.deepEqual(c.state.bwPick, { ports: 6, mbps: 10000 });
  assert.equal(c.state.screen, 's3', 'Add a port on NetBond stays on the page');
  // The Traffic map's connection detail.
  c = observe('partial', { obPanel: 'map', mapOpen: ['cloud:AWS'], mapSel: 'cloud:AWS/us-east-1' });
  v = vals(c);
  const mapAct = v.panel.actions.find(a => a.label === 'Modify bandwidth');
  assert.ok(mapAct, v.panel.actions.map(a => a.label).join(' | '));
  mapAct.go();
  assert.equal(c.state.bwFor, 'cx-us-east-1');
  assert.equal(c.state.obPanel, 'map');
  // An unattached region on the map has no bandwidth to modify.
  v = vals(observe('partial', { obPanel: 'map', mapOpen: ['cloud:AWS'], mapSel: 'cloud:AWS/us-west-2' }));
  assert.ok(!v.panel.actions.some(a => a.label === 'Modify bandwidth'));
});

test('Cost > Optimize: Resize opens Modify bandwidth at the size that holds the peak, never a review page', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost' });
  const row = vals(c).optRows.find(r => r.key === 'capacity');
  assert.equal(row.cta, 'Resize');
  row.go();
  assert.equal(c.state.screen, 's3', 'Resize no longer lands on Review');
  assert.equal(c.state.tab, 'cost');
  assert.equal(c.state.order, null, 'no order is staged for a review page');
  assert.equal(c.state.bwFor, 'cx-us-east-1');
  assert.deepEqual(c.state.bwPick, { ports: 2, mbps: 10000 });
  const v = vals(c);
  assert.equal(v.bwOpen, true);
  assert.equal(v.bw.changed, true);
  assert.equal(v.bw.newLabel, '2 × 10 Gbps');
  // Bank scale has nothing oversized; its move adds a port to the NetBond connection near full, in the same flow.
  const t = mkC({ view: 'trust', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost' });
  const tr = vals(t).optRows.find(r => r.key === 'capacity');
  assert.equal(tr.cta, 'Add a port');
  tr.go();
  assert.equal(t.state.screen, 's3');
  assert.equal(t.state.bwFor, 'cx-us-central1');
  assert.deepEqual(t.state.bwPick, { ports: 6, mbps: 10000 });
  // The old route is gone from the source.
  const src = readFileSync(new URL('../naas-app.js', import.meta.url), 'utf8');
  assert.ok(!/title: `Resize \$\{where\}`/.test(src), 'the Resize review order is retired');
});

test('the drawer follows NetBond Advanced: current, new, the price change, when, and Apply change', () => {
  const c = observe('partial', { bwFor: 'cx-us-east-1' });
  let v = vals(c);
  const bw = v.bw;
  assert.equal(bw.kicker, 'Modify bandwidth');
  assert.equal(bw.currentLabel, 'Current bandwidth');
  assert.equal(bw.newHead, 'New bandwidth');
  assert.equal(bw.burstNote, BW.burstNoteFor('AWS'));
  assert.equal(bw.hasHostedNote, true);
  assert.equal(bw.applyLabel, 'Apply change');
  assert.equal(bw.applyOff, true, 'nothing to apply until a size changes');
  assert.equal(bw.hasPreview, false, 'no price change shown until a size changes');
  assert.equal(bw.cancelLabel, 'Cancel');
  assert.deepEqual(bw.stats.map(x => x.l), ['Peak', '6-month average', 'Headroom']);
  assert.equal(bw.choices.length, 11);
  assert.equal(bw.ports, 3);
  assert.equal(bw.lessOff, false);
  // Each choice says what it does to headroom and the price, and which is current.
  const ten = bw.choices.find(ch => ch.label === '10 Gbps');
  assert.equal(ten.isNow, true); assert.equal(ten.on, true);
  assert.equal(ten.capF, '30 Gbps'); assert.equal(ten.headroomF, '17.7 Gbps'); assert.equal(ten.monthlyF, '$5,400');
  assert.equal(ten.ink, 'var(--success)');
  const small = bw.choices.find(ch => ch.label === '1 Gbps');
  assert.equal(small.ink, 'var(--error)'); assert.equal(small.fitWord, 'Short of the peak');
  assert.ok(small.barOp < 1, 'a size short of the peak draws a quieter bar'); assert.equal(ten.barOp, 1);
  for (const ch of bw.choices) { assert.match(ch.peakX, /^\d+(\.\d+)?%$/); assert.ok(parseFloat(ch.peakX) <= 100, ch.label); }
  // Pick one port fewer with the stepper.
  bw.portsLess();
  v = vals(c);
  assert.deepEqual(c.state.bwPick, { ports: 2, mbps: 10000 });
  assert.equal(v.bw.applyOff, false);
  assert.equal(v.bw.hasPreview, true);
  assert.deepEqual(v.bw.money.map(m => m.l), ['Current monthly', 'New monthly', 'Difference']);
  assert.deepEqual(v.bw.money.map(m => m.v), ['$5,400/mo', '$3,600/mo', '-$1,800/mo']);
  assert.equal(v.bw.money[2].ink, 'var(--success)', 'a saving reads in the success ink, as NetBond Advanced colours it');
  assert.equal(v.bw.hasModelled, true);
  assert.equal(v.bw.modelledTitle, BW.MODELLED_TITLE);
  assert.equal(v.bw.whenLine, 'Takes effect in 1 business day, Wed, Sep 30.');
  assert.equal(v.bw.hasFit, false, 'a size that holds the peak needs no word');
  // A size short of the peak, or over 80% at it, says so beside Apply change.
  v.bw.choices.find(ch => ch.label === '1 Gbps').go(); v = vals(c);
  assert.equal(v.bw.hasFit, true); assert.equal(v.bw.fitLine, 'Short of the peak at 12.3 Gbps.'); assert.equal(v.bw.fitInk, 'var(--error)');
  v.bw.choices.find(ch => ch.label === '10 Gbps').go(); v = vals(c);
  // Pick 5 Gbps a port from the ladder.
  v.bw.choices.find(ch => ch.label === '5 Gbps').go();
  v = vals(c);
  assert.deepEqual(c.state.bwPick, { ports: 2, mbps: 5000 });
  assert.equal(v.bw.newLabel, '2 × 5 Gbps');
  assert.equal(v.bw.choices.find(ch => ch.on).label, '5 Gbps');
  // Back to today's size: nothing to apply again.
  v.bw.portsMore(); v = vals(c); v.bw.choices.find(ch => ch.label === '10 Gbps').go(); v = vals(c);
  assert.equal(v.bw.changed, false); assert.equal(v.bw.applyOff, true);
  // Cancel closes it and keeps nothing.
  v.bw.cancel();
  assert.equal(c.state.bwFor, null);
  assert.equal(c.state.bwPick, null);
  assert.deepEqual(c.state.bwOrders || [], []);
});

test('Apply change records the order in progress, it survives a reload, and every surface says so', () => {
  delete store['naas.bw'];
  const c = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { ports: 2, mbps: 10000 } });
  const before = where(c.state);
  vals(c).bw.apply();
  assert.equal(where(c.state), before, 'nothing leaves the page');
  assert.equal((c.state.bwOrders || []).length, 1);
  const o = c.state.bwOrders[0];
  assert.equal(o.est, 'partial'); assert.equal(o.id, 'cx-us-east-1'); assert.equal(o.from, '3 × 10 Gbps'); assert.equal(o.to, '2 × 10 Gbps'); assert.equal(o.state, 'progress');
  assert.deepEqual(JSON.parse(store['naas.bw']), c.state.bwOrders, 'saved for the next load');
  // A cold load reads it back.
  window.addEventListener = window.addEventListener || (() => {});
  globalThis.location = { search: '?view=partial', hash: '', pathname: '/' };
  const fresh = mkC({ view: 'partial', screen: 's0' });
  assert.deepEqual(fresh.state.bwOrders, []);
  init(fresh);
  assert.deepEqual(fresh.state.bwOrders, c.state.bwOrders, 'the order survives a reload');
  assert.ok(DEMO_KEYS.includes('naas.bw'), 'Reset demo clears it');
  let v = vals(c);
  // The drawer shows the order, and a second change waits for it.
  assert.equal(v.bw.inProgress, true);
  assert.equal(v.bw.applyOff, true);
  assert.equal(v.bw.locked, true);
  assert.equal(v.bw.applyLabel, 'Done');
  assert.equal(v.bw.cancelLabel, 'Close');
  assert.equal(v.bw.orderLine, 'Ordered 3 × 10 Gbps to 2 × 10 Gbps. In progress, takes effect Wed, Sep 30.');
  // A second click changes nothing while it is in flight.
  v.bw.portsLess(); v.bw.apply();
  assert.equal(c.state.bwOrders.length, 1);
  // The Capacity row says the change is in flight; it still opens the flow.
  const g = v.gaugeRows.find(x => x.id === 'cx-us-east-1');
  assert.equal(g.bwLabel, 'In progress');
  assert.equal(g.bwNote, 'to 2 × 10G');
  // Reopened later, from Capacity or from Optimize's Resize, the drawer shows the order, locked, in its own word.
  v.bw.close();
  vals(c).gaugeRows.find(x => x.id === 'cx-us-east-1').bwGo();
  v = vals(c);
  assert.equal(v.bw.inProgress, true); assert.equal(v.bw.applyLabel, 'In progress'); assert.equal(v.bw.locked, true);
  v.bw.close();
  c.setState({ tab: 'cost' });
  const cap = vals(c).optRows.find(r => r.key === 'capacity');
  assert.equal(cap.state, 'In progress', 'Optimize says the move is under way');
  assert.equal(cap.hasState, true);
  cap.go();
  v = vals(c);
  assert.equal(v.bw.applyLabel, 'In progress');
  v.bw.close();
  c.setState({ tab: 'observe' });
  // Another estate's us-east-1 has no order.
  const m = observe('mature', { bwOrders: c.state.bwOrders });
  assert.equal(vals(m).gaugeRows.find(x => x.id === 'cx-us-east-1').bwLabel, 'Modify bandwidth');
  // Changes and User activity carry the order.
  c.setState({ obPanel: 'changes' });
  v = vals(c);
  assert.ok(v.changeAll.some(r => /^Ordered a bandwidth change: AWS us-east-1$/.test(r.text)), v.changeAll.map(r => r.text).join(' | '));
  // The day it lands is on the list ahead, as AT&T's planned maintenance is.
  const on = v.changeAll.find(r => r.text === 'Bandwidth change takes effect: AWS us-east-1, 3 × 10 Gbps to 2 × 10 Gbps');
  assert.ok(on, v.changeAll.map(r => r.text).join(' | '));
  assert.equal(on.upcoming, true); assert.equal(on.at, o.effectiveAt);
  c.setState({ obPage: 'logs', logTab: 'user' });
  v = vals(c);
  assert.ok(v.actRows.some(r => r.verb === 'Ordered a bandwidth change' && r.target === 'AWS us-east-1' && r.detail === '3 × 10 Gbps to 2 × 10 Gbps · in progress, takes effect Wed, Sep 30'), JSON.stringify(v.actRows.slice(0, 3)));
  // Reset demo forgets it.
  vals(c).resetDemo();
  assert.deepEqual(c.state.bwOrders, []);
  assert.equal(store['naas.bw'], undefined);
});

test('the traffic figures open Logs on the connection; the size figures open the flow', () => {
  const c = observe('partial', { bwFor: 'cx-us-east-1' });
  const peak = vals(c).bw.stats.find(x => x.l === 'Peak');
  assert.equal(peak.isLogs, true);
  peak.go();
  assert.equal(c.state.obPage, 'logs');
  assert.equal(c.state.logQ, 'us-east-1');
  assert.equal(c.state.logPath, 'private');
  assert.equal(c.state.bwFor, null, 'the drawer closes on the way to Logs');
  assert.equal(c.state.explain.label, 'AWS us-east-1 · peak');
  assert.equal(c.state.explain.path, 'private');
  // Headroom is not traffic: it is the size, and every choice restates it.
  assert.equal(vals(observe('partial', { bwFor: 'cx-us-east-1' })).bw.stats.find(x => x.l === 'Headroom').isLogs, false);
  // Every Capacity figure is a button: traffic ones open Logs, the size ones open the flow.
  const g = vals(observe('partial')).gaugeRows.find(x => x.id === 'cx-us-east-1');
  for (const k of ['logsGo', 'bwGo', 'click', 'impactGo']) assert.equal(typeof g[k], 'function', k);
  const l = observe('partial');
  vals(l).gaugeRows.find(x => x.id === 'cx-us-east-1').logsGo();
  assert.equal(l.state.obPage, 'logs'); assert.equal(l.state.logQ, 'us-east-1');
  assert.match(l.state.explain.label, /^AWS us-east-1/);
  // The records Logs lands on all cross that connection.
  const lv = vals(l);
  assert.ok(lv.flowRecords.length > 0);
  for (const r of lv.flowRecords) { assert.equal(r.path, 'private'); assert.match(`${r.srcSub} ${r.dstSub}`, /us-east-1/); }
  // A direct connect's size opens its panel, not a flow AT&T cannot sell.
  const d = observe('partial');
  vals(d).gaugeRows.find(x => x.id === 'cx-eastus').bwGo();
  assert.equal(d.state.bwFor || null, null);
  assert.equal(d.state.mapSel, 'cx-eastus');
  // State opens the connection's impact.
  const s = observe('partial');
  vals(s).gaugeRows.find(x => x.id === 'cx-eastus').impactGo();
  assert.equal(s.state.mapSel, 'cx-eastus'); assert.equal(s.state.panelTab, 'impact');
});

test('small and empty: no connection, no flow, no NaN; an estate switch closes the flow', () => {
  for (const view of ['small', 'empty']) {
    const v = vals(observe(view, { bwFor: 'cx-us-east-1' }));
    assert.equal(v.bwOpen, false, `${view}: a connection the estate lacks never opens`);
    assert.ok(!/NaN|undefined/.test(JSON.stringify(v.gaugeRows)), view);
  }
  const c = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { ports: 2, mbps: 10000 } });
  vals(c).setView({ target: { value: 'mature' } });
  assert.equal(c.state.bwFor, null); assert.equal(c.state.bwPick, null);
  // Leaving the page by the rail closes it too, as it closes the finding drawer.
  const r = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { ports: 2, mbps: 10000 } });
  vals(r).railGroups.find(g => g.title === 'Cost').items.find(i => i.label === 'Optimize').go();
  assert.equal(r.state.tab, 'cost'); assert.equal(r.state.bwFor, null); assert.equal(r.state.bwPick, null);
  // Every sold connection on every estate draws a whole drawer.
  for (const view of ['partial', 'mature', 'trust']) for (const g of vals(observe(view)).gaugeRows.filter(x => x.sold)) {
    const v = vals(observe(view, { bwFor: g.id }));
    assert.equal(v.bwOpen, true, `${view} ${g.id}`);
    assert.ok(!/NaN|undefined|Infinity/.test(JSON.stringify(v.bw)), `${view} ${g.id}`);
  }
});

test('state keys live in defaults() and in the markup constructor', () => {
  const d = defaults();
  for (const k of ['bwFor', 'bwPick', 'bwOrders']) assert.ok(k in d, `defaults() lacks ${k}`);
  const ctor = HTML.slice(HTML.indexOf('constructor(p)'), HTML.indexOf('componentDidUpdate'));
  for (const k of ['bwFor: null', 'bwPick: null', 'bwOrders: []']) assert.ok(ctor.includes(k), `the constructor lacks ${k}`);
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

test('the markup: one drawer, bound disabled, charts from positioned spans, no sc-for in svg', () => {
  const drawer = gate(HTML, 'bwOpen');
  assert.ok(drawer, 'the drawer is not in the markup');
  assert.equal(HTML.split('<sc-if value="{{ bwOpen }}"').length, 2, 'one drawer');
  assert.match(drawer, /<aside role="dialog" aria-label="Modify bandwidth"/);
  for (const b of ['{{ bw.kicker }}', '{{ bw.title }}', '{{ bw.nowLabel }}', '{{ bw.burstNote }}', '{{ bw.hostedNote }}', '{{ bw.choices }}', '{{ bw.money }}', '{{ bw.whenLine }}', '{{ bw.orderLine }}', '{{ bw.apply }}', '{{ bw.cancel }}', '{{ bw.portsLess }}', '{{ bw.portsMore }}', '{{ bw.modelledTitle }}']) assert.ok(drawer.includes(b), `${b} is not bound`);
  assert.match(drawer, /<button[^>]*disabled="\{\{ bw\.applyOff \}\}"[^>]*>\{\{ bw\.applyLabel \}\}<\/button>/);
  assert.match(drawer, /disabled="\{\{ bw\.lessOff \}\}"/);
  assert.match(drawer, /disabled="\{\{ bw\.moreOff \}\}"/);
  assert.match(drawer, /disabled="\{\{ bw\.locked \}\}"/);
  assert.ok(!/disabled(=""|\s|>)/.test(drawer), 'every disabled is bound');
  assert.ok(!/<svg/.test(drawer), 'the drawer draws with positioned spans');
  // The Capacity rows: every figure a button, the size ones bound to the flow, and no button inside a button.
  const conn = gate(HTML, 'obPanelConn');
  for (const b of ['{{ g.bwGo }}', '{{ g.logsGo }}', '{{ g.click }}', '{{ g.impactGo }}', '{{ g.bwLabel }}', '{{ g.bwNote }}']) assert.ok(conn.includes(b), `${b} is not bound`);
  const row = conn.slice(conn.indexOf('<sc-for list="{{ gaugeRows }}"'), conn.indexOf('</sc-for>', conn.indexOf('{{ g.stateWord }}')));
  assert.ok((row.match(/<button\b/g) || []).length >= 9, 'each figure in the row is its own button');
  let depth = 0;
  for (const m of row.matchAll(/<button\b|<\/button>/g)) { depth += m[0] === '</button>' ? -1 : 1; assert.ok(depth <= 1, 'a button inside a button'); }
  for (const bad of [/<svg[^>]*>(?:(?!<\/svg>)[\s\S])*<sc-for/, /<table[^>]*>(?:(?!<\/table>)[\s\S])*<sc-for/, /<select[^>]*>(?:(?!<\/select>)[\s\S])*<sc-for/]) assert.ok(!bad.test(drawer + conn));
  // No new hex in either block: theme tokens only.
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(drawer), 'the drawer uses theme tokens only');
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(conn), 'the Capacity rows use theme tokens only');
  // No em dash in the copy.
  assert.ok(!/—/.test(drawer + conn));
});
