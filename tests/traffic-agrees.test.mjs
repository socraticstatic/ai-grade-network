import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The Traffic screen agrees with itself (notes, 2026-09-30, Task 0.4). The
// stakeholder's own screenshot (att5, Growing, By cloud · GCP) showed the
// Over SLO tile at 0 beside a red GCP node, an IPsec label at $8,600 beside a
// Cost tile at $3,300, a 0.1 Gbps tile beside a 70 Mbps node, and 20 of 25
// sites on AT&T where the map drew nothing on AT&T.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const at = (patch = {}) => vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch }));
const tile = (v, k) => v.flowTiles.find(t => t.key === k);
const node = (v, id) => v.mapNodes.find(n => n.id === id);
const dollars = (s) => +String(s).replace(/^[^$]*\$([\d,]+).*$/, '$1').replace(/,/g, '');
const GCP = { obDim: 'cloud', obScope: 'cloud:GCP' };
// Over SLO has its own ink since the review (2026-09-30); red is Down's alone.
const RED = 'var(--viz-5)';

for (const win of ['7d', '30d', '90d']) {
  test(`Whole estate IPsec prices at the $8,600 bucket at ${win}`, () => {
    assert.equal(node(at({ mapMode: 'cost', obWindow: win }), 'mid:ipsec').vF, '$8,600/mo');
  });
}

test('under a GCP pick the IPsec label, the Cost view node and the Cost tile agree', () => {
  const label = node(at(GCP), 'mid:ipsec').pathSay;
  const cost = at({ ...GCP, mapMode: 'cost' });
  assert.equal(dollars(label), dollars(node(cost, 'mid:ipsec').vF), label);
  // GCP rides IPsec only, so the path is the whole bill.
  assert.equal(dollars(label), dollars(tile(cost, 'cost').v));
});

test('a map under 1 Gbps reads in Mbps on the Traffic tile, as its nodes do', () => {
  const v = at(GCP);
  const t = tile(v, 'traffic');
  assert.equal(t.u, 'Mbps');
  assert.equal(`${t.v} ${t.u}`, `${Math.round(v.mapTotal * 1000)} Mbps`);
  const whole = tile(at(), 'traffic');
  assert.equal(whole.u, 'Gbps');
});

test('Sites on AT&T under a cloud pick counts what the map draws', () => {
  assert.equal(tile(at(GCP), 'onatt').v, '0 of 25', 'GCP is reached over IPsec only');
  assert.equal(tile(at({ obDim: 'cloud', obScope: 'cloud:AWS' }), 'onatt').v, '20 of 25');
  assert.equal(tile(at(), 'onatt').v, '20 of 25');
});

test('in the Traffic view, the Over SLO ink means over SLO, the same as the tile and the Performance view', () => {
  for (const patch of [{}, { view: 'mature' }, { view: 'trust' }, GCP]) {
    const v = at(patch);
    // Nothing is red unless it is over SLO; every destination over SLO is red.
    // The middle keeps its path ink (on AT&T or outside), which is the Traffic view's job.
    const redAny = v.mapNodes.filter(n => n.fill === RED);
    assert.ok(redAny.every(n => n.health === 'slo'), `${JSON.stringify(patch)}: red but within SLO: ${redAny.filter(n => n.health !== 'slo').map(n => n.id).join(', ')}`);
    const redR = v.mapNodes.filter(n => n.side === 'r' && n.fill === RED).map(n => n.id).sort();
    const overR = v.mapNodes.filter(n => n.side === 'r' && n.health === 'slo').map(n => n.id).sort();
    assert.deepEqual(redR, overR, JSON.stringify(patch));
    const over = v.mapNodes.filter(n => (n.side === 'm' || n.side === 'r') && n.health === 'slo').length;
    assert.equal(tile(v, 'slo').v, String(over));
    const sleeves = v.mapRibbons.filter(r => r.sleeve === RED).length;
    const perfRed = at({ ...patch, mapMode: 'slo' }).mapRibbons.filter(r => r.fill === RED).length;
    assert.equal(sleeves, perfRed, `${JSON.stringify(patch)}: ${sleeves} red sleeves, ${perfRed} over-SLO ribbons`);
  }
});
