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
  `<style id="figma-font-override">*{font-family:'ATT Aleck Sans',Arial,sans-serif!important}</style>` +
  // Still (2026-10-14): freeze appends animation:none inside the big inline stylesheet, which the slim step above swaps for
  // the live link, so the rule was dropped and the importer caught count-ups and line draws mid-flight ($121,399 for
  // $121,400, no forecast lines). Every animation's base style is its last frame, so stilling it shows the page settled;
  // the count-up overlays (CSS counters an importer cannot draw) go, leaving the figure's own text.
  `<style id="still">*,*::before,*::after{animation:none!important;transition:none!important}.op-cu::after,.cst-cu::after{content:none!important}</style>`;
const note = (dark, title, cite, applied) => { const [bg, bd, ink, soft, acc] = dark ? ['#16191d', '#2d3238', '#e8eaed', '#b4b9c0', '#4fc3f7'] : ['#ffffff', '#d7dbe0', '#0f1419', '#50565d', '#009fdb']; const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<aside aria-label="Requirement from the portal team" style="box-sizing:border-box;width:1440px;padding:20px 24px;border:1px solid ${bd};border-left:5px solid ${acc};border-radius:12px;background:${bg};color:${ink};font-family:'ATT Aleck Sans',Arial,sans-serif;font-size:14px;line-height:20px;display:flex;flex-direction:column;gap:8px"><div aria-label="Note head" style="display:flex;align-items:baseline;gap:12px"><span aria-label="Board" style="font-size:16px;line-height:22px;font-weight:700">${esc(title)}</span><span aria-label="Source" style="font-size:13px;line-height:18px;color:${soft}">From Amir's note for the Network Fabric portal team, 2026-10-12</span></div><div aria-label="Their words" style="display:flex;gap:10px"><span style="font-weight:700;color:${acc};white-space:nowrap">Amir asked</span><span>${esc(cite)}</span></div><div aria-label="Applied here" style="display:flex;gap:10px"><span style="font-weight:700;color:${acc};white-space:nowrap">Applied here</span><span>${esc(applied)}</span></div></aside>`; };
const BAKE = () => {
  const st = { cells: 0, nowrap: 0, margins: 0, truncated: 0 };
  for (const c of document.querySelectorAll('.dt-c')) { const w = c.getBoundingClientRect().width; c.style.width = c.style.minWidth = c.style.maxWidth = w + 'px'; c.style.boxSizing = 'border-box'; st.cells++; }
  // Row spans leave the grid (2026-10-14): Figma ignores a grid item's row span, so the home's and Cost's KPI rings
  // (rows 2 / 4) stretched row 2 to their 62px, dropped the figure 20px and pushed the foot chips out of the tile.
  // Each spanning item becomes absolute at the box Chrome gave it; if any sibling or the grid itself moves, the change is undone.
  st.spans = 0;
  const span = (s, e, n) => { const a = /^span (\d+)/.exec(e) || /^span (\d+)/.exec(s); if (a) return +a[1]; let x = parseInt(s), y = parseInt(e); if (isNaN(x) || isNaN(y)) return 1; if (y < 0) y = n + 2 + y; if (x < 0) x = n + 2 + x; return y - x; };
  for (const g of [...document.querySelectorAll('body *')]) {
    const gs = getComputedStyle(g); if (!/grid/.test(gs.display)) continue;
    const tracks = gs.gridTemplateRows.split(/\s+/).filter(Boolean).length;
    for (const k of [...g.children]) {
      const kc = getComputedStyle(k); if (kc.position === 'absolute' || kc.position === 'fixed' || kc.display === 'none') continue;
      if (span(kc.gridRowStart, kc.gridRowEnd, tracks) < 2) continue;
      const sib = [...g.children].filter(x => x !== k), before = sib.map(x => x.getBoundingClientRect()), r = k.getBoundingClientRect(), pr = g.getBoundingClientRect();
      const keep = k.getAttribute('style'), keepG = g.getAttribute('style');
      if (gs.position === 'static') g.style.position = 'relative';
      // The item may be what sizes a track (the ring is the whole of column 2), so the tracks are pinned to what Chrome resolved.
      g.style.gridTemplateColumns = gs.gridTemplateColumns; g.style.gridTemplateRows = gs.gridTemplateRows;
      Object.assign(k.style, { position: 'absolute', left: (r.left - pr.left - g.clientLeft) + 'px', top: (r.top - pr.top - g.clientTop) + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', boxSizing: 'border-box', gridArea: 'auto' });
      const moved = sib.some((x, i) => { const a = x.getBoundingClientRect(), b = before[i]; return Math.abs(a.left - b.left) > 0.5 || Math.abs(a.top - b.top) > 0.5 || Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5; });
      const self = k.getBoundingClientRect(), gr = g.getBoundingClientRect(), off = Math.abs(self.left - r.left) > 0.5 || Math.abs(self.top - r.top) > 0.5 || Math.abs(gr.height - pr.height) > 0.5 || Math.abs(gr.width - pr.width) > 0.5;
      if (moved || off) { keep == null ? k.removeAttribute('style') : k.setAttribute('style', keep); keepG == null ? g.removeAttribute('style') : g.setAttribute('style', keepG); continue; }
      st.spans++;
    }
  }
  // Space-between rows become plain gaps (2026-10-14): the home's and Cost's KPI tiles are the only grids that spread
  // their rows with align-content:space-between, and the only ones Figma lays out wrong (the figure dropped, the foot
  // chips fell out of the tile). Each such grid starts at the top with the gap Chrome actually rendered.
  st.spread = 0;
  for (const g of [...document.querySelectorAll('body *')]) {
    const gs = getComputedStyle(g); if (!/grid/.test(gs.display) || gs.alignContent !== 'space-between') continue;
    const tr = gs.gridTemplateRows.split(/\s+/).map(parseFloat); if (tr.length < 2 || tr.some(isNaN)) continue;
    const inner = g.clientHeight - parseFloat(gs.paddingTop) - parseFloat(gs.paddingBottom), gap = (inner - tr.reduce((a, v) => a + v, 0)) / (tr.length - 1);
    if (!(gap >= 0)) continue;
    const kids = [...g.children], before = kids.map(x => x.getBoundingClientRect()), keep = g.getAttribute('style');
    Object.assign(g.style, { alignContent: 'start', rowGap: gap + 'px', gridTemplateRows: gs.gridTemplateRows, height: g.getBoundingClientRect().height + 'px' });
    const moved = kids.some((x, i) => { const a = x.getBoundingClientRect(), b = before[i]; return Math.abs(a.left - b.left) > 0.5 || Math.abs(a.top - b.top) > 0.5 || Math.abs(a.height - b.height) > 0.5; });
    if (moved) { keep == null ? g.removeAttribute('style') : g.setAttribute('style', keep); continue; }
    st.spread++;
  }
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
  // One line stays one line (2026-10-14): a flex row Chrome lays out on a single line is pinned to nowrap. Figma measures
  // text a hair wider, and a wrapping row pushed Cost's "Catalog prices" and Govern's "View logs" onto a second line,
  // sliding the whole page 28px down and cutting the bottom actions off the 900 frame.
  st.rows = 0;
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e); if (!/flex/.test(cs.display) || !/wrap/.test(cs.flexWrap) || cs.flexDirection.startsWith('column')) continue;
    const kids = [...e.children].filter(k => { const c = getComputedStyle(k); const r = k.getBoundingClientRect(); return c.position !== 'absolute' && c.position !== 'fixed' && r.width > 0 && r.height > 0; });
    if (kids.length < 2) continue;
    const tops = kids.map(k => Math.round(k.getBoundingClientRect().top)), mid = kids.map(k => { const r = k.getBoundingClientRect(); return r.top + r.height / 2; });
    const oneLine = kids.every((k, i) => { const r = k.getBoundingClientRect(); return mid[0] >= r.top - 1 && mid[0] <= r.bottom + 1; }) && Math.max(...tops) - Math.min(...tops) < 40;
    if (oneLine) { e.style.flexWrap = 'nowrap'; st.rows++; }
  }
  // Rings as vectors (2026-10-14): a hard-stop conic-gradient arrives in Figma as a soft angular gradient (the home's and
  // Cost's rings came through faded). Each one, on the element or its ::before/::after, is redrawn as SVG sectors from its
  // computed stops, painted where the gradient was, and the gradient itself goes.
  st.rings = 0;
  const split = (t) => { const out = []; let d = 0, cur = ''; for (const ch of t) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
  const parse = (bg) => {
    const m = /conic-gradient\((.*)\)\s*$/.exec(bg); if (!m || /,\s*(?:linear|radial|conic)-gradient/.test(bg.slice(0, bg.indexOf('conic')))) return null;
    let parts = split(m[1]), from = 0;
    if (/^from |^at /.test(parts[0])) { const f = /from\s+(-?[\d.]+)deg/.exec(parts[0]); if (f) from = +f[1]; parts = parts.slice(1); }
    const stops = [];
    for (const pt of parts) {
      const cm = /^(rgba?\([^)]*\)|#[0-9a-f]+|transparent|[a-z]+)\s*(.*)$/i.exec(pt); if (!cm) return null;
      const pos = (cm[2].match(/-?[\d.]+(%|deg|turn|px)?/g) || []).map(v => v.endsWith('deg') ? parseFloat(v) / 3.6 : v.endsWith('turn') ? parseFloat(v) * 100 : v.endsWith('px') ? 0 : parseFloat(v));
      stops.push({ c: cm[1], p: pos });
    }
    const flat = []; let last = 0;
    stops.forEach((x, i) => { const ps = x.p.length ? x.p : [i === 0 ? 0 : i === stops.length - 1 ? 100 : null]; ps.forEach(v => { let q = v == null ? null : Math.max(last, v); if (q != null) last = q; flat.push({ c: x.c, p: q }); }); });
    for (let i = 0; i < flat.length; i++) if (flat[i].p == null) { let j = i; while (j < flat.length && flat[j].p == null) j++; const a = flat[i - 1].p, b = j < flat.length ? flat[j].p : 100; for (let k = i; k < j; k++) flat[k].p = a + (b - a) * (k - i + 1) / (j - i + 1); }
    const segs = []; if (flat.length && flat[0].p > 0) segs.push([flat[0].c, 0, flat[0].p]);
    for (let i = 0; i < flat.length - 1; i++) if (flat[i + 1].p > flat[i].p) segs.push([flat[i].c, flat[i].p, flat[i + 1].p]);
    if (flat.length && flat[flat.length - 1].p < 100) segs.push([flat[flat.length - 1].c, flat[flat.length - 1].p, 100]);
    return { from, segs: segs.filter(s => s[2] - s[1] > 0.01 && !/rgba\([^)]*,\s*0\)|transparent/.test(s[0])) };
  };
  const sector = (cx, cy, r, a0, a1) => { const rad = (a) => (a - 90) * Math.PI / 180, x0 = cx + r * Math.cos(rad(a0)), y0 = cy + r * Math.sin(rad(a0)), x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
    if (a1 - a0 >= 359.99) return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`; return `M${cx},${cy}L${x0},${y0}A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0},1 ${x1},${y1}Z`; };
  let ringId = 0;
  for (const e of [...document.querySelectorAll('body *')]) {
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(e, pseudo); if (!cs.backgroundImage || !cs.backgroundImage.includes('conic-gradient')) continue;
      if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
      const g = parse(cs.backgroundImage); if (!g) continue;
      const host = e.getBoundingClientRect(); if (!host.width) continue;
      let left = 0, top = 0, w = host.width, h = host.height;
      if (pseudo) { const pw = parseFloat(cs.width), ph = parseFloat(cs.height); if (!(pw > 0 && ph > 0)) continue; w = pw; h = ph;
        const ins = ['top', 'left'].map(k => parseFloat(cs[k])); top = isNaN(ins[0]) ? 0 : ins[0]; left = isNaN(ins[1]) ? 0 : ins[1];
        if (cs.position !== 'absolute') { left = 0; top = 0; } }
      const r = Math.min(w, h) / 2, cx = w / 2, cy = h / 2;
      const paths = g.segs.map(([c, a, b]) => `<path d="${sector(cx, cy, r, g.from + a * 3.6, g.from + b * 3.6)}" fill="${c}"/>`).join('');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('aria-label', 'Ring');
      svg.setAttribute('style', `position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;pointer-events:none;overflow:visible;z-index:0`);
      svg.innerHTML = paths;
      if (getComputedStyle(e).position === 'static') e.style.position = 'relative';
      const id = 'r' + (ringId++); e.setAttribute('data-ring', id);
      const kill = document.createElement('style'); kill.textContent = pseudo ? `[data-ring="${id}"]${pseudo}{background-image:none!important}` : `[data-ring="${id}"]{background-image:none!important}`; document.head.appendChild(kill);
      // The ring sits under the element's own content: a positioned SVG paints above static siblings, which hid the
      // ring's hole and its figure, so every other child is lifted (position relative, no offset, z-index 1).
      for (const k of [...e.children]) { const kc = getComputedStyle(k); if (kc.position === 'static') { k.style.position = 'relative'; if (kc.zIndex === 'auto') k.style.zIndex = '1'; } }
      e.insertBefore(svg, e.firstChild); st.rings++;
    }
  }
  // Open masks go (2026-10-14): the home's ring reveal is a conic-gradient mask that rests fully open, and Figma turns it
  // into a fade across the ring. A mask whose only opaque run covers the whole turn masks nothing, so it is dropped.
  st.masks = 0;
  for (const e of [...document.querySelectorAll('body *')]) {
    const cs = getComputedStyle(e), mk = cs.maskImage || cs.webkitMaskImage; if (!mk || !mk.includes('conic-gradient')) continue;
    const g = parse(mk); if (!g || g.segs.length !== 1 || g.segs[0][1] > 0.01 || g.segs[0][2] < 99.99) continue;
    e.style.setProperty('mask', 'none', 'important'); e.style.setProperty('-webkit-mask', 'none', 'important'); st.masks++;
  }
  // Wedges as vectors (2026-10-14): the home's ring segments are solid circles cut by clip-path:polygon(), which Figma
  // cannot express. Each becomes its own polygon as an SVG path inside its round box. (The Home board's 2062 height
  // was never this pass: the home is the page that scrolls, the map sits below its fold, and its board is tall
  // without the pass too, as the original Home board is at 1905.)
  st.wedges = 0;
  for (const e of [...document.querySelectorAll('body *')]) {
    const cs = getComputedStyle(e); if (!cs.clipPath || !cs.clipPath.startsWith('polygon(')) continue;
    const bg = cs.backgroundColor; if (!bg || /rgba\([^)]*,\s*0\)|transparent/.test(bg)) continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const pts = cs.clipPath.slice(8, -1).split(',').map(pp => pp.trim().split(/\s+/).map((v, i) => v.endsWith('%') ? parseFloat(v) / 100 * (i ? r.height : r.width) : parseFloat(v)));
    if (pts.some(p2 => p2.length !== 2 || p2.some(isNaN))) continue;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', r.width); svg.setAttribute('height', r.height); svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`); svg.setAttribute('aria-label', 'Wedge');
    svg.setAttribute('style', 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none');
    svg.innerHTML = `<path d="M${pts.map(p2 => p2.join(',')).join('L')}Z" fill="${bg}"/>`;
    if (cs.position === 'static') e.style.position = 'relative';
    e.style.clipPath = 'none'; e.style.background = 'transparent'; e.style.overflow = 'hidden';
    for (const k of [...e.children]) { const kc = getComputedStyle(k); if (kc.position === 'static') { k.style.position = 'relative'; if (kc.zIndex === 'auto') k.style.zIndex = '1'; } }
    e.insertBefore(svg, e.firstChild); st.wedges++;
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
  // A versioned board (2026-10-14, freeze --version) ends in -v2 after its theme: -dark-v2 is still dark, and a board the
  // freeze marked tall (a page that scrolls) keeps its height like Personas instead of a 900 pin.
  const tall = !!b.tall || /personas/.test(b.slug);
  s = s.replace(/\s(data-dc-tpl|data-fn)="[^"]*"/g, '');
  if (!tall) s = s.replace('min-height: 100vh;', 'height: 900px; overflow: hidden;');
  const base = b.slug.replace(/-v\d+$/, ''), dark = base.endsWith('-dark'), key = base.replace(/-dark$/, ''), nt = notes[key];
  const wash = dark ? '#0b0d10' : '#eef0f3';
  const screen = `<div aria-label="Screen" style="width:1440px;${tall ? 'height:auto' : 'height:900px;overflow:hidden'};position:relative">`;
  const open = nt ? `<div aria-label="Board with note" style="display:flex;flex-direction:column;gap:24px;width:1440px;background:${wash}">${note(dark, b.title, nt[0], nt[1])}${screen}` : screen;
  s = s.replace(/<body([^>]*)>/, `<body$1 style="margin:0;width:1440px${nt ? ';background:' + wash : ''}">${open}`).replace('</body>', (nt ? '</div>' : '') + '</div></body>').replace('</head>', FIXES + '</head>');
  // A tall board's body is released from the stylesheet's 100% height, or the import clips it at 900 (2026-10-14).
  if (tall) s = s.replace('</head>', '<style id="tall-board">html,body{height:auto!important;min-height:0!important}</style></head>');
  const tmp = join(OUT, '.tmp.html'); await writeFile(tmp, s);
  await page.goto('file://' + (tmp.startsWith('/') ? tmp : join(process.cwd(), tmp)), { waitUntil: 'networkidle', timeout: 60000 }); await page.waitForTimeout(500);
  const baked = await page.evaluate(BAKE); console.log(b.title, JSON.stringify(baked));
  await writeFile(join(OUT, b.title + '.html'), await page.content()); n++;
}
await browser.close();
console.log(`${n} boards in ${OUT}`);
