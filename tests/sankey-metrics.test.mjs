import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { buildMap, perfOf, SLO, SLO_PRIVATE } from '../naas-flowmap.js';

// "on sankey, cost and performance don't show cost and performance", "the
// sankey widgets and the sankey graphic doesn't really match", "replay and
// since are not connected on sankey" (Micah, 2026-09-29). One model under all
// of it: the map in Gbps, the same map weighed in dollars, and each node's
// p95 against its SLO.

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

  test(`${id}: every node and path has a p95 against its SLO`, () => {
    const { est, inv, flows } = ctx(id);
    const m = buildMap(est, inv, flows, {});
    const p = perfOf(m, est);
    for (const x of m.nodes.filter(x => x.kind !== 'rollup' && x.kind !== 'more')) {
      const q = p.nodes[x.key];
      assert.ok(q && q.ms > 0 && [SLO, SLO_PRIVATE].includes(q.slo) && ['ok', 'risk', 'slo'].includes(q.health), `${x.name}: ${JSON.stringify(q)}`);
    }
    assert.equal(p.ribbons.length, m.ribbons.length);
    assert.ok(p.p95 > 0);
    assert.deepEqual(p.over, m.nodes.filter(x => (x.side === 'm' || x.side === 'r') && p.nodes[x.key] && p.nodes[x.key].health === 'slo').map(x => x.key));
  });
}

test('mature: the internet path and the clouds it reaches are over SLO; the p95 is the internet\'s', () => {
  const { est, inv, flows } = ctx('mature');
  const m = buildMap(est, inv, flows, {});
  const p = perfOf(m, est);
  const name = (k) => m.nodes.find(x => x.key === k).name;
  assert.ok(p.over.map(name).includes('Internet'), p.over.map(name).join(', '));
  assert.ok(p.over.map(name).includes('AWS'), 'AWS ap-southeast-1 rides the internet at 188 ms');
  assert.equal(p.p95, 188);
  const nb = m.nodes.find(x => x.name === 'NetBond');
  assert.equal(p.nodes[nb.key].health, 'ok');
});

test('an all-AT&T pick reads an all-AT&T p95', () => {
  const { est, inv, flows } = ctx('mature');
  const regions = est.regionsList.filter(r => r.priv && (r.tags || []).includes('PCI')).map(r => r.region);
  if (!regions.length) return;
  const m = buildMap(est, inv, flows, { rightBy: 'app', filterRegion: regions, tag: 'PCI' });
  assert.ok(perfOf(m, est).p95 <= SLO_PRIVATE + 5, String(perfOf(m, est).p95));
});

test('a node\'s p95 is its volume\'s 95th percentile: a slow region shows, it is not averaged away', () => {
  const { est, inv, flows } = ctx('mature');
  const m = buildMap(est, inv, flows, {});
  const p = perfOf(m, est);
  const azure = m.nodes.find(x => x.name === 'Azure'), aws = m.nodes.find(x => x.name === 'AWS');
  assert.equal(p.nodes[azure.key].ms, 21, 'westeurope at 21 ms is 39% of Azure');
  assert.equal(p.nodes[aws.key].ms, 188, 'ap-southeast-1 over the internet is a quarter of AWS');
  for (const x of m.nodes.filter(n => p.nodes[n.key] && p.nodes[n.key].health === 'slo')) assert.ok(p.nodes[x.key].ms > p.nodes[x.key].slo || x.side !== 'm', x.name);
});
