import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { buildMap, childrenOf, leftRoots, rightRoots, trail, litFor, deltaOf, shapeAt, PATTERNS, patternLit } from '../naas-flowmap.js';

const ctx = (id) => { const est = D.ESTATES[id]; const inv = A.inventory(est); return { est, inv, flows: A.observe(est, [], inv).flows }; };
const ESTATES = ['partial', 'mature'];
const sum = (xs, k = 'v') => xs.reduce((a, x) => a + x[k], 0);
const near = (a, b, tol = 0.005) => Math.abs(a - b) <= Math.max(0.01, tol * Math.max(Math.abs(a), Math.abs(b)));

// The map is a Sankey. A Sankey that does not conserve is a picture, not a
// measurement. Every level must hand its parent's volume to its children.
for (const id of ESTATES) {
  test(`${id}: the three columns balance`, () => {
    const { est, flows } = ctx(id);
    const L = leftRoots(est, flows), R = rightRoots(est, flows);
    assert.ok(near(sum(L), sum(R)), `left ${sum(L)} vs right ${sum(R)}`);
    // Since 2026-09-28 the right is destinations only: clouds and your data
    // centers. Fabric volume is the clouds' fabric plus the private WAN; what
    // leaves AT&T lands on the clouds' public regions.
    const fab = sum(L, 'fabV'), pub = sum(L) - fab;
    const clouds = R.filter(x => x.kind === 'cloud'), dc = R.filter(x => x.kind === 'dc');
    assert.ok(near(sum(clouds, 'fabV') + sum(dc), fab), `clouds ${sum(clouds, 'fabV')} + data centers ${sum(dc)} vs fabric ${fab}`);
    assert.ok(near(sum(clouds, 'pubV'), pub), `public ${sum(clouds, 'pubV')} vs off-fabric ${pub}`);
    assert.ok(!R.some(x => x.key === 'dest:public internet'), 'the right is destinations, not the internet');
  });

  test(`${id}: every drill level conserves its parent's volume`, () => {
    const { est, inv, flows } = ctx(id);
    const bad = [];
    const walk = (node, path, depth) => {
      let kids = [];
      try { kids = childrenOf(node, est, inv, flows) || []; } catch (e) { return; }
      if (!kids.length) return;
      if (!near(sum(kids), node.v, 0.01)) bad.push(`${path}: parent ${node.v.toFixed(2)} vs children ${sum(kids).toFixed(2)}`);
      if (!near(sum(kids, 'fabV'), node.fabV, 0.01)) bad.push(`${path} [fabV]: parent ${node.fabV.toFixed(2)} vs children ${sum(kids, 'fabV').toFixed(2)}`);
      if (depth < 3) kids.forEach(k => walk(k, `${path} / ${k.name}`, depth + 1));
    };
    [...leftRoots(est, flows), ...rightRoots(est, flows)].forEach(r => walk(r, r.name, 0));
    assert.equal(bad.length, 0, '\n  ' + bad.join('\n  '));
  });

  test(`${id}: fabric volume never lands on a region with no fabric path`, () => {
    const { est, inv, flows } = ctx(id);
    const pubRegions = new Set(est.regionsList.filter(r => !r.priv).map(r => `${r.cloud} ${r.region}`));
    const offenders = [];
    rightRoots(est, flows).filter(x => x.kind === 'cloud').forEach(c => {
      childrenOf(c, est, inv, flows).forEach(r => { if (pubRegions.has(r.name) && r.fabV > 0.001) offenders.push(`${r.name} carries ${r.fabV.toFixed(2)} Gbps of fabric`); });
    });
    assert.equal(offenders.length, 0, '\n  ' + offenders.join('\n  '));
  });

  test(`${id}: a cloud with no private region carries no fabric`, () => {
    const { est, flows } = ctx(id);
    const privClouds = new Set(est.regionsList.filter(r => r.priv).map(r => r.cloud));
    rightRoots(est, flows).filter(x => x.kind === 'cloud' && !privClouds.has(x.cloud))
      .forEach(c => assert.ok(c.fabV < 0.001, `${c.cloud} has no private region but carries ${c.fabV.toFixed(2)} Gbps of fabric`));
  });

  test(`${id}: what leaves AT&T lands on the public regions it actually reaches`, () => {
    const { est, inv, flows } = ctx(id);
    const pubRegions = new Set(est.regionsList.filter(r => !r.priv).map(r => `${r.cloud} ${r.region}`));
    if (!pubRegions.size) return;
    const kids = rightRoots(est, flows).filter(x => x.kind === 'cloud').flatMap(c => childrenOf(c, est, inv, flows)).filter(k => k.pubV > 0.0005);
    assert.ok(kids.length >= 1);
    assert.ok(kids.every(k => pubRegions.has(k.name) && k.fabV === 0), kids.map(k => k.name).join(', '));
  });
}

test('a site group of mixed building classes prices each site by its own class', () => {
  // Acme's "2 sites on ADI" is a data center and a plant. Weighting the plant
  // as a data center inflated the drill by 60% against its own parent row.
  // Fixture: a data center and a plant in one region (the map groups by region since 2026-09-28).
  const est = { ...D.ESTATES.partial, sites: [
    { name: 'Atlanta DC2', cls: 'Data center', access: 'ADI (Dedicated Internet)', priv: false, metro: 'Atlanta' },
    { name: 'Denver plant', cls: 'Plant', access: 'ADI (Dedicated Internet)', priv: false, metro: 'Ashburn' },
  ] };
  const inv = A.inventory(est), flows = A.observe(est, [], inv).flows;
  const adi = leftRoots(est, flows).find(x => x.region === 'US East');
  const kids = childrenOf(adi, est, inv, flows);
  const dc = kids.find(k => /Atlanta/.test(k.name)), plant = kids.find(k => /Denver/.test(k.name));
  assert.ok(dc && plant);
  assert.ok(near(dc.v, 6), `data center ${dc.v}`);
  assert.ok(near(plant.v, 1.5), `plant ${plant.v}`);
});

test('a site opens to the regions it reaches, and they add up to the site', () => {
  const { est, inv, flows } = ctx('mature');
  const adi = leftRoots(est, flows).find(x => x.region === 'International');
  const sg = childrenOf(adi, est, inv, flows).find(k => /Singapore/.test(k.name));
  assert.ok(sg, 'Singapore DC');
  const circuits = childrenOf(sg, est, inv, flows);
  assert.ok(circuits.length >= 2);
  assert.equal(circuits[0].kind, 'circuit');
  assert.ok(near(sum(circuits), sg.v, 0.01), `${sum(circuits)} vs ${sg.v}`);
  assert.match(circuits[0].name, /ap-southeast-1/);
});

test('first mile drills class → metro → site → circuit, and folds nothing away', () => {
  const { est, inv, flows } = ctx('mature');
  const sdwan = leftRoots(est, flows).find(x => x.region === 'Nationwide');
  const metros = childrenOf(sdwan, est, inv, flows);
  assert.equal(metros[0].kind, 'metro');
  const sites = childrenOf(metros[0], est, inv, flows);
  assert.equal(sites[0].kind, 'sitename');
  assert.ok(near(sum(sites), metros[0].v, 0.01));
  const circuits = childrenOf(sites[0], est, inv, flows);
  assert.equal(circuits[0].hasChildren, false);
});

test('buildMap expands open keys in place and ribbons carry from/to', () => {
  const { est, inv, flows } = ctx('mature');
  const root = leftRoots(est, flows).find(x => x.count > 2).key; // a region with several sites
  const m0 = buildMap(est, inv, flows, {});
  const m1 = buildMap(est, inv, flows, { open: [root] });
  assert.ok(m1.nodes.length > m0.nodes.length);
  assert.ok(!m1.nodes.some(x => x.key === root));
  assert.ok(m1.ribbons.every(r => r.from && r.to && r.pattern));
  assert.ok(m1.ribbons.some(r => r.from.startsWith(root + '/')));
});

test('the map totals what the sites send, and the paths in the middle carry all of it', () => {
  const { est, inv, flows } = ctx('mature');
  const m = buildMap(est, inv, flows, {});
  const L = leftRoots(est, flows);
  assert.ok(near(m.total, sum(L)), `${m.total} vs ${sum(L)}`);
  assert.ok(near(m.fabV, sum(L, 'fabV')));
  const mids = m.nodes.filter(x => x.side === 'm');
  assert.ok(mids.some(x => x.name === 'NetBond'), mids.map(x => x.name).join(', '));
  assert.ok(near(sum(mids), m.total), `mid band ${sum(mids)} vs total ${m.total}`);
  // Every mid adds up on both sides.
  for (const md of mids) {
    const inV = m.ribbons.filter(r => r.to === md.key).reduce((a, r) => a + r.v, 0), outV = m.ribbons.filter(r => r.from === md.key).reduce((a, r) => a + r.v, 0);
    assert.ok(near(inV, md.v, 0.01) && near(outV, md.v, 0.01), `${md.name}: in ${inV} out ${outV} of ${md.v}`);
  }
});

test('filterRegion narrows, scrub scales, deltas and states exist', () => {
  const { est, inv, flows } = ctx('mature');
  const all = buildMap(est, inv, flows, {});
  assert.ok(buildMap(est, inv, flows, { filterRegion: 'eu-central-1' }).total < all.total);
  assert.notEqual(Math.round(buildMap(est, inv, flows, { t: 0.5 }).total * 100), Math.round(all.total * 100));
  assert.ok(all.nodes.every(x => typeof x.delta === 'number' && ['ok', 'degraded', 'slo'].includes(x.state)));
  assert.equal(deltaOf('x'), deltaOf('x'));
  assert.ok(shapeAt('x', 0.3) > 0.5 && shapeAt('x', 0.3) < 1.3);
});

test('trail walks root to leaf; litFor lights ribbons through a node', () => {
  const { est, inv, flows } = ctx('mature');
  const sdwan = leftRoots(est, flows).find(x => x.region === 'Nationwide');
  const metro = childrenOf(sdwan, est, inv, flows)[0];
  const site = childrenOf(metro, est, inv, flows)[0];
  assert.deepEqual(trail(site.key, est, inv, flows).map(x => x.kind), ['site', 'metro', 'sitename']);
  const lit = litFor(buildMap(est, inv, flows, {}), sdwan.key);
  assert.ok(lit.keys.has(sdwan.key) && [...lit.keys].some(k => k.startsWith('mid:')));
  assert.ok(lit.ribbons.size >= 1);
});

test('every ribbon carries a pattern and every named pattern lights something', () => {
  const { est, inv, flows } = ctx('mature');
  const m = buildMap(est, inv, flows, {});
  assert.ok(m.ribbons.every(r => r.pattern));
  const live = PATTERNS.map(p => p[0]).filter(k => patternLit(m, k));
  assert.ok(live.length >= 1);
  assert.equal(patternLit(m, 'all'), null);
});

test('below the roots, an open node folds its siblings into one row', () => {
  const { est, inv, flows } = ctx('mature');
  const sdwan = leftRoots(est, flows).find(x => x.region === 'Nationwide');
  const metro = childrenOf(sdwan, est, inv, flows)[0];
  const m = buildMap(est, inv, flows, { open: [sdwan.key, metro.key] });
  const roll = m.nodes.filter(x => x.kind === 'rollup').find(x => /other metros/.test(x.name));
  assert.equal(m.nodes.filter(x => x.kind === 'metro').length, 0);
  assert.ok(roll, m.nodes.filter(x => x.kind === 'rollup').map(x => x.name).join(', '));
  assert.ok(m.nodes.some(x => x.kind === 'sitename'));
  assert.ok(!buildMap(est, inv, flows, { open: [sdwan.key] }).nodes.some(x => x.kind === 'rollup'), 'roots do not fold');
});

test('zoom on click: the focused subtree inflates, ribbons still attach', () => {
  const { est, inv, flows } = ctx('mature');
  const sdwan = leftRoots(est, flows).find(x => x.region === 'Nationwide');
  const metro = childrenOf(sdwan, est, inv, flows)[0];
  const flat = buildMap(est, inv, flows, { open: [sdwan.key, metro.key] });
  const zoomed = buildMap(est, inv, flows, { open: [sdwan.key, metro.key], zoom: metro.key });
  const h = (m) => m.nodes.filter(x => x.kind === 'sitename').reduce((a, x) => a + x.h, 0);
  assert.ok(zoomed.zf > 1);
  assert.ok(h(zoomed) > h(flat) * 1.5, `${h(zoomed)} vs ${h(flat)}`);
  assert.ok(zoomed.ribbons.every(r => r.d.startsWith('M')));
});
