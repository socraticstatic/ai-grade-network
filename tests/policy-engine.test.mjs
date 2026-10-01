import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTATES } from '../naas-data.js';
import { BETWEEN_TEMPLATES, resolveTemplate, evalPolicies } from '../naas-policy-layers.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The policy engine and its templates (Micah, 2026-10-01: "i want a policy engine, and policy templates").
const est = ESTATES.partial;

test('five between-asset templates resolve to this estate\'s own assets', () => {
  assert.equal(BETWEEN_TEMPLATES.length, 5);
  const t = resolveTemplate(est, BETWEEN_TEMPLATES[0]);
  assert.equal(t.match, 'Private cloud · Equinix DC2, Ashburn');
  assert.match(t.scope, /^(AWS|Azure|GCP) /);
  assert.ok(t.path.includes('Never the internet') && t.path.includes('NGFW inline'));
  for (const b of BETWEEN_TEMPLATES) { const r = resolveTemplate(est, b); assert.ok(r.match && r.scope, b.name); }
});

test('the engine orders by precedence, compiles per connection, and finds a conflict', () => {
  const pc = 'Private cloud · Equinix DC2, Ashburn', reg = est.regionsList.find(r => !r.priv);
  const pols = [
    { name: 'Any PCI', match: 'tag PCI', scope: 'any cloud', req: 'Private path required', state: 'enforced' },
    { name: 'Pair A', match: pc, scope: `${reg.cloud} ${reg.region}`, req: '', path: ['Via the AT&T network'], route: { 'deny:matching-routes': { o2p: true, p2o: false } }, state: 'enforced' },
    { name: 'Pair B', match: pc, scope: `${reg.cloud} ${reg.region}`, req: '', path: [], route: { 'allow:matching-routes': { o2p: true, p2o: false } }, state: 'simulated' },
  ];
  const e = evalPolicies(est, pols);
  assert.deepEqual(e.ordered.map(p => p.name), ['Pair A', 'Pair B', 'Any PCI']);
  const conn = e.connections.find(c => c.region === reg.region);
  assert.ok(conn.rules.some(r => /Deny matching routes \(on premise → partner\)/.test(r.text)));
  assert.equal(e.conflicts.length, 1);
  assert.match(e.conflicts[0].text, /Pair A denies and Pair B allows matching routes, on premise → partner/);
  assert.match(e.summary, /^3 policies · 1 connection · \d+ rules pushed · 1 conflict$/);
});

test('Govern has a Policy engine tab and the templates switch', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'engine' });
  const v = vals(c);
  assert.ok(v.govPanels.some(p => p.label === 'Policy engine' && p.on));
  assert.ok(v.engineSummary);
  const t = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'templates' }));
  assert.equal(t.examplePolicies.length, 5);
  t.examplePolicies[0].go();
});
