import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

/* The group vocabulary reaching the AI Fabric: the AI Fabric's own Govern
   screen renders the west-workloads token policy with a resolution count that
   AGREES with the engine at that moment — never a pinned number. */
test('AI Fabric · Govern shows the group-scoped token policy resolving live', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/ai/govern', { waitUntil: 'domcontentloaded' });

  const row = page.getByRole('row').filter({ hasText: 'West workloads' });
  await expect(row).toBeVisible();
  // The stored id shows alongside the label — it is what the policy keys on.
  await expect(row).toContainText('west-workloads');

  const count = await page.evaluate(
    () =>
      (window as unknown as { CC: { resolveGroup: (id: string) => { count: number } } }).CC.resolveGroup(
        'west-workloads',
      ).count,
  );
  expect(count).toBeGreaterThan(0);
  await expect(row).toContainText(
    `resolves to ${count} object${count === 1 ? '' : 's'} right now`,
  );
});
