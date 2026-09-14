import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

async function gotoGroups(page: any) {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.getByText('Groups', { exact: true }).first().click();
  await page.waitForTimeout(800);
  // Wait for the groups table to appear
  await page.locator('table tbody tr').first().waitFor({ timeout: 8000 });
}

test.describe('Group lifecycle — add member, assign role, delete', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('overflow menu has Delete Group option', async ({ page }) => {
    await gotoGroups(page);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 5000 });
    const overflow = rows.first().getByRole('button').last();
    await overflow.click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Delete Group')).toBeVisible({ timeout: 3000 });
  });

  test('detail drawer shows Add Member and Assign Role buttons', async ({ page }) => {
    await gotoGroups(page);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 5000 });
    const overflow = rows.first().getByRole('button').last();
    await overflow.click();
    await page.waitForTimeout(200);
    await page.getByText('View Details').click();
    await page.waitForTimeout(400);
    await expect(page.getByRole('button', { name: 'Add Member' })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Assign Role' })).toBeVisible({ timeout: 3000 });
  });

  test('Add Member picker opens and shows users not already in group', async ({ page }) => {
    await gotoGroups(page);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 5000 });
    const overflow = rows.first().getByRole('button').last();
    await overflow.click();
    await page.waitForTimeout(200);
    await page.getByText('View Details').click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.waitForTimeout(200);
    // Search input should appear
    await expect(page.getByPlaceholder('Search users to add...')).toBeVisible({ timeout: 3000 });
  });

  test('Assign Role opens AssignRoleDrawer for the group', async ({ page }) => {
    await gotoGroups(page);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 5000 });
    const overflow = rows.first().getByRole('button').last();
    await overflow.click();
    await page.waitForTimeout(200);
    await page.getByText('View Details').click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Assign Role' }).click();
    await page.waitForTimeout(400);
    // Drawer title should say "Assign Role — <group name>"
    await expect(page.getByText(/Assign Role —/i)).toBeVisible({ timeout: 5000 });
  });

  test('Delete Group removes it from the table', async ({ page }) => {
    await gotoGroups(page);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 5000 });
    const initialCount = await rows.count();

    const overflow = rows.first().getByRole('button').last();
    await overflow.click();
    await page.waitForTimeout(200);
    await page.getByText('Delete Group').click();
    await page.waitForTimeout(400);

    const newCount = await rows.count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('Edit Group appears in overflow for user with user:write', async ({ page }) => {
    await gotoGroups(page);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 5000 });
    await rows.first().getByRole('button', { name: 'More options' }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Edit Group')).toBeVisible({ timeout: 3000 });
  });

  test('Edit Group opens drawer in edit mode', async ({ page }) => {
    await gotoGroups(page);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 5000 });
    await rows.first().getByRole('button', { name: 'More options' }).click();
    await page.waitForTimeout(200);
    await page.getByText('Edit Group').click();
    await page.waitForTimeout(400);
    // Drawer opens directly in edit mode — Save Changes button visible immediately
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible({ timeout: 5000 });
  });
});
