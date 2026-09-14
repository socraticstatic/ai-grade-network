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
await page.addInitScript(({ seedAdvisor, dark }) => {
  localStorage.setItem('tour-main-app-completed', 'true');
  localStorage.setItem('product-tour-completed', 'true');
  localStorage.setItem('e2e-skip-demo-modal', 'true');
  if (seedAdvisor) localStorage.setItem('advisor:meridian:done', '1');
  if (dark) {
    // Same two hooks the app itself uses: class before first paint,
    // localStorage so ThemeProvider keeps (not strips) the class.
    localStorage.setItem('theme-mode', 'dark');
    document.documentElement.classList.add('dark');
  }
}, { seedAdvisor: !flag('no-advisor-done'), dark: flag('dark') });
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
    /* Layer naming. html.to.design names a Figma layer from the element's
     * aria-label when present, else falls back to `tag.class` — which is
     * where `div.flex-1` / `span.truncate` layer soup comes from. Labelling
     * containers HERE means layers arrive in Figma already readable, instead
     * of being renamed by the thousand afterwards. aria-label is metadata:
     * it cannot move a pixel. Leaf text is left alone — h2d already names
     * those by their own content. */
    /* Vocabulary and truncation match the names already in the Figma file
     * (established during the 2026-08-26 rename pass) so the new boards read
     * as one library, not two conventions. Priority: author's own aria-label
     * → the element's own text, cut at 44 chars + "…" → a layout-role word. */
    const CUT = 44;
    const textOf = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
    const clip = (t) => (t.length > CUT ? t.slice(0, CUT) + '…' : t);
    const TAGS = { nav:'Navigation', header:'Header', main:'Main content', footer:'Footer',
      aside:'Sidebar', table:'Table', thead:'Table header', tbody:'Table body',
      tr:'Row', th:'Header cell', td:'Cell', form:'Form', ul:'List', ol:'List',
      li:'List item', dialog:'Dialog', section:'Section' };

    const roleOf = (el, cs) => {                             // the established role words
      const c = ' ' + el.className + ' ';
      const has = (k) => typeof el.className === 'string' && c.includes(' ' + k);
      if (has('group')) return 'Hover group';
      if (cs.display === 'grid') return 'Grid';
      if (cs.display === 'flex' || cs.display === 'inline-flex')
        return cs.flexDirection.startsWith('column') ? 'Stack' : 'Row';
      if (parseFloat(cs.borderTopLeftRadius) >= 8 &&
          (cs.borderTopWidth !== '0px' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)')) return 'Card';
      if (el.getBoundingClientRect().height <= 2) return 'Rule';
      if (has('flex-1')) return 'Flex item';
      if (has('w-full')) return 'Full width';
      return TAGS[el.tagName.toLowerCase()] || '';
    };

    /* Only a *thin wrapper* — one that owns exactly one run of text — takes
     * that text as its name. Aggregate containers would otherwise be named
     * with every descendant string concatenated ("AT&TAI-grade networkDisc…"),
     * which is worse than the class name it replaces. They get a role word. */
    const textSources = (el) => {
      let n = 0;
      for (const node of [el, ...el.querySelectorAll('*')]) {
        for (const child of node.childNodes)
          if (child.nodeType === 3 && child.nodeValue.trim()) { n++; break; }
        if (n > 1) break;
      }
      return n;
    };

    const nameFor = (el) => {
      if (!el || el.nodeType !== 1 || el === document.body) return '';
      const tag = el.tagName.toLowerCase();
      if (tag === 'svg' || tag === 'script' || tag === 'style') return '';
      if (!el.firstElementChild) return '';                  // leaf: h2d names it by its text
      const own = textSources(el) === 1 ? textOf(el) : '';
      return own ? clip(own) : roleOf(el, getComputedStyle(el));
    };

    document.body.querySelectorAll('*').forEach(el => {
      if (el.getAttribute('aria-label')) return;             // author already named it
      const name = nameFor(el);
      /* Skip when the parent resolves to the same name. h2d collapses
       * redundant wrappers on import and joins their names with an arrow, so
       * naming every level of a nested single-text wrapper yields layers
       * called "AI Fabric → AI Fabric → AI Fabric". Only the outermost of a
       * run gets the name; the rest stay generic and get absorbed. */
      if (!name || name === nameFor(el.parentElement)) return;
      el.setAttribute('aria-label', name);
    });

    // Canvas → img so charts survive the freeze.
    document.querySelectorAll('canvas').forEach(c => {
      try { const img = document.createElement('img'); img.src = c.toDataURL('image/png');
        img.style.cssText = getComputedStyle(c).cssText; c.replaceWith(img); } catch {}
    });
    document.querySelectorAll('script,link[rel="modulepreload"]').forEach(s => s.remove());

    /* Chrome serialises getComputedStyle(el).cssText to "" for SVG elements,
     * so the naive inline pass wrote style="" onto every <text>/<path> and
     * threw their font away — the artboard then imported those labels in the
     * converter's fallback face (this is where 61 stray Inter segments came
     * from). Rebuild the declaration by hand for anything cssText won't
     * serialise. */
    /* HTML inside <foreignObject> hits the same empty-cssText path (found
       2026-08-31: the CW/NB provider tiles lost their chip backgrounds in
       every frozen board, light set included). The rebuild list therefore
       carries the HTML box properties too — harmless on SVG elements, which
       ignore them. */
    /* PAINT properties only — never geometry. Writing width/height here
       pinned text boxes to Chrome's metrics and Figma's slightly-wider Aleck
       wrapped "AI-grade network" onto two lines on import (2026-08-31).
       Layout geometry is the converter's job; paint is what cssText loses. */
    const SVG_PROPS = ['font-family','font-size','font-weight','font-style','letter-spacing',
      'fill','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-dasharray',
      'text-anchor','dominant-baseline','paint-order','opacity','display',
      'color','background-color','background-image','border','border-radius','box-shadow',
      'padding','line-height','text-align','overflow','text-overflow','white-space','filter'];
    const inline = (el) => {
      const cs = getComputedStyle(el);
      let css = cs.cssText;
      if (!css) css = SVG_PROPS
        .map(p => [p, cs.getPropertyValue(p)])
        .filter(([, v]) => v)
        .map(([p, v]) => `${p}:${v}`)
        .join(';');
      el.setAttribute('style', css);
      [...el.children].forEach(inline);
    };
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
  const artPath = path.join('docs/figma-handoff/artboards', `${slug}.html`);
  fs.mkdirSync(path.dirname(artPath), { recursive: true }); // slug may carry a subdir (dark/)
  fs.writeFileSync(artPath, inlined);
}
await browser.close();
console.log('wrote', capDir);
