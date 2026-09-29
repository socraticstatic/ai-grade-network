import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { POLICY_LAYERS, layerOfReq, policyLayers, MULTI_LAYER } from '../naas-policy-layers.js';

// "give me policies that are multi-layer" (Micah, 2026-09-29). A policy says
// what it requires at each layer of the path: the site and its first mile, the
// AT&T edge, the AT&T core, the cloud and its workloads.

test('four layers, in path order', () => {
  assert.deepEqual(POLICY_LAYERS.map(l => l.label), ['Sites & first mile', 'AT&T edge', 'AT&T core', 'Cloud & workload']);
});

test('a single rule lands on the layer it constrains', () => {
  assert.equal(layerOfReq('Inline security inspection'), 'edge');
  assert.equal(layerOfReq('Segment intra-tag only'), 'core');
  assert.equal(layerOfReq('Latency SLO 15 ms'), 'core');
  assert.equal(layerOfReq('No local internet breakout'), 'site');
  assert.equal(layerOfReq('Private subnets only'), 'cloud');
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

test('an authored single-rule policy still reads on its layer', () => {
  const L = policyLayers({ name: 'x', match: 'tag X', req: 'Inline security inspection', custom: true });
  assert.equal(L.edge, 'Inline security inspection');
  assert.equal(Object.values(L).filter(Boolean).length, 1);
});

test('the multi-layer templates set a rule at every layer', () => {
  assert.ok(MULTI_LAYER.length >= 5);
  for (const t of MULTI_LAYER) {
    assert.ok(t.name && t.match && t.why, t.key);
    for (const l of POLICY_LAYERS) assert.ok(t.layers[l.key], `${t.name} says nothing at ${l.label}`);
    assert.ok(!/—/.test(JSON.stringify(t)), 'no em dashes');
  }
});
