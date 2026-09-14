import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

// Navigate to Configure > Users and click the Assignments vertical tab.
async function gotoAssignments(page: any) {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByText('Assignments').click();
  await page.waitForTimeout(500);
}

// Open AssignRoleDrawer from the Assignments tab (user picker first, then select first user).
async function openAssignRoleDrawer(page: any) {
  await page.getByRole('button', { name: /assign role/i }).click();
  // User picker drawer opens first — select the first user.
  await page.waitForSelector('text=Select User to Assign Role', { timeout: 8000 });
  const firstUser = page.locator('button').filter({ hasText: 'Sarah Patel' }).first();
  await firstUser.click();
  // AssignRoleDrawer now opens.
  await page.waitForSelector('text=Assign Role —', { timeout: 8000 });
}

test.describe('RBAC Assignments', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // AssignTest-01
  test('assignments tab loads', async ({ page }) => {
    await gotoAssignments(page);
    // Allow and Deny sub-tab buttons should be visible.
    await expect(page.getByRole('button', { name: /allow/i }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /deny/i }).first()).toBeVisible({ timeout: 8000 });
  });

  // AssignTest-02
  test('allow tab shows active assignments', async ({ page }) => {
    await gotoAssignments(page);
    // Allow is the default sub-tab.
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  // AssignTest-03
  test('assignment table shows role names', async ({ page }) => {
    await gotoAssignments(page);
    await page.waitForTimeout(500);
    const tableBody = page.locator('table tbody');
    await expect(tableBody).toContainText(/TenantAdmin|NetworkEngineer|BillingAdmin|Viewer|OperationsManager/i, { timeout: 8000 });
  });

  // AssignTest-04
  test('assignment table shows scope info', async ({ page }) => {
    await gotoAssignments(page);
    await page.waitForTimeout(500);
    const tableBody = page.locator('table tbody');
    await expect(tableBody).toContainText(/TNT-001|tenant/i, { timeout: 8000 });
  });

  // AssignTest-05
  test('revoke overflow item is present', async ({ page }) => {
    await gotoAssignments(page);
    await page.locator('table tbody tr').first().waitFor({ timeout: 8000 });
    // Open the overflow menu on the first row.
    const overflowBtn = page.locator('table tbody tr').first().getByRole('button').filter({ has: page.locator('svg') }).last();
    await overflowBtn.click();
    await expect(page.getByText('Revoke')).toBeVisible({ timeout: 5000 });
  });

  // AssignTest-06
  test('revoke assignment changes status or removes row', async ({ page }) => {
    await gotoAssignments(page);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const initialCount = await rows.count();

    // Open overflow on first row.
    const overflowBtn = rows.first().getByRole('button').filter({ has: page.locator('svg') }).last();
    await overflowBtn.click();
    await page.getByText('Revoke').click();
    await page.waitForTimeout(800);

    // Either count decreased or a "revoked" status badge appeared somewhere.
    const newCount = await rows.count();
    const tableText = await page.locator('table').textContent() ?? '';
    const revoked = tableText.toLowerCase().includes('revoked');
    expect(newCount < initialCount || revoked).toBeTruthy();
  });

  // AssignTest-07
  test('deny sub-tab shows deny assignments', async ({ page }) => {
    await gotoAssignments(page);
    await page.getByRole('button', { name: /deny/i }).first().click();
    await page.waitForTimeout(500);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // AssignTest-08
  test('deny assignment shows blocked permissions or Thomas Anderson', async ({ page }) => {
    await gotoAssignments(page);
    await page.getByRole('button', { name: /deny/i }).first().click();
    await page.waitForTimeout(500);
    const tableBody = page.locator('table tbody');
    await expect(tableBody).toContainText(/Thomas Anderson|billing/i, { timeout: 8000 });
  });

  // AssignTest-09
  test('lift deny overflow item is present', async ({ page }) => {
    await gotoAssignments(page);
    await page.getByRole('button', { name: /deny/i }).first().click();
    await page.locator('table tbody tr').first().waitFor({ timeout: 8000 });
    const overflowBtn = page.locator('table tbody tr').first().getByRole('button').filter({ has: page.locator('svg') }).last();
    await overflowBtn.click();
    await expect(page.getByText('Lift Deny')).toBeVisible({ timeout: 5000 });
  });

  // AssignTest-10
  test('lift deny changes status', async ({ page }) => {
    await gotoAssignments(page);
    await page.getByRole('button', { name: /deny/i }).first().click();
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const initialCount = await rows.count();

    const overflowBtn = rows.first().getByRole('button').filter({ has: page.locator('svg') }).last();
    await overflowBtn.click();
    await page.getByText('Lift Deny').click();
    await page.waitForTimeout(800);

    const newCount = await rows.count();
    const tableText = await page.locator('table').textContent() ?? '';
    const lifted = tableText.toLowerCase().includes('lifted');
    expect(newCount < initialCount || lifted).toBeTruthy();
  });

  // AssignTest-11
  test('assign role drawer opens from assignments tab', async ({ page }) => {
    await gotoAssignments(page);
    await page.getByRole('button', { name: /assign role/i }).click();
    // User picker drawer should open.
    await expect(page.getByText('Select User to Assign Role')).toBeVisible({ timeout: 8000 });
  });

  // AssignTest-12
  test('role dropdown is populated in assign role drawer', async ({ page }) => {
    await gotoAssignments(page);
    await openAssignRoleDrawer(page);

    const select = page.locator('select').first();
    const options = select.locator('option');
    const count = await options.count();
    // Should have the placeholder + multiple roles.
    expect(count).toBeGreaterThan(3);
    // BC template group should exist.
    await expect(select).toContainText(/Network Engineer|Billing Admin|Tenant Admin/i);
  });

  // AssignTest-13
  test('justification validation fires for short text', async ({ page }) => {
    await gotoAssignments(page);
    await openAssignRoleDrawer(page);

    // Select a role first so the role field is valid.
    await page.locator('select').first().selectOption({ index: 1 });
    await page.waitForTimeout(200);

    // Fill fewer than 20 chars.
    await page.locator('textarea').first().fill('too short');
    // .last() selects the drawer footer button (background "Assign Role" header button also present)
    await page.getByRole('button', { name: /^assign role$/i }).last().click();
    await page.waitForTimeout(300);

    await expect(page.getByText(/at least 20 characters/i)).toBeVisible({ timeout: 5000 });
  });

  // AssignTest-14
  test('expiry date validation fires for past date', async ({ page }) => {
    await gotoAssignments(page);
    await openAssignRoleDrawer(page);

    // Select a role.
    await page.locator('select').first().selectOption({ index: 1 });
    await page.waitForTimeout(200);

    // Set expiry to a past date.
    const pastDate = '2020-01-01';
    await page.locator('input[type="date"]').first().fill(pastDate);

    // Fill valid justification.
    await page.locator('textarea').first().fill('This is a valid justification text that exceeds twenty characters.');

    await page.getByRole('button', { name: /^assign role$/i }).last().click();
    await page.waitForTimeout(300);

    await expect(page.getByText(/expiry must be in the future/i)).toBeVisible({ timeout: 5000 });
  });

  // AssignTest-15
  test('SoD conflict shows warning and disables assign button', async ({ page }) => {
    await gotoAssignments(page);
    // Lisa Martinez (user-4) has BillingAdmin. Selecting SecurityAdmin for her triggers SoD.
    // Open assign for Lisa.
    await page.getByRole('button', { name: /assign role/i }).click();
    await page.waitForSelector('text=Select User to Assign Role', { timeout: 8000 });
    const lisaBtn = page.locator('button').filter({ hasText: 'Lisa Martinez' }).first();
    await lisaBtn.click();
    await page.waitForSelector('text=Assign Role —', { timeout: 8000 });

    // Select SecurityAdmin (conflicts with existing BillingAdmin).
    await page.locator('select').first().selectOption('SecurityAdmin');
    await page.waitForTimeout(500);

    // SoD warning banner should appear.
    await expect(page.getByText(/SoD conflict/i)).toBeVisible({ timeout: 5000 });

    // Assign Role button should be disabled (the drawer's submit button, last in DOM).
    const assignBtn = page.getByRole('button', { name: /^assign role$/i }).last();
    await expect(assignBtn).toBeDisabled({ timeout: 5000 });
  });

  // AssignTest-16
  test('successful role assignment shows toast', async ({ page }) => {
    await gotoAssignments(page);
    await openAssignRoleDrawer(page);

    // Pick a role that won't conflict for Sarah (she has NetworkEngineer; pick Viewer).
    await page.locator('select').first().selectOption('Viewer');
    await page.waitForTimeout(200);

    // Leave scope as default (tenant).
    // Justification — 25+ chars.
    await page.locator('textarea').first().fill('E2E test assignment for verification purposes.');

    // Set a future expiry date.
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().slice(0, 10);
    await page.locator('input[type="date"]').first().fill(futureDateStr);

    // .last() = drawer footer button (page header "Assign Role" button is also present)
    await page.getByRole('button', { name: /^assign role$/i }).last().click();
    await page.waitForTimeout(600);

    // Success toast should appear.
    await expect(page.getByText(/role assigned/i).first()).toBeVisible({ timeout: 6000 });
  });
});
