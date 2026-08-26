# 13 — Components

The shared-element board. Source: dev-only gallery route `/naas/__gallery`
([HandoffGallery.tsx](../../src/features/handoff/HandoffGallery.tsx)),
frozen to `artboards/13-components.html` and imported into the Figma page
"NaaS — 1440 Mockups" as section **13 — Components** (native ATT Aleck Sans).

Measurements from `captures/13-components/measure.json`, artboard-relative
at 1440. Sections stack vertically, 24px padding above/below each, 1px
`#dcdfe3` divider between.

| # | Component | Figma name | Source file | y | h | Variants on board |
|---|-----------|-----------|-------------|---|---|------------------|
| 1 | MainNav | `Header/MainNav` | `src/components/navigation/MainNav.tsx` | 0 | 146 | NaaS layer active |
| 2 | LeftRail | `Nav/LeftRail` | `src/components/navigation/LeftRail.tsx` | 146 | 357 | NaaS scope: Home + 4 verbs |
| 3 | SubNav | `Nav/SubNav` | `src/components/navigation/SubNav.tsx` | 503 | 141 | embedded, with action button |
| 4 | Button | `Button/*` | `src/components/common/Button.tsx` | 644 | 117 | primary, secondary, outline, ghost, danger, disabled |
| 5 | Card | `Card` | `src/components/common/Card.tsx` | 761 | 196 | header + body |
| 6 | MetricCard | `MetricCard/*` | `src/components/common/MetricCard.tsx` | 957 | 215 | default, warning, success |
| 7 | QuickStatCard | `QuickStatCard` | `src/components/common/QuickStatCard.tsx` | 1172 | 189 | default |
| 8 | StatusBadge | `Badge/Status/*` | `src/components/common/StatusBadge.tsx` | 1361 | 111 | active, pending, provisioning, inactive, suspended |
| 9 | Badge | `Badge` | `src/components/common/Badge.tsx` | 1472 | 101 | status-green, info |
| 10 | Toggle | `Toggle/*` | `src/components/common/Toggle.tsx` | 1573 | 105 | on, off, disabled |
| 11 | SearchFilterBar | `SearchFilterBar` | `src/components/common/SearchFilterBar.tsx` | 1678 | 121 | with Filter + Refresh |
| 12 | StandardTable | `Table` | `src/components/common/StandardTable.tsx` | 1799 | 320 | header + 3 rows |

No footer: `Footer.tsx` returns `null` by design (see drift report §13).
Screen artboards swap header + rail regions for instances of `Header/MainNav`
and `Nav/LeftRail`.

## Key component measurements

- **MainNav**: full-bleed 1440×~65 nav (sticky, `z-50`), 64px inner row
  height (`h-16`), logo left, layer tabs center-left, Create pill + utility
  icons right. Create pill: h-36px, `px-4`, `#0057b8`, radius full.
- **LeftRail**: 320px wide expanded (`layout.sidebar.width`), layer switcher
  header (12px semibold uppercase, +10% tracking), rows: icon 16px + label
  14px/500, active row `#e6f6fd` bg + `#0057b8` text, radius 8.
- **SubNav (embedded)**: title 26px/700 `#1d2329` tracking -4%, description
  16px/500 `#454b52`, action = outline pill button right-aligned.
- **Buttons**: h-36, radius full, 16px/500 label. Primary `#0057b8`/white;
  secondary white/`#0057b8` border; outline white/`#dcdfe3` border, text
  `#1d2329`; ghost no border, text `#0057b8`; danger `#c70032`/white;
  disabled `#dcdfe3` bg, `#878c94` text.
- **StatusBadge**: pill, 12px/500 +4% tracking, dot 8px. active
  green-tint/`#1e6b17`; pending amber-tint/`#9a4708`; provisioning
  blue-tint/`#0074b3`; inactive `#f3f4f6`/`#5c6167`; suspended
  red-tint/`#c70032`.
- **Table**: row h-48, header bg `#f8fafb`, header label 12px/500 +4%
  uppercase `#5c6167`, cell 14–16px/500, divider `#dcdfe3`, container
  radius 12 + 1px border.

Exact per-element boxes: `captures/13-components/measure.json`; visual
ground truth: `captures/13-components/13-components@2x.png`.
