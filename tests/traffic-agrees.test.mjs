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
// The Utilization view (in place of the Performance view, 2026-10-15) inks a link by its connection: Near full is At
// risk's ink, Down is Down's red, and a link nothing here measures reads Not measured.

// Since 2026-10-05 the bucket is shared by every public middle: the IPsec tunnels, the SD-WAN
// tunnels (Boston, Houston) and the plain internet. Together they are the $8,600 bucket; each
// label rounds to the hundred, so the sum lands within $100 of it.
for (const win of ['7d', '30d', '90d']) {
  test(`Whole estate public middles price at the $8,600 bucket at ${win}`, () => {
    const v = at({ mapMode: 'cost', obWindow: win });
    const sum = ['mid:ipsec', 'mid:sdwan', 'mid:internet'].map(k => node(v, k)).filter(Boolean).reduce((a, n) => a + dollars(n.vF), 0);
    assert.ok(Math.abs(sum - 8600) <= 100, `${win}: ${sum}`);
  });
}

test('an SD-WAN tunnel carries traffic only into the cloud it lands in', () => {
  const v = at();
  const to = v.mapRibbons.filter(r => r.from === 'mid:sdwan').map(r => r.to);
  assert.deepEqual([...new Set(to)], ['cloud:AWS']);
  assert.ok(!node(at(GCP), 'mid:sdwan'), 'GCP is not reached over an SD-WAN tunnel');
});

test('under a GCP pick the IPsec label, the Cost view node and the Cost tile agree', () => {
  const label = node(at(GCP), 'mid:ipsec').pathSay;
  const cost = at({ ...GCP, mapMode: 'cost' });
  assert.equal(dollars(label), dollars(node(cost, 'mid:ipsec').vF), label);
  // GCP rides IPsec and, since 2026-10-05, the tunnel offices' plain internet: the two are the whole bill, to the rounding.
  assert.ok(Math.abs(dollars(node(cost, 'mid:ipsec').vF) + dollars(node(cost, 'mid:internet').vF) - dollars(tile(cost, 'cost').v)) <= 100);
});

test('a map under 1 Gbps reads in Mbps on the Traffic tile, as its nodes do', () => {
  // GCP crossed 1 Gbps on 2026-10-05 (four offices left the private path); one branch is well under it.
  const v = at({ obDim: 'site', obScope: 'site:Charlotte branch' });
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

test('in the Utilization view, the Near full ink means near full, the same as the tile and the At risk filter', () => {
  const RISK = 'var(--warning)', DOWN = 'var(--error)', NONE = 'var(--text-disabled)';
  let seen = 0;
  for (const patch of [{}, { view: 'mature' }, { view: 'trust' }, GCP]) {
    const v = at({ ...patch, mapMode: 'util' });
    // A link's ink is its state's, and only its state's.
    for (const r of v.mapRibbons) {
      if (r.fill === RISK) assert.equal(r.state, 'risk', `${JSON.stringify(patch)} ${r.from} > ${r.to}`);
      if (r.fill === DOWN) assert.equal(r.state, 'down', `${JSON.stringify(patch)} ${r.from} > ${r.to}`);
      if (r.state == null) assert.equal(r.fill, NONE, `${JSON.stringify(patch)} ${r.from} > ${r.to}: not measured`);
    }
    // The tile counts the near-full links out of a path, the ones the At risk filter lights (2026-09-30, "the healthy sankey doesn't work").
    const near = v.mapRibbons.filter(r => String(r.from).startsWith('mid:') && r.state === 'risk').length;
    assert.equal(tile(v, 'near').v, String(near), JSON.stringify(patch));
    // A site's own access is not measured, so no site reads Down for a path it takes.
    for (const n of v.mapNodes.filter(x => x.side === 'l')) assert.equal(n.fill, NONE, `${JSON.stringify(patch)} ${n.id}`);
    // The Traffic view keeps its path inks: nothing there is drawn in a state's ink but a degraded link's red.
    const t = at(patch);
    assert.ok(!t.mapNodes.some(n => n.fill === RISK || n.fill === DOWN), JSON.stringify(patch));
    seen += near;
  }
  assert.ok(seen >= 1, 'no near-full link to check');
});
