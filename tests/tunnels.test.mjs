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
