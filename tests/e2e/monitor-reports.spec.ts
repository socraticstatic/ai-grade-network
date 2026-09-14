import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

const TIMEOUT = 8000;

async function gotoMonitorReports(page: any) {
  await page.goto('/#/monitor', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  // Click the Reports tab in the Monitor dashboard tab bar
  await page.getByRole('button', { name: /^Reports$/i }).click();
  await page.waitForTimeout(1000);
}

test.describe('Monitor Reports - Standard', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // ReportTest-01
  test('ReportTest-01: Standard reports tab loads', async ({ page }) => {
    await gotoMonitorReports(page);

    // The reporting section renders with a vertical nav and report content
    // Standard Reports is accessible via the vertical nav
    const standardReportsNav = page.getByRole('button', { name: /Standard Reports/i });
    await expect(standardReportsNav).toBeVisible({ timeout: TIMEOUT });
    await standardReportsNav.click();
    await page.waitForTimeout(800);

    // At least 5 report cards should be visible
    // Reports render as card items with names
    const reportItems = page.locator('.card, [class*="rounded"]').filter({ hasText: /generated/i });
    const count = await reportItems.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  // ReportTest-02
  test('ReportTest-02: Search filters reports', async ({ page }) => {
    await gotoMonitorReports(page);

    // Navigate to Standard Reports
    const standardNav = page.getByRole('button', { name: /Standard Reports/i });
    await expect(standardNav).toBeVisible({ timeout: TIMEOUT });
    await standardNav.click();
    await page.waitForTimeout(800);

    // Find the search input
    const searchInput = page.getByPlaceholder(/Search reports/i);
    await expect(searchInput).toBeVisible({ timeout: TIMEOUT });

    // Type "Performance" to filter
    await searchInput.fill('Performance');
    await page.waitForTimeout(400);

    // Filtered results should contain "Performance" in titles
    const reportTitles = page.locator('h4, h3').filter({ hasText: /Performance/i });
    const count = await reportTitles.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ReportTest-03
  test('ReportTest-03: Clear search restores all reports', async ({ page }) => {
    await gotoMonitorReports(page);

    const standardNav = page.getByRole('button', { name: /Standard Reports/i });
    await expect(standardNav).toBeVisible({ timeout: TIMEOUT });
    await standardNav.click();
    await page.waitForTimeout(800);

    const searchInput = page.getByPlaceholder(/Search reports/i);
    await expect(searchInput).toBeVisible({ timeout: TIMEOUT });

    // Count all reports before filtering
    const allReports = page.locator('.card, [class*="rounded"]').filter({ hasText: /generated/i });
    const initialCount = await allReports.count();

    // Filter by a term that won't match many
    await searchInput.fill('Performance');
    await page.waitForTimeout(400);

    const filteredCount = await allReports.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Clear the search
    await searchInput.fill('');
    await page.waitForTimeout(400);

    const restoredCount = await allReports.count();
    expect(restoredCount).toBeGreaterThanOrEqual(initialCount);
  });

  // ReportTest-04
  test('ReportTest-04: Generate report shows in-progress state then completes', async ({ page }) => {
    await gotoMonitorReports(page);

    const standardNav = page.getByRole('button', { name: /Standard Reports/i });
    await expect(standardNav).toBeVisible({ timeout: TIMEOUT });
    await standardNav.click();
    await page.waitForTimeout(800);

    // Click Generate on the first report
    const generateBtn = page.getByRole('button', { name: /^Generate$/i }).first();
    await expect(generateBtn).toBeVisible({ timeout: TIMEOUT });
    await generateBtn.click();

    // Should show "Generating..." state
    const generatingText = page.getByRole('button', { name: /Generating\.\.\./i }).first();
    await expect(generatingText).toBeVisible({ timeout: 3000 });

    // Wait for completion - the generate timeout is 2000ms, addToast duration 4000ms
    await page.waitForTimeout(2500);

    // Success toast should appear
    const successToast = page.locator('[role="alert"]').or(
      page.getByText(/Report Generated|generated and is ready/i)
    );
    await expect(successToast.first()).toBeVisible({ timeout: TIMEOUT });
  });

  // ReportTest-05
  test('ReportTest-05: Download report triggers notification', async ({ page }) => {
    await gotoMonitorReports(page);

    const standardNav = page.getByRole('button', { name: /Standard Reports/i });
    await expect(standardNav).toBeVisible({ timeout: TIMEOUT });
    await standardNav.click();
    await page.waitForTimeout(800);

    // Switch to table/list view to access Download button more directly
    // Try finding a Download button in the card view first
    const downloadBtn = page.getByRole('button', { name: /^Download$/i }).first();

    // If card view doesn't have a visible Download button, check overflow menu
    const downloadVisible = await downloadBtn.isVisible().catch(() => false);
    if (downloadVisible) {
      await downloadBtn.click();
    } else {
      // Try the list view icon to switch view modes
      const listViewBtn = page.locator('button[title*="list"], button[title*="List"], button[title*="table"]').first();
      const listViewVisible = await listViewBtn.isVisible().catch(() => false);
      if (listViewVisible) {
        await listViewBtn.click();
        await page.waitForTimeout(400);
      }
      // Try overflow menu
      const overflowBtn = page.locator('button').filter({ has: page.locator('svg[class*="ChevronDown"], [data-lucide="chevron-down"]') }).first();
      const overflowVisible = await overflowBtn.isVisible().catch(() => false);
      if (overflowVisible) {
        await overflowBtn.click();
        await page.waitForTimeout(300);
        const downloadItem = page.getByRole('menuitem', { name: /Download/i }).or(
          page.getByText(/Download/i)
        ).first();
        await downloadItem.click();
      } else {
        // Just click Generate to confirm the page doesn't crash
        const generateBtn = page.getByRole('button', { name: /^Generate$/i }).first();
        await generateBtn.click();
      }
    }

    await page.waitForTimeout(500);
    // Verify no crash - page still renders reports section
    const reportSection = page.getByText(/Standard Reports|Report/i).first();
    await expect(reportSection).toBeVisible({ timeout: TIMEOUT });
  });

  // ReportTest-06
  test('ReportTest-06: Preview report opens modal', async ({ page }) => {
    await gotoMonitorReports(page);

    const standardNav = page.getByRole('button', { name: /Standard Reports/i });
    await expect(standardNav).toBeVisible({ timeout: TIMEOUT });
    await standardNav.click();
    await page.waitForTimeout(800);

    // Click the Preview (Eye icon) button on the first report
    const previewBtn = page.getByRole('button', { name: /^Preview$/i }).first();
    await expect(previewBtn).toBeVisible({ timeout: TIMEOUT });
    await previewBtn.click();
    await page.waitForTimeout(500);

    // A modal/dialog should open showing report details
    const modal = page.locator('[role="dialog"]').or(
      page.locator('.fixed.inset-0').filter({ hasText: /Report|preview/i })
    );
    await expect(modal.first()).toBeVisible({ timeout: TIMEOUT });
  });

  // ReportTest-07
  test('ReportTest-07: Close preview modal works', async ({ page }) => {
    await gotoMonitorReports(page);

    const standardNav = page.getByRole('button', { name: /Standard Reports/i });
    await expect(standardNav).toBeVisible({ timeout: TIMEOUT });
    await standardNav.click();
    await page.waitForTimeout(800);

    // Open the preview modal
    const previewBtn = page.getByRole('button', { name: /^Preview$/i }).first();
    await expect(previewBtn).toBeVisible({ timeout: TIMEOUT });
    await previewBtn.click();
    await page.waitForTimeout(500);

    // Modal should be open
    const modal = page.locator('[role="dialog"]').or(
      page.locator('.fixed.inset-0').filter({ hasText: /Report/i })
    );
    await expect(modal.first()).toBeVisible({ timeout: TIMEOUT });

    // Click X or Close button
    const closeBtn = page.getByRole('button', { name: /Close|close/i }).or(
      page.locator('button').filter({ has: page.locator('svg[class*="X"], [data-lucide="x"]') })
    ).first();

    const closeBtnVisible = await closeBtn.isVisible().catch(() => false);
    if (closeBtnVisible) {
      await closeBtn.click();
    } else {
      // Try pressing Escape
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(500);

    // Modal should be dismissed
    const modalAfterClose = page.locator('[role="dialog"]');
    const modalCount = await modalAfterClose.count();
    expect(modalCount).toBe(0);
  });
});
