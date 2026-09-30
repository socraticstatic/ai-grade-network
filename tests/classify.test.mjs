import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as L from '../naas-logic.js';
import * as R from '../naas-round2.js';
import * as FB from '../naas-fabric.js';
import * as S from '../naas-sites.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// One connection classifier (notes, 2026-09-30, Task 1.5). ExpressRoute,
// Direct Connect and Equinix regions were billed as "NetBond on-ramps x
// $1,800", filed under AT&T facilities ("AT&T Virginia: ER"), and Small drew a
// NetBond on-ramp with nothing attached.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const VIEWS = ['partial', 'mature', 'trust', 'small'];
const r = (view, name) => D.ESTATES[view].regionsList.find(x => x.region === name);

test('connModeOf reads the ramp through who holds its SLA', () => {
  assert.equal(L.connModeOf(r('partial', 'us-east-1')), 'netbond');
  assert.equal(L.connModeOf(r('partial', 'eastus')), 'direct', 'ExpressRoute is the cloud provider\'s');
  assert.equal(L.connModeOf(r('partial', 'us-west-2')), 'internet');
  assert.ok(D.ESTATES.mature.regionsList.some(x => L.connModeOf(x) === 'third'), 'Equinix is third party');
  assert.deepEqual(Object.keys(L.CONN_LABEL), ['netbond', 'direct', 'third', 'internet', 'ipsec', 'sdwan']);
  assert.equal(L.CONN_LABEL.direct.long, 'Cloud provider direct connect');
});

test('siteModeOf: Growing has five IPsec sites; the rollups carry SD-WAN', () => {
  const count = (view, mode) => D.ESTATES[view].sites.filter(s => L.siteModeOf(s) === mode).reduce((a, s) => a + S.countOf(s.name), 0);
  assert.equal(count('partial', 'ipsec'), 5);
  assert.ok(count('mature', 'sdwan') > 0 && count('trust', 'sdwan') > 0);
});

// NetBond is AT&T's partner port into Direct Connect and ExpressRoute, so those
// are AT&T's to bill; a port the customer owns through its own cross-connect,
// or an Equinix port, is not (Established us-west-2 and us-east-04).
test('AT&T bills NetBond only where it carries the on-ramp', () => {
  assert.equal(L.attHolds(r('partial', 'eastus')), true, 'ExpressRoute over NetBond');
  assert.equal(L.attHolds(r('mature', 'us-west-2')), false, 'the customer owns this Direct Connect port');
  assert.equal(L.attHolds(r('mature', 'us-east-04')), false, 'Equinix');
  for (const view of VIEWS) {
    const est = D.ESTATES[view];
    const nb = R.attChargeRows(est, A.inventory(est)).find(x => x.key === 'nb');
    const n = est.regionsList.filter(L.attHolds).length;
    if (!n) { assert.ok(!nb, `${view} bills NetBond with none attached`); continue; }
    assert.equal(nb.v, n * 1800, `${view}: ${nb.sub}`);
  }
  assert.ok(!/^function attChargeRows/m.test(readFileSync(new URL('../naas-app.js', import.meta.url), 'utf8')), 'one function, in naas-round2.js');
});

test('AT&T facilities hold only the on-ramps AT&T carries', () => {
  for (const view of VIEWS) {
    const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv);
    for (const f of FB.facilities(est, inv, ob)) for (const x of f.regions) assert.ok(L.attHolds(r(view, x.region)), `${view}: ${f.name} holds ${x.region}`);
  }
});

test('Small draws no NetBond on-ramp when nothing is attached', () => {
  const v = vals(mkC({ view: 'small', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
  assert.ok(!v.mapNodes.some(n => n.side === 'm' && /NetBond/.test(n.label)), v.mapNodes.filter(n => n.side === 'm').map(n => n.label).join(', '));
});

test('cloud cards and connection rows name the connection in words', () => {
  const con = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', tab: 'connect' }));
  const az = con.heroClouds.find(c => c.cloud === 'Azure');
  assert.match(az.sub, /Direct connect/);
  assert.doesNotMatch(az.sub, /\bER\b/);
  const obs = vals(mkC({ view: 'mature', estateParam: null, screen: 's3', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
  assert.ok(obs.connRows.every(c => !/\b(ER|DX|EQX)\b/.test(c.sub)), obs.connRows.map(c => c.sub).join(' | '));
});
