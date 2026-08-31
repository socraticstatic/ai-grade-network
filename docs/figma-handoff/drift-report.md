# Drift Report — NaaS 1440 Handoff

Fidelity contract (from the spec): layout and IA stay exactly as shipped.
Corrected in the app, spec and screenshots agreeing: spacing drift off the
4px grid, type departing the Flywheel ramp, colors off-token,
border/radius/shadow inconsistencies between sibling components. No
re-art-direction: a fix that would change layout or IA is logged here as
Skipped, not applied.

Every artboard gets a section. "Fixed" lists what was corrected and where;
"Skipped (logged)" lists observed drift left in place, with the reason.

---

## 01 — Discover entry

No drift found — chrome/primitive fixes carried through.

### Fixed

### Skipped (logged)

## 02 — Meridian advisor (first screen)

### Fixed

- Advisor copy `text-[17px]` → `text-figma-lg` (18px rendered ramp step):
  `AdvisorConversation.tsx`, `FindingCard.tsx`.

### Skipped (logged)

## 03 — NaaS Home

### Fixed

- LayerHero verdict `text-[19px]` → `text-figma-lg` (18px ramp step).
- LayerHomePage verb cards `gap-3.5` (14px, off-grid) → `gap-4` (16px).

### Skipped (logged)

## 04 — Connect · Fabric overview

No drift found.

### Fixed

### Skipped (logged)

## 05 — Connect · Fabric drill

No drift found.

### Fixed

### Skipped (logged)

## 06 — Connect · Estate map

No drift found.

### Fixed

### Skipped (logged)

## 07 — Connect · Path choice

No drift found.

### Fixed

### Skipped (logged)

## 08 — Connect · Provision wizard

No drift found.

### Fixed

### Skipped (logged)

## 09 — Govern

No drift found.

### Fixed

### Skipped (logged)

## 10 — Observe · Sankey

No drift found.

### Fixed

### Skipped (logged)

## 11 — Cost

### Fixed

- Page title stock `text-xl font-semibold` (20px/600) → `text-figma-lg
  font-bold` (18px/700 ramp step). Savings-vocabulary audit: labels
  already lead with savings — no copy drift.

### Skipped (logged)

## 12 — Foundation

### Fixed

### Skipped (logged)

## 13 — Components

- `Footer.tsx` returns `null` — the portal has no footer chrome by design.
  The Components board and the per-screen instance swaps cover header
  (`MainNav`) and rail (`LeftRail`) only; the spec's "footer" mentions are
  vacuous for this app and are recorded here rather than silently dropped.

### Fixed

- LeftRail: `text-[11px]` (layer-switcher label, taglines, section headers)
  → `text-figma-xs` (12px rendered, the tiny-label step). 3 occurrences.
- CreateMenu (MainNav Create pill): `px-3.5` (14px, off-grid) → `px-4` (16px).
- QuickStatCard value: stock `text-lg` (18/28, no tracking) →
  `text-figma-lg` (18/26, -3%) — same size, on-system leading/tracking.
- Instance swaps: imported screens keep pixel-identical chrome copies;
  Figma's clipboard rejects synthetic input, so the 10-minute
  paste-to-replace pass is documented in 13-components.md for a human hand.
- Componentization: all 12 shared elements converted to Figma components
  on the board. State variants (Button, StatusBadge, Toggle) remain rows
  inside their components rather than Figma variant properties — noted for
  optional manual refinement.
- tailwind ringColor: added `fw-base: #ffffff` — `ring-fw-base` on the nav
  notification/tasks dots compiled to nothing and fell back to Tailwind's
  stock translucent blue; the dots now get their intended white cutout.

### Skipped (logged)

- The entire `figma-*` scale renders +2px over the token ramp — a deliberate
  demo-legibility bump documented in tailwind.config.js. Not drift; the
  foundation spec documents the rendered scale and redlines measure it.
- `#5c6167` / `#1e6b17` / `#9a4708` text colors are NOT drift: deliberate
  WCAG AA darkenings in the fw theme (documented in tailwind.config.js).
  Foundation doc updated with an accessibility-overrides table.

## 14 — Advisor · Tiered offers

### Fixed

- AdvisorConversation `text-[15px]` (user pills, reply buttons, prompt
  input) → `text-figma-base` (16px rendered ramp step). 3 occurrences.

### Skipped (logged)


## 15 — AI Fabric Home

No drift found. Captured after the SVG freeze fix, so all text (including
SVG `<text>`) carries ATT Aleck Sans in the artboard.

### Fixed

### Skipped (logged)

## 16 — AI · Providers

No drift found. Captured after the SVG freeze fix, so all text (including
SVG `<text>`) carries ATT Aleck Sans in the artboard.

### Fixed

### Skipped (logged)

## 17 — AI · Teams & limits

No drift found. Captured after the SVG freeze fix, so all text (including
SVG `<text>`) carries ATT Aleck Sans in the artboard.

### Fixed

### Skipped (logged)

## 18 — AI · Virtual keys

No drift found. Captured after the SVG freeze fix, so all text (including
SVG `<text>`) carries ATT Aleck Sans in the artboard.

### Fixed

### Skipped (logged)

## 19 — AI · Policies

No drift found. Captured after the SVG freeze fix, so all text (including
SVG `<text>`) carries ATT Aleck Sans in the artboard.

### Fixed

### Skipped (logged)

## 20 — AI · Insights · Performance

No drift found. Captured after the SVG freeze fix, so all text (including
SVG `<text>`) carries ATT Aleck Sans in the artboard.

### Fixed

### Skipped (logged)

## 21 — AI · Insights · Savings

No drift found. Captured after the SVG freeze fix, so all text (including
SVG `<text>`) carries ATT Aleck Sans in the artboard.

### Fixed

### Skipped (logged)

## 22 — AI · Insights · Security

No drift found. Captured after the SVG freeze fix, so all text (including
SVG `<text>`) carries ATT Aleck Sans in the artboard.

### Fixed

### Skipped (logged)

## 2026-08-31 — dark-mode pass (drift found while auditing dark imports)

### Fixed (in source — affects light too)

- PathChoice availability badge wrapped mid-phrase ("Provisionable /
  here") inside the card header row; title now yields (`min-w-0`) and the
  badge is `whitespace-nowrap shrink-0`: `PathChoice.tsx`. The LIGHT Figma
  boards 07/08 predate this fix and are one layout fix behind the app.

### Freeze-pipeline fixes (measure.mjs, affect all future freezes)

- Empty-cssText fallback now carries PAINT properties (background, border,
  radius, padding, shadow…) — the CW/NB provider tile chips had lost their
  backgrounds in every frozen board, light set included.
- The same fallback must never carry geometry: writing `width` pinned text
  to Chrome metrics and Figma's wider Aleck wrapped the header wordmark on
  import ("AI-grade⏎network").
