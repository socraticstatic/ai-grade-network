import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Your clouds counts clouds, not sites (notes, 2026-09-30, Task 2.4): "the
// tiles shows sites 25, on AT&T 20 etc is not related to clouds, we should show
// how many clouds/regions/VPC/VNETS/Apps are in these environment, how many
// connected with AT&T cloud connectivity, how many of them are connected over
// IPSec, SD-WAN solution or 3rd party cloud connectivity solution".

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const clouds = (view, trail = [], patch = {}) => vals(mkC({ view, estateParam: null, screen: 's1', estPanel: 'clouds', cloudTrailE: trail, ...patch }));
const pill = (v, key) => v.invStats.find(p => p.key === key).v;
const tileLabels = (v) => v.cloudTiles.map(t => t.l);

test('the tiles follow the drill, level by level', () => {
  const inv = A.inventory(D.ESTATES.partial);
  const vpc = inv.find(c => c.regions.some(r => r.region === 'eastus')).regions.find(r => r.region === 'eastus').vpcs[0];
  const trails = [[], ['cloud:Azure'], ['cloud:Azure', 'region:eastus'], ['cloud:Azure', 'region:eastus', 'vpc:' + vpc.id], ['cloud:Azure', 'region:eastus', 'vpc:' + vpc.id, 'sn:' + vpc.subnets[0].id]];
  const labels = trails.map(t => tileLabels(clouds('partial', t)).join('|'));
  assert.equal(new Set(labels).size, 5, labels.join(' / '));
  assert.deepEqual(tileLabels(clouds('partial')), ['Clouds', 'Regions', 'VPCs & VNets', 'Apps']);
  assert.deepEqual(tileLabels(clouds('partial', ['cloud:Azure'])), ['Regions', 'VNets', 'Apps', 'Workloads']);
});

test('at the root, the tiles agree with the header pills', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const v = clouds(view);
    const t = Object.fromEntries(v.cloudTiles.map(x => [x.l, String(x.v)]));
    assert.equal(t.Clouds, String(pill(v, 'c')), view);
    assert.equal(t.Regions, String(pill(v, 'r')), view);
  }
});

test('the mix counts every VPC once, and what is attached equals the header', () => {
  for (const [view, attached] of [['partial', 3], ['mature', 14], ['trust', 8], ['small', 0]]) {
    const est = D.ESTATES[view], inv = A.inventory(est);
    const sc = X.cloudScope(est, inv, []);
    assert.equal(sc.mix.reduce((a, m) => a + m.n, 0), sc.counts.vpcs, view);
    assert.equal(sc.mix.filter(m => m.mode !== 'internet').reduce((a, m) => a + m.n, 0), attached, view);
    for (const cloud of [...new Set(est.regionsList.map(r => r.cloud))]) {
      const c = X.cloudScope(est, inv, ['cloud:' + cloud]);
      assert.equal(c.mix.reduce((a, m) => a + m.n, 0), c.counts.vpcs, `${view}/${cloud}`);
    }
  }
});

test('ExpressRoute and Direct Connect are the cloud provider\'s; Equinix is a third party', () => {
  const m = Object.fromEntries(X.cloudScope(D.ESTATES.mature, A.inventory(D.ESTATES.mature), []).mix.map(x => [x.mode, x.n]));
  assert.ok(m.direct > 0 && m.third > 0 && m.netbond > 0, JSON.stringify(m));
  const p = Object.fromEntries(X.cloudScope(D.ESTATES.partial, A.inventory(D.ESTATES.partial), ['cloud:Azure']).mix.map(x => [x.mode, x.n]));
  assert.equal(p.netbond, 0, 'the eastus ExpressRoute is not counted as NetBond');
});

test('IPsec and SD-WAN come from the sites that carry them', () => {
  assert.match(X.cloudScope(D.ESTATES.partial, A.inventory(D.ESTATES.partial), []).siteLine, /^5 IPsec sites · 0 SD-WAN sites$/);
  assert.match(X.cloudScope(D.ESTATES.trust, A.inventory(D.ESTATES.trust), []).siteLine, /SD-WAN sites$/);
});

test('no site tiles remain; the words follow the cloud', () => {
  for (const t of [[], ['cloud:AWS']]) assert.ok(!tileLabels(clouds('partial', t)).some(l => /Sites|On AT&T|Not on AT&T/.test(l)));
  assert.ok(tileLabels(clouds('partial', ['cloud:Azure'])).includes('VNets'));
  assert.ok(tileLabels(clouds('partial', ['cloud:AWS'])).includes('VPCs'));
});

test('landing an attach moves that region\'s VPCs from the internet to NetBond', () => {
  const nb = (v) => (v.cloudMix.find(m => m.mode === 'netbond') || { n: 0 }).n;
  assert.ok(nb(clouds('partial', [], { landed: 'us-west-2' })) > nb(clouds('partial')));
});
