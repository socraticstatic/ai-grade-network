import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import { buildMap, capOf, NEAR_FULL, RAMP_NAME } from '../naas-flowmap.js';

// "on sankey, cost and performance don't show cost and performance", "the
// sankey widgets and the sankey graphic doesn't really match", "replay and
// since are not connected on sankey" (Micah, 2026-09-29). One model under all
// of it: the map in Gbps, the same map weighed in dollars, and each node's
// busiest connection at its peak against what was bought (2026-10-15, in place
// of a delay figure).

const ctx = (id) => { const est = D.ESTATES[id]; const inv = A.inventory(est); return { est, inv, flows: A.observe(est, [], inv).flows }; };
const sum = (xs) => xs.reduce((a, x) => a + x.v, 0);
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= Math.max(0.01, tol * Math.max(Math.abs(a), Math.abs(b)));
const cols = (m) => ['l', 'm', 'r'].map(sd => sum(m.nodes.filter(x => x.side === sd)));

for (const id of ['partial', 'mature', 'trust']) {
  test(`${id}: the cost map is the same map weighed in dollars, and it balances`, () => {
    const { est, inv, flows } = ctx(id);
    const g = buildMap(est, inv, flows, {});
    const w = { fab: 1000, pub: 2500 };
    const m = buildMap(est, inv, flows, { weigh: w });
    const L = g.nodes.filter(x => x.side === 'l');
    const want = L.reduce((a, x) => a + x.fabV * w.fab + (x.v - x.fabV) * w.pub, 0);
    assert.ok(near(m.total, want), `${m.total} vs ${want}`);
    const [l, mid, r] = cols(m);
    assert.ok(near(l, mid) && near(mid, r), `${l} ${mid} ${r}`);
    const root = m.nodes.filter(x => x.side === 'l').sort((a, b) => b.v - a.v)[0];
    const open = buildMap(est, inv, flows, { weigh: w, open: [root.key] });
    assert.ok(near(sum(open.nodes.filter(x => x.side === 'l' && x.key.startsWith(root.key + '/'))), root.v), 'an opened node keeps its dollars');
  });

  test(`${id}: Since sets the window and Replay plays it, and the map balances at every moment`, () => {
    const { est, inv, flows } = ctx(id);
    const now = buildMap(est, inv, flows, {});
    const avg = buildMap(est, inv, flows, { window: { growth: 0.11 } });
    assert.ok(avg.total < now.total, 'a growing window averages below now');
    assert.ok(near(avg.total, now.total * (1 + 0.055) / 1.11, 0.02), `${avg.total}`);
    for (const t of [0, 0.3, 0.7, 1]) {
      const m = buildMap(est, inv, flows, { window: { growth: 0.11 }, t });
      const [l, mid, r] = cols(m);
      assert.ok(near(l, mid) && near(mid, r), `t=${t}: ${l} ${mid} ${r}`);
    }
    const start = buildMap(est, inv, flows, { window: { growth: 0.11 }, t: 0 }).total, end = buildMap(est, inv, flows, { window: { growth: 0.11 }, t: 1 }).total;
    assert.ok(start < end, `the window grows: ${start} -> ${end}`);
  });

  test(`${id}: every path a connection carries reads its busiest connection's peak and its state; the rest carry no figure`, () => {
    const { est, inv, flows } = ctx(id);
    const m = buildMap(est, inv, flows, {});
    const conns = X.connections(est, A.observe(est, [], inv));
    const p = capOf(m, est, conns);
    for (const x of m.nodes.filter(x => x.side === 'm')) {
      const q = p.nodes[x.key];
      if (!x.ramp) { assert.equal(q, undefined, `${x.name} has no connection to measure: ${JSON.stringify(q)}`); continue; }
      const rows = conns.rows.filter(c => (RAMP_NAME[c.ramp] || 'NetBond') === x.ramp);
      if (!rows.length) continue;
      assert.equal(q.pct, Math.max(...rows.map(c => c.pct)), `${x.name}: ${q.pct}`);
      const want = rows.some(c => c.degraded) ? 'down' : rows.some(c => c.pct >= NEAR_FULL) ? 'risk' : 'ok';
      assert.equal(q.health, want, `${x.name}: ${q.health}`);
    }
    assert.equal(p.ribbons.length, m.ribbons.length);
    // A site's own access is not measured: a path it takes being down never makes the site read Down.
    for (const x of m.nodes.filter(x => x.side === 'l')) assert.equal(p.nodes[x.key], undefined, `${x.name} reads ${JSON.stringify(p.nodes[x.key])}`);
    assert.deepEqual(p.near, m.nodes.filter(x => (x.side === 'm' || x.side === 'r') && p.nodes[x.key] && p.nodes[x.key].health === 'risk').map(x => x.key));
    for (const q of Object.values(p.nodes)) assert.ok(['ok', 'risk', 'down'].includes(q.health) && Number.isFinite(q.pct), JSON.stringify(q));
  });
}

test('the map\'s peak is its busiest connection, and the internet carries no figure', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const { est, inv, flows } = ctx(id);
    const m = buildMap(est, inv, flows, {});
    const conns = X.connections(est, A.observe(est, [], inv));
    const p = capOf(m, est, conns);
    const onMap = new Set(m.nodes.filter(x => x.side === 'm' && x.ramp).map(x => x.ramp));
    const rows = conns.rows.filter(c => onMap.has(RAMP_NAME[c.ramp] || 'NetBond'));
    assert.equal(p.peak ? p.peak.pct : null, rows.length ? Math.max(...rows.map(c => c.pct)) : null, id);
    const inet = m.nodes.find(x => x.name === 'Internet');
    if (inet) assert.equal(p.nodes[inet.key], undefined, `${id}: the internet reads ${JSON.stringify(p.nodes[inet.key])}`);
  }
});

test('a destination reads its own regions\' connections: a full one shows, it is not averaged away', () => {
  const { est, inv, flows } = ctx('mature');
  const m = buildMap(est, inv, flows, {});
  const conns = X.connections(est, A.observe(est, [], inv));
  const p = capOf(m, est, conns);
  for (const name of ['AWS', 'Azure']) {
    const node = m.nodes.find(x => x.name === name);
    const regs = node.parts.filter(pt => pt.fab > 0).map(pt => pt.r.region);
    const rows = conns.rows.filter(c => regs.includes(c.region));
    assert.equal(p.nodes[node.key].pct, Math.max(...rows.map(c => c.pct)), name);
  }
});
