import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import { savingsBy } from '../naas-lifecycle.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Show savings by: Group by region, business unit, cloud providers" (notes, 2026-09-29).

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const money = (s) => +String(s).replace(/[^\d]/g, '');

test('every grouping splits the same two totals, to the dollar', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const est = D.ESTATES[id];
    for (const dim of ['region', 'bu', 'cloud']) {
      const rows = savingsBy(est, dim, { banked: 36000, open: 41500 });
      assert.equal(rows.reduce((a, r) => a + r.banked, 0), 36000, `${id} ${dim} banked`);
      assert.equal(rows.reduce((a, r) => a + r.open, 0), 41500, `${id} ${dim} open`);
      assert.ok(rows.every(r => r.label && r.banked >= 0 && r.open >= 0));
    }
  }
});

test('cloud rows are the estate\'s own providers; business units include Untagged where it exists', () => {
  const t = D.ESTATES.trust;
  const clouds = new Set(t.regionsList.map(r => r.cloud));
  assert.ok(savingsBy(t, 'cloud', { banked: 1, open: 1 }).every(r => clouds.has(r.label)));
  assert.ok(savingsBy(t, 'bu', { banked: 100, open: 100 }).some(r => r.label === 'Untagged'));
  assert.equal(savingsBy(D.ESTATES.partial, 'bu', { banked: 100, open: 100 }, { 'Ashburn DC': 'Finance' }).some(r => r.label === 'Finance'), true, 'a tag makes a row');
});

test('the Banked view groups its figures, and the rows add up to its tiles', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'cost', costPanel: 'banked', estateParam: null });
  for (const dim of ['region', 'bu', 'cloud']) {
    vals(c).setSaveGroup({ target: { value: dim } });
    const v = vals(c);
    assert.equal(v.saveGroupValue, dim);
    const tiles = Object.fromEntries(v.bankTiles.map(t => [t.l, money(t.v)]));
    assert.equal(v.saveRows.reduce((a, r) => a + r.bankedN, 0), tiles['This month'], dim);
    assert.equal(v.saveRows.reduce((a, r) => a + r.openN, 0), tiles['Still open'], dim);
  }
  assert.match(HTML, /aria-label="Group savings by"/);
  assert.match(HTML, /<option value="bu">Business unit<\/option><option value="cloud">Cloud<\/option>/);
});
