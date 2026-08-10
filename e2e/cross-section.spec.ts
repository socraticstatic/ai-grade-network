import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/* The living cross-section, walked as a person walks it: read the live
   figures, design on the twin, watch the staged arrow become the committed
   state, and confirm the figures agree with the verb pages one click away. */

test('design on the twin: stage usw2 → engine-priced delta → commit → the estate moved → undo restores', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  const panel = page.getByTestId('stack-panel');
  await expect(panel).toBeVisible();

  // The NaaS band states a live "still on the table" savings figure — it
  // falls as regions attach and their savings are captured. Capture it.
  const naasStrip = page.getByTestId('stack-figures-naas');
  await expect(naasStrip).toBeVisible();
  const beforeText = await naasStrip.innerText();
  const before = beforeText.match(/\$([\d,]+)\/mo\s*still on the table/);
  expect(before, 'the NaaS band must state savings still on the table').toBeTruthy();

  // Design mode reveals the usw2 attach with its latency arrow.
  await page.getByTestId('design-toggle').click();
  const usw2 = page.getByTestId('move-attach-usw2');
  await expect(usw2).toBeVisible();
  const chipText = await usw2.innerText();
  const arrow = chipText.match(/(\d+)→(\d+) ms/);
  expect(arrow, 'the chip states the regionLatency arrow').toBeTruthy();

  // Stage it — the tray restates the same arrow, nothing invented.
  await usw2.click();
  const tray = page.getByTestId('design-tray');
  await expect(tray).toContainText('1 move staged');
  await expect(tray).toContainText(`${arrow![1]}→${arrow![2]} ms`);

  // Commit. The band's figure moves and /naas/connect agrees.
  await page.getByTestId('design-commit').click();
  await expect(tray).toContainText('committed to the estate');
  const afterText = await naasStrip.innerText();
  const after = afterText.match(/\$([\d,]+)\/mo\s*still on the table/);
  expect(
    Number(after![1].replace(/,/g, '')),
    'attaching usw2 captures its saving, so less is left on the table',
  ).toBeLessThan(Number(before![1].replace(/,/g, '')));

  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });
  const usw2Edge = page.locator('[data-fabric-edge][data-region-id="usw2"]').first();
  await expect(usw2Edge).toHaveAttribute('data-path', 'private');

  // Undo reverts the committed move — the cross-section reads it back up.
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /undo/i }).click();
  const restoredText = await page.getByTestId('stack-figures-naas').innerText();
  const restored = restoredText.match(/\$([\d,]+)\/mo\s*still on the table/);
  expect(restored![1]).toBe(before![1]);
});

test('discard clears the tray and moves nothing', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  const naasStrip = page.getByTestId('stack-figures-naas');
  const before = await naasStrip.innerText();

  await page.getByTestId('design-toggle').click();
  await page.getByTestId('move-attach-usw2').click();
  await expect(page.getByTestId('design-tray')).toContainText('1 move staged');
  await page.getByTestId('design-discard').click();
  await expect(page.getByTestId('design-tray')).toHaveCount(0);
  expect(await naasStrip.innerText()).toBe(before);
});

test('the cross-section and /naas/cost state the same money', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  const strip = page.getByTestId('stack-figures-naas');
  const bandFigure = (await strip.innerText()).match(/\$([\d,]+)\/mo\s*still on the table/);
  expect(bandFigure, 'the band states available savings').toBeTruthy();

  // /naas/cost's hero states the same "on the table" figure (arbitrage()).
  // The $ figure and the sentence are sibling spans — read their parent <p>.
  await page.goto('/#/naas/cost', { waitUntil: 'domcontentloaded' });
  const hero = page.locator('p', { hasText: 'more on the table' }).first();
  await expect(hero).toBeVisible();
  const heroFigure = (await hero.innerText()).match(/\$([\d.,]+)k?\/mo/);
  expect(heroFigure).toBeTruthy();
  // Normalize: the hero may state $19.9k, the band $19,900.
  const bandVal = Number(bandFigure![1].replace(/,/g, ''));
  const heroRaw = heroFigure![1].replace(/,/g, '');
  const heroVal = (await hero.innerText()).includes('k/mo')
    ? Number(heroRaw) * 1000
    : Number(heroRaw);
  expect(Math.abs(bandVal - heroVal)).toBeLessThanOrEqual(bandVal * 0.01 + 100);
});
