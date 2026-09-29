import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "give me policies that are multi-layer" (Micah, 2026-09-29). The policy
// table reads by layer: a column per layer, each policy's rule where it
// applies, a violation marked at the layer where it breaks. The templates
// are multi-layer starting points, and one you start from keeps its layers.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const gov = (patch = {}) => mkC({ view: 'mature', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', ...patch });
const LABELS = ['Sites & first mile', 'AT&T edge', 'AT&T core', 'Cloud & workload'];

test('the policy table has a column per layer, and every policy fills more than one', () => {
  const v = vals(gov());
  assert.deepEqual(v.polLayerHeads.map(h => h.label), LABELS);
  for (const p of v.polRows) {
    assert.deepEqual(p.layers.map(l => l.label), LABELS);
    assert.ok(p.layers.filter(l => l.set).length >= 2, p.name);
  }
});

test('a violation shows at the layer where it breaks', () => {
  const v = vals(gov());
  const prod = v.polRows.find(p => p.name === 'Prod no direct internet');
  const broken = prod.layers.filter(l => l.broken);
  assert.deepEqual(broken.map(l => l.label), ['AT&T core']);
  assert.equal(broken[0].ink, 'var(--error)');
  assert.ok(v.polRows.filter(p => !p.viol).every(p => !p.layers.some(l => l.broken)));
});

test('the templates are multi-layer, and starting from one carries its layers into the author', () => {
  const c = gov({ govPanel: 'templates' });
  const v = vals(c);
  assert.ok(v.examplePolicies.length >= 5);
  for (const e of v.examplePolicies) assert.deepEqual(e.layers.map(l => l.label), LABELS);
  const pci = v.examplePolicies.find(e => e.t === 'PCI, end to end');
  pci.go();
  assert.equal(c.state.authoring.match, 'tag PCI');
  assert.equal(c.state.authoring.layers.site, 'AVPN or Switched Ethernet, no internet breakout');
  assert.equal(vals(c).aLayers.length, 4);
  vals(c).aEnforce();
  const mine = vals(c).polRows.find(p => p.name === 'PCI, end to end');
  assert.ok(mine, 'the authored policy is in the list');
  assert.equal(mine.layers.filter(l => l.set).length, 4);
});

test('the markup draws the layer table and the layer stacks', () => {
  assert.match(HTML, /aria-label="Policies by layer"/);
  assert.match(HTML, /<sc-for list="\{\{ polLayerHeads \}\}"/);
  assert.match(HTML, /<sc-for list="\{\{ p\.layers \}\}"/);
  assert.match(HTML, /<sc-for list="\{\{ e\.layers \}\}"/);
  assert.match(HTML, /<sc-for list="\{\{ aLayers \}\}"/);
});
