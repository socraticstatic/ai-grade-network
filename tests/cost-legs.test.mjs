import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as R from '../naas-round2.js';
import * as S from '../naas-sites.js';
import { attHolds } from '../naas-logic.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Cost in three legs (notes, 2026-09-30, A2): site access, cloud connectivity,
// and what the cloud provider bills. AT&T charges are the catalog's; a list
// price we apply for someone else is marked modelled.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const VIEWS = ['partial', 'mature', 'trust', 'small', 'empty'];
const legsOf = (view) => { const e = D.ESTATES[view], inv = A.inventory(e), ob = A.observe(e, [], inv); return R.costLegs(e, inv, ob.utilRows); };
const sum = (rows) => rows.reduce((a, r) => a + r.v, 0);
const cost = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'legs', ...patch });

test('the total is the three legs, and each leg is its rows; empty is all zero', () => {
  for (const view of VIEWS) {
    const L = legsOf(view);
    assert.deepEqual([L.access.key, L.connect.key, L.cloud.key], ['access', 'connect', 'cloud']);
    for (const leg of [L.access, L.connect, L.cloud]) assert.ok(Math.abs(leg.total - sum(leg.rows)) < 0.01, `${view} ${leg.key}`);
    assert.ok(Math.abs(L.total - (L.access.total + L.connect.total + L.cloud.total)) < 0.01, view);
  }
  const E = legsOf('empty');
  assert.deepEqual([E.access.total, E.connect.total, E.cloud.total, E.total], [0, 0, 0, 0]);
});

test('site access counts every service a site has, primary and backup', () => {
  for (const view of VIEWS) {
    const e = D.ESTATES[view];
    const want = (e.sites || []).reduce((a, s) => a + S.servicesOf(s).length * S.countOf(s.name), 0);
    assert.equal(legsOf(view).access.rows.reduce((a, r) => a + r.n, 0), want, view);
  }
  const rows = legsOf('partial').access.rows;
  assert.ok(rows.some(r => r.key.startsWith('tpa') && r.v === 0 && /billed by another carrier/.test(r.sub)), 'Third Party Access is counted, not priced');
  assert.ok(rows.filter(r => /remote/.test(r.key)).every(r => r.modelled), 'rollups are modelled at the remote-site rate');
});

test('the egress row is this month\'s buckets', () => {
  const eg = (view) => legsOf(view).cloud.rows.find(r => r.key === 'egress');
  assert.equal(eg('partial').v, 89600);
  assert.equal(eg('mature').v, 121400);
  assert.equal(eg('trust').v, 438000);
  assert.equal(eg('partial').modelled, false);
});

test('the NetBond row bills only what AT&T holds: no Equinix port, no port the customer owns', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const nb = legsOf(view).connect.rows.find(r => r.key === 'nb');
    assert.deepEqual([...nb.regions].sort(), D.ESTATES[view].regionsList.filter(attHolds).map(r => r.region).sort(), view);
  }
  const nb = legsOf('mature').connect.rows.find(r => r.key === 'nb');
  assert.ok(!nb.regions.includes('us-east-04') && !nb.regions.includes('us-west-2'));
  assert.ok(legsOf('mature').connect.rows.some(r => r.key === 'xc' && r.modelled), 'the customer\'s own cross-connect is its own row');
});

test('the cloud ports are named products at list price, marked modelled; AWS flags the flat rate', () => {
  const rows = legsOf('trust').cloud.rows;
  const names = rows.map(r => r.label);
  assert.ok(names.includes('AWS Direct Connect') && names.includes('Azure ExpressRoute') && names.includes('Google Cloud Interconnect'), names.join(', '));
  assert.ok(rows.filter(r => r.key !== 'egress').every(r => r.modelled));
  const dx = rows.find(r => r.label === 'AWS Direct Connect');
  assert.equal(dx.n, 28);
  assert.equal(Math.round(dx.v), Math.round(28 * 1642.5));
  assert.match(dx.sub, /flat rate offered/i);
  assert.match(dx.title, /\$8,001 per 10G port a month, transfer out included/);
  assert.equal(rows.find(r => r.label === 'Azure ExpressRoute').v, 13 * 3400);
});

test('By leg is a Cost tab; every modelled figure wears the mark', () => {
  const v = vals(cost('partial'));
  assert.ok(v.costPanelLegs);
  assert.ok(v.costPanels.some(p => p.label === 'By leg'));
  assert.deepEqual(v.legTiles.map(t => t.l), ['Site access', 'Cloud connectivity', 'Cloud provider']);
  for (const r of [...v.legAccessRows, ...v.legConnectRows, ...v.legCloudRows]) assert.equal(r.mark, r.modelled ? 'Modelled' : '', r.label);
  assert.ok(HTML.includes('aria-label="Cost by leg"') && HTML.includes('{{ lr.mark }}') && HTML.includes('{{ costScopeLine }}'));
});

test('Spend this month is still egress (D-7)', () => {
  const want = { partial: '$89,600', mature: '$121,400', trust: '$438,000', small: '$4,200', empty: '$0' };
  for (const view of VIEWS) assert.equal(vals(cost(view, { costPanel: 'spend' })).spendTiles[0].v, want[view], view);
});

test('the empty estate says so', () => {
  assert.equal(vals(cost('empty')).legEmpty, 'No egress seen yet.');
});

test('the Observe Cost tile says what it covers and opens By leg', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', mapMode: 'cost' });
  const v = vals(c);
  assert.match(v.flowTiles.find(t => t.key === 'cost').title, /traffic on this map/i);
  assert.ok(v.costScopeOn);
  v.costScopeGo();
  assert.equal(c.state.tab, 'cost');
  assert.equal(c.state.costPanel, 'legs');
});
