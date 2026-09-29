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

// ---- a site's carrier survives every level of the drill ----
// Found 2026-09-23: drilling into Denver fell back to the regions (siteTree
// dropped named sites from any class that also held a rollup), and drilling into
// Phoenix drew six Lumen-onto-AT&T paths labelled "AT&T network" (siteTree dropped
// core/via, and pathsOfSite read privacy off the cloud region, not the path).

test('a named site survives beside a rollup of the same class', async () => {
  const S = await import('../naas-sites.js');
  const branch = S.siteTree(D.ESTATES.mature).find(c => c.cls === 'Branch');
  assert.ok(branch.children.some(ch => ch.name === 'Denver branch'), 'Denver was dropped because Branch also holds Remote sites (212)');
  assert.ok(branch.children.some(ch => ch.kind === 'metro'), 'the Remote sites rollup was lost instead');
});

test('the facts that make a site third party survive the site tree', async () => {
  const P = await import('../naas-paths.js');
  const phoenix = P.allSites(D.ESTATES.mature).find(x => x.name === 'Phoenix DC');
  assert.equal(phoenix.core, 'third');
  assert.equal(phoenix.via, 'us-west-2');
  assert.equal(phoenix.viaRamp, 'Lumen');
});

// The site side drills by place and never turns into clouds (Micah, 2026-09-29:
// "when you drill down, you get to clouds ... regions to states then to metros then to sites").
test('drilling to Denver shows Denver, not the regions, and never a cloud', async () => {
  const C = await import('../naas-connections.js');
  const r = C.siteDrillRows(D.ESTATES.mature, ['region:US West', 'state:CO', 'metro:Denver']);
  assert.ok(r, 'the drill returned nothing, so the picture fell back to the regions');
  assert.equal(r.level, 'site');
  const den = r.rows.find(x => x.name === 'Denver branch');
  assert.ok(den, r.rows.map(x => x.name).join(', '));
  assert.equal(den.accessSla, 'att', 'Denver forgot that AT&T answers for its off-net circuit');
  const next = C.siteDrillRows(D.ESTATES.mature, ['region:US West', 'state:CO', 'metro:Denver', 'site:Denver branch']);
  assert.equal(next.level, 'service');
  assert.ok(next.rows.every(x => !/^(AWS|Azure|GCP|Google|Oracle)\b/.test(x.name)), 'a site opened into clouds');
});

test('Phoenix, at the site level, still rides Lumen end to end and never says AT&T', async () => {
  const C = await import('../naas-connections.js');
  const r = C.siteDrillRows(D.ESTATES.mature, ['region:US West', 'state:AZ', 'metro:Phoenix']);
  const row = r.rows.find(x => x.name === 'Phoenix DC');
  assert.ok(row);
  assert.equal(row.core, 'third');
  assert.equal(row.via, 'us-west-2');
  assert.doesNotMatch(row.access, /AT&T/, 'a Lumen end-to-end path is labelled AT&T');
});

test('at no depth, on no estate, does the site column hold a cloud', async () => {
  const C = await import('../naas-connections.js');
  const cloud = /^(AWS|Azure|GCP|Google|Oracle|OCI|CoreWeave)\b|^→/;
  for (const id of ['partial', 'mature', 'trust', 'small']) {
    const est = D.ESTATES[id];
    const walk = (trail, depth) => {
      const r = C.siteDrillRows(est, trail);
      if (!r || depth > 5) return;
      for (const row of r.rows) {
        assert.ok(!cloud.test(row.name), `${id} ${trail.join(' › ')}: ${row.name}`);
        if (row.drillKey && !row.leaf && !row.more) walk([...trail, row.drillKey], depth + 1);
      }
    };
    for (const reg of regionRows(est)) walk(['region:' + reg.name], 1);
  }
});
