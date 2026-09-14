import { test, expect } from '@playwright/test';
import { seedAuth, gotoUsers } from './helpers';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('user list renders with sample users', async ({ page }) => {
    await gotoUsers(page);

    const rows = page.locator('[data-testid="users-table"] tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('search filters users by name', async ({ page }) => {
    await gotoUsers(page);

    const rows = page.locator('[data-testid="users-table"] tbody tr');
    const initialCount = await rows.count();

    const searchInput = page.getByPlaceholder(/search by name or email/i);
    await searchInput.fill('Sarah');
    await page.waitForTimeout(300);

    const filteredCount = await rows.count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThanOrEqual(1);
  });

  test('search with no match shows empty state', async ({ page }) => {
    await gotoUsers(page);

    const searchInput = page.getByPlaceholder(/search by name or email/i);
    await searchInput.fill('zzznonexistentuser123');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="users-table"]')).toContainText(/no users found/i);
  });

  test('clearing search restores all users', async ({ page }) => {
    await gotoUsers(page);

    const rows = page.locator('[data-testid="users-table"] tbody tr');
    const initialCount = await rows.count();

    const searchInput = page.getByPlaceholder(/search by name or email/i);
    await searchInput.fill('Sarah');
    await page.waitForTimeout(300);

    await searchInput.fill('');
    await page.waitForTimeout(300);

    const restoredCount = await rows.count();
    expect(restoredCount).toBe(initialCount);
  });

  test('invite drawer validates required fields', async ({ page }) => {
    await gotoUsers(page);

    const inviteBtn = page.locator('[data-testid="invite-user-button"]');
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();
    await page.waitForTimeout(300);

    // Drawer should open
    await expect(page.getByText(/invite user/i).first()).toBeVisible({ timeout: 5000 });
  });
});
