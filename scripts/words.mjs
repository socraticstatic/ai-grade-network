// Words harness (2026-10-07, Micah: "The site as a whole needs less words, more icons").
// One headless walk of every rail page and its in-page tabs, at 1440x900, measuring what a person reads:
//   words  - the words on screen inside <main> (innerText, visible elements only)
//   glyphs - the marks on screen: AT&T icons (.ic), icon tiles, provider marks, path strips' nodes
//   prose  - text blocks of 9 words or more (a sentence someone has to read), with the longest few quoted
// Headless only; files are served from this repo through page.route, so no dev server runs.
//
// Usage: node scripts/words.mjs [--estates partial,mature] [--pages connect,observe] [--top 3] [--json out.json]
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PW = 'file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'http://naas.words';
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const estates = opt('--estates', 'partial').split(',');
const pages = (opt('--pages', '') || '').split(',').filter(Boolean).map(s => s.toLowerCase());
const TOP = +opt('--top', '3');
const jsonOut = opt('--json', null);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf' };
async function serve(route) {
  const url = new URL(route.request().url());
  if (url.origin !== ORIGIN) return route.abort();
  const path = join(ROOT, decodeURIComponent(url.pathname));
  try { return route.fulfill({ status: 200, body: await readFile(path), headers: { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' } }); }
  catch { return route.fulfill({ status: 404, body: 'not found' }); }
}

// Runs in the page.
function measure() {
  const main = document.querySelector('main') || document.body;
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0; };
  const words = (main.innerText || '').split(/\s+/).filter(w => /[A-Za-z0-9$%]/.test(w)).length;
  const glyphs = [...main.querySelectorAll('.ic, .way-logo, [style*="brand/providers"], .ps i')].filter(vis).length;
  const prose = [];
  for (const el of main.querySelectorAll('*')) {
    if (!vis(el)) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim();
    const full = (el.innerText || '').trim();
    // A block whose own text is a sentence, or a leaf whose whole text is.
    const t = own.split(/\s+/).length >= 9 ? full : el.children.length === 0 ? full : '';
    const n = t ? t.split(/\s+/).length : 0;
    if (n >= 9) prose.push({ n, t: t.replace(/\s+/g, ' ').slice(0, 90) });
  }
  const seen = new Set();
  const uniq = prose.filter(p => (seen.has(p.t) ? false : (seen.add(p.t), true))).sort((a, b) => b.n - a.n);
  return { words, glyphs, prose: uniq.length, proseWords: uniq.reduce((a, p) => a + p.n, 0), longest: uniq.slice(0, 6) };
}
function railLinks() {
  const out = []; let group = 'home';
  const rail = document.querySelector('.rail-scroll'); if (!rail) return out;
  for (const b of rail.querySelectorAll('button')) { const lab = b.getAttribute('aria-label'); if (!lab) { group = (b.textContent || '').trim().toLowerCase(); continue; } out.push({ group, label: lab }); }
  return out;
}
function tabLabels() {
  return [...document.querySelectorAll('main [role="tab"]')].filter(t => t.getBoundingClientRect().width > 0 && !t.closest('[aria-label="Signals for"]')).map(t => (t.getAttribute('aria-label') || t.textContent || '').trim()).filter(Boolean);
}

const pw = await import(PW);
const browser = await pw.chromium.launch({ headless: true });
const rows = [];
for (const estate of estates) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', serve);
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/NaaS%20Storefront.dc.html?view=${estate}`, { waitUntil: 'load' });
  await page.waitForSelector('.rail-scroll', { timeout: 20000 });
  await page.waitForTimeout(400);
  const links = (await page.evaluate(railLinks)).filter(l => !pages.length || pages.includes(l.group) || pages.includes(l.label.toLowerCase()));
  for (const l of links) {
    await page.locator(`.rail-scroll button[aria-label="${l.label}"]`).first().click();
    await page.waitForTimeout(l.group === 'discover' ? 3600 : 350);
    const tabs = await page.evaluate(tabLabels);
    const top = [...new Set(tabs)].slice(0, 6);
    const doIt = async (tab) => { const m = await page.evaluate(measure); rows.push({ estate, page: `${l.group}/${l.label}`, tab, ...m }); };
    await doIt('(landing)');
    for (const t of top) {
      const loc = page.locator('main [role="tab"]:visible', { hasText: t }).first();
      if (!(await loc.count())) continue;
      await loc.click().catch(() => {}); await page.waitForTimeout(300);
      await doIt(t);
    }
  }
  await ctx.close();
}
await browser.close();
rows.sort((a, b) => b.words - a.words);
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('words', 6), pad('glyphs', 7), pad('prose', 6), 'page > tab');
for (const r of rows) {
  console.log(pad(r.words, 6), pad(r.glyphs, 7), pad(r.prose, 6), `${r.estate} ${r.page} > ${r.tab}`);
  for (const p of r.longest.slice(0, TOP)) console.log(`${' '.repeat(22)}${p.n}w  ${p.t}`);
}
const tot = rows.reduce((a, r) => ({ words: a.words + r.words, glyphs: a.glyphs + r.glyphs, prose: a.prose + r.prose }), { words: 0, glyphs: 0, prose: 0 });
console.log(`\n${rows.length} views · ${tot.words} words · ${tot.glyphs} glyphs · ${tot.prose} prose blocks · ${(tot.words / Math.max(1, tot.glyphs)).toFixed(2)} words per glyph`);
if (jsonOut) await writeFile(jsonOut, JSON.stringify(rows, null, 1));
