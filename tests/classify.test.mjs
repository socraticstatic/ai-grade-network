import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as L from '../naas-logic.js';
import * as R from '../naas-round2.js';
import * as FB from '../naas-fabric.js';
import * as S from '../naas-sites.js';
import * as G from '../naas-segments.js';
import * as X from '../naas-connections.js';
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

// A port the customer owns through its own cross-connect, or an Equinix port,
// is not AT&T's to bill (Established us-west-2 and us-east-04). Task 1.5 also
// billed Direct Connect and ExpressRoute as NetBond "partner ports"; D-6 takes
// them out (2026-09-30, D-6 restored): Growing eastus is ExpressRoute, the
// cloud provider's port.
test('AT&T bills NetBond only where it carries the on-ramp', () => {
  assert.equal(L.attHolds(r('partial', 'eastus')), false, 'ExpressRoute is the cloud provider\'s port, not a NetBond on-ramp');
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

// D-6 restored (2026-09-30, owner's ruling on final review finding 10): NetBond
// bills only NetBond connections. Growing eastus is ExpressRoute: "Cloud
// provider direct connect" on the Sankey, SLA holder the cloud provider, so it
// is not a "NetBond on-ramp" on the bill either. One rule: attHolds is exactly
// connModeOf === 'netbond', and the charges, By leg, the facilities picture and
// the on-ramp column all read it.
const NB = { partial: ['us-east-1'], mature: ['us-central1', 'us-east-1'], trust: ['us-central1', 'us-east-1'], small: [], empty: [] };
test('D-6: NetBond bills only NetBond connections; Direct Connect, ExpressRoute and Equinix leave the row', () => {
  for (const view of [...VIEWS, 'empty']) {
    const est = D.ESTATES[view];
    for (const x of est.regionsList || []) assert.equal(L.attHolds(x), L.connModeOf(x) === 'netbond', `${view} ${x.region} (${x.ramp})`);
    const nb = R.attChargeRows(est, A.inventory(est)).find(x => x.key === 'nb');
    assert.deepEqual(nb ? [...nb.regions].sort() : [], NB[view], view);
  }
  const nb = R.attChargeRows(D.ESTATES.partial, A.inventory(D.ESTATES.partial)).find(x => x.key === 'nb');
  assert.equal(nb.sub, '1 region × $1,800');
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'charges' }));
  assert.equal(v.attCharges.find(x => x.key === 'nb').sub, '1 region × $1,800', 'the AT&T charges tab reads the same row');
});

test('D-6: the facilities picture and the On-ramp column hold only NetBond (and Equinix, a third party)', () => {
  for (const view of VIEWS) {
    const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv);
    const held = FB.facilities(est, inv, ob).flatMap(f => f.regions.map(x => x.region)).sort();
    assert.deepEqual(held, NB[view], `${view} facilities`);
    const ctx = G.segCtxOf(est, { inv, ob, conns: X.connections(est, ob) });
    const onramp = G.segmentTable(est, ctx).find(t => t.key === 'onramp');
    const want = est.regionsList.filter(x => ['netbond', 'third'].includes(L.connModeOf(x))).length;
    assert.equal(onramp.counts.n, want, `${view} on-ramp column`);
  }
  const ctx = (() => { const est = D.ESTATES.partial, inv = A.inventory(est), ob = A.observe(est, [], inv); return G.segCtxOf(est, { inv, ob, conns: X.connections(est, ob) }); })();
  const fin = G.cellsFor('finance', ctx), col = (k) => fin[G.SEGMENTS.findIndex(s => s.key === k)];
  assert.notEqual(col('onramp').thing, 'NetBond', 'finance rides ExpressRoute, not a NetBond on-ramp');
  assert.equal(col('cloudlink').thing, 'ExpressRoute');
});

test('cloud cards and connection rows name the connection in words', () => {
  const con = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', tab: 'connect' }));
  const az = con.heroClouds.find(c => c.cloud === 'Azure');
  assert.match(az.sub, /Direct connect/);
  assert.doesNotMatch(az.sub, /\bER\b/);
  const obs = vals(mkC({ view: 'mature', estateParam: null, screen: 's3', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
  assert.ok(obs.connRows.every(c => !/\b(ER|DX|EQX)\b/.test(c.sub)), obs.connRows.map(c => c.sub).join(' | '));
});
