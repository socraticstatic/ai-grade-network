import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { inventory } from '../naas-addendum.js';

const est = D.ESTATES.trust;

// R2 — the cache keys on est.id with `|| ''` as a fallback for a missing id.
// Two estates sharing a region signature under an empty/missing id would
// collide and silently share a tree, so every estate in D.ESTATES must carry
// a distinct, non-empty id.
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

// R1 — a same-id rewrite of a field the key does not carry (`link`, which
// `region()` never reads) must still hit the cache and return the same tree,
// because the two estates have identical region signatures.
test('a same-id field the tree never reads shares the cached tree', () => {
  const relabeled = { ...est, regionsList: est.regionsList.map(r => r.region === 'us-east-1' ? { ...r, link: 'degraded' } : r) };
  assert.equal(inventory(relabeled), inventory(est));
});
