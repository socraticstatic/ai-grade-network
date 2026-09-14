import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

test('ANDI narrates: ask to connect a region, walk the drawn wizard, the fabric flips', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  // Open ANDI and ask — idiom from e2e/andi.spec.ts: the header toggle is
  // reached by testid (its accessible name carries a live proposal count,
  // so a role/name lookup would be a moving target), and the prompt goes
  // through the testid'd input, not a role-based textbox.
  await page.getByTestId('andi-toggle').click();
  const panel = page.getByTestId('andi-panel');
  await expect(panel).toBeVisible();
  await page.getByTestId('andi-input').fill('connect us-west-2 with dual paths');
  await page.getByTestId('andi-input').press('Enter');

  // ANDI answers with a draft action; clicking it lands in the pre-filled wizard.
  await panel.getByRole('button', { name: /Provision us-west-2 with dual paths/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('wizard-canvas')).toBeVisible();

  // Walk it: the resiliency step already has Dual pressed.
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await expect(dialog.getByRole('button', { name: /Dual · resilient/ })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await dialog.getByTestId('provision-confirm').click();

  await expect(page.locator('[data-fabric-edge][data-region-id="usw2"]').first())
    .toHaveAttribute('data-path', 'private');
});
