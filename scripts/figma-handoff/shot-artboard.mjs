// Screenshot a frozen artboard from file:// to prove it is self-contained.
import { chromium } from 'playwright';
const [file, out] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file://' + file, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const fontOk = await page.evaluate(() => document.fonts.check('16px "ATT Aleck Sans"'));
await page.screenshot({ path: out, fullPage: true });
console.log('aleck loaded:', fontOk);
await browser.close();
