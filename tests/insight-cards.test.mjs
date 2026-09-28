import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "We had a fantastic Insights section. Where did it go?" (Micah, 2026-09-28).
// Iteration 2 (2026-09-09, after Ramesh's review) took the six cards off
// Observe to start with less; the view model stayed and nothing rendered it.
// They come back in the Observe drawer's Insights panel, where they cost the
// page nothing, above the events and standing findings.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const panel = () => { const a = HTML.indexOf('<sc-if value="{{ subIsInsights }}"'); return HTML.slice(a, HTML.indexOf('<sc-if value="{{ subIsLogs }}"', a)); };
const CARDS = ['Top talkers', 'New destinations', 'Shadow SaaS', 'Egress growth', 'Cloud-to-cloud paths', 'Latency over SLO'];
const observe = (patch = {}) => mkC({ view: 'mature', screen: 's3', tab: 'observe', estateParam: null, sub: { page: 'observe', panel: 'insights' }, ...patch });

test('the Insights panel carries the six cards, behind their own gate', () => {
  const p = panel();
  assert.match(p, /<sc-if value="\{\{ hasIw \}\}"/);
  for (const name of CARDS) assert.ok(p.includes(`aria-label="${name}"`), `${name} is missing from the panel`);
});

test('every card has rows to show on a customer with traffic', () => {
  const v = vals(observe());
  assert.equal(v.subIsInsights, true);
  assert.equal(v.hasIw, true);
  for (const k of ['talkers', 'newDest', 'shadow', 'slo']) assert.ok(v.iw[k].length > 0, k);
  assert.ok(v.iw.multi.rows.length > 0);
  assert.ok(v.iw.growth.weeks.length > 0);
});

test('a customer with no traffic yet gets no cards, not empty ones', () => {
  assert.equal(vals(observe({ view: 'empty' })).hasIw, false);
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

test('Observe on the rail offers Insights, and it opens the panel', () => {
  const c = mkC({ view: 'mature', screen: 's3', tab: 'observe', estateParam: null });
  const g = vals(c).railGroups.find(x => x.title === 'Observe');
  const link = g.items.find(i => i.label === 'Insights');
  assert.ok(link, `Observe offers ${g.items.map(i => i.label).join(', ')}`);
  link.go();
  assert.equal(vals(c).subIsInsights, true);
});

// The Sep 8 buttons set obTab, which nothing has rendered since the Observe
// rebuild: three dead doors. Each now lands somewhere, and leaving closes the drawer.
test('every card button leads somewhere, and leaving closes the drawer', () => {
  const fire = (k) => { const c = observe(); vals(c).iw[k](); return { st: c.state, v: vals(c) }; };
  assert.equal(fire('talkersGo').v.subIsLogs, true);
  for (const [k, mode] of [['multiGo', 'state'], ['sloGo', 'slo']]) {
    const { st } = fire(k);
    assert.equal(st.sub, null, k); assert.equal(st.mapMode, mode, k); assert.equal(st.scrollToSec, 'sec-flow', k);
  }
  for (const [k, tab] of [['newDestGo', 'govern'], ['shadowGo', 'govern'], ['growthGo', 'cost']]) {
    const { st } = fire(k);
    assert.equal(st.sub, null, k); assert.equal(st.tab, tab, k);
  }
  const { st } = (() => { const c = observe(); vals(c).iw.shadow[0].go(); return { st: c.state }; })();
  assert.equal(st.sub, null); assert.equal(st.tab, 'govern');
});

test('the drawer names Records as the rail does', () => {
  assert.deepEqual(vals(observe()).subTabs.map(t => t.label), ['Insights', 'Records']);
});
