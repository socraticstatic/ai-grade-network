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
// rules were in use (100 ms, 120 ms, rel 'warn', ...), and 'Degraded' was
// amber on the hero, red in Connections and orange on the map.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const VIEWS = ['partial', 'mature', 'trust', 'small'];
const reg = (view, name) => D.ESTATES[view].regionsList.find(r => r.region === name);

test('regionState: down on a degraded link, otherwise the SLO of the path it takes', () => {
  assert.equal(F.regionState(reg('partial', 'eastus')), 'down');
  assert.equal(F.regionState(reg('partial', 'westeurope')), 'slo', 'public at 102 ms against 100');
  assert.equal(F.regionState(reg('mature', 'westeurope')), 'slo', 'private at 21 ms against 20');
  assert.equal(F.regionState(reg('partial', 'us-east-1')), 'ok');
  assert.deepEqual(F.HEALTH_WORD, { ok: 'Healthy', risk: 'At risk', slo: 'Over SLO', down: 'Down' });
});

test('the degraded finding counts regions by the one rule, on every estate', () => {
  for (const view of VIEWS) {
    const n = D.ESTATES[view].regionsList.filter(r => F.regionState(r) === 'slo').length;
    const v = vals(mkC({ view, estateParam: null, screen: 's3', tab: 'observe', obPage: 'insights', insPanel: 'findings', findFilter: 'all' }));
    const f = v.findAll.find(r => r.key === 'degraded');
    if (!n) { assert.ok(!f, `${view} claims a degraded finding with no region over SLO`); continue; }
    assert.ok(f, `${view} has ${n} regions over SLO and no finding`);
    assert.match(f.head, new RegExp(`^${n} ${n === 1 ? 'region runs' : 'regions run'} above the latency SLO\\.`), `${view}: ${f.head}`);
  }
});

test('Degraded is one red everywhere', () => {
  const root = new URL('../', import.meta.url);
  for (const f of readdirSync(root).filter(x => /^naas-.*\.js$/.test(x))) {
    assert.ok(!readFileSync(new URL(f, root), 'utf8').includes('#ff8500'), `${f} still paints Degraded orange`);
  }
  const obs = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
  assert.equal(obs.mapLegend.find(l => l.label === 'Degraded').color, 'var(--error)');
  const con = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', tab: 'connect' }));
  assert.equal(con.heroClouds.find(c => c.cloud === 'Azure').relFill, 'var(--error)', 'Azure carries the degraded eastus');
});

test('apps are weighed by traffic: finance is not red from westeurope latency', () => {
  const est = D.ESTATES.partial, inv = A.inventory(est), ob = A.observe(est, [], inv);
  const fin = appsOf(est, inv, ob.flows).find(a => a.tag === 'finance');
  const total = fin.parts.reduce((a, p) => a + p.share, 0);
  assert.ok(Math.abs(total - 1) < 1e-6, `shares sum to ${total}`);
  const we = fin.parts.find(p => p.region === 'westeurope');
  assert.ok(we && we.share < 0.05, `westeurope carries ${we && we.share} of finance's traffic`);
  assert.notEqual(fin.health, 'slo');
});

test('topApps never leads with otel-agent, a metrics sidecar', () => {
  for (const view of VIEWS) {
    const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv);
    for (const a of appsOf(est, inv, ob.flows)) assert.ok(!a.topApps.includes('otel-agent'), `${view}/${a.tag}: ${a.topApps.join(', ')}`);
  }
});
