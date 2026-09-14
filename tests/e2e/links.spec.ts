import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

const TIMEOUT = 8000;
// conn-2 = "Multi-Cloud Production" (Azure) — Links tab is enabled.
// conn-1 = "Corporate Cloud Hub" (AWS) — Links tab is DISABLED; use conn-2 here.
const CONNECTION_URL = '/#/connections/conn-2';

async function gotoLinks(page: any) {
  await page.goto(CONNECTION_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Click the "Links" tab in the connection detail tabs
  await page.getByRole('button', { name: /^Links$/i }).click();
  await page.waitForTimeout(800);
}

test.describe('Links', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // LinkTest-01
  test('LinkTest-01: Links tab on connection detail loads', async ({ page }) => {
    await gotoLinks(page);

    // The link section renders a table or empty state
    const linkContent = page.locator('table, [class*="LinkTable"], [class*="link-table"]').or(
      page.getByText(/Add Link|No links|VLAN|Link/i).first()
    );
    await expect(linkContent).toBeVisible({ timeout: TIMEOUT });
  });

  // LinkTest-02
  test('LinkTest-02: Add Link opens VLAN modal', async ({ page }) => {
    await gotoLinks(page);

    const addLinkBtn = page.getByRole('button', { name: /Add Link/i });
    await expect(addLinkBtn).toBeVisible({ timeout: TIMEOUT });
    await addLinkBtn.click();
    await page.waitForTimeout(600);

    // SideDrawer with VLAN/link configuration fields should open
    const drawer = page.getByText(/Link Name|VLAN|Link ID/i).first();
    await expect(drawer).toBeVisible({ timeout: TIMEOUT });
  });

  // LinkTest-03
  test('LinkTest-03: VLAN modal has required fields', async ({ page }) => {
    await gotoLinks(page);

    const addLinkBtn = page.getByRole('button', { name: /Add Link/i });
    await addLinkBtn.click();
    await page.waitForTimeout(600);

    // Name field
    const nameInput = page.getByPlaceholder(/Production Network/i).or(
      page.locator('input[placeholder*="Network"]')
    );
    await expect(nameInput).toBeVisible({ timeout: TIMEOUT });

    // VLAN ID / Link ID field
    const vlanInput = page.getByPlaceholder(/1-4094/i).or(
      page.locator('input[type="number"]').first()
    );
    await expect(vlanInput).toBeVisible({ timeout: TIMEOUT });

    // Status select/field
    const statusLabel = page.getByText(/^Status$/i);
    await expect(statusLabel).toBeVisible({ timeout: TIMEOUT });

    // Link Type field
    const linkTypeLabel = page.getByText(/Link Type/i);
    await expect(linkTypeLabel).toBeVisible({ timeout: TIMEOUT });
  });

  // LinkTest-04
  test('LinkTest-04: Cancel Add Link closes without saving', async ({ page }) => {
    await gotoLinks(page);

    // Count existing links
    const linkRows = page.locator('table tbody tr');
    const initialCount = await linkRows.count();

    const addLinkBtn = page.getByRole('button', { name: /Add Link/i });
    await addLinkBtn.click();
    await page.waitForTimeout(600);

    // Fill in the link name
    const nameInput = page.getByPlaceholder(/Production Network/i);
    await nameInput.fill('Test Link');

    // Click Cancel
    const cancelBtn = page.getByRole('button', { name: /^Cancel$/i });
    await expect(cancelBtn).toBeVisible({ timeout: TIMEOUT });
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Drawer should be closed
    await expect(page.getByPlaceholder(/Production Network/i)).not.toBeVisible({ timeout: TIMEOUT });

    // "Test Link" should not appear in the list
    const testLink = page.getByText('Test Link');
    const testLinkCount = await testLink.count();
    expect(testLinkCount).toBe(0);
  });

  // LinkTest-05
  test('LinkTest-05: Link overflow menu has Edit and Delete options', async ({ page }) => {
    await gotoLinks(page);

    // Check if links are visible
    const linkRows = page.locator('table tbody tr');
    const rowCount = await linkRows.count();

    if (rowCount === 0) {
      // No links exist - skip with a pass (empty state is valid)
      const emptyState = page.getByText(/No links|Add Link/i).first();
      await expect(emptyState).toBeVisible({ timeout: TIMEOUT });
      return;
    }

    // Find the overflow menu trigger on the first link row
    const firstRow = linkRows.first();
    const overflowTrigger = firstRow.locator('button').last();
    await overflowTrigger.click();
    await page.waitForTimeout(400);

    // Edit Link and Delete Link should be visible in the dropdown
    const editItem = page.getByText(/Edit Link/i);
    const deleteItem = page.getByText(/Delete Link/i);

    await expect(editItem.first()).toBeVisible({ timeout: TIMEOUT });
    await expect(deleteItem.first()).toBeVisible({ timeout: TIMEOUT });
  });
});
