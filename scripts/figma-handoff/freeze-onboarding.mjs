// Freeze the onboarding tour into import-ready boards for html.to.design: transcribe, never generate.
// Each board is the DOM the tour painted at 1440x900 with motion reduced, so every animation sits on its last frame.
// The tour starts many elements hidden and lets an animation reveal them, so the finished value of every animated
// property is written inline before motion is stilled. Conic rings (which the importer turns into soft fades) become
// pixels from the same render. Fonts go by the name Figma knows (ATT Aleck Sans); scripts go.
// Usage: node scripts/figma-handoff/freeze-onboarding.mjs docs/figma-handoff/import-v3 docs/figma-handoff/captures-v3-onboarding
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
const { chromium } = await import('file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs');
const ROOT = '/Users/micahbos/Developer/cloud-connect', ORIGIN = 'http://naas.demo';
const [OUT, REFS] = process.argv.slice(2);
await mkdir(OUT, { recursive: true }); await mkdir(REFS, { recursive: true });
const LIVE = 'https://socraticstatic.github.io/ai-grade-network/';
const FONTS = [400, 500, 700].map((w, i) => `@font-face{font-family:'ATT Aleck Sans';src:url('${LIVE}fonts/ATTAleckSans_${['Regular', 'Medium', 'Bold'][i]}.woff2') format('woff2');font-weight:${w}}`).join('');
const STATES = [
  [0, '', 'Onboarding 01 Welcome v3'], [1, '', 'Onboarding 02 Scan permissions v3'], [2, '', 'Onboarding 03 Discover v3'],
  [3, '', 'Onboarding 04 Connect v3'], [4, '', 'Onboarding 05 Observe v3'], [5, '', 'Onboarding 06 Govern v3'],
  [6, '', 'Onboarding 07 Cost v3'], [7, '', 'Onboarding 08 Ready v3'],
  [7, '[data-journey]', 'Onboarding 09 Guided opens v3'], [7, '[data-api]', 'Onboarding 10 API opens v3'], [7, '[data-dash]', 'Onboarding 11 Dashboard v3']];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
await ctx.route('**/*', async r => { const u = new URL(r.request().url()); if (u.origin !== ORIGIN) return r.abort();
  try { return r.fulfill({ status: 200, body: await readFile(join(ROOT, decodeURIComponent(u.pathname))), headers: { 'content-type': extname(u.pathname) === '.html' ? 'text/html' : 'application/octet-stream' } }); } catch { return r.fulfill({ status: 404, body: '' }); } });
const p = await ctx.newPage();
const index = [];
for (const [step, click, title] of STATES) {
  await p.goto('about:blank'); await p.goto(`${ORIGIN}/docs/onboarding-mock/index.html?still#${step}`); await p.waitForTimeout(900);
  if (click) { await p.click(click); await p.waitForTimeout(700); }
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
  await p.screenshot({ path: join(REFS, slug + '.png') });
  // Gradients the importer cannot draw (conic rings, the panel's repeating dot grid): mark them and take their pixels
  // from this very render, with their own content hidden so only the background is photographed.
  const rings = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); if (!/(conic|radial)-gradient/.test(c.backgroundImage)) return false;
    for (let a = e; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false; } return true; })
    .map((e, i) => { e.setAttribute('data-raster', i); const r = e.getBoundingClientRect(); return { i, x: r.left, y: r.top, w: r.width, h: r.height }; }).filter(r => r.w > 0 && r.h > 0));
  const shots = {};
  for (const r of rings) {
    await p.evaluate((i) => { const e = document.querySelector(`[data-raster="${i}"]`); for (const k of e.children) { k.dataset.vis = k.style.visibility; k.style.visibility = 'hidden'; } }, r.i);
    shots[r.i] = 'data:image/png;base64,' + (await p.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } })).toString('base64');
    await p.evaluate((i) => { const e = document.querySelector(`[data-raster="${i}"]`); for (const k of e.children) { k.style.visibility = k.dataset.vis || ''; delete k.dataset.vis; } }, r.i);
  }
  await p.waitForTimeout(200);   // let the restored visibility settle before anything is read
  const html = await p.evaluate(({ shots, title, FONTS }) => {
    document.title = title;
    // Finished values, written inline, for everything an animation moved.
    const PROPS = ['opacity', 'transform', 'translate', 'scale', 'rotate', 'filter', 'clip-path', 'background-color', 'background-image', 'color',
      'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'box-shadow', 'stroke-dasharray', 'stroke-dashoffset', 'width', 'height'];
    for (const e of document.querySelectorAll('body *')) { const c = getComputedStyle(e); if (c.animationName === 'none' || /^(none\s*,?\s*)+$/.test(c.animationName)) continue;
      for (const k of PROPS) { const v = c.getPropertyValue(k); if (k === 'width' || k === 'height') { if (!/^(I|SPAN)$/.test(e.tagName) || e.closest('.ic')) continue; } e.style.setProperty(k, v); } }
    // Bars and fills sized by a transition (the progress bar, the meters) keep their rendered width.
    for (const e of document.querySelectorAll('.progress .bar i, .mt i')) e.style.width = getComputedStyle(e).width;
    // Rasterised rings.
    for (const e of document.querySelectorAll('[data-raster]')) { const src = shots[e.getAttribute('data-raster')]; if (!src) continue;
      e.style.setProperty('background', `url(${src}) 0 0 / 100% 100% no-repeat`, 'important'); e.style.setProperty('-webkit-mask', 'none', 'important'); e.style.setProperty('mask', 'none', 'important');
      e.removeAttribute('data-raster'); }
    // Human layer names (html.to.design reads aria-label).
    const txt = (e) => (e && e.textContent ? e.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 48);
    const NAMES = [['header', () => 'Header'], ['#left', () => 'Copy'], ['.panel', () => 'Panel'], ['.stage', () => 'Picture'], ['.roads', () => 'Routes'],
      ['.bp-sites', () => 'Your sites'], ['.bp-clouds', () => 'Your clouds'], ['.bp-e1', () => 'Stop: Site link'], ['.bp-c', () => 'Stop: Backbone'], ['.bp-e2', () => 'Stop: Cloud on-ramp'],
      ['.inet', () => 'Public internet'], ['.att-title', () => 'AT&T network'], ['.net-title', () => 'Public internet label'], ['.ctable', () => 'Comparison'], ['.ct-h', () => 'Comparison head'],
      ['.ct-row', (e) => `Row: ${txt(e.querySelector('.ct-k'))}`], ['.keys', () => 'Legend'], ['.band', () => 'Detail band'], ['.bc', (e) => `Card: ${txt(e.querySelector('.bh, .tagc'))}`],
      ['.way', (e) => `Way: ${txt(e.querySelector('.nm'))}`], ['.card', (e) => `Feature: ${txt(e.querySelector('h4'))}`], ['.thumb', () => 'Thumbnail'], ['.wi', (e) => `Way in: ${txt(e.querySelector('h3'))}`],
      ['.vrow', (e) => `Row: ${txt(e.querySelector('b'))}`], ['.term', (e) => `Term: ${txt(e.querySelector('b'))}`], ['.journey', () => 'Journey'], ['.journey span', (e) => `Chip: ${txt(e)}`],
      ['.eyebrow', () => 'Eyebrow'], ['h2', () => 'Headline'], ['.lead', () => 'Lead'], ['.actions', () => 'Actions'], ['.btn, button', (e) => `Button: ${txt(e)}`], ['.progress', () => 'Progress'],
      ['.end-card', () => 'Ending'], ['.code', () => 'Code'], ['.ic', () => 'Icon'], ['svg', () => 'Drawing']];
    const seen = new Set();
    for (const [sel, fn] of NAMES) for (const e of document.querySelectorAll(sel)) { if (seen.has(e)) continue; seen.add(e); e.setAttribute('aria-label', fn(e)); }
    for (const e of document.querySelectorAll('div, span, b, small, p, h3, h4, em, strong')) { if (seen.has(e) || e.getAttribute('aria-label') || e.children.length) continue; const t = txt(e); if (t) e.setAttribute('aria-label', t); }
    const doc = document.documentElement.cloneNode(true);
    doc.querySelectorAll('script').forEach(e => e.remove());
    for (const s of doc.querySelectorAll('style')) s.textContent = s.textContent.replace(/@font-face\s*\{[^}]*\}/g, '').replace(/'Aleck'/g, "'ATT Aleck Sans'");
    const head = doc.querySelector('head');
    const f = document.createElement('style'); f.id = 'fonts'; f.textContent = FONTS; head.prepend(f);
    const still = document.createElement('style'); still.id = 'still'; still.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}html{view-transition-name:none}';
    const nos = document.createElement('style'); nos.id = 'noshrink-labels'; nos.textContent = 'b,small,strong,em,i,label,legend,figcaption,span>b{flex-shrink:0}';
    head.append(still, nos);
    doc.querySelectorAll('title').forEach(e => e.remove()); const tt = document.createElement('title'); tt.textContent = title; head.prepend(tt);
    return '<!doctype html>\n' + doc.outerHTML;
  }, { shots, title, FONTS });
  await writeFile(join(OUT, title + '.html'), html);
  index.push({ slug, title, rings: rings.length, kb: Math.round(html.length / 1024) });
  console.log(title, `${rings.length} rings`, Math.round(html.length / 1024) + 'KB');
}
await writeFile(join(REFS, 'index.json'), JSON.stringify(index, null, 1));
await b.close();
