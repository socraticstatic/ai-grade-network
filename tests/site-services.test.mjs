import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import { placeDrill } from '../naas-connections.js';
import { regionRows, filterSites, linesOf } from '../naas-logic.js';
import { accessThing } from '../naas-things.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Micah, 2026-09-28: "it needs to be regions, states and metros and we need
// filters across - by service type, location, public vs private"; "we have
// clouds under sites, not AVPN and ASE on demand, ADI, business fiber, AIA-B";
// "Third Party Access ... goes to the bottom (outside AT&T)"; "ADI always goes
// through AT&T core". Rulings the same day: several services where real, the
// IPsec sites are Third Party Access, AIA-B routes like ADI, one filter row.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const est = D.ESTATES.partial;
const site = (name) => est.sites.find(x => x.name === name);

test('the catalog names the six services the way AT&T sells them', () => {
  assert.deepEqual(Object.values(S.SERVICE).map(x => x.label), ['AVPN', 'ASE on Demand', 'ADI', 'Business Fiber', 'AIA-B', 'Third Party Access']);
  assert.equal(S.SERVICE.tpa.onAtt, false);
  for (const k of ['avpn', 'aseod', 'adi', 'abf', 'aiab']) assert.equal(S.SERVICE[k].onAtt, true, k);
});

test('data centers carry a primary and a backup; offices and branches carry one', () => {
  const dc = S.servicesOf(site('Dallas DC'));
  assert.equal(dc.length, 2);
  assert.deepEqual(dc.map(x => x.role), ['primary', 'backup']);
  assert.equal(S.servicesOf(site('Boston office')).length, 1);
  const every = new Set(est.sites.flatMap(x => S.servicesOf(x).map(v => v.key)));
  assert.deepEqual([...every].sort(), ['abf', 'adi', 'aiab', 'aseod', 'avpn', 'tpa']);
});

test('the IPsec sites are Third Party Access and sit outside the AT&T network', () => {
  for (const x of est.sites.filter(y => y.tunnel === 'IPsec')) {
    assert.deepEqual(S.servicesOf(x).map(v => v.key), ['tpa'], x.name);
    assert.equal(x.priv, false, x.name);
  }
});

test('a site without declared services still reads one from its access', () => {
  assert.deepEqual(S.servicesOf({ access: 'AVPN (MPLS VPN)', priv: true }).map(v => v.key), ['avpn']);
  assert.deepEqual(S.servicesOf({ access: 'ADI (Dedicated Internet)', priv: false }).map(v => v.key), ['adi']);
});

test('ADI and AIA-B run through the AT&T core; Third Party Access does not', () => {
  assert.equal(accessThing({ priv: true, access: 'ADI' }).owner, 'att');
  assert.equal(accessThing({ priv: true, access: 'AIA-B' }).label, 'Internet Air');
  // ADI is AT&T's own internet: it enters the AT&T network even on a site whose
  // traffic is not a private path, so the picture routes it through the core.
  const sg = D.ESTATES.mature.sites.find(x => x.name === 'Singapore DC');
  assert.equal(sg.priv, false);
  assert.equal(accessThing(sg).label, 'Dedicated Internet');
  const intl = regionRows(D.ESTATES.mature).find(r => r.name === 'International');
  assert.ok(intl.lines.some(l => l.key === 'a:adi'), intl.lines.map(l => l.key).join(','));
});

test('a group of sites fans one line per service it uses, and Third Party Access leaves by the lane', () => {
  const east = regionRows(est).find(r => r.name === 'US East');
  const keys = linesOf(east.sites).map(l => l.key);
  assert.ok(keys.includes('public'), keys.join(','));
  assert.ok(keys.includes('a:avpn') && keys.includes('a:adi'), keys.join(','));
});

// Ruled 2026-09-28: the drill belongs to Discover → Estate's "Your sites"; the
// Connect picture stays as it was.
const drill = (region, rest = []) => placeDrill(est, region, regionRows(est).find(r => r.name === region).sites, rest);
test('the drill is region, state, metro, site, then the site\'s services', () => {
  const r = drill('US Central');
  assert.equal(r.level, 'state');
  assert.deepEqual(r.rows.map(x => x.name), ['Illinois', 'Minnesota', 'Missouri', 'Texas']);
  const tx = drill('US Central', ['state:TX']);
  assert.equal(tx.level, 'metro');
  assert.deepEqual(tx.rows.map(x => x.name), ['Dallas', 'Houston']);
  const dal = drill('US Central', ['state:TX', 'metro:Dallas']);
  assert.equal(dal.level, 'site');
  assert.deepEqual(dal.rows.map(x => x.name), ['Dallas DC']);
  const svc = drill('US Central', ['state:TX', 'metro:Dallas', 'site:Dallas DC']);
  assert.equal(svc.level, 'service');
  assert.deepEqual(svc.rows.map(x => x.name), ['AVPN', 'ADI']);
  assert.ok(svc.rows.every(x => x.leaf), 'a service is the bottom of the drill');
  assert.ok(!svc.rows.some(x => /AWS|Azure|GCP/.test(x.name)), 'no clouds under a site');
});

test('outside the US the second level is the country', () => {
  const r = drill('Europe');
  assert.deepEqual(r.rows.map(x => x.name), ['France', 'Ireland', 'Netherlands', 'Spain', 'United Kingdom']);
});

test('filters narrow the sites by service, location and reach, and compose', () => {
  assert.equal(filterSites(est.sites, {}).length, 25);
  assert.equal(filterSites(est.sites, { svc: ['tpa'] }).length, 5);
  assert.equal(filterSites(est.sites, { reach: 'outside' }).length, 5);
  assert.equal(filterSites(est.sites, { reach: 'att' }).length, 20);
  assert.equal(filterSites(est.sites, { loc: 'region:Europe' }).length, 5);
  assert.equal(filterSites(est.sites, { loc: 'state:TX' }).length, 2);
  assert.equal(filterSites(est.sites, { loc: 'region:Europe', svc: ['tpa'] }).length, 1);
});

test('the filter row offers each service the estate uses, and toggling one filters', () => {
  const c = mkC({ view: 'partial' });
  const chips = vals(c).svcChips;
  assert.deepEqual(chips.map(x => x.label), ['AVPN', 'ASE on Demand', 'ADI', 'Business Fiber', 'AIA-B', 'Third Party Access']);
  chips.find(x => x.key === 'adi').go();
  assert.deepEqual(c.state.siteFilter.svc, ['adi']);
  vals(c).reachChips.find(x => x.key === 'outside').go();
  assert.equal(c.state.siteFilter.reach, 'outside');
  vals(c).clearFilters();
  assert.deepEqual(c.state.siteFilter, {});
});
