import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { overTime } from '../naas-flowmap.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "For observability, we also need over time info - daily, weekly, monthly"
// (Micah, 2026-09-28). One card under the map: stacked bars, on AT&T under
// outside AT&T, four rollups, a grain control, a sentence per bar on hover.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');

test('each grain has its own number of bars, newest last', () => {
  for (const [g, n] of [['daily', 30], ['weekly', 12], ['monthly', 12]]) {
    const s = overTime({ total: 45, fab: 44, egressMo: 9000, grain: g, seed: 'partial' });
    assert.equal(s.bars.length, n, g);
    assert.ok(s.bars.every(b => b.fab >= 0 && b.out >= 0 && b.fab + b.out > 0), g);
  }
});

test('the latest bar sits on what the map shows now, and egress follows the grain', () => {
  const d = overTime({ total: 45, fab: 44, egressMo: 9000, grain: 'daily', seed: 'x' });
  const last = d.bars[d.bars.length - 1];
  assert.ok(Math.abs(last.fab + last.out - 45) < 0.5, `${last.fab + last.out}`);
  const m = overTime({ total: 45, fab: 44, egressMo: 9000, grain: 'monthly', seed: 'x' });
  assert.ok(Math.abs(m.bars[m.bars.length - 1].egress - 9000) < 1);
  assert.ok(d.bars[d.bars.length - 1].egress < 400, 'a day is a thirtieth of a month');
});

test('the card carries four rollups, three grains, and a sentence per bar', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'observe', estateParam: null });
  const v = vals(c);
  assert.deepEqual(v.otTiles.map(t => t.l), ['Peak', 'Average', 'Trend', 'Egress']);
  assert.deepEqual(v.otGrains.map(g => g.label), ['Daily', 'Weekly', 'Monthly']);
  assert.equal(v.otBars.length, 30);
  assert.match(v.otBars[29].title, /Gbps · \d+(\.\d)?% on AT&T · \$[\d,]+ egress/);
  v.otGrains.find(g => g.label === 'Monthly').go();
  assert.equal(vals(c).otBars.length, 12);
  const a = HTML.indexOf('aria-label="Over time"');
  assert.ok(a > 0);
  assert.match(HTML.slice(a, a + 5000), /<sc-for list="\{\{ otBars \}\}"/);
});

test('every scenario draws the card; a customer with no traffic draws none', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const v = vals(mkC({ view, screen: 's3', tab: 'observe', estateParam: null }));
    assert.equal(v.hasOverTime, v.otBars.length > 0, view);
  }
  assert.equal(vals(mkC({ view: 'empty', screen: 's3', tab: 'observe', estateParam: null })).hasOverTime, false);
});
