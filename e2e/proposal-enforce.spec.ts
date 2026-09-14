import { test, expect } from '@playwright/test';

test('Govern: Enforce it removes the advice, in place', async ({ page }) => {
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const before = await page.getByTestId('proposal-row').count();
  const title = (await page.getByTestId('proposal-row').first().innerText()).split('\n')[1];
  console.log('before:', before, '| enforcing:', title);

  await page.getByTestId('proposal-enforce').first().click();
  await page.waitForTimeout(600);

  console.log('after :', await page.getByTestId('proposal-row').count());
  console.log('url unchanged:', page.url().includes('/naas/govern'));
  console.log('that advice gone:', !(await page.getByTestId('proposal-row').allInnerTexts()).some(t=>t.includes(title)));
  console.log('undo available:', await page.evaluate(() => !!(window as any).CC.canUndo()));
  expect(await page.getByTestId('proposal-row').count()).toBe(before - 1);
});

test('Andi panel: Enforce it removes the card', async ({ page }) => {
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.getByTestId('andi-toggle').click();
  await page.waitForTimeout(600);

  const cards = page.locator('[data-testid^="andi-proposal-finding-"]');
  const before = await cards.count();
  const badgeBefore = await page.getByTestId('andi-proposal-badge').innerText().catch(()=>'-');
  console.log('cards before:', before, '| badge:', badgeBefore);

  await cards.first().getByRole('button', { name: /enforce it/i }).click();
  await page.waitForTimeout(700);
  console.log('cards after :', await cards.count(), '| badge:', await page.getByTestId('andi-proposal-badge').innerText().catch(()=>'-'));
  expect(await cards.count()).toBe(before - 1);
});
