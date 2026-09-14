# Phase 2b: Observe at Scale - Design

**Date:** 2026-08-11
**Program:** [Advisor Program Roadmap](2026-08-10-advisor-program-roadmap.md)
**Depends on:** Phase 1 (shipped). Parallel with 2a.

## Problem

Observe is the money screen, and the Sankey is its centerpiece - but it tells only the cloud-side story. `buildSankey` reads `routeFlows()` (region-grained app + c2c rows, ~9 flows); the customer's site estate never appears. The brainstorm's Wells Fargo critique lands here twice: (1) the left column has no room for thousands of sites, and (2) today it doesn't even try - branches are invisible on the screen that argues the money. The engine already generates per-branch flows (`state-rules.flows()`: branch → on-ramp → target-region VPCs, ~35,000 rows under Meridian) - unrepresented in the Sankey.

## Design

### Site-origin band, rollup-first

`buildSankey(cc, opts)` grows a site-origin source band derived from `flows()` branch rows, rolled up before rendering - never per-site nodes:

- **Default grouping: site class.** Source nodes like "2,840 branches", "1,130 ATMs" (Intl.NumberFormat, same vocabulary as Discover's rollups). Each links through the path band (AT&T fabric / Public internet, from `viaPublic`) to dest nodes (the target cloud regions' cloud names), weighted by summed `gbps`.
- **Drill-in, one level.** Clicking a site-class node re-derives with that class split by metro (`city`), top 8 metros + "Other (N sites)". Clicking again collapses. State lives in SankeyPanel; the model stays pure (`opts.drill?: SiteClass`).
- **Existing bands unchanged.** The routeFlows-derived region/app rows keep their current treatment; site-origin nodes join the same source band. Node cap: the widest possible model (drilled, both estates) stays under ~40 nodes.

### Estate chips scope the money screen

`EstateFilterChips` (the shipped component, including site-class chips) mounts on Observe above the Sankey, sharing the same `EstateFilters` shape. Cloud/path/domain facets filter routeFlows rows as region filters do on Discover; the siteClass facet filters the site-origin band via `branchMatches`. One filter vocabulary, two screens.

### Honest numbers

Branch-flow gbps are already engine-derived and deterministic. The Sankey's totals therefore change: the site-origin band ADDS traffic the screen previously ignored. The KPI strip above (throughput etc.) keeps its existing derivations - this phase does not relabel KPIs (Phase 0 settled them); a caption under the Sankey states the scope: "All flows - N site-originated, M cloud-originated." No number invented; every link value sums real flow rows.

### Scale guard

`flows()` is O(35k) under Meridian - called once per render via the existing memo pattern; the rollup pass is a single reduce. The e2e perf guard from Phase 1 (interactive < 5s) extends to Observe under Meridian.

## Architecture

- `sankeyModel.ts` - `buildSankey(cc, opts?: { filters?: EstateFilters; drill?: SiteClass | null })`; new pure helpers `siteOriginLinks(cc, filters, drill)`. Types extend `SankeyNode` with `band: 'source'`, plus `rollup?: { siteClass: SiteClass; count: number }` so the panel can style/drill rollup nodes.
- `SankeyPanel.tsx` - drill state, rollup-node affordance (click target + chevron), caption. Flywheel tokens; rollup nodes reuse the existing node idiom with the count label.
- `ObservePage.tsx` - mounts EstateFilterChips, owns the shared filters state, passes to SankeyPanel.
- `flowLogs.ts` untouched (its record table already deliberately excludes branch rows; the caption explains the difference).

## Non-goals

Business-unit grouping (site class + metro only this phase; BU needs group data the estate doesn't carry per-branch), KPI relabels, C2C restatement for Meridian (carried follow-up; the 2 resolvable pairs render, the caption's counts stay honest), flow-log table changes.

## Testing

Unit: site-origin rollup math (counts, gbps sums, class order), drill expansion (top-8 + Other), filter scoping (class chip narrows the band; cloud chip narrows routeFlows rows), node cap under drilled Meridian. Component: SankeyPanel drill interaction, caption counts. E2E (meridian): Observe renders the site band ("2,840 branches" node visible), ATMs chip narrows to one site node, drill on branches shows metros, perf guard; ACME regression: existing observe/sankey specs green (ACME's 6 sites roll up small but the band still appears - existing specs updated only where node lists are asserted literally).
