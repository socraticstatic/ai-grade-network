// Fold harness (2026-09-30). One headless walk of every rail page and every
// in-page tab, on every estate, in light and dark, at 1440x900.
//
// It checks the standing rulings:
//   - no page scroll: document.documentElement.scrollHeight <= 900
//     (dashboard-fits-the-fold, 2026-09-28), with one exception read from
//     scripts/fold-rule.mjs: the NaaS home may run past 900 by the Connect
//     map below its fold (v2 home, 2026-09-30), and only by it: everything
//     above the map fits 900 and nothing follows the map;
//   - no sideways scroll: scrollWidth <= 1440 ("wide"), and no visible
//     element whose right edge lands past the viewport ("past edge");
//   - nothing boxed: no element that scrolls its own overflow
//     (nothing-boxed, 2026-09-29), except the allowlist below;
//   - no button within 10px of its card's padding box;
//   - no word the Signals panel clips with an ellipsis ("clipped", 2026-09-30),
//     on both of its pages, for every role its chips pick;
//   - the words on screen (body innerText and SVG <text>) carry no em dash
//     and no ramp code (ER, DX, EQX, GCI) where the product has a name
//     ("words", with the snippet around each hit).
//
// After the walk, on every estate with a Sources page, it adds a source
// (Add a source > Oracle > Add and scan) and measures Sources again: the
// added row's Remove button exists only then. --no-add skips that beat.
//
// Headless only. It never opens a window and never touches Micah's Comet or
// Chrome (verification-is-headless, 2026-09-19). Files are served from this
// repo through page.route, so no dev server runs. index.html is never loaded:
// its meta-refresh strips ?view=.
//
// Usage:
//   node scripts/fold.mjs [--estates partial,mature,trust,small,empty]
//                         [--pages observe,cost] [--theme light|dark|both]
//                         [--shots <dir>] [--quiet] [--no-add]
// --pages matches a rail group title (Discover, Connect, Observe, Govern,
// Cost) or a rail link label, case-insensitive. Exit 1 on any FAIL.
//
// Playwright is not a dependency of this repo; it is imported from a sibling
// checkout. Change PW if that path moves.
//
// Baseline at e7298bf (2026-09-30): 274 checks across 5 estates x light/dark,
// 0 FAIL. BASELINE is empty; any FAIL is new. FOLD_LIMIT=850 proves the
// scroll check bites (every page then fails); FOLD_WIDTH=1300 does the same
// for the two width checks. The width and word checks landed at 90f511e with
// 20 FAIL: Sources after Add and scan scrolled to 1474px on four estates in
// both themes (the Remove button), and Traffic > Where it goes and > Paths
// printed em-dash placeholders on three. 422 checks, 0 FAIL, once fixed.
// The v2 home (2026-09-30): 462 checks, 0 FAIL. Empty's home lost its five
// role tabs (one step, nothing to personalize), so 472 became 462.
// FOLD_LIMIT=600 fails every live home on "above the map": the allowance bites.

import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { heightProblems, foldMarks } from './fold-rule.mjs';

const PW = 'file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'http://naas.fold';
const W = 1440, H = 900, EDGE = 10;
const LIMIT = +(process.env.FOLD_LIMIT || H); // lower it to prove the check bites
const WLIMIT = +(process.env.FOLD_WIDTH || W); // the same for the width checks

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
const addBeat = !args.includes('--no-add');
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

// Runs in the page: the checks.
function measure({ allow, edge, width }) {
  const say = (el) => {
    const id = el.id ? '#' + el.id : '';
    const lab = el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : '';
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.split(/\s+/)[0] : '';
    const txt = !lab && el.children.length === 0 ? `"${(el.textContent || '').trim().slice(0, 24)}"` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}${lab}${txt}`;
  };
  const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const scrollHeight = document.documentElement.scrollHeight;
  const scrollWidth = document.documentElement.scrollWidth;
  // Past the right edge: any visible element whose right edge, after every
  // clipping ancestor below <body> has cut it, still lands beyond the
  // viewport. An element an ancestor clips inside the viewport shows nothing
  // past the edge, so it is not counted; <body> and <html> clipping does not
  // excuse anything, since that is the cut-off this check exists to catch.
  // The outermost offender is named, not each of its descendants.
  const clipRight = (el) => {
    let right = el.getBoundingClientRect().right;
    for (let n = el; n; ) {
      if (getComputedStyle(n).position === 'fixed') break;
      const p = n.parentElement;
      if (!p || p === document.body || p === document.documentElement) break;
      if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(p).overflowX)) right = Math.min(right, p.getBoundingClientRect().right);
      n = p;
    }
    return right;
  };
  const wide = [];
  const over = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    if (!shown(el)) continue;
    if (el.getBoundingClientRect().right <= width + 0.5) continue;
    const right = clipRight(el);
    if (right <= width + 0.5) continue;
    if ([...over].some(o => o.contains(el))) continue;
    over.add(el);
    wide.push(`${say(el)} right ${right.toFixed(0)}`);
  }
  // Words a person reads: no em dash, and no ramp code where the product has a
  // name (ExpressRoute, Direct Connect, Equinix Fabric, Interconnect). Body
  // innerText plus SVG <text>, which innerText can skip.
  const svgText = [...document.querySelectorAll('svg text')].filter(t => { const r = t.getBoundingClientRect(); return r.width > 0 && getComputedStyle(t).visibility !== 'hidden'; }).map(t => t.textContent).join('\n');
  const read = `${document.body.innerText}\n${svgText}`;
  const words = [];
  const bad = /\u2014|\b(?:ER|DX|EQX|GCI)\b/g;
  const seenSnip = new Set();
  for (const m of read.matchAll(bad)) {
    const a = Math.max(0, m.index - 28), b = Math.min(read.length, m.index + m[0].length + 28);
    const snip = read.slice(a, b).replace(/\s+/g, ' ').trim();
    if (seenSnip.has(snip)) continue;
    seenSnip.add(snip);
    words.push(`${m[0] === '\u2014' ? 'em dash' : m[0]} in "${snip}"`);
  }
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
  // Clipped words in Signals (skeptic, 2026-09-30: "Over SLO · Latency spike ·
  // p95 1…" hid the number that makes it Over SLO): any text the Signals panel
  // cuts with an ellipsis. Shorten the words; never truncate the figure.
  const clipped = [];
  for (const el of document.querySelectorAll('[aria-label="Signals"] *')) {
    if (!shown(el) || getComputedStyle(el).textOverflow !== 'ellipsis') continue;
    if (el.scrollWidth > el.clientWidth + 1) clipped.push(`"${(el.textContent || '').trim().slice(0, 48)}" ${el.clientWidth}/${el.scrollWidth}`);
  }
  return { scrollHeight, scrollWidth, wide, words, boxed, edges, clipped };
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
  bad.push(...heightProblems({ page, scrollHeight: m.scrollHeight, limit: LIMIT, below: m.below, aboveBottom: m.aboveBottom }));
  if (m.scrollWidth > WLIMIT) bad.push(`wide ${m.scrollWidth}`);
  if (m.wide.length) bad.push(`past edge ${m.wide.slice(0, 4).join(', ')}${m.wide.length > 4 ? ` (+${m.wide.length - 4})` : ''}`);
  if (m.words.length) bad.push(`words ${m.words.slice(0, 4).join(', ')}${m.words.length > 4 ? ` (+${m.words.length - 4})` : ''}`);
  if (m.boxed.length) bad.push(`boxed ${m.boxed.join(', ')}`);
  if (m.edges.length) bad.push(`edge ${m.edges.join(', ')}`);
  if (m.clipped.length) bad.push(`clipped ${m.clipped.slice(0, 4).join(', ')}${m.clipped.length > 4 ? ` (+${m.clipped.length - 4})` : ''}`);
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
          const m = { ...(await page.evaluate(measure, { allow: ALLOW, edge: EDGE, width: WLIMIT })), ...(await page.evaluate(foldMarks)) };
          report(estate, th, pageName, trail || '(landing)', m, errors);
          if (shots) await page.screenshot({ path: join(shots, `${estate}-${th}-${pageName}-${trail || 'landing'}`.replace(/[^\w.-]+/g, '_') + '.png') });
          // Signals pages its cards (2026-09-30): the second page is measured too,
          // and, where it lands, every role's cards on both pages (the role chips
          // sit in the panel, so the tab walk never reaches them).
          const sigPage2 = async (name) => {
            const nextSig = page.locator('button[aria-label="Next signals"]:visible');
            if (!(await nextSig.count())) return;
            await nextSig.first().click(); await settle(page);
            errors.length = 0;
            report(estate, th, pageName, `${name} > page 2`, await page.evaluate(measure, { allow: ALLOW, edge: EDGE, width: WLIMIT }), errors);
            if (shots) await page.screenshot({ path: join(shots, `${estate}-${th}-${pageName}-${name}-p2`.replace(/[^\w.-]+/g, '_') + '.png') });
            await page.locator('button[aria-label="Previous signals"]:visible').first().click(); await settle(page);
          };
          await sigPage2(trail || '(landing)');
          const chips = page.locator('[aria-label="Signals for"] [role="tab"]:visible');
          if (!trail && await chips.count()) {
            const on = await chips.evaluateAll(els => els.findIndex(e => e.getAttribute('aria-selected') === 'true'));
            for (let i = 0; i < await chips.count(); i++) {
              if (i === on) continue;
              const role = ((await chips.nth(i).textContent()) || '').trim();
              await chips.nth(i).click(); await settle(page);
              errors.length = 0;
              report(estate, th, pageName, `Signals for ${role}`, await page.evaluate(measure, { allow: ALLOW, edge: EDGE, width: WLIMIT }), errors);
              if (shots) await page.screenshot({ path: join(shots, `${estate}-${th}-${pageName}-${role}`.replace(/[^\w.-]+/g, '_') + '.png') });
              await sigPage2(`Signals for ${role}`);
            }
            if (on >= 0) { await chips.nth(on).click(); await settle(page); }
          }
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
      // The added-source beat (2026-09-30), last so every page above is
      // measured on the estate as it loads: Sources > Add a source > Oracle >
      // Add and scan, then measure. The added row's Remove button only exists
      // after it, and it once ran past the right edge.
      const src = want.find(l => l.label === 'Sources');
      if (addBeat && src) {
        const pageName = `${src.group}/Sources`;
        const trail = 'after Add a source > Oracle > Add and scan';
        await clickRail(page, 'Sources');
        await page.waitForTimeout(3600);
        const steps = ['Add a source', 'Oracle', 'Add and scan'];
        let missed = null;
        for (const s of steps) {
          const b = page.locator('button:visible', { hasText: s }).first();
          if (!(await b.count())) { missed = s; break; }
          await b.click();
          await settle(page);
        }
        errors.length = 0;
        const m = { ...(await page.evaluate(measure, { allow: ALLOW, edge: EDGE, width: WLIMIT })), ...(await page.evaluate(foldMarks)) };
        report(estate, th, pageName, trail, m, missed ? [`no "${missed}" button`, ...errors] : errors);
        if (shots) await page.screenshot({ path: join(shots, `${estate}-${th}-${pageName}-${trail}`.replace(/[^\w.-]+/g, '_') + '.png') });
      }
      // The explained-Logs beat (w2, 2026-09-30): a Signals traffic figure opens Logs with
      // its explanation over the records, and the page walk never lands there with one set
      // (it ran to 1022px). Measured shut as it lands, then with its filters opened by hand.
      if (want.some(l => l.label === 'Insights')) {
        const pageName = 'observe/Logs';
        await clickRail(page, 'Insights');
        await clickTab(page, 'Signals');
        const fig = page.locator('[aria-label="Signal cards"] .sig-card', { has: page.locator('.sig-head', { hasText: 'Top talkers' }) }).first().locator('.sig-row .sig-fig').first();
        if (await fig.count()) {
          await fig.click(); await settle(page);
          for (const trail of ['explaining a Signals figure', 'explaining a Signals figure > filters shown']) {
            if (trail.endsWith('shown')) { const t = page.locator('#sec-logs button', { hasText: 'Filters' }).first(); if (await t.count()) { await t.click(); await settle(page); } }
            errors.length = 0;
            const m = { ...(await page.evaluate(measure, { allow: ALLOW, edge: EDGE, width: WLIMIT })), ...(await page.evaluate(foldMarks)) };
            report(estate, th, pageName, trail, m, errors);
            if (shots) await page.screenshot({ path: join(shots, `${estate}-${th}-${pageName}-${trail}`.replace(/[^\w.-]+/g, '_') + '.png') });
          }
        }
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`${lines.length} checked · ${fails} FAIL · ${lines.filter(l => l.startsWith('BASE')).length} baseline`);
process.exit(fails ? 1 : 0);
