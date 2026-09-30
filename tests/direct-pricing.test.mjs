import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as F from '../naas-flowmap.js';
import * as R from '../naas-round2.js';
import { connModeOf } from '../naas-logic.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Owner decision (a) (Micah, 2026-09-30, "proceed on your recommendations"):
// the Cost view priced every private path at one AT&T rate, the AT&T charges
// over all the traffic on a private path. Direct Connect and ExpressRoute are
// the cloud provider's ports (D-6), so AT&T's bill was paying for them on the
// map. Now NetBond and the private WAN carry the AT&T charges, and direct
// connect carries its regions' ports at the cloud provider's list price,
// modelled, as Cost, By leg already prices them. Equinix Fabric is a third
// party's path with no public list price (By leg: "not on a public price
// list"), so the dollar view leaves it unpriced rather than invent a figure.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const at = (view, patch = {}) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch }));
const DIRECT = 'Cloud provider direct connect';
const mid = (v, name) => v.mapNodes.find(n => n.side === 'm' && n.label === name);
const usd = (v, name) => (mid(v, name) || { v: 0 }).v;
const col = (v, side) => v.mapNodes.filter(n => n.side === side).reduce((a, n) => a + n.v, 0);
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const dollars = (s) => +String(s).replace(/[^0-9.]/g, '');
const tile = (v, k) => v.flowTiles.find(t => t.key === k);
const legOf = (id) => { const est = D.ESTATES[id], inv = A.inventory(est), ob = A.observe(est, [], inv); return { est, inv, ob, legs: R.costLegs(est, inv, ob.utilRows) }; };
const attCharges = (id) => { const est = D.ESTATES[id]; return R.attChargeRows(est, A.inventory(est)).reduce((a, r) => a + r.v, 0); };

// The direct-connect regions' ports at the cloud provider's list price, read
// straight from CSP_PORT and each region's ports, apart from By leg's code.
function directPorts(id) {
  const { est, ob } = legOf(id);
  return ob.utilRows.filter(u => connModeOf(est.regionsList.find(r => r.region === u.region)) === 'direct').reduce((a, u) => {
    const P = R.CSP_PORT[u.cloud]; if (!P) return a;
    const size = /(^|\D)1G/.test(u.bwShort || '') && !/10G/.test(u.bwShort || '') ? '1G' : '10G';
    return a + (u.ports || 1) * (P[size] || P['10G']) + (P.vlan || 0);
  }, 0);
}

test('Growing: eastus is the one direct connect, one 10G ExpressRoute port at $3,400, and By leg carries it', () => {
  assert.equal(directPorts('partial'), 3400);
  // By leg's cloud rows say which of their ports are direct-connect ports.
  for (const id of ['partial', 'mature', 'trust']) {
    const rows = legOf(id).legs.cloud.rows;
    assert.ok(near(rows.reduce((a, r) => a + (r.direct || 0), 0), directPorts(id)), `${id}: ${rows.map(r => `${r.label} ${r.direct}`).join(', ')}`);
  }
});

for (const id of ['partial', 'mature']) {
  test(`${id}: in the Cost view direct connect is its ports at list price, and NetBond with the private WAN is the AT&T charges`, () => {
    const v = at(id, { mapMode: 'cost' });
    assert.ok(near(usd(v, DIRECT), directPorts(id)), `direct connect ${usd(v, DIRECT)} vs ports ${directPorts(id)}`);
    assert.ok(near(usd(v, 'NetBond') + usd(v, 'Private WAN'), attCharges(id)), `NetBond ${usd(v, 'NetBond')} + WAN ${usd(v, 'Private WAN')} vs AT&T charges ${attCharges(id)}`);
    assert.match(mid(v, DIRECT).title, /^Cloud provider direct connect: \$[\d,]+\/mo at the cloud provider's list price \(modelled\)$/);
    assert.equal(v.mapLegend.length, 3);
    assert.equal(v.mapLegend[2].label, 'Cloud provider direct connect, list price (modelled)');
    assert.equal(mid(v, DIRECT).fill, v.mapLegend[2].color, 'the node wears its swatch');
    // Left, middle and right carry the same dollars.
    assert.ok(near(col(v, 'l'), col(v, 'm')) && near(col(v, 'm'), col(v, 'r')), `left ${col(v, 'l')} middle ${col(v, 'm')} right ${col(v, 'r')}`);
  });

  test(`${id}: the By cloud picks share out the direct-connect ports exactly`, () => {
    const picks = at(id, { obDim: 'cloud' }).scopeMembers.map(m => m.key);
    const shared = picks.reduce((a, k) => a + usd(at(id, { mapMode: 'cost', obDim: 'cloud', obScope: k }), DIRECT), 0);
    assert.ok(near(shared, directPorts(id)), `${shared} vs ${directPorts(id)}`);
  });
}

test('the Observe Cost tile is the Cost view\'s own total, at the whole estate and under every By cloud pick', () => {
  const bad = [];
  for (const id of ['partial', 'mature', 'trust']) {
    for (const patch of [{}, ...at(id, { obDim: 'cloud' }).scopeMembers.map(m => ({ obDim: 'cloud', obScope: m.key }))]) {
      const v = at(id, { ...patch, mapMode: 'cost' }), t = tile(v, 'cost'), L = col(v, 'l');
      const want = L >= 1000 ? Math.round(L / 100) * 100 : Math.round(L);
      if (L > 0.5 && dollars(t.v) !== want) bad.push(`${id} ${patch.obScope || 'Whole estate'}: tile ${t.v} vs map ${L.toFixed(2)}`);
    }
  }
  assert.equal(bad.length, 0, '\n  ' + bad.join('\n  '));
  // Growing, whole estate: $4,600 of AT&T charges, $3,400 of ExpressRoute port, $8,600 of IPsec egress.
  assert.equal(tile(at('partial'), 'cost').v, '$16,600');
});

test('Equinix Fabric has no public list price, so the Cost view leaves it unpriced and says so', () => {
  const g = at('mature'), v = at('mature', { mapMode: 'cost' });
  assert.ok(mid(g, 'Equinix Fabric'), 'the Traffic view still draws the Equinix path');
  assert.equal(mid(v, 'Equinix Fabric'), undefined);
  assert.ok(!v.mapNodes.some(n => n.side === 'r' && n.label === 'CoreWeave'), 'no $0 destination');
  assert.match(tile(v, 'cost').title, /Equinix Fabric has no public list price/);
  assert.doesNotMatch(tile(at('partial'), 'cost').title, /Equinix/);
  // A pick that is all Equinix has nothing priced: words, never $0.
  const cw = at('mature', { mapMode: 'cost', obDim: 'cloud', obScope: 'cloud:CoreWeave' });
  assert.equal(`${tile(cw, 'cost').v}${tile(cw, 'cost').u}`, 'Not priced');
  // The map is empty there, so the line under it says why, and still opens every leg.
  assert.equal(cw.costScopeLine, 'Equinix Fabric has no public list price · every leg in Cost ›');
  assert.equal(v.costScopeLine, 'Traffic only · every leg in Cost ›');
});

test('the direct-connect ribbons wear the swatch and say where their price comes from', () => {
  const v = at('partial', { mapMode: 'cost' });
  const node = mid(v, DIRECT), sw = v.mapLegend[2].color;
  const through = v.mapRibbons.filter(r => r.fill === sw);
  assert.ok(through.length >= 2, 'into and out of the path');
  assert.ok(through.every(r => /at the cloud provider's list price \(modelled\)$/.test(r.title)), through.map(r => r.title).join(' | '));
  assert.ok(!v.mapRibbons.some(r => r.fill !== sw && /list price/.test(r.title)));
  assert.ok(node);
});

// Measured headless at 1440x900 (2026-09-30): Established's "$30,400/mo" and
// Bank scale's "$55,700/mo" cut the path's name to "Cloud provider direct
// conn..." in a 230-unit label; 250 holds the name and a five-figure month.
test('in the Cost view a path\'s label has room for its name and a five-figure month', () => {
  for (const id of ['mature', 'trust']) {
    const v = at(id, { mapMode: 'cost' });
    assert.ok(v.mapNodes.filter(n => n.side === 'm').every(n => n.lw >= 250), id);
    assert.ok(at(id).mapNodes.filter(n => n.side === 'm').every(n => n.lw === 230), `${id}: the Traffic view keeps its labels`);
  }
});

test('small and empty have no direct connect, so the legend keeps its two swatches', () => {
  for (const id of ['small', 'empty']) assert.equal(at(id, { mapMode: 'cost' }).mapLegend.length, 2, id);
});

test('the Gbps map does not move: weighed at a dollar a Gbps on every path, it is the Traffic map', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const est = D.ESTATES[id], inv = A.inventory(est), flows = A.observe(est, [], inv).flows, window = { growth: R.growthOf('30d') };
    const g = F.buildMap(est, inv, flows, { window });
    const w = F.buildMap(est, inv, flows, { window, weigh: { fab: 1, pub: 1, ramp: { [DIRECT]: 1, 'Equinix Fabric': 1 } } });
    assert.deepEqual(w.nodes.map(n => n.key), g.nodes.map(n => n.key), id);
    assert.ok(g.nodes.every((n, i) => near(n.v, w.nodes[i].v, 1e-9) && near(n.fabV || 0, w.nodes[i].fabV || 0, 1e-9)), id);
    assert.ok(g.ribbons.length === w.ribbons.length && g.ribbons.every((r, i) => near(r.v, w.ribbons[i].v, 1e-9)), id);
  }
});
