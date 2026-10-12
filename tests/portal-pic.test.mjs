import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals, defaults, PAGE_ROWS } from '../naas-portal-app.js';

// The visuals (drop 2, task 3; Micah: "No visuals"): every page carries a picture band, the path strip sites -> last
// mile -> AT&T -> POP -> cloud with that page's station lit and the counts under the stations, and a legend of that
// page's counts as glyphs. Recommended's score is the ring. Twelve rows a page under the band.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };
const HTML = readFileSync(new URL('../portal.dc.html', import.meta.url), 'utf8');
const mkC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };
const at = (page, fixture = 'scale', stateB = true, extra = {}) => vals(mkC({ fixture, stateB, page, ...extra }));
const icon = (name) => existsSync(new URL(`../brand/icons/${name}.svg`, import.meta.url));

test('the strip is five stations, sites to cloud, with this page\'s station lit and the counts under them', () => {
  for (const page of ['lastmile', 'links', 'discovery', 'recommended']) {
    const p = at(page).pic;
    assert.deepEqual(p.strip.map(s => s.key), ['sites', 'lastmile', 'att', 'pop', 'cloud'], page);
    assert.ok(p.strip.every(s => s.icon && icon(s.icon) && s.label), page);
  }
  assert.deepEqual(at('lastmile').pic.strip.map(s => s.state), ['set', 'set', '', '', '']);
  assert.deepEqual(at('links').pic.strip.map(s => s.state), ['', '', 'set', 'set', '']);
  assert.deepEqual(at('discovery').pic.strip.map(s => s.state), ['', '', '', '', 'set']);
  assert.deepEqual(at('recommended').pic.strip.map(s => s.state), ['', '', 'set', '', 'set']);
  const s = at('lastmile').pic.strip;
  assert.equal(s[0].small, '1,884 sites'); assert.equal(s[1].small, '3,000 circuits'); assert.equal(s[2].small, 'AT&T'); assert.equal(s[3].small, '12 connections'); assert.equal(s[4].small, '8 regions · 7 on AT&T');
  const c = at('lastmile', 'calloway', false).pic.strip; assert.equal(c[3].small, 'None yet'); assert.equal(c[4].small, '2 regions · 0 on AT&T');
});

test('the legend is this page\'s counts as glyphs: services, clouds, the AT&T join, the weights', () => {
  const lm = at('lastmile').pic.legend; assert.deepEqual(lm.map(l => l.label), ['AVPN', 'Ethernet', 'Internet', 'Fiber']); assert.ok(lm.every(l => l.icon && l.ink && /^[\d,]+$/.test(l.n)));
  const cl = at('links').pic.legend; assert.deepEqual(cl.map(l => l.label), ['AWS', 'Microsoft Azure', 'Google Cloud']); assert.ok(cl.every(l => l.mark.endsWith('.svg') && /^\d+$/.test(l.n)));
  const dv = at('discovery').pic.legend; assert.deepEqual(dv.map(l => [l.label, l.n]), [['On AT&T', '7'], ['AT&T at the cloud', '1'], ['Not on AT&T', '0']]);
  const rc = at('recommended').pic.legend; assert.deepEqual(rc.map(l => l.label), ['Cost', 'Performance', 'Security', 'Effort and time', 'Scale']); assert.ok(rc.every(l => /%$/.test(l.n)));
  assert.equal(at('links', 'calloway', false).pic.legend.length, 0, 'no clouds connected yet, no legend');
});

test('twelve rows a page under the band; the picker eleven; Recommended\'s score is the ring', () => {
  assert.equal(PAGE_ROWS, 12);
  assert.equal(at('lastmile').lm.rows.length, 12); assert.equal(at('discovery').dv.pageRows, 12);
  const c = mkC({ fixture: 'calloway', page: 'recommended', region: { csp: 'Azure', region: 'eastus' } }); const v = vals(c);
  const score = v.rc.options[0].cells.find(x => x.key === 'score');
  assert.equal(score.isScore, true); assert.match(score.ptsPct, /^\d+%$/); assert.equal(score.out, false);
});

test('the markup: one band bound to pic above the pages, the strip as .ps big, the ring in the score cell', () => {
  assert.match(HTML, /<div class="po-band"[\s\S]*?<div class="ps big five"[^>]*><sc-for list="\{\{ pic\.strip \}\}" as="ps"/, "five stations need the five-column grid");
  assert.ok(HTML.includes('<sc-for list="{{ pic.legend }}" as="lg"'));
  const a = HTML.indexOf('aria-label="Recommended"'), blk = HTML.slice(a, HTML.indexOf('</section>', a));
  assert.match(blk, /<sc-if value="\{\{ cell\.isScore \}\}"[^>]*><span class="js-score md"/);
});
