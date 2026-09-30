import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as P from '../naas-paths.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Observe's four questions (notes, 2026-09-30, B2): Health (is it up), Paths (is
// it fast), Capacity (is it full), Changes (what changed). Paths reads the hops
// the product already draws; loss shows only where a source reports it.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const NOW = '2026-10-05T15:00:00Z';
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', nowIso: NOW, ...patch });
const COLS = ['Site', 'Edge', 'Backbone', 'On-ramp', 'Cloud link', 'Hub', 'App'];

test('the four questions are tabs in the stakeholder\'s order', () => {
  const v = vals(at('partial'));
  assert.deepEqual(v.obPanels.map(p => p.label), ['Traffic', 'Over time', 'Where it goes', 'Health', 'Paths', 'Capacity', 'Changes']);
  assert.ok(vals(at('partial', { obPanel: 'paths' })).obPanelPaths);
  assert.ok(vals(at('partial', { obPanel: 'changes' })).obPanelChanges);
});

test('each hop\'s ms adds up to Site to app, which is the site\'s first mile plus the region\'s path', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const est = D.ESTATES[view];
    for (const r of vals(at(view, { obPanel: 'paths' })).pathTimeAll) {
      const hop = r.cells.reduce((a, c) => a + (c.ms || 0), 0);
      assert.equal(hop, r.total, `${view} ${r.key}`);
      const reg = est.regionsList.find(x => x.region === r.region);
      const site = P.allSites(est).find(x => x.name === r.site);
      assert.equal(r.total, P.path(site, reg).ms, `${view} ${r.key}: the drawn path`);
      if ((reg.priv ? reg.fab : reg.pub) >= 6) assert.equal(r.total, (site.ms || 0) + (reg.priv ? reg.fab : reg.pub + 1) + (r.aggHub ? 1 : 0), `${view} ${r.key}: the identity`);
    }
  }
});

test('Growing finance rides eastus, and its Cloud link loss reads 0.31%', () => {
  const rows = vals(at('partial', { obPanel: 'paths' })).pathTimeAll;
  const fin = rows.find(r => r.key === 'finance|eastus');
  assert.ok(fin, rows.map(r => r.key).join(', '));
  assert.equal(fin.cells[COLS.indexOf('Cloud link')].lossF, '0.31%');
  assert.equal(fin.cells[COLS.indexOf('Hub')].lossF, '');
  assert.match(fin.cells[COLS.indexOf('Hub')].title, /Not yet measured/);
  assert.equal(fin.totalF, '15 ms');
});

test('Changes lists the route change three minutes before the eastus problem, lined up', () => {
  const v = vals(at('partial', { obPanel: 'changes' }));
  const r = v.changeRows.find(x => x.kind === 'Route' && /eastus/.test(x.touched));
  assert.ok(r, v.changeRows.map(x => x.text).join(' | '));
  assert.equal(r.whenF, '09:35');
  assert.match(r.lineF, /Azure eastus/);
  assert.ok(v.chgTicks.length > 0 && v.chgBands.length > 0);
  const before = HTML.slice(0, HTML.indexOf('list="{{ chgTicks }}"'));
  assert.ok(before.length > 0 && (before.match(/<svg\b/g) || []).length === (before.match(/<\/svg>/g) || []).length, 'the strip is positioned divs, never sc-for inside svg');
});

test('Since changes the list', () => {
  const n = (w) => vals(at('partial', { obPanel: 'changes', obWindow: w })).changeAll.filter(x => !x.upcoming).length;
  assert.ok(n('30d') > n('24h'), `${n('30d')} vs ${n('24h')}`);
});

test('Trace opens Paths on the problem\'s app and region', () => {
  const c = at('partial', { obPanel: 'health' });
  vals(c).problemRows[0].trace();
  assert.equal(c.state.obPanel, 'paths');
  assert.equal(c.state.pathSel, 'finance|eastus');
  assert.ok(vals(c).pathTimeRows.find(r => r.key === 'finance|eastus').sel);
});
