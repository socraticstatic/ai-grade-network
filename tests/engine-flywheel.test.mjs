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

// The engine's flow, verdict and strip moved to tests/engine-v3.test.mjs with the rebuild (2026-10-07).

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

test('the markup draws the cards\' strips', () => {
  assert.match(HTML, /<div class="ps mid"[^>]*><sc-for list="\{\{ e\.layers \}\}"/);
  assert.ok(!HTML.includes('Start from this · {{ e.m }}'), 'Start is a button with the sides in its title');
});
