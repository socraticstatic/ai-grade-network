import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as GV from '../naas-govern.js';
import * as PM from '../naas-policy-model.js';
import { evalPolicies } from '../naas-policy-layers.js';
import { otherLayer } from '../naas-policy-compile.js';

// The honest engine (Micah, 2026-10-09: "The Policy Engine needs real help - do best-practices research on it - we need
// a robust policy engine per layer. right now, it's a bit too simple yet convoluted."). Slice 1 of the research plan:
// one matcher (Govern's), one intent catalog, the path each flow really takes, a stamp per layer with a reason code,
// Agrees in place of Overridden, staged policies that wait, and dead policies named.
const ESTS = ['partial', 'mature', 'trust', 'small'].map(id => D.ESTATES[id]);
const pc = 'Private cloud · Equinix DC2, Ashburn';
const run = (est, flow, opts = {}) => PM.decide(est, est.policies, flow, { inv: A.inventory(est), ...opts });
const layer = (d, k) => d.layers.find(l => l.key === k);

test('one matcher: a region pattern matches in the engine exactly the regions Govern counts it in', () => {
  for (const est of ESTS) {
    const inv = A.inventory(est);
    for (const p of [...est.policies, { name: 'EU', match: 'region eu-*', req: 'Private path required', state: 'enforced' }, { name: 'AP', match: 'region ap-*', req: 'Private path required', state: 'enforced' }]) {
      if (!/^region /.test(p.match)) continue;
      const govern = new Set(GV.members(est, inv, p).rows.map(r => `${r.cloud} ${r.region}`));
      const n = PM.normalizePolicy(p);
      for (const r of est.regionsList) {
        const label = `${r.cloud} ${r.region}`;
        assert.equal(PM.matchFlow(est, n, { from: pc, to: label, tag: '' }).ok, govern.has(label), `${est.id} ${p.name} ${label}`);
      }
    }
  }
  const est = D.ESTATES.partial, eu = PM.normalizePolicy(est.policies.find(p => p.name === 'EU residency'));
  for (const to of ['AWS eu-west-1', 'Azure westeurope', 'GCP europe-west1']) assert.ok(PM.matchFlow(est, eu, { from: pc, to, tag: '' }).ok, `EU residency reaches ${to}`);
  assert.equal(PM.matchFlow(est, eu, { from: pc, to: 'AWS us-east-1', tag: '' }).missed, 'To');
  assert.equal(PM.matchFlow(est, PM.normalizePolicy({ match: 'tag PCI', scope: 'any cloud' }), { from: pc, to: 'AWS us-east-1', tag: 'Prod' }).missed, 'Tag');
});

test('every phrase in use resolves to a typed intent; an unknown one keeps its words on its layer', () => {
  const k = (ph) => PM.intentOf(ph).key;
  assert.equal(k('Private path required'), 'private');
  assert.equal(k('Via the AT&T network'), 'private');
  assert.equal(k('Never the internet'), 'private');
  assert.equal(k('No direct internet path'), 'no-internet');
  assert.equal(k('Inline security inspection'), 'inspect');
  assert.equal(k('NGFW inline'), 'inspect');
  assert.equal(k('Segment intra-tag only'), 'segment');
  assert.equal(k('Two paths, diverse metros'), 'two-paths');
  assert.equal(k('Internet egress only through AT&T'), 'egress');
  const slo = PM.intentOf('Latency SLO 15 ms');
  assert.deepEqual([slo.key, slo.param, slo.layers], ['slo', 15, ['core']]);
  assert.ok(PM.intentOf('Private path required').forbids && PM.intentOf('No direct internet path').forbids && !PM.intentOf('Inline security inspection').forbids);
  const odd = PM.intentOf('Cost-aware routing');
  assert.equal(odd.key, 'other:cost-aware routing'); assert.deepEqual(odd.layers, [otherLayer('Cost-aware routing')]);
  // A policy's phrases come from its rule, its path picks and its layers, each intent once.
  const n = PM.normalizePolicy({ name: 'x', match: 'tag PCI', req: 'Private path required', path: ['Via the AT&T network', 'NGFW inline'] });
  assert.deepEqual(n.intents.map(i => i.key), ['private', 'inspect']);
  // Every estate policy's every phrase is known to the catalog.
  for (const est of ESTS) for (const p of est.policies) for (const it of PM.normalizePolicy(p).intents) assert.ok(!it.key.startsWith('other:'), `${est.id} ${p.name}: ${it.text}`);
});

test('DC2 to AWS eu-west-1 carrying PCI is violated layer by layer: no on-ramp, the core not on the path, a public exit', () => {
  const d = run(D.ESTATES.partial, { from: pc, to: 'AWS eu-west-1', tag: 'PCI' });
  assert.equal(d.verdict, 'Allowed'); assert.equal(d.decidedBy, 'PCI private path');
  assert.equal(d.compliance, 'Violated');
  assert.deepEqual(d.layers.map(l => `${l.key}:${l.stamp}:${l.code}`), ['site:holds:SITE_PRIVATE', 'edge:violated:EDGE_NOT_ON_PATH', 'core:violated:CORE_NOT_ON_PATH', 'cloud:violated:CLOUD_PUBLIC_EXIT']);
  assert.ok(d.layers.every(l => l.stamp === 'any' || l.by === 'PCI private path'));
  assert.equal(d.empty, true, 'no PCI workload sits in eu-west-1: a what-if, never counted against the estate');
  // The same intent on the attached region holds on three layers and breaks on the six exposed workloads.
  const us = run(D.ESTATES.partial, { from: pc, to: 'AWS us-east-1', tag: 'PCI' });
  assert.deepEqual(us.layers.map(l => l.stamp), ['holds', 'holds', 'holds', 'violated']);
  assert.equal(layer(us, 'cloud').code, 'CLOUD_EXPOSED'); assert.equal(layer(us, 'cloud').text, '6 exposed');
  assert.equal(layer(us, 'edge').text, 'NetBond'); assert.equal(us.empty, false);
});

test('a later policy that asks the same thing Agrees, never Overridden; a staged one waits and says what it would do', () => {
  const est = D.ESTATES.partial, f = { from: pc, to: 'AWS eu-west-1', tag: 'PCI' };
  const off = run(est, f), on = run(est, f, { staged: true });
  const eu = (d) => d.rungs.find(g => g.name === 'EU residency');
  assert.equal(eu(off).state, 'staged'); assert.equal(eu(off).rel, 'agrees'); assert.equal(eu(off).with, 'PCI private path');
  assert.equal(eu(on).state, 'agrees'); assert.equal(eu(on).with, 'PCI private path');
  for (const d of [off, on]) for (const g of d.rungs) assert.ok(['decides', 'adds', 'agrees', 'staged', 'skip'].includes(g.state), g.state);
  // A staged policy never decides: westeurope only EU residency matches, and it is authored.
  const we = { from: pc, to: 'Azure westeurope', tag: '' };
  assert.equal(run(est, we).decidedBy, ''); assert.equal(run(est, we).compliance, 'None');
  assert.equal(run(est, we, { staged: true }).decidedBy, 'EU residency');
  // A policy that adds a demand of its own reads Adds.
  const pols = [{ name: 'A', match: 'tag PCI', scope: 'any cloud', req: 'Private path required', state: 'enforced' }, { name: 'B', match: 'tag PCI', scope: 'any cloud', req: 'Inline security inspection', state: 'enforced' }, { name: 'C', match: 'tag PCI', scope: 'any cloud', req: 'Private path required', state: 'enforced' }];
  const d = PM.decide(est, pols, { from: pc, to: 'AWS us-east-1', tag: 'PCI' }, { inv: A.inventory(est) });
  assert.deepEqual(d.rungs.map(g => g.state), ['decides', 'adds', 'agrees']);
  // us-east-1 rides NetBond (its stated ramp): NetBond tags CVs and cannot inspect, so inspection there is Unenforceable.
  assert.deepEqual([layer(d, 'edge').stamp, layer(d, 'edge').code, layer(d, 'edge').text], ['unenforceable', 'EDGE_NO_FW', 'NetBond only']);
  assert.deepEqual(PM.redundantPolicies(est, pols, { inv: A.inventory(est) }).map(x => `${x.name}~${x.with}`), ['C~A']);
});

test('a flow to the Internet: a forbidding intent blocks it where the site would break out; inspection finds no inspection point', () => {
  const est = D.ESTATES.partial;
  const pci = run(est, { from: pc, to: 'the Internet', tag: 'PCI' });
  assert.equal(pci.verdict, 'Denied'); assert.equal(pci.decidedBy, 'PCI private path');
  assert.deepEqual(pci.layers.map(l => l.stamp), ['blocks', 'notonpath', 'notonpath', 'notonpath']);
  assert.equal(layer(pci, 'site').code, 'SITE_BREAKOUT_BLOCKED'); assert.equal(pci.compliance, 'Holds');
  assert.equal(run(est, { from: pc, to: 'the Internet', tag: 'Prod' }).decidedBy, 'Prod no direct internet');
  const web = run(est, { from: pc, to: 'the Internet', tag: 'Internet-facing' });
  assert.equal(web.verdict, 'Allowed'); assert.equal(layer(web, 'edge').code, 'EDGE_NOT_INSPECTED');
  // Denying matching routes stops a flow at the edge; blocking the default route only shapes it.
  const deny = [{ name: 'D', match: pc, scope: 'AWS us-east-1', path: [], route: { 'deny:matching-routes': { o2p: true } }, state: 'enforced' }];
  const dd = PM.decide(est, deny, { from: pc, to: 'AWS us-east-1', tag: '' });
  assert.equal(dd.verdict, 'Denied'); assert.equal(layer(dd, 'edge').code, 'EDGE_ROUTE_DENIED');
  const bdr = [{ name: 'B', match: pc, scope: 'AWS us-east-1', path: [], route: { 'deny:block-default-routes': { o2p: true } }, state: 'enforced' }];
  assert.equal(PM.decide(est, bdr, { from: pc, to: 'AWS us-east-1', tag: '' }).verdict, 'Allowed');
});

test('a third party\'s access and core are unenforceable; a public region takes the AT&T edge and core off the path', () => {
  const m = D.ESTATES.mature;
  const lumen = run(m, { from: 'Phoenix DC', to: 'AWS us-west-2', tag: 'Prod' });
  assert.equal(layer(lumen, 'site').stamp, 'unenforceable'); assert.equal(layer(lumen, 'site').text, 'Lumen access');
  assert.equal(layer(lumen, 'core').code, 'CORE_THIRD_PARTY');
  const plain = run(D.ESTATES.partial, { from: pc, to: 'AWS us-west-2', tag: '' });
  assert.deepEqual(plain.layers.map(l => l.stamp), ['any', 'notonpath', 'notonpath', 'any']);
});

test('an SLO reads the latency of the path the flow takes', () => {
  const m = D.ESTATES.mature, inv = A.inventory(m), f = { from: 'Ashburn DC', to: 'GCP us-central1', tag: 'AI' };
  const at = (ms) => layer(PM.decide(m, [{ name: 'S', match: 'tag AI', scope: 'any cloud', req: `Latency SLO ${ms} ms`, state: 'enforced' }], f, { inv }), 'core');
  assert.deepEqual([at(15).stamp, at(15).code, at(15).text], ['holds', 'SLA_MET', '11 ms']);
  assert.deepEqual([at(5).stamp, at(5).code], ['violated', 'SLA_UNMET']);
});

test('dead policies are named: a tag no workload carries, a site group no site is in', () => {
  const p = D.ESTATES.partial, dead = PM.deadPolicies(p, A.inventory(p), p.policies);
  assert.deepEqual(dead.map(x => x.name), ['Finance segmentation', 'GPU latency SLO']);
  assert.match(dead[1].why, /no workload is tagged GPU/);
  assert.deepEqual(PM.deadPolicies(p, A.inventory(p), [{ name: 'Gone', match: pc, scope: 'AWS mars-1', state: 'enforced' }]).map(x => x.why), ['AWS mars-1 is not in this estate']);
});

test('one sort: the engine reads policies in the order Govern numbers them, priority and deny first', () => {
  for (const est of ESTS) {
    const order = evalPolicies(est, est.policies).ordered.map(p => p.name);
    assert.deepEqual(run(est, { from: pc, to: 'the Internet', tag: '' }).rungs.map(g => g.name), order, est.id);
  }
  const est = D.ESTATES.partial;
  const P = [{ name: 'late', match: 'tag PCI', scope: 'any cloud', req: 'Private path required', state: 'enforced' },
    { name: 'first', match: 'tag PCI', scope: 'any cloud', req: 'Inline security inspection', state: 'enforced', priority: 1 },
    { name: 'deny', match: pc, scope: 'AWS us-east-1', route: { 'deny:matching-routes': { o2p: true } }, state: 'enforced' },
    { name: 'allow', match: pc, scope: 'AWS us-east-1', path: ['Via the AT&T network'], state: 'enforced' }];
  // One sort (2026-10-09, slice 2): priority, written order (ten apart), a deny before an allow at equal priority.
  // Specificity no longer sorts, so the asset pairs follow the tag rule written before them.
  const want = ['first', 'late', 'deny', 'allow'];
  assert.deepEqual(evalPolicies(est, P).ordered.map(p => p.name), want);
  assert.deepEqual(PM.decide(est, P, { from: pc, to: 'AWS us-east-1', tag: 'PCI' }).rungs.map(g => g.name), want);
});

test('the sweep counts a policy violated only on real flows, and memoises per estate', () => {
  const p = D.ESTATES.partial, inv = A.inventory(p);
  const a = PM.sweep(p, p.policies, { inv }), b = PM.sweep(p, p.policies, { inv });
  assert.equal(a, b, 'memoised');
  assert.deepEqual(a.violated.map(v => v.name).sort(), ['Internet-facing inspection', 'PCI private path', 'Prod no direct internet']);
  assert.deepEqual(a.violated.find(v => v.name === 'PCI private path').codes, ['CLOUD_EXPOSED'], 'eu-west-1 holds no PCI: its public exit is a what-if');
  assert.ok(!a.violated.some(v => v.name === 'EU residency'), 'a staged policy is not violated until enforced');
  assert.ok(PM.sweep(p, p.policies, { inv, staged: true }).violated.some(v => v.name === 'EU residency'));
});
