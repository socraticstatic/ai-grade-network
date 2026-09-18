import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import { siteDrillRows } from '../naas-connections.js';

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
