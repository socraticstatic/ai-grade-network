import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * Pure Discovery — the "+ Connect a cloud" workflow.
 * Walk the wizard for AWS: pick provider → paste a placeholder IAM role ARN →
 * run the simulated scan → watch it complete → the estate reflects it. Also
 * assert the AT&T fabric on-ramp rail is gone from Discover (relocated to
 * Connect).
 */
test('connect-a-cloud wizard runs a simulated scan and reveals the estate', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  // The fabric on-ramp rail no longer lives on Discover.
  await expect(page.locator('aside[aria-label="AT&T fabric on-ramps"]')).toHaveCount(0);

  // Connection-state indicators are present on the rows.
  await expect(page.getByText('via the AT&T fabric').first()).toBeVisible();
  await expect(page.getByText('public internet').first()).toBeVisible();

  // Open the wizard.
  await page.getByRole('button', { name: /connect a cloud/i }).click();
  const dialog = page.getByRole('dialog', { name: /connect a cloud/i });
  await expect(dialog).toBeVisible();

  // Step 1 — pick AWS, advance.
  await dialog.getByText('AWS', { exact: true }).click();
  await dialog.getByRole('button', { name: /^next$/i }).click();

  // Step 2 — paste the placeholder IAM role ARN; Discover unlocks.
  const run = page.getByTestId('discover-run');
  await expect(run).toBeDisabled();
  await dialog.getByLabel(/IAM role ARN/i).fill('arn:aws:iam::123456789012:role/CloudConnectDiscovery');
  await expect(run).toBeEnabled();

  // Step 3 — run the simulated scan; a deterministic step is shown.
  await run.click();
  await expect(page.getByText(/Scanning us-east-1… found 3 VPCs, 14 subnets/)).toBeVisible();

  // Step 4 — the scan completes on its own.
  const finish = page.getByTestId('discover-finish');
  await expect(finish).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('scan-summary')).toContainText('AWS');
  await finish.click();

  // Wizard closes and the tree reflects the discovered cloud (AWS expanded).
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'us-east-1' })).toBeVisible();
});
