#!/usr/bin/env node
// The Monday demo, walked (docs/demo-2026-10-05-notes.md). Headless Chromium, a
// fresh profile, Growing as Network Eng at 1440x900: each beat clicks what the
// presenter clicks and asserts the words the presenter will say, and every stop
// must fit the fold. It never drives Comet or Chrome; it serves the repo itself.
//
//   node scripts/demo-walk.mjs [--shots <dir>]
//
// Exit 0 when every beat passes; 1 with the failing beats named.

import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    if (h > H) throw new Error(`page is ${h}px tall; the fold is ${H}`);
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

// Beat 0 (2026-09-30): the NaaS home, the whole network at a glance for the role.
// The head is Observe's, the briefing is Monthly briefing's, the rows are Your
// actions', the tiles are the pages' own; the role chips change the briefing.
const inHome = (sel) => page.locator(`section[aria-label="NaaS home"] ${sel}`);
const briefing = () => inHome('[aria-label="Andi\'s briefing"] p').innerText();
await beat('0 NaaS home: the whole network at a glance', async () => {
  await rail('NaaS');
  await expect('Network Eng', '13 findings open. $41,500/mo potential savings. 1 Sev 1 open now.', "Andi's briefing", 'Waiting on you', 'Azure eastus · ExpressRoute', 'BGP flapping');
  const rows = await inHome('[aria-label="Waiting on you"] button:has-text("Do it")').count();
  if (rows !== 3) throw new Error(`Waiting on you shows ${rows} rows, not 3`);
  const tiles = await inHome('[aria-label="The five areas"] > button').allInnerTexts();
  if (tiles.length !== 5) throw new Error(`${tiles.length} tiles, not 5`);
  for (const [i, want] of [[0, '25 sites · 3 clouds'], [1, '5 of 7 regions'], [2, '1 of 2 connections'], [4, '$41,500/mo']]) if (!tiles[i].includes(want)) throw new Error(`tile ${i + 1} reads "${tiles[i].replace(/\n/g, ' | ')}", not ${want}`);
  const neteng = await briefing();
  if (!/For network engineering/.test(neteng)) throw new Error('the briefing is not Network Eng\'s');
  await tab('Executive', 'section[aria-label="NaaS home"]');
  const exec = await briefing();
  if (exec === neteng || !/For the executive team/.test(exec)) throw new Error('the briefing did not change for Executive');
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

await beat('7 Insights: Your actions and Operations', async () => {
  await rail('Insights');
  await expect('Actions for Network Eng', 'Coming soon');
  await tab('Operations', '[aria-label="Insights views"]');
  await expect(/\d+ Sev 1 open now\. \d+ tickets? open\./, 'sample history');
  await tab('Tickets', '[aria-label="Operations views"]');
  if (!eastusTicket) throw new Error('beat 4 never read the eastus ticket');
  await expect(`${eastusTicket} · opened by Andi`);
});

await beat('8 Estate switch to Established', async () => {
  // Options still reads the Connect verdict; the four tiles live on the home now.
  await rail('Options');
  // Beat 1 added Oracle's two public regions to Growing: 5 of 7 became 7 of 9.
  await expect('7 of 9 regions still ride the public internet');
  // Switched while on the home, the new estate's own figures show, with no stale role list.
  await rail('NaaS');
  await expect(/^14 findings open\./m, '25 sites · 4 clouds', '5 sites reach the cloud over IPsec');
  await page.selectOption('select[aria-label="View as"]', 'mature'); await settle(600);
  await expect(/^10 findings open\. \$17,500\/mo potential savings\. 1 Sev 1 open now\./m, '221 sites · 4 clouds', '3 paths send no telemetry', 'AWS eu-central-1 · Direct Connect');
  if ((await text()).includes('5 sites reach the cloud over IPsec')) throw new Error('Growing\'s role list stayed on the Established home');
  await rail('Options');
  await expect('1 of 8 regions still ride the public internet');
});

await browser.close();
for (const [st, name, why] of results) console.log(`${st.padEnd(4)} ${name}${why ? ` · ${why}` : ''}`);
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(`${results.length} beats · ${failed} FAIL`);
process.exit(failed ? 1 : 0);
