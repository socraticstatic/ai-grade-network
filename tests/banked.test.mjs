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

// Banked joined Spend (Micah, 2026-09-29: "combine savings and forecast with
// spend"): the old Banked door lands on Spend, which carries the same figures.
test('Spend carries what acting banked: the running total and twelve months of it', () => {
  const v = vals(cost());
  assert.equal(v.costPanelSpend, true, 'the Banked door lands on Spend');
  assert.deepEqual(v.bankTiles.map(t => t.l), ['Banked to date', 'This month', 'Still open', 'Realised']);
  assert.equal(v.spendTiles.find(t => t.l === 'Banked to date').v, v.bankTiles.find(t => t.l === 'Banked to date').v);
  assert.equal(v.bankBars.length, 12);
  assert.match(v.bankBars[11].title, /^Sep 2026 · \$[\d,]+ banked · \$[\d,]+ to date$/);
  const past = v.spendCols.filter(c => c.kind === 'past');
  assert.equal(past.length, 12);
  assert.match(past[11].title, /^Sep 2026 · spent \$[\d,]+ · banked \$[\d,]+ by acting$/);
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

test('nothing banked, nothing stacked on the spend', () => {
  const v = vals(cost('small'));
  assert.equal(v.costPanelSpend, true);
  assert.ok(!v.costPanels.some(p => p.key === 'banked'));
  assert.ok(v.spendCols.filter(c => c.kind === 'past').every(c => c.topN === 0));
});

test('the rail has no Savings door; Spend opens the view savings live in', () => {
  const c = cost('partial', { tab: 'connect', costPanel: 'money' });
  assert.ok(!vals(c).railGroups.flatMap(g => g.items).some(i => i.label === 'Savings'));
  vals(c).railGroups.flatMap(g => g.items).find(i => i.label === 'Spend').go();
  assert.equal(c.state.costPanel, 'spend');
  assert.equal(vals(c).railGroups.flatMap(g => g.items).find(i => i.label === 'Spend').cur, true);
});

test('the markup draws banked savings on the Spend chart, behind the Spend gate', () => {
  const a = HTML.indexOf('<sc-if value="{{ costPanelSpend }}"');
  assert.ok(a > 0);
  assert.match(HTML.slice(a, a + 5000), /<sc-for list="\{\{ spendCols \}\}"/);
  assert.equal(HTML.indexOf('costPanelBanked'), -1);
});
