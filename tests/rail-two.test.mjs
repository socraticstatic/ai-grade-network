import test from 'node:test';
import assert from 'node:assert/strict';
import { SUB_PANELS } from '../naas-app.js';




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
