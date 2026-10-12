import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../naas-portal.js';

// The portal MVP's model (2026-10-12, the portal team's note: circuits, AT&T cloud connections and a cloud inventory are
// all the portal has). Spec: docs/superpowers/specs/2026-10-12-portal-mvp-design.md, section 5.

test('Washington DC at Equinix DC2 maps to East US and East US 2 for Azure', () => {
  assert.deepEqual(P.regionsOfPop('Azure', { provider: 'Equinix', facility: 'DC2' }), ['East US', 'East US 2']);
  assert.deepEqual(P.regionsOfPop('Azure', { provider: 'Equinix', facility: 'DC6' }), ['East US', 'East US 2']);
});

test('an unknown POP maps to nothing and the join degrades to the CSP', () => {
  assert.deepEqual(P.regionsOfPop('Azure', { provider: 'Equinix', facility: 'XX9' }), []);
  const link = { csp: 'Azure', pop: { provider: 'Equinix', facility: 'XX9', metro: 'Ashburn' }, bandwidthMbps: 1000 };
  const j = P.attJoin([link], [{ csp: 'Azure', region: 'East US', vpcs: [] }, { csp: 'AWS', region: 'us-east-1', vpcs: [] }]);
  assert.deepEqual(j.get('Azure/East US'), { on: false, via: null, cspOnly: true, cspLink: link });
  assert.deepEqual(j.get('AWS/us-east-1'), { on: false, via: null, cspOnly: false, cspLink: null });
});

test('a mapped POP puts the region on AT&T, via that connection', () => {
  const link = { csp: 'Azure', pop: { provider: 'Equinix', facility: 'DC2', metro: 'Ashburn' }, bandwidthMbps: 1000 };
  const j = P.attJoin([link], [{ csp: 'Azure', region: 'East US', vpcs: [] }, { csp: 'Azure', region: 'West Europe', vpcs: [] }]);
  assert.equal(j.get('Azure/East US').on, true); assert.equal(j.get('Azure/East US').via, link);
  assert.deepEqual(j.get('Azure/West Europe'), { on: false, via: null, cspOnly: true, cspLink: link });
});

test('ADI and ABF circuits group under No network; AVPN and ASEoD under their network', () => {
  const nets = P.networksOf(P.FIXTURES.calloway.circuits);
  const none = nets.find(n => n.id === null);
  assert.equal(none.name, 'No network');
  assert.ok(none.circuits.every(c => ['ADI', 'ABF'].includes(c.service)));
  for (const n of nets.filter(n => n.id)) assert.ok(n.circuits.every(c => ['AVPN', 'ASEoD'].includes(c.service)), n.name);
  assert.equal(nets.reduce((a, n) => a + n.circuits.length, 0), 20);
  for (const n of nets) { assert.equal(n.sites, new Set(n.circuits.map(c => c.siteId)).size); assert.ok(Array.isArray(n.states)); }
});

test('the Calloway fixture is the journey estate: 20 circuits, no cloud link, one Azure discovery, state A only', () => {
  const f = P.FIXTURES.calloway;
  assert.equal(f.circuits.length, 20); assert.equal(f.cloudLinks.length, 0);
  assert.deepEqual([...new Set(f.discovery.map(d => d.csp))], ['Azure']); assert.equal(f.discovery.length, 2); assert.ok(f.discovery[0].vpcs.length > 0);
  assert.ok(f.circuits.every(c => c.health === undefined && c.p95Mbps === undefined), 'state A carries no maybe fields');
  assert.ok(f.circuits.every(c => c.siteId && c.address.city && c.address.state && c.bandwidthMbps > 0));
  assert.equal(f.synthetic, false);
});

test('the scale fixture is 30 networks over 3,000 circuits, state B present, and says it is synthetic', () => {
  const f = P.FIXTURES.scale;
  assert.equal(f.circuits.length, 3000);
  assert.equal(P.networksOf(f.circuits).filter(n => n.id).length, 30);
  assert.equal(f.synthetic, true);
  assert.ok(f.circuits.some(c => c.health === 'down') && f.circuits.every(c => typeof c.p95Mbps === 'number'));
  assert.equal(f.cloudLinks.length, 12); assert.equal(new Set(f.cloudLinks.map(l => l.csp)).size, 3);
  assert.ok(f.discovery.every(d => typeof d.bytesIn === 'number' && d.vpcs.every(v => v.subnets.every(sn => sn.affinity))));
  assert.ok(f.cloudLinks.some(l => l.service === 'L3-VPN' && l.network), 'an L3-VPN link names its AVPN network');
});

test('a column is present only when some row carries it', () => {
  assert.deepEqual(P.columnsFor([{ a: 1 }, { a: 2 }], [['a', 'A'], ['p95Mbps', 'p95']]).map(c => c.present), [true, false]);
  assert.deepEqual(P.columnsFor([{ a: 1 }, { a: 2, p95Mbps: 3 }], [['a', 'A'], ['p95Mbps', 'p95']]).map(c => c.present), [true, true]);
});
