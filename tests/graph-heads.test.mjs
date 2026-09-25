import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { GRAPH_HEAD_PX, GRAPH_REF_W, headUnits } from '../naas-logic.js';
import { mkC } from './harness.mjs';

// "Why do we have different header styles on each graph?" (Micah, 2026-09-25).
// Each graph set 11px in its own drawing units, and the drawings scale
// differently to fill the same card: Connect (1392 wide) shrank to 8.7px on
// screen, the Health Sankey (900 wide) grew to 13.5px, at different weights and
// greys. A header is now sized for the screen: GRAPH_HEAD_PX at the width the
// graphs are drawn into, converted into each graph's units.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const onScreen = (fs, vbW) => parseFloat(fs) * GRAPH_REF_W / vbW;

test('a graph header lands at the same size on screen whatever the graph is drawn at', () => {
  assert.equal(onScreen(headUnits(1392) + 'px', 1392).toFixed(1), GRAPH_HEAD_PX.toFixed(1));
  assert.equal(onScreen(headUnits(900) + 'px', 900).toFixed(1), GRAPH_HEAD_PX.toFixed(1));
});

test('Connect and the Health Sankey draw their column heads the same way', () => {
  const c = vals(mkC({ view: 'mature', screen: 's3', tab: 'connect', estateParam: null }));
  const o = vals(mkC({ view: 'mature', screen: 's3', tab: 'observe', obPage: 'perf', obTab: 'flow', estateParam: null }));
  const vbW = +o.mapVB.split(' ')[2];
  const col = o.mapHeads.find(h => h.kind === 'col');
  assert.ok(Math.abs(onScreen(c.graphHeadFs, 1392) - onScreen(col.fs, vbW)) < 0.2, `Connect ${onScreen(c.graphHeadFs, 1392)}px, Sankey ${onScreen(col.fs, vbW)}px`);
  assert.equal(col.fw, 600);
  assert.equal(col.ink, 'var(--text-light)');
});

test('a drilled Clouds head keeps the header style instead of turning into body text', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  assert.doesNotMatch(HTML, /cloudsHeadSize|cloudsHeadCase|cloudsHeadTrack/);
  const heads = HTML.match(/<foreignObject(?: class="fold")? x="(?:24|\{\{ rightX \}\}|\{\{ bandLabelX \}\})"[^>]*y="0"[\s\S]*?<\/foreignObject>/g) || [];
  assert.equal(heads.length, 3, 'the three Connect header rows moved');
  for (const h of heads) assert.doesNotMatch(h, /font-size:1[0-9]px/, 'a Connect header row still sets a fixed pixel size');
});
