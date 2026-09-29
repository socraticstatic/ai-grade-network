import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// No scrolling reaches the product page too (2026-09-29): a finding's move opens
// it, and what it includes, its term pricing and what it runs with were three
// stacked sections. One tab row, like every other page.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const prod = (patch = {}) => mkC({ view: 'partial', screen: 's8', productId: 'hosted-vpc', estateParam: null, ...patch });

test('the product page shows one section at a time, What you get first', () => {
  const v = vals(prod());
  assert.equal(v.prodPanels[0].label, 'What you get');
  assert.ok(v.prodPanels.some(p => p.label === 'Term pricing'));
  assert.equal(v.prodPanelGet, true);
  assert.equal(v.prodPanelTerms, false);
  v.prodPanels.find(p => p.label === 'Term pricing').go();
});

test('switching tabs shows term pricing and hides what you get', () => {
  const c = prod({ prodPanel: 'terms' });
  const v = vals(c);
  assert.equal(v.prodPanelTerms, true);
  assert.equal(v.prodPanelGet, false);
});

test('the markup draws the tab row and gates each section', () => {
  assert.match(HTML, /aria-label="Product views"/);
  for (const g of ['prodPanelGet', 'prodPanelTerms', 'prodPanelRuns']) assert.match(HTML, new RegExp(`<sc-if value="\\{\\{ ${g} \\}\\}"`), g);
});
