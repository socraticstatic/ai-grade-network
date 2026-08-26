# Foundation — AI-grade Network NaaS Handoff

Successor to `docs/figma-reference/DESIGN_SPECS.md` (SDCI-era, 2026-03-21) for
the NaaS 1440 mockup handoff. Source of truth: `src/tokens/tokens.json` +
`tailwind.config.js`. Every screen audit in this handoff compares computed
styles against this page.

Target viewport: **1440px** (Tailwind `xl`). Captures at deviceScaleFactor 2.

---

## 1. Color tokens

### Brand

| Token | Hex | Usage |
|---|---|---|
| `color.brand.attBlue` | `#009fdb` | AT&T brand blue |
| `color.brand.attBlue.000` | `#00abeb` | Lighter AT&T Blue |
| `color.brand.attBlue.100` | `#66c8f0` | Light AT&T Blue |
| `color.brand.attBlue.200` | `#99daf5` | Very light AT&T Blue |
| `color.brand.attBlue.light` | `#e6f6fd` | AT&T Blue background tint |
| `color.brand.cobalt.100` | `#e6f0fa` | Very light cobalt — ghost buttons |
| `color.brand.cobalt.400` | `#3374cc` | Mid cobalt |
| `color.brand.cobalt.600` | `#0057b8` | Primary interactive — buttons, links, active states |
| `color.brand.cobalt.700` | `#00388f` | Dark cobalt — pressed states |
| `color.brand.cobalt.800` | `#00235a` | Darkest cobalt |
| `color.brand.functionalBlue` | `#0074b3` | Form focus, info states |

### Neutral

| Token | Hex | Usage |
|---|---|---|
| `color.neutral.white` | `#ffffff` | Card and input backgrounds |
| `color.neutral.black` | `#000000` | — |
| `color.neutral.gray.100` | `#f8fafb` | Lightest backgrounds, page wash |
| `color.neutral.gray.200` | `#f3f4f6` | Subtle backgrounds |
| `color.neutral.gray.300` | `#dcdfe3` | Borders, dividers |
| `color.neutral.gray.400` | `#bdc2c7` | Disabled states |
| `color.neutral.gray.500` | `#878c94` | Muted elements, placeholder text |
| `color.neutral.gray.600` | `#686e74` | Secondary text |
| `color.neutral.gray.700` | `#454b52` | Body text |
| `color.neutral.gray.800` | `#1d2329` | Dark text, headings |
| `color.neutral.gray.900` | `#13171b` | Darkest text |

### Semantic

| Token | Hex | Usage |
|---|---|---|
| `color.semantic.success.light` | `#62d02d26` | Success background (15% opacity) |
| `color.semantic.success.400` | `#4aaf42` | Success light |
| `color.semantic.success.600` | `#2d7e24` | Success primary |
| `color.semantic.warning.light` | `#f97c0026` | Warning background (15% opacity) |
| `color.semantic.warning.400` | `#ff8f4d` | Warning light |
| `color.semantic.warning.600` | `#ea712f` | Warning primary |
| `color.semantic.error.400` | `#ff5c73` | Error light |
| `color.semantic.error.600` | `#c70032` | Error primary |
| `color.semantic.info.light` | `#0084ff26` | Info background (15% opacity) |
| `color.semantic.info.600` | `#0074b3` | Info primary |

### Accent

| Token | Hex | Usage |
|---|---|---|
| `color.accent.purple` | `#af29bb` | Purple accent — Visual Designer, secondary actions |
| `color.accent.green` | `#2d7e24` | Green accent — API Configuration, success |
| `color.accent.teal` | `#00a3a6` | Complementary teal |
| `color.accent.orange` | `#ea712f` | Flywheel orange |

---

## 2. Type ramp

All UI type is **ATT Aleck Sans** (fallback: system-ui stack). Letter-spacing
is **-3%** (`-0.03em`) everywhere except tags, which use **+4%** (`+0.04em`).
Mono: JetBrains Mono stack.

| Role | Size / Line | Weight | Tracking |
|---|---|---|---|
| h1 | 56 / 64 | 700 | -3% |
| h2 | 48 / 56 | 700 | -3% |
| h3 | 40 / 48 | 700 | -3% |
| h4 | 32 / 40 | 700 | -3% |
| h5 | 24 / 32 | 700 | -3% |
| h6 | 16 / 24 | 700 | -3% |
| bodyBase | 14 / 20 | 500 | -3% |
| bodyBaseB | 14 / 20 | 700 | -3% |
| bodyS | 12 / 16 | 500 | -3% |
| bodyXS | 10 / 16 | 500 | -3% |
| tagS | 12 / 16 | 500 | +4% |
| tagXS | 10 / 16 | 500 | +4% |

Figma-era Tailwind aliases still in the code: `text-figma-xs` 10px,
`text-figma-sm` 12px, `text-figma-base` 14px, `text-figma-lg` 16px,
`text-figma-xl` 24px. Common combinations (from DESIGN_SPECS.md, still
canonical):

- Page title: 24px / 700 / `#1d2329`
- Section heading: 16px / 700 / `#1d2329`
- Body: 14px / 500 / `#454b52`
- Labels/captions: 12px / 500 / `#686e74`
- Stat values: 24px / 700 / `#1d2329`
- Tiny/hint: 10px / 500 / `#878c94`

---

## 3. Spacing and layout

**Everything sits on a 4px grid.** Sanctioned steps: 0, 1, 2, 4, 6, 8, 10, 12,
16, 20, 24, 32, 40, 48, 64, 80, 96, 128. (2px, 6px and 10px exist as
half-steps — use only where the code already does.)

Breakpoints (Tailwind): `xs` 320 · `sm` 640 · `md` 768 · `lg` 1024 ·
`xl` 1440 · `2xl` 1920. **All handoff artboards are `xl` = 1440.**

Layout constants:

| Token | Value | Meaning |
|---|---|---|
| `layout.container.max` | 1280px | Main content container (`max-w-7xl`) |
| `layout.container.padding.desktop` | 32px | `lg:px-8` |
| `layout.sidebar.width` | 320px | Left sidebar, expanded |
| `layout.sidebar.collapsedWidth` | 48px | Icon-only rail |
| `layout.header.height` | 50px | Top navigation bar (measured 64–65px in the app — see drift report §13) |

---

## 4. Radius and elevation

| Radius token | Value | Usage |
|---|---|---|
| `sm` | 2px | — |
| `default` | 4px | — |
| `md` | 6px | Inputs, dropdowns |
| `lg` | 8px | Inputs, metric cells |
| `xl` | 12px | Cards |
| `2xl` | 16px | Cards, containers, tables, modals |
| `3xl` | 24px | Modals, role cards (tailwind only) |
| `full` | 9999px | Buttons, pills, tags, badges, progress bars |

| Shadow token | Value |
|---|---|
| `sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` |
| `lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` |
| `xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` |

Component constants: button height 36px (pill, icon 20px), input height 40px
(radius 6px), card radius 12px + `1px solid #dcdfe3`, modal radius 16px
(max-width 720px), table row height 48px (header bg `#f8fafb`).

---

## 5. How to read the screen specs

Each `NN-<screen>.md` carries a redline table generated from live-DOM
measurement (`scripts/figma-handoff/measure.mjs` → `captures/<slug>/measure.json`):

| Column | Meaning |
|---|---|
| Region | Element trail + tag/classes, top of the visual hierarchy first |
| x, y | Position in px from the artboard's top-left at 1440 |
| w, h | Bounding box in px |
| Type | size/weight/tracking, mapped to the ramp in §2 |
| Color | hex mapped to the token tables in §1 |
| Notes | spacing to neighbors, radius, shadow, state shown |

The matching `captures/<slug>/<slug>@2x.png` is the visual ground truth; the
frozen `artboards/<slug>.html` is the importable master (self-contained,
fonts inlined). Component regions (header, rail, footer, primitives) map to
the Figma components listed in `13-components.md`.
