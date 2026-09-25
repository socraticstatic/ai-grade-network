import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "We need better drill down indicators. The breadcrumbs get lost, it's easy to
// lose how far down one is" (Micah, 2026-09-25). The trail sat above the tiles,
// far from the picture, and the columns said only "‹ US EAST". Each column now
// carries a ladder of its levels: the ones passed (named, clickable), the one
// you are on, and the ones still below.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const on = (patch = {}) => mkC({ view: 'mature', screen: 's3', tab: 'connect', estateParam: null, ...patch });
const names = (l) => l.map(s => s.name);
const states = (l) => l.map(s => (s.isDone ? 'done' : s.isCurrent ? 'here' : 'next'));

test('at the top, each ladder shows every level with the first one current', () => {
  const v = vals(on());
  assert.deepEqual(names(v.cloudLadder), ['Providers', 'Regions', 'VPCs', 'Subnets', 'Workloads']);
  assert.deepEqual(states(v.cloudLadder), ['here', 'next', 'next', 'next', 'next']);
  assert.equal(v.siteLadder[0].name, 'Regions');
  assert.equal(v.siteLadder[0].isCurrent, true);
  assert.equal(v.siteLadder[v.siteLadder.length - 1].name, 'Paths', 'the site ladder does not say how deep it goes');
});

test('drilled into a region, the site ladder names what was chosen and where you are', () => {
  const v = vals(on({ drill: ['region:US West'] }));
  assert.deepEqual(states(v.siteLadder).slice(0, 2), ['done', 'here']);
  assert.equal(v.siteLadder[0].value, 'US West');
  assert.equal(v.siteLadder[1].name, 'Sites');
  assert.equal(v.sitesDrilled, true);
});

test('four levels down on the right, the ladder reads Providers to Subnets and knows Workloads is next', () => {
  const c = on({ cloudPick: 'AWS', cloudDrill: ['us-east-1', 'vpc-0-0'] });
  const v = vals(c);
  assert.deepEqual(states(v.cloudLadder), ['done', 'done', 'done', 'here', 'next']);
  assert.deepEqual(v.cloudLadder.slice(0, 3).map(s => s.value), ['AWS', 'us-east-1', v.cloudLadder[2].value]);
  assert.match(v.cloudDepth, /Level 4 of 5/);
  assert.equal(v.cloudsDrilled, true);
});

test('a level you passed takes you back to it', () => {
  const c = on({ cloudPick: 'AWS', cloudDrill: ['us-east-1', 'vpc-0-0'] });
  vals(c).cloudLadder[1].go();
  assert.deepEqual(c.state.cloudDrill, []);
  assert.equal(c.state.cloudPick, 'AWS');
  vals(c).cloudLadder[0].go();
  assert.equal(c.state.cloudPick, null);
  const s = on({ drill: ['region:US West', 'Denver branch'] });
  vals(s).siteLadder[0].go();
  assert.deepEqual(s.state.drill, []);
});

test('the ladders sit in the picture, and the old trail above the tiles is gone', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  assert.match(HTML, /<sc-for list="\{\{ siteLadder \}\}"/);
  assert.match(HTML, /<sc-for list="\{\{ cloudLadder \}\}"/);
  assert.doesNotMatch(HTML, /<nav aria-label="Breadcrumb"/);
  const bar = HTML.indexOf('{{ siteLadder }}'), svg = HTML.indexOf('aria-label="Fabric picture"');
  assert.ok(bar > 0 && bar < svg && svg - bar < 6000, 'the ladders are not right above the picture');
});

// Found 2026-09-25 walking the ladder: hovering a region set hoverRegion, and
// going back up to the provider cards left no region row to anchor its popover,
// so the page threw "Cannot read properties of undefined (reading 'y')".
test('a region still hovered when you climb to the providers does not break the page', () => {
  const v = vals(on({ hoverRegion: 'us-east-1', hoverNode: 'regus-east-1' }));
  assert.ok(v.heroClouds.length > 0);
});
