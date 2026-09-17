import test from 'node:test';
import assert from 'node:assert/strict';
import { hashRoute, connectStat } from '../naas-app.js';
import * as D from '../naas-data.js';

test('the hash resolves to a screen patch', () => {
  assert.deepEqual(hashRoute('#s1'), { screen: 's1' });
  assert.deepEqual(hashRoute('#s3/cloud/observe'), { screen: 's3', layer: 'cloud', tab: 'observe' });
});

test('an unroutable hash produces an empty patch, so nothing is set', () => {
  assert.deepEqual(hashRoute(''), {});
  assert.deepEqual(hashRoute('#nonsense'), {});
  assert.deepEqual(hashRoute('#s3/nonsense/nonsense'), { screen: 's3' });
});

// The connect tab's stat line counted cloud regions no matter which layer was
// selected, while the verdict above it went layer-aware and started counting
// sites. Adjacent lines, two subjects: naas-verdicts.js connectVerdict() covers
// the site count; this covers the stat staying silent instead of contradicting it.
test('the connect stat only speaks for the cloud layer; other layers stay silent', () => {
  const est = D.ESTATES.mature;
  const cloudStat = connectStat(est, 'cloud');
  assert.equal(cloudStat, `${est.regionsList.filter(r => !r.priv).length} of ${est.regionsList.length} regions public · ${est.attachedRegions} attached · ${(est.sitesCount || est.sites.length).toLocaleString('en-US')} sites`);
  for (const layer of ['net', 'ai', 'transport']) {
    assert.equal(connectStat(est, layer), '', `${layer} must not print a regions/attached count that the verdict above it does not agree with`);
  }
});
