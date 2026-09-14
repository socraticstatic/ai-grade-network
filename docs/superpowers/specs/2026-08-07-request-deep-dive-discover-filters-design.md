# Request Deep Dive + Discover Filters - Design

**Date:** 2026-08-07
**Status:** Approved by Micah ("go", this session)

## A. Request analysis deep dive (/ai/observe)

The flat 25-per-page request log stops being the default view. In its place, analysis-first in the house idiom:

1. **Requests verdict line** stating the day in one sentence: request count, allowed/guardrailed/denied split, spend, savings. Computed by a pure selector from the same rows the table uses; savings-first framing.
2. **Click-to-filter facets** on CategoryBars: by identity, by model, by route (fabric vs public), by outcome. Clicking a facet bar applies that value to the existing `RequestFilters` state; clicking it again clears it. Analysis and filtering are one gesture.
3. **Outliers**: top 5 costliest and top 5 slowest requests, each row opening the existing `RequestDrawer`. Aggregate → outlier → single trace is the deep dive.
4. **The raw log survives behind a disclosure** ("Show the raw log", collapsed by default) with the existing `RequestsFilterBar` + `RequestsTable` intact inside it. Facet-applied filters carry into the log when opened.

Mechanics: pure `requestAnalysis(rows: InsightRequestRow[])` module beside `insightsFigures.ts` returning `{ verdict, facets, outliers }`; a `RequestDeepDive` component renders it; `InsightsPage` swaps the always-on table block for `RequestDeepDive` + disclosure.

## B. Discover: top level first, filterable

1. **Filter chips** directly under the Tree/Map toggle: Cloud (one chip per cloud in the estate), Path (On the fabric / Public internet), Domain (Network / AI). One filter state scopes BOTH the tree and the map. Chips toggle; active chips render pressed; a "Clear" chip appears when any filter is active.
2. **Rollup by default**: the tree opens fully collapsed to cloud-level rollups (today `open` defaults to `new Set(['aws'])`; it becomes the empty set). Expand-all/collapse-all stay.
3. **Compact summary band**: the three stat sections (Network / Cloud / AI workflows) collapse into one row of headline tiles (sites, on-ramps active/total, clouds·regions, workloads, attached, exposed AI endpoints) with the current full sections behind a "Show the breakdown" disclosure.

Mechanics: `estateFilters.ts` pure module (`EstateFilters`, `applyEstateFilters(model, filters)` narrowing regions/VPCs) + `EstateFilterChips` component; UnifiedDiscovery threads the filtered model into the tree; AttachmentMap receives the filter and dims/hides filtered-out regions.

## Constraints (inherit all standing guards)

Vocabulary, no-horizontal-scroll, no chart libraries, VizKit palette only, testid contracts survive, verdict text from pure selectors, no em dashes.

## Out of scope

Saved filters, URL-persisted filters, new chart primitives beyond the kit, changes to the Security/Savings/Performance tabs.
