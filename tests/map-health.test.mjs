import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "the healthy sankey doesn't work" (Micah, 2026-09-30). One rule for the map's
// Health filter: a ribbon is Down when it rides a degraded link, otherwise its
// latency state; choosing a state lights the ribbons in that state and the nodes
// at both their ends, and dims the rest. Down is a choice like the others.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const traffic = (view, h) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'map', mapHealth: h });
const lit = (x) => x.op >= 0.35;

test('the chips are Healthy, At risk, Over SLO and Down; clicking the lit one clears it', () => {
  const c = traffic('partial', 'all');
  assert.deepEqual(vals(c).healthChips.map(h => h.label), ['Healthy', 'At risk', 'Over SLO', 'Down']);
  vals(c).healthChips.find(h => h.label === 'Down').go();
  assert.equal(c.state.mapHealth, 'down');
  vals(c).healthChips.find(h => h.label === 'Down').go();
  assert.equal(c.state.mapHealth, 'all');
});

test('every lit ribbon has both its ends lit, and only those ends light', () => {
  for (const view of ['partial', 'mature', 'trust']) for (const h of ['ok', 'risk', 'slo', 'down']) {
    const v = vals(traffic(view, h));
    const on = v.mapRibbons.filter(lit), ends = new Set(on.flatMap(r => [r.from, r.to]));
    for (const r of on) assert.equal(r.state, h, `${view} ${h}: ${r.from} -> ${r.to} is ${r.state}`);
    for (const n of v.mapNodes.filter(n => n.nodeKey && n.side !== 'ctx')) assert.equal(n.op === 1, ends.has(n.nodeKey), `${view} ${h}: ${n.label} op ${n.op}`);
  }
});

test('Growing: Healthy never lights the flapping ExpressRoute path; Down lights it and its ends', () => {
  const ok = vals(traffic('partial', 'ok'));
  assert.ok(ok.mapRibbons.filter(r => r.state === 'down').every(r => !lit(r)));
  const down = vals(traffic('partial', 'down'));
  const on = down.mapRibbons.filter(lit);
  assert.ok(on.length > 0, 'a degraded ribbon lights under Down');
  assert.ok(down.mapNodes.some(n => n.op === 1 && /direct connect/i.test(n.label)), 'the path lights');
  assert.ok(down.mapNodes.some(n => n.op === 1 && /Azure/.test(n.label)), 'Azure lights');
});

test('the Over SLO tile counts the links the Over SLO chip lights', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const v = vals(traffic(view, 'slo'));
    const n = v.mapRibbons.filter(r => lit(r) && String(r.from).startsWith('mid:')).length;
    assert.equal(v.flowTiles.find(t => t.key === 'slo').v, String(n), view);
  }
});
