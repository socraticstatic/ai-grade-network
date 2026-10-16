// The onboarding tour captures the agreement to scan; it does not run the scan
// (Micah, 2026-10-16: "the terms do need to capture an 'agree' and an
// opportunity to see terms and conditions and capture the agreement to scan";
// "the real scan should happen after onboarding, via guided setup, andi or
// api"). So the terms step shows the full terms in place, Agree is recorded
// and survives a reload, and the picture after that step is an example, not
// the customer's data.
import test from 'node:test';
import assert from 'node:assert/strict';

const PW = 'file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs';
const PAGE = new URL('../docs/onboarding-mock/index.html', import.meta.url).href;

const { chromium } = await import(PW);
const browser = await chromium.launch();
test.after(() => browser.close());

async function open(hash = '#1') {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${PAGE}?still${hash}`);
  await page.waitForSelector('.actions');
  return page;
}

test('the terms step opens the full terms in place, and they fit the panel', async () => {
  const page = await open();
  await page.click('button[data-terms]');
  await page.waitForSelector('#termsSheet.on');
  const sheet = await page.$eval('#termsSheet', e => {
    const r = e.querySelector('.sheet').getBoundingClientRect(), p = e.closest('.panel').getBoundingClientRect();
    const scrollers = [...e.querySelectorAll('*')].filter(x => /auto|scroll/.test(getComputedStyle(x).overflowY)).length;
    return { heads: [...e.querySelectorAll('h4')].map(h => h.textContent), inside: r.top >= p.top && r.bottom <= p.bottom, scrollers };
  });
  assert.ok(sheet.heads.length >= 5, `the terms have ${sheet.heads.length} sections`);
  assert.ok(sheet.inside, 'the terms do not fit the panel at 1440x900');
  assert.equal(sheet.scrollers, 0, 'the terms scroll inside the panel');
  await page.click('#termsSheet button[data-terms-back]');
  await page.waitForFunction(() => !document.querySelector('#termsSheet.on'));
  await page.context().close();
});

test('Agree is recorded with a time and survives a reload', async () => {
  const page = await open();
  assert.equal(await page.$('.agreed'), null, 'an agreement shows before anyone agreed');
  await page.click('button[data-agree]');
  await page.waitForFunction(() => location.hash === '#2');
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('naas.scanConsent')));
  assert.equal(rec.agreed, true);
  assert.ok(!Number.isNaN(Date.parse(rec.at)), `no time on the record: ${rec.at}`);
  await page.goto(`${PAGE}?still&again#1`);
  await page.waitForSelector('.agreed');
  assert.match(await page.$eval('.agreed', e => e.textContent), /Agreed/);
  await page.context().close();
});

test('Not now is recorded too, and the tour goes on', async () => {
  const page = await open();
  await page.click('button[data-notnow]');
  await page.waitForFunction(() => location.hash === '#2');
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('naas.scanConsent')));
  assert.equal(rec.agreed, false);
  await page.context().close();
});

test('after the terms the picture is marked as an example, and the ready step says where the scan runs', async () => {
  const page = await open('#0');
  assert.equal(await page.$eval('.example', e => getComputedStyle(e).opacity), '0', 'the example mark shows on the big picture');
  await page.goto(`${PAGE}?still&b#2`);   // a new query: a hash-only change never reloads the tour
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.example')).opacity === '1');
  assert.match(await page.$eval('.example', e => e.textContent), /Example/);
  await page.goto(`${PAGE}?still&c#7`);
  await page.waitForSelector('.win .wi');
  assert.match(await page.$eval('.lead', e => e.textContent), /scan/i, 'the ready step does not say the scan runs there');
  await page.context().close();
});
