// Screen 05 — FabricHero drill. Click a drillable site-class node in the
// hero; ConnectPage.drillInto() opens it (EdgeTrail + drilled column).
// Selector from FabricHero.tsx: data-testid="fabric-node-site-<id>".
export async function run(page) {
  await page.waitForSelector('[data-testid^="fabric-node-site-"]', { timeout: 15000 });
  const nodes = await page.$$('[data-testid^="fabric-node-site-"]');
  // first drillable site class (Data centers) — click and let the drill settle
  await nodes[0].click();
  await page.waitForTimeout(1500);
}
