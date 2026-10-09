import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { POLICY_LAYERS, policyLayers, MULTI_LAYER } from '../naas-policy-layers.js';
import { homeLayer } from '../naas-policy-compile.js';

// "give me policies that are multi-layer" (Micah, 2026-09-29). A policy says
// what it requires at each layer of the path: the site and its first mile, the
// AT&T edge, the AT&T core, the cloud and its workloads.

test('four layers, in path order', () => {
  assert.deepEqual(POLICY_LAYERS.map(l => l.label), ['Sites & first mile', 'AT&T edge', 'AT&T core', 'Cloud & workload']);
});

test('a single rule lands on the layer it constrains: its typed intent\'s home (2026-10-09, layerOfReq retired)', () => {
  assert.equal(homeLayer('Inline security inspection'), 'edge');
  assert.equal(homeLayer('Segment intra-tag only'), 'core');
  assert.equal(homeLayer('Latency SLO 15 ms'), 'core');
  assert.equal(homeLayer('No local internet breakout'), 'site');
  assert.equal(homeLayer('Private subnets only'), 'cloud', 'a phrase the catalog does not know lands on the layer its words name');
});

test('every estate policy reads across at least two layers, its own rule among them', () => {
  for (const id of ['partial', 'mature', 'trust']) for (const p of D.ESTATES[id].policies) {
    const L = policyLayers(p);
    assert.deepEqual(Object.keys(L), POLICY_LAYERS.map(l => l.key));
    const set = Object.values(L).filter(Boolean);
    assert.ok(set.length >= 2, `${id} ${p.name}: ${JSON.stringify(L)}`);
    assert.ok(Object.values(L).includes(p.req), `${p.name} keeps its own rule`);
  }
});

test('an authored single-rule policy reads on its layer, and on every layer its compile reaches', () => {
  // Since slice 2 an authored policy compiles like an estate one (ACROSS once skipped custom policies): inspection is the
  // vSRX's at the edge, and the cloud's route table sends north-south traffic to the hub.
  const L = policyLayers({ name: 'x', match: 'tag X', req: 'Inline security inspection', custom: true });
  assert.equal(L.edge, 'Inline security inspection');
  assert.deepEqual(Object.keys(L).filter(k => L[k]), ['edge', 'cloud']);
  assert.equal(L.cloud, 'Next hop is the hub');
});

test('the multi-layer templates set a rule at every layer', () => {
  assert.ok(MULTI_LAYER.length >= 5);
  for (const t of MULTI_LAYER) {
    assert.ok(t.name && t.match && t.why, t.key);
    for (const l of POLICY_LAYERS) assert.ok(t.layers[l.key], `${t.name} says nothing at ${l.label}`);
    assert.ok(!/—/.test(JSON.stringify(t)), 'no em dashes');
  }
});
