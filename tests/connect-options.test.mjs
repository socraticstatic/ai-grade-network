import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { candidateOptions, gapSiteCount } from '../naas-sites.js';
import { mkC } from './harness.mjs';
import * as D from '../naas-data.js';

// "Connect is detached currently" (notes, 2026-09-29): the Connect tile and the
// rail's Options both landed on the picture, and the list of what is not on AT&T
// yet lived only in the Discovery drawer, every site with the same advice.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const railItem = (v, label) => v.railGroups.flatMap(g => g.items).find(i => i.label === label);

test('the Connect tile opens Options, not the picture', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'observe', estateParam: null });
  vals(c).rollup.find(r => r.key === 'connect').go();
  assert.equal(c.state.tab, 'connect');
  assert.equal(c.state.cnPage, 'options');
  assert.equal(vals(c).cnIsOptions, true);
});

test('the rail Options item opens the same page and lights', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'govern', estateParam: null });
  railItem(vals(c), 'Options').go();
  assert.equal(c.state.cnPage, 'options');
  assert.equal(railItem(vals(c), 'Options').cur, true);
});

test('any other way into Connect lands on the picture', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'connect', cnPage: 'options', estateParam: null });
  railItem(vals(c), 'NaaS').go();
  assert.equal(c.state.cnPage, 'picture');
  assert.equal(vals(c).cnIsOptions, false);
});

test('candidates are grouped Sites, Data centers, Cloud regions; each has a best option, alternatives and a move', () => {
  const v = vals(mkC({ view: 'partial', screen: 's3', tab: 'connect', cnPage: 'options', estateParam: null }));
  const labels = v.candGroups.map(g => g.label);
  for (const l of labels) assert.ok(['Sites', 'Data centers', 'Cloud regions'].includes(l), l);
  assert.ok(labels.includes('Cloud regions'));
  for (const g of v.candGroups) for (const r of g.rows) {
    assert.ok(r.bestName && r.altLine, r.name);
    assert.equal(typeof r.go, 'function', r.name);
  }
});

test('an IPsec site, a data center and a cloud region get different best options', () => {
  const ipsec = candidateOptions({ name: 'Plano branch', access: 'IPsec over internet', metro: 'Dallas' });
  const dc = candidateOptions({ name: 'Ashburn DC', access: 'Business Fiber', metro: 'Ashburn', cls: 'Data center' });
  const region = candidateOptions({ cloud: 'AWS', region: 'us-east-1' });
  assert.equal(ipsec.best.key, 'avpn');
  assert.equal(dc.best.key, 'aseod');
  assert.equal(region.best.key, 'netbond');
  for (const o of [ipsec, dc, region]) assert.ok(o.alts.length >= 1 && o.alts.every(a => a.key !== o.best.key));
});

test('every estate: the candidates count every public site and region, nothing dropped', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const est = D.ESTATES[view];
    const v = vals(mkC({ view, screen: 's3', tab: 'connect', cnPage: 'options', estateParam: null }));
    const sites = v.candGroups.filter(g => g.label !== 'Cloud regions').flatMap(g => g.rows).reduce((a, r) => a + r.qty, 0);
    const regions = (v.candGroups.find(g => g.label === 'Cloud regions') || { rows: [] }).rows.length;
    assert.equal(sites, gapSiteCount(est), view);
    assert.equal(regions, est.regionsList.filter(r => !r.priv).length, view);
  }
});

test('the markup draws the Options page behind its own gate, in the Connect views tab row', () => {
  assert.match(HTML, /aria-label="Connect views"/);
  const a = HTML.indexOf('<sc-if value="{{ cnIsOptions }}"');
  assert.ok(a > 0);
  assert.match(HTML.slice(a, a + 4000), /<sc-for list="\{\{ candGroups \}\}"/);
});
