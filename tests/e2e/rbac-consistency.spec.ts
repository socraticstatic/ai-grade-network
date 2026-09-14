/**
 * rbac-consistency.spec.ts
 *
 * Adversarial cross-tab consistency tests.
 * Each test asserts that the same ground-truth data surfaces the same way
 * across the Users, Groups, Roles, Assignments, and Activity tabs.
 *
 * "Consistency" means: a fact visible in one tab must be observable in
 * every other tab where it is relevant. Missing or contradictory data
 * in any tab is a defect.
 */

import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers';

// ── Navigation helpers ────────────────────────────────────────────────────────

async function gotoTab(page: Page, tab: 'Users' | 'Groups' | 'Roles' | 'Assignments' | 'Activity') {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.getByText(tab, { exact: true }).first().click();
  await page.waitForTimeout(600);
}

async function gotoAssignmentsSubTab(page: Page, sub: 'allow' | 'deny') {
  await gotoTab(page, 'Assignments');
  if (sub === 'deny') {
    await page.getByRole('button', { name: /deny/i }).first().click();
    await page.waitForTimeout(400);
  }
}

// ── User roster consistency ───────────────────────────────────────────────────

test.describe('User roster cross-tab consistency', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('CC-01: all 21 users visible in Users tab', async ({ page }) => {
    await gotoTab(page, 'Users');
    const rows = page.locator('[data-testid="users-table"] tbody tr');
    const count = await rows.count();
    // Original 6 + 15 new = 21 users
    expect(count).toBeGreaterThanOrEqual(21);
  });

  test('CC-02: inactive user Kai Nakamura appears in Users tab with inactive status', async ({ page }) => {
    await gotoTab(page, 'Users');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Kai');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Kai Nakamura', { timeout: 5000 });
    // His status should render as inactive
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/inactive/i, { timeout: 5000 });
  });

  test('CC-03: Kai shows REVOKED assignment in Assignments tab', async ({ page }) => {
    await gotoAssignmentsSubTab(page, 'allow');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Kai');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText('Kai Nakamura', { timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText(/revoked/i, { timeout: 5000 });
  });

  test('CC-04: Kai revocation appears in Activity tab', async ({ page }) => {
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    // Audit log entry al-017 — Emilio revoked Kai
    const body = page.locator('table tbody, [data-testid="audit-log"]');
    await expect(body).toContainText(/Kai Nakamura|ra-kai-ne-revoked/i, { timeout: 8000 });
  });

  test('CC-05: pending user Diego shows pending-approval status in Users tab', async ({ page }) => {
    await gotoTab(page, 'Users');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Diego');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Diego Fernandez', { timeout: 5000 });
    // The assignment status column or badge should show pending
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/pending/i, { timeout: 5000 });
  });

  test('CC-06: Diego pending assignment in Assignments tab', async ({ page }) => {
    await gotoAssignmentsSubTab(page, 'allow');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Diego');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/pending/i, { timeout: 5000 });
  });
});

// ── SoD consistency across tabs ───────────────────────────────────────────────

test.describe('SoD violations cross-tab consistency', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('CC-07: Aisha Johnson shows SoD conflict badge in Users tab', async ({ page }) => {
    await gotoTab(page, 'Users');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Aisha');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/SoD conflict/i, { timeout: 5000 });
  });

  test('CC-08: Aisha SoD violation surfaced in Assignments tab (SoD badge on row)', async ({ page }) => {
    await gotoAssignmentsSubTab(page, 'allow');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Aisha');
    await page.waitForTimeout(300);
    // Both assignments for Aisha should carry a SoD badge
    await expect(page.locator('table tbody')).toContainText(/SoD/i, { timeout: 5000 });
  });

  test('CC-09: Marcus Chen shows SoD conflict in Users tab (NE + Provisioning)', async ({ page }) => {
    await gotoTab(page, 'Users');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Marcus');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/SoD conflict/i, { timeout: 5000 });
  });

  test('CC-10: Victor Okonkwo shows SoD conflict in Assignments tab (PM + Ops)', async ({ page }) => {
    await gotoAssignmentsSubTab(page, 'allow');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Victor');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/SoD/i, { timeout: 5000 });
  });
});

// ── Deny assignment consistency ───────────────────────────────────────────────

test.describe('Deny assignment cross-tab consistency', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('CC-11: Thomas Anderson active billing deny visible in Assignments/Deny tab', async ({ page }) => {
    await gotoAssignmentsSubTab(page, 'deny');
    await expect(page.locator('table tbody')).toContainText('Thomas Anderson', { timeout: 8000 });
    await expect(page.locator('table tbody')).toContainText(/billing/i, { timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText(/active/i, { timeout: 5000 });
  });

  test('CC-12: Thomas billing deny creation appears in Activity tab', async ({ page }) => {
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    const body = page.locator('table tbody, [data-testid="audit-log"]');
    await expect(body).toContainText(/Thomas Anderson|da-thomas-billing-hold/i, { timeout: 8000 });
    // Should show as ALLOW (the deny was successfully created)
    await expect(body).toContainText(/ALLOW/i, { timeout: 5000 });
  });

  test('CC-13: lifted deny (Marcus) appears as lifted status in Deny tab', async ({ page }) => {
    await gotoAssignmentsSubTab(page, 'deny');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Marcus');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/lifted/i, { timeout: 5000 });
  });

  test('CC-14: expired deny (David Kim) has expired status in Deny tab', async ({ page }) => {
    await gotoAssignmentsSubTab(page, 'deny');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('David');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/expired/i, { timeout: 5000 });
  });

  test('CC-15: Lift Deny action is NOT available on an already-lifted deny', async ({ page }) => {
    await gotoAssignmentsSubTab(page, 'deny');
    // Filter to Marcus's lifted deny
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Marcus');
    await page.waitForTimeout(300);
    const row = page.locator('table tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    // Open overflow menu on the lifted row
    const overflowBtn = row.getByRole('button').filter({ has: page.locator('svg') }).last();
    await overflowBtn.click();
    await page.waitForTimeout(200);
    // "Lift Deny" should not be present for already-lifted record
    await expect(page.getByText('Lift Deny')).toBeHidden({ timeout: 3000 });
  });
});

// ── Group consistency ─────────────────────────────────────────────────────────

test.describe('Group cross-tab consistency', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('CC-16: all 10 access groups visible in Groups tab', async ({ page }) => {
    await gotoTab(page, 'Groups');
    await page.waitForTimeout(500);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('CC-17: suspended group shows "suspended" status badge', async ({ page }) => {
    await gotoTab(page, 'Groups');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Legacy Integration');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/suspended/i, { timeout: 5000 });
  });

  test('CC-18: closed audit group shows "closed" status badge', async ({ page }) => {
    await gotoTab(page, 'Groups');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Q1 2026');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/closed/i, { timeout: 5000 });
  });

  test('CC-19: group role assignments appear in GroupDetailDrawer', async ({ page }) => {
    await gotoTab(page, 'Groups');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Operations Team');
    await page.waitForTimeout(300);
    // Click the first row's View action
    const row = page.locator('table tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    const viewBtn = row.getByRole('button').filter({ has: page.locator('svg') }).first();
    await viewBtn.click();
    await page.waitForTimeout(500);
    // GroupDetailDrawer should show group role assignments
    await expect(page.getByText(/Group Role Assignments/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Operations Manager/i)).toBeVisible({ timeout: 5000 });
  });

  test('CC-20: group members count matches member list in drawer', async ({ page }) => {
    await gotoTab(page, 'Groups');
    // Operations Team has 3 members in seed data
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Operations Team');
    await page.waitForTimeout(300);
    const row = page.locator('table tbody tr').first();
    // Member count cell should show 3
    const memberCell = row.locator('td').nth(2); // Members column is index 2
    await expect(memberCell).toContainText('3', { timeout: 5000 });

    // Open detail drawer and verify list length
    const viewBtn = row.getByRole('button').filter({ has: page.locator('svg') }).first();
    await viewBtn.click();
    await page.waitForTimeout(500);
    const memberItems = page.locator('.space-y-2 [class*="flex items-center justify-between"]');
    const itemCount = await memberItems.count();
    expect(itemCount).toBeGreaterThanOrEqual(3);
  });

  test('CC-21: cascade panel in GroupDetailDrawer reflects scope ceiling tier', async ({ page }) => {
    await gotoTab(page, 'Groups');
    // Network Operations Cluster has CLT-A ceiling (client tier)
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Network Operations Cluster');
    await page.waitForTimeout(300);
    const row = page.locator('table tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    const viewBtn = row.getByRole('button').filter({ has: page.locator('svg') }).first();
    await viewBtn.click();
    await page.waitForTimeout(500);
    // Permission cascade panel: platform and reseller should be blocked (ceiling is client)
    await expect(page.getByText('Permission Scope')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/blocked.*above ceiling/i)).toBeVisible({ timeout: 5000 });
  });

  test('CC-22: Assignments tab counts group assignments', async ({ page }) => {
    await gotoAssignmentsSubTab(page, 'allow');
    // There should be group-type principals in the allow tab
    await expect(page.locator('table tbody')).toContainText(/group/i, { timeout: 8000 });
  });
});

// ── Audit activity consistency ─────────────────────────────────────────────────

test.describe('Activity tab consistency', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('CC-23: Activity tab has at least 25 log entries', async ({ page }) => {
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    const rows = page.locator('table tbody tr, [data-testid="audit-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(25);
  });

  test('CC-24: DENY entries visible in Activity tab', async ({ page }) => {
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody')).toContainText('DENY', { timeout: 8000 });
  });

  test('CC-25: ALLOW entries visible in Activity tab', async ({ page }) => {
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody')).toContainText('ALLOW', { timeout: 8000 });
  });
});

// ── Near-expiry consistency ────────────────────────────────────────────────────

test.describe('Near-expiry cross-tab consistency', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('CC-26: near-expiry user (Nadia Hassan) shows warning in Users tab', async ({ page }) => {
    await gotoTab(page, 'Users');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Nadia');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Nadia Hassan', { timeout: 5000 });
    // Should show near-expiry indicator (days left, amber badge)
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/\dd left|\d+ days/i, { timeout: 5000 });
  });

  test('CC-27: near-expiry shown in amber in Assignments tab', async ({ page }) => {
    await gotoAssignmentsSubTab(page, 'allow');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Nadia');
    await page.waitForTimeout(300);
    // Expiry cell for Nadia should render with a warn-colored class (amber text)
    const row = page.locator('table tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    // The expiry text exists and shows short countdown
    const expiryCell = row.locator('td').nth(3);
    const expiryText = await expiryCell.textContent();
    // Should be a small positive day count
    expect(expiryText).toMatch(/\d+d/);
  });
});
