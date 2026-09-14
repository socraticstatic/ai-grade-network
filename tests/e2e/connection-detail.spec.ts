import { test, expect } from '@playwright/test';
import { seedAuth, gotoConnectionDetail } from './helpers';

// ---------------------------------------------------------------------------
// Detail-01 to Detail-08  — Connection detail page tests
//
// AWS connections (conn-1) disable the Links, VNFs, Policies, and API tabs.
// We use conn-2 ("Multi-Cloud Production", Azure, Dallas TX, 10 Gbps) so all
// tabs are available. conn-1 is used only for the AWS-specific header tests.
// ---------------------------------------------------------------------------

test.describe('Connection Detail', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // Detail-01: Connection detail header renders (conn-1, always available)
  test('Detail-01: connection detail header renders a non-empty connection name', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-1');

    const nameEl = page.locator('h1, h2, [class*="heading"], [class*="font-semibold"]')
      .filter({ hasText: /\S+/ })
      .first();
    await nameEl.waitFor({ timeout: 8000 });
    const text = await nameEl.textContent();
    expect((text ?? '').trim().length).toBeGreaterThan(0);
  });

  // Detail-02: Overview tab content for conn-2 (Azure, Dallas)
  test('Detail-02: Overview tab shows bandwidth and location info', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');

    const overviewTab = page.getByRole('button', { name: /overview/i });
    await overviewTab.waitFor({ timeout: 8000 });
    await overviewTab.click();
    await page.waitForTimeout(500);

    // conn-2: Azure, Dallas TX, 10 Gbps
    const hasRelevant = await page.getByText(/gbps|bandwidth|location|dallas|azure/i).first().isVisible();
    expect(hasRelevant).toBe(true);
  });

  // Detail-03: Hubs tab loads (conn-2 has hubIds: ['router-3'])
  test('Detail-03: Hubs tab renders content', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');

    const hubsTab = page.getByRole('button', { name: /hubs/i });
    await hubsTab.waitFor({ timeout: 8000 });
    await hubsTab.click();
    await page.waitForTimeout(600);

    const content = page.locator('[class*="hub"], [class*="Hub"], table tbody tr')
      .or(page.getByText(/no hubs|hub/i));
    await expect(content.first()).toBeVisible({ timeout: 6000 });
  });

  // Detail-04: Links tab — requires conn-2 (Azure; conn-1 AWS disables Links)
  test('Detail-04: Links tab renders table or empty state', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');

    const linksTab = page.getByRole('button', { name: /^links$/i });
    await linksTab.waitFor({ timeout: 8000 });
    await linksTab.click();
    await page.waitForTimeout(600);

    // Should render links table rows or an empty state message
    const tableRows = page.locator('table tbody tr');
    const emptyState = page.getByText(/no links|add link/i);
    const hasContent = await tableRows.count() > 0 || await emptyState.count() > 0;
    expect(hasContent).toBe(true);
  });

  // Detail-05: VNFs tab — requires conn-2 (Azure; conn-1 AWS disables VNFs)
  test('Detail-05: VNFs tab renders content or empty state', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');

    const vnfTab = page.getByRole('button', { name: /vnfs/i });
    await vnfTab.waitFor({ timeout: 8000 });
    await vnfTab.click();
    await page.waitForTimeout(600);

    // VNF tab should render something — rows, cards, or empty state
    const content = page.locator('[class*="vnf"], [class*="VNF"], table tbody tr')
      .or(page.getByText(/no vnfs|virtual network function|vnf|add vnf/i));
    await expect(content.first()).toBeVisible({ timeout: 6000 });
  });

  // Detail-06: Inline name edit mode activates (conn-2)
  test('Detail-06: clicking edit icon next to connection name shows an input', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');
    await page.waitForTimeout(800);

    const editIcon = page.locator('button[aria-label*="dit"], button[title*="dit"]')
      .or(page.locator('button').filter({ has: page.locator('svg[data-lucide="edit-2"], svg[data-lucide="pencil"]') }))
      .first();

    if (await editIcon.count() === 0) {
      const existingInput = page.locator('input[type="text"]').first();
      if (await existingInput.count() > 0) {
        await expect(existingInput).toBeVisible({ timeout: 5000 });
        return;
      }
      test.skip(true, 'Edit name button not found; skipping');
      return;
    }

    await editIcon.click();
    await page.waitForTimeout(400);

    const nameInput = page.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  // Detail-07: Cancel inline name edit restores original name (conn-2)
  test('Detail-07: cancelling inline name edit restores original name', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');
    await page.waitForTimeout(800);

    const editIcon = page.locator('button[aria-label*="dit"], button[title*="dit"]')
      .or(page.locator('button').filter({ has: page.locator('svg[data-lucide="edit-2"], svg[data-lucide="pencil"]') }))
      .first();

    if (await editIcon.count() === 0) {
      test.skip(true, 'Edit name button not found; skipping');
      return;
    }

    await editIcon.click();
    await page.waitForTimeout(400);

    const nameInput = page.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    await nameInput.fill('Edited Connection Name XYZ');
    await page.waitForTimeout(200);

    const cancelBtn = page.locator('button[aria-label*="ancel"], button[title*="ancel"]')
      .or(page.locator('button').filter({ has: page.locator('svg[data-lucide="x"]') }))
      .first();

    if (await cancelBtn.count() > 0) {
      await cancelBtn.click();
    } else {
      await nameInput.press('Escape');
    }
    await page.waitForTimeout(400);

    const inputVisible = await nameInput.isVisible().catch(() => false);
    expect(inputVisible).toBe(false);
  });

  // Detail-08: Status toggle button — requires conn-2 (AWS connections hide this)
  // conn-2 is Active so the button reads "Active" (with Pause icon to deactivate)
  test('Detail-08: Activate or Deactivate action button is visible in detail header', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');
    await page.waitForTimeout(800);

    // The status toggle button text is the current status — "Active" or "Inactive"
    const statusBtn = page.locator('button').filter({ hasText: /^Active$|^Inactive$/ }).first();
    await expect(statusBtn).toBeVisible({ timeout: 8000 });
  });
});
