import { test, expect, type Page } from '@playwright/test';

async function firstVisit(page: Page, hash: string) {
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`/#${hash}`, { waitUntil: 'domcontentloaded' });
  const dismiss = page.getByRole('button', { name: /^(skip|skip tour|close|got it|maybe later|no thanks)$/i });
  while (await dismiss.first().isVisible().catch(() => false)) { await dismiss.first().click(); await page.waitForTimeout(150); }
  await page.keyboard.press('Escape').catch(() => {});
}

test('NaaS Home shows the board with the flagship, verb nav intact', async ({ page }) => {
  await firstVisit(page, '/naas/home');
  const dashboard = page.getByTestId('layer-dashboard');
  await expect(dashboard).toBeVisible();
  // Widget titles are card headings; scope to the dashboard and match the
  // heading role so this can't collide with the same words appearing in the
  // verb-nav copy below the board (e.g. "Token budgets and spend").
  await expect(dashboard.getByRole('heading', { name: 'Standing intents', exact: true })).toBeVisible();
  await expect(dashboard.getByRole('heading', { name: 'Money on the table', exact: true })).toBeVisible();
  // Verb nav still present.
  await expect(page.getByTestId('home-verb-connect')).toBeVisible();
});

test('AI Home shows the AI board and not a NaaS-only widget', async ({ page }) => {
  await firstVisit(page, '/ai/home');
  const dashboard = page.getByTestId('layer-dashboard');
  await expect(dashboard).toBeVisible();
  await expect(dashboard.getByRole('heading', { name: 'Token budgets', exact: true })).toBeVisible();
  await expect(dashboard.getByRole('heading', { name: 'Money on the table', exact: true })).toHaveCount(0);
});
