import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

// Navigate to Configure > Users and click the Groups vertical tab.
async function gotoGroups(page: any) {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByText('Groups').click();
  await page.waitForTimeout(600);
}

test.describe('Group Management', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // GroupTest-01
  test('groups tab loads and shows existing groups', async ({ page }) => {
    await gotoGroups(page);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
    // One of the seeded groups should be present.
    const tableBody = page.locator('table tbody');
    await expect(tableBody).toContainText(/Operations Team|Q1 2026 Compliance Audit/i, { timeout: 8000 });
  });

  // GroupTest-02
  test('create group drawer opens with expected fields', async ({ page }) => {
    await gotoGroups(page);
    await page.getByRole('button', { name: /create group/i }).click();
    await page.waitForSelector('text=Create Group', { timeout: 8000 });

    // Drawer should contain Name, Description, and Purpose fields.
    await expect(page.getByText('Name')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Description')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Purpose')).toBeVisible({ timeout: 5000 });
  });

  // GroupTest-03
  test('create group validation fires when required fields empty', async ({ page }) => {
    await gotoGroups(page);
    await page.getByRole('button', { name: /create group/i }).click();
    await page.waitForSelector('text=Create Group', { timeout: 8000 });

    // Click Create Group without filling anything.
    // The button inside the drawer — avoid matching the trigger button.
    await page.getByRole('button', { name: /^create group$/i }).last().click();
    await page.waitForTimeout(300);

    // Name is required — validation error should appear.
    await expect(page.getByText(/name is required/i)).toBeVisible({ timeout: 5000 });
  });

  // GroupTest-04
  test('create group with organizational purpose appears in list', async ({ page }) => {
    await gotoGroups(page);
    const rows = page.locator('table tbody tr');
    const initialCount = await rows.count();

    await page.getByRole('button', { name: /create group/i }).click();
    await page.waitForSelector('text=Create Group', { timeout: 8000 });

    // Fill name.
    await page.locator('input[type="text"]').first().fill('E2E Test Group');
    // Fill description.
    await page.locator('textarea').first().fill('Test group created by Playwright.');
    // Purpose defaults to Organizational — leave it as is.
    // Scope ceiling comes from ScopePicker default (TNT-001) — leave it.

    await page.getByRole('button', { name: /^create group$/i }).last().click();
    await page.waitForTimeout(600);

    // Group should appear in the table.
    const newCount = await rows.count();
    expect(newCount).toBe(initialCount + 1);
    await expect(page.locator('table tbody')).toContainText('E2E Test Group', { timeout: 8000 });
  });

  // GroupTest-05
  test('suspend group changes status badge to suspended', async ({ page }) => {
    await gotoGroups(page);
    await page.locator('table tbody tr').first().waitFor({ timeout: 8000 });

    // Open overflow on first active group.
    const overflowBtn = page.locator('table tbody tr').first().getByRole('button').filter({ has: page.locator('svg') }).last();
    await overflowBtn.click();
    await page.getByText('Suspend').click();
    await page.waitForTimeout(600);

    // A "suspended" status badge should be visible in the table.
    await expect(page.locator('table tbody')).toContainText(/suspended/i, { timeout: 6000 });
  });
});
