import { test, expect } from '@playwright/test';
import { seedAuth, gotoCreate } from './helpers';

// ---------------------------------------------------------------------------
// Create-01 to Create-05  — Connection creation wizard tests
// The wizard shows a ModeSelection screen first (Guided Setup / Network Designer
// / API Builder), then a step-by-step flow including ProviderSelection (AWS,
// Azure, GCP, etc.).
// ---------------------------------------------------------------------------

test.describe('Create Connection Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // Create-01: Create wizard loads and shows mode selection / provider cards
  test('Create-01: wizard loads and renders mode or provider selection cards', async ({ page }) => {
    await gotoCreate(page);

    // The wizard first shows ModeSelection: "Guided Setup", "Network Designer", "API Builder"
    const guidedSetup = page.getByRole('button', { name: /guided setup/i })
      .or(page.getByText(/guided setup/i).first());
    const createHeading = page.getByText(/create new connection/i).first();

    // Either the heading or one of the mode cards must be visible
    await expect(createHeading.or(guidedSetup).first()).toBeVisible({ timeout: 10000 });

    // ModeSelection cards should be present
    const modeCards = page.locator('button').filter({ hasText: /guided setup|network designer|api builder/i });
    const cardCount = await modeCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  // Create-02: Selecting Guided Setup advances to provider selection
  test('Create-02: selecting Guided Setup shows provider selection (AWS, Azure, etc.)', async ({ page }) => {
    await gotoCreate(page);

    const guidedSetup = page.getByRole('button', { name: /guided setup/i })
      .or(page.locator('button').filter({ hasText: /guided setup/i }).first());

    await guidedSetup.waitFor({ timeout: 10000 });
    await guidedSetup.click();
    await page.waitForTimeout(800);

    // After selecting Guided Setup, the wizard advances.
    // Step 0 is "Your Hub" (name input), or step 2 is ProviderSelection.
    // Wait for either a hub name input OR provider cards.
    const hubInput = page.locator('input[type="text"]').first();
    const awsCard = page.getByText(/^aws$/i).or(page.getByAltText(/aws/i)).first();
    const nextBtn = page.getByRole('button', { name: "Next", exact: true });

    const advanced = await hubInput.isVisible({ timeout: 6000 }).catch(() => false)
      || await awsCard.isVisible({ timeout: 3000 }).catch(() => false)
      || await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);

    expect(advanced).toBe(true);
  });

  // Create-03: Cancel returns to connections / manage view
  test('Create-03: Cancel button returns to connections manage view', async ({ page }) => {
    await gotoCreate(page);

    // Cancel appears on ModeSelection screen or in the wizard step bar
    const cancelBtn = page.getByRole('button', { name: /^cancel$/i })
      .or(page.getByRole('link', { name: /^cancel$/i }))
      .or(page.locator('button').filter({ hasText: /^cancel$/i }))
      .first();

    // Also try "Back to Connections" which appears in error states
    const backToConn = page.getByRole('button', { name: /back to connections/i }).first();

    const btn = await cancelBtn.count() > 0 ? cancelBtn : backToConn;
    await btn.waitFor({ timeout: 10000 });
    await btn.click();

    // Should redirect to /#/manage
    await page.waitForURL(/\/#\/manage/i, { timeout: 8000 });
    expect(page.url()).toMatch(/\/#\/manage/i);
  });

  // Create-04: Back button returns to prior step
  test('Create-04: Back button in guided setup returns to previous step', async ({ page }) => {
    await gotoCreate(page);

    await page.locator('button').filter({ hasText: /guided setup/i }).first().click();
    await page.waitForTimeout(600);

    // Pick a type. Selecting a type advances to the Provider step. (Naming is optional
    // and only appears on the Review step now.)
    await page.locator('button').filter({ hasText: /internet to cloud/i }).first().click();
    await page.waitForTimeout(500);

    // Back should return to the connection-type step.
    const backBtn = page.getByRole('button', { name: /^back$/i }).first();
    await backBtn.waitFor({ timeout: 8000 });
    await backBtn.click();
    await page.waitForTimeout(500);

    const onTypeStep = await page.getByText(/choose your connection type/i).isVisible({ timeout: 4000 }).catch(() => false);
    expect(onTypeStep).toBe(true);
  });

  // Create-05: Wizard gates progression until required fields are provided
  test('Create-05: cannot proceed without required fields (Next disabled, then enabled)', async ({ page }) => {
    await gotoCreate(page);

    await page.locator('button').filter({ hasText: /guided setup/i }).first().click();
    await page.waitForTimeout(600);

    // On the type step with nothing selected, Next is disabled — the wizard gates
    // progression rather than allowing an invalid step.
    const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
    await nextBtn.waitFor({ timeout: 8000 });
    await expect(nextBtn).toBeDisabled();

    // Selecting a connection type unblocks progression (advances to the Provider step).
    await page.locator('button').filter({ hasText: /internet to cloud/i }).first().click();
    await page.waitForTimeout(500);
    const advanced = await page.getByText(/select your cloud providers/i).isVisible({ timeout: 4000 }).catch(() => false)
      || await nextBtn.isEnabled().catch(() => false);
    expect(advanced).toBe(true);
  });
});
