import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "People may not know to click to expand the elements" (Micah, 2026-09-28).
// Every card that opens says so: a pill with what is inside, which reads Open
// on hover; the folded stacks carry a +; a first visit gets one hint, once.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const at = (patch = {}) => mkC({ view: 'partial', screen: 's3', tab: 'connect', estateParam: null, ...patch });

test('a region card that opens carries a pill with how many sites it holds', () => {
  const sites = vals(at()).heroSites.filter(x => !x.more);
  assert.ok(sites.length === 5);
  for (const x of sites) { assert.equal(x.hasPill, true, x.name); assert.equal(x.pillN, '5', x.name); }
});

test('a cloud card carries a pill with how many regions it holds', () => {
  const c = vals(at()).heroClouds.find(x => x.cloud === 'AWS');
  assert.equal(c.hasPill, true);
  assert.equal(c.pillN, '3');
});

test('the pill reads Open on hover, and the card lights; the markup carries both', () => {
  assert.match(HTML, /\.open-card:hover \.open-word\{display:inline\}/);
  assert.match(HTML, /\.open-card:hover \.card-rect\{stroke:var\(--border-active\)/);
  for (const a of ['s', 'cc', 'r']) assert.match(HTML, new RegExp(`class="open-pill"><span class="open-n">\\{\\{ ${a}\\.pillN \\}\\}`));
});

test('a first visit gets one hint; opening anything or dismissing it retires it', () => {
  const c = at();
  assert.equal(vals(c).showOpenHint, true);
  vals(c).heroSites[0].click();
  assert.equal(c.state.openHintSeen, true);
  c.state.drill = [];
  assert.equal(vals(c).showOpenHint, false, 'the hint came back after the first open');
  const d = at();
  vals(d).dismissOpenHint();
  assert.equal(vals(d).showOpenHint, false);
});

test('the folded Access and Edge stacks carry a + that says they open', () => {
  const a = HTML.indexOf("onClick=\"{{ ft.open }}\"");
  assert.match(HTML.slice(a, a + 1500), /class="fold-plus"/);
});
