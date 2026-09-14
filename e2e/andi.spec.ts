import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/* Andi: the advisor, intents and grounded answers as a conversation. Every
   figure it states must be the engine's, and nothing applies without a
   confirm. */

test('Andi opens from the header, answers grounded, and caps a budget on confirm', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/ai/home', { waitUntil: 'domcontentloaded' });

  // Toggle from the header.
  await page.getByTestId('andi-toggle').click();
  const panel = page.getByTestId('andi-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('andi-context')).toHaveText('AI Fabric · AI Fabric');

  // A grounded question.
  await panel.getByText('Which team is driving most spend?').click();
  await expect(panel.getByRole('button', { name: 'Open Teams & limits' })).toBeVisible();

  // A typed intent requires confirm, then applies through the engine.
  await page.getByTestId('andi-input').fill('cap shared-services 2m');
  await page.getByTestId('andi-input').press('Enter');
  const confirm = panel.getByRole('button', { name: /Cap shared-services at 2.00M tokens\/day/ });
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(panel.getByText(/Applied\. Undo/)).toBeVisible();

  // The Governance surface states the new ceiling.
  await page.getByTestId('rail-teams').click();
  const row = page.locator('tr', { hasText: 'shared-services' }).first();
  await expect(row).toContainText('2,000,000');

  // Andi survives navigation, context chip tracking the section.
  await expect(page.getByTestId('andi-context')).toHaveText('AI Fabric · Teams & limits');
});

test('Resolve drafts into the twin', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/home', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('andi-toggle').click();
  const panel = page.getByTestId('andi-panel');
  await expect(panel.getByTestId('andi-resolve')).toBeVisible();
  await panel.getByRole('button', { name: 'Draft in the twin' }).first().click();
  await expect(page).toHaveURL(/#\/discover/);
  const tray = page.getByTestId('design-tray');
  await expect(tray).toContainText('Drafted by Andi');
  // Nothing committed — discard leaves the estate untouched.
  await page.getByTestId('design-discard').click();
  await expect(page.getByTestId('design-tray')).toHaveCount(0);
});
