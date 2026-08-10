# Phase 1: Bank-Scale Estate Foundation - Design

**Date:** 2026-08-10
**Program:** [Advisor Program Roadmap](2026-08-10-advisor-program-roadmap.md)
**Depends on:** nothing. **Blocks:** Phase 2a (advisor), Phase 2b (Observe at scale).

## Problem

The demo estate is ACME-scale (a handful of branches, 3 clouds). The exec critique is that real customers are Wells Fargo-scale: thousands of sites. Nothing built on the current model proves the design survives that. The advisor's opening line ("we already see 4,187 of your sites") and the Sankey's rollup columns both need a data model that carries site classes and aggregates.

Grounding (researched Aug 10): a large bank runs ~6,000+ branches and ~10,000+ ATMs over SD-WAN mixing MPLS, broadband, and cellular, anchored by a few data centers and support offices. Cloud estates are hierarchies: org → OU/management group → account/subscription → region → hub/spoke VPC-VNets with a transit hub per region.

## Design

### Site classes

Extend `Branch` in `discoveryModel.ts` with a class:

```ts
type SiteClass = 'dc' | 'office' | 'branch' | 'atm';
interface Branch { /* existing */ siteClass: SiteClass; }
```

Existing ACME branches become `office` (no behavior change). All existing call sites compile unchanged; `siteClass` defaults are seeded, not inferred.

### Bank tenant

A second seeded tenant (working name: **Meridian Trust**) in the engine's seed data, alongside ACME:

- Sites: 3 `dc`, ~210 `office`, ~2,840 `branch`, ~1,130 `atm` (≈4,180 total). Generated deterministically from a seed function, not hand-authored rows - metro-weighted city distribution, CIDR plan by class, cellular-flagged ATMs.
- Cloud estate: 2 providers, hub-spoke - per-region transit hub VPC + spoke VPCs tagged by business unit (`retail`, `payments`, `risk`, `ai-lab`), platform-vs-application split mirrored from landing-zone practice.
- Estate carries the finding seeds Phase 2a needs: untagged AI workloads in `ai-lab`, unattached regions, public-egress flows, SPOF regions.

Tenant selection uses the existing preview-tenant mechanism (`Preview tenant: ACME` today). Switching tenants is the demo's scale toggle.

### Rollup derivations

New pure functions in `discoveryModel.ts` (unit-tested like the existing ones):

```ts
siteRollup(cc): { class: SiteClass; count: number; onNet: number }[]
cloudRollup(cc): { provider; regions: number; hubs: number; spokes: number; workloads: number }[]
```

`onNet` is the AT&T-side visibility count - the advisor's head-start number falls out of `siteRollup` directly.

### Rendering rule (the contract Phase 2 builds against)

No component may render per-entity rows for a collection whose size exceeds a **rollup threshold (50)**. Above it, render the rollup with drill-in. The tree, map, and filter chips adopt this: tree shows class → region → (drill) sites; `EstateFilterChips` gains site-class chips; the map clusters by class+metro. `UnifiedDiscovery` virtualizes any list it must render past the threshold.

### Performance

4.2k sites is small as data but large as DOM. The threshold rule keeps DOM shallow; derivations are memoized on the engine handle like existing `counts()`. Budget: Discover interactive under 200ms after tenant switch (measured in an e2e perf assertion, generous but a guard).

## Non-goals

No advisor UI (2a), no Sankey changes (2b), no new filter semantics beyond site class - `estateFilters`' existing model extends, it is not redesigned.

## Testing

- Unit: seed determinism (same tenant every run), rollup math, threshold rule helper, filter extension.
- E2E: switch to Meridian Trust → Discover renders rollups (no 4k-row DOM), chips scope tree and map by class, existing ACME flows regression-clean.
- Existing suites: `estateFilters.test.ts`, `discoveryModel.test.ts` extended, never weakened.
