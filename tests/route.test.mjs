import test from 'node:test';
import assert from 'node:assert/strict';
import { hashRoute } from '../naas-app.js';

test('the hash resolves to a screen patch', () => {
  assert.deepEqual(hashRoute('#s1'), { screen: 's1' });
  assert.deepEqual(hashRoute('#s3/cloud/observe'), { screen: 's3', layer: 'cloud', tab: 'observe' });
});

test('an unroutable hash produces an empty patch, so nothing is set', () => {
  assert.deepEqual(hashRoute(''), {});
  assert.deepEqual(hashRoute('#nonsense'), {});
  assert.deepEqual(hashRoute('#s3/nonsense/nonsense'), { screen: 's3' });
});
