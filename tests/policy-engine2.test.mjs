import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTATES } from '../naas-data.js';
import { intendedVsConfigured } from '../naas-policy-layers.js';
import { decide, redundantPolicies } from '../naas-policy-model.js';

// A real policy engine (Micah, 2026-10-01: "not a real policy engine"): evaluate every policy against a flow in
// precedence order and name the decider. Honest since 2026-10-09: a later policy that asks the same thing Agrees, never
// "Overridden"; a staged one waits unless the engine is asked what staging would do; a policy that only ever agrees is
// redundant. Per layer since slice 2: a route deny only drops a flow on a connection that carries it.
const est = ESTATES.partial, pc = 'Private cloud · Equinix DC2, Ashburn';
const nb = est.regionsList.find(r => r.priv && (r.ramp === 'NetBond' || !r.ramp)), to = `${nb.cloud} ${nb.region}`;
const pub = est.regionsList.find(r => !r.priv), toPub = `${pub.cloud} ${pub.region}`;
const P = [
  { name: 'Prod no direct internet', match: 'tag Prod', scope: 'any cloud', req: 'No direct internet path', state: 'enforced' },
  { name: 'DC2 to cloud, inspected', match: pc, scope: to, req: '', path: ['Via the AT&T network', 'NGFW inline'], route: {}, state: 'simulated' },
  { name: 'DC2 deny', match: pc, scope: to, req: '', path: [], route: { 'deny:matching-routes': { o2p: true, p2o: false } }, state: 'simulated', priority: 1 },
  { name: 'Prod via AT&T, later', match: 'tag Prod', scope: 'any cloud', req: '', path: ['Via the AT&T network'], route: {}, state: 'enforced' },
];
const states = (d) => Object.fromEntries(d.rungs.map(x => [x.name, x.state]));

test('a flow gets one decision and its decider; a later match that asks nothing new agrees', () => {
  const e = decide(est, P, { from: pc, to, tag: 'Prod' }, { staged: true });
  assert.equal(e.verdict, 'Denied');
  assert.equal(e.decidedBy, 'DC2 deny');
  assert.equal(e.blocker, 'edge', 'the NetBond sheet on the connection drops it');
  const t = states(e);
  assert.equal(t['DC2 deny'], 'decides');
  assert.equal(t['Prod via AT&T, later'], 'agrees');
  assert.equal(e.rungs.find(x => x.name === 'Prod via AT&T, later').with, 'DC2 to cloud, inspected');
  assert.deepEqual([e.layers.find(l => l.key === 'edge').stamp, e.layers.find(l => l.key === 'edge').code], ['blocks', 'EDGE_ROUTE_DENIED']);
  // Enforced only: the two staged policies wait, and the enforced Prod rule decides.
  const live = decide(est, P, { from: pc, to, tag: 'Prod' });
  assert.equal(live.verdict, 'Allowed'); assert.equal(live.decidedBy, 'Prod no direct internet');
  assert.equal(states(live)['DC2 deny'], 'staged'); assert.equal(states(live)['Prod via AT&T, later'], 'adds');
  // Without the deny: written order decides (the tag rule came first), and the asset pair adds its demands.
  const ok = decide(est, P.filter(p => p.name !== 'DC2 deny'), { from: pc, to, tag: 'Prod' }, { staged: true });
  assert.equal(ok.verdict, 'Allowed'); assert.equal(ok.decidedBy, 'Prod no direct internet');
  assert.equal(states(ok)['DC2 to cloud, inspected'], 'adds');
  assert.equal(decide(est, P, { from: 'tag PCI', to: 'the Internet', tag: '' }).rungs.filter(x => x.state !== 'skip').length, 0);
});

test('a route deny on a connection the flow never crosses drops nothing', () => {
  const p = [{ name: 'DC2 deny, public', match: pc, scope: toPub, route: { 'deny:matching-routes': { o2p: true } }, state: 'enforced' }];
  const d = decide(est, p, { from: pc, to: toPub, tag: '' });
  assert.equal(d.verdict, 'Allowed', `${toPub} rides the internet: there is no NetBond sheet to deny on`);
  assert.equal(d.blocker, null);
  assert.equal(d.decidedBy, 'DC2 deny, public', 'the only match still reads as the one that decides');
});

test('a policy that only ever agrees with an earlier one is redundant, named with the one it echoes', () => {
  const Q = [...P, { name: 'Prod, said twice', match: 'tag Prod', scope: 'any cloud', req: 'No direct internet path', state: 'enforced' }];
  const r = redundantPolicies(est, Q, { staged: true });
  assert.ok(r.some(x => x.name === 'Prod, said twice' && x.with === 'Prod no direct internet'));
  assert.ok(!r.some(x => x.name === 'DC2 deny'));
  assert.ok(!r.some(x => x.name === 'Prod via AT&T, later'), 'a private path asks more than no direct internet: it adds');
});

test('intended against configured, per connection', () => {
  const Pp = P.map(p => (p.scope === to ? { ...p, scope: toPub } : p));
  const rows = intendedVsConfigured(est, Pp);
  const c = rows.find(r => r.region === pub.region);
  assert.ok(c.rows.some(x => x.rule === 'Via the AT&T network' && x.status === 'Drift' && /public internet today/.test(x.configured)));
  assert.ok(c.rows.some(x => x.rule === 'Deny matching routes (on premise → partner)' && x.status === 'Not pushed'));
});

test('blocking a default route shapes a flow; only denying its matching routes stops it', () => {
  const p = [{ name: 'Block default', match: pc, scope: to, path: [], route: { 'deny:block-default-routes': { o2p: true, p2o: false } }, state: 'simulated' }];
  assert.equal(decide(est, p, { from: pc, to, tag: '' }, { staged: true }).verdict, 'Allowed');
});
