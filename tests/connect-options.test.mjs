import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { candidateOptions } from '../naas-sites.js';
import { onAtt } from '../naas-logic.js';
import { mkC } from './harness.mjs';
import * as D from '../naas-data.js';

// "Connect is detached currently" (notes, 2026-09-29): the Connect tile and the
// rail's Options both landed on the picture, and the list of what is not on AT&T
// yet lived only in the Discovery drawer, every site with the same advice.
// The Options page became Recommended (Micah, 2026-09-30: "The options don't make
// much sense"): one ranked list of moves, still behind cnPage 'options' so every
// old door lands on it. The moves themselves are pinned in tests/moves.test.mjs.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const railItem = (v, label) => v.railGroups.flatMap(g => g.items).find(i => i.label === label);

test('the Connect tile opens Recommended, not the picture', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'observe', estateParam: null });
  vals(c).rollup.find(r => r.key === 'connect').go();
  assert.equal(c.state.tab, 'connect');
  assert.equal(c.state.cnPage, 'options');
  assert.equal(vals(c).cnIsOptions, true);
});

test('the rail Recommended item opens the same page and lights', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'govern', estateParam: null });
  railItem(vals(c), 'Recommended').go();
  assert.equal(c.state.cnPage, 'options');
  assert.equal(railItem(vals(c), 'Recommended').cur, true);
});

test('any other way into Connect lands on the picture', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'connect', cnPage: 'options', estateParam: null });
  // NaaS went here until 2026-09-30; it is the home now (tests/home.test.mjs). The bell still does.
  vals(c).goFloor();
  assert.equal(c.state.screen, 's3');
  assert.equal(c.state.tab, 'connect');
  assert.equal(c.state.cnPage, 'picture');
  assert.equal(vals(c).cnIsOptions, false);
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

test('every estate: nothing off the AT&T network drops off Recommended', () => {
  // A public region is in a region move; a site not on AT&T access is in a site
  // move; a public site already on AT&T access is named by the region move that
  // fixes its public leg (Singapore DC, the Small estate's two buildings).
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const est = D.ESTATES[view];
    const l = vals(mkC({ view, screen: 's3', tab: 'connect', cnPage: 'options', estateParam: null })).moveList;
    for (const r of est.regionsList.filter(x => !x.priv)) assert.ok(l.some(m => m.regions.includes(r.region)), `${view}: ${r.region}`);
    for (const x of est.sites.filter(y => !y.priv || !onAtt(y))) {
      const bare = x.name.replace(/\s*\([\d,]+\)\s*$/, '');
      assert.ok(l.some(m => m.sites.includes(x.name) || m.reason.includes(bare)), `${view}: ${x.name} is on no move`);
    }
  }
});

test('the markup draws Recommended behind its own gate, in the Connect views tab row', () => {
  assert.match(HTML, /aria-label="Connect views"/);
  const a = HTML.indexOf('<sc-if value="{{ cnIsOptions }}"');
  assert.ok(a > 0);
  assert.match(HTML.slice(a, a + 6000), /<sc-for list="\{\{ moves \}\}"/);
});
