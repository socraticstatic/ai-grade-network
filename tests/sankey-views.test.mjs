import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "on sankey, cost and performance don't show cost and performance"; "the
// sankey widgets and the sankey graphic doesn't really match"; "replay and
// since are not connected on sankey"; "on observe, add a 'health' filter"
// (Micah, 2026-09-29).

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const at = (patch = {}) => mkC({ view: 'mature', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch });
const tile = (v, k) => v.flowTiles.find(t => t.key === k);
const real = (v) => v.mapNodes.filter(n => n.kind !== 'rollup' && n.kind !== 'more');
const money = (s) => +String(s).replace(/[^0-9.]/g, '');

test('Cost shows dollars: every node, the middle, the heads and the legend', () => {
  const v = vals(at({ mapMode: 'cost' }));
  assert.ok(real(v).every(n => /^\$[\d,]+(\.\d)?k?\/mo$|^\$[\d,]+ of \$[\d,]+\/mo$/.test(n.vF)), real(v).map(n => n.vF).join(', '));
  const inet = v.mapNodes.find(n => n.label === 'Internet');
  assert.match(inet.pathSay, /to save/);
  assert.ok(v.mapHeads.some(h => /\$\/mo/.test(h.text)));
  assert.ok(v.mapLegend.some(l => /AT&T rate/.test(l.label)) && v.mapLegend.some(l => /egress/.test(l.label)));
  // The Cost tile is the map's own total.
  const sum = v.mapNodes.filter(n => n.side === 'l').reduce((a, n) => a + n.tot, 0);
  assert.ok(Math.abs(money(tile(v, 'cost').v) - Math.round(sum / 100) * 100) <= 100, `${tile(v, 'cost').v} vs ${sum}`);
});

test('Performance shows latency: every node reads its p95, colored by its health', () => {
  const v = vals(at({ mapMode: 'slo' }));
  assert.ok(real(v).every(n => /^p95 \d+ ms$/.test(n.vF)), real(v).map(n => n.vF).join(', '));
  const inet = v.mapNodes.find(n => n.label === 'Internet');
  assert.equal(inet.fill, '#c9362c');
  assert.match(inet.pathSay, /over/i);
  const nb = v.mapNodes.find(n => n.label === 'NetBond');
  assert.notEqual(nb.fill, '#c9362c');
  assert.ok(v.mapLegend.some(l => /Within SLO/.test(l.label)) && v.mapLegend.some(l => /Over SLO/.test(l.label)));
});

test('the tiles are the map\'s own numbers, in every scope', () => {
  for (const patch of [{}, { obDim: 'first', obScope: 'first:avpn' }, { obDim: 'app', obScope: 'app:PCI' }, { obDim: 'cloud', obScope: 'cloud:AWS' }]) {
    const v = vals(at(patch));
    assert.equal(tile(v, 'traffic').v, v.mapTotal.toFixed(1), JSON.stringify(patch));
    const red = v.mapNodes.filter(n => (n.side === 'm' || n.side === 'r') && n.health === 'slo').length;
    assert.equal(tile(v, 'slo').v, String(red), `${JSON.stringify(patch)}: Over SLO ${tile(v, 'slo').v} vs ${red} red on the map`);
    assert.equal(tile(v, 'p95').v, String(v.mapP95));
  }
  const pci = vals(at({ obDim: 'app', obScope: 'app:PCI' }));
  const outside = pci.mapNodes.filter(n => n.side === 'm' && !n.priv).length;
  if (!outside) assert.equal(money(tile(pci, 'could').v), 0, 'all on AT&T, nothing to save');
});

test('Since sets the map\'s window; Replay plays that window', () => {
  const week = vals(at({ obWindow: '7d' })), year = vals(at({ obWindow: '12m' }));
  assert.ok(year.mapTotal < week.mapTotal, `${year.mapTotal} vs ${week.mapTotal}`);
  assert.match(year.replayLabel, /12 months/);
  assert.match(year.replayFrom, /12 months ago/);
  const c = at({ obWindow: '30d', mapT: 0.5 });
  const mid = vals(c);
  assert.match(mid.mapMoment, /15 days ago/);
  const flow = HTML.slice(HTML.indexOf('id="sec-flow"'), HTML.indexOf('aria-label="Over time"'));
  assert.ok(flow.length > 1000 && !flow.includes('>Replay 24h<') && !flow.includes('>24h ago<'), 'no hard-coded 24 hours on the Traffic map');
});

test('Health filters the map', () => {
  const c = at();
  const v0 = vals(c);
  assert.deepEqual(v0.healthChips.map(h => h.label), ['All', 'Healthy', 'At risk', 'Over SLO']);
  v0.healthChips.find(h => h.label === 'Over SLO').go();
  const v = vals(c);
  const red = v.mapNodes.filter(n => n.health === 'slo'), rest = v.mapNodes.filter(n => n.health && n.health !== 'slo');
  assert.ok(red.length && red.every(n => n.op === 1), red.map(n => n.label + ' ' + n.op).join(', '));
  assert.ok(rest.every(n => n.op <= 0.35));
  assert.ok(HTML.includes('aria-label="Health"'));
});
