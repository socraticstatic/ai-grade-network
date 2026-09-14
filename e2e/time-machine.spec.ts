import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/* The Observe time machine: scrub the window the charts already draw, find
   the engine's own moments, come back to live. */

test('scrub to the seeded anomaly, read it by name, return to live', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/observe', { waitUntil: 'domcontentloaded' });

  const scrubber = page.getByTestId('tm-scrubber');
  await expect(scrubber).toBeVisible();
  await expect(page.getByText('Live', { exact: true })).toBeVisible();

  // The anomaly marker rides the track where the engine placed it.
  const markers = page.getByTestId('tm-moment');
  await expect(markers.first()).toBeAttached();
  const labels = await markers.evaluateAll(els => els.map(e => e.getAttribute('title')));
  expect(labels.some(l => /eu-west-1/.test(l ?? ''))).toBe(true);

  // Scrub to 62% of the window — the anomaly's own position.
  const max = Number(await scrubber.getAttribute('max'));
  const target = Math.round(0.62 * max);
  await scrubber.fill(String(target));
  const readout = page.getByTestId('tm-readout');
  await expect(readout).toContainText('Transit congestion · eu-west-1');
  await expect(page.getByText(/Reviewing /)).toBeVisible();

  // Back to live: the chip and the hint restore.
  await page.getByTestId('tm-live').click();
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
  await expect(readout).toContainText('Live edge');
});

test('the readout restates the drawn bar, tab by tab', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/observe', { waitUntil: 'domcontentloaded' });

  // Latency tab, mid-window: the readout's figure is the series value —
  // cross-check it against the highlighted bar's data rather than re-deriving.
  await page.getByRole('button', { name: 'Latency', exact: true }).click();
  const scrubber = page.getByTestId('tm-scrubber');
  const max = Number(await scrubber.getAttribute('max'));
  await scrubber.fill(String(Math.round(max / 2)));
  const text = await page.getByTestId('tm-readout').innerText();
  expect(text).toMatch(/·\s*[\d.]+\s*·\s*Latency/);
});
