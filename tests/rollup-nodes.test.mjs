import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import * as A from '../naas-addendum.js';
import { siteDrillRows, regionDrillRows } from '../naas-connections.js';
import { heroLayout } from '../naas-logic.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

const est = D.ESTATES.trust;
const rowNamed = (n) => est.sites.find(x => x.name === n);

test('every rolled-up canvas row has its own key', () => {
  assert.equal(S.rollupKeyOf(est, rowNamed('Regional hubs (24)')), 'Branch#0');
  assert.equal(S.rollupKeyOf(est, rowNamed('Remote sites, East (1,640)')), 'Branch#1');
  assert.equal(S.rollupKeyOf(est, rowNamed('Remote sites, Central (1,210)')), 'Branch#2');
  assert.equal(S.rollupKeyOf(est, rowNamed('Remote sites, West (1,180)')), 'Branch#3');
  assert.equal(S.rollupKeyOf(est, rowNamed('Data centers (6)')), 'Data center#0');
});

test('the count a user clicks is the count they land on', () => {
  const east = siteDrillRows(est, ['Branch#1']);
  const total = east.rows.reduce((a, r) => a + parseInt(r.name.replace(/.*\(([\d,]+)\).*/, '$1').replace(/,/g, ''), 10), 0);
  assert.equal(total, 1640);
  assert.equal(east.label, 'Remote sites, East');
  const cls = siteDrillRows(est, ['Branch']);
  assert.equal(cls.rows.length, 19);
  assert.equal(east.rows.length, 6);
});

test('a group trail still drills through to sites', () => {
  const east = siteDrillRows(est, ['Branch#1']);
  const first = east.rows[0];
  const sites = siteDrillRows(est, ['Branch#1', first.drillKey]);
  assert.equal(sites.level, 'site');
  assert.ok(sites.rows.length > 1);
});

// ---- Task 11 ----

test('the climb row stops looking like an overflow row', () => {
  const inv = A.inventory(est);
  const rows = regionDrillRows(est, inv, ['us-east-1']).rows;
  const climb = rows.find(r => r.other);
  assert.equal(climb.region, 'Back to 6 regions');
  assert.equal(climb.toRoot, true);
  assert.ok(!/\+/.test(climb.region), 'no plus sign: it climbs, it does not overflow');
});

// Ruling override: the brief routed +8 regions to openLevel('clouds'), but the
// drawer it would open holds only the 6 regions with real data behind them -
// the same 6 the header door already opens. A row promising 8 and opening 6
// is a lie, so this row is retitled to the app's own vocabulary (the verdict
// and overflowRow already say "N smaller regions rolled up") and made inert.
test('the +N regions row reads the app vocabulary, muted, no promise of a door', () => {
  const L = heroLayout(est, {});
  const more = L.regions.find(r => r.key === 'more');
  assert.equal(more.region, '8 smaller regions rolled up');
  assert.equal(more.muted, true);
  assert.ok(!/\+/.test(more.region), 'no plus sign: it rolls up, it does not overflow');
});

// The header door's `hidden` arithmetic (Task 9) already excludes rollup rows
// from `shown`, so retitling the rollup row's label must not move the count
// the header prints. If this goes red, the retitle leaked into the door.
test('the retitled +N regions row does not move the clouds header count', () => {
  assert.equal(vals(mkC()).cloudsDoor.label, 'All 6 regions ›');
});

// ---- Task 11, fix round 1 (review Finding 4): pin the ruling's three visible
// properties and both new click routes through vals(), not just heroLayout's
// row shape. The two assertions below on `caret` and the post-click state are
// what actually goes RED if a later pass restores the brief's Step 5
// (`if (r.rollup) { openLevel('clouds'); return; }` plus `r.rollup ? '›' : ''`
// on the caret): restoring that gives the row a `›` caret and makes its click
// open the clouds drawer, so both assertions fail. `color` alone would not
// have caught it - Step 5 never touches color.
test('the muted +N regions row is fully inert: disabled ink, no caret, dead click', () => {
  const c = mkC();
  const v = vals(c);
  const more = v.heroRegions.find(r => r.key === 'more');
  assert.ok(more, 'the muted rollup row must be present at the clouds root');
  assert.equal(more.color, 'var(--text-disabled)');
  assert.equal(more.caret, '', 'a promised door needs a caret; this row promises nothing');
  const before = JSON.stringify(c.state);
  more.click();
  assert.equal(JSON.stringify(c.state), before, 'clicking the muted row must not change state at all');
});

test('the metro +N more row opens the sites level list, not the old volume shortcut', () => {
  const c = mkC({ drill: ['Branch'] });
  const v = vals(c);
  const more = v.heroSites.find(s => s.more);
  assert.ok(more, 'the class-level overflow row must be present at drill: ["Branch"]');
  more.click();
  assert.deepEqual(c.state.vol, { kind: 'level', col: 'sites' });
  assert.equal(c.state.drawerOpen, true);
});

test('openBandLevel opens the drawer at the fabric level', () => {
  const c = mkC({ fabDrill: ['fab', 'N. Virginia'] });
  const v = vals(c);
  v.openBandLevel();
  assert.deepEqual(c.state.vol, { kind: 'level', col: 'fabric' });
  assert.equal(c.state.drawerOpen, true);
});
