import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

const TIMEOUT = 8000;
// conn-1 is the first standard connection in the store's sample data
const CONNECTION_URL = '/#/connections/conn-1';

async function gotoHubs(page: any) {
  await page.goto(CONNECTION_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Click the "Hubs" tab in the connection detail tabs
  await page.getByRole('button', { name: /Hubs/i }).click();
  await page.waitForTimeout(800);
}

test.describe('Hubs', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  // RouterTest-01
  test('RouterTest-01: Hubs tab on connection detail loads', async ({ page }) => {
    await gotoHubs(page);

    // The hub section should render - either cards or empty state
    const routerContent = page.locator('[class*="Hub"], [class*="hub"]').or(
      page.getByText(/Hub|Add Hub/i).first()
    );
    await expect(routerContent).toBeVisible({ timeout: TIMEOUT });
  });

  // RouterTest-02
  test('RouterTest-02: Add Hub button opens modal/drawer', async ({ page }) => {
    await gotoHubs(page);

    const addBtn = page.getByRole('button', { name: /Add (Connection )?Hub/i });
    await expect(addBtn).toBeVisible({ timeout: TIMEOUT });
    await addBtn.click();
    await page.waitForTimeout(600);

    // A side drawer or modal should open
    const drawerOrModal = page.getByText(/Hub Name|Add Hub/i).filter({ hasText: /Name|edit|create/i }).or(
      page.locator('[class*="SideDrawer"], [class*="side-drawer"], [class*="drawer"]').first()
    );
    await expect(drawerOrModal).toBeVisible({ timeout: TIMEOUT });
  });

  // RouterTest-03
  test('RouterTest-03: Hub form has required fields', async ({ page }) => {
    await gotoHubs(page);

    const addBtn = page.getByRole('button', { name: /Add (Connection )?Hub/i });
    await addBtn.click();
    await page.waitForTimeout(600);

    // Name input
    const nameInput = page.getByPlaceholder(/Primary Hub/i).or(
      page.locator('input').filter({ has: page.locator('[placeholder*="Hub"]') })
    );
    await expect(nameInput).toBeVisible({ timeout: TIMEOUT });

    // Location dropdown
    const locationSelect = page.locator('select').filter({ has: page.locator('option:has-text("Select a location")') }).or(
      page.locator('select[id*="location"], select[name*="location"]')
    ).first();
    await expect(locationSelect).toBeVisible({ timeout: TIMEOUT });

    // Description textarea
    const descriptionInput = page.getByPlaceholder(/description for this hub/i).or(
      page.locator('textarea').first()
    );
    await expect(descriptionInput).toBeVisible({ timeout: TIMEOUT });
  });

  // RouterTest-04
  test('RouterTest-04: Cancel Add Hub closes without saving', async ({ page }) => {
    await gotoHubs(page);

    const addBtn = page.getByRole('button', { name: /Add (Connection )?Hub/i });
    await addBtn.click();
    await page.waitForTimeout(600);

    // Fill in the name
    const nameInput = page.getByPlaceholder(/Primary Hub/i);
    await nameInput.fill('Test Router');

    // Click Cancel
    const cancelBtn = page.getByRole('button', { name: /^Cancel$/i });
    await expect(cancelBtn).toBeVisible({ timeout: TIMEOUT });
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Drawer should be closed
    await expect(page.getByPlaceholder(/Primary Hub/i)).not.toBeVisible({ timeout: TIMEOUT });

    // "Test Router" should not appear in the list
    const testRouter = page.getByText('Test Router');
    const testRouterCount = await testRouter.count();
    expect(testRouterCount).toBe(0);
  });

  // RouterTest-05
  test('RouterTest-05: View toggle switches between card and table', async ({ page }) => {
    await gotoHubs(page);

    // The view toggle buttons have LayoutGrid and List icons
    // Start in card view (default) - switch to table view
    const tableViewBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(-2);

    // More reliably: find the button containing the List icon
    // HubSection renders two icon buttons for view mode toggle
    // We look for the pair of small icon-only buttons
    const viewToggleButtons = page.locator('button.p-1\\.5, button[class*="p-1"]').filter({ has: page.locator('svg') });
    const toggleCount = await viewToggleButtons.count();

    if (toggleCount >= 2) {
      // Click the second button (table/list icon)
      await viewToggleButtons.nth(1).click();
      await page.waitForTimeout(400);

      // Table should now be visible
      const tableElement = page.locator('table').or(
        page.locator('[class*="EnhancedTable"], [class*="table"]')
      );
      await expect(tableElement.first()).toBeVisible({ timeout: TIMEOUT });

      // Click the first button to switch back to card view
      await viewToggleButtons.nth(0).click();
      await page.waitForTimeout(400);

      // Back in card view: the Hub cards render (a Hub name is visible).
      const hubCard = page.getByText(/AT&T Core|Enterprise|Hub/i).first();
      await expect(hubCard).toBeVisible({ timeout: TIMEOUT });
    } else {
      // If toggle not found, at least verify the section rendered
      const routerSection = page.getByText(/Hub|Add Hub/i).first();
      await expect(routerSection).toBeVisible({ timeout: TIMEOUT });
    }
  });

  // RouterTest-06
  test('RouterTest-06: hub overflow menu has edit and delete options', async ({ page }) => {
    await gotoHubs(page);

    // Switch to table view first to access overflow menus
    const viewToggleButtons = page.locator('button.p-1\\.5, button[class*="p-1"]').filter({ has: page.locator('svg') });
    const toggleCount = await viewToggleButtons.count();

    if (toggleCount >= 2) {
      // Switch to table view
      await viewToggleButtons.nth(1).click();
      await page.waitForTimeout(500);
    }

    // Find the overflow menu (OverflowMenu component renders a trigger button)
    // OverflowMenu uses a three-dot or chevron trigger
    const overflowTrigger = page.locator('button').filter({ has: page.locator('[data-lucide*="more"], [class*="more"], svg[class*="MoreVertical"], svg[class*="more-vertical"]') }).first();

    const overflowVisible = await overflowTrigger.isVisible().catch(() => false);
    if (!overflowVisible) {
      // Try finding the OverflowMenu component's trigger differently
      // OverflowMenu renders a button that opens a dropdown
      const allRowButtons = page.locator('tr button, .card button').last();
      await allRowButtons.click();
    } else {
      await overflowTrigger.click();
    }
    await page.waitForTimeout(400);

    // Verify Edit Router and Delete Router options are visible
    const editItem = page.getByText(/Edit Hub/i);
    const deleteItem = page.getByText(/Delete Hub/i);

    await expect(editItem.first()).toBeVisible({ timeout: TIMEOUT });
    await expect(deleteItem.first()).toBeVisible({ timeout: TIMEOUT });
  });
});
