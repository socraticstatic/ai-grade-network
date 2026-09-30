import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import { connectVerdict, governVerdict } from '../naas-verdicts.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Assess ruthlessly for consistency across UI elements, including filters and
// headers/subheaders" (Micah, 2026-09-29). Each rule here was broken somewhere.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const between = (from, to) => { const a = HTML.indexOf(from); return HTML.slice(a, HTML.indexOf(to, a)); };

test('a page is titled by its group, whichever view of it is open', () => {
  assert.equal(vals(mkC({ view: 'partial', screen: 's1', discoverView: 'sources', estateParam: null })).s1Title, 'Discover');
  for (const screen of ['s4', 's5', 's6']) assert.equal(vals(mkC({ view: 'partial', screen, estateParam: null })).pageTitle, 'Connect', screen);
});

test('every verdict is a sentence that ends with a period, and none says zero of anything', () => {
  for (const est of Object.values(D.ESTATES)) {
    for (const v of [connectVerdict(est), governVerdict(est)]) {
      assert.match(v, /\.$/, v);
      assert.ok(!/(^|\s)0 (are|is|of)\b/.test(v), v);
    }
  }
  assert.equal(connectVerdict(D.ESTATES.small), '2 of 2 regions still ride the public internet. None is on the AT&T network yet.');
});

test('health never reads "0 of 0"', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const h = vals(mkC({ view, screen: 's3', tab: 'connect', estateParam: null })).fabricHealth;
    assert.ok(h.every(x => !/^0 of 0/.test(x.text)), `${view}: ${h.map(x => x.text).join(' · ')}`);
  }
});

test('one time-window control, the same everywhere: a labelled Since select', () => {
  const tr = between('<sc-if value="{{ ownsTelemetry }}"', '</sc-if>');
  assert.match(tr, /<label class="fx-filter"><span class="fx-label">Since<\/span><select class="fx-select" value="\{\{ rangeValue \}\}"/);
  assert.match(HTML, /<span class="fx-label">Since<\/span><select class="fx-select" value="\{\{ rangeValue \}\}" onChange="\{\{ setRange \}\}" aria-label="Discovery window">/);
});

test('every tab row is an underline tab row, Logs included', () => {
  const lk = between('aria-label="Log kind"', '</sc-for>');
  assert.match(lk, /border-bottom:2px solid \{\{ lt\.line \}\}/);
  const v = vals(mkC({ view: 'partial', screen: 's3', tab: 'observe', obPage: 'logs', estateParam: null }));
  assert.ok(v.logTabs.every(t => t.line && t.weight));
});

test('a card does not repeat the tab above it, and says each count once', () => {
  const f = between('<div id="sec-insights"', '<sc-if value="{{ hasInsights }}"');
  assert.ok(!f.includes('fx-card-title">Findings<'), 'Findings card repeats its tab');
  assert.ok(!f.includes('{{ insightCount }}'), 'Findings count said three times');
  const b = between('aria-label="Business units" style', '</sc-for>');
  assert.ok(!b.includes('fx-card-title">Business units<'), 'Business units card repeats its tab');
});

test('a row of cards acts with outline buttons; filled blue is for the one main move', () => {
  const f = between('<sc-for list="{{ insightRows }}"', '</sc-for>');
  assert.match(f, /<button class="fx-btn" onClick="\{\{ ins\.open \}\}"/);
});

test('the AT&T network is never "fabric", and rates name whose rate they are', () => {
  assert.ok(!/>Fabric</.test(HTML));
  assert.ok(!/Fabric rate|Hyper\. rate/.test(HTML));
  assert.match(HTML, />Cloud rate</);
  assert.match(HTML, />AT&amp;T rate</);
});

test('money on a tile is whole dollars, as on every other tile', () => {
  const v = vals(mkC({ view: 'partial', screen: 's3', tab: 'observe', estateParam: null }));
  for (const k of ['cost', 'could']) assert.match(v.flowTiles.find(t => t.key === k).v, /^\$[\d,]+$/, k);
  // Could save is what the map's own outside paths could save (2026-09-29): the
  // Cost view's "to save" lines add up to it.
  const cv = vals(mkC({ view: 'partial', screen: 's3', tab: 'observe', estateParam: null, mapMode: 'cost' }));
  const lines = cv.mapNodes.filter(n => n.side === 'm' && /to save/.test(n.pathSay)).reduce((a, n) => a + +n.pathSay.replace(/[^0-9]/g, ''), 0);
  assert.ok(Math.abs(+v.flowTiles.find(t => t.key === 'could').v.replace(/[^0-9]/g, '') - lines) <= 100, `${v.flowTiles.find(t => t.key === 'could').v} vs ${lines}`);
});

test('the live alerts are called alerts, so "open" means findings', () => {
  assert.match(HTML, />Alerts · \{\{ queueCount \}\}</);
  assert.match(vals(mkC({ view: 'partial', screen: 's3', tab: 'observe', estateParam: null })).queueCount, /^\d+$/);
});

test('the order flow is titled Connect, like its group', () => {
  const s4 = between('<!-- ===== S4 COMPOSE ===== -->', '</h1>');
  assert.match(s4, />Connect$/);
});

test('Logs puts its tabs above the card, like every other page, and the card does not repeat the page', () => {
  const logs = between('<sc-if value="{{ obIsLogsPage }}"', 'id="sec-logs"');
  assert.match(logs, /aria-label="Log kind"/);
  assert.ok(!between('id="sec-logs"', 'aria-label="Filters"').includes('fx-card-title">Logs<'));
});

test('Connect\'s map is Your network; Connect is its own page with Options and Ways to connect', () => {
  // "Naas home is called 'Connect'. It needs to be called something else" (Micah, 2026-09-29).
  // Since 2026-09-30 the NaaS home is s0 (tests/home.test.mjs), and its strip carries the
  // four tiles this map used to draw, so Your network keeps its title and draws none.
  const home = vals(mkC({ view: 'partial', screen: 's3', tab: 'connect', estateParam: null }));
  assert.equal(home.pageTitle, 'Your network');
  assert.equal(home.cnShowTabs, false);
  assert.ok(!home.showLaunch);
  const cn = vals(mkC({ view: 'partial', screen: 's3', tab: 'connect', cnPage: 'options', estateParam: null }));
  assert.equal(cn.pageTitle, 'Connect');
  // Orders joined them (2026-09-30, "options and orders is so weird"): the order in
  // progress and the orders placed this session are a Connect page, not a screen of their own.
  // The tab says Recommended, the destination's own name (2026-09-30, Connect navigation); cnPage 'options' keeps old links.
  assert.deepEqual(cn.cnPanels.map(p => p.label), ['Recommended', 'Ways to connect', 'Orders']);
  assert.equal(vals(mkC({ view: 'partial', screen: 's3', tab: 'connect', cnPage: 'orders', estateParam: null })).pageTitle, 'Connect');
  assert.ok(!cn.showLaunch);
});
