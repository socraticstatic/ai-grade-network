import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

async function gotoTab(page: any, tab: string) {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.getByText(tab, { exact: true }).first().click();
  await page.waitForTimeout(600);
}

test.describe('RBAC Integrity', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('SoD badge is visible for Aisha Johnson (direct violation)', async ({ page }) => {
    await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="users-table"]', { timeout: 10000 });
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Aisha');
    await page.waitForTimeout(300);
    const aishaRow = page.locator('[data-testid="users-table"] tbody tr').filter({ hasText: 'Aisha' }).first();
    await aishaRow.waitFor({ timeout: 5000 });
    await expect(aishaRow).toContainText(/SoD conflict/i, { timeout: 5000 });
  });

  test('Effective Permissions modal shows Source Assignments section', async ({ page }) => {
    await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="users-table"]', { timeout: 10000 });
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Sarah');
    await page.waitForTimeout(300);
    const row = page.locator('[data-testid="users-table"] tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    const overflow = row.getByRole('button').last();
    await overflow.click();
    await page.waitForTimeout(200);
    await page.getByText('View Effective Permissions').click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/Source Assignments/i)).toBeVisible({ timeout: 5000 });
  });

  test('adding a member to a group emits audit entries for inherited assignments', async ({ page }) => {
    await gotoTab(page, 'Groups');
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 5000 });

    const overflow = rows.first().getByRole('button').last();
    await overflow.click();
    await page.waitForTimeout(200);
    await page.getByText('View Details').click();
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.waitForTimeout(200);

    const picker = page.getByPlaceholder('Search users to add...');
    await expect(picker).toBeVisible({ timeout: 3000 });
    await picker.fill('Wei');
    await page.waitForTimeout(200);

    const candidate = page.locator('button').filter({ hasText: 'Wei Zhang' }).first();
    // Expect the candidate to be visible — if not, the test should fail loudly
    await expect(candidate).toBeVisible({ timeout: 3000 });
    await candidate.click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.waitForTimeout(200);
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody')).toContainText(/Added to group/i, { timeout: 5000 });
  });
});
