import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

test('the provision wizard draws the connection while you answer, then the fabric inherits it', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/connect', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('fabric-node-region-usw2').click();
  await page.getByTestId('open-provision-wizard').click();

  const dialog = page.getByRole('dialog');
  const canvas = dialog.getByTestId('wizard-canvas');
  await expect(canvas).toBeVisible();

  // The region is known - the right station is already answered.
  await expect(dialog.getByTestId('wc-right')).toHaveAttribute('data-answered', 'true');
  // The attach question is still open - the left edge is a ghost.
  await expect(dialog.getByTestId('wc-edge-left')).toHaveAttribute('data-answered', 'false');

  // Answer attach type, then on-ramp: the picture solidifies left to right.
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await expect(dialog.getByTestId('wc-edge-left')).toHaveAttribute('data-answered', 'true');
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await expect(dialog.getByTestId('wc-left')).toHaveAttribute('data-answered', 'true');

  // Choose dual resiliency: the wire doubles.
  await dialog.getByRole('button', { name: /Dual · resilient/ }).click();
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await expect(dialog.getByTestId('wc-edge-right')).toHaveAttribute('data-dual', 'true');

  // Confirm: the wizard's picture becomes the fabric's reality.
  await dialog.getByTestId('provision-confirm').click();
  await expect(page.locator('[data-fabric-edge][data-region-id="usw2"]').first())
    .toHaveAttribute('data-path', 'private');
});
