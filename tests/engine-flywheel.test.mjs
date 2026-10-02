import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import { BETWEEN_TEMPLATES, MULTI_LAYER } from '../naas-policy-layers.js';

// The policy engine and the templates on the icon system (2026-10-02): the engine's flow chips carry a glyph by what they
// name, its verdict is a Flywheel badge, its four layers are the path strip; every template names its glyph and draws its
// layers as the strip with its two sides beside the title.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));
const at = (view, extra = {}) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', ...extra }));

test('the engine\'s chips carry a glyph by what they name', () => {
  const v = at('partial', { govPanel: 'engine' });
  for (const ch of [...v.engFrom, ...v.engTo, ...v.engTag]) assert.ok(onDisk(ch.icon), `${ch.label}: ${ch.icon}`);
  assert.equal(v.engFrom.find(c => /^Private cloud/.test(c.label)).icon, 'hybrid-cloud');
  assert.equal(v.engTo.find(c => c.label === 'the Internet').icon, 'globe');
  assert.equal(v.engTag.find(c => c.label === 'Nothing tagged').icon, 'minus-circle');
  assert.equal(v.engTag.find(c => c.label === 'tag PCI').icon, 'tag');
});

test('the verdict is a badge with its glyph, and the layers are a strip with a state', () => {
  const v = at('partial', { govPanel: 'engine' });
  assert.ok(v.engHas);
  assert.ok(['allow', 'deny'].includes(v.engVerdictCls));
  assert.equal(v.engVerdictIcon, v.engVerdictCls === 'deny' ? 'close-circle' : 'check-circle');
  assert.equal(v.engLayers.length, 4);
  for (const l of v.engLayers) { assert.ok(onDisk(l.icon), l.key); assert.equal(l.state, l.by ? 'set' : 'any'); }
  assert.ok(v.engLayers.some(l => l.state === 'set'), 'the Growing estate decides at least one layer for its default flow');
});

test('every template names a glyph on disk, and its card carries its sides and a strip', () => {
  for (const t of [...BETWEEN_TEMPLATES, ...MULTI_LAYER]) assert.ok(onDisk(t.icon), `${t.key}: ${t.icon}`);
  for (const kind of ['between', 'layered']) {
    const v = at('partial', { govPanel: 'templates', govTplKind: kind });
    assert.equal(v.examplePolicies.length, 5);
    for (const e of v.examplePolicies) {
      assert.ok(onDisk(e.icon), `${e.key}: ${e.icon}`);
      assert.ok(e.a && e.b, `${e.key} names two sides`);
      assert.ok(onDisk(e.aIcon) && onDisk(e.bIcon), `${e.key} sides' glyphs`);
      assert.equal(e.layers.length, 4);
      for (const l of e.layers) { assert.ok(onDisk(l.icon), l.key); assert.ok(['set', 'any'].includes(l.state)); }
      assert.ok(e.layers.some(l => l.state === 'set'), `${e.key} sets some layer`);
    }
  }
  const pc = at('partial', { govPanel: 'templates', govTplKind: 'between' }).examplePolicies.find(e => e.key === 'pc-hsp');
  assert.equal(pc.aIcon, 'hybrid-cloud'); assert.equal(pc.bIcon, 'cloud');
});

test('the markup draws the engine\'s strip and badge and the cards\' strips', () => {
  assert.match(HTML, /<sc-for list="\{\{ engLayers \}\}" as="el" hint-placeholder-count="4"><span data-state="\{\{ el\.state \}\}"/);
  assert.match(HTML, /class="fw-badge big \{\{ engVerdictCls \}\}"/);
  assert.match(HTML, /<div class="ps mid"[^>]*><sc-for list="\{\{ e\.layers \}\}"/);
  assert.ok(!HTML.includes('Start from this · {{ e.m }}'), 'Start is a button with the sides in its title');
});
