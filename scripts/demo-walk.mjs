#!/usr/bin/env node
// The Monday demo, walked (docs/demo-2026-10-05-notes.md). Headless Chromium, a
// fresh profile, Growing as Network Eng at 1440x900: each beat clicks what the
// presenter clicks and asserts the words the presenter will say, and every stop
// must fit the fold (scripts/fold-rule.mjs: the home alone may run past it, by
// the Connect map below its fold, and only by that). It never drives Comet or
// Chrome; it serves the repo itself.
//
//   node scripts/demo-walk.mjs [--shots <dir>]
//
// Exit 0 when every beat passes; 1 with the failing beats named.

import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { heightProblems, foldMarks, HOME_PAGE } from './fold-rule.mjs';

const PW = 'file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'http://naas.demo';
const W = 1440, H = 900;
const args = process.argv.slice(2);
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
if (shots) await mkdir(shots, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf' };
async function serve(route) {
  const url = new URL(route.request().url());
  if (url.origin !== ORIGIN) return route.abort();
  const path = join(ROOT, decodeURIComponent(url.pathname));
  try { return route.fulfill({ status: 200, body: await readFile(path), headers: { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' } }); }
  catch { return route.fulfill({ status: 404, body: 'not found' }); }
}

const { chromium } = await import(PW);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
await ctx.route('**/*', serve);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

const settle = (ms = 350) => page.waitForTimeout(ms);
const rail = async (label) => { await page.click(`.rail-scroll button[aria-label="${label}"]`); await settle(450); };
const tab = async (text, within = '') => { await page.locator(`${within} [role="tab"]:visible`.trim(), { hasText: text }).first().click(); await settle(); };
const btn = async (text) => { await page.locator('button:visible', { hasText: text }).first().click(); await settle(); };
const text = () => page.evaluate(() => (document.querySelector('main') || document.body).innerText);
// innerText applies text-transform (tile labels read "SITE ACCESS"), so words match without case.
const expect = async (...needles) => {
  const t = await text();
  for (const n of needles) if (!(n instanceof RegExp ? new RegExp(n.source, n.flags.includes('i') ? n.flags : n.flags + 'i').test(t) : t.toLowerCase().includes(n.toLowerCase()))) throw new Error(`missing ${n}`);
};

const results = [];
let n = 0;
async function beat(name, fn) {
  n += 1;
  try {
    await fn();
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const home = await page.locator('section[aria-label="NaaS home"]').count();
    const bad = heightProblems({ page: home ? HOME_PAGE : name, scrollHeight: h, limit: H, ...(await page.evaluate(foldMarks)) });
    if (bad.length) throw new Error(`the fold is ${H}: ${bad.join(', ')}`);
    if (errors.length) throw new Error(`page error: ${errors.splice(0).join(' | ')}`);
    if (shots) await page.screenshot({ path: join(shots, `${String(n).padStart(2, '0')}-${name.replace(/[^\w]+/g, '-').toLowerCase()}.png`) });
    results.push(['ok', name]);
  } catch (e) {
    results.push(['FAIL', name, e.message.split('\n')[0]]);
  }
}

await page.goto(`${ORIGIN}/NaaS%20Storefront.dc.html?view=partial`, { waitUntil: 'load' });
await page.waitForSelector('.rail-scroll', { timeout: 20000 });
await settle(500);

// Beat 0 (v2 home, 2026-09-30: "home page is too wordy! this isn't a white
// paper"): one take-away for the role, four snapshot cards, Waiting on you as
// chips, and the Connect map below the fold. The take-away is Health's first
// problem, the cards are the pages' own figures, the chips are Your actions';
// the role chips change the take-away and the card order.
const inHome = (sel) => page.locator(`section[aria-label="NaaS home"] ${sel}`);
// Each part of the line is its own button, so innerText breaks between them; read it as one line.
const takeaway = async () => (await inHome('[aria-label="Take-away"]').innerText()).replace(/\s+/g, ' ');
const takes = async (...needles) => { const t = await takeaway(); for (const n of needles) if (!t.includes(n)) throw new Error(`the take-away reads "${t}", not ${n}`); };
const cards = () => inHome('[aria-label="Snapshot"] > div').allInnerTexts();
await beat('0 NaaS home: the take-away, the snapshot, the map below', async () => {
  await rail('NaaS');
  // Dev's home (2026-10-01): Do next ranks the role's actions, each with what it gets you.
  await expect("Andi's briefing", 'Do next', 'Needs attention', 'Shows the traffic you cannot see');
  await takes('Azure eastus is down', 'Finance rides it · 40 workloads · 22 min', 'Trace it');
  const rows = await inHome('[aria-label="Do next"] .hm-do').count();
  if (rows !== 4) throw new Error(`Do next lists ${rows} actions, not Network Eng's 4`);
  const c = await cards();
  if (c.length !== 4) throw new Error(`${c.length} snapshot cards, not 4`);
  for (const [i, want] of [[0, '5 of 8'], [1, '2 of 7'], [2, '$89,600'], [3, '54 of 303']]) if (!c[i].includes(want)) throw new Error(`card ${i + 1} reads "${c[i].replace(/\n/g, ' | ')}", not ${want}`);
  if (!(await page.locator('#sec-fabric[data-fold="below"]').count())) throw new Error('no Connect map below the home');
  // The map's title sits at the fold. The home has no Lens control, so its legend keys whose path a wire
  // is and Health's state on each dot (third skeptic, 2026-09-30), never a lens.
  await expect('What you have', '1 connection down', '5 regions without flow logs', 'AT&T and private paths', 'public internet (dotted)');
  if ((await page.locator('#sec-fabric').innerText()).includes('security lens')) throw new Error('the home keys a lens it has no control for');
  const neteng = await takeaway();
  await tab('Executive', 'section[aria-label="NaaS home"]');
  const exec = await takeaway();
  if (exec === neteng) throw new Error('the take-away did not change for Executive');
  await takes('$41,500/mo on the table', '3 moves · 1 outage on Finance', 'See the moves');
  if (!(await cards())[0].includes('$89,600')) throw new Error('Egress does not lead for Executive');
  await tab('Network Eng', 'section[aria-label="NaaS home"]');
});

await beat('1 Discover: add Oracle, see what it found', async () => {
  await rail('Sources');
  await page.waitForTimeout(3600); // the scan's four beats
  await btn('Add a source');
  await page.locator('button:visible', { hasText: 'Oracle' }).first().click(); await settle();
  await btn('Add and scan');
  await expect(/Discovery found 2 Oracle regions, \d+ VCNs and 70 workloads/, 'Oracle account');
  await btn('See what it found');
  await expect('Oracle us-ashburn-1');
});

await beat('2 Your sites and Your clouds', async () => {
  await tab('Your sites');
  await expect('All regions', /\d+ sites · \d+ AT&T/);
  await tab('Your clouds');
  await expect('How they connect');
  // Each cloud carries its egress a month, Cost's own figure (2026-09-30: "integrate costs").
  await page.locator('nav[aria-label="Cloud drill"] button', { hasText: 'All clouds' }).click(); await settle();
  await expect(/\$51,000\s*\/mo egress/);
  // Every count is a door to its set, and the landing carries its moves (the drill rule, 2026-09-30).
  await tab('At a glance');
  await expect(/Spend\s*\$135,650/);
  await page.locator('[aria-label="Estate at a glance"] button', { hasText: '70 workloads exposed' }).first().click(); await settle();
  // No finding is written about all 70, so the moves are the policy and Andi (2026-10-01: "Open its
  // finding" opened a snoozed one about 7 others in eu-west-1).
  await expect('Exposed workloads', '70 workloads', 'Set policy', 'Ask Andi');
});

await beat('3 Traffic: a GCP pick, in proportion', async () => {
  await rail('Traffic');
  await btn('By cloud');
  await page.locator('button:visible', { hasText: /^GCP/ }).first().click(); await settle();
  await expect('Destinations · at estate scale', /Sites on AT&T\s*0 of 25/);
  await btn('Whole estate');
});

// With Andi On (the default) every incident already carries his ticket, and
// Health and Operations read the same one (final review, 2026-09-30). Beat 7
// checks Operations > Tickets lists the number Health shows here.
let eastusTicket = null;
await beat('4 Health: the eastus flap already carries Andi\'s ticket', async () => {
  await tab('Health');
  await expect('Azure eastus · ExpressRoute', 'BGP flapping', 'Cloud provider');
  const t = await text();
  const m = t.slice(t.indexOf('Azure eastus · ExpressRoute')).match(/(T-\d{4}) · opened by Andi/);
  if (!m) throw new Error('the eastus row has no "T-nnnn · opened by Andi"');
  eastusTicket = m[1];
  if (await page.locator('button:visible', { hasText: 'Open ticket' }).count()) throw new Error('Open ticket shows beside Andi\'s tickets');
});

await beat('5 Capacity', async () => {
  await tab('Capacity');
  await expect('Azure eastus', 'AWS us-east-1');
});

await beat('6 Cost: the four moves, then By leg', async () => {
  await rail('Optimize');
  await expect('What should I change first?', 'Update connection type', 'Update routing policy', 'Add backup path', 'Resize');
  await tab('By leg');
  await expect('Site access', 'Cloud connectivity', 'Cloud provider', 'Modelled', 'Egress');
});

// Insights opens on Signals (2026-09-30, "Cards plus Your actions"): Network Eng's
// three lead, each row with its move; Your actions is the next tab, unchanged.
await beat('7 Insights: Signals, Your actions and Operations', async () => {
  await rail('Insights');
  // westeurope is not on AT&T, so its flows offer Attach; Steer stays on us-east-1 to eastus (third round, 2026-09-30).
  // Health lists westeurope's latency over SLO too, as the home's chip and this card's list do (w2 second pass, 2026-09-30).
  await expect('Health', '3 problems · 2 apps affected', 'Latency over SLO', 'Capacity', 'Trace', 'Attach', 'Steer', 'Resize');
  const lead = await page.locator('[aria-label="Signal cards"] .sig-head .t').allInnerTexts();
  if (!/^Health/.test(lead[0] || '') || !/^Latency over SLO/.test(lead[1] || '') || !/^Capacity/.test(lead[2] || '')) throw new Error(`Network Eng leads with ${lead.slice(0, 3).join(', ')}`);
  await tab('Your actions', '[aria-label="Insights views"]');
  // Each action says what it gets you (Dev's Insights content, 2026-10-01); Do it's "Coming soon" moved to its title.
  await expect('Actions for Network Eng', 'Brings latency under SLO');
  await tab('Operations', '[aria-label="Insights views"]');
  await expect(/\d+ Sev 1 open now\. \d+ tickets? open\./, 'sample history');
  await tab('Tickets', '[aria-label="Operations views"]');
  if (!eastusTicket) throw new Error('beat 4 never read the eastus ticket');
  await expect(`${eastusTicket} · opened by Andi`);
});

await beat('8 Estate switch to Established', async () => {
  // Recommended (Options until 2026-09-30, "options and orders is so weird") prints the Connect verdict over its moves.
  await rail('Recommended');
  // Beat 1 added Oracle's two public regions to Growing: 5 of 7 became 7 of 9.
  await expect('7 of 9 regions still ride the public internet');
  // Switched while on the home, the new estate's own figures show, with no stale role list.
  // v2 home (2026-09-30): the On AT&T card counts Oracle's two public regions (2 of 7 became 2 of 9).
  await rail('NaaS');
  // w2 (2026-09-30): the latency action counts eu-west-1's spike too, as Latency over SLO lists it.
  const growingChips = await page.evaluate(() => (document.querySelector('main') || document.body).innerText);
  await expect('2 regions run above the latency SLO.');
  await takes('Azure eastus is down');
  if (!(await cards())[1].includes('2 of 9')) throw new Error(`On AT&T reads "${(await cards())[1].replace(/\n/g, ' | ')}", not 2 of 9`);
  await page.selectOption('select[aria-label="View as"]', 'mature'); await settle(600);
  await expect('3 paths send no telemetry', '2 regions run above the latency SLO.');
  // The outage leads, not the at-risk region (skeptic, 2026-09-30).
  await takes('AWS eu-central-1 is down', '2 apps ride it · 96 workloads');
  if (!(await cards())[1].includes('7 of 8')) throw new Error(`Established's On AT&T reads "${(await cards())[1].replace(/\n/g, ' | ')}", not 7 of 8`);
  // Established's role list, not Growing's: one blind region where Growing has several.
  await expect('1 region sends no flow logs.');
  const blindG = (growingChips.match(/\d+ regions send no flow logs/) || [''])[0];
  if (!blindG || (await text()).includes(blindG)) throw new Error('Growing\'s role list stayed on the Established home');
  await rail('Recommended');
  await expect('1 of 8 regions still ride the public internet');
});

await browser.close();
for (const [st, name, why] of results) console.log(`${st.padEnd(4)} ${name}${why ? ` · ${why}` : ''}`);
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(`${results.length} beats · ${failed} FAIL`);
process.exit(failed ? 1 : 0);
