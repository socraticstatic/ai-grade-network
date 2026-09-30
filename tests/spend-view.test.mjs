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

// Cost opens on Optimize since 2026-09-30 (notes: "Cost --> Optimize"); Spend still holds Savings and Forecast.
test('Cost opens on Optimize; Savings and Forecast are in Spend, not beside it', () => {
  const v0 = vals(cost());
  // By leg (2026-09-30, A2): the three cost legs sit beside Spend, which stays egress (D-7).
  assert.deepEqual(v0.costPanels.map(p => p.label), ['Optimize', 'Spend', 'By leg', 'By region', 'By destination', 'By first mile', 'By bucket', 'AT&T charges']);
  assert.equal(v0.costPanelOptimize, true);
  const v = vals(cost('partial', { costPanel: 'spend' }));
  assert.equal(v.costPanelSpend, true);
  assert.deepEqual(v.spendTiles.map(t => t.l), ['Spend this month', 'Banked to date', 'Could save', 'In 90 days']);
});

test('the rail keeps one Spend door, and it lights on the Spend view', () => {
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

// Re-pinned (2026-09-30, "what does the 51k even mean - make the forecast make sense"): a past month is
// On AT&T and Outside AT&T in Cost's colours with banked savings on top; the next three months are two
// lines, as is and if you act, not ghost bars, so the legend names five things instead of four.
test('one chart: twelve months banked on top of spend, three months ahead as is and if you act', () => {
  const v = vals(cost('partial'));
  const past = v.spendCols.filter(c => c.kind === 'past'), next = v.spendCols.filter(c => c.kind === 'next');
  assert.equal(past.length, 12); assert.equal(next.length, 3);
  assert.ok(past.some(c => c.topN > 0), 'banked savings show');
  assert.ok(next.every(c => c.asIsN > c.movedN && c.movedN > 0), 'the moves save something every month ahead');
  for (const c of v.spendCols) { assert.ok(parseFloat(c.attH) + parseFloat(c.outH) + parseFloat(c.topH) <= 100.01, c.key); assert.match(c.title, /\$/); }
  // Re-pinned (2026-09-30, Cost v2): blue says what it is, AT&T's price, never a claim about the network,
  // so an estate with nothing attached is never "On AT&T".
  assert.deepEqual(v.spendLegend.map(l => l.label), ['AT&T price', 'Outside AT&T', 'Banked by acting', 'As is', 'If you act']);
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
  // Re-pinned (2026-09-30, owner decision c): commits are cloud connections, not on-ramps.
  assert.ok(HTML.slice(ch, ch + 6000).includes('aria-label="Committed vs metered cloud connections"'));
});
