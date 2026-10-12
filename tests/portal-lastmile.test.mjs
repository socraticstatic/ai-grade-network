import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, init, defaults, lastmile } from '../naas-portal-app.js';
import * as P from '../naas-portal.js';

// Last mile (spec section 4): one row per circuit, grouped by network then state, paged to the fold. Level one is
// the networks; a network opens its circuits with the state named once per group. State B adds health, peak, p95.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };
const HTML = readFileSync(new URL('../portal.dc.html', import.meta.url), 'utf8');
const mkC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };
const at = (fixture, stateB, extra = {}) => mkC({ fixture, stateB, page: 'lastmile', ...extra });
const labels = (cols) => cols.filter(c => c.present).map(c => c.label);

test('the head counts the estate; the network level is paged to the fold with No network last', () => {
  const c = at('scale', true); const v = vals(c);
  assert.deepEqual([v.counts.circuits, v.counts.networks], ['3,000', '30']);
  assert.equal(v.lm.level, 'networks'); assert.equal(v.lm.rows.length, v.lm.pageRows); assert.ok(v.lm.pageRows >= 12 && v.lm.pageRows <= 18, `pageRows ${v.lm.pageRows}`);
  assert.equal(v.lm.pager, `1–${v.lm.pageRows} of 31`); assert.equal(v.lm.hasPrev, false); assert.equal(v.lm.hasNext, true);
  const counts = v.lm.rows.map(r => r.circuits); assert.deepEqual(counts, [...counts].sort((a, b) => b - a), 'biggest networks first');
  v.lm.next(); const w = vals(c); assert.equal(w.lm.pager, `${w.lm.pageRows + 1}–${Math.min(31, 2 * w.lm.pageRows)} of 31`);
  while (vals(c).lm.hasNext) vals(c).lm.next();
  const last = vals(c); assert.equal(last.lm.rows.at(-1).name, 'No network'); assert.equal(last.lm.hasNextOff, true);
});

test('state A columns at the network level, and the two state B adds', () => {
  assert.deepEqual(labels(vals(at('scale', false)).lm.cols), ['Network', 'Service', 'Circuits', 'Sites', 'States', 'Bandwidth']);
  assert.deepEqual(labels(vals(at('scale', true)).lm.cols), ['Network', 'Service', 'Circuits', 'Sites', 'States', 'Bandwidth', 'Down', 'p95']);
  assert.deepEqual(labels(vals(at('calloway', true)).lm.cols), ['Network', 'Service', 'Circuits', 'Sites', 'States', 'Bandwidth'], 'Calloway carries no maybe fields even in state B');
});

test('a network opens its circuits grouped by state, the state named once per group, with a trail back', () => {
  const c = at('calloway', false); const v = vals(c);
  v.lm.rows[0].go(); const w = vals(c);
  assert.equal(w.lm.level, 'circuits'); assert.deepEqual(w.lm.trail.map(t => t.label), ['Last mile', v.lm.rows[0].name]);
  assert.deepEqual(labels(w.lm.cols), ['State', 'Site', 'Address', 'Service', 'Bandwidth']);
  const states = w.lm.rows.map(r => r.state); assert.deepEqual(states, [...states].sort());
  const shown = w.lm.rows.map(r => r.stateText); assert.equal(shown[0], states[0]);
  for (let i = 1; i < shown.length; i++) assert.equal(shown[i], states[i] === states[i - 1] ? '' : states[i], `row ${i}`);
  w.lm.trail[0].go(); assert.equal(vals(c).lm.level, 'networks');
});

test('state B adds Health, Peak and p95 to the circuit rows; an absent cell reads a dash, never undefined', () => {
  const data = { circuits: [
    { siteId: 'DAL-001', address: { city: 'Dallas', state: 'TX' }, network: { id: 'N1', name: 'Net one' }, service: 'AVPN', bandwidthMbps: 1000, health: 'ok', peakMbps: 800, p95Mbps: 600 },
    { siteId: 'AUS-001', address: { city: 'Austin', state: 'TX' }, network: { id: 'N1', name: 'Net one' }, service: 'AVPN', bandwidthMbps: 500, health: 'down' },
  ] };
  const s = { ...defaults(), stateB: true, trail: ['N1'], lmPage: 0 };
  const lm = lastmile(data, s, () => {});
  assert.deepEqual(labels(lm.cols), ['State', 'Site', 'Address', 'Service', 'Bandwidth', 'Health', 'Peak', 'p95']);
  const cell = (row, key) => row.cells.find(x => x.key === key).text;
  const dal = lm.rows.find(r => r.siteId === 'DAL-001'), aus = lm.rows.find(r => r.siteId === 'AUS-001');
  assert.equal(cell(dal, 'p95Mbps'), '600 Mbps'); assert.equal(cell(aus, 'p95Mbps'), '–'); assert.equal(cell(aus, 'peakMbps'), '–');
  assert.equal(cell(aus, 'health'), 'Down'); assert.equal(cell(dal, 'bandwidthMbps'), '1 Gbps');
  assert.ok(!JSON.stringify(lm.rows).includes('undefined'));
});

test('the markup renders the table from cols and cells with no sc-for inside a real table', () => {
  const a = HTML.indexOf('aria-label="Last mile"'), blk = HTML.slice(a, HTML.indexOf('</section>', a));
  assert.match(blk, /<sc-for list="\{\{ lm\.cols \}\}" as="col"/); assert.match(blk, /<sc-for list="\{\{ lm\.rows \}\}" as="row"/); assert.match(blk, /<sc-for list="\{\{ row\.cells \}\}" as="cell"/);
  assert.ok(blk.includes('{{ lm.pager }}') && blk.includes('{{ lm.prev }}') && blk.includes('{{ lm.next }}'));
  assert.equal(blk.includes('<table'), false);
});
