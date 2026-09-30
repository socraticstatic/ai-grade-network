import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import * as P from '../naas-paths.js';
import * as X from '../naas-connections.js';
import * as OD from '../naas-observe-dash.js';
import * as A from '../naas-addendum.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Your sites lists sites with how they connect and how fast (notes,
// 2026-09-30, Task 2.3): "once we display States, we should show all
// city/sites and attributes like connection types (ADI/ABF etc) and BW info
// (1Gbps or whatever it may be)". Bandwidth is the purchased circuit per service.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const sites = (view, trail) => vals(mkC({ view, estateParam: null, screen: 's1', estPanel: 'sites', placeTrail: trail }));

test('a state lists its sites, with the service and the bandwidth, and no metro in between', () => {
  const v = sites('partial', ['region:US East', 'state:MA']);
  assert.deepEqual(v.placeRows.map(r => r.name), ['Boston office']);
  assert.equal(v.placeRows[0].svcLine, 'Business Fiber 2 Gbps');
  assert.equal(v.placeRows[0].bwF, '2 Gbps');
  assert.equal(v.placeLine, '1 site in 1 metro');
});

test('Texas: a data center shows its primary and its backup; the crumbs keep the metro', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's1', estPanel: 'sites', placeTrail: ['region:US Central', 'state:TX'] });
  const v = vals(c);
  const dc = v.placeRows.find(r => r.name === 'Dallas DC');
  assert.equal(dc.svcLine, 'AVPN 10 Gbps + ADI 1 Gbps backup');
  assert.ok(v.placeRows.some(r => r.name === 'Houston office'));
  dc.go();
  assert.deepEqual(vals(c).placeCrumbs.map(x => x.label), ['All regions', 'US Central', 'Texas', 'Dallas', 'Dallas DC']);
});

test('a state with two sites or fewer names them on the region level', () => {
  const ma = sites('partial', ['region:US East']).placeRows.find(r => r.name === 'Massachusetts');
  assert.match(ma.access, /Boston office · Business Fiber · 2 Gbps/);
});

test('every named site buys at least the traffic it sends', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const est = D.ESTATES[view];
    for (const site of est.sites.filter(x => S.countOf(x.name) === 1)) {
      const bw = S.servicesOf(site)[0].bw / 1000, sent = P.siteRegions(est, site, 99).rows.reduce((a, r) => a + r.gbps, 0);
      assert.ok(bw >= sent - 1e-6, `${view}/${site.name}: ${bw} Gbps bought, ${sent.toFixed(2)} sent`);
    }
  }
});

test('Atlanta and Los Angeles are Business Fiber first, Internet Air behind', () => {
  for (const name of ['Atlanta office', 'Los Angeles office']) {
    const sv = S.servicesOf(D.ESTATES.partial.sites.find(x => x.name === name));
    assert.equal(sv[0].key, 'abf', name);
    assert.equal(sv[1].key, 'aiab', name);
    assert.equal(sv[1].role, 'backup', name);
  }
});

test('Bank scale: the rest of Miami pages in place, never in a drawer', () => {
  const c = mkC({ view: 'trust', estateParam: null, screen: 's1', estPanel: 'sites', placeTrail: ['region:US East', 'state:FL'] });
  const more = vals(c).placeRows.find(r => /^\+[\d,]+ more in Miami$/.test(r.name));
  assert.ok(more, vals(c).placeRows.map(r => r.name).join(', '));
  more.go();
  const v = vals(c);
  assert.equal(c.state.placeTrail[c.state.placeTrail.length - 1], 'metro:Miami');
  assert.ok(!c.state.drawerOpen);
  assert.equal(v.placeRows.length, 10);
  assert.match(v.placePager.label, /^1–10 of 709$/);
});

test('a rollup sample agrees with its metro: none on AVPN where none are on AT&T', () => {
  const v = sites('trust', ['region:US East', 'state:FL', 'metro:Miami']);
  assert.ok(v.placeRows.every(r => !/AVPN/.test(r.svcLine || r.access)), v.placeRows.map(r => r.svcLine || r.access).join(' | '));
});

test('Nationwide holds states, and no crumb reads a bare dash', () => {
  assert.match(sites('mature', ['region:Nationwide']).placeLine, /states/);
  const v = sites('mature', ['region:Nationwide', 'state:—']);
  assert.ok(v.placeCrumbs.every(c => c.label && c.label !== '—'), v.placeCrumbs.map(c => c.label).join(' > '));
});

test('Dallas DC reads the same bandwidth everywhere a service shows', () => {
  const est = D.ESTATES.partial, site = est.sites.find(x => x.name === 'Dallas DC');
  const leaf = X.siteDrillRows(est, ['region:US Central', 'state:TX', 'metro:Dallas', 'site:Dallas DC']);
  assert.ok(leaf.rows.some(r => /10 Gbps/.test(r.access)), leaf.rows.map(r => r.access).join(' | '));
  const inv = A.inventory(est), ob = A.observe(est, [], inv);
  const panel = OD.sitePanel('Dallas DC', { est, inv, flows: ob.flows, conns: X.connections(est, ob) });
  assert.ok(JSON.stringify(panel).includes('AVPN 10 Gbps'), 'the Observe site panel names the service and its bandwidth');
});
