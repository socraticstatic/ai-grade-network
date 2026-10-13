import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Govern, visual (Micah, 2026-10-13: "Govern is extremely verbose - make it more visual, more beautiful, more
// amazing"). A finding is its glyph, its count (a door to the set it counts), its kind in a few words, the path it
// breaks as the four-station strip and a compact fix; the sentence lives in a title. A policy row is NetBond's: the
// toggle, the precedence square, the name and its verb badges (the only colour in the row), the match and its count
// as glyphs and numbers, the strip in one ink, the violations as a glyph and a number. Tags and Templates follow.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.history === 'undefined') globalThis.history = { replaceState: () => {} };
if (typeof globalThis.location === 'undefined') globalThis.location = { pathname: '/', search: '', hash: '' };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../storefront.css', import.meta.url), 'utf8');
const GOV = HTML.slice(HTML.indexOf('<!-- Govern -->'), HTML.indexOf('<!-- Observe -->'));
const NOW = '2026-10-05T14:00:00Z';
const ESTATES = ['partial', 'mature', 'trust', 'small', 'empty'];
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', nowIso: NOW, scanStep: 4, ...patch });
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));
const words = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
const lead = (t) => { const m = /^([\d,]+)\b/.exec(String(t || '')); return m ? +m[1].replace(/,/g, '') : null; };
/** The markup between an opening marker and the next closing marker after it. */
const block = (from, to) => { const a = GOV.indexOf(from); assert.ok(a >= 0, `missing: ${from}`); const b = GOV.indexOf(to, a); assert.ok(b > a, `missing after ${from}: ${to}`); return GOV.slice(a, b); };
/** A binding printed as text on the page, not only inside an attribute. */
const printed = (blk, binding) => blk.split(/<[^>]*>/).some(t => t.includes(binding));

test('a finding is a glyph, a count that opens its set, its kind in a few words, the path it breaks and a compact fix', () => {
  let n = 0;
  for (const view of ESTATES) {
    const v = vals(at(view));
    for (const f of v.governFindings) {
      const why = `${view} ${f.kind}`;
      assert.ok(onDisk(f.icon), `${why}: brand/icons/${f.icon}.svg`);
      assert.ok(f.kindWord && words(f.kindWord) <= 4, `${why}: "${f.kindWord}"`);
      const hp = f.headParts[0], num = lead(f.head);
      assert.equal(hp.text, f.head, `${why}: the sentence rides along for the title`);
      if (num != null) { assert.equal(hp.nF, num.toLocaleString('en-US'), why); assert.equal(hp.hasN, true, why); }
      else assert.equal(hp.hasN, false, why);
      assert.deepEqual(f.strip.map(x => x.key), ['site', 'edge', 'core', 'cloud'], why);
      for (const x of f.strip) assert.ok(onDisk(x.icon) && x.title, why);
      assert.ok(f.fix && words(f.fix.label) <= 4, `${why}: the fix reads "${f.fix && f.fix.label}"`);
      assert.equal(f.fix.title, f.rec.title || f.rec.name, why);
      assert.equal(f.fix.go, f.rec.choose, `${why}: the fix is the finding's own move`);
      assert.ok(onDisk(f.fix.icon), `${why}: ${f.fix.icon}`);
      assert.ok(f.where && words(f.where) <= 4, `${why}: "${f.where}"`);
      assert.ok(onDisk(f.whereIcon), why);
      n++;
    }
  }
  assert.ok(n >= 7, `${n} findings`);
});

test('the four AT&T sites on tunnels open as a set, like the IPsec five', () => {
  const v = vals(at('partial'));
  const f = v.governFindings.find(x => x.kind === 'tunnel');
  assert.equal(f.headParts[0].isFig, true, 'the 4 is a door');
  assert.ok(v.govFigs.some(g => g.key === 'g-find-tunnel'), 'it registers, so govern-drill clicks it');
});

test('the findings markup: no sentence on the page, the strip under the station heads, the fix and Andi as compact buttons', () => {
  const blk = block('aria-label="Findings"', '<div id="sec-policies"');
  assert.ok(!printed(blk, '{{ f.head }}') && !printed(blk, '{{ hp.text }}'), 'a finding prints its sentence');
  assert.match(blk, /title="\{\{ f\.head \}\}"/, 'the sentence is the row\'s title');
  assert.match(blk, /<sc-for list="\{\{ f\.strip \}\}" as="fs"/);
  assert.match(blk, /class="ps-heads"/, 'the strip column has its station heads');
  assert.match(blk, /<button class="gvf-tile" onClick="\{\{ hp\.go \}\}"[^>]*><span class="ic s20"[^>]*><\/span>\{\{ hp\.nF \}\}/, 'the count, in its tile, is the door');
  assert.match(blk, /onClick="\{\{ f\.fix\.go \}\}" title="\{\{ f\.fix\.title \}\}"/);
  assert.match(blk, /onClick="\{\{ f\.askAndi \}\}" aria-label="Ask Andi"/);
  assert.ok(!/width:300px/.test(blk), 'the 300px pill is gone');
});

test('a policy row: verbs are the only colour; the match and its count are glyphs and numbers; the strip is one ink', () => {
  for (const view of ESTATES) {
    for (const p of vals(at(view)).polRows) {
      const why = `${view} ${p.name}`;
      assert.ok(p.matchShort && words(p.matchShort) <= 3, `${why}: "${p.matchShort}"`);
      assert.ok(onDisk(p.kindIcon) && onDisk(p.unitIcon), why);
      assert.equal(p.nF, p.matched == null ? '' : Number(p.matched).toLocaleString('en-US'), why);
      assert.equal(p.violN, p.viol ? Number(p.viol).toLocaleString('en-US') : '', why);
      assert.ok(onDisk(p.statusIcon) && p.statusTitle, why);
      for (const l of p.layers) assert.equal(typeof l.broken, 'boolean', why);
    }
  }
  const blk = block('<sc-for list="{{ polRows }}" as="p"', '<sc-if value="{{ polPager.many }}"');
  assert.match(blk, /class="ps mono"/, 'the row strip is the one-ink strip');
  for (const b of ['{{ p.matchedLabel }}', '{{ p.violLabel }}', '{{ p.match }}', '{{ p.state }}']) assert.ok(!printed(blk, b), `${b} still prints as words`);
  for (const b of ['{{ p.violColor }}', '{{ pd.bar }}', '{{ pd.ink }}']) assert.ok(!blk.includes(b), `${b}: a second colour in the row`);
  assert.match(blk, /onClick="\{\{ p\.matchedGo \}\}"[^>]*title="\{\{ p\.matchedLabel \}\}"/);
  assert.match(blk, /onClick="\{\{ p\.violGo \}\}"[^>]*title="\{\{ p\.violLabel \}\}"/);
  assert.match(blk, /class="fw-badge \{\{ pb\.cls \}\}"/, 'the verbs stay NetBond\'s badges');
  assert.match(CSS, /\.ps\.mono \[data-state="set"\] i\{[^}]*\}/);
  assert.ok(!/\.ps\.mono[^{]*\{[^}]*var\(--(cta|link|error|success|warning)\)/.test(CSS), 'the one-ink strip borrows a colour');
});

test('the Policies head: the total as a glyph and a door, its words in the title; station heads over the strips', () => {
  const blk = block('<div id="sec-policies"', '<sc-if value="{{ authoring }}"');
  assert.match(blk, /onClick="\{\{ polViolGo \}\}"[^>]*title="\{\{ polViolLine \}\}"/);
  assert.ok(!printed(blk, '{{ polViolLine }}'), 'the total prints as words');
  for (const view of ESTATES) { const v = vals(at(view)), m = /^([\d,]+) /.exec(v.polViolLine); assert.equal(v.polViolN, m ? m[1] : '', view); }
});

test('Tags: one ink for every tag; footprint and exposure are glyphs and numbers that open their sets; the words ride in titles', () => {
  for (const view of ESTATES) {
    const v = vals(at(view, { govPanel: 'tags' }));
    for (const t of v.drawerTags) {
      const why = `${view} ${t.name}`;
      assert.deepEqual(t.subParts.map(p => p.key), ['vpcs', 'wl', 'regions', 'clouds'], why);
      for (const p of t.subParts) assert.ok(onDisk(p.icon) && p.title && /^[\d,]+$/.test(p.nF), `${why} ${p.key}`);
      for (const e of [t.expo, t.expoWl]) assert.ok(onDisk(e.icon) && e.title, `${why} ${e.key}`);
      assert.ok(t.doorShort && words(t.doorShort) <= 2 && onDisk(t.doorIcon), why);
    }
    for (const p of v.tagSubParts) assert.ok(onDisk(p.icon) && p.title, view);
    assert.equal(v.tagPager.many, false, `${view}: the tags fit one page`);
  }
  const blk = block('<div id="sec-obs-tags"', '<sc-if value="{{ govPanelEngine }}"');
  for (const b of ['{{ tsb.text }}', '{{ dt.expo.text }}', '{{ dt.expoWl.text }}', '{{ tsp.text }}', '{{ dt.sub }}', '{{ dt.doorLabel }}']) assert.ok(!printed(blk, b), `${b} still prints as words`);
  assert.ok(!blk.includes('{{ dt.chip.'), 'a tag wears its own colour again (no purple, no green)');
  for (const b of ['{{ tsb.go }}', '{{ dt.expo.go }}', '{{ dt.expoWl.go }}', '{{ tsp.go }}', '{{ dt.go }}']) assert.ok(blk.includes(`onClick="${b}"`), b);
});

test('Templates: the sides without their kind word, one requirement under each node (the rest in its title), the match as glyph and number', () => {
  for (const view of ESTATES) for (const kind of ['layered', 'between']) {
    const v = vals(at(view, { govPanel: 'templates', govTplKind: kind }));
    for (const k of v.tplKinds) assert.ok(onDisk(k.icon), k.key);
    for (const e of v.examplePolicies) {
      const why = `${view} ${kind} ${e.key}`;
      assert.ok(e.aShort && e.bShort && words(e.aShort) <= 4, `${why}: "${e.aShort}"`);
      for (const l of e.layers) { assert.ok(!/ · /.test(l.short) && l.title.includes(l.full), `${why} ${l.key}: "${l.short}"`); assert.equal(l.hasMore, l.more !== '', why); }
      assert.ok(onDisk(e.figIcon) && e.figTitle === e.figLabel, why);
      assert.ok(e.figN === '' || /^[\d,]+$/.test(e.figN), `${why}: "${e.figN}"`);
    }
  }
  const blk = block('<div id="sec-starting"', '</sc-if></sc-if>');
  for (const b of ['{{ e.figLabel }}', '{{ el.text }}', '{{ e.a }}', '{{ e.b }}', '{{ examplesTitle }}']) assert.ok(!printed(blk, b), `${b} still prints as words`);
  assert.match(blk, /onClick="\{\{ e\.figGo \}\}"[^>]*title="\{\{ e\.figTitle \}\}"/);
  assert.match(blk, /<sc-for list="\{\{ e\.layers \}\}" as="el"/);
});
