// Screen 01 — Discover entry. Meridian never persists its advisor-done flag
// (advisorPhase.ts keeps it in-memory), so a fresh load always lands on
// /discover/advisor. Skip the advisor the way a real visitor does, which
// marks it done for the session and navigates to /discover.
export async function run(page) {
  await page.waitForSelector('[data-testid="advisor-skip"]', { timeout: 15000 });
  await page.click('[data-testid="advisor-skip"]');
  await page.waitForURL(/#\/discover$/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}
