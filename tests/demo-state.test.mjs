import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, DEMO_KEYS } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Demo-state hygiene (2026-09-30 notes plan, Task 0.2). Switching Estate under
// a By pick drew an empty map with a phantom "Internet 1.0 Gbps", and nothing
// cleared what rehearsal saved: the stakeholder's att8 read 11 findings open
// where a clean Growing reads 12.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const observe = (patch = {}) => mkC({ estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch });

test('switching estate under a By pick draws the new estate whole', () => {
  const c = observe({ view: 'mature' });
  vals(c).scopeDims.find(d => d.label.startsWith('By cloud')).go();
  vals(c).scopeMembers.find(m => m.label.startsWith('CoreWeave')).go();
  c.setState({ cloudTrailE: ['cloud:Azure', 'region:westeurope'], placeTrail: ['region:US East'], cloudPage: 2, placePage: 1 });
  vals(c).setView({ target: { value: 'partial' } });
  assert.equal(c.state.obScope, 'all');
  assert.equal(c.state.obDim, 'all');
  assert.deepEqual(c.state.mapOpen, []);
  assert.equal(c.state.mapSel, null);
  assert.equal(c.state.mapRegion, null);
  assert.deepEqual(c.state.cloudTrailE, []);
  assert.deepEqual(c.state.placeTrail, []);
  assert.equal(c.state.cloudPage, 0);
  assert.equal(c.state.placePage, 0);
  const v = vals(c);
  assert.ok(v.mapNodes.some(n => n.side === 'r'), 'the destinations are drawn');
  assert.ok(!v.mapNodes.some(n => /Internet/.test(n.label || '') && /1\.0 Gbps/.test(n.vF || '')), 'no phantom Internet 1.0 Gbps');
});

test('Reset demo clears every saved key and the head reads a clean estate', () => {
  const c = observe({ view: 'partial', obPage: 'insights', insPanel: 'findings' });
  vals(c).findAll.find(r => r.key === 'crosscloud').open();
  vals(c).fd.actions.find(a => a.label === 'Snooze 7 days').go();
  store['naas.tags'] = JSON.stringify({ siteTags: { x: 'HQ' }, buCustom: {} });
  store['naas.hero'] = '{}'; store['naas.openHint'] = 'seen';
  assert.match(vals(c).pageVerdict, /^11 findings open\./);
  vals(c).resetDemo();
  for (const k of DEMO_KEYS) assert.equal(store[k], undefined, k);
  assert.deepEqual(c.state.findingLife, {});
  assert.deepEqual(c.state.siteTags, {});
  assert.match(vals(c).pageVerdict, /^12 findings open\./);
});

test('DEMO_KEYS names every naas.* key the app saves', () => {
  const src = readFileSync(new URL('../naas-app.js', import.meta.url), 'utf8');
  const saved = [...new Set([...src.matchAll(/localStorage\.setItem\('(naas\.[\w.]+)'/g)].map(m => m[1]))];
  for (const k of saved) assert.ok(DEMO_KEYS.includes(k), k);
});

test('the rail foot carries Reset demo beside the Estate select', () => {
  const foot = HTML.slice(HTML.indexOf('aria-label="View as"'), HTML.indexOf('aria-label="Toggle theme"'));
  assert.match(foot, /onClick="\{\{ resetDemo \}\}"[^>]*>Reset demo</);
});
