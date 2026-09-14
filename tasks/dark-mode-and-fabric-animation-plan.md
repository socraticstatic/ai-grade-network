# Dark mode + FabricHero animation — SHIPPED (2026-08-31)

Partnered with session cloud-connect-3f (Figma dark boards). Division of labor
that landed:

## Architecture (final)

- **cloud-connect-3f owns:** `src/styles/dark.css` (generated `html.dark`
  utility skin + semantic var overrides — regenerate via
  `scripts/figma-handoff/generate-dark-css.mjs`, never hand-edit),
  `scripts/figma-handoff/**`, `docs/figma-handoff/**`.
- **This session owns:** activation + JS-driven colors + motion:
  - `src/main.tsx` — pre-paint theme: `?theme=dark|light` param wins (board
    capture pipeline; HashRouter keeps search before the `#`), then
    localStorage `theme-mode`. Param is never persisted.
  - `src/components/ThemeProvider.tsx` — `useTheme` exported; param-seeded
    mode not persisted until the user explicitly picks a mode; degrades to a
    standalone fallback outside a provider (bare MainNav test mounts).
  - `src/components/navigation/ThemeToggle.tsx` — Appearance control in the
    UtilityOverflow MENU (not the bar: frozen light boards = zero new pixels
    on captured screens). Light / Dark / Match system.
  - `src/styles/tokens.css` — ADDITIVE only: `--viz-*`, `--chart-*`, `--nd-*`
    vars (light values byte-identical to old literals) + `html.dark` block.
  - `src/components/viz/kit/palette.ts` — VIZ_HEX entries are
    `var(--viz-…, #lightHex)`; browser resolves for SVG/inline-style.
  - `src/components/viz/kit/useVizHex.ts` — resolved-hex twin for renderers
    that PARSE colors (ECharts); re-resolves on `themechange`.
  - `src/features/observe/SankeyChart.tsx` — uses `useVizHex`; dark ribbon
    opacities lifted (private .52 / public .34 vs .28 light).
  - `src/features/layer-home/heroModel.ts`, `_shared/palette.ts`,
    `network-designer/{Node.tsx,constants/nodeColors.ts}`,
    `styles/components.css` literal whites → vars.
  - `src/features/connect/FabricHero.tsx` — motion (below) + dark lift for
    the site-public dashed baseline.

## FabricHero motion (Connect centerpiece)

- Traffic comets (AT&T Blue #009fdb) travel private edges site→fabric and
  fabric→region, plus softer/slower comets on controlled c2c arcs.
- Public dashed edges crawl (70s loop, seamless: -90 offset divides both
  dash periods).
- The band breathes: 5.4s AT&T-blue drop-shadow aura.
- Hover dim/lit transitions eased (.25s).
- HARD RULE kept: every animated element's non-animated state is the exact
  static frame — `animation:none` (board freeze) and reduced-motion collapse
  to today's render. Verified live: pulse stroke-opacity 0 / offset 1.16,
  band filter none, drift offset 0 under an injected `animation:none`.

## Verified

- Light: computed values byte-identical (hero bg #ffffff, band #eef4fb,
  cobalt #0057b8). Vitest full suite green (nav suites fixed);
  `npx tsc --noEmit` clean.
- Dark: /naas/home, /naas/connect, /naas/observe walked in-browser via
  ?theme=dark — Sankey cobalt>slate hierarchy, split-bar hierarchy corrected,
  toggle round-trips and persists only explicit choices.

## Known caveats (flagged to cloud-connect-3f)

- `GovernanceDecisions.tsx` DECISION_COLORS stay literal (its CVD/ΔE palette
  test does color math on hexes). If muddy on dark, restyle via the dark.css
  generator's OVERRIDES with attribute selectors.
- `LmccJourneyMap.tsx` has a private FW palette doing `${hex}33` concat —
  left literal; not on the 22 board routes.
- Legacy monitoring ECharts (MetricChart, ConnectionBreakdown, Chart.tsx)
  untouched — not board routes.

## Hero pass (Micah's "love and pizzazz" directive, later 8/31)

All html.dark-scoped in FabricHero.tsx; light verified hash-safe:
- Band = lit infrastructure: SVG gradient fill #0b2340→#123054, #3374cc
  stroke, steady 22px AT&T-blue aura as the BASE state (breathe oscillates
  around it, 0%/100% == base so the freeze frame carries the glow), inner top
  highlight, brightened lockup ("Fabric" in #33b5eb, letterspaced hint).
- Private edges lift to --viz-cobalt-lit #58a6f0 + subtle glow; terminations
  standardized as PORTS (2.6px circles on the band, private/public colored) —
  the answer to "carets unaligned": no arrowheads anywhere, one deliberate
  ending.
- On-ramp labels are pill chips in dark (#222e3c / #2f3d4d border); the light
  haloed text hides only under html.dark.
- Comets are two-layer (bright #009fdb head + cobalt tail on a shared clock,
  head 0.115 path-units ahead); region comet speed keys to latencyMs.
  animation:none still collapses to the static frame (re-verified).

cloud-connect-3f re-froze and imported the hero boards — CONFIRMED live in
the Figma dark row (21 boards, y=5200, audited clean). Band gradient, glow,
ports, and chips all survived the freeze.

Open drift (theirs, logged in drift-report.md): PathChoice.tsx badge-wrap fix
(Micah-ordered) changed LIGHT layout, so light boards 07/08 are one fix
behind the app until their next light re-freeze. Connect suite still 106/106
with that edit in the tree.

## Final dark palette

The values live in `src/styles/dark.css` (surfaces/text/fw tokens, owned by
the board session) and `src/styles/tokens.css` html.dark block (viz/chart/nd,
owned here). Surfaces: wash #111821 · base #1a2431 · neutral #222e3c.
Viz: cobalt #3d8de0 · slate #64748b · band #14304e · bandStroke #2a5480 ·
ink #f2f6fa · halo #1a2431 · skyCursor #009fdb (brand, unchanged).
