// Freeze every state of both journeys and the portal pages into import-ready HTML with a reference PNG
// (2026-10-12, Micah: "Transfer the full flow to figma files"). Transcribe, never generate: each board is the DOM the
// running app painted, with the stylesheet inlined, every asset URL made absolute to the live site, scripts removed and
// animations stilled, so html.to.design imports it pixel for pixel. Layers are named by aria-label, as the earlier
// hand-off did. Headless only; never touches Micah's browser.
//
// Usage: node scripts/figma-handoff/freeze.mjs [--only storefront|portal|pages] [--out docs/figma-handoff/captures]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import('file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), ORIGIN = 'http://naas.fold';
const LIVE = 'https://socraticstatic.github.io/ai-grade-network/';
const args = process.argv.slice(2), opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const OUT = join(ROOT, opt('--out', 'docs/figma-handoff/captures')), only = opt('--only', '');
await mkdir(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const css = await readFile(join(ROOT, 'storefront.css'), 'utf8');
const browser = await chromium.launch();
const index = [];
async function page(theme) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route('**/*', async (route) => { const u = new URL(route.request().url()); if (u.origin !== ORIGIN) return route.abort();
    try { const body = await readFile(join(ROOT, decodeURIComponent(u.pathname))); return route.fulfill({ status: 200, body, headers: { 'content-type': TYPES[extname(u.pathname)] || 'application/octet-stream' } }); } catch { return route.fulfill({ status: 404, body: '' }); } });
  return ctx.newPage();
}
// The frozen document: the painted DOM, stylesheet inline, assets absolute, no scripts, no motion.
async function freeze(p, slug, title) {
  await p.waitForTimeout(350);
  const html = await p.evaluate(({ css, live }) => {
    const doc = document.documentElement.cloneNode(true);
    doc.querySelectorAll('script, x-dc > template, link[rel="stylesheet"], [data-version-pill]').forEach(e => e.tagName === 'BODY' ? e.removeAttribute('data-version-pill') : e.remove());
    const style = document.createElement('style'); style.textContent = css.replace(/url\((['"]?)(?!https?:|data:)\.?\/?/g, `url($1${live}`) + '\n*,*::before,*::after{animation:none!important;transition:none!important}';
    doc.querySelector('head').appendChild(style);
    for (const e of doc.querySelectorAll('[style]')) e.setAttribute('style', e.getAttribute('style').replace(/url\((['"]?)(?!https?:|data:)\.?\/?/g, `url($1${live}`));
    for (const e of doc.querySelectorAll('img[src], [src]')) { const s = e.getAttribute('src'); if (s && !/^(https?:|data:)/.test(s)) e.setAttribute('src', live + s.replace(/^\.?\//, '')); }
    return '<!doctype html>\n' + doc.outerHTML;
  }, { css, live: LIVE });
  await writeFile(join(OUT, `${slug}.html`), html);
  await p.screenshot({ path: join(OUT, `${slug}.png`) });
  index.push({ slug, title, html: `${slug}.html`, png: `${slug}.png` });
  console.log('froze', slug);
}
const settle = (p, ms = 500) => p.waitForTimeout(ms);
try {
  if (!only || only === 'storefront') {
    const p = await page();
    await p.goto(`${ORIGIN}/NaaS%20Storefront.dc.html?journey=existing`, { waitUntil: 'networkidle' }); await settle(p, 1000);
    const beats = ['today', 'source', 'found', 'intent', 'recommend', 'connect', 'watch', 'protect', 'save'];
    let n = 0;
    for (let i = 0; i < 16; i++) {
      const beat = await p.locator('section.js').getAttribute('data-beat');
      const seen = index.some(x => x.slug === `storefront-journey-${String(beats.indexOf(beat) + 1).padStart(2, '0')}-${beat}`);
      if (!seen) { n += 1; await freeze(p, `storefront-journey-${String(beats.indexOf(beat) + 1).padStart(2, '0')}-${beat}`, `Journey · ${beat}`);
        if (beat === 'recommend') { await p.locator('.js-deeper').click(); await settle(p, 700); await freeze(p, 'storefront-journey-05b-recommend-why', 'Journey · recommend · Why'); await p.locator('.js-whyp-x, .js-deeper').first().click(); await settle(p); } }
      if (beat === 'save') break;
      const go = p.locator('.js-go'); if (await go.isDisabled()) break;
      await go.click(); await settle(p, beat === 'source' ? 3600 : 700);
    }
    await p.close();
  }
  if (!only || only === 'portal') {
    const p = await page();
    await p.goto(`${ORIGIN}/portal.dc.html?fixture=calloway&state=a`, { waitUntil: 'networkidle' }); await settle(p, 900);
    await p.locator('aside button[aria-label="Connect a cloud"]').click(); await settle(p, 600);
    const beats = ['today', 'source', 'found', 'intent', 'recommend', 'request'];
    for (let i = 0; i < 10; i++) {
      const beat = await p.locator('section.js').getAttribute('data-beat');
      const slug = `portal-journey-${String(beats.indexOf(beat) + 1).padStart(2, '0')}-${beat}`;
      if (!index.some(x => x.slug === slug)) await freeze(p, slug, `Portal journey · ${beat}`);
      if (beat === 'request') break;
      await p.locator('.js-go').click(); await settle(p, beat === 'source' ? 3600 : 700);
    }
    await p.close();
  }
  if (!only || only === 'pages') {
    for (const [fixture, st, tag] of [['calloway', 'a', 'calloway'], ['scale', 'b', 'scale']]) {
      const p = await page();
      for (const key of ['lastmile', 'links', 'discovery', 'recommended']) {
        await p.goto(`${ORIGIN}/portal.dc.html?fixture=${fixture}&state=${st}&page=${key}`, { waitUntil: 'networkidle' }); await settle(p, 900);
        await freeze(p, `portal-page-${key}-${tag}`, `Portal · ${key} · ${tag}`);
      }
      await p.close();
    }
  }
} finally { await browser.close(); }
await writeFile(join(OUT, 'index.json'), JSON.stringify({ frozen: new Date().toISOString(), live: LIVE, boards: index }, null, 2) + '\n');
console.log(`${index.length} boards in ${OUT}`);
