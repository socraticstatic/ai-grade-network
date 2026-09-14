// Screen 02 — advisor first screen. The opening monologue + findings stream
// in without user interaction; wait for the stream to settle before capture.
export async function run(page) {
  await page.waitForTimeout(12000);
  const h1 = await page.evaluate(() => document.body.innerText.length);
  await page.waitForTimeout(3000);
  const h2 = await page.evaluate(() => document.body.innerText.length);
  if (h2 > h1) await page.waitForTimeout(5000); // still streaming — one more beat
}
