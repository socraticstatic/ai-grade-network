// One line weight for every icon, at every size (Micah, 2026-10-08: "this whole site has an icon problem - you're using a
// line width that's too thin for all of them!", "They're so small and thin that they're pointless!").
//
// The Flywheel icons are filled outlines drawn on a 96-unit grid (a few on 64 or 28) with 2-unit lines: at 16px a line is a
// third of a pixel. Each icon is used as a CSS mask at 14 to 46px, so a stroke in grid units would be right at one size
// and wrong at the rest. Instead every drawn shape gets a stroke in screen pixels (vector-effect: non-scaling-stroke),
// and the root svg drops its width and height so its viewport is the size it renders at: every line gains the same
// WEIGHT px whatever the size. The camelCase fillRule/clipRule a React export left behind become the SVG attributes,
// so the outlines' holes are even-odd as drawn.
//
// Idempotent: run it again and nothing changes. node scripts/icon-weight.mjs [weightPx=1]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../brand/icons/', import.meta.url).pathname;
const WEIGHT = process.argv[2] || '1';
const SHAPES = /<(path|circle|rect|ellipse|polygon|line|polyline)\b(?![^>]*vector-effect)/g;

export function weigh(svg, px = WEIGHT) {
  let out = svg.replace(/\s(fillRule|clipRule)=/g, (m, a) => ` ${a === 'fillRule' ? 'fill-rule' : 'clip-rule'}=`);
  const head = out.match(/<svg\b[^>]*>/)[0];
  const h2 = head.replace(/\s(width|height|stroke|stroke-width|stroke-linejoin)="[^"]*"/g, '')
    .replace('<svg', `<svg stroke="currentColor" stroke-width="${px}" stroke-linejoin="round"`);
  // A child's own stroke width (one icon carried a grid-unit one) gives way to the screen weight.
  const body = out.slice(out.indexOf(head) + head.length).replace(/\sstroke-width="[^"]*"/g, '').replace(SHAPES, '<$1 vector-effect="non-scaling-stroke"');
  return out.slice(0, out.indexOf(head)) + h2 + body;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let changed = 0;
  for (const f of readdirSync(DIR).filter(x => x.endsWith('.svg'))) {
    const p = join(DIR, f), was = readFileSync(p, 'utf8'), now = weigh(was);
    if (now !== was) { writeFileSync(p, now); changed += 1; }
  }
  console.log(`${changed} icons weighed at ${WEIGHT}px`);
}
