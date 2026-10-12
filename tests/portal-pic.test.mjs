import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals, defaults, PAGE_ROWS } from '../naas-portal-app.js';
import * as P from '../naas-portal.js';

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

test('the rollups: four rounded tiles a page, this page\'s counts, with the glyph and the word', () => {
  const down = String(P.FIXTURES.scale.circuits.filter(c => c.health === 'down').length);
  const lm = at('lastmile').pic.tiles; assert.deepEqual(lm.map(t => [t.label, t.n]), [['Circuits', '3,000'], ['Networks', '30'], ['Sites', '1,884'], ['Down', down]]); assert.ok(+down > 0);
  assert.equal(lm[3].ink, 'var(--error)', 'down is the one figure in error ink'); assert.ok(lm.every(t => t.icon && icon(t.icon)));
  assert.deepEqual(at('lastmile', 'calloway', false).pic.tiles.map(t => t.label), ['Circuits', 'Networks', 'Sites', 'States'], 'no health in state A, states instead');
  assert.deepEqual(at('links').pic.tiles.map(t => [t.label, t.n]), [['Connections', '12'], ['Clouds', '3'], ['Regions reached', '10'], ['Unmapped', '1']]);
  assert.deepEqual(at('discovery').pic.tiles.map(t => [t.label, t.n]), [['Regions', '8'], ['On AT&T', '7'], ['VPCs', '11'], ['Subnets', '48']]);
  assert.deepEqual(at('recommended').pic.tiles.map(t => [t.label, t.n]), [['Regions', '8'], ['Not on AT&T', '0'], ['Requested', '0'], ['Ways', '6']]);
  assert.deepEqual(at('links', 'calloway', false).pic.tiles.map(t => t.n), ['0', '0', '0', '0']);
});

test('twelve rows a page under the band; the picker eleven; Recommended\'s score is the ring', () => {
  assert.equal(PAGE_ROWS, 12);
  assert.equal(at('lastmile').lm.rows.length, 12); assert.equal(at('discovery').dv.pageRows, 12);
  const c = mkC({ fixture: 'calloway', page: 'recommended', region: { csp: 'Azure', region: 'eastus' } }); const v = vals(c);
  const score = v.rc.options[0].cells.find(x => x.key === 'score');
  assert.equal(score.isScore, true); assert.match(score.ptsPct, /^\d+%$/); assert.equal(score.out, false);
});

test('the markup: one band bound to pic above the pages, the strip as .ps big, the tiles, the ring in the score cell', () => {
  assert.match(HTML, /<div class="po-band"[\s\S]*?<div class="ps big five"[^>]*><sc-for list="\{\{ pic\.strip \}\}" as="ps"/, "five stations need the five-column grid");
  assert.ok(HTML.includes('<sc-for list="{{ pic.tiles }}" as="tl"') && !HTML.includes('{{ pic.legend }}'));
  assert.ok(!HTML.includes('{{ counts.circuits }}') && !HTML.includes('{{ cl.counts.links }}'), 'the head counts line is gone; the tiles carry the figures');
  const a = HTML.indexOf('aria-label="Recommended"'), blk = HTML.slice(a, HTML.indexOf('</section>', a));
  assert.match(blk, /<sc-if value="\{\{ cell\.isScore \}\}"[^>]*><span class="js-score md"/);
});
