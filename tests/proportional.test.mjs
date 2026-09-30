import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as F from '../naas-flowmap.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Proportional destinations (notes, 2026-09-30, Task 2.1): "Google cloud shows
// 70Mbps while Azure is 11.4Gbps but right side of the bar height shows the
// same ... when we see Whole estate it is doing it correctly." A pick keeps the
// other destinations in view at estate scale, muted, so the picked bar keeps
// its true size. They sit outside the flow: no ribbons, no trace, no health.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch });
const hOf = (v, sides) => Object.fromEntries(v.mapNodes.filter(n => sides.includes(n.side)).map(n => [n.id, n.h]));

test('a cloud pick draws its destination at its whole-estate height', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const whole = hOf(vals(at(view)), ['r']);
    for (const cloud of Object.keys(whole).filter(k => k.startsWith('cloud:')).map(k => k.slice(6))) {
      const pick = hOf(vals(at(view, { obDim: 'cloud', obScope: 'cloud:' + cloud })), ['r', 'ctx']);
      for (const [k, h] of Object.entries(whole)) assert.ok(Math.abs((pick[k] ?? -99) - h) <= 0.5, `${view}/${cloud}: ${k} ${pick[k]} vs ${h}`);
    }
  }
  const g = hOf(vals(at('partial', { obDim: 'cloud', obScope: 'cloud:GCP' })), ['r', 'ctx']);
  assert.ok(g['cloud:GCP'] < g['cloud:Azure'], `GCP ${g['cloud:GCP']} vs Azure ${g['cloud:Azure']}`);
});

test('context rows carry no ribbons, no trace, no health, and the total is unchanged', () => {
  const est = D.ESTATES.partial, inv = A.inventory(est), ob = A.observe(est, [], inv);
  const plain = F.buildMap(est, inv, ob.flows, { filterRegion: 'GCP' });
  const m = F.buildMap(est, inv, ob.flows, { filterRegion: 'GCP', context: true });
  assert.ok(m.context.length >= 2);
  const ctx = new Set(m.context.map(x => x.key));
  assert.ok(m.ribbons.every(r => !ctx.has(r.from) && !ctx.has(r.to)));
  assert.ok(m.nodes.every(n => !ctx.has(n.key)));
  assert.equal(m.total, plain.total);
  const v = vals(at('partial', { obDim: 'cloud', obScope: 'cloud:GCP' }));
  assert.ok(v.mapNodes.filter(n => n.side === 'ctx').every(n => !n.health && n.op <= 0.5));
});

test('opening the picked destination returns the column to the full frame', () => {
  const est = D.ESTATES.partial, inv = A.inventory(est), ob = A.observe(est, [], inv);
  assert.deepEqual(F.buildMap(est, inv, ob.flows, { filterRegion: 'GCP', context: true, open: ['cloud:GCP'] }).context, []);
});

test('clicking a context cloud switches the pick in place; the data centers row is not a door', () => {
  const c = at('partial', { obDim: 'cloud', obScope: 'cloud:GCP' });
  const az = vals(c).mapNodes.find(n => n.side === 'ctx' && n.id === 'cloud:Azure');
  az.click();
  assert.equal(c.state.obScope, 'cloud:Azure');
  assert.equal(c.state.mapRegion, null);
  const dc = vals(at('partial', { obDim: 'cloud', obScope: 'cloud:GCP' })).mapNodes.find(n => n.side === 'ctx' && /^dc:/.test(n.id));
  if (dc) assert.equal(dc.cursor, 'default');
});

test('the column says when it is at estate scale', () => {
  assert.ok(vals(at('partial', { obDim: 'cloud', obScope: 'cloud:GCP' })).mapHeads.some(h => /at estate scale/.test(h.text)));
  assert.ok(!vals(at('partial')).mapHeads.some(h => /at estate scale/.test(h.text)));
});

test('Small: one cloud has nothing to compare, two app groups do', () => {
  assert.equal(vals(at('small', { obDim: 'cloud', obScope: 'cloud:AWS' })).mapNodes.filter(n => n.side === 'ctx').length, 0);
  const apps = vals(at('small', { obDim: 'app' })).scopeMembers;
  if (apps.length > 1) assert.ok(vals(at('small', { obDim: 'app', obScope: apps[0].key })).mapNodes.some(n => n.side === 'ctx'));
});
