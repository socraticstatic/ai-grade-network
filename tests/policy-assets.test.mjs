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

import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import { ROUTE_RULES } from '../naas-policy-layers.js';
const gov = (au) => mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'policies', authoring: au });

test('step 2: the composer names a private cloud on one side and a cloud region on the other', () => {
  const v = vals(gov({ match: null, scope: null, req: [] }));
  assert.ok(v.aMatch.some(c => c.label === 'Private cloud · Equinix DC2, Ashburn'));
  assert.ok(v.aScope.some(c => c.label === 'AWS us-east-1'));
});

test('step 2: route rules follow NetBond Advanced, direction by direction, and ride the policy', () => {
  assert.equal(ROUTE_RULES.find(r => r.id === 'block-default-routes').p2o, false);
  assert.equal(ROUTE_RULES.find(r => r.id === 'community-value-filter-att').o2p, false);
  const c = gov({ match: 'Private cloud · Equinix DC2, Ashburn', scope: 'AWS us-east-1', req: ['Private path required'], tab: 'route' });
  const v = vals(c);
  const rule = v.aRoute.flatMap(sec => sec.rules).find(r => r.id === 'matching-routes' && r.section === 'deny');
  rule.o2pGo();
  assert.deepEqual(c.state.authoring.route['deny:matching-routes'], { o2p: true, p2o: false });
  assert.match(vals(c).aSent.route, /deny matching routes \(on premise → partner\)/i);
  vals(c).aSimulate();
  assert.deepEqual(c.state.customPolicies.at(-1).route['deny:matching-routes'], { o2p: true, p2o: false });
});
