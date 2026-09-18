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

test('the fabric column opens facilities, ports and circuits', () => {
  assert.equal(list('fabric', []).rows.length, 4);
  assert.equal(list('fabric', ['fab']).rows[0].into, 'N. Virginia');
  const ports = list('fabric', ['fab', 'N. Virginia']);
  assert.equal(ports.rows.length, 21, 'all 21 ports, not the band eight');
  assert.ok(ports.rows.every(r => r.into && r.into.startsWith('port:')));
  const cx = list('fabric', ['fab', 'N. Virginia', 'port:us-east-1:1']);
  assert.equal(cx.rows.length, 3);
  assert.ok(cx.rows.every(r => !r.into), 'a circuit is a leaf');
});

test('the clouds root lists the regions it actually has', () => {
  const lv = list('clouds', []);
  assert.equal(lv.rows.length, 6);
  assert.equal(lv.total, 6, 'never 14: regionsExtra is not in the drawer');
  assert.equal(lv.rows[0].into, 'us-east-1');
});

test('a region lists its VPCs; a VPC delegates to workloadList', () => {
  const vpcs = list('clouds', ['us-east-1']);
  assert.equal(vpcs.rows.length, 3);
  assert.equal(vpcs.rows[0].into, 'vpc-0-0');
  const subnets = list('clouds', ['us-east-1', 'vpc-0-0']);
  assert.equal(subnets.rows.length, 6);
  assert.equal(subnets.rows[0].into, subnets.rows[0].snId);
  assert.ok(subnets.flatDoor, 'the flat door survives the delegation');
  const wl = list('clouds', ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0']);
  assert.equal(wl.total, 60);
  assert.ok(wl.rows.every(r => !r.into));
  // The crumb row is names, never ids: the trail carries `vpc-0-0`, the
  // header must read `vpc-prod-01`.
  assert.deepEqual(wl.trail, ['Clouds', 'AWS us-east-1', 'vpc-prod-01', 'public-a']);
  assert.deepEqual(list('clouds', []).trail, ['Clouds']);
});

test('the flat door skips the subnets without moving the column', () => {
  const flat = list('clouds', ['us-east-1', 'vpc-0-0'], { flat: true });
  assert.equal(flat.level, 'workload');
  assert.equal(flat.total, 447);
});

test('the header count is the drawer count, on every column', () => {
  const cases = [['fabric', []], ['fabric', ['fab', 'N. Virginia']], ['clouds', []], ['clouds', ['us-east-1']], ['clouds', ['us-east-1', 'vpc-0-0']]];
  for (const [col, trail] of cases) {
    assert.equal(list(col, trail).total, levelHead(est, inv, ob, col, trail).total, `${col} ${trail}`);
  }
});

// A caller that never seeds the literal 'fab' — exactly what a uniform
// trail-tracker does, building `[...trail, into]` from an empty root — must
// land on the same node as one that does. Unseeded and seeded trails are
// pinned side by side so neither drifts from the other.
test('an unseeded fabric trail reaches the same level as the seeded one', () => {
  const unseeded = levelHead(est, inv, ob, 'fabric', ['N. Virginia']);
  assert.equal(unseeded.level, 'port');
  assert.equal(unseeded.total, 21);
  const seeded = levelHead(est, inv, ob, 'fabric', ['fab', 'N. Virginia']);
  assert.deepEqual(unseeded, seeded);

  const unseededList = list('fabric', ['N. Virginia']);
  assert.equal(unseededList.rows.length, 21);
  assert.ok(unseededList.rows[0].into.startsWith('port:'));
  const seededList = list('fabric', ['fab', 'N. Virginia']);
  assert.deepEqual(unseededList, seededList);
});
