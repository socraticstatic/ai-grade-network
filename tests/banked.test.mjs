import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "A running total of what the customer actually banked after acting, not just
// potential savings ... how much AT&T is saving over the time" (notes, 2026-09-29).

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const cost = (view = 'partial', patch = {}) => mkC({ view, screen: 's3', tab: 'cost', costPanel: 'banked', estateParam: null, ...patch });
const money = (s) => +String(s).replace(/[^\d]/g, '');

test('Cost carries a Banked view with four figures and twelve months', () => {
  const v = vals(cost());
  assert.ok(v.costPanels.some(p => p.key === 'banked' && p.label === 'Banked'));
  assert.equal(v.costPanelBanked, true);
  assert.deepEqual(v.bankTiles.map(t => t.l), ['Banked to date', 'This month', 'Still open', 'Realised']);
  assert.equal(v.bankBars.length, 12);
  assert.match(v.bankBars[11].title, /^Sep 2026 · \$[\d,]+ banked · \$[\d,]+ to date$/);
});

test('the running total never falls', () => {
  const h = vals(cost()).bankBars.map(b => parseFloat(b.h));
  for (let i = 1; i < h.length; i++) assert.ok(h[i] >= h[i - 1], `${i}`);
});

test('Still open is the figure the Observe head calls potential savings', () => {
  const v = vals(cost());
  const so = v.bankTiles.find(t => t.l === 'Still open');
  assert.equal(so.v + so.u, '$41,500/mo');
  assert.match(vals(cost('partial', { tab: 'observe' })).pageVerdict, /\$41,500\/mo potential savings/);
});

test('resolving a priced finding raises this month by its saving', () => {
  const c = cost();
  const before = money(vals(c).bankTiles.find(t => t.l === 'This month').v);
  c.state.fdKey = 'avoidable';
  vals(c).fd.actions.find(a => a.label === 'Mark resolved').go();
  const after = money(vals(c).bankTiles.find(t => t.l === 'This month').v);
  assert.equal(after - before, 23200);
});

test('nothing banked, no Banked view', () => {
  const v = vals(cost('small', { costPanel: 'money' }));
  assert.ok(!v.costPanels.some(p => p.key === 'banked'));
  assert.equal(vals(cost('small')).costPanelBanked, false, 'a stale panel falls back');
});

test('the rail Savings item opens Banked', () => {
  const c = cost('partial', { tab: 'connect', costPanel: 'money' });
  const item = vals(c).railGroups.flatMap(g => g.items).find(i => i.label === 'Savings');
  item.go();
  assert.equal(c.state.costPanel, 'banked');
  assert.equal(vals(c).railGroups.flatMap(g => g.items).find(i => i.label === 'Savings').cur, true);
});

test('the markup draws the Banked bars behind their own gate', () => {
  const a = HTML.indexOf('<sc-if value="{{ costPanelBanked }}"');
  assert.ok(a > 0);
  assert.match(HTML.slice(a, a + 5000), /<sc-for list="\{\{ bankBars \}\}"/);
});
