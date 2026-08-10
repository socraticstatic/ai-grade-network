import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/* The full loop: design → simulate → share → approve → commit. The link
   carries intentions; the receiving engine reprices them itself. */

test('a shared proposal round-trips: staged tray, same arrow, recipient commits', async ({ page }) => {
  await seedAuth(page);
  // Capture the copied link instead of touching the real clipboard.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (t: string) => { (window as any).__copiedText = t; return Promise.resolve(); } },
    });
  });
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  // Sender: stage usw2, note its arrow, share.
  await page.getByTestId('design-toggle').click();
  const chipText = await page.getByTestId('move-attach-usw2').innerText();
  const arrow = chipText.match(/(\d+→\d+ ms)/)![1];
  await page.getByTestId('move-attach-usw2').click();
  await page.getByTestId('share-proposal').click();
  await expect(page.getByText('Copied', { exact: true })).toBeVisible();
  const link = await page.evaluate(() => (window as any).__copiedText as string);
  expect(link).toContain('?s=');

  // Recipient: a fresh load of the link lands with the tray staged and the
  // SAME latency arrow, repriced by their own engine.
  await page.goto(link, { waitUntil: 'domcontentloaded' });
  const tray = page.getByTestId('design-tray');
  await expect(tray.getByTestId('proposal-note')).toContainText('Opened from a proposal link · 1 move');
  await expect(tray).toContainText(arrow);

  // The recipient commits — the estate moves. The NaaS band's "still on the
  // table" savings figure falls as usw2's saving is captured.
  const strip = page.getByTestId('stack-figures-naas');
  const before = (await strip.innerText()).match(/\$([\d,]+)\/mo\s*still on the table/)!;
  await page.getByTestId('design-commit').click();
  await expect(tray).toContainText('committed to the estate');
  const after = (await strip.innerText()).match(/\$([\d,]+)\/mo\s*still on the table/)!;
  expect(Number(after[1].replace(/,/g, ''))).toBeLessThan(Number(before[1].replace(/,/g, '')));
});

test('the advisor drafts, a human reviews — nothing commits on its own', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  const chip = page.getByTestId('advisor-chip');
  await expect(chip).toBeVisible();
  const label = await chip.innerText();
  const count = Number(label.match(/Advisor: (\d+) moves/)![1]);
  expect(count).toBeGreaterThan(0);
  expect(label).toMatch(/\$[\d,]+\/mo/);

  // The estate is untouched until a human acts.
  const strip = page.getByTestId('stack-figures-naas');
  const before = await strip.innerText();

  await chip.click();
  const tray = page.getByTestId('design-tray');
  await expect(tray).toContainText(`${count} moves staged`);
  expect(await strip.innerText()).toBe(before);

  // Discard: the draft evaporates, the chip returns, still nothing moved.
  await page.getByTestId('design-discard').click();
  await expect(chip).toBeVisible();
  expect(await strip.innerText()).toBe(before);
});
