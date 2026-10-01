import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "at a glance needs more oomph, and we need to go down to the app level"
// (Micah, 2026-09-29). Four rings (sites, clouds, workloads, apps), then the
// apps: each with its workloads, where it runs, how much rides AT&T, what is
// exposed, its traffic and its p95. The gaps are one line each with a move.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const est = (view = 'mature', patch = {}) => mkC({ view, estateParam: null, screen: 's1', scanStep: 4, estPanel: 'glance', ...patch });
const num = (s) => +String(s).replace(/[^0-9]/g, '');

test('four rings, and each ring\'s centre is the header\'s count', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const v = vals(est(view));
    assert.deepEqual(v.glanceRings.map(r => r.key), ['sites', 'clouds', 'workloads', 'apps']);
    const pill = (l) => num(v.invStats.find(k => k.l === l).v);
    assert.equal(num(v.glanceRings[0].centre), pill('sites'), `${view} sites`);
    assert.equal(num(v.glanceRings[1].centre), pill('regions'), `${view} regions`);
    assert.equal(num(v.glanceRings[2].centre), pill('workloads'), `${view} workloads`);
    for (const r of v.glanceRings) { assert.match(r.ring, /^conic-gradient\(|^var\(/); assert.ok(r.legend.length >= 1 && r.legend.length <= 4, r.key); assert.ok(r.go, r.key); }
  }
});

test('the apps: every workload, one row per app, largest first, paged to fit', () => {
  const v = vals(est());
  const all = v.appAll;
  assert.equal(all.reduce((a, x) => a + x.wl, 0), num(v.invStats.find(k => k.l === 'workloads').v));
  assert.ok(v.appRows.length <= v.appPageSize && v.appRows.length > 0);
  for (const r of v.appRows) {
    assert.ok(r.name && r.runsIn && r.wlF && r.onAttF && r.gbpsF && r.p95F, r.name);
    assert.match(r.onAttW, /%$/); assert.match(r.wlW, /%$/);
    // Over SLO is its own ink, not Down's red (review, 2026-09-30).
    assert.ok(['var(--success)', 'var(--warning)', 'var(--viz-5)'].includes(r.healthInk), r.name);
  }
  assert.equal(num(v.invStats.find(k => k.l === 'exposed workloads').v), all.reduce((a, x) => a + x.exposed, 0));
});

// The drill rule (2026-09-30): an app is the workloads that carry its tag, so its row opens them on
// Your clouds; its Traffic, a traffic figure, still opens its own records (tests/discover-drill.test.mjs
// walks every cell).
test('an app opens its workloads, and its traffic opens its own records', () => {
  const c = est();
  const top = vals(c).appRows[0];
  top.go();
  assert.equal(c.state.screen, 's1');
  assert.equal(c.state.estPanel, 'clouds');
  assert.deepEqual(c.state.cloudFilter, { unit: 'workload', tag: top.name });
  const c2 = est();
  vals(c2).appRows[0].gbpsGo();
  assert.equal(c2.state.screen, 's3');
  assert.equal(c2.state.obPage, 'logs');
  assert.equal(c2.state.logQ, top.name);
});

test('the markup: rings, the apps table, and the gaps on a line each', () => {
  const a = HTML.indexOf('<sc-if value="{{ estPanelGlance }}"');
  const panel = HTML.slice(a, HTML.indexOf('<sc-if value="{{ estPanelClouds }}"', a));
  assert.match(panel, /aria-label="Estate at a glance"/);
  assert.match(panel, /class="fx-ring"/);
  assert.match(panel, /aria-label="Apps"/);
  for (const h of ['App', 'Workloads', 'Runs in', 'On AT&amp;T', 'Exposed', 'Traffic', 'p95']) assert.ok(panel.includes(`>${h}<`), h);
  assert.match(panel, /<sc-for list="\{\{ glanceGaps \}\}"/);
  assert.ok(!panel.includes('{{ haveCards }}'), 'the text cards are gone');
});
