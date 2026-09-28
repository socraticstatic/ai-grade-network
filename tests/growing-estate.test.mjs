import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { regionRows } from '../naas-logic.js';
import { defaults, vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Make networking and growing the default, and make it 25 sites across 5
// regions ... 1 site from each region is connected to the (IPSEC to Cloud)
// public internet - now we can show egress cost because they're using public
// internet, and there's a security issue" (Micah, 2026-09-28). Four AT&T sites
// and one IPsec site per region.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const est = D.ESTATES.partial;

test('Growing is 25 sites across five regions, five in each', () => {
  assert.equal(est.sites.length, 25);
  const rows = regionRows(est);
  assert.deepEqual(rows.map(r => r.name), ['US East', 'US Central', 'US West', 'Europe', 'Asia Pacific']);
  for (const r of rows) assert.equal(r.count, 5, r.name);
});

test('each region has four sites on AT&T and one on IPsec over the internet', () => {
  for (const r of regionRows(est)) {
    const pub = r.sites.filter(x => !x.priv);
    assert.equal(pub.length, 1, r.name);
    assert.equal(pub[0].tunnel, 'IPsec', r.name);
    assert.match(pub[0].access, /IPsec/);
  }
});

test('the IPsec sites carry an egress bill and a security finding', () => {
  assert.ok(est.buckets.some(b => b.id === 'ipsec' && b.today > b.fabric));
  const sec = est.findings.find(f => f.kind === 'ipsec');
  assert.ok(sec && !sec.priced && /IPsec/.test(sec.head));
  const cost = est.findings.find(f => f.kind === 'ipsecegress');
  assert.ok(cost && cost.priced && cost.save > 0);
});

test('a fresh visitor lands on Network Engineering and the Growing estate', () => {
  const d = defaults();
  assert.equal(d.view, 'partial');
  assert.equal(d.persona, 'neteng');
  const v = vals({ state: { ...d, screen: 's3', layer: 'cloud', tab: 'connect' }, setState: () => {} });
  assert.equal(v.persona, 'neteng');
  assert.equal(v.view, 'partial');
});

test('the sites door names what the region cards hold', () => {
  assert.equal(vals(mkC({ view: 'partial' })).sitesDoor.label, 'All 25 sites ›');
});

// The markup keeps its own constructor, and it is what a browser boots from:
// defaults() said Growing while the page still opened on Established.
test('the page boots on the same estate and persona defaults() names', async () => {
  const { readFileSync } = await import('node:fs');
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  const ctor = HTML.slice(HTML.indexOf('constructor(p) { super(p); this.state = {'), HTML.indexOf('constructor(p) { super(p); this.state = {') + 400);
  assert.match(ctor, new RegExp(`view: '${defaults().view}'`));
  assert.match(ctor, new RegExp(`persona: '${defaults().persona}'`));
});
