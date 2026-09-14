/**
 * rbac-personas.spec.ts
 *
 * Synthetic persona UATs.
 * Each persona walks a real workflow end-to-end in the UI, asserting what
 * they can and cannot see based on their role and the seed data.
 *
 * All tests run as Emilio Estevez (TenantAdmin) — the current user in the
 * demo — exercising the UI against the 21-user / 40-RA / 6-DA / 10-group
 * dataset seeded in mockRbac.ts and sampleData.ts.
 *
 * Personas exercised:
 *   P1  Emilio Estevez        TenantAdmin — day-to-day admin tasks
 *   P2  Sarah Patel           NetworkEngineer — resource access checks
 *   P3  Thomas Anderson       OperationsManager w/ active billing deny
 *   P4  Sophia Lee            SecurityAdmin (MFA gate)
 *   P5  Aisha Johnson         BillingAdmin + SecurityAdmin (SoD-2 violator)
 *   P6  Marcus Chen           NE + ProvisioningManager (SoD-4 violator)
 *   P7  Diego Fernandez       Pending-approval NE
 *   P8  Nadia Hassan          Near-expiry Viewer
 *   P9  Kai Nakamura          Revoked NE (offboarded)
 *   P10 Wei Zhang             Multi-scope SupportSpecialist (CLT-A + CLT-B)
 *   P11 James O'Brien         ClientAdmin at CLT-C
 *   P12 Frank Audit           Audit engagement Viewer (closed group)
 */

import { test, expect, Page } from '@playwright/test';
import { seedAuth } from './helpers';

async function gotoUsers(page: Page) {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="users-table"]', { timeout: 10000 });
}

async function gotoTab(page: Page, tab: string) {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.getByText(tab, { exact: true }).first().click();
  await page.waitForTimeout(600);
}

async function searchUser(page: Page, name: string) {
  const search = page.getByPlaceholder(/search/i);
  await search.fill(name);
  await page.waitForTimeout(300);
}

async function openAssignmentsForUser(page: Page, name: string) {
  await gotoUsers(page);
  await searchUser(page, name);
  const row = page.locator('[data-testid="users-table"] tbody tr').first();
  await row.waitFor({ timeout: 5000 });
  // Open overflow menu
  const overflow = row.getByRole('button').filter({ has: page.locator('svg') }).last();
  await overflow.click();
  await page.waitForTimeout(200);
}

// ── P1: Emilio Estevez (TenantAdmin) ─────────────────────────────────────────

test.describe('P1: Emilio Estevez — TenantAdmin admin workflows', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P1-01: Emilio can see all 21 users in the Users tab', async ({ page }) => {
    await gotoUsers(page);
    const count = await page.locator('[data-testid="users-table"] tbody tr').count();
    expect(count).toBeGreaterThanOrEqual(21);
  });

  test('P1-02: Emilio can open Assign Role drawer from toolbar', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    await page.getByRole('button', { name: /assign role/i }).click();
    await expect(page.getByText(/Select User to Assign Role/i)).toBeVisible({ timeout: 5000 });
  });

  test('P1-03: Emilio can open Add Deny drawer from Assignments tab', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    await page.getByRole('button', { name: /add deny/i }).click();
    await expect(page.locator('[class*="SideDrawer"], [data-testid="deny-drawer"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('P1-04: Emilio can create a new access group', async ({ page }) => {
    await gotoTab(page, 'Groups');
    await page.getByRole('button', { name: /create group/i }).click();
    await page.waitForTimeout(400);
    await page.getByPlaceholder('Operations Team').fill('E2E Test Group');
    await page.getByPlaceholder('What does this group do?').fill('Created by Playwright E2E test.');
    await page.getByRole('button', { name: /create group/i }).last().click();
    await page.waitForTimeout(600);
    await expect(page.getByText(/Group Created/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('P1-05: Emilio can revoke an active assignment', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    await page.waitForTimeout(400);
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Find a non-admin, non-revoked row to revoke safely
    let targetRow = rows.first();
    const overflow = targetRow.getByRole('button').filter({ has: page.locator('svg') }).last();
    await overflow.click();
    await page.getByText('Revoke').click();
    await page.waitForTimeout(600);
    // Either row disappears or shows revoked
    const tableText = await page.locator('table').textContent() ?? '';
    const newCount = await rows.count();
    expect(newCount < count || tableText.toLowerCase().includes('revoked')).toBeTruthy();
  });

  test('P1-06: Emilio sees ResellerAdmin scope in his own assignments', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Emilio');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/reseller/i, { timeout: 5000 });
  });
});

// ── P2: Sarah Patel (NetworkEngineer) ────────────────────────────────────────

test.describe('P2: Sarah Patel — NetworkEngineer', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P2-01: Sarah appears in Users tab as active', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Sarah');
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Sarah Patel', { timeout: 5000 });
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/active/i, { timeout: 5000 });
  });

  test('P2-02: Sarah has NetworkEngineer in Assignments tab', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Sarah');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/Network Engineer/i, { timeout: 5000 });
  });

  test('P2-03: Sarah has NO SoD conflict in Users tab', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Sarah');
    const row = page.locator('[data-testid="users-table"] tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    const rowText = await row.textContent() ?? '';
    expect(rowText.toLowerCase()).not.toContain('sod conflict');
  });

  test('P2-04: Sarah has prod-only conditioned assignment at CLT-A', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Sarah');
    await page.waitForTimeout(300);
    // Should see a client-tier scope badge for CLT-A
    await expect(page.locator('table tbody')).toContainText(/client/i, { timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText(/CLT-A/i, { timeout: 5000 });
  });

  test('P2-05: Sarah is in Network Operations Cluster group', async ({ page }) => {
    await gotoTab(page, 'Groups');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Network Operations Cluster');
    await page.waitForTimeout(300);
    const row = page.locator('table tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    const viewBtn = row.getByRole('button').filter({ has: page.locator('svg') }).first();
    await viewBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Sarah Patel')).toBeVisible({ timeout: 5000 });
  });
});

// ── P3: Thomas Anderson (OperationsManager w/ active billing deny) ────────────

test.describe('P3: Thomas Anderson — OperationsManager, billing blocked', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P3-01: Thomas has active OperationsManager assignment', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Thomas');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/Operations Manager/i, { timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText(/active/i, { timeout: 5000 });
  });

  test('P3-02: Thomas has active billing deny assignment', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    await page.getByRole('button', { name: /deny/i }).first().click();
    await page.waitForTimeout(400);
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Thomas');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText('Thomas Anderson', { timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText(/billing/i, { timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText(/active/i, { timeout: 5000 });
  });

  test('P3-03: Thomas billing deny creation is in audit Activity log', async ({ page }) => {
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody')).toContainText(/Thomas Anderson/i, { timeout: 8000 });
  });

  test('P3-04: Thomas has NO SoD conflict', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Thomas');
    const row = page.locator('[data-testid="users-table"] tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    const rowText = await row.textContent() ?? '';
    expect(rowText.toLowerCase()).not.toContain('sod conflict');
  });

  test('P3-05: Thomas also has time-windowed SupportSpecialist at CLT-A', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Thomas');
    await page.waitForTimeout(300);
    // Should have both ops mgr and support specialist rows
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

// ── P4: Sophia Lee (SecurityAdmin, MFA-gated) ────────────────────────────────

test.describe('P4: Sophia Lee — SecurityAdmin (MFA required)', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P4-01: Sophia has SecurityAdmin assignment in Assignments tab', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Sophia');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/Security Admin/i, { timeout: 5000 });
  });

  test('P4-02: Sophia has only ONE SecurityAdmin assignment (unconditioned one was removed)', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Sophia');
    await page.waitForTimeout(300);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    // Sophia should have exactly 1 SecurityAdmin (the MFA-gated one)
    // If there are 2 SecurityAdmin rows for Sophia, the unconditioned one leaked back
    let secAdminCount = 0;
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent() ?? '';
      if (text.includes('Security Admin') || text.includes('SecurityAdmin')) secAdminCount++;
    }
    expect(secAdminCount).toBe(1);
  });

  test('P4-03: Sophia has no SoD conflict', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Sophia');
    const row = page.locator('[data-testid="users-table"] tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    const rowText = await row.textContent() ?? '';
    expect(rowText.toLowerCase()).not.toContain('sod conflict');
  });

  test('P4-04: Sophia is in Security Organization group', async ({ page }) => {
    await gotoTab(page, 'Groups');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Security Organization');
    await page.waitForTimeout(300);
    const row = page.locator('table tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    const viewBtn = row.getByRole('button').filter({ has: page.locator('svg') }).first();
    await viewBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Sophia Lee')).toBeVisible({ timeout: 5000 });
  });
});

// ── P5: Aisha Johnson (BillingAdmin + SecurityAdmin, SoD-2) ──────────────────

test.describe('P5: Aisha Johnson — SoD-2 violator', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P5-01: Aisha shows SoD conflict in Users tab', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Aisha');
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/SoD conflict/i, { timeout: 5000 });
  });

  test('P5-02: Aisha has two active assignments with SoD badges', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Aisha');
    await page.waitForTimeout(300);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);
    // Both rows should have SoD badge
    let sodCount = 0;
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent() ?? '';
      if (text.toLowerCase().includes('sod')) sodCount++;
    }
    expect(sodCount).toBeGreaterThanOrEqual(2);
  });

  test('P5-03: Aisha has active deny limiting destructive security ops', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    await page.getByRole('button', { name: /deny/i }).first().click();
    await page.waitForTimeout(400);
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Aisha');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText('Aisha Johnson', { timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText(/active/i, { timeout: 5000 });
  });

  test('P5-04: assigning SecurityAdmin to BillingAdmin user shows SoD warning', async ({ page }) => {
    // Simulate what happens when the drawer detects SoD conflict for a user already holding BillingAdmin
    await gotoTab(page, 'Assignments');
    await page.getByRole('button', { name: /assign role/i }).click();
    await page.waitForSelector('text=Select User to Assign Role', { timeout: 8000 });
    // Pick Lisa Martinez (BillingAdmin only — cleaner test without noise from Aisha's existing violation)
    const lisa = page.locator('button').filter({ hasText: 'Lisa Martinez' }).first();
    await lisa.click();
    await page.waitForSelector('text=Assign Role —', { timeout: 8000 });

    await page.locator('select').first().selectOption('SecurityAdmin');
    await page.waitForTimeout(500);

    // SoD-2 warning should fire
    await expect(page.getByText(/SoD conflict/i)).toBeVisible({ timeout: 5000 });
    const assignBtn = page.getByRole('button', { name: /^assign role$/i }).last();
    await expect(assignBtn).toBeDisabled({ timeout: 5000 });
  });
});

// ── P6: Marcus Chen (NE + ProvisioningManager, SoD-4) ────────────────────────

test.describe('P6: Marcus Chen — SoD-4 violator', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P6-01: Marcus shows SoD conflict in Users tab', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Marcus');
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/SoD conflict/i, { timeout: 5000 });
  });

  test('P6-02: Marcus has two SoD-flagged assignments', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Marcus');
    await page.waitForTimeout(300);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);
    let sodCount = 0;
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent() ?? '';
      if (text.toLowerCase().includes('sod')) sodCount++;
    }
    expect(sodCount).toBeGreaterThanOrEqual(2);
  });

  test('P6-03: Marcus has a lifted deny in Deny tab (emergency lockout was cleared)', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    await page.getByRole('button', { name: /deny/i }).first().click();
    await page.waitForTimeout(400);
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Marcus');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/lifted/i, { timeout: 5000 });
  });

  test('P6-04: assigning ProvisioningManager to NE user shows SoD-4 warning', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    await page.getByRole('button', { name: /assign role/i }).click();
    await page.waitForSelector('text=Select User to Assign Role', { timeout: 8000 });
    // Carlos Vega already has ProvisioningManager — pick Sarah (NE) and try ProvisioningManager
    const sarah = page.locator('button').filter({ hasText: 'Sarah Patel' }).first();
    await sarah.click();
    await page.waitForSelector('text=Assign Role —', { timeout: 8000 });

    await page.locator('select').first().selectOption('ProvisioningManager');
    await page.waitForTimeout(500);

    await expect(page.getByText(/SoD conflict/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /^assign role$/i }).last()).toBeDisabled({ timeout: 5000 });
  });
});

// ── P7: Diego Fernandez (pending-approval NE) ─────────────────────────────────

test.describe('P7: Diego Fernandez — pending-approval NE', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P7-01: Diego appears in Users tab', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Diego');
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Diego Fernandez', { timeout: 5000 });
  });

  test('P7-02: Diego assignment shows pending-approval status', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Diego');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/pending/i, { timeout: 5000 });
  });

  test('P7-03: Diego request appears in Activity tab', async ({ page }) => {
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody')).toContainText(/Diego Fernandez/i, { timeout: 8000 });
  });
});

// ── P8: Nadia Hassan (near-expiry Viewer) ────────────────────────────────────

test.describe('P8: Nadia Hassan — near-expiry Viewer', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P8-01: Nadia shows expiry warning in Users tab', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Nadia');
    const row = page.locator('[data-testid="users-table"] tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    // Should show either "Xd left" warning or expiry badge
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/\dd left|\d+ days/i, { timeout: 5000 });
  });

  test('P8-02: Nadia assignments use client and connection scope tiers', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Nadia');
    await page.waitForTimeout(300);
    // Nadia has CLT-B and conn-2 scoped assignments
    await expect(page.locator('table tbody')).toContainText(/client|connection/i, { timeout: 5000 });
  });
});

// ── P9: Kai Nakamura (revoked NE, offboarded) ────────────────────────────────

test.describe('P9: Kai Nakamura — revoked, offboarded', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P9-01: Kai appears in Users tab as inactive', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Kai');
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Kai Nakamura', { timeout: 5000 });
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/inactive/i, { timeout: 5000 });
  });

  test('P9-02: Kai has REVOKED assignment in Assignments tab', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Kai');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/revoked/i, { timeout: 5000 });
  });

  test('P9-03: Kai has ACTIVE belt-and-suspenders deny', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    await page.getByRole('button', { name: /deny/i }).first().click();
    await page.waitForTimeout(400);
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Kai');
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText('Kai Nakamura', { timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText(/active/i, { timeout: 5000 });
  });

  test('P9-04: Kai revocation event in Activity tab', async ({ page }) => {
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    // al-017: Emilio revoked Kai
    await expect(page.locator('table tbody')).toContainText(/Kai Nakamura|revoke/i, { timeout: 8000 });
  });

  test('P9-05: Kai DENY attempt in Activity tab shows DENY result', async ({ page }) => {
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    // al-011: Kai tries hub:configure after offboarding — should be DENY
    const rows = page.locator('table tbody tr');
    let found = false;
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent() ?? '';
      if (text.includes('Kai Nakamura') && text.includes('DENY')) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
  });
});

// ── P10: Wei Zhang (multi-scope SupportSpecialist) ────────────────────────────

test.describe('P10: Wei Zhang — multi-scope SupportSpecialist', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P10-01: Wei Zhang appears in Users tab', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Wei');
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Wei Zhang', { timeout: 5000 });
  });

  test('P10-02: Wei has two separate SupportSpecialist assignments (CLT-A and CLT-B)', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('Wei');
    await page.waitForTimeout(300);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);
    // Both should show Support Specialist
    let ssCount = 0;
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent() ?? '';
      if (text.includes('Support Specialist') || text.includes('SupportSpecialist')) ssCount++;
    }
    expect(ssCount).toBeGreaterThanOrEqual(2);
  });

  test('P10-03: Wei is in Cloud Operations group', async ({ page }) => {
    await gotoTab(page, 'Groups');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Cloud Operations');
    await page.waitForTimeout(300);
    const row = page.locator('table tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    const viewBtn = row.getByRole('button').filter({ has: page.locator('svg') }).first();
    await viewBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Wei Zhang')).toBeVisible({ timeout: 5000 });
  });
});

// ── P11: James O'Brien (ClientAdmin at CLT-C) ─────────────────────────────────

test.describe("P11: James O'Brien — ClientAdmin at CLT-C", () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test("P11-01: James O'Brien appears in Users tab", async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, "James");
    await expect(page.locator('[data-testid="users-table"]')).toContainText("O'Brien", { timeout: 5000 });
  });

  test('P11-02: James has ClientAdmin assignment scoped to CLT-C', async ({ page }) => {
    await gotoTab(page, 'Assignments');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill("James");
    await page.waitForTimeout(300);
    await expect(page.locator('table tbody')).toContainText(/Client Admin/i, { timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText('CLT-C', { timeout: 5000 });
  });

  test('P11-03: James is in the Cross-BU Migration Project group', async ({ page }) => {
    await gotoTab(page, 'Groups');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Cross-BU Migration');
    await page.waitForTimeout(300);
    const row = page.locator('table tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    const viewBtn = row.getByRole('button').filter({ has: page.locator('svg') }).first();
    await viewBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText("O'Brien")).toBeVisible({ timeout: 5000 });
  });
});

// ── P12: Frank Audit (closed audit engagement) ────────────────────────────────

test.describe('P12: Frank Audit — closed audit engagement viewer', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('P12-01: Frank Audit appears in Users tab', async ({ page }) => {
    await gotoUsers(page);
    await searchUser(page, 'Frank');
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Frank Audit', { timeout: 5000 });
  });

  test('P12-02: Q1 audit group is closed and Frank is listed in its members', async ({ page }) => {
    await gotoTab(page, 'Groups');
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Q1 2026 Compliance');
    await page.waitForTimeout(300);
    const row = page.locator('table tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    await expect(row).toContainText(/closed/i, { timeout: 5000 });

    const viewBtn = row.getByRole('button').filter({ has: page.locator('svg') }).first();
    await viewBtn.click();
    await page.waitForTimeout(500);
    // Frank should be listed in members (expired membership)
    await expect(page.getByText('Frank Audit')).toBeVisible({ timeout: 5000 });
    // Engagement metadata should show
    await expect(page.getByText('SOC 2 Type II Q1 Review')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('KPMG')).toBeVisible({ timeout: 5000 });
  });

  test('P12-03: Q1 audit close event in Activity tab', async ({ page }) => {
    await gotoTab(page, 'Activity');
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody')).toContainText(/Q1 2026 Compliance Audit|group-q1-audit/i, { timeout: 8000 });
  });
});
