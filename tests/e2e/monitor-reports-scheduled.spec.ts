import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

const TIMEOUT = 8000;

async function gotoScheduledReports(page: any) {
  await page.goto('/#/monitor', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  // Click Reports tab in Monitor dashboard
  await page.getByRole('button', { name: /^Reports$/i }).click();
  await page.waitForTimeout(1000);
  // Click Scheduled sub-tab in the reporting vertical nav
  await page.getByRole('button', { name: /^Scheduled$/i }).click();
  await page.waitForTimeout(800);
}

test.describe('Monitor Reports - Scheduled', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // ScheduleTest-01
  test('ScheduleTest-01: Scheduled reports section loads', async ({ page }) => {
    await gotoScheduledReports(page);

    // The scheduled reports section should render with either:
    // - a list of schedule cards
    // - or an empty state with "Create Schedule" button
    const createScheduleBtn = page.getByRole('button', { name: /Create Schedule/i });
    await expect(createScheduleBtn).toBeVisible({ timeout: TIMEOUT });

    // Heading should be present
    const heading = page.getByText(/Scheduled Reports/i).first();
    await expect(heading).toBeVisible({ timeout: TIMEOUT });
  });

  // ScheduleTest-02
  test('ScheduleTest-02: Create Schedule modal opens', async ({ page }) => {
    await gotoScheduledReports(page);

    const createBtn = page.getByRole('button', { name: /Create Schedule/i }).first();
    await expect(createBtn).toBeVisible({ timeout: TIMEOUT });
    await createBtn.click();
    await page.waitForTimeout(600);

    // Modal should open with "Create Scheduled Report" title
    const modalTitle = page.getByText(/Create Scheduled Report/i);
    await expect(modalTitle).toBeVisible({ timeout: TIMEOUT });

    // Name field
    const nameInput = page.locator('#name').or(
      page.getByPlaceholder(/Daily Performance Summary/i)
    );
    await expect(nameInput).toBeVisible({ timeout: TIMEOUT });

    // Report Type select
    const reportTypeSelect = page.locator('#reportType').or(
      page.locator('select').filter({ has: page.locator('option[value=""]') }).first()
    );
    await expect(reportTypeSelect).toBeVisible({ timeout: TIMEOUT });

    // Frequency select
    const frequencySelect = page.locator('#frequency').or(
      page.locator('select').filter({ hasText: /Daily|Weekly|Monthly/i }).first()
    );
    await expect(frequencySelect).toBeVisible({ timeout: TIMEOUT });

    // Format select
    const formatSelect = page.locator('#format').or(
      page.locator('select').filter({ hasText: /PDF|CSV|Excel/i }).first()
    );
    await expect(formatSelect).toBeVisible({ timeout: TIMEOUT });

    // Recipients section
    const recipientsLabel = page.getByText(/Recipients/i);
    await expect(recipientsLabel.first()).toBeVisible({ timeout: TIMEOUT });
  });

  // ScheduleTest-03
  test('ScheduleTest-03: Create Schedule form submission', async ({ page }) => {
    await gotoScheduledReports(page);

    // Count initial schedules
    const scheduleCards = page.locator('.rounded-3xl').filter({ hasText: /Active|Paused/ });
    const initialCount = await scheduleCards.count();

    const createBtn = page.getByRole('button', { name: /Create Schedule/i }).first();
    await createBtn.click();
    await page.waitForTimeout(600);

    // Fill schedule name
    const nameInput = page.locator('#name').or(
      page.getByPlaceholder(/Daily Performance Summary/i)
    );
    await nameInput.fill('E2E Schedule');

    // Select report type (pick first available option)
    const reportTypeSelect = page.locator('#reportType');
    const options = await reportTypeSelect.locator('option').allInnerTexts();
    const firstNonEmpty = options.find(o => o.trim() !== '' && o !== 'Select a report type');
    if (firstNonEmpty) {
      await reportTypeSelect.selectOption({ label: firstNonEmpty });
    } else {
      // Fallback: select index 1
      await reportTypeSelect.selectOption({ index: 1 });
    }

    // Set frequency to Daily
    const frequencySelect = page.locator('#frequency');
    await frequencySelect.selectOption('daily');

    // Time is pre-filled, but set it explicitly
    const timeInput = page.locator('#time').or(page.locator('input[type="time"]'));
    await timeInput.fill('09:00');

    // Add recipient
    const recipientInput = page.getByPlaceholder(/email@example\.com/i);
    await recipientInput.fill('test@att.com');
    // Press Enter or click Add button to add the recipient
    await recipientInput.press('Enter');
    await page.waitForTimeout(300);

    // If there's an "Add" button for recipients, click it
    const addRecipientBtn = page.getByRole('button', { name: /^Add$/i });
    const addBtnVisible = await addRecipientBtn.isVisible().catch(() => false);
    if (addBtnVisible) {
      await addRecipientBtn.click();
      await page.waitForTimeout(200);
    }

    // Submit the form
    const saveBtn = page.getByRole('button', { name: /Save Schedule|Create Schedule|Save/i }).last();
    await expect(saveBtn).toBeVisible({ timeout: TIMEOUT });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Modal should close
    const modalTitle = page.getByText(/Create Scheduled Report/i);
    await expect(modalTitle).not.toBeVisible({ timeout: TIMEOUT });

    // New schedule should appear in list
    await expect(page.getByText('E2E Schedule')).toBeVisible({ timeout: TIMEOUT });
  });
});
