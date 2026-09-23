import test from 'node:test';
import assert from 'node:assert/strict';
import { vals, SUB_PANELS, SECTIONS } from '../naas-app.js';
import { mkC } from './harness.mjs';

if (typeof globalThis.window === 'undefined') {
  globalThis.window = { scrollTo: () => {}, scrollY: 0 };
}

const PAGES = ['discover', 'connect', 'observe', 'govern', 'cost'];

test('no group offers more than two links', () => {
  for (const page of PAGES) {
    const links = SECTIONS[page] || [];
    assert.ok(links.length <= 2, `${page} still offers ${links.length} links: ${links.map(l => l[1]).join(', ')}`);
    assert.ok(links.length > 0, `${page} offers none`);
  }
});

test('every page that declares sub-content declares it the same way', () => {
  for (const [page, panels] of Object.entries(SUB_PANELS)) {
    assert.ok(Array.isArray(panels) && panels.length > 0, `${page} declares no panels`);
    for (const p of panels) {
      assert.ok(p.key && p.label, `${page} has an incomplete panel`);
      assert.ok(p.sec === undefined || typeof p.sec === 'string', `${page}:${p.key} has a bad section id`);
    }
    const keys = panels.map(p => p.key);
    assert.equal(new Set(keys).size, keys.length, `${page} declares a duplicate panel key`);
  }
});

test('a rail link either names a panel on its own page or leaves for a screen', () => {
  for (const page of PAGES) {
    for (const [id, label] of SECTIONS[page] || []) {
      if (id.startsWith('@')) continue;               // a view on the inventory
      if (id.startsWith('sec-')) continue;            // an anchor on the page itself
      const panel = (SUB_PANELS[page] || []).find(p => p.key === id);
      assert.ok(panel, `${page} link "${label}" points at ${id}, which is neither a screen, an anchor, nor a panel`);
    }
  }
});



test('the six links that left have a home in the layer', () => {
  const homed = {
    observe: ['insights', 'logs'],
    govern: ['templates'],
    cost: ['forecast', 'charges'],
  };
  for (const [page, keys] of Object.entries(homed)) {
    for (const k of keys) {
      assert.ok((SUB_PANELS[page] || []).some(p => p.key === k), `${page} has no ${k} panel`);
    }
  }
});

test('every panel that names a section names one the markup carries', async () => {
  const { readFileSync } = await import('node:fs');
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  for (const [page, panels] of Object.entries(SUB_PANELS)) {
    for (const p of panels) {
      if (!p.sec) continue;
      assert.ok(HTML.includes(`id="${p.sec}"`), `${page}:${p.key} points at ${p.sec}, which the markup does not have`);
    }
  }
});
