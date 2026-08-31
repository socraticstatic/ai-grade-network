// scripts/figma-handoff/generate-dark-css.mjs
// Generates src/styles/dark.css — the AT&T dark theme as an html.dark-scoped
// override skin. The light theme is never touched: every rule lives under
// html.dark, so light-mode pixel parity with the frozen boards holds by
// construction (verified anyway by re-capture + diff).
//
// Data-driven: scans src for the color utility classes actually in use,
// resolves each against the same scales tailwind.config.js declares, and maps
// the resolved color to its dark counterpart. Classes that resolve to nothing
// in light mode (silent no-ops) are skipped; classes with no dark mapping are
// listed at the top of the file as a QA worklist.
//
// Palette: AT&T Flywheel dark. Cool blue-charcoal surfaces (never pure black),
// AT&T Blue #009fdb as the accent that pops, cobalt CTAs unchanged, status
// hues lifted for contrast on dark.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const OUT = path.join(ROOT, 'src/styles/dark.css');

/* ---------------------------------------------------------------- surfaces */
const S = {
  wash: '#111821',      // page background — deep blue-charcoal, NOT black
  base: '#1a2431',      // cards
  neutral: '#222e3c',   // subtle fills, chips, table headers
  raised: '#2a3848',    // hovers, elevated rows
  overlay: '#2e3d4e',   // tooltips, dark action surfaces
  borderSub: '#2f3d4d', // hairline borders, dividers
  borderStrong: '#4e5e6f',
  textHead: '#f2f6fa',
  textBody: '#c5cfd9',
  textMuted: '#97a3b0',
  textDisabled: '#67737f',
  link: '#66c8f0',      // AT&T Blue 100 — links/interactive text on dark
  linkHover: '#99daf5',
  attBlue: '#009fdb',
  cobalt: '#0057b8',
  cobaltHover: '#0064d6', // hover brightens on dark (darkening reads disabled)
  ghost: '#16324e',     // cobalt tint fill
  accentTint: '#10334c',// AT&T blue tint fill (was #e6f6fd)
  success: '#6ecf63',
  warn: '#ffa25e',
  error: '#ff7a8f',
  info: '#58baff',
  purple: '#d987e3',
};

const rgb = (hex, a) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return a == null ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${a})`;
};

/* ------------------------------------------------- light-mode resolution */
// Mirrors tailwind.config.js. A class only gets a dark rule if it resolves
// here — classes that silently compile to nothing stay nothing.
const FW_RAMP = {
  'fw-att-blue': 1, 'fw-functional-blue': 1,
  'fw-blue': 1, 'fw-blue-000': 1, 'fw-blue-100': 1, 'fw-blue-200': 1, 'fw-blue-light': 1, 'fw-blue-functional': 1, 'fw-blue-700': 0,
  'fw-cobalt-100': 1, 'fw-cobalt-400': 1, 'fw-cobalt-600': 1, 'fw-cobalt-700': 1, 'fw-cobalt-800': 1,
  'fw-gray-100': 1, 'fw-gray-200': 1, 'fw-gray-300': 1, 'fw-gray-400': 1, 'fw-gray-500': 1,
  'fw-gray-600': 1, 'fw-gray-700': 1, 'fw-gray-800': 1, 'fw-gray-900': 1,
  'fw-green-400': 1, 'fw-green-600': 1, 'fw-orange-400': 1, 'fw-orange-600': 1,
  'fw-red-400': 1, 'fw-red-600': 1, 'fw-purple': 1,
};
const SCALES = {
  text: {
    'fw-heading': 1, 'fw-body': 1, 'fw-bodyLight': 1, 'fw-disabled': 1, 'fw-legal': 1,
    'fw-link': 1, 'fw-linkHover': 1, 'fw-linkPrimary': 1, 'fw-linkSecondary': 1,
    'fw-success': 1, 'fw-warn': 1, 'fw-error': 1, 'fw-info': 1, 'fw-purple': 1,
  },
  bg: {
    'fw-heading': 1, 'fw-base': 1, 'fw-wash': 1, 'fw-neutral': 1, 'fw-accent': 1,
    'fw-primary': 1, 'fw-ctaPrimary': 1, 'fw-ctaPrimaryHover': 1, 'fw-ctaGhost': 1,
    'fw-disabled': 1, 'fw-active': 1, 'fw-success': 1, 'fw-warn': 1, 'fw-error': 1,
    'fw-purple': 1, 'fw-successLight': 1, 'fw-warnLight': 1, 'fw-infoLight': 1,
    'fw-purpleLight': 1, 'fw-errorLight': 1,
  },
  border: {
    'fw-primary': 1, 'fw-secondary': 1, 'fw-active': 1, 'fw-hover': 1, 'fw-focus': 1,
    'fw-disabled': 1, 'fw-success': 1, 'fw-warn': 1, 'fw-error': 1, 'fw-ctaPrimary': 1,
    'fw-purple': 1, 'fw-successLight': 1, 'fw-warnLight': 1, 'fw-errorLight': 1,
    'fw-infoLight': 1, 'fw-purpleLight': 1,
  },
  ring: { 'fw-active': 1, 'fw-base': 1, 'fw-link': 1, 'fw-ctaPrimary': 1, 'fw-error': 1, 'fw-success': 1, 'fw-focus': 1 },
};

/* --------------------------------------------------------- dark mappings */
// Per utility kind, color-name → dark value. Hex string, or rgb() string for
// baked-alpha tokens. null = deliberately unchanged (solid brand chips etc.).
const DARK = {
  text: {
    'fw-heading': S.textHead, 'fw-body': S.textBody, 'fw-bodyLight': S.textMuted,
    'fw-disabled': S.textDisabled, 'fw-legal': S.textMuted,
    'fw-link': S.link, 'fw-linkHover': S.linkHover, 'fw-linkSecondary': S.link,
    'fw-success': S.success, 'fw-warn': S.warn, 'fw-error': S.error,
    'fw-info': S.info, 'fw-purple': S.purple,
    // fw ramp + shorthand grays as text
    'fw-gray-900': S.textHead, 'fw-gray-800': '#e2eaf1', 'fw-gray-700': S.textBody,
    'fw-gray-600': S.textMuted, 'fw-gray-500': S.textMuted, 'fw-gray-400': S.textDisabled,
    'fw-gray-300': '#5c6a78',
    'fw-cobalt-600': S.link, 'fw-cobalt-700': S.linkHover, 'fw-cobalt-800': '#c2e2fa',
    'fw-cobalt-400': '#7fb0e8',
    'fw-att-blue': S.attBlue, 'fw-blue-functional': S.info, 'fw-functional-blue': S.info,
    'gray-900': S.textHead, 'gray-800': '#e2eaf1', 'gray-700': S.textBody,
    'gray-600': S.textMuted, 'gray-500': S.textMuted, 'gray-400': S.textDisabled,
    'gray-300': '#586472', 'gray-200': '#4a5866', 'gray-100': '#3a4653', 'gray-50': S.textHead,
    'brand-blue': S.link, 'brand-darkBlue': S.linkHover, 'brand-accent': S.attBlue,
    'brand-neutral': S.textMuted, 'brand-purple': S.purple,
    'complementary-teal': '#3fc4c7', 'complementary-green': S.success,
    'complementary-orange': S.warn, 'complementary-purple': S.purple,
    'fw-green-600': S.success, 'fw-green-400': S.success,
    'fw-orange-600': S.warn, 'fw-orange-400': S.warn,
    'fw-red-600': S.error, 'fw-red-400': S.error,
  },
  bg: {
    'fw-heading': S.overlay, 'fw-base': S.base, 'fw-wash': S.wash, 'fw-neutral': S.neutral,
    'fw-accent': S.accentTint, 'fw-primary': S.cobalt, 'fw-ctaPrimary': S.cobalt,
    'fw-ctaPrimaryHover': S.cobaltHover, 'fw-ctaGhost': S.ghost, 'fw-disabled': S.borderSub,
    'fw-active': S.cobalt,
    'fw-success': null, 'fw-warn': null, 'fw-error': null, 'fw-purple': null, // solid chips keep
    'fw-successLight': 'rgb(98 208 45 / 0.12)', 'fw-warnLight': 'rgb(249 124 0 / 0.12)',
    'fw-infoLight': 'rgb(0 132 255 / 0.12)', 'fw-purpleLight': 'rgb(175 41 187 / 0.14)',
    'fw-errorLight': 'rgb(255 92 115 / 0.11)',
    'fw-gray-100': S.neutral, 'fw-gray-200': S.neutral, 'fw-gray-300': S.borderSub,
    'fw-gray-400': S.borderStrong, 'fw-gray-500': '#5a6774', 'fw-gray-600': '#5a6774',
    'fw-gray-700': '#8b98a5', 'fw-gray-800': S.overlay, 'fw-gray-900': S.wash,
    'fw-cobalt-100': S.ghost, 'fw-cobalt-600': null, 'fw-cobalt-700': '#0064d6', 'fw-cobalt-400': null,
    'fw-att-blue': null, 'fw-blue-light': S.accentTint, 'fw-blue-000': null,
    'gray-50': S.neutral, 'gray-100': S.neutral, 'gray-200': S.borderSub, 'gray-300': S.borderSub,
    'gray-400': S.borderStrong, 'gray-500': '#5a6774', 'gray-700': S.raised,
    'gray-800': S.overlay, 'gray-900': S.wash,
    'brand-blue': null, 'brand-lightBlue': S.ghost, 'brand-darkBlue': S.cobaltHover,
    'brand-accent': null, 'brand-purple': null,
    'fw-green-600': null, 'fw-green-400': null, 'fw-orange-600': null, 'fw-red-600': null,
  },
  border: {
    'fw-primary': S.borderStrong, 'fw-secondary': S.borderSub, 'fw-active': S.attBlue,
    'fw-hover': S.attBlue, 'fw-focus': '#e8eef4', 'fw-disabled': S.borderSub,
    'fw-success': '#3f9a35', 'fw-warn': null, 'fw-error': '#e0335c', 'fw-ctaPrimary': null,
    'fw-purple': null,
    'fw-successLight': 'rgb(110 207 99 / 0.35)', 'fw-warnLight': 'rgb(255 162 94 / 0.35)',
    'fw-errorLight': 'rgb(255 122 143 / 0.35)', 'fw-infoLight': 'rgb(88 186 255 / 0.35)',
    'fw-purpleLight': 'rgb(217 135 227 / 0.35)',
    'fw-gray-200': S.borderSub, 'fw-gray-300': S.borderSub, 'fw-gray-400': S.borderStrong,
    'gray-100': S.borderSub, 'gray-200': S.borderSub, 'gray-300': S.borderSub,
    'gray-400': S.borderStrong, 'gray-500': S.borderStrong, 'gray-800': '#e2eaf1',
    'brand-blue': S.attBlue, 'fw-cobalt-400': '#3374cc', 'fw-cobalt-600': S.attBlue,
  },
  ring: {
    'fw-active': S.info, 'fw-base': S.base, 'fw-link': S.attBlue, 'fw-ctaPrimary': S.attBlue,
    'fw-error': S.error, 'fw-success': S.success, 'fw-focus': '#e8eef4',
    'brand-blue': S.attBlue, 'blue-200': '#2c567f', 'blue-300': '#2c567f', 'blue-400': '#3374cc',
  },
};

// Tailwind default-palette strays (off-Flywheel legacy classes still on some
// screens). text-: lift to the 300/400 step; bg- 50/100 tints: deep tinted
// surfaces; solid 400-600 bg: keep.
const TW_TEXT = {
  'blue-900': '#a8cdf5', 'blue-800': '#a8cdf5', 'blue-700': '#8fc2f5', 'blue-600': '#7cb8ff',
  'blue-500': '#7cb8ff', 'blue-400': '#93c5fd',
  'green-900': '#9fe8a2', 'green-800': '#8ade8e', 'green-700': '#77d47c', 'green-600': '#6ecf63',
  'green-500': '#6ecf63',
  'red-600': '#ff8296', 'red-500': '#ff8296', 'red-700': '#ff9dac', 'red-800': '#ffb3bf',
  'amber-800': '#ffc98a', 'amber-700': '#ffbe70', 'amber-600': '#ffb35c', 'amber-500': '#fbbf24',
  'yellow-600': '#f5d05e', 'yellow-700': '#f5d05e', 'yellow-800': '#f7dc85',
  'purple-800': '#e2b1ea', 'purple-600': '#d987e3', 'purple-700': '#d987e3',
  'slate-600': '#97a3b0', 'slate-500': '#97a3b0', 'slate-700': '#c5cfd9', 'slate-200': '#3a4653',
  'indigo-500': '#a5b4fc', 'cyan-800': '#7cd9e8', 'teal-600': '#3fc4c7', 'teal-700': '#3fc4c7',
  'orange-600': '#ffa25e', 'orange-500': '#ffa25e', 'emerald-600': '#6ecf63',
  'gray-950': S.textHead, 'blue-950': '#a8cdf5',
  'slate-900': '#f2f6fa', 'slate-800': '#dbe4ec',
};
const TW_BG = {
  'blue-50': '#12283c', 'blue-100': '#14304a', 'blue-200': '#1a3a58', 'blue-400': null,
  'blue-500': null, 'blue-600': null, 'blue-700': null, 'blue-900': null,
  'green-50': '#122b18', 'green-100': '#16351d', 'green-200': '#1d4426', 'green-500': null,
  'red-50': '#331520', 'red-100': '#3d1826', 'red-400': null, 'red-500': null,
  'amber-50': '#33260f', 'amber-100': '#3d2d12', 'amber-300': null, 'amber-500': null,
  'yellow-50': '#332c0f', 'yellow-100': '#3d3512', 'yellow-500': null,
  'purple-50': '#2c1531', 'purple-100': '#361a3d', 'purple-500': null,
  'indigo-50': '#1a2040', 'indigo-100': '#20284d',
  'slate-100': S.neutral, 'slate-400': S.borderStrong, 'cyan-100': '#0f3238',
  'stone-400': S.borderStrong, 'teal-50': '#0f3234', 'orange-50': '#33200f', 'orange-100': '#3d2712',
};
const TW_BORDER = {
  'blue-100': '#1e3d5c', 'blue-200': '#24476b', 'blue-300': '#2c567f', 'blue-400': '#3374cc',
  'blue-600': null, 'green-200': '#28542f', 'green-500': null, 'red-200': '#59243277',
  'red-500': null, 'red-700': null, 'amber-100': '#4a3717', 'yellow-700': null,
  'purple-500': null, 'orange-300': '#7a4a24', 'indigo-100': '#252e59',
  'red-200': '#5c2836', 'teal-200': '#155457', 'slate-200': '#2f3d4d',
};

/* -------------------------------------------------------------- scanning */
const rx = /(?:^|[\s"'`{:])((?:hover:|focus:|group-hover:|focus-within:|active:|disabled:)*(?:bg|text|border|border-t|border-r|border-b|border-l|ring|divide|placeholder|fill|stroke)-[a-zA-Z][a-zA-Z0-9./-]*)/g;
const counts = {};
function walk(p) {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) walk(path.join(p, f)); return; }
  if (!/\.(tsx|ts)$/.test(p) || /\.(test|spec)\.tsx?$/.test(p)) return;
  const s = fs.readFileSync(p, 'utf8');
  let m; while ((m = rx.exec(s))) counts[m[1]] = (counts[m[1]] || 0) + 1;
}
['src/features', 'src/components', 'src/layers', 'src/App.tsx'].forEach(r => walk(path.join(ROOT, r)));

/* ------------------------------------------------------------ generation */
const esc = (cls) => cls.replace(/[:./[\]#%]/g, (c) => '\\' + c);
const VARIANTS = {
  'hover:': (sel) => `${sel}:hover`,
  'focus:': (sel) => `${sel}:focus`,
  'focus-within:': (sel) => `${sel}:focus-within`,
  'active:': (sel) => `${sel}:active`,
  'disabled:': (sel) => `${sel}:disabled`,
};
const PROP = {
  bg: ['background-color'], text: ['color'], border: ['border-color'],
  'border-t': ['border-top-color'], 'border-r': ['border-right-color'],
  'border-b': ['border-bottom-color'], 'border-l': ['border-left-color'],
  ring: ['--tw-ring-color'], placeholder: ['color'],
  fill: ['fill'], stroke: ['stroke'],
};

const rules = [];
const unmapped = [];
const skipped = [];

const resolveDark = (util, name) => {
  const kind = util.startsWith('border') ? 'border'
    : util === 'divide' ? 'border'
    : (util === 'fill' || util === 'stroke') ? 'text' // fill/stroke twins ride the text mapping
    : util;
  // fw/semantic scales first (mirrors Tailwind scale precedence), then ramps
  const scale = SCALES[kind === 'placeholder' ? 'text' : kind];
  const inScale = scale && scale[name];
  const inRamp = FW_RAMP[name] || /^(gray|brand|complementary)-/.test(name) ||
    /^(blue|green|red|amber|yellow|purple|slate|indigo|cyan|teal|orange|emerald|stone|pink|rose|lime|violet|sky|fuchsia)-(50|100|200|300|400|500|600|700|800|900|950)$/.test(name) ||
    name === 'white' || name === 'black' || name === 'transparent';
  if (!inScale && !inRamp) return { skip: true };
  const k = kind === 'placeholder' ? 'text' : kind;
  let v;
  if (DARK[k] && name in DARK[k]) v = DARK[k][name];
  else if (k === 'text' && name in TW_TEXT) v = TW_TEXT[name];
  else if (k === 'bg' && name in TW_BG) v = TW_BG[name];
  else if (k === 'border' && name in TW_BORDER) v = TW_BORDER[name];
  else if (name === 'white') v = k === 'text' ? null : k === 'ring' ? S.base : S.base; // bg/border-white → card surface
  else if (name === 'black') v = k === 'text' ? S.textHead : null; // text-black → heading white; scrims keep
  else if (name === 'transparent') v = null;
  else return { unmapped: true };
  return { value: v };
};

for (const cls of Object.keys(counts).sort()) {
  let rest = cls;
  const prefixes = [];
  let vm;
  while ((vm = /^(hover:|focus:|group-hover:|focus-within:|active:|disabled:)/.exec(rest))) {
    prefixes.push(vm[1]); rest = rest.slice(vm[1].length);
  }
  const um = /^(bg|text|border-t|border-r|border-b|border-l|border|ring|divide|placeholder|fill|stroke)-(.+)$/.exec(rest);
  if (!um) continue;
  const util = um[1];
  let name = um[2];
  let alpha = null;
  const am = /^(.*)\/(\d{1,3})$/.exec(name);
  if (am) { name = am[1]; alpha = parseInt(am[2], 10) / 100; }
  if (/^\[/.test(name)) { unmapped.push(cls); continue; } // arbitrary values: manual QA list

  const res = resolveDark(util, name);
  if (res.skip) { skipped.push(cls); continue; }
  if (res.unmapped) { unmapped.push(cls); continue; }
  if (res.value == null) continue; // deliberately unchanged in dark

  let value = res.value;
  if (alpha != null) {
    if (value.startsWith('rgb(')) value = value.replace(/ \/ [\d.]+\)/, ` / ${alpha})`).replace(/\)$/, '')
      .replace(/^rgb\(([\d ]+)$/, (m, ch) => `rgb(${ch} / ${alpha}`) + ')';
    else value = rgb(value, alpha);
  }

  let sel = '.' + esc(cls);
  for (const p of prefixes) {
    if (p === 'group-hover:') sel = `.group:hover ${sel}`;
    else sel = VARIANTS[p](sel);
  }
  if (util === 'placeholder') sel += '::placeholder';
  if (util === 'divide') sel += ' > :not([hidden]) ~ :not([hidden])';

  const props = PROP[util] || PROP.border;
  const body = props.map(pr => `${pr}: ${value} !important`).join('; ');
  rules.push(`html.dark ${sel} { ${body}; }`);
}

/* ---------------------------------------------------- hand-authored base */
const header = `/* AT&T AI-grade Network — dark theme.
 * GENERATED by scripts/figma-handoff/generate-dark-css.mjs — edit the
 * generator's palette maps (or the OVERRIDES block it appends), then re-run:
 *   node scripts/figma-handoff/generate-dark-css.mjs
 * Every rule is scoped under html.dark: light mode cannot be affected.
 * Activate with ?theme=dark (see main.tsx) or localStorage theme-mode=dark.
 *
 * Unmapped classes found in src (QA worklist — style by hand below if they
 * appear on a captured screen):
${unmapped.sort().map(c => ' *   ' + c).join('\n')}
 */

html.dark { color-scheme: dark; }

/* Page ground: deep blue-charcoal wash with a faint AT&T-blue aurora at the
 * top. Never pure black. */
html.dark body {
  background-color: ${S.wash};
  background-image:
    radial-gradient(1200px 480px at 18% -120px, rgb(0 159 219 / 0.07), transparent 70%),
    radial-gradient(900px 420px at 85% -140px, rgb(0 87 184 / 0.09), transparent 70%);
  background-repeat: no-repeat;
  color: ${S.textBody};
}

/* Semantic CSS variables consumed by buttons.css / forms.css / components.css */
html.dark {
  --fw-text-heading: ${S.textHead};
  --fw-text-body: ${S.textBody};
  --fw-text-bodyLight: ${S.textMuted};
  --fw-text-link: ${S.link};
  --fw-text-linkHover: ${S.linkHover};
  --fw-text-disabled: ${S.textDisabled};
  --fw-bg-base: ${S.base};
  --fw-bg-wash: ${S.wash};
  --fw-bg-neutral: ${S.neutral};
  --fw-bg-accent: ${S.accentTint};
  --fw-bg-primary: ${S.cobalt};
  --fw-bg-ctaPrimary: ${S.cobalt};
  --fw-bg-ctaPrimaryHover: ${S.cobaltHover};
  --fw-bg-disabled: ${S.borderSub};
  --fw-border-primary: ${S.borderStrong};
  --fw-border-secondary: ${S.borderSub};
  --fw-border-active: ${S.attBlue};
  --fw-border-focus: #e8eef4;
  --fw-border: ${S.borderStrong};
  --fw-active: ${S.attBlue};
  --focus-ring: rgb(88 186 255 / 0.25);
  --fw-purple-light: #361a3d;

  --button-secondary-bg: transparent;
  --button-secondary-text: ${S.link};
  --button-secondary-border: ${S.link};
  --button-secondary-hover: ${S.ghost};
  --button-outline-bg: transparent;
  --button-outline-text: ${S.link};
  --button-outline-border: ${S.link};
  --button-outline-hover: ${S.ghost};

  --input-border: ${S.borderSub};
  --input-placeholder: ${S.textDisabled};
  --input-text: ${S.textBody};
  --input-disabled-bg: ${S.neutral};
  --input-disabled-text: ${S.textDisabled};

  --nav-bg: ${S.base};
  --nav-border: ${S.borderSub};
  --nav-text: ${S.textMuted};
  --nav-text-hover: ${S.textBody};
  --nav-text-active: ${S.link};
  --nav-indicator: ${S.attBlue};

  --card-bg: ${S.base};
  --card-border: ${S.borderSub};
  --card-header-bg: ${S.neutral};
  --card-header-text: ${S.textHead};
  --table-header-bg: ${S.neutral};
  --table-header-text: #e2eaf1;
  --table-border: ${S.borderSub};
  --table-row-hover: ${S.neutral};
  --table-row-selected: ${S.ghost};

  --status-active-bg: rgb(98 208 45 / 0.16);
  --status-active-text: ${S.success};
  --status-inactive-bg: ${S.neutral};
  --status-inactive-text: ${S.textBody};
  --status-warning-bg: rgb(249 124 0 / 0.16);
  --status-warning-text: ${S.warn};
  --status-error-bg: rgb(255 92 115 / 0.14);
  --status-error-text: ${S.error};

  /* Shadows: on dark, depth comes from darker shade + hairline edge */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.4);
  --shadow-md: 0 4px 10px -2px rgb(0 0 0 / 0.5);
  --shadow-lg: 0 12px 24px -6px rgb(0 0 0 / 0.55);
  --shadow-xl: 0 20px 32px -8px rgb(0 0 0 / 0.6);
  --card-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.4);
  --card-hover-shadow: 0 4px 10px -2px rgb(0 0 0 / 0.5);
}

/* Scrollbars */
html.dark ::-webkit-scrollbar-thumb { background: ${S.borderStrong}; }
html.dark ::-webkit-scrollbar-track { background: ${S.wash}; }
`;

const footer = `
/* ------------------------------------------------------------------------
 * OVERRIDES — hand-tuned exceptions discovered during per-screen QA.
 * The generator preserves this block verbatim across re-runs.
 * ---------------------------------------------------------------------- */
`;

// Preserve hand-tuned OVERRIDES block across regenerations.
let overrides = footer;
if (fs.existsSync(OUT)) {
  const prev = fs.readFileSync(OUT, 'utf8');
  const i = prev.indexOf('* OVERRIDES —');
  if (i !== -1) {
    const start = prev.lastIndexOf('/*', i);
    overrides = '\n' + prev.slice(start);
  }
}

fs.writeFileSync(OUT, header + '\n' + rules.join('\n') + '\n' + overrides);
console.log(`wrote ${OUT}`);
console.log(`rules: ${rules.length}, unmapped (QA list): ${unmapped.length}, no-op skipped: ${skipped.length}`);
if (unmapped.length) console.log('unmapped:', unmapped.sort().join(' '));
