import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "more transparency into bandwidth capacity and utilization" (Micah,
// 2026-09-29). Connections says what you bought, what it carries on average
// and at peak, what is left, which port fills first and when, and how each
// connection has run across the Since window.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const conn = (patch = {}) => mkC({ view: 'mature', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn', ...patch });
const num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, ''));

test('four figures: capacity bought, carrying, peak, headroom, and they add up', () => {
  const v = vals(conn());
  assert.deepEqual(v.bwTiles.map(t => t.l), ['Capacity bought', 'Carrying', 'Peak', 'Headroom']);
  const t = Object.fromEntries(v.bwTiles.map(x => [x.l, x]));
  const cap = v.gaugeRows.reduce((a, g) => a + g.capG, 0), peak = v.gaugeRows.reduce((a, g) => a + g.peakG, 0);
  assert.equal(num(t['Capacity bought'].v), Math.round(cap));
  assert.ok(Math.abs(num(t['Headroom'].v) - Math.round(cap - peak)) <= 1, `${t['Headroom'].v} vs ${cap - peak}`);
  assert.match(t['Headroom'].sub, /fills first/);
});

test('each connection: ports, average and peak against the 80% line, headroom, trend, when it fills', () => {
  const v = vals(conn());
  for (const g of v.gaugeRows) {
    assert.match(g.portsF, /^\d+ × \d+G$|^\d+G$/, g.label);
    assert.ok(g.avgG <= g.peakG && g.peakG <= g.capG + 0.01, g.label);
    assert.match(g.avgW, /%$/); assert.match(g.peakX, /%$/);
    assert.equal(g.spark.length, 24);
    assert.match(g.fullIn, /^in \d+ (weeks?|months?)$|^Over a year$|^Now$/, g.label);
    assert.ok(!/^(DX|ER|EQX)$/.test(g.rampName), 'path names, not product codes');
  }
});

test('the Since window sets the growth, so when a port fills moves with it', () => {
  const fast = vals(conn({ obWindow: '12m' })).gaugeRows.find(g => g.label === 'AWS us-west-2');
  const slow = vals(conn({ obWindow: '7d' })).gaugeRows.find(g => g.label === 'AWS us-west-2');
  assert.notEqual(fast.fullIn, slow.fullIn);
});

test('Connections sits in the Observe card with its sister tabs, not a box of its own', () => {
  const a = HTML.indexOf('<div id="sec-flow"'), c = HTML.indexOf('<sc-if value="{{ obPanelConn }}"');
  const b = HTML.indexOf('<sc-if value="{{ isEmpty }}"', a);
  assert.ok(a > 0 && c > a && c < b);
  assert.equal(HTML.indexOf('class="fx-card" aria-label="Connections"'), -1);
  const panel = HTML.slice(c, c + 9000);
  for (const h of ['Connection', 'Ports', 'Utilization', 'Avg', 'Peak', 'Headroom', 'Trend', 'Full in', 'State']) assert.ok(panel.includes(`>${h}<`), h);
});
