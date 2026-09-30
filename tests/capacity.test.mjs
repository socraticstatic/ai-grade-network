import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import * as OD from '../naas-observe-dash.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// One capacity function (notes, 2026-09-30, Task 1.6): "Is it full? Link usage,
// headroom, days until full" (Observe) and "you have set Connection BW to 1Gbps
// but only using 20% of BW over last 6 months - Resize" (Cost > Optimize) read
// one set of numbers. The gauge math used to live inline in the view.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const connsOf = (view) => { const est = D.ESTATES[view]; return X.connections(est, A.observe(est, [], A.inventory(est))); };

test('Growing us-east-1: bought 30 Gbps, peaks at 41%, averages less over 6 months, and one port could go', () => {
  const c = OD.capacity(connsOf('partial'), '30d').find(r => r.region === 'us-east-1');
  assert.equal(c.capG, 30);
  assert.equal(c.ports, 3);
  assert.equal(c.peakPct, 41);
  assert.ok(c.avg6mPct > 0 && c.avg6mPct < 41, String(c.avg6mPct));
  assert.equal(c.oversized, true);
  assert.equal(c.resizeTo, 2);
  assert.equal(c.resizePct, 62);
});

test('a degraded or near-full link is never called oversized', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    for (const c of OD.capacity(connsOf(view), '30d')) if (c.state !== 'ok') assert.equal(c.oversized, false, `${view}/${c.region}`);
  }
});

test('the window moves when it fills, never what was bought or the 6-month average', () => {
  const a = OD.capacity(connsOf('mature'), '7d'), b = OD.capacity(connsOf('mature'), '90d');
  a.forEach((x, i) => { assert.equal(x.capG, b[i].capG); assert.equal(x.avg6mPct, b[i].avg6mPct); });
  assert.ok(a.some((x, i) => x.fullIn !== b[i].fullIn), 'at least one fill date moves with the window');
});

test('Observe Connections reads the same numbers, row for row', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const v = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', obPanel: 'conn' }));
    const cap = OD.capacity(connsOf(view), '30d');
    for (const g of v.gaugeRows) {
      const c = cap.find(x => x.id === g.id);
      assert.ok(c, g.id);
      assert.equal(g.capG, c.capG); assert.equal(g.peakG, c.peakG); assert.equal(g.fullIn, c.fullIn);
    }
  }
});
