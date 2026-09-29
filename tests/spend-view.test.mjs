import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "combine savings and forecast with spend" (Micah, 2026-09-29). Cost opens on
// one Spend view: what you spend, what acting has banked, what the moves would
// save, and where it is going, on one chart. The breakdowns stay tabs.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const cost = (view = 'partial', patch = {}) => mkC({ view, screen: 's3', layer: 'cloud', tab: 'cost', estateParam: null, ...patch });
const money = (s) => +String(s).replace(/[^0-9.]/g, '');
const rail = (c) => vals(c).railGroups.flatMap(g => g.items);

test('Cost opens on Spend; Savings and Forecast are in it, not beside it', () => {
  const v = vals(cost());
  assert.deepEqual(v.costPanels.map(p => p.label), ['Spend', 'By region', 'By destination', 'By first mile', 'By bucket', 'AT&T charges']);
  assert.equal(v.costPanelSpend, true);
  assert.deepEqual(v.spendTiles.map(t => t.l), ['Spend this month', 'Banked to date', 'Could save', 'In 90 days']);
});

test('the rail has one Cost door, Spend, and it lights on the Spend view', () => {
  const c = cost('partial', { tab: 'connect' });
  const items = rail(c).filter(i => ['Spend', 'Savings', 'Forecast'].includes(i.label)).map(i => i.label);
  assert.deepEqual(items, ['Spend']);
  rail(c).find(i => i.label === 'Spend').go();
  assert.equal(c.state.tab, 'cost');
  assert.equal(vals(c).costPanelSpend, true);
  assert.equal(rail(c).find(i => i.label === 'Spend').cur, true);
});

test('old doors to Banked and Forecast land on Spend', () => {
  for (const k of ['banked', 'forecast']) assert.equal(vals(cost('partial', { costPanel: k })).costPanelSpend, true, k);
});

test('the figures agree with the rest of the page', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const v = vals(cost(view));
    const t = Object.fromEntries(v.spendTiles.map(x => [x.l, x.v]));
    assert.equal(t['Banked to date'], v.bankTiles.find(x => x.l === 'Banked to date').v, view);
    assert.equal(money(t['Could save']), Math.round(money(v.arbTotal) / 100) * 100, `${view}: ${t['Could save']} vs ${v.arbTotal}`);
    const last = v.spendCols.filter(c => c.kind === 'past').at(-1);
    assert.equal(money(t['Spend this month']), last.spendN, `${view}: this month is the last bar`);
    const n3 = v.spendCols.filter(c => c.kind === 'next').at(-1);
    assert.equal(money(t['In 90 days']), Math.round(n3.movedN / 100) * 100);
    for (const x of v.spendTiles.filter(x => x.v.startsWith('$'))) assert.equal(money(x.v) % 100, 0, `${view} ${x.l} ${x.v}`);
  }
});

test('one chart: twelve months banked on top of spend, three months ahead with the moves against as is', () => {
  const v = vals(cost('partial'));
  const past = v.spendCols.filter(c => c.kind === 'past'), next = v.spendCols.filter(c => c.kind === 'next');
  assert.equal(past.length, 12); assert.equal(next.length, 3);
  assert.ok(past.some(c => c.topN > 0), 'banked savings show');
  assert.ok(next.every(c => c.topN > 0 && c.baseN > 0), 'the moves save something every month ahead');
  for (const c of v.spendCols) { assert.ok(parseFloat(c.baseH) + parseFloat(c.topH) <= 100.01, c.key); assert.match(c.title, /\$/); }
  assert.deepEqual(v.spendLegend.map(l => l.label), ['Spend', 'Banked savings', 'With the moves', 'Could save']);
});

test('the markup: one Spend panel with the chart and the savings list; commitments live with AT&T charges', () => {
  const a = HTML.indexOf('<sc-if value="{{ costPanelSpend }}"');
  assert.ok(a > 0);
  const panel = HTML.slice(a, HTML.indexOf('</sc-if>\n    <!--', a) > 0 ? HTML.indexOf('</sc-if>\n    <!--', a) : a + 9000);
  assert.match(panel, /aria-label="Spend, savings and forecast"/);
  assert.match(panel, /<sc-for list="\{\{ spendCols \}\}"/);
  assert.match(panel, /<sc-for list="\{\{ saveRows \}\}"/);
  for (const g of ['costPanelBanked', 'costPanelForecast']) assert.equal(HTML.indexOf(g), -1, g);
  const ch = HTML.indexOf('<sc-if value="{{ costPanelCharges }}"');
  assert.ok(HTML.slice(ch, ch + 6000).includes('aria-label="Committed vs metered on-ramps"'));
});
