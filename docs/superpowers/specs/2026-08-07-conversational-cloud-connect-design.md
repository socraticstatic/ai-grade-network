# Conversational Cloud Connect - Design

**Date:** 2026-08-07
**Status:** Approved by Micah (this session)
**Scope:** The exec demo spine: Discover -> Connect -> Observe. Screens off the spine (11-tab detail pages, Configure tabs) are explicitly out of scope until the spine ships.

## Problem

The site reads as four separate products (Manage, Monitor, Configure, Create) plus the layer screens. Execs watching a demo lose the thread between screens. Labels are operator-speak. Visualizations come from two conflicting chart libraries (chart.js and recharts) and read as library defaults; the only visuals that land are the two hand-rolled ones (SankeyPanel, FabricHero), both of which already obey a left-to-right ingress-to-egress axis.

## Principles

1. **The demo spine is the product.** Discover -> Connect -> Observe. All work lands there first.
2. **One axis.** Left is ingress, right is egress. Every spine visualization obeys it. Status and history render as positions along the path, never as separate chart types.
3. **One grammar.** The FabricHero/Sankey hand-rolled SVG idiom becomes the house visualization system. No new charting framework. Headless d3 modules only (d3-sankey, d3-scale, d3-shape) where layout math gets hard: they compute geometry, our SVG renders it. chart.js and recharts are evicted from the spine.

## Phase 1 - The spine speaks (language + wayfinding)

- **Story strip.** A persistent lifecycle bar on every spine screen: Discover / Connect / Observe / Govern, current chapter lit. One component, one placement rule. Screens become chapters of one story.
- **Verdict sentences.** Every spine screen opens with one plain-English sentence stating the screen's conclusion (e.g. "Traffic is flowing clean: 96% allowed, $4.2k saved this week"). Operator detail stays below the fold. Verdicts are computed from the same bindings the screen already uses; no new data paths.
- **Vocabulary rules, enforced by test.** Extend the rebrand.test.ts pattern:
  - Savings-first framing ("Save", not "Cost", except where the figure is literally spend).
  - No acronym appears without first-use expansion on that screen.
  - Surviving tabs renamed as plain answers, not nouns.

## Phase 2 - One visual grammar (VizKit)

- **Primitives**, extracted from FabricHero and SankeyPanel into `src/components/viz/kit/`: the shared palette and ribbon math, `StationTrack`, `TrendBand`, `CategoryBars`. `FlowAxis`/`FabricNode` extraction is dropped (YAGNI) - the drill-down builds inside FabricHero, which already owns the axis.
- **Ground truth, verified this session:** the NaaS spine (`/discover`, `/naas/connect`, `/naas/observe`) already uses zero chart libraries. The only demo-reachable library charts are `src/features/ai-fabric/GovernanceDecisions.tsx` (recharts BarChart, via /ai/observe -> Security tab) and `src/features/cost/EgressTrend.tsx` (recharts, via the Observe CTA -> /naas/cost) - those two are the whole "chart migration." `BgpStatusTimeline.tsx` is dead code (zero importers) and is deleted, not replaced; the reachable "horrid timeline" is the 60-rect bar series + scrubber in `ObservabilityShell.tsx:108-126`, which TrendBand replaces. The live home for StationTrack is the managed-VPC bring-up (`DeployManagedVpcWizard.tsx:251-275`), which renders engine-driven `ManagedVpcStage[]` as a vertical dot list today; the LMCC-progression components in `src/components/connection/` are all orphaned (unreachable) and are left alone.
- **Fabric drill-down.** Clicking the AT&T Fabric node expands it in place into its internals (sites, IPEs, the four LMCC paths) on the same axis, with a chip to collapse. One level deep. Multi-level semantic zoom is out of scope.
- **Timeline replacement.** BgpStatusTimeline is deleted. Connection status renders as a StationTrack on the connection's own wire: Key Accepted -> Negotiating -> BGP Forming -> Live. (Flow 03 adds Key Generated at the head.)
- **Chart migration.** Remaining spine charts (Observe KPIs, AI Fabric cost) re-render in VizKit primitives. chart.js and recharts imports removed from spine bundles; off-spine screens keep them until touched.

## Phase 3 - The wizard draws the picture

Guided one-question mode becomes the default create experience. Each answer draws the FlowAxis diagram live: choosing ingress places the left node, choosing provider places the right node, choosing bandwidth thickens the ribbon. The conversation and the visualization are the same artifact. Other wizard modes (Visual Designer, API Toolbox) remain reachable but demoted.

## Phase 4 - ANDI narrates

ANDI's intent brain maps utterances to spine navigation and wizard answers, and speaks the phase-1 verdict sentences. Gets its own spec when phases 1-3 are done.

## Architecture notes

- Story strip and verdict sentence are two components in `src/features/_shared/`, consumed by spine pages. Verdict text lives with each feature's binding (e.g. `networkBinding.ts` gains a `verdict()` selector) so it is testable without rendering.
- VizKit primitives are pure presentational SVG components with typed props; layout math lives in headless modules beside them (same split sankeyModel.ts already uses).
- Fabric expansion is component state, not a route. Deep-linking the expanded state is out of scope.

## Error handling

- Verdict selectors must return a sentence for every binding state, including empty/degraded data ("No traffic yet: the fabric is quiet").
- StationTrack renders unknown/stalled statuses explicitly rather than skipping stations.

## Testing

- Vocabulary and verdict rules: test suite in the rebrand.test.ts pattern, run over spine route components.
- VizKit: unit tests per primitive plus layout-math tests, mirroring sankeyModel.test.ts.
- Wizard: one Playwright end-to-end run through the guided flow to a drawn diagram.

## Out of scope

- Off-spine screens (connection detail tabs, Configure, Billing, Reports).
- Multi-level fabric zoom, deep-linkable expansion state.
- New charting frameworks (visx, nivo, echarts and similar are explicitly rejected).
- ANDI implementation detail.
