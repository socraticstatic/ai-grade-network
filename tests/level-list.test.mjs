import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { levelList, levelHead } from '../naas-volume.js';

const est = D.ESTATES.trust;
const inv = A.inventory(est);
const ob = A.observe(est, [], inv);
const list = (col, trail, opts) => levelList(est, inv, ob, col, trail, opts);

test('the sites root lists every group, each a door', () => {
  const lv = list('sites', []);
  assert.equal(lv.rows.length, 7);
  assert.equal(lv.total, 7);
  assert.ok(lv.rows.every(r => r.into), 'every group row is a door');
  assert.equal(lv.rows.find(r => /East/.test(r.id)).into, 'Branch#1');
});

test('a class lists all 19 metros, not the canvas six', () => {
  const lv = list('sites', ['Branch']);
  assert.equal(lv.rows.length, 19);
  assert.ok(lv.rows.every(r => r.into && r.into.startsWith('Branch:')));
  assert.ok(!lv.rows.some(r => /more/.test(r.id)), 'the overflow row is never a drawer row');
});

test('a metro delegates to volumeList and pages', () => {
  const lv = list('sites', ['Branch', 'Branch:1:Atlanta']);
  assert.equal(lv.total, 588);
  assert.equal(lv.shownCount, 60);
  assert.ok(lv.hasMore);
  assert.ok(lv.rows.every(r => !r.into), 'a site is an asset, not a door');
  assert.equal(list('sites', ['Branch', 'Branch:1:Atlanta'], { page: 2 }).shownCount, 120);
});

test('a group node lists only its own metros', () => {
  const lv = list('sites', ['Branch#1']);
  assert.equal(lv.rows.length, 6);
  assert.equal(lv.title, 'Remote sites, East');
});

test('the header count is the drawer count, at every sites level', () => {
  for (const trail of [[], ['Branch'], ['Branch#1'], ['Branch', 'Branch:1:Atlanta']]) {
    assert.equal(list('sites', trail).total, levelHead(est, inv, ob, 'sites', trail).total, JSON.stringify(trail));
  }
});

test('the drawer trail is the column trail plus its root', () => {
  assert.deepEqual(list('sites', ['Branch', 'Branch:1:Atlanta']).trail, ['Sites', 'Remote sites', 'Atlanta']);
});

// The "count cannot lie" invariant: the full row set (unpaged, so a size big
// enough that nothing is cut) must be exactly as long as the number the
// header already promised, at every sites level, not just root and metro.
test('rows.length before paging equals levelHead.total, at every sites level', () => {
  for (const trail of [[], ['Branch'], ['Branch#1'], ['Branch', 'Branch:1:Atlanta']]) {
    const unpaged = list('sites', trail, { size: 10000 });
    assert.equal(unpaged.hasMore, false, `${JSON.stringify(trail)} still had more after a page big enough for all of it`);
    assert.equal(unpaged.rows.length, levelHead(est, inv, ob, 'sites', trail).total, JSON.stringify(trail));
  }
});
