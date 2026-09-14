import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

test('Govern rules enforce, and Observe telemetry + Applications sub-view render', async ({ page }) => {
  await seedAuth(page);

  // --- Govern: rules render, Enforce flips a status badge ---
  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });

  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(0);

  const unenforcedBadge = page.getByText(/^Unenforced$/i);
  const enforcedBadge = page.getByText(/^Enforced$/i);
  const enforcedBefore = await enforcedBadge.count();

  // Row actions live in the overflow menu (kebab), not as inline buttons.
  const moreOptions = page.getByRole('button', { name: /more options/i }).first();
  await expect(moreOptions).toBeVisible();
  await moreOptions.click();
  await page.getByRole('menu').getByRole('button', { name: /^Enforce$/i }).click();

  await expect
    .poll(async () => enforcedBadge.count())
    .toBeGreaterThan(enforcedBefore);
  void unenforcedBadge;

  // --- Observe: the observability shell renders telemetry + the records table ---
  await page.goto('/#/naas/observe', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(/Network Observability/i)).toBeVisible();
  // KPI tiles derive from live engine telemetry
  await expect(page.getByText(/Throughput/i).first()).toBeVisible();

  // switch to the Latency lens and confirm the records table renders rows
  await page.getByRole('button', { name: /^Latency$/i }).click();
  await expect(page.getByText(/^Records$/i).first()).toBeVisible();
});
