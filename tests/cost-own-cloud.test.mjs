import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as R from '../naas-round2.js';
import * as CV from '../naas-cost-view.js';
import * as LC from '../naas-lifecycle.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The skeptic's third read of Cost v2 (2026-09-30): the P1 fix pooled every bucket
// of one ink across the whole estate and labelled each share with a cloud region,
// so By region and By cloud disagreed on the same page (Bank scale's US Central
// held Azure's egress, GCP's $84,000 went to AWS and Azure regions, CoreWeave got
// AT&T-price egress it does not have). The rule: a region's egress comes only
// from its own cloud's buckets, so By region summed by cloud equals By cloud;
// what it could save is its own cloud's open findings; Recommended reads both.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const BUCKETED = ['partial', 'mature', 'trust', 'small'];
const legsOf = (view) => { const e = D.ESTATES[view], inv = A.inventory(e), ob = A.observe(e, [], inv); return R.costLegs(e, inv, ob.utilRows); };
const cost = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', ...patch });
const money = (s) => +String(s).replace(/[^0-9.]/g, '');
// This month's egress by cloud region, ink by ink, as By region reads it.
const egressByRegion = (e, L) => {
  const row = L.cloud.rows.find(r => r.key === 'egress');
  const out = {};
  for (const p of CV.partsFor(e, row, 'region')) { const g = out[p.region] = out[p.region] || { public: 0, att: 0 }; g[p.ink] += p.v; }
  return out;
};
const premium = (b) => Math.max(0, b.today - b.fabric);
// A resolved IPsec egress finding (the skeptic's case on Growing).
const resolvedIpsec = { partial: { ipsecegress: { owner: 'You', events: [{ at: '2026-08-02', state: 'open', by: 'Discovery' }, { at: '2026-09-10', state: 'progress', by: 'You' }, { at: '2026-09-20', state: 'resolved', by: 'You' }] } } };

test('a region\'s egress comes only from its own cloud\'s buckets, so By region summed by cloud equals By cloud, ink by ink', () => {
  for (const view of BUCKETED) {
    const e = D.ESTATES[view], L = legsOf(view), byR = egressByRegion(e, L);
    const clouds = [...new Set([...e.buckets.map(b => b.cloud), ...e.regionsList.map(r => r.cloud)])];
    for (const cloud of clouds) for (const ink of ['public', 'att']) {
      const want = e.buckets.filter(b => b.cloud === cloud && CV.bucketInk(e, b) === ink).reduce((a, b) => a + b.today, 0);
      const got = e.regionsList.filter(r => r.cloud === cloud).reduce((a, r) => a + ((byR[r.region] || {})[ink] || 0), 0);
      assert.equal(got, want, `${view} ${cloud} ${ink}: By region ${got} vs By cloud ${want}`);
      // And By cloud's own slice reads the same figure.
      const eg = CV.sliceLegs(e, L, 'cloud', cloud).cloud.rows.find(r => r.key === 'egress');
      assert.equal(eg ? eg.parts.filter(p => p.ink === ink).reduce((a, p) => a + p.v, 0) : 0, want, `${view} ${cloud} ${ink} By cloud`);
    }
  }
});

test('the skeptic\'s cases: each region holds its own cloud\'s egress and nothing else', () => {
  const t = D.ESTATES.trust, tR = egressByRegion(t, legsOf('trust'));
  // GCP has no public region on Bank scale, so its $84,000 outside AT&T lands on us-central1, the region it has.
  assert.deepEqual(tR['us-central1'], { public: 84000, att: 0 });
  assert.deepEqual(tR.centralus, { public: 38000, att: 0 }, 'Azure centralus holds Azure\'s egress, never more');
  assert.equal(tR['us-west-2'].public, 62000 + 44000, 'AWS us-west-2 holds AWS\'s egress outside AT&T, not GCP\'s');
  const m = D.ESTATES.mature, mR = egressByRegion(m, legsOf('mature'));
  assert.ok(!mR['us-east-04'], 'CoreWeave has no bucket, so no egress by region');
  assert.equal(mR.eastus.att + mR.westeurope.att, 6200, 'Azure\'s two regions hold Azure\'s $6,200');
  const p = D.ESTATES.partial, pR = egressByRegion(p, legsOf('partial'));
  assert.deepEqual(pR.westeurope, { public: 7400, att: 0 }, 'Azure westeurope holds Azure\'s $7,400');
  assert.ok(!pR.eastus, 'Azure eastus is attached, but Azure\'s only bucket bills outside AT&T, in its public region');
});

test('By region rows: today is the region\'s egress outside AT&T, to save its own cloud\'s open findings, and they add to the page\'s totals', () => {
  for (const view of BUCKETED) {
    const e = D.ESTATES[view], L = legsOf(view), byR = egressByRegion(e, L);
    const v = vals(cost(view, { costPanel: 'money' }));
    const out = e.buckets.filter(b => CV.bucketInk(e, b) === 'public').reduce((a, b) => a + b.today, 0);
    const stillOpen = money(v.bankTiles.find(t => t.l === 'Still open').v);
    // Every region carrying egress outside AT&T has a row, attached or not.
    const carrying = e.regionsList.filter(r => (byR[r.region] || {}).public > 0).map(r => r.region).sort();
    assert.deepEqual(v.regionSaveRows.map(r => r.regionId).sort(), carrying, view);
    assert.equal(v.regionSaveRows.reduce((a, r) => a + r.nowN, 0), out, `${view}: today adds to the egress outside AT&T`);
    assert.equal(v.regionSaveRows.reduce((a, r) => a + r.saveN, 0), stillOpen, `${view}: to save adds to Still open`);
    for (const r of v.regionSaveRows) {
      assert.equal(r.nowN, byR[r.regionId].public, `${view} ${r.label}`);
      assert.equal(r.nowN - r.saveN, r.afterN, `${view} ${r.label}`);
    }
    // Per cloud, to save is that cloud's open premium: nothing moves from one cloud to another.
    for (const cloud of new Set(e.buckets.map(b => b.cloud))) {
      const want = e.buckets.filter(b => b.cloud === cloud).reduce((a, b) => a + premium(b), 0);
      assert.equal(v.regionSaveRows.filter(r => r.cloud === cloud).reduce((a, r) => a + r.saveN, 0), want, `${view} ${cloud}`);
    }
  }
  // Bank scale: GCP us-central1 is attached, yet GCP's egress bills outside AT&T, so its row steers rather than attaches.
  const t = vals(cost('trust', { costPanel: 'money' })).regionSaveRows.find(r => r.regionId === 'us-central1');
  assert.ok(t, 'GCP us-central1 has a row');
  assert.deepEqual([t.nowN, t.saveN, t.act], [84000, 53000, 'Steer']);
  assert.equal(vals(cost('trust', { costPanel: 'money' })).regionSaveRows.find(r => r.regionId === 'us-west-2').act, 'Attach');
});

test('resolving a finding takes its saving off its own cloud\'s regions only, on By region and the Savings list alike', () => {
  const before = vals(cost('partial', { costPanel: 'money' })).regionSaveRows;
  const c = cost('partial', { costPanel: 'money', findingLife: resolvedIpsec });
  const after = vals(c).regionSaveRows;
  const of = (rows, cloud) => rows.filter(r => r.cloud === cloud).reduce((a, r) => a + r.saveN, 0);
  assert.equal(of(before, 'AWS') - of(after, 'AWS'), 5500, 'the IPsec bucket is AWS\'s');
  assert.equal(of(after, 'Azure'), of(before, 'Azure'));
  assert.equal(of(after, 'GCP'), of(before, 'GCP'));
  const open = Object.fromEntries(LC.savingsBy(D.ESTATES.partial, 'region', { open: D.ESTATES.partial.findings.filter(f => f.priced && f.kind !== 'ipsecegress') }).map(o => [o.label, o.open]));
  for (const r of after) assert.equal(r.saveN, open[r.label], r.label);
});

test('Savings by cloud is that cloud\'s open findings and what it banked; By region summed by cloud is the same', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const e = D.ESTATES[view];
    const v = vals(cost(view, { costPanel: 'spend', saveGroup: 'cloud' }));
    const byCloud = Object.fromEntries(v.saveRows.map(r => [r.label, r]));
    for (const cloud of new Set(e.buckets.map(b => b.cloud))) {
      const want = e.buckets.filter(b => b.cloud === cloud).reduce((a, b) => a + premium(b), 0);
      assert.equal((byCloud[cloud] || { openN: 0 }).openN, want, `${view} ${cloud} still open`);
    }
    const rv = vals(cost(view, { costPanel: 'spend', saveGroup: 'region' }));
    let rows = [], guard = 0;
    const c = cost(view, { costPanel: 'spend', saveGroup: 'region' });
    for (;;) { const w = vals(c); rows = rows.concat(w.saveRows); if (w.savePager.nextOp < 1 || ++guard > 20) break; w.savePager.next(); }
    void rv;
    for (const [cloud, r] of Object.entries(byCloud)) {
      const mine = rows.filter(x => x.label.startsWith(cloud + ' '));
      assert.equal(mine.reduce((a, x) => a + x.openN, 0), r.openN, `${view} ${cloud} open`);
      assert.equal(mine.reduce((a, x) => a + x.bankedN, 0), r.bankedN, `${view} ${cloud} banked`);
    }
  }
});

test('Recommended prices a region move off its own cloud\'s egress, and its after is By region\'s after, a finding resolved or not', () => {
  for (const [view, life] of [['partial', null], ['partial', resolvedIpsec], ['trust', null], ['mature', null], ['small', null]]) {
    const e = D.ESTATES[view];
    const patch = life ? { findingLife: life } : {};
    const v = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options', ...patch }));
    const rows = vals(cost(view, { costPanel: 'money', ...patch })).regionSaveRows;
    for (const m of (v.moveList || []).filter(x => x.kind === 'region')) {
      const out = e.buckets.filter(b => b.cloud === m.cloud && CV.bucketInk(e, b) === 'public').reduce((a, b) => a + b.today, 0);
      assert.ok(m.today.egress <= out, `${view} ${m.title}: ${m.today.egress} is more than ${m.cloud}'s egress outside AT&T, ${out}`);
      const mine = rows.filter(r => m.regions.includes(r.regionId));
      assert.equal(m.today.egress, mine.reduce((a, r) => a + r.nowN, 0), `${view} ${m.title} today`);
      const nb = m.tiers.find(t => t.path === 'netbond' && t.covers.length === m.regions.length && t.products.length);
      if (nb) assert.equal(nb.egress, mine.reduce((a, r) => a + r.afterN, 0), `${view}${life ? ' (IPsec resolved)' : ''} ${m.title}: after`);
    }
  }
  const p = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' })).moveList.find(m => m.kind === 'region' && m.cloud === 'Azure');
  assert.equal(p.today.egress, 7400, 'Azure westeurope carries Azure\'s $7,400, never $11,522');
  const t = vals(mkC({ view: 'trust', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' })).moveList.find(m => m.kind === 'region' && m.cloud === 'Azure');
  assert.equal(t.today.egress, 38000, 'Azure centralus carries Azure\'s $38,000, never $80,067');
});

test('the By region list says what it lists: every region outside AT&T, its door Attach or Steer, its note the own-cloud rule', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  const a = HTML.indexOf('<div id="sec-arbitrage"'), html = HTML.slice(a, HTML.indexOf('</sc-if>', HTML.indexOf('regSavePager.many', a)));
  assert.match(html, /aria-label="What each region could save"/);
  assert.match(html, />Could save, by region</);
  assert.equal((html.match(/>\{\{ rs2\.act \}\}<\/button>/g) || []).length, 2, 'the summary and the arithmetic both name the door');
  assert.doesNotMatch(html, />Attach<\/button>/);
  assert.match(html, /its own cloud/);
  const v = vals(cost('trust', { costPanel: 'money' }));
  assert.match(v.regionNote, /own cloud/);
  assert.doesNotMatch(v.regionNote, /as the Savings list splits it: outside AT&T across the public regions/);
});
