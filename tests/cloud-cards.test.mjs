import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import { heroLayout } from '../naas-logic.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The right column starts at cloud providers, as the left starts at regions
// (Micah, 2026-09-23: "collapse the right side further to Cloud Providers as
// the first level"). A provider card fans one wire per on-ramp its regions use,
// plus one for the internet, so the first screen still says how each cloud is
// reached. The provider drills to its regions, and a region to its VPCs.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const M = D.ESTATES.mature;
const root = () => heroLayout(M, { bandX: 300, bandW: 500 });
const cards = (l) => l.regions.filter(r => r.card);

test('the first level on the right is one card per cloud provider', () => {
  const l = root();
  assert.deepEqual(cards(l).map(c => c.cloud), ['AWS', 'Azure', 'GCP', 'CoreWeave']);
  assert.equal(l.regions.some(r => !r.card && !r.rollup), false, 'a region row leaked onto the first level');
});

test('a provider card counts its regions and sums their workloads', () => {
  const aws = cards(root()).find(c => c.cloud === 'AWS');
  const regs = M.regionsList.filter(r => r.cloud === 'AWS');
  assert.equal(aws.count, regs.length);
  assert.equal(aws.wl, regs.reduce((a, r) => a + r.wl, 0));
  assert.deepEqual(aws.regions, regs.map(r => r.region));
});

// "Make the AWS line one line by default pre-expand" (2026-09-23): a provider
// draws one wire out of the band; inside, each on-ramp keeps its own route.
test('a provider draws one wire until it is opened, and a route per on-ramp inside the band', () => {
  const l = root();
  const wires = (cloud) => l.edges.filter(e => e.kind === 'egress' && e.region && e.region.card && e.region.cloud === cloud);
  for (const c of ['AWS', 'Azure', 'GCP', 'CoreWeave']) assert.equal(wires(c).length, 1, `${c} draws ${wires(c).length} wires`);
  assert.equal(wires('AWS')[0].y2, cards(l).find(c => c.cloud === 'AWS').cy);
  assert.equal(wires('AWS')[0].priv, true);
  const aws = l.routes.filter(r => r.side === 'region' && r.region === 'AWS').map(r => r.who);
  assert.deepEqual(aws, ['AWS · ce:netbond', 'AWS · ce:dx']);
});

test('each private wire runs Core, its on-ramp, the provider\'s gateway', () => {
  const l = root();
  const node = (id) => l.nodes.find(n => n.id === id);
  const route = (cloud, line) => l.routes.find(r => r.side === 'region' && r.region === cloud && r.who === `${cloud} · ${line}`);
  const nb = route('AWS', 'ce:netbond'), dx = route('AWS', 'ce:dx');
  assert.deepEqual(nb.nodes.map(id => node(id).label), ['AT&T backbone', 'NetBond', 'AWS gateway']);
  assert.deepEqual(dx.nodes.map(id => node(id).label), ['AT&T backbone', 'Direct Connect', 'AWS gateway']);
  assert.equal(route('GCP', 'ce:netbond').nodes[1], nb.nodes[1], 'NetBond is drawn twice');
});

test('a wire carries its regions\' numbers, so the lenses still read', () => {
  const dx = root().edges.find(e => e.region && e.region.card && e.region.cloud === 'AWS').region;
  const regs = M.regionsList.filter(r => r.cloud === 'AWS' && r.priv);
  assert.equal(dx.wl, regs.reduce((a, r) => a + r.wl, 0));
  for (const k of ['fab', 'pub']) assert.ok(Number.isFinite(dx[k]), `${k} is ${dx[k]}`);
  assert.equal(dx.link, 'degraded', 'eu-central-1 is degraded and its card wire hides it');
});

test('Lumen reaches the AWS card on the first screen, over its own on-ramp', () => {
  const l = root();
  const lumen = l.routes.find(r => r.side === 'path');
  assert.ok(lumen, 'the Lumen end-to-end line is gone from the first screen');
  assert.equal(l.nodes.find(n => n.id === lumen.nodes[4]).label, 'AWS gateway');
  assert.equal(l.edges.filter(e => String(e.id).startsWith('via')).length, 0, 'a second wire was drawn to a card AWS already reaches');
});

test('us-west-2\'s own cross-connect rides the AWS Direct Connect wire', () => {
  const xc = root().xconnects.filter(x => x.region);
  assert.equal(xc.length, 1);
  assert.equal(xc[0].region, 'AWS');
  assert.equal(xc[0].at, 'Equinix SE2, Seattle');
});

// ---- the drill: provider, region, VPC ----

const on = (patch = {}) => mkC({ view: 'mature', screen: 's3', tab: 'connect', estateParam: null, ...patch });
const regionNames = (v) => v.heroRegions.filter(r => !r.rollup).map(r => r.region);

test('the first level renders provider cards, not region rows', () => {
  const v = vals(on());
  assert.deepEqual(v.heroClouds.map(c => c.cloud), ['AWS', 'Azure', 'GCP', 'CoreWeave']);
  assert.match(v.heroClouds[0].sub, /^4 regions · /);
  assert.deepEqual(regionNames(v), []);
});

test('a provider card opens to its regions, and up returns to the providers', () => {
  const c = on();
  vals(c).heroClouds.find(x => x.cloud === 'AWS').click();
  assert.equal(c.state.cloudPick, 'AWS');
  let v = vals(c);
  assert.deepEqual(regionNames(v), M.regionsList.filter(r => r.cloud === 'AWS').map(r => r.region));
  assert.equal(v.heroClouds.length, 0);
  assert.equal(v.cloudsHead, '‹ AWS');
  v.cloudsUp();
  assert.equal(c.state.cloudPick, null);
  assert.equal(vals(c).heroClouds.length, 4);
});

test('a region under a provider opens its VPCs, and up returns to the provider', () => {
  const c = on({ cloudPick: 'AWS' });
  vals(c).heroRegions.find(r => r.region === 'us-east-1').click();
  assert.deepEqual(c.state.cloudDrill, ['us-east-1']);
  vals(c).cloudsUp();
  assert.deepEqual(c.state.cloudDrill, []);
  assert.equal(c.state.cloudPick, 'AWS', 'up from a region skipped its provider');
});

test('a region opened from anywhere else still comes back up through its provider', () => {
  const c = on({ cloudDrill: ['eastus'] });
  vals(c).cloudsUp();
  assert.deepEqual(c.state.cloudDrill, []);
  assert.equal(c.state.cloudPick, 'Azure');
});

test('leaving the page resets the provider as well as the trail', () => {
  const c = on({ cloudPick: 'AWS' });
  vals(c).setView({ target: { value: 'partial' } });
  assert.equal(c.state.cloudPick, null);
});

test('the markup draws the provider cards', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  assert.match(HTML, /<sc-for list="\{\{ heroClouds \}\}" as="cc"/);
});

// ---- one grid across the picture (2026-09-23: "vertically space out the pills
// on left middle and right and align vertically") ----
test('cards on both sides and the things between them sit on one set of rows', () => {
  for (const k of ['mature', 'partial', 'trust']) {
    const l = heroLayout(D.ESTATES[k], { bandX: 320, bandW: 580 });
    const rowTop = l.bandY + 30, onRow = (y) => (y - rowTop) % 52 === 0;
    for (const s of l.sites) assert.ok(onRow(s.cy), `${k}: ${s.name} is off the rows at ${s.cy}`);
    for (const c of cards(l)) assert.ok(onRow(c.cy), `${k}: ${c.cloud} is off the rows at ${c.cy}`);
    for (const n of l.nodes) assert.ok(onRow(n.y), `${k}: ${n.label} is off the rows at ${n.y}`);
  }
});

test('the right column starts where the layout says, and the wires land on it', () => {
  const l = root();
  for (const e of l.edges.filter(x => x.kind === 'egress')) assert.equal(e.x2, l.rightX, e.id);
});
