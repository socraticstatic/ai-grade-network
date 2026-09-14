import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * The Tasks office: one queue by lifecycle stage, promises managed here,
 * the picture on Discover, the badge beside the bell. Walked as a person
 * walks it.
 */

test('the office lists the queue by stage and manages a declared promise', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/tasks', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('work-page')).toBeVisible();

  // The seeded estate has advisor work waiting at Connect and Cost.
  await expect(page.getByTestId('work-stage-connect')).toBeVisible();
  await expect(page.getByTestId('work-stage-cost')).toBeVisible();
  await expect(page.getByTestId('work-summary')).toContainText(/task/);

  // Declare from the office's own picker; the promise joins Govern.
  await page.getByTestId('intent-declare-open').click();
  await page.getByTestId('declare-item-threat-aware-routing').click();
  await expect(page.getByTestId('work-stage-govern')).toBeVisible();

  // Synchronize hands the repair to the twin on Discover.
  const sync = page.locator('[data-testid^="work-sync-"]').first();
  await sync.click();
  await expect(page).toHaveURL(/#\/discover\?draft=intent-/);
  await expect(page.getByTestId('design-tray')).toBeVisible();
});

test('Discover keeps the picture; management points at Tasks; the badge rides the bell cluster', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    (window as unknown as { CC: { declareIntent: (k: string, s: object, m: string) => unknown } }).CC
      .declareIntent('private-inference', { kind: 'estate', id: 'ai', label: 'The token layer' }, 'watch');
  });

  const row = page.locator('[data-testid^="intent-row-"]').first();
  await expect(row).toBeVisible();
  // Picture only: no picker, no mode toggle, no remove on Discover.
  await expect(page.getByTestId('intent-declare-open')).toHaveCount(0);
  await expect(page.locator('[data-testid^="intent-mode-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="intent-remove-"]')).toHaveCount(0);

  await page.getByTestId('intent-manage-link').click();
  await expect(page).toHaveURL(/#\/tasks/);
  await expect(page.locator('[data-testid^="intent-mode-"]').first()).toBeVisible();

  // Tasks is utility state, not a place: three tabs, and a live badge.
  const tabs = page.getByLabel('Main navigation').getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(1)).toHaveText('NaaS');
  const badge = page.getByTestId('tasks-badge-count');
  await expect(badge).toBeVisible();
  // A violated promise turns the badge red - declared above, so it is.
  await expect(badge).toHaveAttribute('data-violated', 'true');
});
