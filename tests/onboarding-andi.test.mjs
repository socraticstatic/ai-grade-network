// The onboarding tour's last step offers three ways in: Guided, API, and Andi
// (2026-10-16, Micah: "add a third option. 'Andi', an agent that talks you
// through each choice conversationally to set things up"). Andi's way is a
// conversation inside the tour: one choice a turn, answered with chips, then
// the plan and a hand-off to the real guided journey. Driven in headless
// Chromium; ?still skips the tour's timers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PW = 'file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs';
const PAGE = new URL('../docs/onboarding-mock/index.html', import.meta.url).href;
const HTML = readFileSync(new URL('../docs/onboarding-mock/index.html', import.meta.url), 'utf8');

const { chromium } = await import(PW);
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });   // the storefront's modules load over file://
test.after(() => browser.close());

async function open(hash = '#7') {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`${PAGE}?still${hash}`);
  await page.waitForSelector('.win .wi');
  return page;
}

test('the ready step offers three ways in, and Andi is the third', async () => {
  const page = await open();
  assert.doesNotMatch(await page.$eval('.win', e => e.textContent), /your 2 regions/, 'the Guided card counts regions the tour never scanned');
  const names = await page.$$eval('.win .wi h3', els => els.map(e => e.textContent.trim()));
  assert.deepEqual(names, ['Guided', 'API', 'Andi']);
  assert.ok(await page.$('.win .wi[data-spot="andi"] button[data-andi]'), 'Andi has no button');
  const lead = await page.$eval('.lead', e => e.textContent);
  assert.match(lead, /Andi/, 'the step copy does not name Andi');
  await page.close();
});

test('the picture shows Andi beside Guided and API in the start band', async () => {
  const page = await open();
  const heads = await page.$$eval('#startBand .bc .bh', els => els.map(e => e.textContent.trim().replace(/\s+/g, ' ')));
  assert.equal(heads.length, 3, `start band has ${heads.length} cards`);
  assert.match(heads[2], /^Andi/);
  assert.ok(await page.$('#startBand .sb-andi'), 'no .sb-andi card');
  assert.ok(HTML.includes("andi: {"), 'no spotlight entry for andi');
  await page.close();
});

test('Talk to Andi opens a conversation that asks one choice at a time', async () => {
  const page = await open();
  await page.click('button[data-andi]');
  await page.waitForSelector('#endAndi.on');
  await page.waitForFunction(() => !document.querySelector('#endAndi .typing'));
  const first = await page.$eval('#endAndi .tsay', e => e.textContent);
  assert.match(first, /Andi/, 'Andi does not introduce himself');
  assert.match(first, /\?/, 'the first turn asks nothing');
  // The tour has not read the clouds: Andi asks, he does not report (Micah, 2026-10-16).
  assert.doesNotMatch(first, /workloads|eastus/, 'Andi reports scan results the tour never ran');
  const opts = await page.$$('#endAndi .topt');
  assert.ok(opts.length >= 2, `first question offers ${opts.length} answers`);
  // Every answer is glyph-first with its evidence, and the plan strip marks Find as the station in play.
  for (const o of opts) { assert.ok(await o.$('.chip .ic'), 'an answer has no glyph'); assert.ok((await o.$eval('.tev', e => e.textContent.trim())).length, 'an answer has no evidence'); }
  const stations = await page.$$eval('#endAndi .tst', els => els.map(e => [e.querySelector('b').textContent, e.className]));
  assert.deepEqual(stations.map(s => s[0]), ['Find', 'Connect', 'Protect', 'Save']);
  assert.match(stations[0][1], /now/);
  await page.close();
});

test('answering every question fills the strip and hands off to Andi on the dashboard', async () => {
  const page = await open();
  await page.click('button[data-andi]');
  await page.waitForSelector('#endAndi.on');
  const picks = [];
  for (let i = 0; i < 8; i++) {
    await page.waitForFunction(() => !document.querySelector('#endAndi .typing'));
    const opt = await page.$('#endAndi .topt');
    if (!opt) break;
    picks.push((await opt.$eval('b', e => e.textContent)).trim());
    await opt.click();
  }
  assert.ok(picks.length >= 3 && picks.length <= 6, `Andi asked ${picks.length} questions: ${picks.join(' / ')}`);
  // Each reply says why, in Andi's line, and the answers live in the strip, not in a transcript (Micah, 2026-10-16:
  // "No internal scrolling!").
  assert.ok((await page.$eval('#endAndi .twhy', e => e.textContent.trim())).length > 20, 'Andi does not say why');
  const done = await page.$$eval('#endAndi .tst.done .tv', els => els.map(e => e.textContent.trim()));
  assert.equal(done.length, 4, `strip has ${done.length} filled stations`);
  assert.deepEqual(done.slice(0, 3), picks.slice(0, 3));
  const fit = await page.$eval('#endAndi .end-card', e => { const r = e.getBoundingClientRect(), p = e.closest('.panel').getBoundingClientRect();
    const scrollers = [...e.querySelectorAll('*')].filter(x => /auto|scroll/.test(getComputedStyle(x).overflowY)).length;
    return { inside: r.top >= p.top && r.bottom <= p.bottom, scrollers }; });
  assert.ok(fit.inside, 'the conversation card does not fit the panel at 1440x900');
  assert.equal(fit.scrollers, 0, 'something inside the conversation scrolls');
  const goText = await page.$eval('#endAndi button[data-andi-go]', e => e.textContent.trim());
  assert.match(goText, /dashboard/i);
  const [nav] = await Promise.all([page.waitForNavigation(), page.click('#endAndi button[data-andi-go]')]);
  assert.match(nav.url(), /NaaS%20Storefront\.dc\.html\?estate=lastmile&andi=1/);
  await page.close();
});

test('Start over clears the strip back to the first question', async () => {
  const page = await open();
  await page.click('button[data-andi]');
  await page.waitForSelector('#endAndi.on');
  await page.waitForFunction(() => !document.querySelector('#endAndi .typing'));
  const pick = (await page.$eval('#endAndi .topt b', e => e.textContent)).trim();
  await page.click('#endAndi .topt');
  await page.waitForFunction(() => !document.querySelector('#endAndi .typing'));
  // The answered choice is already in the strip, before the next question.
  assert.deepEqual(await page.$$eval('#endAndi .tst.done .tv', els => els.map(e => e.textContent.trim())), [pick]);
  await page.click('#endAndi button[data-andi-reset]');
  await page.waitForFunction(() => !document.querySelector('#endAndi .typing'));
  assert.equal((await page.$$('#endAndi .tst.done')).length, 0);
  assert.match(await page.$eval('#endAndi .tst', e => e.className), /now/);
  await page.close();
});

test('the storefront opens with the Andi dock when the tour hands off to it', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(new URL('../NaaS Storefront.dc.html', import.meta.url).href + '?estate=lastmile&andi=1');
  await page.waitForSelector('aside[aria-label="Andi"]', { timeout: 15000 });
  const dock = await page.$eval('aside[aria-label="Andi"]', e => ({ w: e.getBoundingClientRect().width, text: e.innerText.slice(0, 40) }));
  assert.ok(dock.w > 300, `the dock is ${dock.w}px wide`);
  assert.match(dock.text, /Andi/);
  await page.close();
});
