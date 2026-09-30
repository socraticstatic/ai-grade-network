import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Observe > Health (notes, 2026-09-30, Task 2.6): "Is it up? Every segment of
// every path, green, amber or red", the path flow ("one row per app group, one
// cell per segment") and "Open problems (ranked by apps affected) ... [Open
// ticket] [Trace]". One tab in the Observe row, not a fourth view chip.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const MIN = 60000, NOW = '2026-10-05T15:00:00Z';
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', obPanel: 'health', nowIso: NOW, ...patch });
const cell = (row, col) => row.cells[['Site', 'Edge', 'Backbone', 'On-ramp', 'Cloud link', 'Hub', 'App'].indexOf(col)];

test('Health is a tab in the Observe row, after Where it goes', () => {
  const v = vals(at('partial'));
  assert.deepEqual(v.obPanels.map(p => p.label).slice(0, 4), ['Traffic', 'Over time', 'Where it goes', 'Health']);
  assert.ok(v.obPanelHealth);
  assert.deepEqual(v.segHeads.map(h => h.label), ['Site', 'Edge', 'Backbone', 'On-ramp', 'Cloud link', 'Hub', 'App']);
});

test('Growing finance: down on the ExpressRoute Cloud link, and down at the app; pci is up', () => {
  const rows = vals(at('partial')).pathFlowRows;
  const fin = rows.find(r => r.tag === 'finance');
  assert.equal(rows[0].tag, 'finance', 'worst first');
  assert.equal(cell(fin, 'Cloud link').state, 'down');
  assert.equal(cell(fin, 'Cloud link').thing, 'ExpressRoute');
  assert.match(cell(fin, 'Cloud link').title, /Cloud provider/);
  assert.equal(cell(fin, 'App').state, 'down');
  assert.equal(cell(fin, 'Hub').state, 'nodata');
  assert.ok(rows.find(r => r.tag === 'pci').cells.every(c => c.state !== 'down'));
});

test('the red rows are the apps behind each estate\'s degraded connection', () => {
  const down = (view) => vals(at(view)).pathFlowRows.filter(r => r.state === 'down').map(r => r.tag).sort();
  assert.deepEqual(down('partial'), ['finance']);
  assert.deepEqual(down('mature'), ['analytics', 'prod']);
  assert.deepEqual(down('trust'), ['finance-invoices', 'internet-facing', 'pci']);
});

test('the tiles count what the grid and the list show', () => {
  const v = vals(at('partial'));
  const t = Object.fromEntries(v.healthTiles.map(x => [x.l, x.v]));
  assert.equal(t['Apps healthy'], `${v.pathFlowAll.filter(r => r.state === 'ok').length} of ${v.pathFlowAll.length}`);
  assert.equal(t.Down, '1');
  assert.equal(t.Alerts, v.queueCount);
});

test('Growing: the first problem reads as the stakeholder wrote it', () => {
  const p = vals(at('partial')).problemRows[0];
  assert.equal(p.where, 'Azure eastus');
  assert.equal(p.thing, 'ExpressRoute');
  assert.match(p.what, /BGP flapping/);
  assert.equal(p.ownerLabel, 'Cloud provider');
  assert.match(p.appsF, /^1 app · 40 workloads$/);
  assert.equal(p.startedF, 'Started 09:38 · 22 min');
  assert.equal(p.changeF, '1 route change at 09:35');
});

test('Alerts opens Health; the old drawer is gone', () => {
  const c = at('partial', { obPanel: 'map' });
  vals(c).openQueue();
  assert.equal(c.state.obPanel, 'health');
  assert.ok(!HTML.includes('aria-label="Queue"'));
});

test('Open ticket moves the incident to In progress with a ticket, and it holds', () => {
  const c = at('partial');
  vals(c).problemRows[0].ticket();
  const life = c.state.findingLife.partial['an-link-eastus'];
  const last = life.events[life.events.length - 1];
  assert.equal(last.state, 'progress');
  assert.match(last.note, /^Ticket T-\d{4} opened, routed to Cloud provider$/);
  assert.match(vals(c).problemRows[0].ticketF, /^T-\d{4} · In progress$/);
  c.setState({ obPage: 'insights', insPanel: 'findings', findFilter: 'all' });
  assert.equal(vals(c).findAll.find(r => r.key === 'an-link-eastus').stateLabel, 'In progress');
});

// Trace opens Paths since 2026-09-30 (Task 3.3: "Trace re-points to Paths"); the region still rides along for the map.
// 2026-09-30 final review, finding 6: the region no longer rides along. Trace set mapRegion
// silently, so Traffic came back filtered to the problem's region; it lands on Paths only.
test('Trace opens the problem on Paths, and leaves the map unfiltered', () => {
  const c = at('partial');
  vals(c).problemRows[0].trace();
  assert.equal(c.state.obPanel, 'paths');
  assert.equal(c.state.pathSel, 'finance|eastus');
  assert.equal(c.state.mapRegion ?? null, null);
});

test('Home\'s Observe door and Help\'s Support Tickets land on Health', () => {
  const home = mkC({ view: 'partial', estateParam: null, screen: 's0', nowIso: NOW });
  vals(home).rollup.find(r => r.key === 'observe').go();
  assert.equal(home.state.obPanel, 'health');
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', tab: 'connect' }));
  assert.ok(!/Support Tickets/.test(v.helpSoonLine), v.helpSoonLine);
});

test('words, not codes, on the Health tab', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const v = vals(at(view));
    const text = JSON.stringify([v.pathFlowRows.map(r => r.cells.map(c => c.title)), v.problemRows.map(p => [p.where, p.thing, p.what])]);
    assert.ok(!/\b(ER|DX|EQX)\b/.test(text) && !/fabric/i.test(text.replace(/(AI|Equinix) Fabric/g, '')), view);
  }
});
