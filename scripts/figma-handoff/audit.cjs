/* Drift audit for a captured board.
 *   node scripts/figma-handoff/audit.cjs <slug>
 *
 * Compares every measured element against the Flywheel foundation
 * (docs/figma-handoff/00-foundation.md): type on the rendered ramp, spacing
 * on the 4px grid, colours in tokens.json + the sanctioned fw overrides.
 * Exits non-zero when anything is off so it can gate a pipeline.
 *
 * Lived in /tmp for the first build and evaporated between sessions; it is
 * part of the method, so it lives in the repo now.
 */
const fs = require('fs');
const slug = process.argv[2];
if (!slug) { console.error('usage: audit.cjs <slug>'); process.exit(2); }
const d = JSON.parse(fs.readFileSync(`docs/figma-handoff/captures/${slug}/measure.json`, 'utf8'));

// tokens.json + deliberate fw theme overrides (a11y darkenings, VizKit palette)
const TOKENS = new Set([
  '#009fdb','#00abeb','#66c8f0','#99daf5','#e6f6fd','#e6f0fa','#3374cc','#0057b8',
  '#00388f','#00235a','#0074b3','#ffffff','#000000','#f8fafb','#f3f4f6','#dcdfe3',
  '#bdc2c7','#878c94','#686e74','#454b52','#1d2329','#13171b','#4aaf42','#2d7e24',
  '#ff8f4d','#ea712f','#ff5c73','#c70032','#af29bb','#00a3a6',
  '#5c6167','#1e6b17','#9a4708',              // WCAG AA text darkenings
  '#475569','#00a862','#f8fafc','#e2e8f0',    // VizKit slate/positive (palette.ts)
]);
// rendered scale = token ramp +2px (deliberate demo-legibility bump)
const SIZES = new Set(['10px','12px','14px','16px','18px','26px','34px','42px','50px','58px']);
const GRID_OK = new Set([0,1,2,4,6,8,10,12,16,20,24,32,40,48,64,80,96,128]);

const hex = (s) => {
  const m = (s || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  if (m[4] !== undefined && parseFloat(m[4]) < 1) return null;   // translucent: skip
  return '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
};

const issues = {};
const add = (k, v) => (issues[k] ??= []).push(v);

for (const el of d.elements) {
  const s = el.styles || {};
  if (el.text && s.fontSize && !SIZES.has(s.fontSize))
    add(`type ${s.fontSize}`, `${el.id.slice(0, 52)} "${(el.text || '').slice(0, 22)}"`);

  for (const k of ['color', 'backgroundColor', 'fill', 'stroke']) {   // fill/stroke: SVG
    const h = hex(s[k]);
    if (h && !TOKENS.has(h)) add(`${k} ${h}`, el.id.slice(0, 52));
  }

  for (const k of ['padding', 'gap']) {
    const bad = (s[k] || '').split(' ').some(p => {
      const n = parseFloat(p);
      return p.endsWith('px') && n > 0 && !GRID_OK.has(n);
    });
    if (bad) add(`grid ${s[k]} (${k})`, el.id.slice(0, 52));
  }
}

const keys = Object.keys(issues);
for (const k of keys) console.log(k, '×' + issues[k].length, '|', issues[k][0]);
console.log(keys.length ? 'ISSUES' : 'CLEAN',
  '| elements:', d.elements.length, '| height:', d.height, '|', slug);
process.exit(keys.length ? 1 : 0);
