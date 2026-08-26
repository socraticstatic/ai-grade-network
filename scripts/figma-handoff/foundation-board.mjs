// Generates artboards/12-foundation.html — tokens, type ramp, spacing —
// from src/tokens/tokens.json. Inline styles only; ATT Aleck via data URIs.
import fs from 'node:fs';
import path from 'node:path';

const tokens = JSON.parse(fs.readFileSync('src/tokens/tokens.json', 'utf8'));
const flat = [];
(function walk(o, p) {
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object' && 'value' in v) flat.push({ path: p ? `${p}.${k}` : k, value: v.value, desc: v.description || '' });
    else if (v && typeof v === 'object') walk(v, p ? `${p}.${k}` : k);
  }
})(tokens, '');

const colors = flat.filter(t => /^#|^rgb/.test(String(t.value)) && t.path.startsWith('color'));
const fontCss = ['Light:300','Regular:400','Medium:500','Bold:700','Black:900'].map(s => {
  const [name, weight] = s.split(':');
  const file = `src/assets/fonts/ATTAleckSans_${name}.woff2`;
  const b64 = fs.readFileSync(file).toString('base64');
  return `@font-face{font-family:'ATT Aleck Sans';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
}).join('\n');

const sw = colors.map(c => `
  <div style="width:150px">
    <div style="width:150px;height:96px;border-radius:8px;border:1px solid #dcdfe3;background:${c.value}"></div>
    <div style="font-size:12px;font-weight:500;color:#1d2329;margin-top:8px;word-break:break-all">${c.path.replace('color.','')}</div>
    <div style="font-size:12px;color:#5c6167">${c.value}</div>
  </div>`).join('');

const ramp = [
  ['h1 — figma-5xl', 58, 700], ['h2 — figma-4xl', 50, 700], ['h3 — figma-3xl', 42, 700],
  ['h4 — figma-2xl', 34, 700], ['h5 — figma-xl', 26, 700], ['h6 — figma-lg', 18, 700],
  ['bodyBase — figma-base', 16, 500], ['bodyS — figma-sm', 14, 500], ['bodyXS — figma-xs', 12, 500],
].map(([label, px, w]) => `
  <div style="display:flex;align-items:baseline;gap:24px;border-bottom:1px solid #f3f4f6;padding:12px 0">
    <div style="width:220px;font-size:12px;color:#5c6167">${label} · ${px}/${w} · -3%</div>
    <div style="font-size:${px}px;font-weight:${w};letter-spacing:-0.03em;color:#1d2329">AI-grade network</div>
  </div>`).join('');

const spacing = [4,8,12,16,24,32,48,64].map(px => `
  <div style="display:flex;align-items:center;gap:16px">
    <div style="width:60px;font-size:12px;color:#5c6167">${px}px</div>
    <div style="height:16px;width:${px * 4}px;background:#0057b8;border-radius:2px"></div>
  </div>`).join('');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>${fontCss}
body{margin:0;font-family:'ATT Aleck Sans',system-ui,sans-serif;background:#ffffff}</style></head>
<body>
<div style="width:1440px;padding:48px;box-sizing:border-box">
  <div style="font-size:26px;font-weight:700;letter-spacing:-0.03em;color:#1d2329">Foundation — AI-grade Network</div>
  <div style="font-size:14px;color:#5c6167;margin-top:4px">Tokens · rendered type ramp (+2 demo scale) · 4px spacing grid. Source: src/tokens/tokens.json</div>
  <div style="font-size:18px;font-weight:700;color:#1d2329;margin:40px 0 16px">Color tokens</div>
  <div style="display:flex;flex-wrap:wrap;gap:24px">${sw}</div>
  <div style="font-size:18px;font-weight:700;color:#1d2329;margin:48px 0 8px">Type ramp — ATT Aleck Sans</div>
  ${ramp}
  <div style="font-size:18px;font-weight:700;color:#1d2329;margin:48px 0 16px">Spacing — 4px grid (bars at 4×)</div>
  <div style="display:grid;gap:12px">${spacing}</div>
</div>
</body></html>`;
fs.mkdirSync('docs/figma-handoff/artboards', { recursive: true });
fs.writeFileSync('docs/figma-handoff/artboards/12-foundation.html', html);
console.log('wrote 12-foundation.html', Math.round(html.length / 1024), 'KB');
