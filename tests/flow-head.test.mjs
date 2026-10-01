import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Micah, 2026-09-28, on the section above the Sankey: "way too wordy, and not
// enough visual filters and rollups"; "don't describe 'health right now', show
// it"; "subtext for the headers really should be widgets"; "observability
// filters should be view control". The head is a title, six rollup tiles that
// double as filters, and one Traffic · Cost · Performance control.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const obs = (patch = {}) => mkC({ view: 'partial', screen: 's3', tab: 'observe', estateParam: null, ...patch });
const card = () => { const a = HTML.indexOf('<div id="sec-flow"'); return HTML.slice(a, HTML.indexOf('<svg viewBox="{{ mapVB }}"', a)); };

test('six rollups head the map, each a number with its unit', () => {
  const t = vals(obs()).flowTiles;
  // One tile row since the no-scroll ruling (2026-09-28): Saving lives in the headline, latency joins.
  // Egress became Cost (2026-09-29): the tile is the map's own dollars, on AT&T and outside.
  // Sites could save (w2 second pass, 2026-09-30): Could save is Spend's figure, the page head's, everywhere else.
  assert.deepEqual(t.map(x => x.l), ['Traffic', 'P95 latency', 'Sites on AT&T', 'Cost', 'Sites could save', 'Over SLO']);
  for (const x of t) assert.ok(x.v && x.v.length <= 12, `${x.l}: ${x.v}`);
  // Sites on AT&T counts sites (2026-09-29 audit), not a traffic share.
  assert.equal(t.find(x => x.l === 'Sites on AT&T').v, '20 of 25');
  // Since is the window the tiles compare against.
  assert.match(t.find(x => x.l === 'Traffic').d, /^[+-]\d+% vs prior 30 days$/);
  // Whole dollars on every tile (2026-09-29 consistency pass).
  for (const k of ['Cost', 'Sites could save']) assert.match(t.find(x => x.l === k).v, /^\$[\d,]+$/, k);
});

test('a tile is a filter: it switches the view it belongs to', () => {
  const c = obs();
  vals(c).flowTiles.find(x => x.l === 'Cost').go();
  assert.equal(c.state.mapMode, 'cost');
  vals(c).flowTiles.find(x => x.l === 'Over SLO').go();
  assert.equal(c.state.mapMode, 'slo');
  vals(c).flowTiles.find(x => x.l === 'Sites could save').go();
  assert.equal(c.state.mapMode, 'cost');
  assert.equal(c.state.mapPath, 'out');
  assert.ok(vals(c).flowTiles.find(x => x.l === 'Sites could save').on);
});

test('one view control and one path filter replace the pattern and colour blocks', () => {
  const v = vals(obs());
  assert.deepEqual(v.flowViews.map(x => x.label), ['Traffic', 'Cost', 'Performance']);
  assert.deepEqual(v.flowPaths.map(x => x.label), ['All paths', 'On AT&T', 'Outside AT&T']);
  const c = obs(); vals(c).flowPaths.find(x => x.key === 'att').go();
  const r = vals(c).mapRibbons;
  assert.ok(r.some(x => x.op < 0.2), 'nothing outside AT&T dimmed');
});

test('the cost view colours what leaves AT&T and prices it on hover', () => {
  const r = vals(obs({ mapMode: 'cost' })).mapRibbons;
  assert.ok(r.some(x => /\/mo/.test(x.title)), r.map(x => x.title).slice(0, 3).join(' | '));
});

test('the head carries no sentences: no subtitle, no persona line, no pattern gloss', () => {
  const h = card();
  assert.doesNotMatch(h, /\{\{ mapSub \}\}|\{\{ plKicker \}\}|\{\{ patternWhy \}\}/);
  assert.match(h, /<sc-for list="\{\{ flowTiles \}\}"/);
  assert.match(h, /<sc-for list="\{\{ flowViews \}\}"/);
  assert.equal(HTML.indexOf('id="sec-health"'), -1, 'the second tile row is back');
});
