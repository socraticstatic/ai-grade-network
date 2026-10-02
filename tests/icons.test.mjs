import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { ICON_NAMES, LAYER_ICON, assetIcon, verbBadges } from '../naas-policy-layers.js';

// The AT&T icon system (2026-10-02, "more icon and flywheel beauty"): one glyph per file in
// brand/icons, drawn as a CSS mask tinted by currentColor. Every name the page or the app binds
// has to be on disk, or the mask paints nothing and nobody sees the gap.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../naas-app.js', import.meta.url), 'utf8');
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));

test('every icon the markup names literally is on disk', () => {
  const names = new Set([...HTML.matchAll(/brand\/icons\/([a-z0-9-]+)\.svg/g)].map(m => m[1]).filter(n => !/^\{\{/.test(n)));
  for (const n of names) assert.ok(onDisk(n), `brand/icons/${n}.svg is missing`);
});

test('every icon the app binds by name is on disk', () => {
  for (const n of [...ICON_NAMES, ...Object.values(LAYER_ICON)]) assert.ok(onDisk(n), `brand/icons/${n}.svg is missing`);
  // The rail's own glyphs live in brand/icons-light and friends; only names routed through brand/icons are checked here.
  for (const n of [...APP.matchAll(/brand\/icons\/([a-z0-9-]+)\.svg/g)].map(m => m[1])) assert.ok(onDisk(n), `naas-app.js binds brand/icons/${n}.svg, missing on disk`);
});

test('the glyphs are currentColor masks, not fixed inks, and carry no c2pa payload', () => {
  for (const f of readdirSync(new URL('../brand/icons/', import.meta.url))) {
    const s = readFileSync(new URL(`../brand/icons/${f}`, import.meta.url), 'utf8');
    assert.ok(!/c2pa|<metadata/.test(s), `${f} carries metadata`);
    assert.ok(/currentColor/.test(s), `${f} is not currentColor`);
  }
});

test('the page declares the mask class and the Flywheel primitives', () => {
  for (const cls of ['.ic{', '.fw-toggle{', '.fw-badge{', '.fw-prio{', '.fw-vtabs{', '.fw-row{', '.ps{']) assert.ok(HTML.includes(cls), `${cls} is not declared`);
});

test('a side gets its glyph by what it names', () => {
  assert.equal(assetIcon('Private cloud · Equinix DC2, Ashburn'), 'hybrid-cloud');
  assert.equal(assetIcon('tag PCI'), 'tag');
  assert.equal(assetIcon('branch Finance'), 'large-building');
  assert.equal(assetIcon('Dallas DC'), 'large-building');
  assert.equal(assetIcon('AWS us-east-1'), 'cloud');
  assert.equal(assetIcon('any cloud'), 'cloud');
  assert.equal(assetIcon('the Internet'), 'globe');
});

test('verb badges: NetBond Advanced\'s four in their colors, the path\'s asks in neutral, three at most', () => {
  const b = verbBadges({ req: 'Private path required', route: { 'deny:block-default-routes': { o2p: true, p2o: false }, 'allow:matching-routes': { o2p: true, p2o: false } }, path: ['NGFW inline'] });
  assert.deepEqual(b.map(x => x.label), ['Deny', 'Allow', 'Path']);
  assert.deepEqual(b.map(x => x.cls), ['deny', 'allow', '']);
  assert.deepEqual(verbBadges({ req: 'Inline security inspection' }).map(x => x.label), ['Inspect', 'Egress']);
  assert.deepEqual(verbBadges({ req: 'Latency SLO 15 ms' }).map(x => x.label), ['Path', 'SLO']);
});

import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
test('every Optimize move carries a mark on disk', () => {
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'optimize' }));
  assert.equal(v.optRows.length, 4);
  for (const o of v.optRows) assert.ok(onDisk(o.icon), `${o.key}: ${o.icon}`);
  assert.deepEqual(v.optRows.map(o => o.icon), ['bill', 'router', 'sync', 'high-meter']);
});
