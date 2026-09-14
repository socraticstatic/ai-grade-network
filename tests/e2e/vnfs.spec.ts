import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

const TIMEOUT = 8000;
// conn-2 = "Multi-Cloud Production" (Azure) — VNFs tab is enabled.
// conn-1 = "Corporate Cloud Hub" (AWS) — VNFs tab is DISABLED; use conn-2 here.
const CONNECTION_URL = '/#/connections/conn-2';

async function gotoVNFs(page: any) {
  await page.goto(CONNECTION_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Click the "VNFs" tab in the connection detail tabs
  await page.getByRole('button', { name: /^VNFs$/i }).click();
  await page.waitForTimeout(800);
}

test.describe('VNFs', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // VNFTest-01: VNF tab loads with table or empty state
  test('VNFTest-01: VNF tab on connection detail loads', async ({ page }) => {
    await gotoVNFs(page);

    // VNF section renders with table (conn-2 has seeded VNFs) or an empty state
    // .first() avoids strict mode when multiple matching elements exist (table + "No VNFs" row)
    const vnfContent = page.locator('table').or(
      page.getByText(/No VNFs|Virtual Network|Add Network Function/i)
    ).first();
    await expect(vnfContent).toBeVisible({ timeout: TIMEOUT });
  });

  // VNFTest-02: Add Network Function button opens VNF modal
  test('VNFTest-02: Add Network Function opens template selection', async ({ page }) => {
    await gotoVNFs(page);

    // VNFSection renders "Add Network Function" (not "Add VNF")
    const addBtn = page.getByRole('button', { name: /Add Network Function/i });
    await expect(addBtn).toBeVisible({ timeout: TIMEOUT });
    await addBtn.click();
    await page.waitForTimeout(600);

    // The VNF modal should open with template cards
    const templateCard = page.getByText(/Palo Alto|Cisco|VeloCloud|Fortinet/i).first();
    await expect(templateCard).toBeVisible({ timeout: TIMEOUT });

    // The modal should show template selection instruction text
    const templateGrid = page.getByText(/Choose a template|pre-defined network function/i);
    await expect(templateGrid).toBeVisible({ timeout: TIMEOUT });
  });

  // VNFTest-03: Clicking a VNF template advances to step 2
  test('VNFTest-03: VNF template selection advances to step 2', async ({ page }) => {
    await gotoVNFs(page);

    const addBtn = page.getByRole('button', { name: /Add Network Function/i });
    await addBtn.click();
    await page.waitForTimeout(600);

    // Wait for the template selection view
    const paloAltoCard = page.getByText(/Palo Alto/i).first();
    await expect(paloAltoCard).toBeVisible({ timeout: TIMEOUT });

    // Click the Palo Alto VM-Series template card
    // Target the h4 heading inside the card — click bubbles to parent div's onClick
    const templateHeading = page.locator('h4').filter({ hasText: /Palo Alto VM-Series/i });
    await expect(templateHeading).toBeVisible({ timeout: TIMEOUT });
    await templateHeading.click();
    await page.waitForTimeout(800);

    // After clicking a template, showTemplates becomes false → form is revealed
    // Wait for the template grid to disappear (confirms showTemplates=false)
    await expect(page.getByText(/Choose a template|pre-defined network function/i)).not.toBeVisible({ timeout: TIMEOUT });

    // The name field has placeholder "e.g., Edge Firewall" and should be pre-filled
    // (FormField uses unwrapped <label> with no htmlFor, so use placeholder selector)
    const nameInput = page.getByPlaceholder(/Edge Firewall/i);
    await expect(nameInput).toBeVisible({ timeout: TIMEOUT });

    const nameValue = await nameInput.inputValue();
    expect(nameValue).toContain('Palo Alto');

    // VNF Type label should be present
    const typeField = page.getByText(/VNF Type/i).first();
    await expect(typeField).toBeVisible({ timeout: TIMEOUT });
  });
});
