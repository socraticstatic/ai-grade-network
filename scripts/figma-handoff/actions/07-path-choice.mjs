// Screen 07 — PathChoice + PathTable. From e2e/mvp-screens.spec.ts:
// clicking region node use1 surfaces the two path cards.
export async function run(page) {
  await page.waitForSelector('[data-testid="fabric-node-region-use1"]', { timeout: 15000 });
  await page.click('[data-testid="fabric-node-region-use1"]');
  await page.waitForSelector('[data-testid="path-managed-direct"]', { timeout: 10000 });
  await page.waitForTimeout(1000);
}
