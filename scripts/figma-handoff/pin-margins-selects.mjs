// Two importer breaks found on the canvas (2026-10-15): (1) a label pushed by an auto margin imports as a fixed box a hair
// short of its glyphs ("eas / tus"); the auto margin becomes flex-grow, which Chrome lays out identically. (2) a styled
// <select> imports as a fixed box that wraps its text ("Network / Eng"); it becomes a span showing the chosen option
// with the select's own computed box. Each board is screenshotted before and after; any visible change is undone.
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const { chromium } = await import('file:///Users/micahbos/Developer/Cloud_Designer/node_modules/playwright/index.mjs');
const D = process.argv[2] || 'docs/figma-handoff/import-v3';   // the wrapped boards to pin, in place
const files = (await readdir(D)).filter(f => f.endsWith('.html') && !f.startsWith('Onboarding'));
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const out = [];
for (const f of files) {
  await p.goto('file://' + encodeURI(join(D, f)), { waitUntil: 'networkidle' }); await p.waitForTimeout(200);
  const before = await p.screenshot({ fullPage: true });
  const r = await p.evaluate(() => {
    const st = { autos: 0, selects: 0 };
    for (const e of document.querySelectorAll('body *')) {
      if (!e.textContent.trim() || !e.parentElement) continue;
      const pd = getComputedStyle(e.parentElement).display; if (!/flex/.test(pd) || /column/.test(getComputedStyle(e.parentElement).flexDirection)) continue;
      let m; try { m = e.computedStyleMap(); } catch (x) { continue; }
      const L = String(m.get('margin-left')), R = String(m.get('margin-right'));
      if (R === 'auto' && L !== 'auto') { e.style.marginRight = '0px'; e.style.flexGrow = '1'; st.autos++; }
      else if (L === 'auto' && R !== 'auto') { e.style.marginLeft = '0px'; e.style.flexGrow = '1'; const d = getComputedStyle(e).display; if (/flex/.test(d)) e.style.justifyContent = 'flex-end'; else e.style.textAlign = 'right'; st.autos++; }
    }
    for (const s of [...document.querySelectorAll('select')]) {
      const cs = getComputedStyle(s), r = s.getBoundingClientRect();
      const box = document.createElement('span'); box.setAttribute('aria-label', s.getAttribute('aria-label') || 'Select');
      const keep = ['display', 'box-sizing', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
        'background-color', 'background-image', 'background-position', 'background-size', 'background-repeat', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color',
        'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'flex', 'align-self', 'vertical-align'];
      box.style.cssText = keep.map(k => `${k}:${cs.getPropertyValue(k)}`).join(';');
      box.style.display = 'inline-flex'; box.style.alignItems = 'center'; box.style.width = r.width + 'px'; box.style.whiteSpace = 'nowrap'; box.style.overflow = 'visible';
      const t = document.createElement('span'); t.textContent = (s.selectedOptions[0] || s.options[0] || { text: '' }).text; t.style.whiteSpace = 'nowrap'; box.appendChild(t);
      // The native select draws its text ~4px in and an arrow at the right; the span carries both, drawn.
      box.style.paddingLeft = ((parseFloat(cs.paddingLeft) || 0) + 4) + 'px'; box.style.justifyContent = 'space-between';
      const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('width', '10'); sv.setAttribute('height', '10'); sv.setAttribute('viewBox', '0 0 10 10'); sv.setAttribute('aria-label', 'Chevron'); sv.style.flex = 'none';
      const pa = document.createElementNS('http://www.w3.org/2000/svg', 'path'); pa.setAttribute('d', 'M1.5 3.5 L5 7 L8.5 3.5'); pa.setAttribute('fill', 'none'); pa.setAttribute('stroke', 'currentColor'); pa.setAttribute('stroke-width', '1.8'); pa.setAttribute('stroke-linecap', 'round'); pa.setAttribute('stroke-linejoin', 'round');
      sv.appendChild(pa); box.appendChild(sv);
      s.replaceWith(box); st.selects++;
    }
    return st; });
  const after = await p.screenshot({ fullPage: true });
  const same = before.equals(after);
  let diff = null;
  if (!same) diff = await p.evaluate(async ([a, c]) => { const load = (b64) => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const [A, C] = await Promise.all([load(a), load(c)]); const w = A.width, h = Math.min(A.height, C.height); const cv = new OffscreenCanvas(w, h), x = cv.getContext('2d');
    x.drawImage(A, 0, 0); const da = x.getImageData(0, 0, w, h).data; x.clearRect(0, 0, w, h); x.drawImage(C, 0, 0); const dc = x.getImageData(0, 0, w, h).data;
    let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - dc[i]) + Math.abs(da[i + 1] - dc[i + 1]) + Math.abs(da[i + 2] - dc[i + 2]) > 60) n++; return { px: n, pct: +(100 * n / (w * h)).toFixed(3) }; }, [before.toString('base64'), after.toString('base64')]);
  if (r.autos || r.selects) await writeFile(join(D, f), '<!doctype html>\n' + await p.evaluate(() => document.documentElement.outerHTML));
  out.push(`${f.replace('.html', '')}: autos ${r.autos}, selects ${r.selects}, ${same ? 'pixel-identical' : 'diff ' + JSON.stringify(diff)}`);
}
await b.close();
console.log(out.join('\n'));
