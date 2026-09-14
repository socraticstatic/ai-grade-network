import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/* ⌘K intents: the palette states what a command is worth before it runs,
   and running it moves the same figures the verb pages state. */

test('a cap intent typed in ⌘K changes the budget /ai/govern states', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/ai/govern', { waitUntil: 'domcontentloaded' });

  // The policy table states shared-services' budget before the intent.
  const row = page.locator('tr', { hasText: 'shared-services' }).first();
  await expect(row).toBeVisible();
  const before = await row.innerText();

  await page.keyboard.press('Meta+k');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox').or(dialog.locator('input')).first().fill('cap shared-services 2m');
  const intent = dialog.getByText('Cap shared-services at 2.00M tokens/day · token policy');
  await expect(intent).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);

  // The budget cell moved to the figure the intent named — the table renders
  // it through fmtTokens (metric audit row 87), same as the palette label.
  await expect(row).toContainText('2.00M');
  expect(await row.innerText()).not.toBe(before);
});

test('the palette prices attach intents with the cross-section arithmetic', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  // The Discover design mode states usw2's arrow; the palette must state
  // the same one — one derivation, two surfaces.
  await page.getByTestId('design-toggle').click();
  const chipText = await page.getByTestId('move-attach-usw2').innerText();
  const arrow = chipText.match(/(\d+→\d+ ms)/)![1];
  await page.getByTestId('design-toggle').click();

  await page.keyboard.press('Meta+k');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await dialog.locator('input').first().fill('attach us-west-2');
  await expect(dialog.getByText(new RegExp(`Attach us-west-2 · ${arrow}`))).toBeVisible();
  await page.keyboard.press('Escape');
});

test('free text yields no intent and touches nothing', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  // Focus the document before the shortcut — a keypress into an unfocused
  // page never reaches the window listener.
  await page.getByTestId('stack-panel').click();
  await page.keyboard.press('Meta+k');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  await dialog.locator('input').first().fill('cap nonexistent-tag 5m');
  await expect(dialog.getByText(/token policy/)).toHaveCount(0);
  await page.keyboard.press('Escape');
});
