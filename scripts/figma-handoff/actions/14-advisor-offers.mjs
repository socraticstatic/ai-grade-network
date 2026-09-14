// Screen 14 — Advisor · Tiered offers. Walk the full advisor conversation:
// greet → gap → scan → every finding (each FindingCard carries the
// good/better/best offer ladder from offerCatalog.ts — FinOps, security,
// transport) → wrap. Replies are buttons inside advisor-replies.
async function clickReply(page, label) {
  await page.waitForFunction((l) => {
    const zone = document.querySelector('[data-testid="advisor-replies"]');
    return zone && [...zone.querySelectorAll('button')].some(b => b.innerText.trim() === l);
  }, label, { timeout: 30000 });
  await page.evaluate((l) => {
    const zone = document.querySelector('[data-testid="advisor-replies"]');
    [...zone.querySelectorAll('button')].find(b => b.innerText.trim() === l).click();
  }, label);
}
export async function run(page) {
  await page.waitForSelector('[data-testid="advisor-replies"]', { timeout: 20000 });
  await clickReply(page, "What can't you see?");
  await clickReply(page, 'Connect with demo credentials');
  // scan auto-advances into finding-0; then walk the findings
  for (let i = 0; i < 10; i++) {
    const next = await page.waitForFunction(() => {
      const zone = document.querySelector('[data-testid="advisor-replies"]');
      if (!zone) return null;
      const labels = [...zone.querySelectorAll('button')].map(b => b.innerText.trim());
      if (labels.includes('What else did you notice?')) return 'more';
      if (labels.includes('So what does it add up to?')) return 'wrap';
      return null;
    }, { timeout: 45000 }).then(h => h.jsonValue());
    if (next === 'more') await clickReply(page, 'What else did you notice?');
    else { await clickReply(page, 'So what does it add up to?'); break; }
  }
  // wrap beat finishes with its replies
  await page.waitForFunction(() => {
    const zone = document.querySelector('[data-testid="advisor-replies"]');
    return zone && [...zone.querySelectorAll('button')].some(b => /14-day assessment/.test(b.innerText));
  }, { timeout: 45000 });
  await page.waitForTimeout(1500);
}
