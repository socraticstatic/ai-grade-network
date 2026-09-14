import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/**
 * The Cost arbitrage workspace, end to end: open Cost, read the hero savings,
 * attach an opportunity bucket on the breakdown, and assert the saving rose and
 * the row flipped to captured — the engine recompute reaching the hero and the
 * list in one click. Deterministic; runs under reduced motion so the count-up
 * settles instantly on the engine-derived figure.
 */
test.use({ reducedMotion: 'reduce' });

function num(text: string): number {
  const m = text.match(/\$([\d.]+)(k?)/i);
  if (!m) return NaN;
  return parseFloat(m[1]) * (m[2] ? 1000 : 1);
}

test('attaching a path on Cost raises the hero savings and flips the bucket to captured', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await seedAuth(page);
  await page.goto('/#/naas/cost', { waitUntil: 'domcontentloaded' });

  const savings = page.getByTestId('hero-savings');
  await expect(savings).toBeVisible();
  const before = num((await savings.innerText()).trim());
  expect(before).toBeGreaterThan(0);

  // Pick the first opportunity row (an Attach lever exists) and capture it.
  // The button's accessible name is its aria-label ("Attach … to the fabric …").
  const attach = page.getByRole('button', { name: /Attach .+ to the fabric/i }).first();
  await expect(attach).toBeVisible();
  const row = page.locator('li', { has: attach });
  const label = (await row.locator('span.truncate').first().innerText()).trim();

  await attach.click();

  // The saving rose and the row now reads "on the fabric".
  await expect.poll(async () => num((await savings.innerText()).trim())).toBeGreaterThan(before);
  const capturedRow = page.locator('li', { hasText: label });
  await expect(capturedRow.getByText(/on the fabric/i)).toBeVisible();
  // The session tally appeared.
  await expect(page.getByText(/captured so far/i)).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});
