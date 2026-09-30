// Fold harness (2026-09-30). One headless walk of every rail page and every
// in-page tab, on every estate, in light and dark, at 1440x900.
//
// It checks the three standing rulings:
//   - no page scroll: document.documentElement.scrollHeight <= 900
//     (dashboard-fits-the-fold, 2026-09-28);
//   - nothing boxed: no element that scrolls its own overflow
//     (nothing-boxed, 2026-09-29), except the allowlist below;
//   - no button within 10px of its card's padding box.
//
// Headless only. It never opens a window and never touches Micah's Comet or
// Chrome (verification-is-headless, 2026-09-19). Files are served from this
// repo through page.route, so no dev server runs. index.html is never loaded:
// its meta-refresh strips ?view=.
//
// Usage:
//   node scripts/fold.mjs [--estates partial,mature,trust,small,empty]
//                         [--pages observe,cost] [--theme light|dark|both]
//                         [--shots <dir>] [--quiet]
// --pages matches a rail group title (Discover, Connect, Observe, Govern,
// Cost) or a rail link label, case-insensitive. Exit 1 on any FAIL.
//
// Playwright is not a dependency of this repo; it is imported from a sibling
// checkout. Change PW if that path moves.
//
// Baseline at e7298bf (2026-09-30): 274 checks across 5 estates x light/dark,
// 0 FAIL. BASELINE is empty; any FAIL is new. FOLD_LIMIT=850 proves the
// scroll check bites (every page then fails).

import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PW = 'file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'http://naas.fold';
const W = 1440, H = 900, EDGE = 10;
const LIMIT = +(process.env.FOLD_LIMIT || H); // lower it to prove the check bites

// Scrolling regions that are allowed to scroll: the rail (it scrolls silently
// on screens shorter than 900), Andi's dock, and the detail overlays.
const ALLOW = ['.rail-scroll', '[data-fold-allow]', '[role="dialog"]', 'aside[aria-label*="Andi"]'];

// Lines that already failed at e7298bf: none.
export const BASELINE = [];

const args = process.argv.slice(2);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const estates = opt('--estates', 'partial,mature,trust,small,empty').split(',');
const pages = (opt('--pages', '') || '').split(',').filter(Boolean).map(s => s.toLowerCase());
const theme = opt('--theme', 'both');
const themes = theme === 'both' ? ['light', 'dark'] : [theme];
const shots = opt('--shots', null);
const quiet = args.includes('--quiet');
if (shots) await mkdir(shots, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf' };

async function serve(route) {
  const url = new URL(route.request().url());
  if (url.origin !== ORIGIN) return route.abort();
  const path = join(ROOT, decodeURIComponent(url.pathname));
  try {
    const body = await readFile(path);
    return route.fulfill({ status: 200, body, headers: { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' } });
  } catch (e) {
    return route.fulfill({ status: 404, body: 'not found' });
  }
}

// Runs in the page: the three checks.
function measure({ allow, edge }) {
  const say = (el) => {
    const id = el.id ? '#' + el.id : '';
    const lab = el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : '';
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.split(/\s+/)[0] : '';
    return `${el.tagName.toLowerCase()}${id}${cls}${lab}`;
  };
  const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const scrollHeight = document.documentElement.scrollHeight;
  const boxed = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (!/(auto|scroll)/.test(cs.overflowY)) continue;
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    if (!shown(el)) continue;
    if (allow.some(sel => el.closest(sel))) continue;
    boxed.push(`${say(el)} ${el.clientHeight}/${el.scrollHeight}`);
  }
  const edges = [];
  for (const b of document.querySelectorAll('.fx-card button')) {
    if (!shown(b)) continue;
    const card = b.closest('.fx-card');
    const r = b.getBoundingClientRect(), c = card.getBoundingClientRect(), cs = getComputedStyle(card);
    const L = c.left + parseFloat(cs.borderLeftWidth), R = c.right - parseFloat(cs.borderRightWidth);
    const T = c.top + parseFloat(cs.borderTopWidth), B = c.bottom - parseFloat(cs.borderBottomWidth);
    const d = Math.min(r.left - L, R - r.right, r.top - T, B - r.bottom);
    if (d < edge) edges.push(`${(b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 32)} ${d.toFixed(1)}px`);
  }
  return { scrollHeight, boxed, edges };
}

// Runs in the page: the rail, as [{ group, label }].
function railLinks() {
  const out = [];
  let group = 'home';
  const rail = document.querySelector('.rail-scroll');
  if (!rail) return out;
  for (const b of rail.querySelectorAll('button')) {
    const lab = b.getAttribute('aria-label');
    if (!lab) { group = (b.textContent || '').trim().toLowerCase(); continue; }
    out.push({ group, label: lab });
  }
  return out;
}

// Runs in the page: the tabs on screen outside the rail.
function tabLabels() {
  return [...document.querySelectorAll('[role="tab"]')]
    .filter(t => !t.closest('.rail-scroll') && t.getBoundingClientRect().width > 0)
    .map(t => (t.getAttribute('aria-label') || t.textContent || '').trim())
    .filter(Boolean);
}

const settle = (page) => page.waitForTimeout(260);

async function clickRail(page, label) {
  const b = page.locator(`.rail-scroll button[aria-label="${label.replace(/"/g, '\\"')}"]`).first();
  if (!(await b.count())) return false;
  await b.click();
  await settle(page);
  return true;
}

async function clickTab(page, label) {
  const tabs = page.locator('[role="tab"]:visible');
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    const t = tabs.nth(i);
    const inRail = await t.evaluate(el => !!el.closest('.rail-scroll'));
    if (inRail) continue;
    const txt = ((await t.getAttribute('aria-label')) || (await t.textContent()) || '').trim();
    if (txt === label) { await t.click(); await settle(page); return true; }
  }
  return false;
}

const pw = await import(PW);
const browser = await pw.chromium.launch({ headless: true });
const lines = [];
let fails = 0;

function report(estate, th, page, tab, m, errors) {
  const bad = [];
  if (m.scrollHeight > LIMIT) bad.push(`scroll ${m.scrollHeight}`);
  if (m.boxed.length) bad.push(`boxed ${m.boxed.join(', ')}`);
  if (m.edges.length) bad.push(`edge ${m.edges.join(', ')}`);
  if (errors.length) bad.push(`console ${errors.slice(0, 2).join(' | ')}`);
  const key = `${estate} ${th} ${page} > ${tab}`;
  const base = BASELINE.includes(key);
  const status = bad.length ? (base ? 'BASE' : 'FAIL') : 'PASS';
  if (status === 'FAIL') fails++;
  const line = `${status} ${key} · ${m.scrollHeight}${bad.length ? ' · ' + bad.join(' · ') : ''}`;
  lines.push(line);
  if (!quiet || status !== 'PASS') console.log(line);
}

try {
  for (const estate of estates) {
    for (const th of themes) {
      const ctx = await browser.newContext({ viewport: { width: W, height: H } });
      await ctx.route('**/*', serve);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`${ORIGIN}/NaaS%20Storefront.dc.html?view=${estate}`, { waitUntil: 'load' });
      await page.waitForSelector('.rail-scroll', { timeout: 20000 });
      await settle(page);
      if (th === 'dark') {
        const t = page.locator('button[aria-label="Toggle theme"]').first();
        if (await t.count()) { await t.click(); await settle(page); }
      }
      const links = await page.evaluate(railLinks);
      const want = links.filter(l => !pages.length || pages.includes(l.group) || pages.includes(l.label.toLowerCase()));
      for (const l of want) {
        if (!(await clickRail(page, l.label))) continue;
        // Discover runs its scan on arrival (four 750ms steps, naas-app.js startScan);
        // the tabs render only once it lands.
        if (l.group === 'discover') await page.waitForTimeout(3600);
        const pageName = `${l.group}/${l.label}`;
        const seen = new Set();
        const walk = async (depth, trail) => {
          errors.length = 0;
          const m = await page.evaluate(measure, { allow: ALLOW, edge: EDGE });
          report(estate, th, pageName, trail || '(landing)', m, errors);
          if (shots) await page.screenshot({ path: join(shots, `${estate}-${th}-${pageName}-${trail || 'landing'}`.replace(/[^\w.-]+/g, '_') + '.png') });
          if (depth >= 2) return;
          const tabs = (await page.evaluate(tabLabels)).filter(t => !seen.has(t));
          tabs.forEach(t => seen.add(t));
          for (const t of tabs) {
            if (!(await clickTab(page, t))) continue;
            await walk(depth + 1, trail ? `${trail} > ${t}` : t);
          }
        };
        await walk(0, '');
        await clickRail(page, l.label);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`${lines.length} checked · ${fails} FAIL · ${lines.filter(l => l.startsWith('BASE')).length} baseline`);
process.exit(fails ? 1 : 0);
