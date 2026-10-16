import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as CF from '../naas-connect-flow.js';
import { mkC } from './harness.mjs';

// NetBond Advanced's if/then, matched (Micah, 2026-10-16: "choosing 'maximum' and other options changes things in the
// if then flow. assess and match."). Read from att-netbond-sdci: wizardDoor.ts, StandardWizard.tsx and the standard/
// step components. Each test names the NetBond rule it mirrors.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const S4 = HTML.slice(HTML.indexOf('<sc-if value="{{ sS4 }}"'), HTML.indexOf('</section>\n</sc-if>', HTML.indexOf('<sc-if value="{{ sS4 }}"')));
const ways = (view = 'partial') => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'ways' });
const startType = (label, view) => { const c = ways(view); vals(c).wayTypes.find(t => t.label === label).start(); return c; };
const row = (v, key) => v.cfWip.find(r => r.key === key);
const tile = (v, cloud) => v.cfCloudTiles.find(t => t.cloud === cloud);
const region = (v, name) => v.cfRegionGroups.flatMap(g => g.regions).find(r => r.name === name);
const tier = (v, t) => v.cfTiers.find(x => x.tier === t);
const bw = (v, label) => v.cfBandwidths.find(b => b.label === label);
/** Internet to Cloud on AWS alone, at the profile: the tier fork is armed (wizardDoor.ts tierForkArmed). */
const armed = (view = 'partial', type = 'Internet to Cloud') => { const c = startType(type, view); tile(vals(c), 'AWS').pick(); vals(c).cfNext(); region(vals(c), 'AWS us-east-1').pick(); return c; };

test('providerConnectionTypes: a cloud that cannot carry the type is a dimmed tile, "Not available for this type"', () => {
  assert.equal(CF.cloudCarries('CoreWeave', 'Internet to Cloud'), true, 'a cloud outside the table carries Internet to Cloud only');
  assert.equal(CF.cloudCarries('CoreWeave', 'Layer 2 to Cloud'), false);
  assert.equal(CF.cloudCarries('AWS', 'IoT to Cloud'), true);
  assert.equal(CF.cloudCarries('GCP', 'Cloud to Cloud'), true);
  const c = startType('Layer 2 to Cloud', 'mature');
  const v = vals(c);
  assert.equal(tile(v, 'CoreWeave').cant, true);
  assert.equal(tile(v, 'CoreWeave').cantWord, 'Not available for this type');
  assert.equal(tile(v, 'AWS').can, true);
  tile(v, 'CoreWeave').pick();
  assert.deepEqual(c.state.compose.clouds || [], []);
});

test('normalizeArmed: a type change drops the clouds the new type cannot carry, and keeps one outside Cloud to Cloud', () => {
  const c = startType('Cloud to Cloud', 'mature');
  tile(vals(c), 'AWS').pick(); tile(vals(c), 'Azure').pick();
  assert.deepEqual(c.state.compose.clouds, ['AWS', 'Azure']);
  vals(c).cfSteps.find(s => s.key === 'type').go();
  vals(c).cfTypes.find(t => t.label === 'Internet to Cloud').pick();
  assert.deepEqual(c.state.compose.clouds, ['AWS'], 'one cloud on the wire outside Cloud to Cloud');
  vals(c).cfTypes.find(t => t.label === 'Internet to Cloud').pick();
  vals(c).cfNext(); tile(vals(c), 'CoreWeave').pick();
  assert.deepEqual(c.state.compose.clouds, ['CoreWeave']);
  vals(c).cfSteps.find(s => s.key === 'type').go();
  vals(c).cfTypes.find(t => t.label === 'Layer 2 to Cloud').pick();
  assert.deepEqual(c.state.compose.clouds, [], 'Layer 2 cannot ride CoreWeave');
});

test('the tier fork: Maximum on AWS alone, Internet to Cloud, IS Interconnect - Last Mile, and the profile morphs in place', () => {
  const c = armed();
  let v = vals(c);
  assert.equal(v.cfIsLmcc, false);
  assert.equal(v.cfKeyFork.has, false);
  assert.equal(tier(v, 'Maximum').becomes, 'Becomes Interconnect - Last Mile');
  tier(v, 'Maximum').pick();
  v = vals(c);
  assert.equal(v.cfIsLmcc, true);
  assert.deepEqual(v.cfSteps.map(s => s.key), CF.STD_STEP_KEYS_LMCC, 'the tail is terms then confirm');
  assert.equal(v.cfDesc, 'Maximum resiliency is AWS Interconnect - Last Mile. Choose your metro, bandwidth, and AWS account.');
  assert.equal(v.cfKeyFork.has, true);
  assert.equal(v.cfKeyFork.att.on, true);
  assert.equal(v.cfKeyFork.aws.on, false);
  assert.equal(v.cfLocTitle, 'Metro');
  assert.equal(v.cfLocNote, '4 hosted connections per metro · auto-provisioned.');
  assert.deepEqual(v.cfMetros.map(m => m.metro).sort(), ['Ashburn', 'San Jose']);
  assert.deepEqual(v.cfBandwidths.map(b => b.label), CF.LMCC_BANDWIDTHS);
  v.cfMetros.find(m => m.metro === 'Ashburn').pick();
  bw(vals(c), '10 Gbps').pick();
  v = vals(c);
  assert.equal(v.cfBlock, 'Enter your 12-digit AWS account ID.');
  assert.equal(v.cfAccount.has, true);
  v.cfAccount.set({ target: { value: '12345' } });
  v = vals(c);
  assert.equal(v.cfAccount.ok, false);
  assert.equal(v.cfBlock, 'Enter your 12-digit AWS account ID.');
  v.cfAccount.set({ target: { value: '123456789012' } });
  v = vals(c);
  assert.equal(v.cfBlock, '');
  assert.equal(row(v, 'type').value, 'AWS Interconnect - Last Mile', 'the order is the product now');
  assert.equal(row(v, 'bandwidth').value, '10 Gbps × 4 paths');
  assert.equal(row(v, 'loc').label, 'Metro');
  assert.equal(row(v, 'account').value, '123456789012');
  // Terms: the billing term and the networks routed over the connection (LmccTermsStep).
  v.cfNext(); v = vals(c);
  assert.equal(v.cfKey, 'terms');
  assert.equal(v.cfTitle, 'Billing term & routed networks');
  assert.equal(v.cfRouted.has, true);
  v.cfRouted.set({ target: { value: '10.0.0.0/8, 172.16.0.0/12' } });
  vals(c).cfTerms.find(t => t.m === 12).pick();
  vals(c).cfNext(); v = vals(c);
  assert.equal(v.cfKey, 'confirm');
  assert.equal(v.cfIsReview, true);
  assert.equal(row(v, 'routed').value, '10.0.0.0/8, 172.16.0.0/12');
  // The storefront's own rule: every order ships with a policy; on Last Mile the confirm step asks it (no Advanced step).
  v.cfPolicy[0].pick();
  vals(c).cfPlace();
  const o = c.state.orders.at(-1);
  assert.equal(o.awsAccount, '123456789012');
  assert.equal(o.routed, '10.0.0.0/8, 172.16.0.0/12');
});

test('the key fork: Paste a key hides what the key already answers and asks for the key instead', () => {
  const c = armed();
  tier(vals(c), 'Maximum').pick();
  let v = vals(c);
  v.cfKeyFork.aws.pick();
  v = vals(c);
  assert.equal(v.cfKeyFork.aws.on, true);
  assert.equal(v.cfShowLoc, false); assert.equal(v.cfShowBw, false); assert.equal(v.cfAccount.has, false);
  assert.equal(v.cfActKey.has, true);
  assert.equal(v.cfBlock, 'Paste the activation key from AWS.');
  v.cfActKey.set({ target: { value: 'LMCC-7F3A-9B4D-4E8F' } });
  v = vals(c);
  assert.equal(v.cfBlock, '');
  assert.equal(row(v, 'key').value, 'LMCC-7F3A-9B4D-4E8F');
  assert.equal(row(v, 'loc'), undefined, 'the metro is inside the key');
  v.cfKeyFork.att.pick();
  v = vals(c);
  assert.equal(v.cfShowLoc, true);
  assert.equal(row(v, 'key'), undefined);
});

test('multi-provider Maximum stays a standard order: no fork, no Last Mile', () => {
  const c = startType('Cloud to Cloud');
  tile(vals(c), 'AWS').pick(); tile(vals(c), 'Azure').pick(); vals(c).cfNext();
  region(vals(c), 'AWS us-east-1').pick(); region(vals(c), 'Azure eastus').pick();
  tier(vals(c), 'Maximum').pick();
  const v = vals(c);
  assert.equal(v.cfIsLmcc, false);
  assert.equal(v.cfKeyFork.has, false);
  assert.equal(v.cfLocTitle, 'Location');
  assert.ok(v.cfMetros.some(m => m.metro === 'Ashburn'));
});

test('Maximum on a roster cloud that is not live (GCP) is shown, disabled, and says why', () => {
  const c = startType('Internet to Cloud');
  tile(vals(c), 'GCP').pick(); vals(c).cfNext(); region(vals(c), 'GCP us-central1').pick();
  const v = vals(c);
  const mx = tier(v, 'Maximum');
  assert.equal(mx.soon, true);
  assert.equal(mx.protects, 'Live for AWS and Azure. Coming soon for this provider.');
  mx.pick();
  assert.ok(!c.state.compose.tier);
});

test('IoT to Cloud hides resiliency and asks the APN-VPN mapping instead of a location (NBA deck, Aug 2026)', () => {
  const c = startType('IoT to Cloud');
  tile(vals(c), 'AWS').pick(); vals(c).cfNext(); region(vals(c), 'AWS us-east-1').pick();
  let v = vals(c);
  assert.equal(v.cfShowTiers, false);
  assert.equal(v.cfShowLoc, false);
  assert.equal(v.cfShowApn, true);
  assert.equal(v.cfDesc, 'Choose the APN-VPN mapping and bandwidth.');
  assert.equal(v.cfApns.length, 4);
  assert.equal(v.cfApns.find(a => a.off).sub, 'Gulf Coast · 7,300 devices · Provisioning');
  assert.equal(v.cfBlock, 'Pick the APN-VPN mapping.');
  v.cfApns.find(a => a.off).pick();
  assert.ok(!c.state.compose.apn, 'a provisioning mapping never takes the pick');
  v.cfApns[0].pick();
  v = vals(c);
  assert.equal(row(v, 'apn').label, 'APN-VPN');
  assert.equal(row(v, 'apn').value, 'CarpartsAPN → TXwarehouseVPN');
  assert.equal(row(v, 'loc'), undefined);
  assert.equal(v.cfBlock, 'Pick a bandwidth.');
  bw(v, '1 Gbps').pick(); vals(c).cfNext();
  v = vals(c);
  assert.equal(v.cfKey, 'advanced');
  assert.equal(row(v, 'sites'), undefined, 'an APN has no site at a metro');
  assert.equal(v.cfPolicySent.match, 'CarpartsAPN → TXwarehouseVPN');
  assert.equal(v.cfNamePlaceholder, 'IoT to Cloud - CarpartsAPN - AWS');
  assert.equal(v.cfShowSubnets, false, 'IoT addressing comes from the APN pool');
  assert.equal(v.cfAccess[0].pinned, true);
  assert.equal(v.cfAccess[0].value, 'L3VPN');
  assert.match(v.cfAccess[0].note, /rides the private APN/);
});

test('Layer 2 to Cloud asks the EVC before the on-ramp metro, and its CIR caps the bandwidth', () => {
  const c = startType('Layer 2 to Cloud');
  tile(vals(c), 'AWS').pick(); vals(c).cfNext(); region(vals(c), 'AWS us-east-1').pick();
  let v = vals(c);
  assert.equal(v.cfShowEvc, true);
  assert.equal(v.cfDesc, 'Choose the EVC, on-ramp metro, and bandwidth.');
  assert.equal(v.cfEvcs.length, 4);
  assert.equal(v.cfBlock, 'Pick the EVC this order rides.');
  v.cfEvcs.find(e => e.id === 'Houmkt-EVC-11153').pick();
  v = vals(c);
  assert.equal(row(v, 'evc').value, 'Houmkt-EVC-11153 · CIR 500 Mbps');
  assert.equal(bw(v, '1 Gbps').off, true, 'over the CIR');
  assert.equal(bw(v, '100 Mbps').off, false);
  bw(v, '10 Gbps').pick();
  assert.ok(!c.state.compose.bandwidth, 'an over-CIR bandwidth never takes the pick');
  bw(v, '500 Mbps').pick();
  v = vals(c);
  assert.equal(c.state.compose.bandwidth, '500 Mbps');
  // A smaller EVC strands the bandwidth above its CIR.
  v.cfEvcs.find(e => e.id === 'Dalsales-EVC-11152').pick();
  assert.equal(vals(c).cfBandwidths.find(b => b.label === '500 Mbps').on, true);
  vals(c).cfMetros.find(m => m.pickable).pick();
  vals(c).cfNext();
  assert.equal(vals(c).cfShowSubnets, false, 'Layer 2 carries Ethernet, not routed subnets');
});

test('Colo to Colo derives its transport from bandwidth and metro pair (coloBilling.ts)', () => {
  assert.equal(CF.coloTransport(10000, true), 'Wavelength Metro');
  assert.equal(CF.coloTransport(1000, false), 'Ethernet (ASE) LH');
  const c = startType('Colo to Colo');
  let v = vals(c);
  assert.equal(v.cfKey, 'endpoints');
  const e = v.cfEndpoints; e.a.sites[0].pick();
  vals(c).cfEndpoints.b.sites.find(x => !x.taken).pick();
  vals(c).cfEndpoints.a.fabrics[0].pick(); vals(c).cfEndpoints.b.fabrics[0].pick();
  vals(c).cfNext(); v = vals(c);
  assert.equal(v.cfKey, 'basic');
  assert.equal(v.cfDesc, 'Set resiliency and bandwidth.');
  assert.equal(v.cfColoTransport.has, false, 'no bandwidth, no transport');
  bw(v, '10 Gbps').pick(); v = vals(c);
  assert.match(v.cfColoTransport.label, /^Wavelength (Metro|LH)$/);
  bw(v, '1 Gbps').pick(); v = vals(c);
  assert.match(v.cfColoTransport.label, /^Ethernet \(ASE\) (Metro|LH)$/);
  assert.equal(v.cfColoTransport.line, 'Derived from bandwidth and metro pair, provisioned by AT&T.');
});

test('Geodiversity counts the metros picked and says how many more it needs', () => {
  const c = armed();
  tier(vals(c), 'Geodiversity').pick();
  let v = vals(c);
  // The flow filled the region's metro from your estate, so one is already selected.
  assert.equal(v.cfGeoLine, '1 selected, 1 more needed');
  assert.equal(v.cfLocTitle, 'Location · pick at least 2 metros');
  v.cfMetros.find(m => m.pickable && !m.on).pick(); v = vals(c);
  assert.equal(v.cfGeoLine, '2 selected');
});

test('Advanced asks the subnets except for AVPN, IoT and Layer 2, and the service access per cloud', () => {
  const c = armed();
  bw(vals(c), '1 Gbps').pick(); vals(c).cfMetros.find(m => m.pickable).pick(); vals(c).cfNext();
  let v = vals(c);
  assert.equal(v.cfKey, 'advanced');
  assert.equal(v.cfShowSubnets, true);
  v.cfSubnets.set({ target: { value: '10.1.0.0/24, 10.2.0.0/24' } });
  v = vals(c);
  assert.equal(row(v, 'subnets').value, '10.1.0.0/24, 10.2.0.0/24');
  assert.deepEqual(v.cfAccess.map(a => a.cloud), ['AWS']);
  assert.equal(v.cfAccess[0].value, 'L3VPN');
  assert.deepEqual(v.cfAccess[0].options.map(o => o.value), CF.SERVICE_ACCESS);
  v.cfAccess[0].set({ target: { value: 'Internet' } });
  assert.equal(vals(c).cfAccess[0].value, 'Internet');
  const vpn = armed('partial', 'AVPN to Cloud');
  bw(vals(vpn), '1 Gbps').pick(); vals(vpn).cfMetros.find(m => m.pickable).pick(); vals(vpn).cfNext();
  assert.equal(vals(vpn).cfShowSubnets, false, 'VPN to Cloud is tunnel-addressed');
});

test('the price pill waits for a bandwidth: nothing on Connection Type or Choose Provider (CostSummaryPill)', () => {
  const c = startType('Internet to Cloud');
  let v = vals(c);
  assert.equal(v.cfPriced, false); assert.equal(v.cfUnpriced, false);
  tile(v, 'AWS').pick(); v = vals(c);
  assert.equal(v.cfPriced, false); assert.equal(v.cfUnpriced, false);
  vals(c).cfNext(); region(vals(c), 'AWS us-east-1').pick(); v = vals(c);
  assert.equal(v.cfPriced, false, 'a region alone is not a price');
  bw(v, '1 Gbps').pick();
  assert.equal(vals(c).cfPriced, true);
});

test('Cloud to Cloud titles its provider step in the plural and counts the picks', () => {
  const c = startType('Cloud to Cloud');
  let v = vals(c);
  assert.equal(v.cfTitle, 'Select your cloud providers');
  assert.equal(v.cfPickedLine, '');
  tile(v, 'AWS').pick(); tile(vals(c), 'Azure').pick();
  assert.equal(vals(c).cfPickedLine, '2 selected');
  assert.equal(vals(startType('Internet to Cloud')).cfTitle, 'Select your cloud provider');
});

test('the markup binds every branch, and the empty price pill is gone', () => {
  for (const b of ['{{ cfKeyFork.att.pick }}', '{{ cfKeyFork.aws.pick }}', 'list="{{ cfApns }}"', 'list="{{ cfEvcs }}"', '{{ cfAccount.set }}', '{{ cfActKey.set }}', '{{ cfRouted.set }}', '{{ cfSubnets.set }}', '{{ q.accessSet }}', '{{ cfColoTransport.label }}', '{{ cfGeoLine }}', '{{ cfLocNote }}', '{{ cfPickedLine }}']) assert.ok(S4.includes(b), b);
  assert.ok(!S4.includes('cfUnpriced'), 'the "Priced once..." pill is back');
});
