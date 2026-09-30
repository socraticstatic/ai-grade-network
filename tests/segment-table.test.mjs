import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Health > By segment (notes, 2026-09-30, Task 3.2): the stakeholder's table of
// segment, owner, what to show and where the data comes from, made live where
// a source exists and honest where none does.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const at = (view, patch = {}) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health', healthView: 'segment', ...patch }));

test('By app and By segment are the two views of Health', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health' });
  const v = vals(c);
  assert.deepEqual(v.healthViews.map(h => h.label), ['By app', 'By segment']);
  assert.ok(v.healthByApp && !v.healthBySegment);
  v.healthViews[1].go();
  assert.ok(vals(c).healthBySegment);
});

test('nine rows in the email\'s order on every estate, empty included', () => {
  for (const view of ['partial', 'mature', 'trust', 'small', 'empty']) {
    const rows = at(view).segRows;
    assert.deepEqual(rows.map(r => r.key), ['access', 'access3p', 'backbone', 'onramp', 'cloudlink', 'ipsec', 'hub', 'exit', 'app'], view);
  }
});

test('owners, and the limited view on the third-party row', () => {
  const rows = at('partial').segRows;
  assert.deepEqual(rows.map(r => r.ownerLabel), ['AT&T', 'Third party', 'AT&T', 'AT&T', 'Cloud provider', 'You', 'You', 'You', 'You']);
  assert.deepEqual(rows.filter(r => r.limited).map(r => r.key), ['access3p']);
});

test('Growing: the cloud connection row names the flap', () => {
  assert.match(at('partial').segRows.find(r => r.key === 'cloudlink').nowText, /^Azure eastus · ExpressRoute · BGP flapping/);
});

test('what we cannot see yet says so', () => {
  const rows = at('partial').segRows;
  for (const k of ['ipsec', 'hub', 'exit']) assert.match(rows.find(r => r.key === k).nowText, /Not yet measured/, k);
  assert.match(rows.find(r => r.key === 'app').nowSub, /DNS not yet measured/, 'flow logs arrive; DNS logs do not');
  assert.ok(HTML.includes('{{ sg.nowText }}') && HTML.includes('{{ sg.source }}'));
});

test('a site row drills by place, region then state then its sites, never flat', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health', healthView: 'segment' });
  vals(c).segRows.find(r => r.key === 'access').open();
  let v = vals(c);
  assert.ok(v.segOpen);
  assert.equal(v.segLevel, 'region');
  assert.ok(v.segDrillRows.every(r => /^region:/.test(r.key)), v.segDrillRows.map(r => r.key).join(', '));
  v.segDrillRows[0].go();
  v = vals(c);
  assert.equal(v.segLevel, 'state');
  v.segDrillRows[0].go();
  v = vals(c);
  assert.equal(v.segLevel, 'site');
  assert.ok(v.segDrillRows.every(r => !r.canGo));
  assert.deepEqual(v.segCrumbs.map(x => x.label).slice(0, 2), ['All segments', 'Site access']);
  v.segCrumbs[0].go();
  assert.ok(!vals(c).segOpen);
});

test('a cloud row drills by cloud, then region, and the flap is on it', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health', healthView: 'segment' });
  vals(c).segRows.find(r => r.key === 'cloudlink').open();
  let v = vals(c);
  assert.equal(v.segLevel, 'cloud');
  v.segDrillRows.find(r => r.name === 'Azure').go();
  v = vals(c);
  assert.equal(v.segLevel, 'region');
  assert.match(v.segDrillRows.find(r => /eastus/.test(r.name)).sub, /BGP flapping/);
});

test('a limited row keeps its ring all the way down', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health', healthView: 'segment' });
  const row = vals(c).segRows.find(r => r.key === 'access3p');
  assert.equal(row.bg, 'transparent');
  row.open();
  assert.ok(vals(c).segDrillRows.every(r => r.bg === 'transparent' && /solid/.test(r.border)));
});
