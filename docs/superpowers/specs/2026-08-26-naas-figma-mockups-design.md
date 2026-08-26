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
| 02 | Meridian advisor | `/discover/advisor` |
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

Out of scope: AI Fabric layer (`/ai/*`), NetOps, tablet/mobile
viewports, dark mode, redesign beyond drift fixes.

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

Foundation audit first (it calibrates every later fix), then screens in
scope order 01 → 11, artboard 12 assembled from the foundation work.
Each screen completes its full pipeline (audit → fix → capture → freeze
→ import → spec) before the next begins, so Figma fills incrementally
and a stall never strands ten unfinished screens.

## Verification

- Per screen: side-by-side of live app @1440 vs frozen artboard vs
  imported Figma frame; differences beyond antialiasing are defects.
- App fixes: `npm run test` green, visual check in the browser.
- Final: every artboard present on the page, labeled, in order;
  spec files complete with no TBDs; drift report lists every deviation
  found and whether it was fixed or logged.

## Deliverables

1. Figma file "AI-grade Network — NaaS Mockups" with the populated
   "NaaS — 1440 Mockups" page (12 frames + redlines frame).
2. `docs/figma-handoff/` — foundation spec, 11 screen specs, frozen
   HTML artboards, SVG/PNG asset kit, drift report.
3. App drift fixes committed to `main` in small per-screen commits.
