import { test, expect, type Page } from '@playwright/test';

/**
 * End-to-end proof for token-policy authoring. The machine stages, never
 * commits: opening the builder and staging a spec changes nothing on its
 * own, only a commit on the /discover review tray does.
 *
 * The second test is the honesty fix at the heart of this feature: enforcing
 * a policy from the table (rd-helion, seeded with enforced:false and no
 * enforce-mode cap-token-spend intent) must read Armed, not Enforcing, once
 * committed - the budget gate needs a cap intent the estate does not carry.
 */

async function firstVisit(page: Page, hash: string) {
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`/#${hash}`, { waitUntil: 'domcontentloaded' });
  const dismiss = page.getByRole('button', { name: /^(skip|skip tour|close|got it|maybe later|no thanks)$/i });
  while (await dismiss.first().isVisible().catch(() => false)) { await dismiss.first().click(); await page.waitForTimeout(150); }
  await page.keyboard.press('Escape').catch(() => {});
}

test('a person can author a token policy end to end', async ({ page }) => {
  await firstVisit(page, '/ai/govern');
  await page.getByRole('button', { name: /new policy/i }).click();
  await expect(page.getByTestId('policy-builder')).toBeVisible();
  await expect(page.getByTestId('policy-preview')).toBeVisible();

  await page.getByLabel(/budget/i).fill('750000');
  await page.getByTestId('policy-stage').click();

  await expect(page).toHaveURL(/#\/discover/);
  await expect(page.getByText(/Token policy · /i)).toBeVisible();
  await page.getByTestId('design-commit').click();

  // Finding 1: this is a policy-only commit, and CC.setTokenPolicy pushes no
  // undo entry - the banner must say so honestly rather than claiming Undo
  // reverts it.
  await expect(page.getByTestId('design-tray')).toHaveText(/committed to the estate\. Undo will not revert this/i);

  await page.goto('/#/ai/govern', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('750,000')).toBeVisible();
});

test('an enforced policy with no cap intent reads Armed, not Enforcing', async ({ page }) => {
  await firstVisit(page, '/ai/govern');
  // "rd-helion" also appears in the Agents table below (helion-tuner's App
  // column), so the row lookup is scoped to the token-policies panel
  // (data-tour="aifabric-policies") rather than the bare page - a plain
  // `tr` locator would be ambiguous across the two tables.
  const policies = page.locator('[data-tour="aifabric-policies"]');
  const row = policies.locator('tr', { hasText: 'rd-helion' }).first();
  await row.getByRole('link', { name: /enforce/i }).click();
  await expect(page).toHaveURL(/#\/discover/);
  await page.getByTestId('design-commit').click();

  await page.goto('/#/ai/govern', { waitUntil: 'domcontentloaded' });
  const status = page
    .locator('[data-tour="aifabric-policies"]')
    .locator('tr', { hasText: 'rd-helion' })
    .first()
    .getByTestId('policy-status');
  await expect(status).toHaveText(/armed/i);
});
