import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * What Andi spotted, above the rules table on Govern. Each row states a
 * behavioral finding and what enforcing its rule would touch; "Enforce it"
 * enforces that rule, on the spot.
 *
 * It used to navigate to /discover and stage a draft instead, which this spec
 * pinned. That made the button a no-op on the surface you pressed it from —
 * the advice you had just acted on sat there unchanged until you committed on
 * another page. The row already prints the dryRun price, so the detour bought
 * a step and no information.
 *
 * The single most important behavior under test is unchanged: a finding's
 * `active` predicate is recomputed from live estate state, so once its rule is
 * enforced the proposal disappears on its own - nothing dismisses it, the
 * estate just no longer matches.
 */

test('Govern shows what Andi spotted, and enforcing retires the proposal in place', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });

  const band = page.getByTestId('proposal-band');
  await expect(band).toBeVisible();
  const rowsBefore = await page.getByTestId('proposal-row').count();
  expect(rowsBefore).toBeGreaterThan(0);
  const enforced = (await band.getByTestId('proposal-row').first().innerText()).split('\n')[1];

  await band.getByTestId('proposal-enforce').first().click();

  // No navigation: the advice clears where you pressed the button.
  await expect(page).toHaveURL(/#\/naas\/govern/);
  await expect(page.getByTestId('proposal-row')).toHaveCount(rowsBefore - 1);
  await expect(band).not.toContainText(enforced);

  // And it is a real, reversible engine move — not a dismissal.
  expect(await page.evaluate(() => !!(window as never as { CC: { canUndo: () => unknown } }).CC.canUndo())).toBe(true);

  // Survives a reload: the finding is resolved, not hidden.
  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('proposal-row')).toHaveCount(rowsBefore - 1);
});

test('the Andi badge counts the same proposals the band shows', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('proposal-band')).toBeVisible();

  const rows = await page.getByTestId('proposal-row').count();
  await expect(page.getByTestId('andi-proposal-badge')).toHaveText(String(rows));
});
