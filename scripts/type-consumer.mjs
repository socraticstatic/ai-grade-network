// The consumer type pass (Micah, 2026-10-09: "i'm really not a fan of all the gray small text though. can we consumerize
// it further to make it feel better?"). Three moves over NaaS Storefront.dc.html, its <style> and every inline style:
//
//   1. All-caps micro-labels become sentence case, a step larger, in body ink. The tracked, uppercase, gray 11px caption is
//      the enterprise tell; a consumer page names things in plain case. Pills keep their caps: NetBond's verb badges
//      (.fw-badge), the verdict stamp (.js-verdict), the Audit chip (.lay-audit), and any inline pill (a background and a
//      border radius) read as tokens, not as captions.
//   2. Nothing reads below 12px: 10px text becomes 11px only on pills, else 12px; 11px becomes 12px. A line height
//      tighter than the new size plus four opens to fit.
//   3. The secondary ink deepens: --text-light from Flywheel gray-600 (#686e74) toward gray-700, #50565d; in dark, the
//      light grey lifts from #97a3b0 to #b3bdc8. --text-disabled (Flywheel gray-500, pinned) is untouched: it still marks
//      what is truly off.
//
// Idempotent: a second run changes nothing. node scripts/type-consumer.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../NaaS Storefront.dc.html', import.meta.url);
const PILL_SEL = /fw-badge|js-verdict|lay-audit/;
const isPillInline = (d) => /background(-color)?:/.test(d) && /border-radius:/.test(d) && /padding:/.test(d);
const px = (d, prop) => { const m = new RegExp(`(?:^|;)\\s*${prop}:(\\d+)px`).exec(d); return m ? +m[1] : null; };
const setPx = (d, prop, v) => d.replace(new RegExp(`((?:^|;)\\s*${prop}:)\\d+px`), `$1${v}px`);

export function transform(decl, sel) {
  let d = decl;
  const caps = /text-transform:uppercase/.test(d), pill = (sel && PILL_SEL.test(sel)) || isPillInline(d);
  if (caps && !pill) {
    d = d.replace(/;?\s*text-transform:uppercase/, '').replace(/;?\s*letter-spacing:[^;"]+/, '');
    d = d.replace(/^;/, '');
    d = d.replace(/color:var\(--text-(light|disabled)\)/, 'color:var(--text-body)');
    const fs = px(d, 'font-size'); if (fs !== null && fs <= 12) d = setPx(d, 'font-size', fs <= 11 ? 12 : 13);
  } else {
    const fs = px(d, 'font-size');
    if (fs === 10) d = setPx(d, 'font-size', pill ? 11 : 12);
    else if (fs === 11 && !pill) d = setPx(d, 'font-size', 12);
  }
  const fs2 = px(d, 'font-size'), lh = px(d, 'line-height');
  if (fs2 !== null && lh !== null && lh < fs2 + 4) d = setPx(d, 'line-height', fs2 + 4);
  return d;
}

/** A stylesheet's rules (the storefront's live in storefront.css since 2026-10-12). */
export function runCss(css) {
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (m, sel, body) => `${sel}{${transform(body, sel)}}`)
    .replace('--text-light:#686e74', '--text-light:#50565d').replace('--text-light:#97a3b0', '--text-light:#b3bdc8');
}
/** A page: its style block, if it has one, and every inline style after it. */
export function run(html) {
  const s0 = html.indexOf('<style'), s1 = html.indexOf('</style>');
  if (s0 < 0 || s1 < 0) return html.replace(/style="([^"]*)"/g, (m, body) => `style="${transform(body, null)}"`);
  const css = runCss(html.slice(s0, s1));
  const rest = html.slice(s1).replace(/style="([^"]*)"/g, (m, body) => `style="${transform(body, null)}"`);
  return html.slice(0, s0) + css + rest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const CSS = new URL('../storefront.css', import.meta.url);
  const cssWas = readFileSync(CSS, 'utf8'), cssNow = runCss(cssWas);
  console.log(`storefront.css: 10px ${(cssWas.match(/font-size:10px/g) || []).length} -> ${(cssNow.match(/font-size:10px/g) || []).length}; changed ${cssNow !== cssWas}`);
  if (!process.argv.includes('--dry') && cssNow !== cssWas) writeFileSync(CSS, cssNow);
  const was = readFileSync(FILE, 'utf8'), now = run(was);
  const n = (re, t) => (t.match(re) || []).length;
  console.log(`uppercase ${n(/text-transform:uppercase/g, was)} -> ${n(/text-transform:uppercase/g, now)}; 10px ${n(/font-size:10px/g, was)} -> ${n(/font-size:10px/g, now)}; 11px ${n(/font-size:11px/g, was)} -> ${n(/font-size:11px/g, now)}; changed ${was !== now}`);
  if (!process.argv.includes('--dry') && now !== was) writeFileSync(FILE, now);
}
