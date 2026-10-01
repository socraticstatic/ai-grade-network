import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTATES } from '../naas-data.js';
import { privateCloudOf, policyAssets } from '../naas-sites.js';

// Policies between two assets (docs/superpowers/specs/2026-10-01-between-assets-policy.md), step 1:
// a data center can be a private cloud at a colo, and a policy can name any asset on either side.
test('Growing\'s Ashburn DC is a private cloud at Equinix DC2', () => {
  const st = ESTATES.partial.sites.find(x => x.name === 'Ashburn DC');
  assert.deepEqual(privateCloudOf(st), { provider: 'Equinix', facility: 'DC2', metro: 'Ashburn', label: 'Private cloud · Equinix DC2, Ashburn' });
  assert.equal(privateCloudOf(ESTATES.partial.sites.find(x => x.name === 'Dallas DC')), null);
});

test('a policy can name a private cloud, a site, a region, a tag or a business unit', () => {
  const a = policyAssets(ESTATES.partial);
  const kinds = new Set(a.map(x => x.kind));
  for (const k of ['private-cloud', 'site', 'region']) assert.ok(kinds.has(k), k);
  assert.ok(a.some(x => x.kind === 'private-cloud' && x.label === 'Private cloud · Equinix DC2, Ashburn'));
  assert.ok(a.some(x => x.kind === 'region' && x.label === 'AWS us-east-1'));
  assert.equal(new Set(a.map(x => x.key)).size, a.length, 'keys are unique');
});
