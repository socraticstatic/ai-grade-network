import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as F from '../naas-flowmap.js';
import * as R from '../naas-round2.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Small's Sankey stopped conserving (review, 2026-09-30, finding 7). With no
// private region the destinations moved the sites' AT&T share onto the
// internet, but the sites kept it and no path in the middle took it: left
// 3.818, middle 3.436, right 3.818 Gbps, and $2,400 against $2,700 in the
// Cost view. Every estate, at every scope a By chip offers, carries the same
// traffic in all three columns, and the same dollars in the Cost view.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch });
const col = (v, side) => v.mapNodes.filter(n => n.side === side).reduce((a, n) => a + n.v, 0);
const within = (a, b) => Math.abs(a - b) <= 1e-6;
// Whole estate, then every pick the By cloud and By site pickers offer.
const scopes = (id) => [{ label: 'Whole estate', patch: {} },
  ...['cloud', 'site'].flatMap(dim => vals(at(id, { obDim: dim })).scopeMembers.map(m => ({ label: m.key, patch: { obDim: dim, obScope: m.key } })))];
const ESTATES = Object.keys(D.ESTATES);

test('the scopes under test include Small\'s cloud and both of its sites', () => {
  assert.deepEqual(scopes('small').map(s => s.label), ['Whole estate', 'cloud:AWS', 'site:Dallas HQ', 'site:Houston yard']);
});

for (const id of ESTATES) {
  for (const [mode, unit] of [['state', 'Gbps'], ['cost', '$/mo']]) {
    test(`${id}: in the ${mode === 'cost' ? 'Cost' : 'Traffic'} view the sites, the paths and the destinations carry the same ${unit}, at every scope`, () => {
      const bad = [];
      for (const { label, patch } of scopes(id)) {
        const v = vals(at(id, { ...patch, mapMode: mode }));
        const L = col(v, 'l'), M = col(v, 'm'), Rr = col(v, 'r');
        if (!within(L, M) || !within(M, Rr)) bad.push(`${label}: left ${L} middle ${M} right ${Rr}`);
      }
      assert.equal(bad.length, 0, '\n  ' + bad.join('\n  '));
    });
  }
}

// No unattached strip: every bar on the left sends all of itself into the
// middle, and every bar on the right takes all of itself from it. A share with
// no ribbon draws as a sliver of bar that goes nowhere.
const ctx = (id) => { const est = D.ESTATES[id]; const inv = A.inventory(est); return { est, inv, flows: A.observe(est, [], inv).flows }; };
// Each path at its own price (2026-09-30, owner decision a): NetBond and the
// private WAN at the AT&T rate, direct connect at a list price, Equinix
// Fabric unpriced, outside at egress. Any rates do; these differ on purpose.
const DIRECT = F.RAMP_NAME.DX, EQX = F.RAMP_NAME.EQX;
const RATES = { fab: 700, pub: 1900, ramp: { [DIRECT]: 2600, [EQX]: 0 } };
const rateOf = (m) => (m.ramp ? (m.ramp in RATES.ramp ? RATES.ramp[m.ramp] : RATES.fab) : m.wan ? RATES.fab : RATES.pub);
// Whole estate, every cloud, and the first ten sites: [label, estate, options].
const scoped = (est) => { const window = { growth: R.growthOf('30d') };
  return [['Whole estate', est, { window }],
    ...[...new Set(est.regionsList.map(r => r.cloud))].map(c => [`cloud:${c}`, est, { window, filterRegion: c, context: true }]),
    ...(est.sites || []).slice(0, 10).map(s => [`site:${s.name}`, R.applyScope(est, 'site:' + s.name), { window, leftBy: 'class' }])]; };
for (const id of ESTATES) {
  test(`${id}: every bar on the map is fully attached, at every scope, in Gbps and in dollars`, () => {
    const { est, inv, flows } = ctx(id);
    // Extended 2026-09-30 (owner decision a): the dollar map, at a price per path, too.
    const maps = scoped(est).flatMap(([label, e, o]) => [[label, F.buildMap(e, inv, flows, o)], [`${label} · $/mo`, F.buildMap(e, inv, flows, { ...o, weigh: RATES })]]);
    const bad = [];
    for (const [label, m] of maps) {
      for (const nd of m.nodes) {
        const out = m.ribbons.filter(r => r.from === nd.key).reduce((a, r) => a + r.v, 0), inn = m.ribbons.filter(r => r.to === nd.key).reduce((a, r) => a + r.v, 0);
        if (nd.side === 'l' && !within(out, nd.v)) bad.push(`${label} ${nd.name}: sends ${out} of ${nd.v}`);
        if (nd.side === 'r' && !within(inn, nd.v)) bad.push(`${label} ${nd.name}: takes ${inn} of ${nd.v}`);
        if (nd.side === 'm' && (!within(inn, nd.v) || !within(out, nd.v))) bad.push(`${label} ${nd.name}: in ${inn} out ${out} of ${nd.v}`);
      }
    }
    assert.equal(bad.length, 0, '\n  ' + bad.join('\n  '));
  });

  // Owner decision (a), 2026-09-30: the dollar map is the Gbps map with each
  // path at its own price. Every priced path in the middle carries its Gbps
  // times its rate, at every scope; a path with no price leaves the dollar map.
  test(`${id}: in dollars every path in the middle is its Gbps at its own rate, at every scope`, () => {
    const { est, inv, flows } = ctx(id);
    const bad = [];
    for (const [label, e, o] of scoped(est)) {
      const g = F.buildMap(e, inv, flows, o), m = F.buildMap(e, inv, flows, { ...o, weigh: RATES });
      for (const x of g.nodes.filter(n => n.side === 'm')) {
        const want = x.v * rateOf(x), got = (m.nodes.find(n => n.key === x.key) || { v: 0 }).v;
        if (Math.abs(got - want) > 1e-6 * Math.max(1, want)) bad.push(`${label} ${x.name}: ${got} vs ${x.v} Gbps x ${rateOf(x)} = ${want}`);
      }
      if (m.nodes.some(n => n.v <= 0.0005)) bad.push(`${label}: an unpriced bar is drawn: ${m.nodes.filter(n => n.v <= 0.0005).map(n => n.name).join(', ')}`);
    }
    assert.equal(bad.length, 0, '\n  ' + bad.join('\n  '));
  });
}

test('Small: nothing is attached, so nothing rides AT&T and no on-ramp is drawn', () => {
  const v = vals(at('small'));
  assert.ok(col(v, 'l') > 0);
  assert.ok(v.mapNodes.filter(n => n.side !== 'ctx').every(n => (n.fabV || 0) < 1e-9), v.mapNodes.filter(n => n.fabV > 0).map(n => `${n.label} ${n.fabV}`).join(', '));
  assert.deepEqual(v.mapNodes.filter(n => n.side === 'm').map(n => n.label), ['Internet']);
});

test('with nothing attached, only what goes to your own data centers stays on AT&T, on the private WAN', () => {
  // Fixture: Acme with every region detached. Its data centers still take their share over the private WAN.
  const est = { ...D.ESTATES.partial, regionsList: D.ESTATES.partial.regionsList.map(r => ({ ...r, priv: false })) };
  const inv = A.inventory(est), flows = A.observe(est, [], inv).flows;
  const m = F.buildMap(est, inv, flows, {});
  const sum = (side, k = 'v') => m.nodes.filter(n => n.side === side).reduce((a, n) => a + (n[k] || 0), 0);
  assert.ok(within(sum('l'), sum('m')) && within(sum('m'), sum('r')), `left ${sum('l')} middle ${sum('m')} right ${sum('r')}`);
  const mids = m.nodes.filter(n => n.side === 'm');
  assert.ok(!mids.some(n => n.ramp), mids.map(n => n.name).join(', '));
  const wan = mids.find(n => n.wan), dc = m.nodes.find(n => n.kind === 'dc');
  assert.ok(wan && dc, 'the private WAN and your data centers are still drawn');
  assert.ok(within(sum('l', 'fabV'), wan.v) && within(wan.v, dc.v), `on AT&T ${sum('l', 'fabV')} · WAN ${wan.v} · data centers ${dc.v}`);
});

test('Small: the Cost view prices what leaves AT&T at its $2,400 internet egress bucket, on both sides', () => {
  const v = vals(at('small', { mapMode: 'cost' }));
  assert.ok(Math.abs(col(v, 'l') - 2400) < 1e-6, `left ${col(v, 'l')}`);
  assert.ok(Math.abs(col(v, 'r') - 2400) < 1e-6, `right ${col(v, 'r')}`);
});
