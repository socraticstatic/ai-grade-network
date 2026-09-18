import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as S from '../naas-sites.js';
import * as C from '../naas-connections.js';
import { levelHead } from '../naas-volume.js';

const est = D.ESTATES.trust;
const inv = A.inventory(est);
const ob = A.observe(est, [], inv);
const head = (col, trail) => levelHead(est, inv, ob, col, trail);

test('the sites column counts what the drawer will hold', () => {
  assert.deepEqual(pick(head('sites', [])), { total: 7, noun: 'site groups' });
  assert.deepEqual(pick(head('sites', ['Branch'])), { total: 19, noun: 'metros' });
  assert.deepEqual(pick(head('sites', ['Branch#1'])), { total: 6, noun: 'metros' });
  assert.deepEqual(pick(head('sites', ['Branch', 'Branch:1:Atlanta'])), { total: 588, noun: 'remote sites' });
  const site = head('sites', ['Branch', 'Branch:1:Atlanta', 'RS-ATL-0100']);
  assert.equal(site.noun, 'paths');
});

test('the fabric column counts facilities, ports and circuits', () => {
  assert.deepEqual(pick(head('fabric', [])), { total: 4, noun: 'facilities' });
  assert.deepEqual(pick(head('fabric', ['fab'])), { total: 4, noun: 'facilities' });
  assert.deepEqual(pick(head('fabric', ['fab', 'N. Virginia'])), { total: 21, noun: 'ports' });
  const p = head('fabric', ['fab', 'N. Virginia']);
  assert.deepEqual(pick(head('fabric', ['fab', 'N. Virginia', 'port:us-east-1:1'])), { total: 3, noun: 'circuits' });
  assert.ok(p.trail.length === 2);
});

test('the clouds column never claims regions it does not have', () => {
  assert.deepEqual(pick(head('clouds', [])), { total: 6, noun: 'regions' });
  assert.deepEqual(pick(head('clouds', ['us-east-1'])), { total: 3, noun: 'VPCs' });
  assert.deepEqual(pick(head('clouds', ['us-east-1', 'vpc-0-0'])), { total: 6, noun: 'subnets' });
  assert.deepEqual(pick(head('clouds', ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0'])), { total: 60, noun: 'workloads' });
});

test('partial proves depth is not level', () => {
  const p = D.ESTATES.partial;
  const pinv = A.inventory(p);
  const pob = A.observe(p, [], pinv);
  assert.equal(levelHead(p, pinv, pob, 'sites', ['Data center']).level, 'site');
  assert.equal(levelHead(p, pinv, pob, 'sites', ['Branch']).level, 'metro');
});

// ---------- Conservation: the door's number is never bigger or smaller than
// what is actually behind it. Every figure below was measured with a real
// node run against `trust`, not derived from the function under test — see
// task-3-report.md for the run that produced them.

/** Drill a rollup group ('<cls>#<ri>') all the way to its individual sites and sum them. */
function siteCountOfGroup(key) {
  const info = C.siteDrillRows(est, [key]);
  const rows = (info ? info.rows : []).filter(r => !r.more);
  return rows.reduce((sum, r) => sum + head('sites', [key, r.drillKey]).total, 0);
}

test('sites: the root conserves — every group, drilled to its sites, sums to sitesCount', () => {
  assert.equal(est.sitesCount, 4120);
  const keys = est.sites.map(s => S.rollupKeyOf(est, s));
  assert.deepEqual(keys, ['Data center#0', 'Branch#0', 'Branch#1', 'Branch#2', 'Branch#3', 'Edge#0', 'Campus#0']);
  const grandTotal = keys.reduce((sum, key) => sum + siteCountOfGroup(key), 0);
  assert.equal(grandTotal, 4120);
});

test('sites: one level down, Branch#1 (Remote sites, East) conserves the same way', () => {
  assert.deepEqual(pick(head('sites', ['Branch#1'])), { total: 6, noun: 'metros' });
  assert.equal(siteCountOfGroup('Branch#1'), 1640);
});

test('clouds: the root reports the 6 regions with data behind them, never the +8 with none', () => {
  const h = head('clouds', []);
  assert.equal(h.total, 6);
  assert.equal(est.regionsList.length, 6);
  assert.equal(est.regionsExtra, 8);
  assert.notEqual(h.total, est.regionsList.length + est.regionsExtra);
});

test('fabric: a facility reports every port, not the 8-row band cap', () => {
  const h = head('fabric', ['fab', 'N. Virginia']);
  assert.equal(h.total, 21);
  assert.notEqual(h.total, 8);
});

function pick(h) { return { total: h.total, noun: h.noun }; }
