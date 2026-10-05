import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as L from '../naas-logic.js';

// Tunnels as a way to reach the cloud (spec 2026-10-05-site-reach-tunnels-design.md).
// A tunnel is stated in the data, never inferred from an access product.
const site = (est, name) => D.ESTATES[est].sites.find(s => s.name === name);

test('a tunnel is what the site states: its kind and the one region it lands in', () => {
  assert.deepEqual(L.tunnelOf(site('partial', 'Boston office')), { kind: 'SD-WAN', cloud: 'AWS', region: 'us-west-2', name: 'AWS us-west-2' });
  assert.deepEqual(L.tunnelOf(site('partial', 'Houston office')), { kind: 'SD-WAN', cloud: 'AWS', region: 'us-west-2', name: 'AWS us-west-2' });
  assert.deepEqual(L.tunnelOf(site('partial', 'Minneapolis office')), { kind: 'IPsec', cloud: 'Azure', region: 'westeurope', name: 'Azure westeurope' });
  assert.deepEqual(L.tunnelOf(site('partial', 'Dublin office')), { kind: 'IPsec', cloud: 'Azure', region: 'westeurope', name: 'Azure westeurope' });
  assert.deepEqual(L.tunnelOf(site('partial', 'Charlotte branch')), { kind: 'IPsec', cloud: 'AWS', region: 'us-west-2', name: 'AWS us-west-2' });
  // Business Fiber and Dedicated Internet without a stated tunnel are not tunnels.
  for (const n of ['Atlanta office', 'Los Angeles office', 'Mumbai office']) assert.equal(L.tunnelOf(site('partial', n)), null, n);
  assert.equal(L.tunnelOf(null), null);
});

test('a tunnel on AT&T access is still an AT&T site; its mode is its tunnel', () => {
  for (const n of ['Boston office', 'Houston office', 'Minneapolis office', 'Dublin office']) {
    assert.equal(L.onAtt(site('partial', n)), true, n);
    assert.equal(site('partial', n).priv, false, `${n} rides the internet, not a private path`);
  }
  assert.equal(L.siteModeOf(site('partial', 'Boston office')), 'sdwan');
  assert.equal(L.siteModeOf(site('partial', 'Minneapolis office')), 'ipsec');
});

test('no other site changed how it reaches the cloud', () => {
  const before = JSON.parse(readFileSync(new URL('./fixtures/site-modes-2026-10-05.json', import.meta.url)));
  const moved = { 'Boston office': 'sdwan', 'Houston office': 'sdwan', 'Minneapolis office': 'ipsec', 'Dublin office': 'ipsec' };
  for (const [est, modes] of Object.entries(before)) for (const [name, mode] of Object.entries(modes))
    assert.equal(L.siteModeOf(site(est, name)), est === 'partial' && moved[name] ? moved[name] : mode, `${est} ${name}`);
});

test('the flow map carries the tunnels as their own middles, and every middle adds up', async () => {
  const F = await import('../naas-flowmap.js');
  const { vals } = await import('../naas-app.js');
  const { mkC } = await import('./harness.mjs');
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
  const mids = v.mapNodes.filter(n => n.side === 'm').map(n => n.label);
  void F;
  assert.ok(mids.includes('SD-WAN tunnel'), mids.join(', '));
  assert.ok(mids.includes('IPsec tunnel'), mids.join(', '));
  for (const n of v.mapNodes.filter(x => x.side === 'm' && /tunnel/.test(x.label))) assert.ok(!/undefined|NaN/.test(n.subLabel), n.subLabel);
});

test('the Connect picture runs each tunnel past NetBond to what it ends on in its cloud', async () => {
  const { heroLayout } = await import('../naas-logic.js');
  for (const folded of [false, true]) {
    const L2 = heroLayout(D.ESTATES.partial, { folded });
    const name = (id) => L2.nodes.find(n => n.id === id).label;
    const routes = L2.routes.map(r => r.nodes.map(name));
    const sd = routes.filter(r => r.includes('SD-WAN tunnel')), ip = routes.filter(r => r.includes('IPsec tunnel'));
    assert.ok(sd.length && ip.length, `folded ${folded}: ${routes.map(r => r.join(' > ')).join(' | ')}`);
    for (const r of sd) assert.deepEqual(r.slice(-2), ['SD-WAN tunnel', 'AWS SD-WAN hub']);
    for (const r of ip) assert.deepEqual(r.slice(-2), ['IPsec tunnel', 'Azure VPN gateway']);
    for (const r of [...sd, ...ip]) { assert.ok(!r.some(t => /NetBond|ExpressRoute|Direct Connect/.test(t)), r.join(' > ')); assert.ok(r.includes('AT&T backbone'), 'AT&T internet rides the core'); }
  }
});

test('a region card draws a tunnel line apart from the same access on the private path', () => {
  const lines = L.linesOf(D.ESTATES.partial.sites.filter(s => ['Boston office', 'Atlanta office'].includes(s.name)));
  assert.equal(lines.filter(l => /a:abf/.test(l.key)).length, 2, lines.map(l => l.key).join(', '));
});

test('the lane outside the AT&T network still holds only what never touches AT&T', async () => {
  const { vals } = await import('../naas-app.js');
  const { mkC } = await import('./harness.mjs');
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'picture' }));
  assert.match(v.laneCount, /^5 sites · /, v.laneCount);
});

test('a tunnel site\'s path runs AT&T access, the tunnel over the internet, then what it ends on', async () => {
  const P = await import('../naas-paths.js');
  const est = D.ESTATES.partial, reg = (n) => est.regionsList.find(r => `${r.cloud} ${r.region}` === n);
  const p = P.path(site('partial', 'Minneapolis office'), reg('Azure westeurope'));
  const at = (pth, kind) => pth.hops.find(h => h.kind === kind);
  assert.deepEqual(p.hops.map(h => h.kind).filter(k => k !== 'hub'), ['site', 'access', 'pop', 'public', 'gateway', 'region']);
  assert.equal(at(p, 'public').name, 'IPsec tunnel');
  assert.equal(at(p, 'gateway').name, 'Azure VPN gateway');
  assert.equal(at(P.path(site('partial', 'Boston office'), reg('AWS us-west-2')), 'gateway').name, 'AWS SD-WAN hub');
  // Nowhere does a tunnel site reach NetBond: AWS us-east-1 is the internet for it.
  assert.ok(!P.path(site('partial', 'Boston office'), reg('AWS us-east-1')).hops.some(h => h.kind === 'fabric' || h.kind === 'ramp'));
  // The branches on another carrier's internet keep the path they had.
  assert.ok(P.path(site('partial', 'Charlotte branch'), reg('AWS us-east-1')).hops.some(h => h.kind === 'fabric'));
});
