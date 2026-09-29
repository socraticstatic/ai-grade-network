import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import { buOf, countOf } from '../naas-sites.js';
import { buRows, heroLayout } from '../naas-logic.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Customer will be allowed to tag the sites so they can group by Business Unit
// like HQ, Remote office, Manufacturing Plant or whatever it could be based on
// business types" (notes, 2026-09-29).

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const total = (est) => est.sites.reduce((a, x) => a + countOf(x.name), 0);
const find = (id, name) => D.ESTATES[id].sites.find(x => x.name === name);
const estate = (patch = {}) => mkC({ view: 'partial', screen: 's1', estPanel: 'bu', estateParam: null, ...patch });

test('every site starts in a business unit the customer would recognise; the ones nobody tagged say so', () => {
  assert.equal(buOf(find('partial', 'New York HQ')), 'HQ');
  assert.equal(buOf(find('partial', 'Ashburn DC')), 'Data center');
  assert.equal(buOf(find('partial', 'Charlotte branch')), 'Remote office');
  assert.equal(buOf(find('small', 'Houston yard')), 'Manufacturing plant');
  assert.equal(buOf(find('trust', 'Edge devices (48)')), 'Untagged');
  assert.equal(buOf(find('partial', 'Ashburn DC'), { 'Ashburn DC': 'Finance' }), 'Finance', 'a tag wins');
});

test('the business units add up to the estate', () => {
  for (const id of ['partial', 'mature', 'trust', 'small']) {
    const est = D.ESTATES[id];
    assert.equal(buRows(est, {}).reduce((a, r) => a + r.count, 0), total(est), id);
  }
  assert.ok(buRows(D.ESTATES.trust, {}).some(r => r.name === 'Untagged'));
});

test('Estate has a Business units view; moving a site re-tags it and the totals hold', () => {
  const c = estate();
  let v = vals(c);
  assert.ok(v.estPanels.some(p => p.key === 'bu' && p.label === 'Business units'));
  assert.equal(v.estPanelBu, true);
  v.buList.find(b => b.name === 'HQ').go();
  v = vals(c);
  const row = v.buSites.find(r => r.name === 'Ashburn DC');
  assert.equal(row.bu, 'Data center');
  assert.equal(row.moveLabel, 'Move to HQ');
  row.move();
  v = vals(c);
  assert.equal(v.buSites.find(r => r.name === 'Ashburn DC').bu, 'HQ');
  assert.equal(v.buList.filter(b => !b.all).reduce((a, b) => a + b.n, 0), total(D.ESTATES.partial));
  assert.match(store['naas.tags'], /Ashburn DC/);
});

test('a new business unit can be named, becomes the one to move sites into, and survives a reload', () => {
  const c = estate();
  vals(c).setBuNew({ target: { value: 'Manufacturing' } });
  vals(c).addBu();
  const v = vals(c);
  assert.ok(v.buList.some(b => b.name === 'Manufacturing' && b.on));
  assert.match(store['naas.tags'], /Manufacturing/);
  assert.equal(vals(c).buNew, '');
});

test('the picture groups by business unit too, and never resizes', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'connect', estateParam: null });
  vals(c).setSiteGroup({ target: { value: 'bu' } });
  const names = vals(c).heroSites.filter(x => !x.more).map(x => x.name);
  assert.ok(names.includes('HQ') && names.includes('Data center'), names.join(', '));
  assert.equal(heroLayout(D.ESTATES.partial, { groupBy: 'bu', tags: {} }).H, heroLayout(D.ESTATES.partial, {}).H);
  assert.match(HTML, /<option value="bu">Business unit<\/option>/);
});
