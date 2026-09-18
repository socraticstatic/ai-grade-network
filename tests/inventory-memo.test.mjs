import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { inventory } from '../naas-addendum.js';
import { applyScope } from '../naas-round2.js';
import { vals } from '../naas-app.js';
import { mkC as mkCBase } from './harness.mjs';

const est = D.ESTATES.trust;

// Shared harness (tests/harness.mjs): vals() closes over c/s/set, so it is
// driven by a fake `c` built from defaults(), with tab: 'cost' in place of
// the shared default's connect.
const mkC = (extra = {}) => mkCBase(extra, { tab: 'cost' });

// R2 - the cache keys on est.id (raw, no fallback - the base always throws
// on a falsy estate and the memo now matches it, per M3). Two estates
// sharing a region signature under an empty/missing id would collide and
// silently share a tree, so every estate in D.ESTATES must carry a
// distinct, non-empty id.
test('every estate has a distinct, non-empty id', () => {
  const ids = Object.values(D.ESTATES).map(e => e.id);
  for (const id of ids) assert.ok(id, `estate id must be non-empty, got ${JSON.stringify(id)}`);
  assert.equal(new Set(ids).size, ids.length, 'estate ids must be distinct');
});

test('the same estate shape rebuilds nothing', () => {
  const a = inventory({ ...est });
  const b = inventory({ ...est });
  assert.equal(a, b, 'two renders of one estate must share one tree');
  assert.equal(inventory(est), a);
});

test('a landed region is a different estate', () => {
  // us-west-2 is the first region trust has NOT attached. Landing it is what
  // `naas-app.js:132` does on every render after the user attaches, and it has
  // to miss the cache. Flipping an already-private region proves nothing:
  // trust's regionsList[1] is us-east-2, which is private already.
  const landed = { ...est, regionsList: est.regionsList.map(r => r.region === 'us-west-2' ? { ...r, priv: true, ramp: r.ramp || 'NetBond', rel: 'ok', landed: true } : r) };
  assert.notEqual(inventory(landed), inventory(est));
  assert.equal(inventory(landed), inventory({ ...landed }));
});

test('a facet filter is a different estate', () => {
  const few = { ...est, regionsList: est.regionsList.slice(0, 2) };
  const tree = inventory(few);
  assert.equal(tree.flatMap(c => c.regions).length, 2);
  assert.notEqual(tree, inventory(est));
});

test('two estates never share a tree', () => {
  assert.notEqual(inventory(D.ESTATES.partial), inventory(D.ESTATES.mature));
});

// R1 - a same-id rewrite of a field the key does not carry (`link`, which
// `region()` never reads) must still hit the cache and return the same tree,
// because the two estates have identical region signatures.
test('a same-id field the tree never reads shares the cached tree', () => {
  const relabeled = { ...est, regionsList: est.regionsList.map(r => r.region === 'us-east-1' ? { ...r, link: 'degraded' } : r) };
  assert.equal(inventory(relabeled), inventory(est));
});

// Fix round 1, Critical (C1b) - `naas-round2.js`'s `applyScope` rewrites
// `est.sites` under the same `est.id` for a `site:` scope. Two of mature's
// first four site scopes (`scopes()` only offers the first four non-rollup
// sites) are Ashburn DC and San Jose DC, both `priv: true`, so their
// region-signature filter (`r.priv || i % 2 === 0`) is byte-identical - the
// only thing that tells them apart is `sites`, which is why the key needs a
// sites signature and not just the region list.
//
// Fix round 1 re-review (M1): a "scoped vs whole estate" test is vacuous -
// `applyScope('site:…')` on mature also drops a region (the non-priv one),
// so the region signature already differs and the test passes even with the
// defect present. The only test that actually exercises the defect is one
// that compares two *different* site scopes with the *same* region
// signature against each other, and - critically - has already cached one
// of them before asking for the other, so a key that omits `sites` would
// serve the wrong (already-cached) tree.
const matureEst = D.ESTATES.mature;
const circuitSites = (tree) => { const names = new Set(); tree.forEach(cl => cl.regions.forEach(r => r.vpcs.forEach(v => (v.gws || []).forEach(g => (g.circuits || []).forEach(cx => names.add(cx.site)))))); return names; };

test('a site-scoped tree only ever names that one site on its circuits', () => {
  // Prime the cache with San Jose's build first. Ashburn and San Jose share
  // a region signature (both priv:true), so a key that omits `sites` would
  // now serve San Jose's cached tree back for Ashburn's request below.
  inventory(applyScope(matureEst, 'site:San Jose DC'));
  const scoped = applyScope(matureEst, 'site:Ashburn DC');
  assert.deepEqual([...circuitSites(inventory(scoped))], ['Ashburn DC']);
});

test('two different site scopes on one estate id yield two different trees', () => {
  const ashburn = applyScope(matureEst, 'site:Ashburn DC');
  const sanJose = applyScope(matureEst, 'site:San Jose DC');
  assert.notEqual(inventory(ashburn), inventory(sanJose));
  assert.deepEqual([...circuitSites(inventory(ashburn))], ['Ashburn DC']);
  assert.deepEqual([...circuitSites(inventory(sanJose))], ['San Jose DC']);
});

// Fix round 1 re-review, Important (I1/I2) - C1a made `costVals` take
// `vals()`'s own `inv`, which is facet-filtered but not scope-filtered;
// the base built its charge-row tree the other way round (scope-filtered,
// never facet-filtered). Two live regressions on the Cost card followed:
// every `cloud:` (and, structurally, any scope that actually drops a
// region) scope showed the WHOLE estate's VPC counts instead of the scoped
// ones, and a Discover facet chip moved the card at all, which the base
// never allowed. Fixed by handing `costVals` the unscoped, unfiltered tree
// and intersecting it down to the scoped estate's own region list inside
// the function (`naas-app.js:1814-1836`).
test('a cloud scope on Cost reads the scoped charge rows, not the whole estate\'s', () => {
  const v = vals(mkC({ view: 'mature', obScope: 'cloud:AWS' }));
  assert.equal(v.attTotalF, '$13,800', 'AWS-only VPC counts (3/3/3), not mature\'s whole 7/7/7');
  assert.equal(v.attNetF, '+$47,600');
});

test('a Discover facet chip never moves the Cost card', () => {
  const withChip = vals(mkC({ view: 'mature', obScope: 'all', chips: ['NetBond'] }));
  const withoutChip = vals(mkC({ view: 'mature', obScope: 'all', chips: [] }));
  assert.equal(withChip.attTotalF, withoutChip.attTotalF);
  assert.equal(withChip.attNetF, withoutChip.attNetF);
});
