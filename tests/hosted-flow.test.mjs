import test from 'node:test';
import assert from 'node:assert/strict';
import { vals, orderPhases } from '../naas-app.js';
import * as CF from '../naas-connect-flow.js';
import * as W from '../naas-ways.js';
import { mkC } from './harness.mjs';

// The storyboards (2026-10-16): a hosted way is cloud-only. Its order has no customer site end, so the wizard asks for
// the cloud, then the region once (where AT&T has a hub), the bandwidth, the way's own intake and the grant that lets
// AT&T provision on your behalf. AT&T builds it; for peering you accept it in your console.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const ways = (view = 'partial') => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'ways' });
const start = (way, view) => { const c = ways(view); vals(c).wayCards.find(w => w.key === way).start(); return c; };
const row = (v, key) => v.cfWip.find(r => r.key === key);
const field = (v, key) => v.cfIntake.fields.find(x => x.key === key);
const type = (v, label) => v.cfTypes.find(t => t.label === label);
const region = (v, name) => v.cfRegionGroups.flatMap(g => g.regions).find(r => r.name === name);

test('a hosted order offers only the types whose far end is a cloud; a NetBond order still offers all nine', () => {
  const c = start('peer');
  assert.deepEqual(vals(c).cfTypes.map(t => t.key), ['internet', 'c2c', 'dc', 'vpn', 'iot']);
  assert.equal(vals(c).cfIsHosted, true);
  const n = start('byo');
  assert.equal(vals(n).cfTypes.length, 9);
  assert.equal(vals(n).cfIsHosted, false);
});

test('Choose Provider for a hosted order picks the cloud alone; the region waits for Connection Profile', () => {
  const c = start('peer');
  type(vals(c), 'AVPN to Cloud').pick(); vals(c).cfNext();
  let v = vals(c);
  assert.equal(v.cfKey, 'provider');
  assert.deepEqual(v.cfCloudTiles.filter(t => t.can).map(t => t.cloud), ['AWS', 'Azure'], 'peering is on AWS and Azure');
  assert.equal(v.cfBlock, 'Pick a cloud.');
  v.cfCloudTiles.find(t => t.cloud === 'Azure').pick();
  v = vals(c);
  assert.equal(c.state.compose.cloud, 'Azure');
  assert.equal(row(v, 'cloud').value, 'Azure, region not chosen yet');
  assert.equal(v.cfBlock, '');
  assert.equal(CF.stepValue('provider', CF.flowOf(c.state.compose, {})), 'Azure');
});

test('hub regions: a region without an AT&T hub is offered off, and says so', () => {
  const f = { way: 'peer', cloud: 'Azure', regions: [], intake: {}, grant: false, loc: [], sites: [], policy: [] };
  const est = { regionsList: [{ cloud: 'Azure', region: 'eastus', priv: false }, { cloud: 'Azure', region: 'australiaeast', priv: false }, { cloud: 'AWS', region: 'us-east-1', priv: true }] };
  assert.deepEqual(CF.hubRegionsOf(f, est).map(r => [r.name, r.hub]), [['Azure eastus', true], ['Azure australiaeast', false]]);
  assert.equal(CF.hubRegionsOf(f, est)[1].why, 'No AT&T hub in this region yet');
});

test('Connection Profile for a hosted order: the region once, the bandwidth, the intake and the grant; no site Location, no tiers', () => {
  const c = start('peer');
  type(vals(c), 'AVPN to Cloud').pick(); vals(c).cfNext();
  vals(c).cfCloudTiles.find(t => t.cloud === 'Azure').pick(); vals(c).cfNext();
  let v = vals(c);
  assert.equal(v.cfKey, 'basic');
  assert.equal(v.cfShowTiers, false);
  assert.equal(v.cfShowLoc, false);
  assert.equal(v.cfIsHosted, true);
  assert.equal(v.cfBlock, 'Pick a region with an AT&T hub.');
  region(v, 'Azure eastus').pick();
  v = vals(c);
  assert.deepEqual(c.state.compose.regions, ['Azure eastus']);
  assert.equal(v.cfBlock, 'Pick a bandwidth.');
  v.cfBandwidths.find(b => b.label === '1 Gbps').pick();
  v = vals(c);
  // The deck's intake for Azure peering: subscription ID, VNet name, address space.
  assert.deepEqual(v.cfIntake.fields.map(x => x.key), ['subscriptionId', 'vnetName', 'cidrs']);
  assert.equal(v.cfIntake.title, 'Your VNet');
  assert.equal(v.cfBlock, 'Enter your subscription ID.');
  field(v, 'subscriptionId').set({ target: { value: '7f3a1c2e-9b4d-4e8f-a1b2-3c4d5e6f7a8b' } });
  field(vals(c), 'vnetName').set({ target: { value: 'prod-vnet-eastus' } });
  field(vals(c), 'cidrs').set({ target: { value: '10.250.4.0/24' } });
  v = vals(c);
  // The hub's own range: AT&T keeps an IPAM per cloud, and an overlap stops the order.
  assert.match(v.cfIntake.overlap, /overlaps AT&T's hub/);
  assert.equal(v.cfIntake.overlapOk, false);
  assert.match(v.cfBlock, /overlaps AT&T's hub/);
  field(v, 'cidrs').set({ target: { value: '10.20.0.0/16, 10.21.0.0/16' } });
  v = vals(c);
  assert.equal(v.cfIntake.overlapOk, true);
  assert.match(v.cfIntake.overlap, /No overlap/);
  assert.equal(v.cfBlock, 'Grant AT&T access to provision.');
  assert.match(v.cfGrant.words, /service principal.*Lighthouse Network Write/);
  assert.equal(v.cfGrant.on, false);
  v.cfGrant.toggle();
  v = vals(c);
  assert.equal(v.cfGrant.on, true);
  assert.equal(v.cfBlock, '');
  // The order so far: no Sites, Location or Resiliency rows; the region, your VNet and the grant instead.
  assert.equal(row(v, 'sites'), undefined); assert.equal(row(v, 'loc'), undefined); assert.equal(row(v, 'tier'), undefined);
  assert.equal(row(v, 'cloud').value, 'Azure eastus');
  assert.equal(row(v, 'intake').value, 'prod-vnet-eastus · 10.20.0.0/16, 10.21.0.0/16');
  assert.equal(row(v, 'grant').value, 'Granted: AT&T may provision in your subscription');
  assert.equal(v.cfDiagram.left, "AT&T's hub");
  assert.equal(v.cfDiagram.right, 'Azure eastus');
});

test('Private Link Service asks for the deck\'s objects and says AT&T builds them', () => {
  const c = start('privatelink');
  type(vals(c), 'AVPN to Cloud').pick(); vals(c).cfNext();
  vals(c).cfCloudTiles.find(t => t.cloud === 'Azure').pick(); vals(c).cfNext();
  region(vals(c), 'Azure eastus').pick();
  const v = vals(c);
  assert.deepEqual(v.cfIntake.fields.map(x => x.key), ['plsAlias', 'lbFrontend', 'lbBackend', 'lbProtocol', 'attDestIp', 'workloadIp']);
  assert.equal(v.cfIntake.title, 'Your link service');
  assert.match(v.cfIntake.line, /AT&T creates a private endpoint in your resource group/);
  assert.equal(v.cfIntake.overlap, '', 'overlapping address space is fine for a link service');
});

test('a placed hosted order keeps its intake and grant, and its Provision phase says who does what', () => {
  const c = start('peer');
  type(vals(c), 'AVPN to Cloud').pick(); vals(c).cfNext();
  vals(c).cfCloudTiles.find(t => t.cloud === 'AWS').pick(); vals(c).cfNext();
  region(vals(c), 'AWS us-east-1').pick();
  vals(c).cfBandwidths.find(b => b.label === '1 Gbps').pick();
  let v = vals(c);
  assert.deepEqual(v.cfIntake.fields.map(x => x.key), ['accountId', 'vpcId', 'cidrs'], 'AWS peering names the account and the VPC');
  field(v, 'accountId').set({ target: { value: '123456789012' } });
  field(vals(c), 'vpcId').set({ target: { value: 'vpc-0a1b2c3d4e5f' } });
  field(vals(c), 'cidrs').set({ target: { value: '10.30.0.0/16' } });
  vals(c).cfGrant.toggle();
  assert.match(vals(c).cfGrant.words, /cross-account role/);
  vals(c).cfNext();
  v = vals(c); assert.equal(v.cfKey, 'advanced');
  v.cfPolicyRouting.find(p => p.key === 'Private path required').pick(); vals(c).cfNext();
  v = vals(c); assert.equal(v.cfKey, 'terms');
  v.cfTerms.find(t => t.m === 12).pick(); vals(c).cfNext();
  v = vals(c); assert.equal(v.cfKey, 'review');
  assert.equal(v.cfBlock, '');
  assert.equal(v.cfNamePlaceholder, 'Hosted VPC peering - AWS us-east-1');
  v.cfPlace();
  const o = c.state.orders.at(-1);
  assert.equal(o.hosted, true);
  assert.equal(o.intake.vpcId, 'vpc-0a1b2c3d4e5f');
  assert.equal(o.grant, true);
  assert.equal(o.region, 'us-east-1');
  const ph = orderPhases(o, []);
  assert.match(ph.phases[1].title, /AT&T builds the peering; you accept it in your console/);
  assert.equal(ph.youDo, 'Accept the peering in your console');
  const pl = orderPhases({ ...o, way: 'privatelink' }, []);
  assert.match(pl.phases[1].title, /AT&T builds the endpoints and the link service/);
  assert.equal(pl.youDo, '');
});

// Ruthless pass (2026-10-16): a hosted order has no site and no tier, so nothing may say Ashburn or Standard for it.
test('a hosted order carries no site location and no tier, on the way in and on Orders', () => {
  const f = CF.flowOf({ way: 'peer', ctype: 'AVPN to Cloud', clouds: ['Azure'], regions: ['Azure eastus'] }, { regionsList: [{ cloud: 'Azure', region: 'eastus', priv: true }] });
  assert.deepEqual(f.loc, [], 'the flow filled a metro for an order that has no site end');
  const c = start('peer');
  type(vals(c), 'AVPN to Cloud').pick(); vals(c).cfNext();
  vals(c).cfCloudTiles.find(t => t.cloud === 'Azure').pick(); vals(c).cfNext();
  assert.equal(vals(c).cfDesc, 'Pick the region with an AT&T hub and the bandwidth, then enter your network and grant AT&T access.');
  region(vals(c), 'Azure eastus').pick();
  vals(c).cfBandwidths.find(b => b.label === '1 Gbps').pick();
  field(vals(c), 'subscriptionId').set({ target: { value: '7f3a1c2e-9b4d-4e8f-a1b2-3c4d5e6f7a8b' } });
  field(vals(c), 'vnetName').set({ target: { value: 'prod-vnet-eastus' } });
  field(vals(c), 'cidrs').set({ target: { value: '10.20.0.0/16' } });
  vals(c).cfGrant.toggle(); vals(c).cfNext();
  vals(c).cfPolicyRouting.find(p => p.key === 'Private path required').pick(); vals(c).cfNext();
  vals(c).cfTerms.find(t => t.m === 12).pick(); vals(c).cfNext();
  vals(c).cfPlace();
  const o = c.state.orders.at(-1);
  assert.deepEqual(o.path.map(n => n.label), ["AT&T's hub", 'Peering · 1 Gbps', 'Your VNet', 'eastus'], JSON.stringify(o.path));
  assert.equal(o.path[2].title, 'Your VNet: prod-vnet-eastus', 'the name rides in the title, never clipped on the strip');
  for (const n of o.path) assert.ok(n.icon || n.cloud, `${n.key}: no glyph`);
  assert.ok(!/Ashburn|Standard/.test(o.what || ''), o.what);
  // A NetBond order's profile says its own four things.
  const n = start('byo');
  type(vals(n), 'Internet to Cloud').pick(); vals(n).cfNext();
  vals(n).cfCloudTiles.find(t => t.cloud === 'AWS').pick(); vals(n).cfNext();
  assert.equal(vals(n).cfDesc, 'Pick the region, then resiliency, location and bandwidth.');
});

test('a hosted order prices by the reviewer\'s ladder: the on-ramp at 1 Gbps, the hop by size, the hub at review', () => {
  const c = start('peer');
  type(vals(c), 'AVPN to Cloud').pick(); vals(c).cfNext();
  vals(c).cfCloudTiles.find(t => t.cloud === 'Azure').pick(); vals(c).cfNext();
  region(vals(c), 'Azure eastus').pick();
  let v = vals(c);
  assert.deepEqual(v.cfBandwidths.map(b => b.label), ['1 Gbps', '5 Gbps', '10 Gbps']);
  v.cfBandwidths.find(b => b.label === '1 Gbps').pick(); v = vals(c);
  assert.equal(v.cfPrice.big, '$5,430');
  assert.deepEqual(v.cfLines.map(l => [l.product, l.monthlyF]).slice(0, 3), [['AT&T cloud on-ramp into the hosted hub, 1 Gbps', '$2,190/mo'], ['VNet or VPC peering data, $0.01/GB each way at 50% use, 1 Gbps', '$3,240/mo'], ['AT&T hosted hub: vSRX and compute', 'Priced by AT&T after review']]);
  v.cfBandwidths.find(b => b.label === '5 Gbps').pick(); v = vals(c);
  assert.equal(v.cfPrice.big, '$16,200', 'the on-ramp above 1 Gbps is AT&T\'s to price; the data line carries the month');
  assert.equal(v.cfLines[0].monthlyF, 'Priced by AT&T after review');
  assert.match(v.cfLines[0].product, /5 Gbps/);
  const pl = start('privatelink');
  type(vals(pl), 'AVPN to Cloud').pick(); vals(pl).cfNext();
  vals(pl).cfCloudTiles.find(t => t.cloud === 'Azure').pick(); vals(pl).cfNext();
  region(vals(pl), 'Azure eastus').pick(); vals(pl).cfBandwidths.find(b => b.label === '10 Gbps').pick();
  assert.equal(vals(pl).cfLines[1].monthlyF, '$48,023/mo');
  assert.match(vals(pl).cfIntake.line, /Standard SKU/);
});

test('the intake words are the deck\'s and the hub ranges are stated, not inferred', () => {
  assert.equal(CF.GRANT.Azure, 'A service principal with Lighthouse Network Write on the resource group');
  assert.match(CF.GRANT.AWS, /cross-account role/);
  assert.equal(CF.overlapOf('10.20.0.0/16', 'Azure', 'eastus').ok, true);
  assert.equal(CF.overlapOf('10.250.0.0/20', 'Azure', 'eastus').ok, false);
  assert.equal(CF.overlapOf('not a range', 'Azure', 'eastus').ok, false);
  assert.ok(W.HUB_CIDR['Azure eastus']);
});
