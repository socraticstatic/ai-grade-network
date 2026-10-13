// Turn frozen captures into import-ready boards for html.to.design (2026-10-13).
// Slim: the inline stylesheet becomes a link to the live storefront.css plus the Aleck font faces; data-dc-tpl/data-fn go.
// Pin: the screen sits in a 1440x900 box (Personas keeps its height). Note: a board listed in the notes map gets a
// requirement card above its screen. Bake (headless Chrome): table cells get their rendered width so header and body
// share columns; single-line labels get white-space:nowrap with margins folded into padding so the plugin emits
// auto-width text instead of a fixed box a pixel short of the glyphs; text Chrome clips becomes the visible part + "…".
// Usage: node scripts/figma-handoff/wrap.mjs --index docs/figma-handoff/captures/index.json [--notes notes.local.json] [--out docs/figma-handoff/import]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
const { chromium } = await import('file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs');
const args = process.argv.slice(2), opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const INDEX = opt('--index', 'docs/figma-handoff/captures/index.json'), OUT = opt('--out', 'docs/figma-handoff/import'), NOTES = opt('--notes', '');
const LIVE = 'https://socraticstatic.github.io/ai-grade-network/';
const FONTS = [400, 500, 700].map((w, i) => `@font-face{font-family:'ATT Aleck Sans';src:url('${LIVE}fonts/ATTAleckSans_${['Regular', 'Medium', 'Bold'][i]}.woff2') format('woff2');font-weight:${w}}`).join('');
const FIXES = `<style id="noshrink-labels">b,small,strong,em,i,label,legend,figcaption,span>b,.js-cap,.js-soft{flex-shrink:0}select{white-space:nowrap}</style>` +
  `<style id="strip-segments">.ps>span::before{left:0;right:calc(50% + var(--n)/2)}.ps>span::after{content:'';position:absolute;left:calc(50% + var(--n)/2);right:0;top:calc(var(--n)/2 - 0.75px);height:1.5px;background:var(--border-secondary)}.ps.big>span::after{height:2px;top:calc(var(--n)/2 - 1px)}.ps>span:first-child::before{display:none}.ps>span:last-child::after{display:none}</style>` +
  `<style id="figma-font-override">*{font-family:'ATT Aleck Sans',Arial,sans-serif!important}</style>`;
const note = (dark, title, cite, applied) => { const [bg, bd, ink, soft, acc] = dark ? ['#16191d', '#2d3238', '#e8eaed', '#b4b9c0', '#4fc3f7'] : ['#ffffff', '#d7dbe0', '#0f1419', '#50565d', '#009fdb']; const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<aside aria-label="Requirement from the portal team" style="box-sizing:border-box;width:1440px;padding:20px 24px;border:1px solid ${bd};border-left:5px solid ${acc};border-radius:12px;background:${bg};color:${ink};font-family:'ATT Aleck Sans',Arial,sans-serif;font-size:14px;line-height:20px;display:flex;flex-direction:column;gap:8px"><div aria-label="Note head" style="display:flex;align-items:baseline;gap:12px"><span aria-label="Board" style="font-size:16px;line-height:22px;font-weight:700">${esc(title)}</span><span aria-label="Source" style="font-size:13px;line-height:18px;color:${soft}">From Amir's note for the Network Fabric portal team, 2026-10-12</span></div><div aria-label="Their words" style="display:flex;gap:10px"><span style="font-weight:700;color:${acc};white-space:nowrap">Amir asked</span><span>${esc(cite)}</span></div><div aria-label="Applied here" style="display:flex;gap:10px"><span style="font-weight:700;color:${acc};white-space:nowrap">Applied here</span><span>${esc(applied)}</span></div></aside>`; };
const BAKE = () => {
  const st = { cells: 0, nowrap: 0, margins: 0, truncated: 0 };
  for (const c of document.querySelectorAll('.dt-c')) { const w = c.getBoundingClientRect().width; c.style.width = c.style.minWidth = c.style.maxWidth = w + 'px'; c.style.boxSizing = 'border-box'; st.cells++; }
  const leaves = [...document.querySelectorAll('body *')].filter(e => e.childElementCount === 0 && e.textContent.trim() && !['SCRIPT', 'STYLE', 'OPTION', 'svg', 'path'].includes(e.tagName));
  for (const e of leaves) {
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3; if (r.height > lh * 1.6) continue;
    if (cs.whiteSpace !== 'nowrap' && cs.whiteSpace !== 'pre') { e.style.whiteSpace = 'nowrap'; st.nowrap++; }
    const m = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].map(k => parseFloat(cs[k]) || 0);
    if (/flex|grid/.test(getComputedStyle(e.parentElement).display) && m.some(v => v > 0) && !(e.getAttribute('style') || '').includes('auto')) {
      const pd = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].map(k => parseFloat(cs[k]) || 0); e.style.margin = '0'; e.style.padding = m.map((v, i) => (v + pd[i]) + 'px').join(' '); st.margins++; }
    let clip = e, clipped = false; for (let k = 0; k < 4 && clip; k++) { const c = getComputedStyle(clip); if (c.overflow === 'hidden' || c.overflowX === 'hidden' || c.textOverflow === 'ellipsis') { clipped = true; break; } clip = clip.parentElement; }
    if (clipped && e.scrollWidth > e.clientWidth + 1) { const full = e.textContent.trim(); let lo = 0, hi = full.length; while (lo < hi) { const mid = (lo + hi + 1) >> 1; e.textContent = full.slice(0, mid) + '…'; if (e.scrollWidth <= e.clientWidth + 1) lo = mid; else hi = mid - 1; } e.textContent = full.slice(0, lo).trimEnd() + '…'; e.style.overflow = 'visible'; st.truncated++; }
  }
  return st;
};
const idx = JSON.parse(await readFile(INDEX, 'utf8')), notes = NOTES ? JSON.parse(await readFile(NOTES, 'utf8')) : {};
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let n = 0;
for (const b of idx.boards) {
  let s = await readFile(join(dirname(INDEX), b.slug + '.html'), 'utf8');
  s = s.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (m, css) => css.length > 100000 ? `<link rel="stylesheet" href="${LIVE}storefront.css"><style>${FONTS}</style>` : m);
  s = s.replace(/\s(data-dc-tpl|data-fn)="[^"]*"/g, '').replace('min-height: 100vh;', 'height: 900px; overflow: hidden;');
  const dark = b.slug.endsWith('-dark'), key = b.slug.replace(/-dark$/, ''), nt = notes[key];
  const wash = dark ? '#0b0d10' : '#eef0f3', tall = /personas/.test(b.slug);
  const screen = `<div aria-label="Screen" style="width:1440px;${tall ? 'height:auto' : 'height:900px;overflow:hidden'};position:relative">`;
  const open = nt ? `<div aria-label="Board with note" style="display:flex;flex-direction:column;gap:24px;width:1440px;background:${wash}">${note(dark, b.title, nt[0], nt[1])}${screen}` : screen;
  s = s.replace(/<body([^>]*)>/, `<body$1 style="margin:0;width:1440px${nt ? ';background:' + wash : ''}">${open}`).replace('</body>', (nt ? '</div>' : '') + '</div></body>').replace('</head>', FIXES + '</head>');
  const tmp = join(OUT, '.tmp.html'); await writeFile(tmp, s);
  await page.goto('file://' + (tmp.startsWith('/') ? tmp : join(process.cwd(), tmp)), { waitUntil: 'networkidle', timeout: 60000 }); await page.waitForTimeout(500);
  await page.evaluate(BAKE);
  await writeFile(join(OUT, b.title + '.html'), await page.content()); n++;
}
await browser.close();
console.log(`${n} boards in ${OUT}`);
