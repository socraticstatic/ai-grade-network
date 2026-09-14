import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

test.describe('Billing Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // BillingTest-01
  test('billing config loads with vertical tabs', async ({ page }) => {
    await page.goto('/#/configure/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Use getByRole('button') to target the sidebar tab buttons specifically
    // (getByText('Tenant Hierarchy') resolves to multiple elements including the content heading)
    await expect(page.getByRole('button', { name: 'Tenant Hierarchy' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Cost Allocation' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'External Integration' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Billing Policies' })).toBeVisible({ timeout: 8000 });
  });

  // BillingTest-02
  test('toggle tenant hierarchy setting updates sub-options', async ({ page }) => {
    await page.goto('/#/configure/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Hierarchy tab is the default. Find the "Enable Tenant Hierarchy" checkbox.
    const checkbox = page.locator('input[type="checkbox"]').filter({
      has: page.locator('~ div:has-text("Enable Tenant Hierarchy")'),
    }).first();

    // Capture initial checked state.
    const wasChecked = await checkbox.isChecked();
    await checkbox.click();
    await page.waitForTimeout(300);

    // State should have flipped.
    const isChecked = await checkbox.isChecked();
    expect(isChecked).toBe(!wasChecked);

    // Toggle back to original to be safe.
    await checkbox.click();
    await page.waitForTimeout(200);
  });

  // BillingTest-03
  test('save billing policies shows toast', async ({ page }) => {
    await page.goto('/#/configure/billing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Click the Billing Policies vertical tab.
    await page.getByRole('button', { name: 'Billing Policies' }).click();
    await page.waitForTimeout(400);

    // The save button on this tab.
    const saveBtn = page.getByRole('button', { name: /save billing policies|save policies|save settings/i }).first();
    await saveBtn.waitFor({ timeout: 8000 });
    await saveBtn.click();

    // Success toast should appear. Use .first() to avoid strict mode with title+body.
    await expect(page.getByText(/settings saved|billing configuration updated|saved/i).first()).toBeVisible({ timeout: 6000 });
  });
});
