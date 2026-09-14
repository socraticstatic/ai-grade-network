import { test, expect } from '@playwright/test';
import { seedAuth, gotoConnectionDetail, gotoCreate } from './helpers';

// ---------------------------------------------------------------------------
// C2C-01 to C2C-07 — Cloud to Cloud: per-leg drill-down + creation
//
// conn-2 ("Multi-Cloud Production") is the seed C2C connection: one Hub hub
// linking an Azure leg (Dallas, 10 Gbps) and an AWS leg (San Jose, 5 Gbps).
// The Hub is AT&T's Cloud Node.
// ---------------------------------------------------------------------------

test.describe('Cloud to Cloud — drill-down', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // C2C-01: the connection detail header reflects both legs + the hub
  test('C2C-01: detail header shows both clouds linked via Hub', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');
    await expect(page.getByText(/Azure .* AWS via Hub/i).first()).toBeVisible({ timeout: 8000 });
  });

  // C2C-02: the topology fans the Hub hub to both cloud legs (both clickable)
  test('C2C-02: topology renders Hub hub and both cloud legs as drill targets', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');
    await expect(page.getByRole('button', { name: /open hub/i }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /open azure cloud/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /open aws cloud/i }).first()).toBeVisible();
  });

  // C2C-03: clicking a cloud leg opens the Leg drawer with that leg's real, per-leg data
  test('C2C-03: clicking the AWS leg opens a drawer with per-leg bandwidth and ASN', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');
    await page.getByRole('button', { name: /open aws cloud/i }).first().click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible({ timeout: 6000 });
    await expect(drawer.getByText('AWS leg')).toBeVisible();
    // AWS leg is 5 Gbps (divergent from the Azure leg's 10 Gbps) — proves per-leg data
    await expect(drawer.getByText('5 Gbps')).toBeVisible();
    // AWS Direct Connect provider-side ASN
    await expect(drawer.getByText('7224')).toBeVisible();
  });

  // C2C-04: the Azure leg shows its own divergent bandwidth
  test('C2C-04: the Azure leg drawer shows its own bandwidth (10 Gbps)', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');
    await page.getByRole('button', { name: /open azure cloud/i }).first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible({ timeout: 6000 });
    await expect(drawer.getByText('Azure leg')).toBeVisible();
    await expect(drawer.getByText('10 Gbps')).toBeVisible();
  });

  // C2C-05: clicking the Hub hub navigates to the Hub (Cloud Node) page
  test('C2C-05: clicking the Hub hub navigates to the Hub page', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');
    await page.getByRole('button', { name: /open hub/i }).first().click();
    await page.waitForURL(/\/#\/hubs\//i, { timeout: 8000 });
    expect(page.url()).toMatch(/\/#\/hubs\//i);
  });

  // C2C-06: the Cloud Legs card chips are also drill targets
  test('C2C-06: a Cloud Legs chip opens the same Leg drawer', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-2');
    await page.getByRole('button', { name: /open aws leg/i }).first().click();
    await expect(page.getByRole('dialog').getByText('AWS leg')).toBeVisible({ timeout: 6000 });
  });

  // C2C-09: leg bandwidth is read-only while Active, editable after deactivation, per-leg.
  // Uses conn-c2c-demo, whose primary provider is AWS — it must still get the Deactivate
  // flow (a Cloud to Cloud is not AWS Max), which is the point of the special-casing fix.
  test('C2C-09: AWS-primary C2C can be deactivated and its legs edited per-leg', async ({ page }) => {
    await gotoConnectionDetail(page, 'conn-c2c-demo');

    // Even though AWS is the primary provider, a Deactivate control is present.
    const toggle = page.getByRole('button', { name: /^Active$/ });
    await expect(toggle).toBeVisible({ timeout: 6000 });

    // While Active, the leg is read-only with guidance (modify-active rule).
    await page.getByRole('button', { name: /open google leg/i }).first().click();
    await expect(page.getByRole('dialog').getByText(/Deactivate the connection to modify/i)).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('dialog').getByLabel('Leg bandwidth')).toHaveCount(0);
    await page.getByRole('dialog').getByRole('button', { name: /close drawer/i }).click();

    // Deactivate.
    await toggle.click();
    await expect(page.getByRole('button', { name: /^Inactive$/ })).toBeVisible({ timeout: 6000 });

    // Now the Google leg (10 Gbps) is editable; change it to 2 Gbps and confirm it persists.
    await page.getByRole('button', { name: /open google leg/i }).first().click();
    await page.getByRole('dialog').getByLabel('Leg bandwidth').selectOption('2 Gbps');
    await page.getByRole('dialog').getByRole('button', { name: /close drawer/i }).click();
    await page.getByRole('button', { name: /open google leg/i }).first().click();
    await expect(page.getByRole('dialog').getByLabel('Leg bandwidth')).toHaveValue('2 Gbps');
    await page.getByRole('dialog').getByRole('button', { name: /close drawer/i }).click();

    // The AWS leg is untouched (still 10 Gbps).
    await page.getByRole('button', { name: /open aws leg/i }).first().click();
    await expect(page.getByRole('dialog').getByLabel('Leg bandwidth')).toHaveValue('10 Gbps');
  });
});

test.describe('Cloud to Cloud — creation', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // C2C-07: Cloud to Cloud requires at least two clouds before proceeding
  test('C2C-07: Cloud to Cloud gates the provider step until two clouds are selected', async ({ page }) => {
    await gotoCreate(page);

    await page.locator('button').filter({ hasText: /guided setup/i }).first().click();
    await page.waitForTimeout(600);

    // Step 1: name + connection type. Selecting "Cloud to Cloud" reveals the provider
    // grid inline (the type option is a button whose accessible name is its
    // concatenated heading + description).
    await page.getByPlaceholder(/Production-Finance/i).fill('C2C E2E AWS-Azure');
    await page.getByRole('button', { name: /cloud to cloud/i }).first().click();
    await expect(page.getByRole('heading', { name: /select your cloud providers/i })).toBeVisible({ timeout: 6000 });

    const next = page.getByRole('button', { name: /^next$/i });

    // Provider options are buttons named by their logo alt text (AWS, Microsoft Azure).
    await page.getByRole('button', { name: /^AWS$/i }).click();
    await page.waitForTimeout(300);
    await expect(next).toBeDisabled(); // one cloud is not enough for C2C

    await page.getByRole('button', { name: /azure/i }).click();
    await page.waitForTimeout(300);
    await expect(next).toBeEnabled(); // two clouds satisfies the C2C gate
  });

  // C2C-08: the full guided walk creates a Cloud to Cloud connection
  test('C2C-08: full guided walk creates a Cloud to Cloud connection', async ({ page }) => {
    await gotoCreate(page);

    await page.locator('button').filter({ hasText: /guided setup/i }).first().click();
    await page.waitForTimeout(500);

    // Step: name + type + (inline) providers
    await page.getByPlaceholder(/Production-Finance/i).fill('C2C E2E Full');
    await page.getByRole('button', { name: /cloud to cloud/i }).first().click();
    await expect(page.getByRole('heading', { name: /select your cloud providers/i })).toBeVisible({ timeout: 6000 });
    await page.getByRole('button', { name: /^AWS$/i }).click();
    await page.getByRole('button', { name: /azure/i }).click();

    const next = page.getByRole('button', { name: /^next$/i });
    await next.click(); // -> resiliency

    await page.locator('[data-testid^="resiliency-option-"]').first().click();
    await next.click(); // -> locations

    await page.getByTestId('location-option-AWS').first().click();
    await page.getByTestId('location-option-Azure').first().click();
    await next.click(); // -> bandwidth
    await next.click(); // -> advanced
    await next.click(); // -> review

    await page.getByRole('button', { name: /^create connection$/i }).click();

    // The wizard auto-navigates to Manage. The connection must be reachable from the
    // hub-grouped view: the wizard now creates the named Hub and links it, so
    // it is no longer orphaned. (The Hub group header carries the hub name,
    // which equals the connection name.)
    await page.waitForURL(/\/#\/manage/i, { timeout: 8000 });
    await page.getByRole('button', { name: /^hubs/i }).click();
    await expect(page.getByText('C2C E2E Full').first()).toBeVisible({ timeout: 8000 });
  });
});
