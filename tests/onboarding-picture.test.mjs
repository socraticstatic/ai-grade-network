// The tour's picture: the AT&T backbone node carries the AT&T globe, not a
// generic hub glyph (Micah, 2026-10-16: "replace the 'backbone' logo with the
// at&t globe"). The tour is frozen and self-contained, so the globe rides
// inline like every other mark in it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PW = 'file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs';
const PAGE = new URL('../docs/onboarding-mock/index.html', import.meta.url).href;
const GLOBE = readFileSync(new URL('../brand/att-globe.svg', import.meta.url));

const { chromium } = await import(PW);
const browser = await chromium.launch();
test.after(() => browser.close());

test('the backbone node shows the AT&T globe, inline, at the node size', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`${PAGE}?still#0`);
  await page.waitForSelector('.bp-c .nd');
  const nd = await page.$eval('.bp-c .nd', e => {
    const img = e.querySelector('img'), r = e.getBoundingClientRect();
    return { hasImg: !!img, src: img ? img.getAttribute('src') : '', hasGlyph: !!e.querySelector('.ic'), w: Math.round(r.width), h: Math.round(r.height),
      imgW: img ? Math.round(img.getBoundingClientRect().width) : 0, label: e.parentElement.textContent.trim() };
  });
  assert.ok(nd.hasImg, 'no image in the backbone node');
  assert.equal(nd.hasGlyph, false, 'the hub glyph is still there');
  assert.match(nd.src, /^data:image\/svg\+xml/, 'the globe is not inline');
  assert.equal(Buffer.from(nd.src.split(',')[1], 'base64').toString(), GLOBE.toString(), 'the inline globe is not brand/att-globe.svg');
  assert.ok(nd.imgW >= 24 && nd.imgW <= nd.w, `the globe draws at ${nd.imgW}px in a ${nd.w}px node`);
  assert.match(nd.label, /Backbone/);
  // The other two nodes keep their glyphs.
  assert.ok(await page.$('.bp-e1 .nd .ic'), 'the site-link node lost its glyph');
  assert.ok(await page.$('.bp-e2 .nd .ic'), 'the on-ramp node lost its glyph');
  await page.close();
});
