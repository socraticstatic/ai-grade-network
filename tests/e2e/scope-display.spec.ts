import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

// Navigate to Configure > Users and switch to the Roles tab.
// The RoleCatalog component shows BC template roles in a sidebar + detail panel.
async function gotoRoles(page: any) {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  // Wait for UserList to mount (invite button is always present there)
  await page.waitForSelector('[data-testid="invite-user-button"]', { timeout: 10000 });
  // Click the Roles vertical tab
  await page.getByRole('button', { name: /^roles$/i }).click();
  // Wait for RoleCatalog sidebar to render
  await page.waitForSelector('text=Business Center Templates', { timeout: 8000 });
}

test.describe('Role Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('roles tab shows BC template sidebar', async ({ page }) => {
    await gotoRoles(page);

    // BC template section header is visible
    await expect(page.getByText('Business Center Templates')).toBeVisible();
    // Custom Roles section header is visible (.first() avoids strict mode with sibling text)
    await expect(page.getByText('Custom Roles', { exact: true }).first()).toBeVisible();
  });

  test('roles sidebar lists standard role names', async ({ page }) => {
    await gotoRoles(page);

    // Several BC template roles should appear in the sidebar (scope to main content to avoid DemoBar buttons)
    const main = page.locator('#main-content');
    await expect(main.getByRole('button', { name: 'Network Engineer', exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Tenant Admin', exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Viewer', exact: true })).toBeVisible();
  });

  test('first role is selected by default and shows detail panel', async ({ page }) => {
    await gotoRoles(page);

    // Network Engineer is first in catalog; its name should appear in the detail panel heading
    await expect(page.getByRole('heading', { name: /Network Engineer/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('clicking a different role updates the detail panel', async ({ page }) => {
    await gotoRoles(page);

    // Click Billing Admin in the sidebar
    await page.getByRole('button', { name: 'Billing Admin' }).click();
    await page.waitForTimeout(300);

    // Detail panel should now show "Billing Admin"
    await expect(page.getByRole('heading', { name: /Billing Admin/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('detail panel shows permissions count', async ({ page }) => {
    await gotoRoles(page);

    // Network Engineer detail panel shows "Permissions (N)"
    await expect(page.getByText(/Permissions \(\d+\)/)).toBeVisible({ timeout: 8000 });
  });

  test('detail panel shows max scope tier badge', async ({ page }) => {
    await gotoRoles(page);

    // Every role has a max scope tier badge ("Max: tenant" or similar)
    await expect(page.getByText(/Max:/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('Edit Permissions and Clone buttons are visible for BC templates', async ({ page }) => {
    await gotoRoles(page);

    // TenantAdmin (emilio-estevez) has role:write, so Edit Permissions and Clone appear
    await expect(page.getByRole('button', { name: /Edit Permissions/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /Clone/i })).toBeVisible({ timeout: 8000 });
  });

  test('Tenant Admin role shows security policy content', async ({ page }) => {
    await gotoRoles(page);

    await page.getByRole('button', { name: 'Tenant Admin' }).click();
    await page.waitForTimeout(300);

    // The detail panel should list permission groups
    await expect(page.getByRole('heading', { name: /Tenant Admin/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Permissions \(\d+\)/)).toBeVisible({ timeout: 5000 });
  });

  test('SoD constraints shown for relevant roles', async ({ page }) => {
    await gotoRoles(page);

    // TenantAdmin has SoD constraint with PlatformAdmin (sod-1)
    await page.getByRole('button', { name: 'Tenant Admin' }).click();
    await page.waitForTimeout(300);

    // SoD section should appear
    await expect(page.getByText(/SoD Constraints/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Cannot be held with/i)).toBeVisible({ timeout: 5000 });
  });

  test('Create custom role button opens drawer', async ({ page }) => {
    await gotoRoles(page);

    // The "+" button next to "Custom Roles" creates a new role
    // It's a small Plus icon button; click it
    const plusBtn = page.locator('button[title="Create custom role"]');
    await expect(plusBtn).toBeVisible({ timeout: 5000 });
    await plusBtn.click();
    await page.waitForTimeout(400);

    // "Create Custom Role" drawer should open
    await expect(page.getByText('Create Custom Role')).toBeVisible({ timeout: 5000 });
  });
});
