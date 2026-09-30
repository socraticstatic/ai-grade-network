import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "We had a fantastic Insights section. Where did it go?" (Micah, 2026-09-28).
// Iteration 2 (2026-09-09, after Ramesh's review) took the six cards off
// Observe to start with less; the view model stayed and nothing rendered it.
// They came back on the Insights page. On 2026-09-30 ("Observe insights is
// light"; "the previous insights in the last one yesterday were really good")
// Signals became nine cards in one loop, the six plus Health, Capacity and
// Spend; tests/signals.test.mjs walks every door they open.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
// Insights became an Observe page on 2026-09-28 ("it needs to be a page").
const panel = () => { const a = HTML.indexOf('<sc-if value="{{ obIsInsights }}"'); return HTML.slice(a, HTML.indexOf('<sc-if value="{{ obIsPerf }}"', a)); };
const SIX = ['Top talkers', 'New destinations', 'Shadow SaaS', 'Egress growth', 'Cloud-to-cloud paths', 'Latency over SLO'];
const observe = (patch = {}) => mkC({ view: 'mature', screen: 's3', tab: 'observe', estateParam: null, obPage: 'insights', ...patch });

test('the Insights page carries yesterday\'s six cards and three more, behind their own gate', () => {
  const p = panel();
  assert.match(p, /<sc-if value="\{\{ sigGrid \}\}"/);
  assert.match(p, /<sc-for list="\{\{ sigCards \}\}" as="sg"/);
  const titles = vals(observe()).sigAll.map(x => x.title);
  for (const name of SIX) assert.ok(titles.some(t => t.startsWith(name)), `${name} is missing from ${titles.join(', ')}`);
  for (const name of ['Health', 'Capacity', 'Spend by bucket']) assert.ok(titles.includes(name), name);
});

test('every card has rows to show on a customer with traffic', () => {
  const v = vals(observe());
  assert.equal(v.obIsInsights, true);
  assert.equal(v.hasIw, true);
  for (const k of ['talkers', 'newDest', 'shadow', 'slo']) assert.ok(v.iw[k].length > 0, k);
  assert.ok(v.iw.multi.rows.length > 0);
  assert.ok(v.iw.growth.weeks.length > 0);
  for (const x of v.sigAll) assert.ok(x.isCols ? x.cols.length === 12 : x.rows.length > 0, x.key);
});

test('a customer with no traffic yet gets no cards, not empty ones', () => {
  const v = vals(observe({ view: 'empty' }));
  assert.equal(v.hasIw, false);
  assert.deepEqual(v.sigCards, []);
});

test('the cards paint from theme tokens, so dark mode recolours them', () => {
  const v = vals(observe());
  const fills = [...v.iw.talkers, ...v.iw.newDest, ...v.iw.shadow, ...v.iw.slo, ...v.iw.multi.rows].map(r => r.fill);
  for (const f of fills) assert.match(f, /^var\(--/, `hard-coded fill ${f}`);
  const cards = panel().slice(0, panel().indexOf('id="sec-insights"'));
  assert.doesNotMatch(cards, /background:#[0-9a-f]{3,6}/i, 'a legend swatch is hard-coded');
});

test('standing findings show even in a window with no events', () => {
  const p = panel();
  assert.doesNotMatch(p, /<sc-if value="\{\{ hasAnomalies \}\}"/, 'the findings card hides whenever the window is quiet');
});

test('Observe on the rail offers Insights, and it opens the page', () => {
  const c = mkC({ view: 'mature', screen: 's3', tab: 'observe', estateParam: null });
  const g = vals(c).railGroups.find(x => x.title === 'Observe');
  const link = g.items.find(i => i.label === 'Insights');
  assert.ok(link, `Observe offers ${g.items.map(i => i.label).join(', ')}`);
  link.go();
  assert.equal(vals(c).obIsInsights, true);
  assert.equal(c.state.sub, null, 'a page, not a drawer');
});

// The Sep 8 buttons set obTab, which nothing has rendered since the Observe
// rebuild: three dead doors. Each card's title now opens its whole list, and
// leaving the page closes any drawer.
test('every card title leads somewhere, and leaving closes the drawer', () => {
  for (const x of vals(observe()).sigAll) {
    const c = observe({ sub: { page: 'observe', panel: 'x' } });
    vals(c).sigAll.find(y => y.key === x.key).open();
    const st = c.state;
    const inPlace = st.sigOpen === x.key && st.obPage === 'insights';
    assert.ok(inPlace || st.sub === null, `${x.key} left the page with the drawer open`);
    assert.ok(inPlace || st.obPage !== 'insights' || st.tab !== 'observe', `${x.key}: the title opens nothing`);
  }
});

test('Logs is a page of its own, named as the rail names it', () => {
  const v = vals(observe({ obPage: 'logs' }));
  assert.equal(v.obIsLogsPage, true);
  assert.equal(v.obIsPerf, false);
});

// "It needs to be visualization drill to findings" (Micah, 2026-09-28).
test('each card drills to the findings behind it, and the focus clears', () => {
  const c = observe();
  const v = vals(c);
  const growth = v.sigAll.find(x => x.key === 'growth');
  assert.ok(growth.finds.n > 0);
  growth.finds.go();
  const f = vals(c);
  assert.equal(f.hasInsFocus, true);
  assert.equal(f.insFocusLabel, 'Egress growth · 12 weeks');
  // The drill lands on the actionable findings and events behind the card (notes, 2026-09-29).
  assert.ok(f.insightRows.length === growth.finds.n && f.insightRows.every(r => ['avoidable', 'ipsecegress', 'an-egress'].includes(r.key)), f.insightRows.map(r => r.key).join(','));
  f.clearInsFocus();
  assert.equal(vals(c).hasInsFocus, false);
  assert.match(HTML, /onClick="\{\{ sg\.finds\.go \}\}"/);
});
