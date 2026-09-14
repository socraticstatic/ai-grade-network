import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

const TIMEOUT = 8000;

async function gotoMonitorMetrics(page: any) {
  await page.goto('/#/monitor', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  // Click the Detailed Metrics tab in the Monitor dashboard tab bar
  await page.getByRole('button', { name: /Detailed Metrics|Metrics/i }).click();
  await page.waitForTimeout(1000);
}

test.describe('Monitor Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // MetricTest-01
  test('MetricTest-01: Metrics tab loads without errors', async ({ page }) => {
    // Listen for console errors to detect JS crashes
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await gotoMonitorMetrics(page);

    // Metrics tab should render some content (charts or KPI cards)
    // The EnhancedMetricsTab renders after lazy loading
    await page.waitForTimeout(1500);

    // Check that something rendered in the metrics area
    const metricsContent = page.locator('.p-6, .space-y-6, [class*="metric"], [class*="chart"]').first();
    await expect(metricsContent).toBeVisible({ timeout: TIMEOUT });

    // No fatal JS errors should have occurred
    const fatalErrors = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Non-Error') &&
      !e.includes('favicon')
    );
    expect(fatalErrors.length).toBe(0);
  });

  // MetricTest-02
  test('MetricTest-02: Time range filter updates', async ({ page }) => {
    await gotoMonitorMetrics(page);

    // Find the Time Range select in the dashboard filter bar
    const timeRangeSelect = page.locator('select').filter({ hasText: /Last.*Hour|Last.*Minutes|Last.*Days/i }).first();
    await expect(timeRangeSelect).toBeVisible({ timeout: TIMEOUT });

    // Change to 24h
    await timeRangeSelect.selectOption('24h');
    await page.waitForTimeout(800);

    // Page should still render without crash
    const metricsContent = page.locator('.p-6, .space-y-6').first();
    await expect(metricsContent).toBeVisible({ timeout: TIMEOUT });

    // The select should reflect the new value
    await expect(timeRangeSelect).toHaveValue('24h');
  });

  // MetricTest-03
  test('MetricTest-03: Refresh button is clickable', async ({ page }) => {
    await gotoMonitorMetrics(page);

    // Find the Refresh button in the filter bar
    const refreshBtn = page.getByRole('button', { name: /^Refresh$/i }).first();
    await expect(refreshBtn).toBeVisible({ timeout: TIMEOUT });

    await refreshBtn.click();
    await page.waitForTimeout(500);

    // Page should still be functional - no crash
    // The button may show "Refreshing..." briefly
    // Then return to "Refresh"
    await page.waitForTimeout(1500);

    // Button should still be visible (no crash)
    const refreshBtnAfter = page.getByRole('button', { name: /Refresh/i }).first();
    await expect(refreshBtnAfter).toBeVisible({ timeout: TIMEOUT });
  });
});
