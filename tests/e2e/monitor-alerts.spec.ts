import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

const TIMEOUT = 8000;

async function gotoMonitorAlerts(page: any) {
  await page.goto('/#/monitor', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  // Click the Alerts tab in the Monitor dashboard tab bar
  await page.getByRole('button', { name: /^Alerts$/i }).click();
  await page.waitForTimeout(800);
}

async function openRuleMaking(page: any) {
  await gotoMonitorAlerts(page);
  // Click the "Rule Making" vertical sub-tab
  await page.getByRole('button', { name: /Rule Making/i }).click();
  await page.waitForTimeout(800);
}

test.describe('Monitor Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // AlertTest-01
  test('AlertTest-01: Monitor alerts tab loads', async ({ page }) => {
    await page.goto('/#/monitor', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const alertsTab = page.getByRole('button', { name: /^Alerts$/i });
    await expect(alertsTab).toBeVisible({ timeout: TIMEOUT });
    await alertsTab.click();
    await page.waitForTimeout(800);

    // The alerts section has a vertical nav with "Alert Viewer" and "Rule Making"
    const alertViewer = page.getByRole('button', { name: /Alert Viewer/i });
    await expect(alertViewer).toBeVisible({ timeout: TIMEOUT });
  });

  // AlertTest-02
  test('AlertTest-02: Alert Rule Making tab is accessible', async ({ page }) => {
    await openRuleMaking(page);

    // After clicking Rule Making, the Alert Rules list should render
    const alertRulesNav = page.getByRole('button', { name: /Alert Rules/i });
    await expect(alertRulesNav).toBeVisible({ timeout: TIMEOUT });

    // The rule list or empty state should be present
    const ruleContent = page.locator('h3').filter({ hasText: /Alert Rules/i });
    await expect(ruleContent).toBeVisible({ timeout: TIMEOUT });
  });

  // AlertTest-03
  test('AlertTest-03: Create Alert Rule modal opens', async ({ page }) => {
    await openRuleMaking(page);

    // Ensure we are on the Alert Rules sub-tab
    await page.getByRole('button', { name: /Alert Rules/i }).click();
    await page.waitForTimeout(500);

    const createBtn = page.getByRole('button', { name: /Create Alert Rule/i });
    await expect(createBtn).toBeVisible({ timeout: TIMEOUT });
    await createBtn.click();
    await page.waitForTimeout(500);

    // Modal should be visible with Name input, Priority select, Conditions section
    const modal = page.locator('div').filter({ hasText: /Create Alert Rule/ }).last();
    await expect(modal).toBeVisible({ timeout: TIMEOUT });

    // Name input
    const nameInput = page.getByPlaceholder(/e\.g\., High Latency/i);
    await expect(nameInput).toBeVisible({ timeout: TIMEOUT });

    // Priority select
    const prioritySelect = page.locator('select').filter({ hasText: /Low|Medium|High|Critical/ }).first();
    await expect(prioritySelect).toBeVisible({ timeout: TIMEOUT });

    // Conditions section header
    const conditionsLabel = page.getByText(/Conditions/i).first();
    await expect(conditionsLabel).toBeVisible({ timeout: TIMEOUT });
  });

  // AlertTest-04
  test('AlertTest-04: Create Alert Rule validation', async ({ page }) => {
    await openRuleMaking(page);

    await page.getByRole('button', { name: /Alert Rules/i }).click();
    await page.waitForTimeout(500);

    const createBtn = page.getByRole('button', { name: /Create Alert Rule/i });
    await createBtn.click();
    await page.waitForTimeout(500);

    // Submit without filling name - click Create Rule button
    const submitBtn = page.getByRole('button', { name: /Create Rule/i });
    await expect(submitBtn).toBeVisible({ timeout: TIMEOUT });
    await submitBtn.click();
    await page.waitForTimeout(500);

    // A validation toast or error message should appear
    // The app uses window.addToast for validation errors
    const errorIndicator = page.locator('[role="alert"]').or(
      page.getByText(/Validation Error|required|fill in all/i)
    );
    await expect(errorIndicator.first()).toBeVisible({ timeout: TIMEOUT });
  });

  // AlertTest-05
  test('AlertTest-05: Create Alert Rule with full data', async ({ page }) => {
    await openRuleMaking(page);

    await page.getByRole('button', { name: /Alert Rules/i }).click();
    await page.waitForTimeout(500);

    // Count existing rules before creation
    const ruleCards = page.locator('.card').filter({ hasText: /priority/i });
    const initialCount = await ruleCards.count();

    const createBtn = page.getByRole('button', { name: /Create Alert Rule/i });
    await createBtn.click();
    await page.waitForTimeout(500);

    // Fill name
    const nameInput = page.getByPlaceholder(/e\.g\., High Latency/i);
    await nameInput.fill('E2E Alert Rule');

    // Set priority to High
    const prioritySelect = page.locator('select').filter({ hasText: /Low|Medium|High|Critical/ }).first();
    await prioritySelect.selectOption('high');

    // Fill condition: type = threshold, field = latency, operator = exceeds, value = 100
    const conditionRow = page.locator('.rounded-lg').filter({ hasText: /Severity|Keyword|Pattern|Threshold/ }).first();

    const typeSelect = conditionRow.locator('select').first();
    await typeSelect.selectOption('threshold');

    const fieldInput = conditionRow.locator('input[placeholder="Field name"]');
    await fieldInput.fill('latency');

    const operatorSelect = conditionRow.locator('select').nth(1);
    await operatorSelect.selectOption('exceeds');

    const valueInput = conditionRow.locator('input[placeholder="Value"]');
    await valueInput.fill('100');

    // Check Email notification
    const emailCheckbox = page.getByRole('checkbox').filter({ has: page.locator('+ span:text("Email")') }).or(
      page.locator('label').filter({ hasText: /^Email$/ }).locator('input[type="checkbox"]')
    );
    const emailLabel = page.locator('label').filter({ hasText: /^Email$/ });
    await emailLabel.locator('input[type="checkbox"]').check();

    // Submit
    const submitBtn = page.getByRole('button', { name: /Create Rule/i });
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // Modal should close
    const modalTitle = page.getByText(/Create Alert Rule/).filter({ hasText: /Create Alert Rule/ });
    // The modal closes - check that the sticky header is gone
    const stickyHeader = page.locator('.fixed .sticky').filter({ hasText: /Create Alert Rule/ });
    await expect(stickyHeader).toHaveCount(0, { timeout: TIMEOUT });

    // New rule should appear in the list
    await expect(page.getByText('E2E Alert Rule')).toBeVisible({ timeout: TIMEOUT });
  });

  // AlertTest-06
  test('AlertTest-06: Toggle alert rule enable/disable', async ({ page }) => {
    await openRuleMaking(page);

    await page.getByRole('button', { name: /Alert Rules/i }).click();
    await page.waitForTimeout(500);

    // Find the first rule's toggle checkbox
    const toggleCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(toggleCheckbox).toBeVisible({ timeout: TIMEOUT });

    const initialState = await toggleCheckbox.isChecked();
    await toggleCheckbox.click();
    await page.waitForTimeout(400);

    const newState = await toggleCheckbox.isChecked();
    expect(newState).not.toBe(initialState);
  });

  // AlertTest-07
  test('AlertTest-07: Delete alert rule removes from list', async ({ page }) => {
    await openRuleMaking(page);

    await page.getByRole('button', { name: /Alert Rules/i }).click();
    await page.waitForTimeout(500);

    // Count rule cards before delete
    const ruleCards = page.locator('.card');
    const initialCount = await ruleCards.count();

    // Click Delete (Trash2 icon button) on the first rule
    const deleteBtn = page.locator('button[title*="Delete"], button[title*="delete"]').first();
    const trashBtn = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' }).last();

    // Use a more targeted approach: find button near a trash icon
    const allButtons = page.locator('.card button');
    const buttonCount = await allButtons.count();

    // The delete button is the last action button in each card row
    // Click the delete button (Trash2 icon) in the first rule card
    await allButtons.nth(buttonCount - 1).click();
    await page.waitForTimeout(600);

    const newCount = await ruleCards.count();
    expect(newCount).toBeLessThan(initialCount);
  });
});
