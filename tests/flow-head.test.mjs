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
  assert.deepEqual(t.map(x => x.l), ['Traffic', 'On AT&T', 'Egress', 'Saving', 'Could save', 'Over SLO']);
  for (const x of t) assert.ok(x.v && x.v.length <= 7, `${x.l}: ${x.v}`);
  assert.equal(t.find(x => x.l === 'Saving').v, '$36k');
});

test('a tile is a filter: it switches the view it belongs to', () => {
  const c = obs();
  vals(c).flowTiles.find(x => x.l === 'Egress').go();
  assert.equal(c.state.mapMode, 'cost');
  vals(c).flowTiles.find(x => x.l === 'Over SLO').go();
  assert.equal(c.state.mapMode, 'slo');
  vals(c).flowTiles.find(x => x.l === 'Could save').go();
  assert.equal(c.state.mapMode, 'cost');
  assert.equal(c.state.mapPath, 'out');
  assert.ok(vals(c).flowTiles.find(x => x.l === 'Could save').on);
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
  const health = HTML.slice(HTML.indexOf('id="sec-health"'), HTML.indexOf('id="sec-health"') + 600);
  assert.doesNotMatch(health, /What is running|are <b|read<\/b> from/, 'Health still describes itself');
});
