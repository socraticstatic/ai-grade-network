import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

test.describe('Policies Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // PolicyTest-01
  test('policies config loads with policy tabs', async ({ page }) => {
    await page.goto('/#/configure/policies', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Use getByRole('button') to target the sidebar nav buttons, not the content heading
    // (getByText('Layer 3 IPV4') resolves to both the sidebar button AND the content heading)
    await expect(page.getByRole('button', { name: 'Layer 3 IPV4' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Layer 3 IPV6' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Bandwidth' })).toBeVisible({ timeout: 8000 });
  });

  // PolicyTest-02
  test('layer 3 IPV4 tab shows toggle buttons for policy directions', async ({ page }) => {
    await page.goto('/#/configure/policies', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Click the Layer 3 IPV4 sidebar button (not the content heading)
    await page.getByRole('button', { name: 'Layer 3 IPV4' }).click();
    await page.waitForTimeout(500);

    // Direction labels should be visible.
    await expect(page.getByText(/On Premise.*Partner/i).first()).toBeVisible({ timeout: 8000 });
    // Toggle switch buttons (class toggle-switch) should be present.
    const toggles = page.locator('.toggle-switch');
    const count = await toggles.count();
    expect(count).toBeGreaterThan(0);
  });

  // PolicyTest-03
  test('toggling a layer 3 policy direction changes button visual state', async ({ page }) => {
    await page.goto('/#/configure/policies', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Layer 3 IPV4' }).click();
    await page.waitForTimeout(500);

    // Find the first toggle switch.
    const firstToggle = page.locator('.toggle-switch').first();
    await firstToggle.waitFor({ timeout: 8000 });

    // Capture initial active state via class.
    const initialClass = await firstToggle.getAttribute('class') ?? '';
    const wasActive = initialClass.includes('bg-fw-cobalt-600');

    // Click to toggle.
    await firstToggle.click();
    await page.waitForTimeout(300);

    // Class should have changed.
    const newClass = await firstToggle.getAttribute('class') ?? '';
    const isActive = newClass.includes('bg-fw-cobalt-600');
    expect(isActive).toBe(!wasActive);
  });
});
