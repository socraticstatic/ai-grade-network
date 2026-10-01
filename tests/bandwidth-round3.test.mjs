import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import * as OD from '../naas-observe-dash.js';
import * as BW from '../naas-bandwidth.js';
import * as CF from '../naas-connect-flow.js';
import { HEALTH_INK } from '../naas-flowmap.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Modify bandwidth, round 3 (skeptic, 2026-09-30, on 331e00e): one 6-month
// average everywhere; the map's Add a port opens the drawer like the other two
// doors; one price rule past the catalog's 10 Gbps in both flows; red for a size
// that drops traffic; a landed resize never moves the traffic it carries; Reset
// demo clears bandwidth orders; GCP's confirm in GCP's words.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const observe = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn', ...patch });
const where = (st) => JSON.stringify([st.screen, st.layer, st.tab, st.obPage, st.obPanel, st.costPanel, st.cnPage]);
const LATER = '2026-10-05T15:00:00Z'; // the Monday demo
const WINDOWS = ['1h', '24h', '7d', '30d', '90d', '6m', '12m'];
const capOf = (view, win = '30d') => { const est = D.ESTATES[view], ob = A.observe(est, [], A.inventory(est)); return OD.capacity(X.connections(est, ob), win); };
function order(c, pick) {
  c.setState({ bwPick: { id: c.state.bwFor, ...pick } });
  let v = vals(c);
  v.bw.apply(); v = vals(c);
  if (v.bw.isConfirm) { v.bw.applyAnyway(); v = vals(c); }
  assert.equal(v.bw.isReview, true, 'Apply change reaches the approval step');
  v.bw.submit();
  return vals(c);
}

test('one average: the drawer, the Capacity row and Optimize read one 6-month figure, whatever the Since window', () => {
  for (const view of ['partial', 'mature']) {
    const base = capOf(view).find(r => r.id === 'cx-us-east-1');
    // The Gbps and the percent are one figure.
    assert.equal(Math.round(base.avgG / base.capG * 100), base.avg6mPct, `${view}: ${base.avgG} of ${base.capG} is ${base.avg6mPct}%`);
    for (const win of WINDOWS) {
      const cp = capOf(view, win).find(r => r.id === 'cx-us-east-1');
      assert.equal(cp.avgG, base.avgG, `${view} ${win}: the 6-month average does not move with the window`);
      const v = vals(observe(view, { obWindow: win, bwFor: 'cx-us-east-1' }));
      const avg = v.bw.stats.find(x => x.l === 'Average');
      assert.equal(avg.v, `${base.avgG} Gbps`, `${view} ${win}`);
      assert.equal(avg.sub, `${base.avg6mPct}% over 6 months`, `${view} ${win}`);
      const g = v.gaugeRows.find(x => x.id === 'cx-us-east-1');
      assert.equal(g.avgF, avg.v, `${view} ${win}: the row's Avg is the drawer's`);
      assert.match(g.title, new RegExp(`${base.avg6mPct}% on average over 6 months`));
      // The row opens the connection's panel; its average is the same figure, said as 6 months.
      const pc = observe(view, { obWindow: win, mapSel: 'cx-us-east-1', panelTab: 'overview' });
      const ov = vals(pc).panel.overview.find(o => /average/i.test(o.k));
      assert.equal(ov.k, '6-month average · in / out');
      assert.ok(ov.v.startsWith(`${base.avgG} / `), ov.v);
      // Optimize > Capacity names the same figure, and its Resize opens that drawer.
      const o = mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'optimize', obWindow: win });
      const row = vals(o).optRows.find(r => r.key === 'capacity');
      const line = row.lines.find(l => l.startsWith('AWS us-east-1'));
      assert.ok(line, row.lines.join(' | '));
      assert.ok(line.includes(`${base.avg6mPct}% on average over 6 months`), line);
      row.go();
      const d = vals(o).bw.stats.find(x => x.l === 'Average');
      assert.equal(d.sub, avg.sub, `${view} ${win}: the door opens the same figure`);
    }
  }
  // The Carrying tile is the rows' 6-month averages, and says so.
  const v = vals(observe('partial'));
  const t = v.bwTiles.find(x => x.l === 'Carrying');
  const sum = v.gaugeRows.reduce((a, g) => a + g.avgG, 0);
  assert.equal(t.v, `${sum.toFixed(1)} Gbps`);
  assert.match(t.sub, /6-month average$/);
  assert.match(HTML, />Average use, 6 months</, 'the Capacity legend says which average');
});

test('Bank scale: the Traffic map\'s Add a port opens Modify bandwidth in place at one port more, like Capacity and Optimize', () => {
  const c = observe('trust', { obPanel: 'map', mapOpen: ['cloud:GCP'], mapSel: 'cloud:GCP/us-central1' });
  const before = where(c.state);
  let v = vals(c);
  assert.equal(v.panel.primary.label, 'Add a port');
  v.panel.primary.go();
  assert.equal(where(c.state), before, 'nothing leaves the page');
  assert.equal(c.state.order == null || c.state.screen === 's3', true);
  assert.equal(c.state.bwFor, 'cx-us-central1');
  assert.deepEqual({ ports: c.state.bwPick.ports, mbps: c.state.bwPick.mbps }, { ports: 6, mbps: 10000 });
  // Its Actions tab is the same door.
  const t = observe('trust', { obPanel: 'map', mapOpen: ['cloud:GCP'], mapSel: 'cloud:GCP/us-central1', panelTab: 'actions' });
  vals(t).panel.actions.find(a => a.label === 'Add a port').go();
  assert.equal(t.state.screen, 's3'); assert.equal(t.state.bwFor, 'cx-us-central1'); assert.equal(t.state.bwPick.ports, 6);
  // The node's State is its paths'; the connection's own state and peak say why it offers Add a port,
  // in the words and figure Capacity and Health read (Saturating, 81%).
  const node = vals(observe('trust', { obPanel: 'map', mapOpen: ['cloud:GCP'], mapSel: 'cloud:GCP/us-central1' })).panel;
  const cap = vals(observe('trust')).gaugeRows.find(x => x.id === 'cx-us-central1');
  const conn = node.overview.find(o => o.k === 'Connection');
  assert.ok(conn, node.overview.map(o => o.k).join(' | '));
  assert.equal(conn.v, `NetBond · ${cap.stateWord}, ${cap.pct}% at peak`);
  assert.equal(conn.v, 'NetBond · Saturating, 81% at peak');
  const quiet = vals(observe('partial', { obPanel: 'map', mapOpen: ['cloud:AWS'], mapSel: 'cloud:AWS/us-east-1' })).panel;
  assert.equal(quiet.overview.find(o => o.k === 'Connection').v, 'NetBond · Healthy, 41% at peak');
  // The node still offers no Modify bandwidth of its own.
  assert.ok(!vals(observe('trust', { obPanel: 'map', mapOpen: ['cloud:GCP'], mapSel: 'cloud:GCP/us-central1' })).panel.actions.some(a => a.label === 'Modify bandwidth'));
});

test('one price rule past the catalog\'s Up to 10 Gbps: the connect flow prices it after review, as the drawer does', () => {
  const nb = D.CATALOG.find(p => p.id === 'netbond');
  assert.equal(CF.ceilMbpsOf(nb), 10000, 'NetBond for Cloud: Up to 10 Gbps');
  assert.equal(BW.PORT_CEIL_MBPS, CF.ceilMbpsOf(nb), 'the drawer reads the same line');
  const est = D.ESTATES.trust;
  const at = (bw) => CF.flowOf({ ctype: 'DataCenter / CoLocation to Cloud', regions: ['GCP us-central1'], bandwidth: bw }, est);
  // Inside the line, the catalog price, as Cost bills it.
  assert.equal(CF.wipPrice(at('10 Gbps'), est).big, '$1,800');
  // Past it, AT&T prices it after review, in both flows.
  const big = CF.flowOrder(at('100 Gbps'), est);
  assert.equal(big.lines[0].unpriced, true, JSON.stringify(big.lines[0]));
  assert.equal(big.priced, false);
  const wip = CF.wipPrice(at('100 Gbps'), est);
  assert.equal(wip.has, false); assert.equal(wip.line, CF.PRICE_NOTE);
  // The resiliency tiers say the same, never "once the type and region are chosen" when they are.
  for (const tier of CF.TIERS) {
    assert.equal(CF.tierGets(at('100 Gbps'), est, tier).cost, CF.PRICE_NOTE, tier);
    assert.equal(CF.tierGets(at('10 Gbps'), est, tier).cost, `$${(1800 * CF.TIER_MULT[tier]).toLocaleString('en-US')}/mo`, tier);
  }
  assert.equal(CF.tierGets(CF.flowOf({}, est), est, 'Standard').cost, 'Priced once the type and region are chosen');
  // An order with a priced extra still is not priced by that extra alone.
  const ngfw = CF.flowOrder(CF.flowOf({ ctype: 'DataCenter / CoLocation to Cloud', regions: ['GCP us-central1'], bandwidth: '100 Gbps', policy: ['Inline inspection'] }, est), est);
  assert.equal(ngfw.priced, false, 'the connection itself is after review');
  // The drawer: past the line After review, inside it Cost's price; no "whatever the size".
  const c = observe('trust', { bwFor: 'cx-us-central1', bwPick: { id: 'cx-us-central1', ports: 5, mbps: 20000 } });
  assert.deepEqual(vals(c).bw.money.map(m => m.v), ['$1,800/mo', 'After review', 'After review']);
  c.setState({ bwPick: { id: 'cx-us-central1', ports: 6, mbps: 10000 } });
  const line = vals(c).bw.priceLine;
  assert.equal(line, '1 region × $1,800 for ports up to 10 Gbps, as Cost bills NetBond.');
  assert.ok(!/whatever the size/.test(line));
});

test('red means drops traffic, amber only over 80%: the drawer keeps the error ink for a short size', () => {
  assert.equal(BW.FIT_INK.down, HEALTH_INK.down);
  assert.equal(BW.FIT_INK.down, 'var(--error)');
  assert.equal(BW.FIT_INK.risk, 'var(--warning)');
  const c = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { id: 'cx-us-east-1', ports: 3, mbps: 50 } });
  let v = vals(c);
  assert.equal(v.bw.choices.find(ch => ch.label === '50 Mbps').ink, 'var(--error)');
  assert.equal(v.bw.choices.find(ch => ch.label === '5 Gbps').ink, 'var(--warning)');
  assert.equal(v.bw.fitInk, 'var(--error)');
  assert.equal(v.bw.downInk, 'var(--error)');
  v.bw.apply(); v = vals(c);
  assert.equal(v.bw.confirmInk, 'var(--error)');
  // The markup: the legend's short swatch and the confirm read the bound ink, the Apply anyway ring is red.
  const i = HTML.indexOf('<sc-if value="{{ bwOpen }}"'), drawer = HTML.slice(i, HTML.indexOf('</aside>', i));
  assert.match(drawer, /<i style="background:\{\{ bw\.downInk \}\};border-radius:2px"><\/i>\{\{ bw\.downWord \}\}/);
  assert.match(drawer, /role="alert" style="[^"]*border:1px solid \{\{ bw\.confirmInk \}\}/);
  assert.match(drawer, /role="note" style="border-left:3px solid \{\{ bw\.confirmInk \}\}[^"]*">\{\{ bw\.reviewWarn \}\}/);
  assert.match(HTML, /\.bw-warn\{[^}]*border:1\.5px solid var\(--error\)/);
  // Amber in the drawer is the 80% line, the over-80% swatch and the AWS hosted caution, nothing else.
  assert.equal((drawer.match(/var\(--warning\)/g) || []).length, 3, drawer.match(/.{60}var\(--warning\).{20}/g).join('\n'));
});

test('a landed resize keeps the traffic: peak and average stay, whatever the new size', () => {
  const before = vals(observe('partial'));
  const g0 = before.gaugeRows.find(x => x.id === 'cx-us-east-1');
  const tile = (v, l) => v.bwTiles.find(t => t.l === l).v;
  for (const [pick, cap] of [[{ ports: 2, mbps: 10000 }, 20], [{ ports: 3, mbps: 1000 }, 3], [{ ports: 1, mbps: 50 }, 0.05]]) {
    const c = observe('partial', { bwFor: 'cx-us-east-1' });
    order(c, pick);
    c.setState({ nowIso: LATER, bwFor: null, bwStep: null, bwPick: null });
    const v = vals(c);
    const g = v.gaugeRows.find(x => x.id === 'cx-us-east-1');
    assert.equal(g.capG, cap, JSON.stringify(pick));
    assert.equal(g.peakF, g0.peakF, `${JSON.stringify(pick)}: the peak is the traffic, not the port`);
    assert.equal(g.avgF, g0.avgF, `${JSON.stringify(pick)}: so is the average`);
    assert.equal(tile(v, 'Peak'), tile(before, 'Peak'));
    assert.equal(tile(v, 'Carrying'), tile(before, 'Carrying'));
    assert.equal(g.headF, `${+(cap - 12.3).toFixed(1)} Gbps`, 'headroom is the new size less the same peak');
    if (cap < 12.3) {
      assert.equal(g.fullIn, 'Now');
      // Optimize says the same peak over the new size, in a sentence.
      c.setState({ tab: 'cost', costPanel: 'optimize' });
      const line = vals(c).optRows.find(r => r.key === 'capacity').lines[0];
      assert.equal(line, `AWS us-east-1: ${Math.round(12.3 / cap * 100)}% of ${cap} Gbps at peak, full now.`);
      c.setState({ tab: 'observe', costPanel: null });
    }
    // The drawer reads the same peak, and Optimize the same 6-month average.
    c.setState({ bwFor: 'cx-us-east-1' });
    const d = vals(c).bw;
    assert.equal(d.stats[0].v, g0.peakF); assert.equal(d.stats[1].v, g0.avgF);
  }
  // Bank scale us-east-1, 21 to 20 ports.
  const t0 = vals(observe('trust')).gaugeRows.find(x => x.id === 'cx-us-east-1');
  const t = observe('trust', { bwFor: 'cx-us-east-1' });
  order(t, { ports: 20, mbps: 10000 });
  t.setState({ nowIso: LATER, bwFor: null, bwStep: null, bwPick: null });
  const tg = vals(t).gaugeRows.find(x => x.id === 'cx-us-east-1');
  assert.equal(tg.capG, 200); assert.equal(tg.peakF, t0.peakF); assert.equal(t0.peakF, '113.4 Gbps');
});

test('Reset demo clears what rehearsal ordered: no bandwidth change is left in progress', () => {
  const c = observe('partial', { bwFor: 'cx-us-east-1' });
  order(c, { ports: 2, mbps: 10000 });
  const placed = { id: 'o9', title: 'Rehearsed connection', type: 'NetBond for Cloud', what: '', monthly: '', term: '', policy: '', at: '07:00', stage: 'Submitted for approval' };
  c.setState({ bwFor: null, bwStep: null, orders: [...c.state.orders, placed] });
  assert.equal(vals(c).gaugeRows.find(x => x.id === 'cx-us-east-1').hasPortsNote, true);
  vals(c).resetDemo();
  assert.ok(!(c.state.orders || []).some(o => o.kind === 'bandwidth'), JSON.stringify(c.state.orders));
  let v = vals(c);
  const g = v.gaugeRows.find(x => x.id === 'cx-us-east-1');
  assert.equal(g.hasPortsNote, false); assert.equal(g.rampLine, 'NetBond');
  c.setState({ mapSel: 'cx-us-east-1', panelTab: 'overview' }); v = vals(c);
  assert.equal(v.panel.primary.label, 'Modify bandwidth');
  v.panel.primary.go();
  assert.equal(vals(c).bw.locked, false);
  c.setState({ bwFor: null, mapSel: null, tab: 'cost', costPanel: 'optimize' });
  assert.equal(vals(c).optRows.find(r => r.key === 'capacity').state, '');
  c.setState({ tab: 'connect', cnPage: 'orders' });
  assert.ok(!vals(c).ordRows.some(r => r.kind === 'bandwidth'));
  assert.match(HTML, /title="Clear what rehearsal saved: [^"]*bandwidth changes[^"]*"[^>]*>Reset demo</);
});

test('GCP\'s confirm says what GCP says; review names the day and the approver once', () => {
  // Established GCP us-central1: 2 × 10 Gbps, peak 15.4 Gbps. One port is short of it.
  const c = observe('mature', { bwFor: 'cx-us-central1', bwPick: { id: 'cx-us-central1', ports: 1, mbps: 10000 } });
  let v = vals(c);
  assert.equal(v.bw.downWord, 'Short of the peak', 'GCP may exceed its provisioned bandwidth: no "drops traffic"');
  v.bw.apply(); v = vals(c);
  assert.equal(v.bw.isConfirm, true);
  assert.equal(v.bw.confirmHead, 'This size is short of the peak');
  assert.ok(!/drops traffic/.test(v.bw.confirmHead + v.bw.downWord));
  assert.match(v.bw.confirmLine, /Capacity is approximate\. Attachments may exceed provisioned bandwidth\./);
  // AWS polices: a short size drops traffic, and says so.
  const a = observe('partial', { bwFor: 'cx-us-east-1', bwPick: { id: 'cx-us-east-1', ports: 3, mbps: 1000 } });
  let w = vals(a);
  assert.equal(w.bw.downWord, 'Short of the peak, drops traffic');
  w.bw.apply(); w = vals(a);
  assert.equal(w.bw.confirmHead, 'This size drops traffic');
  // Review: Change, Monthly, Timeline; the approver is the input below, said once.
  w.bw.applyAnyway(); w = vals(a);
  assert.deepEqual(w.bw.review.map(r => r.k), ['Change', 'Monthly', 'Timeline']);
  assert.ok(!w.bw.review.some(r => r.v === w.bw.approver), 'the approver is not repeated above its own input');
  assert.equal(w.bw.reviewLine, 'AWS us-east-1 on NetBond. It goes to the approver first and takes effect Wed, Sep 30.');
  assert.ok(!/Timeline's day/.test(HTML));
  assert.ok(HTML.includes('{{ bw.reviewLine }}'));
});
