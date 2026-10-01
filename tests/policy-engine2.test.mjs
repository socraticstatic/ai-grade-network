import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTATES } from '../naas-data.js';
import { effectivePolicy, shadowedPolicies, intendedVsConfigured } from '../naas-policy-layers.js';

// A real policy engine (Micah, 2026-10-01: "not a real policy engine"): evaluate every policy against a flow,
// decide per layer by precedence, name the winner and what it overrode, find shadowed policies, diff intent and config.
const est = ESTATES.partial, pc = 'Private cloud · Equinix DC2, Ashburn';
const pub = est.regionsList.find(r => !r.priv), to = `${pub.cloud} ${pub.region}`;
const P = [
  { name: 'Prod no direct internet', match: 'tag Prod', scope: 'any cloud', req: 'No direct internet path', state: 'enforced' },
  { name: 'DC2 to cloud, inspected', match: pc, scope: to, req: '', path: ['Via the AT&T network', 'NGFW inline'], route: {}, state: 'simulated' },
  { name: 'DC2 deny', match: pc, scope: to, req: '', path: [], route: { 'deny:matching-routes': { o2p: true, p2o: false } }, state: 'simulated', priority: 1 },
  { name: 'Prod via AT&T, later', match: 'tag Prod', scope: 'any cloud', req: '', path: ['Via the AT&T network'], route: {}, state: 'enforced' },
];

test('a flow gets one decision, the winner, and what it overrode', () => {
  const e = effectivePolicy(est, P, { from: pc, to, tag: 'Prod' });
  assert.equal(e.verdict, 'Denied');
  assert.equal(e.decidedBy, 'DC2 deny');
  const t = Object.fromEntries(e.trace.map(x => [x.name, x.result]));
  assert.equal(t['DC2 deny'], 'Won');
  assert.match(t['Prod via AT&T, later'], /^Overridden by DC2 to cloud, inspected/);
  const ok = effectivePolicy(est, P.filter(p => p.name !== 'DC2 deny'), { from: pc, to, tag: 'Prod' });
  assert.equal(ok.verdict, 'Allowed');
  assert.equal(ok.layers.find(l => l.key === 'core').text, 'Via the AT&T network');
  assert.equal(ok.layers.find(l => l.key === 'edge').text, 'NGFW inline');
  assert.equal(effectivePolicy(est, P, { from: 'tag PCI', to: 'the Internet', tag: '' }).trace.filter(x => x.result !== 'Does not match').length, 0);
});

test('a policy that can never decide anything is shadowed, with the policy that blocks it', () => {
  const s = shadowedPolicies(est, P);
  assert.ok(s.some(x => x.name === 'Prod via AT&T, later' && /Prod no direct internet|DC2 to cloud, inspected/.test(x.by)));
  assert.ok(!s.some(x => x.name === 'DC2 deny'));
});

test('intended against configured, per connection', () => {
  const rows = intendedVsConfigured(est, P);
  const c = rows.find(r => r.region === pub.region);
  assert.ok(c.rows.some(x => x.rule === 'Via the AT&T network' && x.status === 'Drift' && /public internet today/.test(x.configured)));
  assert.ok(c.rows.some(x => x.rule === 'Deny matching routes (on premise → partner)' && x.status === 'Not pushed'));
});

test('blocking a default route shapes a flow; only denying its matching routes stops it', () => {
  const p = [{ name: 'Block default', match: pc, scope: to, path: [], route: { 'deny:block-default-routes': { o2p: true, p2o: false } }, state: 'simulated' }];
  assert.equal(effectivePolicy(est, p, { from: pc, to, tag: '' }).verdict, 'Allowed');
});
