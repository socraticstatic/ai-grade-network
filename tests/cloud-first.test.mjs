import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as CF from '../naas-connect-flow.js';
import { mkC } from './harness.mjs';

// The flow matches the storyboards (Micah, 2026-10-16: "The flow and the pdfs need to match."; the reviewer wants the cloud picked
// first and the location once, on the next page). Every order picks its cloud on Choose Provider, as NetBond Advanced's logo
// tiles do, and its region on Connection Profile, once.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const S4 = HTML.slice(HTML.indexOf('<sc-if value="{{ sS4 }}"'), HTML.indexOf('</section>\n</sc-if>', HTML.indexOf('<sc-if value="{{ sS4 }}"')));
const ways = (view = 'partial') => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'ways' });
const startWay = (way, view) => { const c = ways(view); vals(c).wayCards.find(w => w.key === way).start(); return c; };
const startType = (label, view) => { const c = ways(view); vals(c).wayTypes.find(t => t.label === label).start(); return c; };
const row = (v, key) => v.cfWip.find(r => r.key === key);
const tile = (v, cloud) => v.cfCloudTiles.find(t => t.cloud === cloud);
const region = (v, name) => v.cfRegionGroups.flatMap(g => g.regions).find(r => r.name === name);

test('Choose Provider offers the clouds as tiles and no region; picking one names it, the region not chosen yet', () => {
  const c = startType('DataCenter / CoLocation to Cloud');
  let v = vals(c);
  assert.equal(v.cfKey, 'provider');
  assert.ok(v.cfCloudTiles.length >= 2);
  assert.equal(v.cfClouds, undefined, 'the region groups left Choose Provider');
  assert.equal(v.cfBlock, 'Pick a cloud.');
  tile(v, 'Azure').pick();
  v = vals(c);
  assert.deepEqual(c.state.compose.clouds, ['Azure']);
  assert.deepEqual(c.state.compose.regions || [], []);
  assert.equal(v.cfBlock, '');
  assert.equal(CF.stepValue('provider', CF.flowOf(c.state.compose, {})), 'Azure');
  assert.equal(row(v, 'cloud').value, 'Azure, region not chosen yet');
  assert.equal(tile(v, 'Azure').on, true);
  // One cloud at a time: a second pick replaces the first.
  tile(v, 'AWS').pick();
  assert.deepEqual(vals(c).cfCloudTiles.filter(t => t.on).map(t => t.cloud), ['AWS']);
});

test('Connection Profile asks the region first, from the chosen cloud, then resiliency, location and bandwidth', () => {
  const c = startType('DataCenter / CoLocation to Cloud');
  tile(vals(c), 'Azure').pick(); vals(c).cfNext();
  let v = vals(c);
  assert.equal(v.cfKey, 'basic');
  assert.equal(v.cfBlock, 'Pick a region.');
  assert.deepEqual(v.cfRegionGroups.map(g => g.cloud), ['Azure']);
  assert.ok(v.cfRegionGroups[0].regions.every(r => r.cloud === 'Azure'));
  region(v, 'Azure eastus').pick();
  v = vals(c);
  assert.deepEqual(c.state.compose.regions, ['Azure eastus']);
  assert.equal(row(v, 'cloud').value, 'Azure eastus');
  assert.notEqual(v.cfBlock, 'Pick a region.');
  assert.equal(v.cfShowLoc, true);
  assert.equal(v.cfShowTiers, true);
  // One region per cloud: a second pick in the same cloud replaces the first.
  region(v, 'Azure westeurope').pick();
  assert.deepEqual(c.state.compose.regions, ['Azure westeurope']);
  assert.match(CF.stepValue('basic', CF.flowOf(c.state.compose, {})), /^Azure westeurope/);
});

test('Cloud to Cloud picks two clouds, then a region in each', () => {
  const c = startType('Cloud to Cloud');
  let v = vals(c);
  tile(v, 'AWS').pick(); v = vals(c);
  assert.equal(v.cfBlock, 'Cloud to Cloud links two clouds. Pick a second cloud.');
  tile(v, 'Azure').pick(); v = vals(c);
  assert.deepEqual(c.state.compose.clouds, ['AWS', 'Azure']);
  assert.equal(v.cfBlock, '');
  v.cfNext(); v = vals(c);
  assert.equal(v.cfKey, 'basic');
  assert.equal(v.cfBlock, 'Pick a region in each cloud.');
  assert.deepEqual(v.cfRegionGroups.map(g => g.cloud), ['AWS', 'Azure']);
  region(v, 'AWS us-east-1').pick(); v = vals(c);
  assert.equal(v.cfBlock, 'Pick a region in each cloud.');
  region(v, 'Azure eastus').pick(); v = vals(c);
  assert.deepEqual(c.state.compose.regions, ['AWS us-east-1', 'Azure eastus']);
  assert.notEqual(v.cfBlock, 'Pick a region in each cloud.');
  // Unpicking a cloud drops its region.
  v.cfSteps.find(s => s.key === 'provider').go(); v = vals(c);
  tile(v, 'Azure').pick();
  assert.deepEqual(c.state.compose.clouds, ['AWS']);
  assert.deepEqual(c.state.compose.regions, ['AWS us-east-1']);
});

test('a cloud the way cannot carry is a dimmed tile with the cant word, and never takes the pick', () => {
  const c = startWay('att');
  vals(c).cfTypes.find(t => t.label === 'DataCenter / CoLocation to Cloud').pick(); vals(c).cfNext();
  const v = vals(c);
  const g = tile(v, 'GCP');
  assert.equal(g.cant, true);
  assert.equal(g.cantWord, 'Not with AT&T provides the port');
  g.pick();
  assert.deepEqual(c.state.compose.clouds || [], []);
  tile(v, 'Azure').pick();
  assert.equal(vals(c).cfWay.title, "AT&T's ExpressRoute");
});

test('Interconnect - Last Mile can pick AWS alone', () => {
  const c = startType('Interconnect - Last Mile');
  const v = vals(c);
  assert.equal(v.cfKey, 'provider');
  assert.deepEqual(v.cfCloudTiles.filter(t => t.can).map(t => t.cloud), ['AWS']);
  assert.match(tile(v, 'Azure').cantWord, /AWS only/);
});

test('a hosted order walks the same steps: the cloud, then the hub-gated region', () => {
  const c = startWay('peer');
  vals(c).cfTypes.find(t => t.label === 'AVPN to Cloud').pick(); vals(c).cfNext();
  tile(vals(c), 'Azure').pick(); vals(c).cfNext();
  const v = vals(c);
  assert.equal(v.cfBlock, 'Pick a region with an AT&T hub.');
  const eu = region(v, 'Azure westeurope'), us = region(v, 'Azure eastus');
  assert.equal(us.off, false); assert.equal(us.why, 'AT&T hub in this region');
  assert.ok(eu);
  us.pick();
  assert.deepEqual(c.state.compose.regions, ['Azure eastus']);
});

test('regions an entry filled from your estate fill the cloud too, both marked From your estate', () => {
  const f = CF.flowOf({ regions: ['AWS us-west-2'], from: { regions: 'estate' }, ctype: 'DataCenter / CoLocation to Cloud' }, {});
  assert.deepEqual(f.clouds, ['AWS']);
  assert.equal(f.from.clouds, 'estate');
  assert.equal(CF.stepStates(f).find(s => s.key === 'provider').state, 'filled');
  const t = CF.flowOf({ regions: ['AWS us-west-2'], from: { regions: 'you' }, byText: true, ctype: 'Internet to Cloud' }, {});
  assert.deepEqual(t.clouds, ['AWS']);
});

test('the markup: tiles alone on Choose Provider, the region pills on Connection Profile', () => {
  const provider = S4.slice(S4.indexOf('<sc-if value="{{ cfIsProvider }}"'), S4.indexOf('<sc-if value="{{ cfIsEndpoints }}"'));
  assert.ok(provider.includes('list="{{ cfCloudTiles }}"'));
  assert.ok(!provider.includes('cfClouds'), 'the region groups are still on Choose Provider');
  assert.ok(!provider.includes('rg.pick'), 'a region is picked on Choose Provider');
  const basic = S4.slice(S4.indexOf('<sc-if value="{{ cfIsBasic }}"'), S4.indexOf('<sc-if value="{{ cfIsAdvanced }}"'));
  assert.ok(basic.includes('list="{{ cfRegionGroups }}"'));
  assert.ok(basic.indexOf('cfRegionGroups') < basic.indexOf('cfTiers'), 'the region comes before resiliency');
  assert.ok(!S4.includes('cfHubRegions') && !S4.includes('cfIsProviderStd'), 'the hosted-only blocks remain');
});
