import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "on over time 'outside of at&t' is so small its not visible" (Micah, 2026-09-30).
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const ot = (patch = {}) => mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'time', ...patch });
const pct = (s) => parseFloat(s);

test('together, a non-zero Outside AT&T band is always visible', () => {
  const bars = vals(ot()).otBars;
  assert.ok(bars.length > 0);
  for (const b of bars) if (b.outGbps > 0) assert.ok(pct(b.outH) >= 1.2, `${b.title}: ${b.outH}`);
});

test('the legend isolates a series on its own scale', () => {
  const c = ot();
  const v = vals(c);
  assert.deepEqual(v.otSeriesChips.map(x => x.label), ['On AT&T', 'Outside AT&T']);
  v.otSeriesChips[1].go();
  const out = vals(c).otBars;
  assert.ok(out.every(b => pct(b.fabH) === 0));
  assert.equal(Math.max(...out.map(b => pct(b.outH))), 100);
  assert.match(vals(c).otSeriesLine, /^Outside AT&T only, on its own scale/);
  vals(c).otSeriesChips[1].go();
  assert.equal(vals(c).otSeries, 'both', 'a second click shows both again');
  assert.ok(HTML.includes('{{ os.go }}'), 'the legend entries are buttons');
});
