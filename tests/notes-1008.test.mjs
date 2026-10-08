import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, navPick } from '../naas-app.js';
import { sparkOf } from '../naas-home.js';
import { HEALTH_FILL_BAR, HEALTH_INK } from '../naas-flowmap.js';
import { mkC } from './harness.mjs';

// A reviewer's notes on the live storefront (forwarded 2026-10-08): "make the bar clickable so only those areas of issues
// can be listed in a table format"; "two red color are so close it will be hard to differentiate"; "there are no units on
// this graph ... we need X and Y axis units"; "for each page, we need to make sure a user can go back to previous page".
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const home = (extra = {}) => mkC({ view: 'partial', estateParam: null, screen: 's0', ...extra });

test('each state on the Apps healthy bar opens App health on just those apps; its chips do too', () => {
  for (const st of ['down', 'slo', 'risk', 'ok']) {
    const c = home();
    const seg = vals(c).homeCards.find(x => x.key === 'apps').bar.find(b => b.key === st);
    assert.ok(seg, st);
    seg.go();
    assert.equal(c.state.tab, 'observe'); assert.equal(c.state.obPanel, 'health'); assert.equal(c.state.healthView, 'cloud'); assert.equal(c.state.appState, st);
    const v = vals(c);
    assert.ok(v.appHealthRows.length > 0 && v.appHealthRows.every(r => r.state === st), `${st}: ${v.appHealthRows.map(r => r.state)}`);
    assert.equal(v.appStateChips.find(x => x.on).key, st);
    assert.equal(+v.appStateChips.find(x => x.on).n, v.appHealthRows.length, 'the chip counts the rows it lists');
  }
  const c = home();
  vals(c).homeCards.find(x => x.key === 'apps').footChips.find(x => x.icon === 'close-circle').go();
  assert.equal(c.state.appState, 'down');
  // All clears the filter; the card's own door opens App health unfiltered.
  vals(c).appStateChips.find(x => x.key === 'all').go();
  assert.equal(c.state.appState, null);
  // Every other card's segments and chips are doors to the card's page.
  for (const card of vals(home()).homeCards) for (const b of card.bar) assert.equal(typeof b.go, 'function', `${card.key} ${b.key}`);
  assert.match(HTML, /<button class="hm-kseg" onClick="\{\{ kb\.go \}\}"/);
  assert.match(HTML, /<button class="kchip btn" onClick="\{\{ kc\.go \}\}"/);
});

test('Over SLO draws in stripes beside Down\'s solid red, wherever the two share a bar', () => {
  assert.equal(HEALTH_FILL_BAR.down, HEALTH_INK.down);
  assert.match(HEALTH_FILL_BAR.slo, /^repeating-linear-gradient\(.*var\(--viz-5\)/);
  const apps = vals(home()).homeCards.find(x => x.key === 'apps');
  assert.match(apps.bar.find(b => b.key === 'slo').ink, /repeating-linear-gradient/);
  assert.equal(apps.bar.find(b => b.key === 'down').ink, 'var(--error)');
});

test('the egress chart carries dollar ticks, time under it, and the 90-day ends', () => {
  const past = [61000, 64000, 68000, 72000, 76000, 80000, 84000, 86000, 87000, 88000, 89000, 89600], asIs = [95000, 100700, 106700], moved = [50900, 54000, 57300];
  const sp = sparkOf(past, asIs, moved);
  assert.ok(sp.yTicks.length >= 2 && sp.yTicks.length <= 5, sp.yTicks.map(t => t.t).join(','));
  for (const t of sp.yTicks) { assert.match(t.t, /^\$\d+(\.\d)?K$/); assert.ok(t.v >= sp.lo && t.v <= sp.hi); }
  assert.deepEqual(sp.xTicks.map(t => t.t), ['12 mo ago', '6 mo ago', 'Today', '+90 days']);
  assert.deepEqual(sp.ends.map(e => e.t), ['$106.7K', '$57.3K']);
  const c = home();
  let v = vals(c);
  assert.equal(v.homeChart.ranges.find(r => r.on).label, '12 mo');
  v.homeChart.ranges.find(r => r.label === '6 mo').go();
  v = vals(c);
  assert.equal(v.homeChart.spark.xTicks[0].t, '6 mo ago');
  assert.match(v.homeChart.note, /last 6 months/);
  assert.match(HTML, /<div class="hm-yax"[^>]*><sc-for list="\{\{ homeChart\.spark\.yTicks \}\}"/);
  assert.match(HTML, /<div class="hm-xax"[^>]*><sc-for list="\{\{ homeChart\.spark\.xTicks \}\}"/);
});

test('Back: shown once there is somewhere to go back to, named for it; a page is remembered by its view and filters', () => {
  assert.equal(vals(home()).backOn, false);
  const v = vals(home({ screen: 's3', layer: 'cloud', tab: 'observe', navDepth: 1, navBack: 'NaaS home' }));
  assert.equal(v.backOn, true);
  assert.equal(v.backLabel, 'Back to NaaS home');
  const snap = navPick({ screen: 's3', layer: 'cloud', tab: 'observe', obPanel: 'health', healthView: 'cloud', appState: 'slo', hoverRegion: 'x', drill: [1] });
  assert.deepEqual(snap, { screen: 's3', layer: 'cloud', tab: 'observe', obPanel: 'health', healthView: 'cloud', appState: 'slo' }, 'only where you are, never hover or drill state');
  assert.equal((HTML.match(/<sc-if value="\{\{ backOn \}\}"[^>]*><button onClick="\{\{ goBack \}\}"/g) || []).length, 2, 'Back in the title row and on the home');
});
