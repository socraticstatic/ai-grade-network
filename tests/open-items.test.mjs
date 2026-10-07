import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import * as D from '../naas-data.js';
import * as CF from '../naas-connect-flow.js';
import * as AH from '../naas-app-health.js';
import { filterSites } from '../naas-logic.js';
import { coreThing, isAvpnSite } from '../naas-things.js';
import { countOf } from '../naas-sites.js';
import { mkC } from './harness.mjs';

// The connect options session's open items (2026-10-06, built 2026-10-07): Advanced Settings in Routing and Security,
// the estate summarised by how it connects, AVPN to Cloud under Core, and what "healthy" means for an app.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const health = (view = 'partial', extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health', healthView: 'cloud', ...extra });

// ---- Advanced Settings: Routing and Security ----
test('Advanced Settings splits the requirements into Routing and Security and lists the route rules they push', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' });
  vals(c).moveList.find(m => m.key === 'region:Azure').attach();
  vals(c).cfBandwidths.find(b => b.label === '1 Gbps').pick();
  vals(c).cfNext();
  let v = vals(c);
  assert.equal(v.cfKey, 'advanced');
  assert.deepEqual(v.cfPolicyRouting.map(p => p.key), ['Private path required', 'No direct internet path', 'Latency SLO', 'Cost-aware routing']);
  assert.deepEqual(v.cfPolicySecurity.map(p => p.key), ['Inline inspection', 'Segment by tag']);
  // A private path blocks the default route out and allows the matching routes, both ways (NetBond Advanced's sheet).
  assert.deepEqual(v.cfRouteRules.map(r => [r.verb, r.label, r.o2p, r.p2o]), [['Deny', 'Block default routes', true, false], ['Allow', 'Matching routes', true, true]]);
  v.cfPolicySecurity.find(p => p.key === 'Inline inspection').pick();
  v = vals(c);
  assert.ok(v.cfRouteRules.some(r => r.label === 'Selective CV tagging' && r.cls === 'manip'), 'inspection steers by community tags');
  assert.equal(v.cfSecuritySoon.length, 3);
  assert.equal(v.cfShowPolicy, false, 'the chips live in the two sections, not a second grid');
});

// ---- the summary boxes ----
test('the estate by how it connects: each box counts with the map\'s own filter and opens exactly that set', () => {
  const est = D.ESTATES.mature;
  const boxes = CF.connectSummary(est);
  assert.deepEqual(boxes.map(b => b.key), ['vpn', 'internet', 'dc', 'iot', 'clouds']);
  assert.equal(boxes[0].n, 214, 'the session read Established\'s 214 sites on AVPN');
  assert.equal(boxes[2].n, 5, 'and its five data centers');
  for (const b of boxes.filter(x => x.kind === 'sites')) assert.equal(b.n, filterSites(est.sites, b.filter).reduce((a, x) => a + countOf(x.name), 0), b.key);
  assert.equal(boxes[4].n, est.regionsList.length);
  const c = mkC({ view: 'mature', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' });
  const v = vals(c);
  assert.equal(v.hasConnectSummary, true);
  v.connectSummary[0].go();
  assert.equal(c.state.cnPage, 'picture');
  assert.deepEqual(c.state.siteFilter, { svc: ['avpn'] });
  assert.deepEqual(CF.connectSummary(D.ESTATES.empty), []);
});

// ---- AVPN to Cloud under Core ----
test('AVPN sites cross Core on a thing of their own; everything else AT&T carries meets on the backbone', () => {
  const avpn = D.ESTATES.partial.sites.find(isAvpnSite);
  assert.ok(avpn, 'Growing has AVPN sites');
  assert.equal(coreThing(avpn).id, 'c:avpn');
  assert.equal(coreThing(avpn).label, 'AVPN · MPLS');
  const adi = D.ESTATES.partial.sites.find(x => /ADI|Dedicated Internet/.test(x.access || '') && x.accessSla !== 'third');
  assert.equal(coreThing(adi).id, 'c:att');
  assert.equal(coreThing(null).id, 'c:att');
});

// ---- App health ----
test('App health: the path and the app\'s own signals against your thresholds; the session\'s example is Growing\'s finance', () => {
  const v = vals(health());
  const fin = v.appHealthRows.find(r => r.key === 'finance');
  assert.deepEqual(fin.signals.map(g => g.pct), ['95%', '91%', '80%']);
  assert.equal(fin.signals[1].leak, true);
  assert.equal(fin.verdict, 'Down');
  assert.match(fin.why, /^Compute 95% · Database 91% and climbing · Network 80%/);
  assert.equal(v.healthTiles[0].v, '5 of 8', 'the defaults leave every count as it was');
  assert.equal(v.appHealthOk, '5 of 8');
});

test('your thresholds move every count that reads app health, here and on the home', () => {
  const c = health();
  const lower = () => vals(c).appThreshCtl.find(t => t.key === 'vm').dec();
  for (let i = 0; i < 5; i++) lower();
  assert.deepEqual(c.state.appThresh, { vm: 60, db: 85, net: 75 });
  const v = vals(c);
  assert.equal(v.healthTiles[0].v, '2 of 8');
  assert.equal(v.appThreshChanged, true);
  for (let i = 0; i < 10; i++) vals(c).appThreshCtl.find(t => t.key === 'vm').dec();
  assert.equal(c.state.appThresh.vm, AH.MIN, 'thresholds stop at the floor');
  vals(c).appThreshReset();
  assert.equal(vals(c).healthTiles[0].v, '5 of 8');
  // The home's Apps healthy reads the same definition.
  const h = mkC({ view: 'partial', estateParam: null, screen: 's0', appThresh: { vm: 60 } });
  const hv = vals(h);
  assert.ok(JSON.stringify(hv).includes('"big":"2"'), 'the home card counts with your thresholds');
});

test('a database whose memory climbs is at risk whatever it reads; a signal at its threshold is over', () => {
  const est = D.ESTATES.partial;
  const fin = AH.signalsOf(est, 'finance');
  assert.equal(fin.signals.find(g => g.key === 'db').state, 'slo');
  const high = AH.signalsOf(est, 'finance', { db: 95 });
  assert.equal(high.signals.find(g => g.key === 'db').state, 'risk', 'leaking, so at risk even under the threshold');
  const calm = AH.signalsOf(est, 'pci');
  assert.ok(calm.signals.every(g => g.value <= 62 && g.state === 'ok'));
});
