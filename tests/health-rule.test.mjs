import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as D from '../naas-data.js';
import * as F from '../naas-flowmap.js';
import * as A from '../naas-addendum.js';
import { appsOf } from '../naas-apps.js';

// One health rule, one legend (notes, 2026-09-30, Task 1.2). Five public-path
// rules were in use, and 'Degraded' was amber on the hero, red in Connections
// and orange on the map. Since 2026-10-15 the rule reads only what is measured:
// a link's state, and its connection's use against what was bought.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const VIEWS = ['partial', 'mature', 'trust', 'small'];
const reg = (view, name) => D.ESTATES[view].regionsList.find(r => r.region === name);

test('regionState: down on a degraded link, otherwise healthy; no region carries a delay figure', () => {
  assert.equal(F.regionState(reg('partial', 'eastus')), 'down');
  assert.equal(F.regionState(reg('partial', 'westeurope')), 'ok');
  assert.equal(F.regionState(reg('mature', 'westeurope')), 'ok');
  assert.equal(F.regionState(reg('partial', 'us-east-1')), 'ok');
  assert.deepEqual(F.HEALTH_WORD, { ok: 'Healthy', risk: 'At risk', over: 'Over threshold', down: 'Down' });
  for (const view of VIEWS) for (const r of D.ESTATES[view].regionsList) {
    for (const k of ['pub', 'fab', 'rel', 'latency', 'ms']) assert.ok(!(k in r), `${view} ${r.region} still carries ${k}`);
  }
});

test('no finding is written about a delay, on any estate', () => {
  for (const view of VIEWS) {
    const v = vals(mkC({ view, estateParam: null, screen: 's3', tab: 'observe', obPage: 'insights', insPanel: 'findings', findFilter: 'all' }));
    assert.ok(!v.findAll.some(r => r.key === 'degraded'), `${view} still has the delay finding`);
    for (const r of v.findAll) assert.doesNotMatch(`${r.head} ${r.ev || ''}`, /\bms\b|SLO|[Ll]atency|p95/, `${view} ${r.key}`);
  }
});

test('Degraded is one red everywhere', () => {
  const root = new URL('../', import.meta.url);
  for (const f of readdirSync(root).filter(x => /^naas-.*\.js$/.test(x))) {
    assert.ok(!readFileSync(new URL(f, root), 'utf8').includes('#ff8500'), `${f} still paints Degraded orange`);
  }
  const obs = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
  assert.equal(obs.mapLegend.find(l => l.label === 'Degraded').color, 'var(--error)');
  // The home's map carries Health's state; Connect's map colours by its lens, so its cards draw no dot (w2, 2026-09-30).
  const con = vals(mkC({ view: 'partial', estateParam: null, screen: 's0' }));
  assert.equal(con.heroClouds.find(c => c.cloud === 'Azure').relFill, 'var(--error)', 'Azure carries the degraded eastus');
});

test('apps are weighed by traffic: westeurope is a sliver of finance', () => {
  const est = D.ESTATES.partial, inv = A.inventory(est), ob = A.observe(est, [], inv);
  const fin = appsOf(est, inv, ob.flows).find(a => a.tag === 'finance');
  const total = fin.parts.reduce((a, p) => a + p.share, 0);
  assert.ok(Math.abs(total - 1) < 1e-6, `shares sum to ${total}`);
  const we = fin.parts.find(p => p.region === 'westeurope');
  assert.ok(we && we.share < 0.05, `westeurope carries ${we && we.share} of finance's traffic`);
});

test('topApps never leads with otel-agent, a metrics sidecar', () => {
  for (const view of VIEWS) {
    const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv);
    for (const a of appsOf(est, inv, ob.flows)) assert.ok(!a.topApps.includes('otel-agent'), `${view}/${a.tag}: ${a.topApps.join(', ')}`);
  }
});
