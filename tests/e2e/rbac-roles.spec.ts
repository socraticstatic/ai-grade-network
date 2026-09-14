import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

// Navigate to Configure > Users, then click the Roles vertical tab.
async function gotoRoleCatalog(page: any) {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByText('Roles').click();
  await page.waitForTimeout(600);
}

test.describe('RBAC Role Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // RoleTest-01
  test('role catalog renders BC template roles', async ({ page }) => {
    await gotoRoleCatalog(page);
    // The sidebar lists BC template roles by displayName.
    await expect(page.getByText('Network Engineer').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Billing Admin').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Viewer').first()).toBeVisible({ timeout: 8000 });
  });

  // RoleTest-02
  test('selecting a role shows permission detail panel', async ({ page }) => {
    await gotoRoleCatalog(page);
    // Click the Network Engineer role in the sidebar.
    await page.getByText('Network Engineer').first().click();
    await page.waitForTimeout(400);
    // The detail panel shows the role title and a Permissions section.
    await expect(page.getByText('Permissions (')).toBeVisible({ timeout: 8000 });
  });

  // RoleTest-03
  test('clone role button opens drawer with custom source', async ({ page }) => {
    await gotoRoleCatalog(page);
    // Select any BC template role.
    await page.getByText('Network Engineer').first().click();
    await page.waitForTimeout(400);
    // Click Clone.
    await page.getByRole('button', { name: /clone/i }).click();
    // Drawer should open showing "Create Custom Role" title.
    await expect(page.getByText('Create Custom Role')).toBeVisible({ timeout: 8000 });
    // Network Engineer's permissions are client-tier — switch to Client tab to see pre-filled state.
    await page.getByRole('dialog').getByRole('button', { name: 'Client' }).click();
    await page.waitForTimeout(300);
    const checkedBoxes = page.locator('input[type="checkbox"]:checked');
    const checkedCount = await checkedBoxes.count();
    expect(checkedCount).toBeGreaterThan(0);
  });

  // RoleTest-04
  test('create custom role via + button appears in sidebar', async ({ page }) => {
    await gotoRoleCatalog(page);
    // Click the + button next to Custom Roles.
    await page.locator('button[title="Create custom role"]').click();
    await page.waitForSelector('text=Create Custom Role', { timeout: 8000 });

    // Fill in role name.
    await page.locator('input[type="text"]').first().fill('E2E Test Role');
    // Fill description.
    await page.locator('textarea').first().fill('An end-to-end test role for automation coverage.');
    // Select at least one permission checkbox.
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    const isChecked = await firstCheckbox.isChecked();
    if (!isChecked) {
      await firstCheckbox.click();
    }

    // Save.
    await page.getByRole('button', { name: /create role/i }).click();
    await page.waitForTimeout(600);

    // New role should appear in sidebar under Custom Roles.
    await expect(page.getByText('E2E Test Role')).toBeVisible({ timeout: 8000 });
  });

  // RoleTest-05
  test('edit custom role updates description', async ({ page }) => {
    await gotoRoleCatalog(page);

    // Create a role to edit.
    await page.locator('button[title="Create custom role"]').click();
    await page.waitForSelector('text=Create Custom Role', { timeout: 8000 });
    await page.locator('input[type="text"]').first().fill('Edit Target Role');
    await page.locator('textarea').first().fill('Original description text.');
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    if (!(await firstCheckbox.isChecked())) {
      await firstCheckbox.click();
    }
    await page.getByRole('button', { name: /create role/i }).click();
    await page.waitForTimeout(600);

    // Select the new role in sidebar.
    await page.getByText('Edit Target Role').first().click();
    await page.waitForTimeout(400);

    // Open overflow and click Edit.
    await page.getByRole('button', { name: 'More options' }).click();
    await page.locator('div[role="menu"] button').filter({ hasText: /^Edit$/ }).click();
    await page.waitForSelector('text=Edit Role —', { timeout: 8000 });

    // Change description.
    await page.locator('textarea').first().fill('Updated description after edit.');
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForTimeout(500);

    // Detail panel should show updated description.
    await expect(page.getByText('Updated description after edit.')).toBeVisible({ timeout: 5000 });
  });

  // RoleTest-06
  test('delete custom role removes it from sidebar', async ({ page }) => {
    await gotoRoleCatalog(page);

    // Create a role to delete.
    await page.locator('button[title="Create custom role"]').click();
    await page.waitForSelector('text=Create Custom Role', { timeout: 8000 });
    await page.locator('input[type="text"]').first().fill('Delete Target Role');
    await page.locator('textarea').first().fill('This role will be deleted.');
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    if (!(await firstCheckbox.isChecked())) {
      await firstCheckbox.click();
    }
    await page.getByRole('button', { name: /create role/i }).click();
    await page.waitForTimeout(600);

    // Select the new role.
    await page.getByText('Delete Target Role').first().click();
    await page.waitForTimeout(400);

    // Open overflow and click Delete.
    await page.getByRole('button', { name: 'More options' }).click();
    await page.locator('div[role="menu"] button').filter({ hasText: /^Delete$/ }).click();
    await page.waitForTimeout(600);

    // Role should no longer appear in sidebar.
    await expect(page.getByText('Delete Target Role')).not.toBeVisible({ timeout: 5000 });
  });
});
