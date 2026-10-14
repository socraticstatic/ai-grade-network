// Freeze every state of both journeys and the portal pages into import-ready HTML with a reference PNG
// (2026-10-12, Micah: "Transfer the full flow to figma files"). Transcribe, never generate: each board is the DOM the
// running app painted, with the stylesheet inlined, every asset URL made absolute to the live site, scripts removed and
// animations stilled, so html.to.design imports it pixel for pixel. Layers are named by aria-label, as the earlier
// hand-off did. Headless only; never touches Micah's browser.
//
// Usage: node scripts/figma-handoff/freeze.mjs [--only storefront|portal|pages|site] [--out docs/figma-handoff/captures]
//          [--version v2] [--keys home,discover-estate,...]
// --version (2026-10-14, Micah: "name them like the original, but with a version number"): every board keeps its original
// title with the version after it ("Discover Estate v2", "Discover Estate Dark v2") and its slug gains the same suffix, so a
// new version sits beside the boards it replaces and never overwrites them. --keys freezes only the listed site pages
// ("just the updated pages").
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import('file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), ORIGIN = 'http://naas.fold';
const LIVE = 'https://socraticstatic.github.io/ai-grade-network/';
const args = process.argv.slice(2), opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const OUT = join(ROOT, opt('--out', 'docs/figma-handoff/captures')), only = opt('--only', '');
const VERSION = opt('--version', ''), KEYS = opt('--keys', '') ? new Set(opt('--keys', '').split(',').map(k => k.trim()).filter(Boolean)) : null;
// Both themes (Micah, 2026-10-12: "as well as dark mode"): a dark board carries -dark in its slug.
const THEMES = (opt('--theme', 'both') === 'both' ? ['light', 'dark'] : [opt('--theme', 'light')]);
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
// The beats' words for titles and layer names.
const BEAT_WORD = { today: 'Today', source: 'Source', found: 'Found', intent: 'Needs', recommend: 'Recommend', connect: 'Connect', watch: 'Live', protect: 'Protect', save: 'Save', request: 'Request' };
async function freeze(p, slug, title) {
  if (VERSION) { slug = `${slug}-${VERSION}`; title = `${title} ${VERSION}`; }
  await p.waitForTimeout(350);
  const html = await p.evaluate(({ css, live, title }) => {
    // The frame takes the page title; every layer takes a human name (html.to.design reads aria-label), so the file
    // reads Header, Rail, Stage, Your circuits, Wire: Last mile, Row: Branch O, Tile: Circuits, not div and span.
    document.title = title;
    const txt = (e) => (e && e.textContent ? e.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 48);
    const iconOf = (e) => { const m = /brand\/icons[^/]*\/([a-z0-9-]+)\.svg/.exec(e.getAttribute('style') || ''); return m ? m[1] : ''; };
    const RULES = [
      ['header', () => 'Header'], ['nav[aria-label="Products"]', () => 'Products'], ['aside', () => 'Rail'], ['main', () => 'Page'],
      ['section.js', () => 'Journey stage'], ['ol.js-steps', () => 'Stepper'], ['.js-steps li', (e) => `Step ${txt(e.querySelector('i'))} ${txt(e.querySelector('button > span'))}`], ['h1.js-line', (e) => `Headline: ${txt(e)}`], ['h1', (e) => `Title: ${txt(e)}`],
      ['.js-body', () => 'Stage body'], ['.js-stage', () => 'Stage'], ['.js-node.js-sites', (e) => `${txt(e.querySelector('.js-cap')) || 'Your sites'}`], ['.js-node.js-att', () => 'AT&T network'], ['.js-node.js-cloud', () => 'Your cloud'],
      ['.js-wire', (e) => `Wire: ${txt(e.querySelector('small')) || 'proposed'}`], ['.js-net', (e) => txt(e.querySelector('small')) || 'Outside the AT&T network'], ['.js-sitegrid', () => 'Site glyphs'], ['.js-svc', () => 'Services'],
      ['.js-provs', () => 'Clouds'], ['.js-scan', () => 'Scan steps'], ['.js-cloudhead', () => 'Cloud head'], ['.js-regions', () => 'Regions'], ['.js-region', (e) => `Region: ${txt(e.querySelector('b'))}`], ['.js-rhead', () => 'Region head'],
      ['.js-app', (e) => `Workload: ${txt(e.querySelector('span:not(.ic):not(.js-tags)'))}`], ['.js-tags', () => 'Tags'], ['.po-rtags', () => 'Region tags'], ['.po-needs', () => 'What it needs'], ['.js-needs', () => 'What it needs'],
      ['.po-nq, .js-nq', (e) => `Question: ${txt(e.querySelector('.po-ns, .js-ns'))}`], ['.po-opts, .js-nopts', () => 'Answers'], ['.po-opt, .js-no, .js-io', (e) => `Answer: ${txt(e)}`], ['.po-copy', (e) => txt(e)],
      ['.js-intent', () => 'What it needs'], ['.js-iq', (e) => `Question: ${txt(e.querySelector('.js-cap'))}`], ['.js-opts', () => 'Options'], ['.js-opt', (e) => `Option: ${txt(e.querySelector('.js-opt-t b'))}`], ['.js-score', (e) => `Score: ${txt(e)}`],
      ['.js-why', () => 'Why chips'], ['.js-wchip', (e) => `Chip: ${txt(e)}`], ['.js-whyp', () => 'Why panel'], ['.js-whyp-a', () => 'Score and weights'], ['.js-whyp-b', () => 'Because you said'], ['.js-whyp-c', () => 'What you get'],
      ['.js-pairs', () => 'Pairs'], ['.js-pair', (e) => `${txt(e.querySelector('.js-said'))} → ${txt(e.querySelector('.js-gets'))}`], ['.js-wbars', () => 'Weighed for you'], ['.js-act', () => 'Actions'], ['.js-go', (e) => `Primary: ${txt(e)}`], ['.js-back', () => 'Back'], ['.js-more', (e) => txt(e)],
      ['.js-order', () => 'Order'], ['.js-sum', () => 'Order summary'], ['.js-phases', () => 'Order phases'], ['.js-deck', () => 'Policy deck'], ['.js-money', () => 'Before and after'], ['.js-done', () => 'Already on AT&T'],
      ['.po-band', () => 'Picture band'], ['.ps', () => 'Path strip'], ['.ps > span', (e) => `Station: ${txt(e.querySelector('b, small'))}`], ['.po-tiles', () => 'Rollups'], ['.po-tile', (e) => `Tile: ${txt(e.querySelector('.po-tl'))} ${txt(e.querySelector('b'))}`],
      ['.po-head', () => 'Page head'], ['.po-trail, .po-crumb', (e) => (e.classList.contains('po-trail') ? 'Trail' : `Crumb: ${txt(e)}`)], ['.dt', (e) => e.getAttribute('aria-label') || 'Table'], ['.dt-h', () => 'Header row'], ['.dt-b', () => 'Rows'],
      ['.dt-r', (e) => `Row: ${txt(e.querySelector('.dt-c'))}`], ['.dt-th', (e) => `Column: ${txt(e)}`], ['.dt-c', (e) => `Cell: ${txt(e)}`], ['.po-pager', () => 'Pager'], ['.po-act', (e) => `Button: ${txt(e)}`], ['.po-mark, .js-mark', () => 'Provider mark'],
      ['.kchip', (e) => `Chip: ${txt(e)}`], ['.js-tag', (e) => `Tag: ${txt(e)}`], ['.rail-scroll', () => 'Rail items'], ['aside button[data-page]', (e) => `Rail: ${txt(e)}`], ['.hdr-cust', (e) => `Button: ${txt(e)}`], ['.po-synth', (e) => txt(e)],
      ['select', (e) => `Select: ${e.getAttribute('aria-label') || txt(e.selectedOptions[0])}`], ['label', (e) => e.getAttribute('title') || txt(e)], ['.ic', (e) => `Icon: ${iconOf(e) || 'glyph'}`], ['.js-steps button', (e) => `Step ${txt(e.querySelector('i'))} ${txt(e.querySelector(':scope > span'))}`], ['button', (e) => `Button: ${txt(e) || e.getAttribute('aria-label') || ''}`],
    ];
    const seen = new Set();
    // A name this pass set on an earlier beat is ours to rewrite (data-fn); a name the app gave stays.
    const ours = (e) => e.hasAttribute('data-fn'), put = (e, n) => { if (n && n.trim()) { e.setAttribute('aria-label', n.trim()); e.setAttribute('data-fn', '1'); } };
    for (const [sel, fn] of RULES) for (const e of document.querySelectorAll(sel)) { if (seen.has(e)) continue; seen.add(e); if (e.getAttribute('aria-label') && !ours(e) && !/^(Steps|Where you are)$/.test(e.getAttribute('aria-label'))) continue; put(e, fn(e)); }
    for (const e of document.querySelectorAll('div, span, b, small, p, i, em, strong, a')) { if (seen.has(e) || (e.getAttribute('aria-label') && !ours(e)) || e.children.length) continue; put(e, txt(e)); }
    // A select's chosen option lives in state, not in markup: stamp it so the frozen board shows what the live page showed.
    for (const sel of document.querySelectorAll('select')) { for (const o of sel.options) { if (o.selected) o.setAttribute('selected', ''); else o.removeAttribute('selected'); } }
    const doc = document.documentElement.cloneNode(true);
    // One title, in the head, whatever the runtime did with helmet: the frame takes its name from it.
    doc.querySelectorAll('title, helmet').forEach(e => e.remove()); const tt = document.createElement('title'); tt.textContent = title; doc.querySelector('head').prepend(tt);
    doc.querySelectorAll('script, x-dc > template, link[rel="stylesheet"], [data-version-pill]').forEach(e => e.tagName === 'BODY' ? e.removeAttribute('data-version-pill') : e.remove());
    // The font by the name Figma knows it (the TTF's family name), not the stylesheet's short alias.
    const style = document.createElement('style'); style.textContent = css.replace(/font-family:'Aleck'/g, "font-family:'ATT Aleck Sans'").replace(/url\((['"]?)(?!https?:|data:)\.?\/?/g, `url($1${live}`) + '\n*,*::before,*::after{animation:none!important;transition:none!important}';
    doc.querySelector('head').appendChild(style);
    for (const e of doc.querySelectorAll('[style]')) e.setAttribute('style', e.getAttribute('style').replace(/url\((['"]?)(?!https?:|data:)\.?\/?/g, `url($1${live}`));
    for (const e of doc.querySelectorAll('img[src], [src]')) { const s = e.getAttribute('src'); if (s && !/^(https?:|data:)/.test(s)) e.setAttribute('src', live + s.replace(/^\.?\//, '')); }
    return '<!doctype html>\n' + doc.outerHTML;
  }, { css, live: LIVE, title });
  await writeFile(join(OUT, `${slug}.html`), html);
  // A page Micah let scroll (Ways to connect, 2026-10-13) is frozen whole: the reference shows every section and the
  // index marks it tall, so wrap.mjs keeps its height instead of pinning it to 900.
  // Only the scroll allowance counts (data-fold="scrolls", scripts/fold-rule.mjs); the home's map below the fold was never
  // part of its board, so Home keeps the first screen as the original did.
  const tall = await p.evaluate(() => !!document.querySelector('[data-fold="scrolls"]') && document.documentElement.scrollHeight > 905);
  await p.screenshot({ path: join(OUT, `${slug}.png`), fullPage: tall });
  index.push({ slug, title, html: `${slug}.html`, png: `${slug}.png`, ...(tall ? { tall: true } : {}) });
  console.log('froze', slug);
}
const settle = (p, ms = 500) => p.waitForTimeout(ms);
try {
  for (const theme of THEMES) {
  const T = theme === 'dark' ? '-dark' : '', TT = theme === 'dark' ? ' Dark' : '';
  if (!only || only === 'storefront') {
    const p = await page();
    await p.goto(`${ORIGIN}/NaaS%20Storefront.dc.html?journey=existing&theme=${theme}`, { waitUntil: 'networkidle' }); await settle(p, 1000);
    const beats = ['today', 'source', 'found', 'intent', 'recommend', 'connect', 'watch', 'protect', 'save'];
    let n = 0;
    for (let i = 0; i < 16; i++) {
      const beat = await p.locator('section.js').getAttribute('data-beat');
      const slug = `storefront-journey-${String(beats.indexOf(beat) + 1).padStart(2, '0')}-${beat}${T}`;
      const seen = index.some(x => x.slug === slug);
      if (!seen) { n += 1; await freeze(p, slug, `Journey ${String(beats.indexOf(beat) + 1).padStart(2, '0')} ${BEAT_WORD[beat]}${TT}`);
        if (beat === 'intent') { const rp = p.locator('.js-rpick button'); if (await rp.count() > 1) { await rp.nth(1).click(); await settle(p, 600); const w = (await rp.nth(1).innerText()).trim(); await freeze(p, `storefront-journey-04b-intent-${w}${T}`, `Journey 04b Needs ${w}${TT}`); await rp.nth(0).click(); await settle(p, 500); } }
        if (beat === 'recommend') { await p.locator('.js-deeper').click(); await settle(p, 700); await freeze(p, `storefront-journey-05b-recommend-why${T}`, `Journey 05b Why${TT}`); await p.locator('.js-whyp-x, .js-deeper').first().click(); await settle(p); } }
      if (beat === 'save') break;
      const go = p.locator('.js-go'); if (await go.isDisabled()) break;
      await go.click(); await settle(p, beat === 'source' ? 3600 : 700);
    }
    await p.close();
  }
  if (!only || only === 'portal') {
    const p = await page();
    await p.goto(`${ORIGIN}/portal.dc.html?fixture=calloway&state=a&theme=${theme}`, { waitUntil: 'networkidle' }); await settle(p, 900);
    await p.locator('aside button[aria-label="Connect a cloud"]').click(); await settle(p, 600);
    const beats = ['today', 'source', 'found', 'intent', 'recommend', 'request'];
    for (let i = 0; i < 10; i++) {
      const beat = await p.locator('section.js').getAttribute('data-beat');
      const slug = `portal-journey-${String(beats.indexOf(beat) + 1).padStart(2, '0')}-${beat}${T}`;
      if (!index.some(x => x.slug === slug)) await freeze(p, slug, `Portal journey ${String(beats.indexOf(beat) + 1).padStart(2, '0')} ${BEAT_WORD[beat]}${TT}`);
      if (beat === 'request') break;
      await p.locator('.js-go').click(); await settle(p, beat === 'source' ? 3600 : 700);
    }
    await p.close();
  }
  // The rest of the site (Micah, 2026-10-13: "Take the rest of the site, and do the same"): Home, every rail
  // destination, and the personas page, on the estate the storefront opens on. Not part of the default run.
  if (only === 'site') {
    const SITE = [['Home', 'Home', 'home'], ['Estate', 'Discover Estate', 'discover-estate'], ['Sources', 'Discover Sources', 'discover-sources'],
      ['Connections', 'Connect Connections', 'connect-connections'], ['Recommended', 'Connect Recommended', 'connect-recommended'], ['Ways to connect', 'Connect Ways', 'connect-ways'], ['Orders', 'Connect Orders', 'connect-orders'],
      ['Traffic', 'Observe Traffic', 'observe-traffic'], ['Insights', 'Observe Insights', 'observe-insights'], ['Logs', 'Observe Logs', 'observe-logs'],
      ['Violations', 'Govern Violations', 'govern-violations'], ['Templates', 'Govern Templates', 'govern-templates'],
      ['Optimize', 'Cost Optimize', 'cost-optimize'], ['Spend', 'Cost Spend', 'cost-spend']];
    const p = await page();
    await p.goto(`${ORIGIN}/NaaS%20Storefront.dc.html?view=mature&theme=${theme}`, { waitUntil: 'networkidle' }); await settle(p, 1200);
    if (!KEYS || KEYS.has('home')) await freeze(p, `site-home${T}`, `Home${TT}`);   // the landing is Home; its rail entry is a group title, not a labeled item
    for (const [label, title, key] of SITE.slice(1)) {
      if (KEYS && !KEYS.has(key)) continue;
      const b = p.locator(`aside[aria-label$="sections"] button[aria-label="${label}"]`).first();
      if (!(await b.count())) { console.log('no rail item', label); continue; }
      await b.click(); await settle(p, 1000);
      // Discover scans on arrival (four 750ms steps): wait for the page itself, never the scan skeleton (2026-10-14).
      for (let i = 0; i < 40 && await p.evaluate(() => /Scanning/.test((document.querySelector('main') || document.body).innerText)); i++) await p.waitForTimeout(250);
      await settle(p, 600);
      await freeze(p, `site-${key}${T}`, `${title}${TT}`);
    }
    await p.close();
    if (!KEYS || KEYS.has('personas')) {
      const q = await page();
      await q.goto(`${ORIGIN}/personas.html?theme=${theme}`, { waitUntil: 'networkidle' }); await settle(q, 1000);
      await freeze(q, `site-personas${T}`, `Personas${TT}`);
      await q.close();
    }
  }
  if (!only || only === 'pages') {
    for (const [fixture, st, tag] of [['calloway', 'a', 'calloway'], ['scale', 'b', 'scale']]) {
      const p = await page();
      for (const key of ['lastmile', 'links', 'discovery', 'recommended']) {
        await p.goto(`${ORIGIN}/portal.dc.html?fixture=${fixture}&state=${st}&page=${key}&theme=${theme}`, { waitUntil: 'networkidle' }); await settle(p, 900);
        const PAGE_WORD = { lastmile: 'Last mile', links: 'Cloud connections', discovery: 'Cloud discovery', recommended: 'Recommended' }, EST = { calloway: 'Calloway', scale: 'Bank scale' };
        await freeze(p, `portal-page-${key}-${tag}${T}`, `Portal ${PAGE_WORD[key]} ${EST[tag]}${TT}`);
      }
      await p.close();
    }
  }
  }
} finally { await browser.close(); }
await writeFile(join(OUT, 'index.json'), JSON.stringify({ frozen: new Date().toISOString(), live: LIVE, boards: index }, null, 2) + '\n');
console.log(`${index.length} boards in ${OUT}`);
