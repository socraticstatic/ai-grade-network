import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import { savingsBy, bankedSources, lifeFor } from '../naas-lifecycle.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Show savings by: Group by region, business unit, cloud providers" (notes, 2026-09-29).

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const money = (s) => +String(s).replace(/[^\d]/g, '');

// Re-pinned (2026-09-30, the skeptic's third read): the two totals are no longer handed in and split by one
// weight. Banked is its sources (LC.bankedSources), each where it names; still open is the open priced findings,
// each where its buckets bill. Every grouping still splits those same two totals, to the dollar.
const NOW = new Date('2026-09-29T12:00:00Z');
const inputs = (est) => ({ sources: bankedSources(est, lifeFor(est), NOW), open: (est.findings || []).filter(f => f.priced) });
test('every grouping splits the same two totals, to the dollar', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const est = D.ESTATES[id], inp = inputs(est);
    const banked = inp.sources.reduce((a, x) => a + x.perMo, 0), open = inp.open.reduce((a, f) => a + f.save, 0);
    assert.ok(banked > 0 && open > 0, id);
    for (const dim of ['region', 'bu', 'cloud']) {
      const rows = savingsBy(est, dim, inp);
      assert.equal(rows.reduce((a, r) => a + r.banked, 0), banked, `${id} ${dim} banked`);
      assert.equal(rows.reduce((a, r) => a + r.open, 0), open, `${id} ${dim} open`);
      assert.ok(rows.every(r => r.label && r.banked >= 0 && r.open >= 0));
      // Each row's banked is its sources' shares.
      for (const r of rows) assert.equal(Object.values(r.bySource).reduce((a, x) => a + x, 0), r.banked, `${id} ${dim} ${r.label}`);
    }
  }
});

test('cloud rows are the estate\'s own providers; business units include Untagged where it exists', () => {
  const t = D.ESTATES.trust;
  const clouds = new Set(t.regionsList.map(r => r.cloud));
  assert.ok(savingsBy(t, 'cloud', inputs(t)).every(r => clouds.has(r.label)));
  assert.ok(savingsBy(t, 'bu', inputs(t)).some(r => r.label === 'Untagged'));
  assert.equal(savingsBy(D.ESTATES.partial, 'bu', inputs(D.ESTATES.partial), { 'Ashburn DC': 'Finance' }).some(r => r.label === 'Finance'), true, 'a tag makes a row');
});

test('the Banked view groups its figures, and the rows add up to its tiles', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'cost', costPanel: 'banked', estateParam: null });
  for (const dim of ['region', 'bu', 'cloud']) {
    vals(c).setSaveGroup({ target: { value: dim } });
    const v = vals(c);
    assert.equal(v.saveGroupValue, dim);
    const tiles = Object.fromEntries(v.bankTiles.map(t => [t.l, money(t.v)]));
    // The list pages (2026-09-29): sum every page.
    let rows = [], guard = 0;
    c.state.savePage = 0;
    for (;;) { const w = vals(c); rows = rows.concat(w.saveRows); if (w.savePager.nextOp < 1 || ++guard > 20) break; w.savePager.next(); }
    c.state.savePage = 0;
    assert.equal(rows.reduce((a, r) => a + r.bankedN, 0), tiles['This month'], dim);
    assert.equal(rows.reduce((a, r) => a + r.openN, 0), tiles['Still open'], dim);
  }
  assert.match(HTML, /aria-label="Group savings by"/);
  assert.match(HTML, /<option value="bu">Business unit<\/option><option value="cloud">Cloud<\/option>/);
});
