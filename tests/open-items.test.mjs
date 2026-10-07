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

// ---- fewer words (2026-10-07): a card's security value in one word, never the wrong one ----
test('a security value shortens to one word, private before public', async () => {
  const { secShort } = await import('../naas-app.js');
  assert.equal(secShort('Private, off the internet'), 'Private');
  assert.equal(secShort('Private and inspected'), 'Inspected');
  assert.equal(secShort('Encrypted, still public'), 'Public');
  assert.equal(secShort('Public · 28 workloads'), 'Public');
  assert.equal(secShort('Private for 1 of 2'), 'Private 1/2');
  assert.equal(secShort('IPsec on AT&T internet'), 'Public');
  assert.equal(secShort('Private, two paths'), 'Two paths');
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options', moveOpen: 'region:Azure' }));
  const az = v.moves.find(m => m.key === 'region:Azure');
  assert.deepEqual(az.tiers.map(t => t.sec.short), ['Private', 'Private', 'Inspected']);
  assert.equal(az.tSec.short, 'Public');
  assert.equal(az.short, 'Azure westeurope');
});

// ---- fewer words (2026-10-07): the home cards' footnote and the Signals line as glyph chips, the sentence in the title ----
test('a home card\'s footnote is glyph chips whose titles say what the footnote said', () => {
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's0' }));
  for (const c of v.homeCards) {
    assert.ok(c.footChips.length > 0, c.key);
    for (const x of c.footChips) assert.ok(x.icon && x.t && x.title && x.t.length <= x.title.length, `${c.key}: ${x.t}`);
  }
  const apps = v.homeCards.find(c => c.key === 'apps');
  assert.deepEqual(apps.footChips.map(x => [x.icon, x.t, x.title]), [['close-circle', '1', '1 down'], ['clock', '1', '1 over latency target'], ['exclamation-triangle', '1', '1 at risk']]);
  const eg = v.homeCards.find(c => c.key === 'egress');
  assert.equal(eg.footChips[0].t, '$32,300/mo');
  assert.equal(eg.footChips[0].ink, 'var(--success)', 'the saving alone wears the success ink');
});

test('a Signals line splits into a glyph and its figure per part', async () => {
  const { headChips } = await import('../naas-app.js');
  const pick = (h) => headChips(h).map(x => [x.icon, x.t]);
  assert.deepEqual(pick('3 problems · 2 apps affected'), [['exclamation-circle', '3'], ['apps', '2']]);
  assert.deepEqual(pick('3 of 23 flows over SLO · 1 spike'), [['clock', '3 of 23'], ['trending-up', '1']]);
  assert.deepEqual(pick('None of 2 above 80% at peak · 1 could shrink'), [['high-meter', 'None of 2'], ['trending-down', '1']]);
  assert.deepEqual(pick('AWS us-east-1 · 31% of traffic'), [['cloud', 'AWS us-east-1'], ['cloud-transfer', '31%']]);
  assert.deepEqual(pick('Public egress +$6,800/mo in 11 weeks · +10%'), [['bill', '+$6,800/mo'], ['trending-up', '+10%']]);
  assert.deepEqual(pick('Save $41,500/mo of $89,600/mo egress'), [['trending-down', '$41,500/mo']]);
  assert.deepEqual(pick('No ports to measure'), [['minus-circle', 'No ports']]);
  assert.equal(headChips('3 problems · 2 apps affected')[0].title, '3 problems');
  const sig = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'signals' }));
  for (const g of sig.sigCards) assert.ok(g.headChips.length > 0 && g.headChips.every(x => x.icon && x.t), g.title);
});

// ---- fewer words (2026-10-07, "Go"): finding heads pared for list lines, Needs attention glyph-first ----
test('a finding head pares to the same figures in fewer words; an unknown head passes unchanged', async () => {
  const { pareHead } = await import('../naas-app.js');
  const P = [
    ['5 sites reach the cloud over IPsec on the public internet', '5 sites on IPsec over the internet'],
    ['4 AT&T sites reach the cloud over tunnels on the internet', '4 AT&T sites tunnel over the internet'],
    ['$40,800/mo of internet egress the AT&T network would carry for $17,600', '$40,800/mo egress, $17,600 on AT&T'],
    ['$22,200/mo of cross-cloud traffic crosses the public internet', '$22,200/mo cross-cloud on the internet'],
    ['$8,600/mo of egress rides IPsec tunnels over the internet', '$8,600/mo egress over IPsec'],
    ['31 internet-facing workloads have no inspection in path', '31 internet-facing workloads uninspected'],
    ['Azure eastus has one path, and finance rides it', 'Azure eastus: one path, finance on it'],
    ['AWS us-west-2 peaks at 84% of 2 × 10 Gbps', 'AWS us-west-2 peaks at 84%'],
    ['GCP us-central1 at 81% of 5 × 10 Gbps purchased', 'GCP us-central1 at 81%'],
    ['2 regions run above the latency SLO', '2 regions over latency SLO'],
    ['6 PCI-tagged workloads reach the internet directly', '6 PCI-tagged workloads reach the internet'],
    ['6 paths send no telemetry', '6 paths send no telemetry'],
  ];
  for (const [a, b] of P) assert.equal(pareHead(a), b);
  // Every number in the head survives the paring, except a capacity's port size (it stays in the title).
  for (const [a, b] of P.filter(([x]) => !/Gbps/.test(x))) for (const n of a.match(/\$?[\d,]+(?:\/mo)?%?/g) || []) assert.ok(b.includes(n), `${a}: ${n}`);
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's0' }));
  for (const d of v.homeDo) assert.ok(d.headAll.length >= d.head.length, d.head);
  assert.ok(v.homeDo.some(d => d.head === '5 sites on IPsec over the internet'));
});

test('Needs attention: the state wears its glyph, the place its cloud mark and path glyph, the impact two chips', () => {
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's0' }));
  const down = v.homeAttn.find(a => a.word === 'Down');
  assert.equal(down.stateIcon, 'close-circle');
  assert.equal(down.region, 'eastus'); assert.equal(down.hasMark, true); assert.equal(down.thingIcon, 'cable');
  assert.deepEqual(down.impactChips.map(x => [x.icon, x.t, x.title]), [['grid', '1', '1 app'], ['apps', '40', '40 workloads']]);
  assert.equal(down.where, 'Azure eastus · ExpressRoute', 'the full place stays as the title');
  assert.ok(v.homeAttn.filter(a => /internet/i.test(a.thing)).every(a => a.thingIcon === 'globe'));
});
