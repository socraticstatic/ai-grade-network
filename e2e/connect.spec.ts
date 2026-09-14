import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

test('Connect renders the cloud fabric; the Paths table + Steer live on Observe', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });

  // Connect renders the fabric hero: at least one region node from the model.
  const nodes = page.locator('[data-fabric-node]');
  await expect(nodes.first()).toBeVisible();
  expect(await nodes.count()).toBeGreaterThan(0);

  // The Flows & paths table moved to Observe — it is no longer on Connect.
  await expect(page.getByText('Flows & paths')).toHaveCount(0);

  // Observe: the relocated Paths table renders rows, and Steer moves a flow
  // under AT&T control (engine wiring unchanged, only the mount location moved).
  await page.goto('/#/naas/observe', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Flows & paths')).toBeVisible();

  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(0);

  const controlledBadge = page.getByText(/AT&T-controlled/i);
  const before = await controlledBadge.count();

  const steerButton = page.getByRole('button', { name: /^Steer$/i }).first();
  await steerButton.click();

  await expect
    .poll(async () => controlledBadge.count())
    .toBeGreaterThan(before);
});
