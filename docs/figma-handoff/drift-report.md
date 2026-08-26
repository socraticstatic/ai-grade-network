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

### Fixed

### Skipped (logged)

## 02 — Meridian advisor (first screen)

### Fixed

### Skipped (logged)

## 03 — NaaS Home

### Fixed

### Skipped (logged)

## 04 — Connect · Fabric overview

### Fixed

### Skipped (logged)

## 05 — Connect · Fabric drill

### Fixed

### Skipped (logged)

## 06 — Connect · Estate map

### Fixed

### Skipped (logged)

## 07 — Connect · Path choice

### Fixed

### Skipped (logged)

## 08 — Connect · Provision wizard

### Fixed

### Skipped (logged)

## 09 — Govern

### Fixed

### Skipped (logged)

## 10 — Observe · Sankey

### Fixed

### Skipped (logged)

## 11 — Cost

### Fixed

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
  → `text-figma-sm` (12px, tagS ramp step). 3 occurrences.
- CreateMenu (MainNav Create pill): `px-3.5` (14px, off-grid) → `px-4` (16px).

### Skipped (logged)

- `text-figma-xl` is 26px/34 in tailwind.config.js while tokens.json h5 and
  the SDCI-era DESIGN_SPECS say 24px/32. Global type-scale divergence — every
  page title and stat uses it, so flipping it is an app-wide visual change,
  not a per-screen cleanup. Needs Micah's call; foundation doc records 26px
  as current reality.
- `#5c6167` / `#1e6b17` / `#9a4708` text colors are NOT drift: deliberate
  WCAG AA darkenings in the fw theme (documented in tailwind.config.js).
  Foundation doc updated with an accessibility-overrides table.
