import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { regionOf, regionRows } from '../naas-logic.js';

// The left column starts at regions and drills to sites. A region card draws one
// line per distinct path found in it, so a mixed-carrier region still shows every
// way its traffic reaches the cloud on the first screen.

test('a site is placed by its metro, or by the region its name carries', () => {
  assert.equal(regionOf({ metro: 'Ashburn' }), 'US East');
  assert.equal(regionOf({ metro: 'Austin' }), 'US Central');
  assert.equal(regionOf({ metro: 'Denver' }), 'US West');   // Colorado, per the drill's own state table
  assert.equal(regionOf({ metro: 'Phoenix' }), 'US West');
  assert.equal(regionOf({ metro: 'Frankfurt' }), 'International');
  assert.equal(regionOf({ metro: 'Various', name: 'Remote sites, East (1,640)' }), 'US East');
  assert.equal(regionOf({ metro: 'Various', name: 'Remote sites (212)' }), 'Nationwide');
});

test('regions come in a fixed order, and only the ones an estate has', () => {
  assert.deepEqual(regionRows(D.ESTATES.mature).map(r => r.name), ['US East', 'US Central', 'US West', 'International', 'Nationwide']);
  assert.deepEqual(regionRows(D.ESTATES.small).map(r => r.name), ['US Central']);
});

test('every site lands in exactly one region', () => {
  for (const k of ['small', 'partial', 'mature', 'trust']) {
    const rows = regionRows(D.ESTATES[k]);
    const placed = rows.flatMap(r => r.sites.map(s => s.name)).sort();
    assert.deepEqual(placed, D.ESTATES[k].sites.map(s => s.name).sort(), k);
  }
});

test('a region fans into one pattern per distinct path', () => {
  const west = regionRows(D.ESTATES.mature).find(r => r.name === 'US West');
  assert.deepEqual(west.patterns.map(p => p.key), ['att', 'third>att', 'third>third']);
  const lumen = west.patterns.find(p => p.key === 'third>third');
  assert.equal(lumen.via, 'us-west-2', 'the Lumen end-to-end pattern lost the region it reaches');
});

test('a region with a public site carries a public pattern', () => {
  const intl = regionRows(D.ESTATES.mature).find(r => r.name === 'International');
  assert.deepEqual(intl.patterns.map(p => p.key), ['att', 'public']);
});

test('a region card counts every site in it, rollups included', () => {
  const nat = regionRows(D.ESTATES.mature).find(r => r.name === 'Nationwide');
  assert.equal(nat.count, 212 + 1, 'Remote sites (212) and Field (wireless)');
});

// A drill below a region fell back to the root when the chosen row's key did not
// resolve, so the region card reappeared and was appended to the trail again.
test('drilling past a region never shows the region again', async () => {
  const { vals } = await import('../naas-app.js');
  const { mkC } = await import('./harness.mjs');
  globalThis.window = globalThis.window || { scrollTo: () => {}, scrollY: 0 };
  for (const view of ['trust', 'mature', 'partial']) {
    const c = mkC({ view, estateParam: null });
    let v = vals(c);
    for (let depth = 0; depth < 3; depth++) {
      const row = v.heroSites.find(x => !x.ghost && !x.leaf && !x.more);
      if (!row) break;
      row.click();
      v = vals(c);
      const regionsSeen = c.state.drill.filter(k => String(k).startsWith('region:')).length;
      assert.equal(regionsSeen, 1, `${view}: the trail holds ${regionsSeen} region hops: ${c.state.drill.join(' > ')}`);
    }
  }
});
