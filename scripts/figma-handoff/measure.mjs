// scripts/figma-handoff/measure.mjs
// Audits + captures + freezes one screen at 1440px for the Figma handoff.
// Usage: node scripts/figma-handoff/measure.mjs --route /naas/home --slug 03-naas-home [--actions <file>] [--no-advisor-done] [--freeze]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const val = (n) => { const i = argv.indexOf(`--${n}`); return i === -1 ? null : argv[i + 1]; };
const route = val('route'); const slug = val('slug');
if (!route || !slug) { console.error('need --route and --slug'); process.exit(1); }
const base = process.env.HANDOFF_BASE ?? 'http://localhost:5177';
const capDir = path.join('docs/figma-handoff/captures', slug);
fs.mkdirSync(capDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript((seedAdvisor) => {
  localStorage.setItem('att_nb_user', JSON.stringify({ email: 'handoff@att.com' }));
  localStorage.setItem('tour-main-app-completed', 'true');
  localStorage.setItem('product-tour-completed', 'true');
  localStorage.setItem('e2e-skip-demo-modal', 'true');
  if (seedAdvisor) localStorage.setItem('advisor:meridian:done', '1');
}, !flag('no-advisor-done'));
// HashRouter app (main.tsx): the route lives in the hash; resolveProfile reads
// window.location.search, which sits BEFORE the hash.
await page.goto(`${base}/?estate=meridian#${route}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const actions = val('actions');
if (actions) { const mod = await import(path.resolve(actions)); await mod.run(page); }
await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
await page.waitForTimeout(1000);

// Measurements: visible elements to depth 10, geometry + the styles a redline needs.
const data = await page.evaluate(() => {
  const KEYS = ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color',
    'backgroundColor','borderRadius','border','boxShadow','padding','margin','gap','display'];
  const out = [];
  const walk = (el, depth, trail) => {
    if (depth > 10) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    const id = `${trail}/${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''}`;
    const styles = {}; KEYS.forEach(k => styles[k] = cs[k]);
    out.push({ id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      text: el.children.length === 0 ? (el.textContent || '').trim().slice(0, 60) : undefined, styles });
    [...el.children].forEach((c, i) => walk(c, depth + 1, `${trail}/${i}`));
  };
  walk(document.body, 0, '');
  return { url: location.href, height: document.documentElement.scrollHeight, elements: out };
});
fs.writeFileSync(path.join(capDir, 'measure.json'), JSON.stringify(data, null, 2));
await page.screenshot({ path: path.join(capDir, `${slug}@2x.png`), fullPage: true });

if (flag('freeze')) {
  const html = await page.evaluate(() => {
    // Canvas → img so charts survive the freeze.
    document.querySelectorAll('canvas').forEach(c => {
      try { const img = document.createElement('img'); img.src = c.toDataURL('image/png');
        img.style.cssText = getComputedStyle(c).cssText; c.replaceWith(img); } catch {}
    });
    document.querySelectorAll('script,link[rel="modulepreload"]').forEach(s => s.remove());
    const inline = (el) => { el.setAttribute('style', getComputedStyle(el).cssText);
      [...el.children].forEach(inline); };
    inline(document.body);
    return '<!doctype html>\n' + document.documentElement.outerHTML;
  });
  // Inline the ATT Aleck woff2s as data URIs so the artboard is truly
  // standalone — the dev-server-relative /src/assets/fonts/ URLs die the
  // moment the file leaves this machine.
  const inlined = html.replace(/url\((['"]?)(\/src\/assets\/fonts\/[^'")]+)\1\)/g, (m, _q, p) => {
    const file = path.join(process.cwd(), p.slice(1)); // /src/assets/... → src/assets/...
    if (!fs.existsSync(file)) { console.warn('font missing, left as-is:', p); return m; }
    return `url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')})`;
  });
  fs.mkdirSync('docs/figma-handoff/artboards', { recursive: true });
  fs.writeFileSync(path.join('docs/figma-handoff/artboards', `${slug}.html`), inlined);
}
await browser.close();
console.log('wrote', capDir);
