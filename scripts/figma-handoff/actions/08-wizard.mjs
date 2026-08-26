// Screen 08 — ProvisionWizard, On-ramp/PoP step (densest form step).
// Deep link ?provision=usw2 opens the wizard (ANDI's path); pick the first
// attach type to enable Next, advance one step, settle.
export async function run(page) {
  await page.waitForSelector('[data-testid="wizard-canvas"]', { timeout: 15000 });
  await page.waitForTimeout(800);
  // step 0: choose the first attach-type option (radio/card buttons inside the wizard panel)
  const dialog = await page.$('[role="dialog"]') ?? page;
  const options = await page.$$('[role="dialog"] button, [role="dialog"] [role="radio"], [role="dialog"] input[type="radio"]');
  for (const o of options) {
    const t = (await o.innerText().catch(() => '')) || '';
    if (/tenanted|managed|direct|vpc/i.test(t)) { await o.click(); break; }
  }
  await page.waitForTimeout(500);
  const next = (await page.$$('button')).filter(async b => /next/i.test(await b.innerText().catch(()=> '')));
  for (const b of await page.$$('button')) {
    const t = await b.innerText().catch(() => '');
    if (/^next$/i.test(t.trim())) { await b.click(); break; }
  }
  await page.waitForTimeout(1200);
}
