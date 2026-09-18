import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import { siteDrillRows } from '../naas-connections.js';
import { metroOf } from '../naas-volume.js';

const est = D.ESTATES.trust;

test('the metro drill key is unique among siblings', () => {
  const rows = siteDrillRows(est, ['Branch']).rows;
  const keys = rows.map(r => r.drillKey);
  assert.equal(new Set(keys).size, keys.length, 'duplicate drillKey among 19 metros');
  assert.equal(new Set(rows.map(r => r.key)).size, rows.length, 'duplicate React key');
  assert.ok(keys.includes('Branch:2:Chicago'));
  assert.ok(keys.includes('Branch:1:Chicago'));
});

test('two metros of the same name resolve to different nodes', () => {
  const byKey = siteDrillRows(est, ['Branch', 'Branch:2:Chicago']);
  const byName = siteDrillRows(est, ['Branch', 'Chicago']);
  assert.match(byKey.rows.at(-1).name, /\+428 more/);   // the 434-site node
  assert.match(byName.rows.at(-1).name, /\+337 more/);  // the 343-site node
});

test('metroOf accepts a key and still accepts a name', () => {
  assert.equal(metroOf(est, 'Branch', 'Branch:2:Chicago').count, 434);
  assert.equal(metroOf(est, 'Branch', 'Chicago').count, 343);
  assert.equal(metroOf(est, 'Branch', 'Nowhere'), null);
});

test('labelOfKey never prints a key on screen', () => {
  assert.equal(S.labelOfKey(est, 'Branch:2:Chicago'), 'Chicago');
  assert.equal(S.labelOfKey(est, 'Branch'), 'Remote sites');
  assert.equal(S.labelOfKey(est, 'Data center:Dallas DC1'), 'Dallas DC1');
});
