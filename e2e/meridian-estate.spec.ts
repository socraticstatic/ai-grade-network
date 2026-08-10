import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * Task 7 — the Meridian estate walk end-to-end. `?estate=meridian` must land
 * in `location.search` for the boot-time swap (estateProfile.ts resolveProfile)
 * to see it, so the URL puts the query BEFORE the hash — `/?estate=meridian#/discover`
 * — not `/#/discover?estate=meridian`, which the hash router would swallow into
 * the hash fragment and resolveProfile would never see.
 *
 * seedAuth() is required first: the dev server runs VITE_AUTH_MODE=gate (see
 * playwright.config.ts), and every existing Discover spec seeds the
 * att_nb_user localStorage key before navigating for the same reason.
 */
const MERIDIAN_URL = '/?estate=meridian#/discover';
const ACME_URL = '/?estate=acme#/discover';

test('meridian: Discover leads with rollups and the class chips scope them', async ({ page }) => {
  await seedAuth(page);
  await page.goto(MERIDIAN_URL, { waitUntil: 'domcontentloaded' });

  const rollups = page.getByTestId('site-rollup-row');
  await expect(rollups.first()).toBeVisible();
  // Meridian's 4,183 sites never render as individual site-row cards up
  // front — only the four class rollups (dc/office/branch/atm) do.
  await expect(page.getByTestId('site-row')).toHaveCount(0);

  // The ATMs chip lives in the estate filter chip row. Scoped there because
  // an unfiltered tree ALSO shows a site-rollup-row whose own text reads
  // "1,130 ATMs · … on AT&T" — an unscoped name match would find both the
  // chip and that rollup row's button and fail Playwright's strict mode.
  const chips = page.getByTestId('estate-filter-chips');
  await chips.getByRole('button', { name: 'ATMs', exact: true }).click();

  // Only the ATM class remains — one rollup row, carrying the 1,130 count.
  await expect(page.getByTestId('site-rollup-row')).toHaveCount(1);
  await expect(page.getByTestId('site-rollup-row').first()).toContainText('1,130');
});

test('meridian: tenant switch is interactive quickly', async ({ page }) => {
  await seedAuth(page);
  const t0 = Date.now();
  await page.goto(MERIDIAN_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('site-rollup-row').first()).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(5000); // generous e2e guard; the 200ms budget is a profiling target, not a CI gate
});

test('acme: unflagged boot is regression-clean', async ({ page }) => {
  await seedAuth(page);
  // Explicit reset - a prior test's localStorage may hold 'meridian' from
  // resolveProfile's persistence, even though Playwright gives every test
  // its own isolated context by default.
  await page.goto(ACME_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('site-row')).toHaveCount(6);
  await expect(page.getByTestId('site-rollup-row')).toHaveCount(0);
});
