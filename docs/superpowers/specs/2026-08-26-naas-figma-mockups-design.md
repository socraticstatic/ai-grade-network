# NaaS 1440 Mockups → Figma Handoff

**Date:** 2026-08-26
**Status:** Approved pending review
**Owner:** Micah Boswell
**Consumer:** External designer (no repo access), e.g. Avshalom

## Goal

Take the key layouts of the NaaS side of cloud-connect, fix visual drift
in the app itself, and deliver them as pixel-perfect, fully editable
Figma layers in a new file in Micah's drafts, on a page named
**"NaaS — 1440 Mockups"**. A written handoff spec accompanies the file
for a designer with no repo access.

## Scope

Twelve artboards at 1440px wide, desktop only:

| # | Artboard | Route / state |
|---|----------|---------------|
| 01 | Discover entry | `/discover` |
| 02 | Meridian advisor — first screen | `/discover/advisor`, initial state before any interaction. This is also the public site's opening screen (`/` redirects here). |
| 03 | NaaS Home | `/naas/home` |
| 04 | Connect — fabric overview | `/naas/connect` (FabricHero resting) |
| 05 | Connect — fabric drill | FabricHero drilled into one building |
| 06 | Connect — estate map | EstateLevelMap state |
| 07 | Connect — path choice | PathChoice + PathTable |
| 08 | Connect — provision wizard | ProvisionWizard, representative step |
| 09 | Govern | `/naas/govern` |
| 10 | Observe — Sankey | `/naas/observe`, flow view (the money screen) |
| 11 | Cost | `/naas/cost` |
| 12 | Foundation | Tokens, type ramp, spacing grid, component states |
| 13 | Components | Shared chrome and repeated elements as Figma components (see below) |

Out of scope: AI Fabric layer (`/ai/*`), NetOps, tablet/mobile
viewports, dark mode, redesign beyond drift fixes.

## Componentization

Repeated elements become real Figma components on the Components board
(13), and screen artboards use instances of them — not twelve
disconnected copies. Source of truth is the shared chrome in the app:

- **Header** — `MainNav` (logo, layer nav, search, tenant selector,
  tasks/notifications, user menu)
- **Left rail** — `LeftRail` verb navigation
- **Sub-nav / tab group** — `SubNav`, `TabGroup`
- **Footer** — `Footer`
- **Primitives** — `Button`, `Card`, `MetricCard`/`QuickStatCard`,
  `StatusBadge`/`Badge`, `StandardTable` row, `Toggle`, `SearchFilterBar`

Build order: the Components board is imported and componentized
**first** (after Foundation), before any screen artboard. Each shared
element is imported once via html.to.design, converted to a Figma
component with named variants where states exist (header per active
layer, badge per status). Then, per screen artboard, the imported copy
of each shared region is replaced with the component instance — header,
left rail, and footer at minimum on every screen; primitives replaced
where the swap is clean, mapped in the screen's spec page where it is
not. The screen spec pages name which component each region uses, so
the mapping survives even where a swap was manual-skipped.

## Fidelity contract

"Clean up while mirroring." Layout and IA stay exactly as shipped.
What gets corrected, in the app code first so screenshots and Figma
agree:

- Spacing drift off the 4px grid
- Type that departs from the Flywheel ramp
  (`docs/figma-reference/DESIGN_SPECS.md`)
- Colors off-token (anything not in `src/tokens/tokens.json` /
  the `fw` Tailwind theme)
- Border/radius/shadow inconsistencies between sibling components

No re-art-direction. If a fix would change layout or IA, it is logged
in the drift report and skipped.

## Pipeline (per screen)

1. **Audit** — open the screen in the dev server at 1440px, compare
   computed styles against Flywheel tokens, write a drift list.
2. **Fix** — correct the drift in the React source. Visual verification
   in the browser after each fix; existing tests must stay green.
3. **Capture** — deterministic render at 1440px (seeded/mock data,
   animations settled), verified against the live app.
4. **Freeze** — save a standalone, self-contained HTML artboard per
   screen under `docs/figma-handoff/artboards/NN-<slug>.html`: exact
   computed styles, ATT Aleck fonts inlined, real data states. These
   files are the masters.
5. **Import** — drive the `html.to.design` Figma plugin via
   browser-harness in Comet (logged-in session) to convert each
   artboard into editable Figma layers.
6. **Arrange** — place the imported frames on the "NaaS — 1440 Mockups"
   page in the table order above, labeled `NN — Name`.
7. **Spec** — write `docs/figma-handoff/NN-<slug>.md` per screen:
   annotated redlines, measurements from the live DOM
   (`getBoundingClientRect` + computed styles), token references,
   states. Plus `00-foundation.md` succeeding the SDCI-era
   `DESIGN_SPECS.md`.

## Figma target

- **File:** new file created in Micah's Figma drafts, named
  **"AI-grade Network — NaaS Mockups"**.
- **Page:** "NaaS — 1440 Mockups".
- **Access path:** browser-harness → Comet → figma.com (existing
  logged-in session). No Figma MCP (unauthorized here and read-only),
  no REST API (cannot create design nodes).
- A companion "Redlines" frame on the same page carries token and
  spacing annotations so the file is self-explanatory without the repo.

## Known limits (stated, not hidden)

- `html.to.design` free tier caps imports (~10/month). If the cap or a
  missing install blocks an import, work pauses and Micah is told;
  nothing degrades silently to flattened images.
- Canvas/ECharts content (the Sankey, chart.js widgets) imports as
  images. The Observe Sankey additionally gets a true SVG export so the
  vectors are editable in Figma.
- ATT Aleck Sans must be available to Micah's Figma account for text
  layers to render correctly; if it is missing, text imports with the
  fallback and the spec notes the substitution.

## Order of work

Foundation audit first (it calibrates every later fix), then the
Components board (13) so every screen import has instances to swap to,
then screens in scope order 01 → 11, artboard 12 assembled from the
foundation work.
Each screen completes its full pipeline (audit → fix → capture → freeze
→ import → spec) before the next begins, so Figma fills incrementally
and a stall never strands ten unfinished screens.

## Verification

- Per screen: side-by-side of live app @1440 vs frozen artboard vs
  imported Figma frame; differences beyond antialiasing are defects.
- App fixes: `npm run test` green, visual check in the browser.
- Components: header, left rail, and footer on every screen artboard
  are instances of the shared components, not detached copies.
- Final: every artboard present on the page, labeled, in order;
  spec files complete with no TBDs; drift report lists every deviation
  found and whether it was fixed or logged.

## Deliverables

1. Figma file "AI-grade Network — NaaS Mockups" with the populated
   "NaaS — 1440 Mockups" page (11 screen frames + Foundation +
   Components boards + redlines frame), shared chrome as components
   with instances across all screens.
2. `docs/figma-handoff/` — foundation spec, 11 screen specs, frozen
   HTML artboards, SVG/PNG asset kit, drift report.
3. App drift fixes committed to `main` in small per-screen commits.
