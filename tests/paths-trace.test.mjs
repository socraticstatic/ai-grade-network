import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import * as P from '../naas-paths.js';
import * as G from '../naas-segments.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Final review (2026-09-30), findings 5 and 6. Paths printed the ramp codes
// ("ER on-ramp", "DX on-ramp") and so did the connection panel ("ER · 1 × 10
// Gbps purchased"). Trace fell back to the app's worst path when no Paths row
// sat on the problem's region, so every Established problem, the us-west-2
// saturation included, opened Frankfurt DC to AWS eu-central-1.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const NOW = '2026-10-05T15:00:00Z';
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', nowIso: NOW, ...patch });
const CODE = /\b(ER|DX|EQX|GCI)\b/;
const VIEWS = ['partial', 'mature', 'trust'];
const noFns = (o) => JSON.stringify(o, (k, v) => (typeof v === 'function' ? undefined : v));
const panelText = (p) => noFns(p && { title: p.title, sub: p.sub, overview: p.overview, paths: p.paths, trail: p.trail });
const ctxOf = (view) => { const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv); return G.segCtxOf(est, { inv, ob, conns: X.connections(est, ob) }); };

test('Paths names the on-ramp: no ramp code in any hop line or cell title', () => {
  for (const view of VIEWS) {
    const rows = vals(at(view, { obPanel: 'paths' })).pathTimeAll;
    assert.ok(rows.length > 0, view);
    for (const r of rows) {
      for (const c of r.cells) assert.ok(!CODE.test(c.title), `${view} ${r.key}: ${c.title}`);
      const detail = vals(at(view, { obPanel: 'paths', pathSel: r.key })).pathDetail;
      assert.ok(detail.startsWith(r.label), `${view} ${r.key} is selected: ${detail}`);
      assert.ok(!CODE.test(detail), `${view} ${r.key}: ${detail}`);
    }
  }
});

test('the Growing finance hop line says ExpressRoute, at the same ms', () => {
  const v = vals(at('partial', { obPanel: 'paths', pathSel: 'finance|eastus' }));
  assert.match(v.pathDetail, /AT&T network 13 ms › ExpressRoute on-ramp 14 ms › Azure eastus 15 ms$/);
});

test('the Observe panel names the connection, never its code', () => {
  for (const view of VIEWS) {
    const est = D.ESTATES[view], inv = A.inventory(est);
    const sels = [];
    for (const r of est.regionsList.filter(x => x.priv)) {
      sels.push('cx-' + r.region);
      const rg = inv.flatMap(c => c.regions).find(x => x.region === r.region);
      const vpc = rg && rg.vpcs[0], sn = vpc && vpc.subnets[0], w = sn && (sn.workloads || [])[0];
      if (vpc) sels.push(`vpc:${r.region}|${vpc.id}`);
      if (sn) sels.push(`sn:${r.region}|${vpc.id}|${sn.id}`);
      if (w) sels.push(`wl:${r.region}|${vpc.id}|${w.id}`);
    }
    for (const site of new Set(vals(at(view, { obPanel: 'paths' })).pathTimeAll.map(r => r.site))) sels.push('asset:' + site);
    let seen = 0;
    for (const mapSel of sels) {
      const p = vals(at(view, { obPanel: 'map', mapSel })).panel;
      if (!p) continue;
      seen++;
      const text = panelText(p);
      assert.ok(!CODE.test(text), `${view} ${mapSel}: ${text.match(new RegExp('.{0,60}' + CODE.source + '.{0,30}'))}`);
    }
    assert.ok(seen >= sels.length - 1, `${view}: ${seen} of ${sels.length} panels opened`);
  }
});

test('the connection panel\'s sub reads the product, then what was bought', () => {
  const p = vals(at('partial', { obPanel: 'map', mapSel: 'cx-eastus' })).panel;
  assert.equal(p.sub, 'ExpressRoute · 1 × 10 Gbps purchased');
});

test('Trace lands on a Paths row in the problem\'s own region, on every estate', () => {
  for (const view of VIEWS) {
    const n = vals(at(view, { obPanel: 'health' })).problemRows.length;
    assert.ok(n > 0, view);
    for (let i = 0; i < n; i++) {
      const c = at(view, { obPanel: 'health' });
      const p = vals(c).problemRows[i];
      p.trace();
      assert.equal(c.state.obPanel, 'paths', `${view} ${p.key}`);
      const v = vals(c);
      const sel = v.pathTimeAll.find(r => r.key === c.state.pathSel);
      assert.ok(sel, `${view} ${p.key}: ${c.state.pathSel} is not a Paths row`);
      assert.equal(sel.where, p.where, `${view} ${p.key} opened ${sel.label}, ${sel.site} to ${sel.where}`);
      assert.ok(v.pathTimeRows.some(r => r.sel), `${view} ${p.key}: the selected row is on the page`);
      assert.ok(v.pathDetail.endsWith(`${p.where} ${sel.total} ms`), v.pathDetail);
      assert.equal(c.state.mapRegion ?? null, null, `${view} ${p.key}: Trace leaves Traffic unfiltered`);
    }
  }
});

test('Established us-west-2 saturation traces to us-west-2, first on Paths', () => {
  const c = at('mature', { obPanel: 'health' });
  const v0 = vals(c);
  const i = v0.problemRows.findIndex(p => p.where === 'AWS us-west-2');
  assert.equal(i, 0, 'the top-ranked problem');
  assert.ok(!v0.pathTimeAll.some(r => r.region === 'us-west-2'), 'no default row sits on us-west-2');
  v0.problemRows[i].trace();
  const v = vals(c);
  assert.equal(v.pathTimeAll[0].region, 'us-west-2');
  assert.equal(v.pathTimeAll[0].key, c.state.pathSel);
  assert.ok(v.pathTimeRows[0].sel);
  assert.equal(c.state.pathsPage, 0);
});

test('a pinned row is computed on demand with the same hop mapping, and shown first', () => {
  const ctx = ctxOf('mature');
  const base = G.pathTimes(ctx);
  const pin = G.pinFor(ctx, 'us-west-2', []);
  assert.ok(pin.tag, 'the region\'s largest app group');
  const rows = G.pathTimes(ctx, { pins: [pin] });
  assert.equal(rows.length, base.length + 1);
  const r = rows[0];
  assert.equal(r.key, `${pin.tag}|us-west-2`);
  assert.equal(r.region, 'us-west-2');
  assert.equal(r.cells.reduce((a, c) => a + (c.ms || 0), 0), r.total);
  const reg = ctx.est.regionsList.find(x => x.region === 'us-west-2');
  assert.equal(r.total, P.path(P.allSites(ctx.est).find(x => x.name === r.site), reg).ms);
  assert.deepEqual(rows.slice(1).map(x => x.key), base.map(x => x.key), 'the default rows keep their order');
  // A pin that is already a default row adds nothing.
  assert.deepEqual(G.pathTimes(ctx, { pins: [{ tag: base[2].tag, region: base[2].region }] }).map(x => x.key), base.map(x => x.key));
});

test('a problem\'s own apps win the pin; a region with no apps pins the region alone', () => {
  const ctx = ctxOf('mature');
  const on = ctx.apps.filter(a => (a.parts || []).some(p => p.region === 'us-west-2'));
  assert.ok(on.length >= 2, on.map(a => a.tag).join(', '));
  const last = on[on.length - 1].tag;
  assert.equal(G.pinFor(ctx, 'us-west-2', [last]).tag, last);
  const bare = { ...ctx, apps: [] };
  const pin = G.pinFor(bare, 'us-west-2', []);
  assert.deepEqual(pin, { tag: null, region: 'us-west-2' });
  const [r] = G.pathTimes(bare, { pins: [pin] });
  assert.equal(r.key, '|us-west-2');
  assert.equal(r.label, 'AWS us-west-2');
  assert.equal(r.region, 'us-west-2');
  assert.equal(r.cells.reduce((a, c) => a + (c.ms || 0), 0), r.total);
});
