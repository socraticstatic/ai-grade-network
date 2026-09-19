import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { levelList, levelHead, workloadList, volumeList } from '../naas-volume.js';

const est = D.ESTATES.trust;
const inv = A.inventory(est);
const ob = A.observe(est, [], inv);
const list = (col, trail, opts) => levelList(est, inv, ob, col, trail, opts);

// ---------- Task 6 brief, Step 1, verbatim ----------

test('a level with a handful of rows shows no search and no chips', () => {
  assert.deepEqual(list('sites', []).caps, { search: false, chips: false, bulk: false });
  assert.deepEqual(list('clouds', ['us-east-1']).caps, { search: false, chips: false, bulk: false });
  assert.deepEqual(list('clouds', ['us-east-1', 'vpc-0-0']).caps, { search: false, chips: false, bulk: false });
  assert.deepEqual(list('fabric', []).caps, { search: false, chips: false, bulk: false });
});

test('a level at volume earns search, chips and bulk', () => {
  assert.deepEqual(list('sites', ['Branch']).caps, { search: true, chips: false, bulk: false });
  assert.deepEqual(list('sites', ['Branch', 'Branch:1:Atlanta']).caps, { search: true, chips: true, bulk: true });
  assert.deepEqual(list('fabric', ['fab', 'N. Virginia']).caps, { search: true, chips: false, bulk: false });
  assert.deepEqual(list('clouds', ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0']).caps, { search: true, chips: true, bulk: true });
});

test('the VPC level applies the filters it renders', () => {
  const scope = { region: 'us-east-1', vpcId: 'vpc-0-0' };
  const all = workloadList(est, inv, scope);
  assert.equal(all.rows.length, 6);
  assert.equal(workloadList(est, inv, scope, { q: 'public-a' }).rows.length, 1);
  const pub = workloadList(est, inv, scope, { state: 'exposed' });
  assert.ok(pub.rows.length < all.rows.length, 'the Exposed chip must filter the subnet list');
  assert.ok(pub.rows.every(r => r.state === 'public'));
});

// ---------- Required assertion (a): caps on every level of every column on
// `trust`, as a table. Every `rows`/`level` figure was measured with a real
// node run against `trust` (see task-6-report.md), not derived from the
// function under test.

const TABLE = [
  // col,      trail,                                                  level,      rows, caps
  ['sites',    [],                                                     'group',    7,    { search: false, chips: false, bulk: false }],
  ['sites',    ['Branch'],                                             'metro',    19,   { search: true,  chips: false, bulk: false }],
  ['sites',    ['Branch#1'],                                           'metro',    6,    { search: false, chips: false, bulk: false }],
  ['sites',    ['Branch', 'Branch:1:Atlanta'],                         'site',     60,   { search: true,  chips: true,  bulk: true }],
  ['sites',    ['Branch', 'Branch:1:Atlanta', 'RS-ATL-0594'],          'path',     6,    { search: false, chips: false, bulk: false }],
  ['fabric',   [],                                                     'facility', 4,    { search: false, chips: false, bulk: false }],
  ['fabric',   ['fab', 'N. Virginia'],                                 'port',     21,   { search: true,  chips: false, bulk: false }],
  ['fabric',   ['fab', 'N. Virginia', 'port:us-east-1:1'],             'circuit',  3,    { search: false, chips: false, bulk: false }],
  ['clouds',   [],                                                     'region',   6,    { search: false, chips: false, bulk: false }],
  ['clouds',   ['us-east-1'],                                          'vpc',      3,    { search: false, chips: false, bulk: false }],
  ['clouds',   ['us-east-1', 'vpc-0-0'],                                'subnet',   6,    { search: false, chips: false, bulk: false }],
  ['clouds',   ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0'],               'workload', 60,   { search: true,  chips: true,  bulk: true }],
];

test('caps table: every level of every column on trust', () => {
  for (const [col, trail, level, rows, caps] of TABLE) {
    const lv = list(col, trail);
    assert.equal(lv.level, level, `${col} ${JSON.stringify(trail)} level`);
    assert.equal(lv.rows.length, rows, `${col} ${JSON.stringify(trail)} rows`);
    assert.deepEqual(lv.caps, caps, `${col} ${JSON.stringify(trail)} caps`);
  }
});

// ---------- Required assertion (b): a level under 12 rows has all three caps
// false, regardless of whether the level could in principle support them.

test('every level under 12 rows is gated off, even the ones a real builder backs', () => {
  for (const [col, trail, , rows, caps] of TABLE) {
    if (rows < 12) {
      assert.deepEqual(caps, { search: false, chips: false, bulk: false }, `${col} ${JSON.stringify(trail)}`);
    } else {
      assert.ok(caps.search, `${col} ${JSON.stringify(trail)} should have earned search at ${rows} rows`);
    }
  }
});

// ---------- Required assertion (c): a frame()-built level over 12 rows has
// search true but chips and bulk false - frame() never applies chips, and
// Task 6 does not wire them in (that would be fixing frame(), out of scope).

test('a frame()-built level over 12 rows gets search only, never chips or bulk', () => {
  // sites Branch (19 metros) and fabric N. Virginia (21 ports) are both
  // frame()-built - neither delegates to volumeList/workloadList.
  assert.deepEqual(list('sites', ['Branch']).caps, { search: true, chips: false, bulk: false });
  assert.deepEqual(list('fabric', ['fab', 'N. Virginia']).caps, { search: true, chips: false, bulk: false });
});

// ---------- Required assertion (d): the VPC subnet level applies q and the
// state chip. q is pinned against a known subnet name; the state chip is
// exercised on the clouds vocabulary (`state: 'fabric' | 'public'` on each
// subnet row) via the `exposed` filter workloadList already used one level
// down, now reused here.

test('the VPC subnet level: q narrows to a pinned count', () => {
  const scope = { region: 'us-east-1', vpcId: 'vpc-0-0' };
  const byQuery = workloadList(est, inv, scope, { q: 'public-a' });
  assert.equal(byQuery.rows.length, 1);
  assert.equal(byQuery.rows[0].id, 'public-a');
});

test('the VPC subnet level: the state chip filters on the fabric|public vocabulary', () => {
  const scope = { region: 'us-east-1', vpcId: 'vpc-0-0' };
  const all = workloadList(est, inv, scope);
  assert.deepEqual(all.rows.map(r => r.state).sort(), ['fabric', 'fabric', 'fabric', 'public', 'public', 'public']);
  const attn = workloadList(est, inv, scope, { state: 'exposed' });
  assert.equal(attn.rows.length, 3);
  assert.ok(attn.rows.every(r => r.state === 'public'), 'every exposed subnet in this VPC is a public one');
});

// ---------- Required assertion (e): caps is on the direct volumeList and
// workloadList returns too, not only laundered through levelList.

test('volumeList carries caps directly, not only via sitesLevel', () => {
  const v = volumeList(est, { cls: 'Branch', metro: 'Branch:1:Atlanta' });
  assert.equal(v.counts.total, 588);
  assert.deepEqual(v.caps, { search: true, chips: true, bulk: true });
});

test('workloadList carries caps directly at both the subnet level and the workload level', () => {
  const subnetLevel = workloadList(est, inv, { region: 'us-east-1', vpcId: 'vpc-0-0' });
  assert.deepEqual(subnetLevel.caps, { search: false, chips: false, bulk: false }, 'only 6 subnets');
  const workloadLevel = workloadList(est, inv, { region: 'us-east-1', vpcId: 'vpc-0-0', snId: 'vpc-0-0-pub-0' });
  assert.deepEqual(workloadLevel.caps, { search: true, chips: true, bulk: true }, '60 workloads');
});

test('caps booleans are real booleans, never strings or objects', () => {
  const lv = list('clouds', ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0']);
  for (const key of ['search', 'chips', 'bulk']) {
    assert.equal(typeof lv.caps[key], 'boolean', key);
  }
});
