// Screen 06 — EstateLevelMap at scale. Drill the Branches class (2,840
// sites) so the level map renders with rollup, search and sort — the
// Wells-Fargo-scale view. Site node order in the hero: data centers,
// offices, branches, ATMs.
export async function run(page) {
  await page.waitForSelector('[data-testid^="fabric-node-site-"]', { timeout: 15000 });
  const nodes = await page.$$('[data-testid^="fabric-node-site-"]');
  await nodes[2].click(); // Branches
  await page.waitForSelector('[data-testid="estate-level-map"]', { timeout: 10000 });
  await page.waitForTimeout(1200);
}
