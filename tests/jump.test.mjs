import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, estateFor } from '../naas-app.js';
import * as X from '../naas-connections.js';
import * as A from '../naas-addendum.js';
import { mkC } from './harness.mjs';

// Micah, 2026-10-13, on Connect > Connections: "Edge access diagram needs an elegant consistent way to immediately go to
// an asset deep down like a pci. Don't invent a new ui for filtering/searching", then "PCI is just an example", "want to
// find something specific". The picture gets the flow map's own Jump: the same button, the same search box, "/" opens it,
// Enter lands. It reaches every place the picture drills (region, state, metro, site; cloud, region, VPC, subnet), a
// workload by name or address, and a tag where most of it runs, with the drill trails and the drawer the picture has.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const picture = (view = 'partial') => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'picture' });
const indexOf = (view) => { const est = estateFor({ view, estateParam: null, addedSources: [], siteTags: {}, buCustom: {} }); return X.jumpIndex(est, A.inventory(est)); };
const type = (c, q) => { vals(c).openPicJump(); vals(c).setPicJumpQ({ target: { value: q } }); };
const key = (c, k) => vals(c).picJumpKey({ key: k, preventDefault: () => {} });

test('the index reaches every rung the picture drills, on both sides', () => {
  const ix = indexOf('partial');
  const has = (kind, name) => ix.some(e => e.kind === kind && e.name === name);
  for (const [k, n] of [['Region', 'US East'], ['State', 'Georgia'], ['Metro', 'Atlanta'], ['Site', 'Atlanta office'], ['Cloud', 'AWS'], ['Cloud region', 'us-east-1'], ['VPC', 'vpc-prod-01'], ['Workload', 'alb-a01'], ['Tag', 'pci']]) assert.ok(has(k, n), `${k} ${n}`);
  assert.ok(ix.some(e => e.kind === 'Subnet'), 'no subnets');
  const pci = ix.find(e => e.kind === 'Tag' && e.name === 'pci');
  assert.equal(pci.count, 58);
  assert.deepEqual(pci.trail, ['AWS', 'us-east-1', 'vpc-prod-01']);
});

test('the best match leads: an exact name, then a prefix, then a word, then anywhere; a tag by its size', () => {
  const ix = indexOf('partial');
  assert.deepEqual(X.jumpFind(ix, 'pci').slice(0, 1).map(e => [e.kind, e.name]), [['Tag', 'pci']]);
  assert.deepEqual(X.jumpFind(ix, 'atlanta').slice(0, 2).map(e => [e.kind, e.name]), [['Metro', 'Atlanta'], ['Site', 'Atlanta office']]);
  assert.deepEqual(X.jumpFind(ix, '10.10.0.10').slice(0, 1).map(e => [e.kind, e.name]), [['Workload', 'alb-a01']]);
  assert.deepEqual(X.jumpFind(ix, '   '), []);
  assert.deepEqual(X.jumpFind(ix, 'no-such-thing-anywhere'), []);
  // Bank scale runs pci in two regions: the larger home first.
  const big = X.jumpFind(indexOf('trust'), 'pci').filter(e => e.kind === 'Tag');
  assert.deepEqual(big.map(e => [e.trail[1], e.count]), [['us-east-1', 447], ['us-east-2', 231]]);
});

test('Jump on the picture: pci lands on its VPC with the drawer listing only its workloads', () => {
  const c = picture();
  type(c, 'pci');
  let v = vals(c);
  assert.equal(v.picJumpOpen, true);
  assert.match(v.picJumpHint, /^Tag · AWS › us-east-1 › vpc-prod-01 · 58$/);
  key(c, 'Enter');
  assert.equal(c.state.picJumpOpen, false);
  assert.equal(c.state.cloudPick, 'AWS');
  assert.equal(c.state.cloudDrill.length, 2);
  assert.equal(c.state.cloudDrill[0], 'us-east-1');
  v = vals(c);
  assert.ok(v.drawer, 'the drawer did not open');
  assert.equal(v.drawer.matching, 58);
  assert.ok(v.drawer.rows.every(r => /pci/.test(r.sub || r.tag || '')), 'a row that is not pci');
  assert.deepEqual(v.cloudTrail.map(t => t.label).slice(-3), ['AWS', 'us-east-1', 'vpc-prod-01']);
});

test('Jump reaches a site four rungs down and clears the filters that would hide it', () => {
  const c = picture();
  c.setState({ siteFilter: { svc: ['avpn'] }, siteGroup: 'access' });
  type(c, 'Atlanta office');
  key(c, 'Enter');
  assert.deepEqual(c.state.drill, ['region:US East', 'state:GA', 'metro:Atlanta', 'site:Atlanta office']);
  assert.deepEqual(c.state.siteFilter, {});
  assert.equal(c.state.siteGroup, 'region');
  assert.deepEqual(vals(c).siteTrail.map(t => t.label).slice(-1), ['Atlanta office']);
});

test('Jump finds a workload by its address and opens its subnet with it in the drawer', () => {
  const c = picture();
  type(c, '10.10.0.10');
  key(c, 'Enter');
  assert.equal(c.state.cloudDrill.length, 3);
  const v = vals(c);
  assert.ok(v.drawer && v.drawer.rows.some(r => r.id === 'alb-a01' || r.name === 'alb-a01'), 'alb-a01 is not in the drawer');
});

test('arrows walk the matches, Esc closes, and nothing moves without a match', () => {
  const c = mkC({ view: 'trust', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'picture' });
  type(c, 'pci');
  assert.match(vals(c).picJumpCount, /^1 of \d+$/);
  key(c, 'ArrowDown');
  assert.match(vals(c).picJumpHint, /us-east-2/);
  key(c, 'ArrowUp');
  assert.match(vals(c).picJumpHint, /us-east-1/);
  key(c, 'Escape');
  assert.equal(c.state.picJumpOpen, false);
  const before = JSON.stringify([c.state.drill, c.state.cloudDrill]);
  type(c, 'no-such-thing-anywhere');
  assert.equal(vals(c).picJumpHint, 'No match');
  key(c, 'Enter');
  assert.equal(JSON.stringify([c.state.drill, c.state.cloudDrill]), before);
  assert.equal(c.state.picJumpOpen, true, 'a miss keeps the box open to try again');
  vals(c).picKey({ key: '/', preventDefault: () => {} });
});

test('the markup is the flow map\'s: the Jump button in the filter row, its search box, "/" on the picture, focus on open', () => {
  const i = HTML.indexOf('aria-label="Site filters"');
  const row = HTML.slice(i, HTML.indexOf('aria-label="Clouds breadcrumb"', i));
  assert.match(row, /<button class="fx-btn" onClick="\{\{ openPicJump \}\}"[^>]*title="Jump to anything by name \(\/\)">Jump<\/button>/);
  assert.match(row, /<label class="fx-search" data-jump-focus="1"[^>]*>[\s\S]*?onKeyDown="\{\{ picJumpKey \}\}"/);
  assert.match(HTML, /data-map-diagram="1"[^>]*onKeyDown="\{\{ picKey \}\}"/);
  assert.ok(HTML.includes("querySelector('[data-jump-focus] input')"), 'the box does not take focus when it opens');
});
