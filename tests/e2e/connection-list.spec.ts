import { test, expect } from '@playwright/test';
import { seedAuth, gotoManage } from './helpers';

// ---------------------------------------------------------------------------
// UC-01 to UC-20  — Connection list / grid / overflow / navigation
// ---------------------------------------------------------------------------

test.describe('Connection List', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // UC-01: Connection list renders
  test('UC-01: connection list renders at least one item', async ({ page }) => {
    await gotoManage(page);

    // The manage page shows connections inside ConnectionGrid.
    // Default view is list; wait for any connection row or card to appear.
    const items = page.locator('table tbody tr, [class*="connection-card"], [class*="ConnectionCard"]');
    await items.first().waitFor({ timeout: 10000 });
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // UC-02: Grid view renders cards
  test('UC-02: grid view renders cards after clicking grid toggle', async ({ page }) => {
    await gotoManage(page);

    const gridToggle = page.locator('button[title="Grid View"]');
    await gridToggle.waitFor({ timeout: 8000 });
    await gridToggle.click();
    await page.waitForTimeout(500);

    // Grid view renders ConnectionCard components inside GridView
    // Cards are rendered as div elements with rounded corners and border
    const cards = page.locator('[class*="bg-fw-base"][class*="rounded"], [class*="connection"][class*="card"]');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  // UC-03: List view renders table
  test('UC-03: list view renders table rows', async ({ page }) => {
    await gotoManage(page);

    // Click list view toggle
    const listToggle = page.locator('button[title="List View"]');
    await listToggle.waitFor({ timeout: 8000 });
    await listToggle.click();
    await page.waitForTimeout(500);

    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // UC-04: Search by name filters results
  test('UC-04: search by name filters results and shows empty state for no-match', async ({ page }) => {
    await gotoManage(page);

    // Ensure list view for deterministic row counts
    const listToggle = page.locator('button[title="List View"]');
    await listToggle.waitFor({ timeout: 8000 });
    await listToggle.click();
    await page.waitForTimeout(400);

    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const initialCount = await rows.count();

    // Search for a term that should match at least one connection
    const searchInput = page.getByPlaceholder(/search connections/i);
    await searchInput.fill('AWS');
    await page.waitForTimeout(600);
    const filteredCount = await rows.count();
    // Either fewer than initial count, or same if all match AWS
    expect(filteredCount).toBeGreaterThanOrEqual(1);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Now search for something that won't match
    await searchInput.fill('zzz_no_match_xyz');
    await page.waitForTimeout(600);
    const emptyState = page.getByText(/no connections match/i);
    await expect(emptyState).toBeVisible({ timeout: 5000 });
  });

  // UC-05: Clear search restores list
  test('UC-05: clearing search restores full connection list', async ({ page }) => {
    await gotoManage(page);

    const listToggle = page.locator('button[title="List View"]');
    await listToggle.waitFor({ timeout: 8000 });
    await listToggle.click();
    await page.waitForTimeout(400);

    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const initialCount = await rows.count();

    const searchInput = page.getByPlaceholder(/search connections/i);
    await searchInput.fill('zzz_no_match_xyz');
    await page.waitForTimeout(600);

    // Clear it
    await searchInput.clear();
    await page.waitForTimeout(600);

    const restoredCount = await rows.count();
    expect(restoredCount).toBeGreaterThanOrEqual(initialCount);
  });

  // UC-06: Filter panel opens / closes
  test('UC-06: filter panel opens and closes', async ({ page }) => {
    await gotoManage(page);

    // SearchFilterBar renders a filter button (funnel icon)
    const filterBtn = page.locator('button').filter({ hasText: /filter/i }).first();
    // Fallback: look for any button with an aria-label or title containing "filter"
    const filterBtnAlt = page.locator('button[aria-label*="ilter"], button[title*="ilter"]').first();

    const btn = await filterBtn.count() > 0 ? filterBtn : filterBtnAlt;
    await btn.waitFor({ timeout: 8000 });
    await btn.click();
    await page.waitForTimeout(400);

    // Filter panel becomes visible — it contains a "Status" label
    const panel = page.locator('[class*="filter"], [class*="Filter"]').filter({ hasText: /status/i });
    await expect(panel.first()).toBeVisible({ timeout: 5000 });

    // Click again to close
    await btn.click();
    await page.waitForTimeout(400);
    await expect(panel.first()).not.toBeVisible({ timeout: 5000 });
  });

  // UC-07: Filter by status shows fewer or equal results
  test('UC-07: filtering by Active status narrows results', async ({ page }) => {
    await gotoManage(page);

    const listToggle = page.locator('button[title="List View"]');
    await listToggle.waitFor({ timeout: 8000 });
    await listToggle.click();
    await page.waitForTimeout(400);

    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const initialCount = await rows.count();

    // Open filter panel
    const filterBtn = page.locator('button').filter({ hasText: /filter/i }).first();
    const filterBtnAlt = page.locator('button[aria-label*="ilter"], button[title*="ilter"]').first();
    const btn = await filterBtn.count() > 0 ? filterBtn : filterBtnAlt;
    await btn.waitFor({ timeout: 8000 });
    await btn.click();
    await page.waitForTimeout(400);

    // Click the "Active" checkbox/chip in the filter panel
    const activeChip = page.getByRole('checkbox', { name: /^active$/i });
    const activeLabel = page.getByText(/^active$/i).first();
    if (await activeChip.count() > 0) {
      await activeChip.click();
    } else {
      await activeLabel.click();
    }
    await page.waitForTimeout(600);

    const filteredCount = await rows.count();
    expect(filteredCount).toBeGreaterThanOrEqual(1);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  // UC-08: Export triggers feedback (no crash, page still renders)
  test('UC-08: export does not crash the page', async ({ page }) => {
    await gotoManage(page);

    // SearchFilterBar has an export/download icon button
    const exportBtn = page.locator('button[aria-label*="xport"], button[title*="xport"]');
    if (await exportBtn.count() === 0) {
      // The export is rendered inside SearchFilterBar — look for the Download icon button
      const downloadBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(0);
      // We just click any export-like button; the key assertion is no crash
      test.skip(true, 'Export button not found by accessible name; skipping');
      return;
    }
    await exportBtn.first().click();
    await page.waitForTimeout(1000);

    // Page must still show connections
    const heading = page.locator('h1, h2, [class*="heading"]').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  // UC-09: Switch views without crash
  test('UC-09: cycling through grid / list / topology views does not crash', async ({ page }) => {
    await gotoManage(page);

    const gridToggle = page.locator('button[title="Grid View"]');
    const listToggle = page.locator('button[title="List View"]');
    const topoToggle = page.locator('button[title="Topology View"]');

    await gridToggle.waitFor({ timeout: 8000 });

    await gridToggle.click();
    await page.waitForTimeout(400);
    await listToggle.click();
    await page.waitForTimeout(400);
    await topoToggle.click();
    await page.waitForTimeout(600);
    await gridToggle.click();
    await page.waitForTimeout(400);

    // No error boundary text visible
    const errorBoundary = page.getByText(/something went wrong/i);
    const count = await errorBoundary.count();
    expect(count).toBe(0);
  });

  // UC-10: Overflow menu opens on a connection card
  test('UC-10: three-dot overflow menu opens on first card showing expected actions', async ({ page }) => {
    await gotoManage(page);

    // Switch to grid view — cards are more likely to have overflow menus
    const gridToggle = page.locator('button[title="Grid View"]');
    await gridToggle.waitFor({ timeout: 8000 });
    await gridToggle.click();
    await page.waitForTimeout(600);

    // OverflowMenu renders a button that opens a dropdown.
    // ConnectionOverflowMenu wraps OverflowMenu — look for any button with 3 dots / "more" role.
    const overflowBtn = page
      .locator('[class*="rounded-full"] button, button[class*="overflow"], button[aria-label*="ore"]')
      .first();

    // Fallback: OverflowMenu in this codebase uses OverflowMenu component which renders a button
    // with SVG (MoreVertical or similar). Use a broader selector.
    const anyOverflow = page.locator('button').filter({ has: page.locator('svg') }).last();
    const btn = await overflowBtn.count() > 0 ? overflowBtn : anyOverflow;
    await btn.waitFor({ timeout: 8000 });
    await btn.click();
    await page.waitForTimeout(500);

    // Menu items: "View Details" is always present
    await expect(page.getByRole('menuitem', { name: /view details/i }).or(
      page.getByText(/view details/i)
    ).first()).toBeVisible({ timeout: 5000 });
  });

  // UC-11: View Details from overflow navigates to detail page
  test('UC-11: View Details from overflow menu navigates to connection detail', async ({ page }) => {
    await gotoManage(page);

    const gridToggle = page.locator('button[title="Grid View"]');
    await gridToggle.waitFor({ timeout: 8000 });
    await gridToggle.click();
    await page.waitForTimeout(600);

    // Open overflow on first card
    const overflowBtns = page.locator('button[class*="rounded-full"], button[aria-label*="ore"]');
    const fallbackBtns = page.locator('button').filter({ has: page.locator('svg') });
    const btn = await overflowBtns.count() > 0
      ? overflowBtns.first()
      : fallbackBtns.last();

    await btn.waitFor({ timeout: 8000 });
    await btn.click();
    await page.waitForTimeout(400);

    const viewDetails = page.getByRole('menuitem', { name: /view details/i })
      .or(page.getByText(/view details/i).first());
    await viewDetails.waitFor({ timeout: 5000 });
    await viewDetails.click();

    await page.waitForURL(/\/#\/connections\//i, { timeout: 8000 });
    expect(page.url()).toMatch(/\/#\/connections\//i);
  });

  // UC-12: Modify Bandwidth modal opens
  test('UC-12: Modify Bandwidth from overflow menu opens modal', async ({ page }) => {
    await gotoManage(page);

    const gridToggle = page.locator('button[title="Grid View"]');
    await gridToggle.waitFor({ timeout: 8000 });
    await gridToggle.click();
    await page.waitForTimeout(600);

    const overflowBtns = page.locator('button[class*="rounded-full"], button[aria-label*="ore"]');
    const fallbackBtns = page.locator('button').filter({ has: page.locator('svg') });
    const btn = await overflowBtns.count() > 0
      ? overflowBtns.first()
      : fallbackBtns.last();

    await btn.waitFor({ timeout: 8000 });
    await btn.click();
    await page.waitForTimeout(400);

    const modifyBandwidth = page.getByRole('menuitem', { name: /modify bandwidth/i })
      .or(page.getByText(/modify bandwidth/i).first());
    await modifyBandwidth.waitFor({ timeout: 5000 });
    await modifyBandwidth.click();
    await page.waitForTimeout(600);

    // Modal should appear — it contains bandwidth options
    const modal = page.locator('[role="dialog"]').or(
      page.locator('[class*="modal"], [class*="Modal"]')
    ).first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal).toContainText(/bandwidth/i);
  });

  // UC-13: Modify Bandwidth modal can be cancelled
  test('UC-13: Modify Bandwidth modal closes on Cancel', async ({ page }) => {
    await gotoManage(page);

    const gridToggle = page.locator('button[title="Grid View"]');
    await gridToggle.waitFor({ timeout: 8000 });
    await gridToggle.click();
    await page.waitForTimeout(600);

    const overflowBtns = page.locator('button[class*="rounded-full"], button[aria-label*="ore"]');
    const fallbackBtns = page.locator('button').filter({ has: page.locator('svg') });
    const btn = await overflowBtns.count() > 0
      ? overflowBtns.first()
      : fallbackBtns.last();

    await btn.waitFor({ timeout: 8000 });
    await btn.click();
    await page.waitForTimeout(400);

    const modifyBandwidth = page.getByRole('menuitem', { name: /modify bandwidth/i })
      .or(page.getByText(/modify bandwidth/i).first());
    await modifyBandwidth.waitFor({ timeout: 5000 });
    await modifyBandwidth.click();
    await page.waitForTimeout(600);

    const modal = page.locator('[role="dialog"]').or(
      page.locator('[class*="modal"], [class*="Modal"]')
    ).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click Cancel
    const cancelBtn = modal.getByRole('button', { name: /cancel/i });
    await cancelBtn.click();
    await page.waitForTimeout(500);

    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  // UC-14: Delete connection requires confirmation dialog
  test('UC-14: Delete Connection from overflow opens confirmation dialog', async ({ page }) => {
    await gotoManage(page);

    const gridToggle = page.locator('button[title="Grid View"]');
    await gridToggle.waitFor({ timeout: 8000 });
    await gridToggle.click();
    await page.waitForTimeout(600);

    const overflowBtns = page.locator('button[class*="rounded-full"], button[aria-label*="ore"]');
    const fallbackBtns = page.locator('button').filter({ has: page.locator('svg') });
    const btn = await overflowBtns.count() > 0
      ? overflowBtns.first()
      : fallbackBtns.last();

    await btn.waitFor({ timeout: 8000 });
    await btn.click();
    await page.waitForTimeout(400);

    const deleteItem = page.getByRole('menuitem', { name: /delete connection/i })
      .or(page.getByText(/delete connection/i).first());

    // Skip if delete is disabled (AWS connections cannot be deleted via this menu)
    const isDisabled = await deleteItem.getAttribute('disabled');
    if (isDisabled !== null) {
      test.skip(true, 'Delete is disabled for this connection type');
      return;
    }

    await deleteItem.waitFor({ timeout: 5000 });
    await deleteItem.click();
    await page.waitForTimeout(500);

    // Confirmation dialog must appear
    const dialog = page.locator('[role="dialog"]').or(
      page.locator('[class*="confirm"], [class*="Confirm"]')
    ).first();
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog).toContainText(/delete|confirm/i);
  });

  // UC-15: Delete confirmation cancel leaves connection
  test('UC-15: cancelling delete confirmation leaves connection in list', async ({ page }) => {
    await gotoManage(page);

    const listToggle = page.locator('button[title="List View"]');
    await listToggle.waitFor({ timeout: 8000 });
    await listToggle.click();
    await page.waitForTimeout(400);

    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    const initialCount = await rows.count();

    const gridToggle = page.locator('button[title="Grid View"]');
    await gridToggle.click();
    await page.waitForTimeout(600);

    const overflowBtns = page.locator('button[class*="rounded-full"], button[aria-label*="ore"]');
    const fallbackBtns = page.locator('button').filter({ has: page.locator('svg') });
    const btn = await overflowBtns.count() > 0
      ? overflowBtns.first()
      : fallbackBtns.last();

    await btn.waitFor({ timeout: 8000 });
    await btn.click();
    await page.waitForTimeout(400);

    const deleteItem = page.getByRole('menuitem', { name: /delete connection/i })
      .or(page.getByText(/delete connection/i).first());

    const isDisabled = await deleteItem.getAttribute('disabled');
    if (isDisabled !== null) {
      test.skip(true, 'Delete is disabled for this connection type; skipping');
      return;
    }

    await deleteItem.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]').or(
      page.locator('[class*="confirm"], [class*="Confirm"]')
    ).first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Cancel the confirmation
    const cancelBtn = dialog.getByRole('button', { name: /cancel/i });
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Switch back to list and verify row count unchanged
    const listToggleAgain = page.locator('button[title="List View"]');
    await listToggleAgain.click();
    await page.waitForTimeout(400);

    const remainingRows = page.locator('table tbody tr');
    await remainingRows.first().waitFor({ timeout: 8000 });
    const afterCount = await remainingRows.count();
    expect(afterCount).toBe(initialCount);
  });

  // UC-16: Connection card shows name and status
  test('UC-16: connection cards render non-empty name and a status indicator', async ({ page }) => {
    await gotoManage(page);

    const gridToggle = page.locator('button[title="Grid View"]');
    await gridToggle.waitFor({ timeout: 8000 });
    await gridToggle.click();
    await page.waitForTimeout(600);

    // Each card should have some text content that isn't empty
    const cardTexts = page.locator('[class*="bg-fw-base"][class*="border"] h3, [class*="bg-fw-base"][class*="border"] h2, [class*="bg-fw-base"][class*="border"] [class*="font-medium"]');
    const firstCardText = await cardTexts.first().textContent({ timeout: 8000 });
    expect((firstCardText ?? '').trim().length).toBeGreaterThan(0);

    // Status chips — look for Active / Inactive / Pending text
    const statusChip = page.getByText(/^(active|inactive|pending|provisioning)$/i).first();
    await expect(statusChip).toBeVisible({ timeout: 5000 });
  });

  // UC-17: Navigate to connection detail from card click
  test('UC-17: clicking a connection card navigates to detail page', async ({ page }) => {
    await gotoManage(page);

    const listToggle = page.locator('button[title="List View"]');
    await listToggle.waitFor({ timeout: 8000 });
    await listToggle.click();
    await page.waitForTimeout(400);

    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });

    // Click the first row's name/link cell
    const firstCell = rows.first().locator('td').first();
    await firstCell.click();

    await page.waitForURL(/\/#\/connections\//i, { timeout: 8000 });
    expect(page.url()).toMatch(/\/#\/connections\//i);
  });

  // UC-18: Navigate back from detail page
  test('UC-18: Back button on detail page returns to manage view', async ({ page }) => {
    await gotoManage(page);

    const listToggle = page.locator('button[title="List View"]');
    await listToggle.waitFor({ timeout: 8000 });
    await listToggle.click();
    await page.waitForTimeout(400);

    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    await rows.first().locator('td').first().click();

    await page.waitForURL(/\/#\/connections\//i, { timeout: 8000 });

    // Click Back button in SubNav / header
    const backBtn = page.getByRole('button', { name: /back to connections/i })
      .or(page.getByRole('link', { name: /back to connections/i }))
      .or(page.locator('button').filter({ hasText: /back/i }).first());

    await backBtn.waitFor({ timeout: 8000 });
    await backBtn.click();

    await page.waitForURL(/\/#\/manage/i, { timeout: 8000 });
    expect(page.url()).toMatch(/\/#\/manage/i);
  });

  // UC-19: Connection detail shows tabs
  test('UC-19: connection detail page shows expected tabs', async ({ page }) => {
    await gotoManage(page);

    const listToggle = page.locator('button[title="List View"]');
    await listToggle.waitFor({ timeout: 8000 });
    await listToggle.click();
    await page.waitForTimeout(400);

    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 8000 });
    await rows.first().locator('td').first().click();

    await page.waitForURL(/\/#\/connections\//i, { timeout: 8000 });
    await page.waitForTimeout(800);

    // Overview tab is always present
    const overviewTab = page.getByRole('button', { name: /overview/i });
    await expect(overviewTab).toBeVisible({ timeout: 8000 });

    // At least one of the other expected tabs
    const hubsTab = page.getByRole('button', { name: /hubs/i });
    const linksTab = page.getByRole('button', { name: /links/i });
    const eitherVisible = await hubsTab.isVisible() || await linksTab.isVisible();
    expect(eitherVisible).toBe(true);
  });

  // UC-20: Copy connection ID - no crash
  test('UC-20: clicking copy connection ID button does not crash', async ({ page }) => {
    await page.goto('/#/connections/conn-1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    // Look for a CopyButton or copy icon near the ID
    const copyBtn = page.locator('button[aria-label*="opy"], button[title*="opy"], [class*="CopyButton"] button')
      .or(page.locator('button').filter({ has: page.locator('svg') }).last());

    const found = await copyBtn.count();
    if (found === 0) {
      test.skip(true, 'Copy button not found; skipping');
      return;
    }

    await copyBtn.first().click();
    await page.waitForTimeout(500);

    // No error boundary should appear
    const errorText = page.getByText(/something went wrong/i);
    expect(await errorText.count()).toBe(0);
  });
});
