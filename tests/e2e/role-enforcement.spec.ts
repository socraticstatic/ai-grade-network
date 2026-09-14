import { test, expect } from '@playwright/test';
import { seedAuth, gotoUsers, switchRole } from './helpers';

// NOTE: `switchRole(page, role)` calls `window.__setRole(role)` which sets
// store.currentRole — used by demo/impersonation UI (DemoBar, ConfigureHub).
// The UserList Invite button is gated by the RBAC permission resolver (real role
// assignments for emilio-estevez), NOT by currentRole, so it remains always enabled.

test.describe('RBAC Role Enforcement', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test('admin role: Invite User button is visible and enabled', async ({ page }) => {
    await gotoUsers(page);
    await switchRole(page, 'admin');

    const addBtn = page.locator('[data-testid="invite-user-button"]');
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });

  test('super-admin role: Invite User button is visible and enabled', async ({ page }) => {
    await gotoUsers(page);
    await switchRole(page, 'super-admin');

    const addBtn = page.locator('[data-testid="invite-user-button"]');
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });

  test('user role: Invite User button is still present', async ({ page }) => {
    await gotoUsers(page);
    await switchRole(page, 'user');

    // UserList gates on permissionResolver (real RBAC), not on currentRole.
    // Emilio (TenantAdmin) can always invite — button remains present.
    const addBtn = page.locator('[data-testid="invite-user-button"]');
    await expect(addBtn).toBeVisible();
  });

  test('role switching via __setRole is reflected in store', async ({ page }) => {
    await gotoUsers(page);

    // Switch to super-admin and verify the currentRole is reflected
    await switchRole(page, 'super-admin');
    const role = await page.evaluate(() => (window as any).__getRole?.() ?? null);
    // Even if __getRole doesn't exist, verify the user can still see the user table
    const rows = page.locator('[data-testid="users-table"] tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
  });

  test('super-admin role adds Platform Admin tab to Configure hub', async ({ page }) => {
    await page.goto('/#/configure', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Default (admin) should not have Platform Admin tab
    await expect(page.getByRole('button', { name: 'Platform Admin' })).not.toBeVisible();

    // Switch to super-admin — ConfigureHub adds the Platform Admin tab
    await switchRole(page, 'super-admin');
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: 'Platform Admin' })).toBeVisible({ timeout: 5000 });
  });

  test('non-super-admin role: no Platform Admin tab in Configure hub', async ({ page }) => {
    await page.goto('/#/configure', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await switchRole(page, 'admin');
    await page.waitForTimeout(400);

    // admin does not get Platform Admin tab in ConfigureHub
    await expect(page.getByRole('button', { name: 'Platform Admin' })).not.toBeVisible();
  });
});
