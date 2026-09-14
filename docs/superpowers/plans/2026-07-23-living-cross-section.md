# Living Cross-Section Implementation Plan

> Spec: docs/superpowers/specs/2026-07-23-living-cross-section-design.md
> Branch: feat/living-cross-section

**Goal:** Discover's stack panel states live engine figures per stratum and
gains a design mode: stage attach/steer moves, see engine-derived deltas,
commit through real engine actions.

**Architecture:** one pure derivation module (stackFigures.ts) feeds an
evolved StackPanel. Staging is component state; commit calls CC actions.
Nothing renders a number the engine did not produce.

## Global constraints
- Figures derive only from: counts(), fabricModel(), regionLatency(),
  egress(), arbitrage(), routeFlows(), routeAdvisor(), modelCatalog(),
  tokenMeterList(), aiSpendTotals()/aiSpendRows().
- Latency figures always name their path. Money figures match /naas/cost and
  /ai/cost by construction (same modules).
- Vision strata gain counts only (Cloud) or nothing (Transport).
- All existing StackPanel + discover tests keep passing or evolve with intent.

### Task 1: stackFigures.ts + tests
**Files:** create src/features/discover/stackFigures.ts, stackFigures.test.ts
- Types: `AiStratumFigures`, `NaasStratumFigures`, `CloudStratumFigures`,
  `AttachOpportunity {regionId,label,cloudName,publicMs,privateMs,bucketSavingMo|null,portFeeNote}`,
  `SteerOpportunity {flowId,pathId,label,egressDeltaMo,latencyDeltaMs|null}`,
  `StagedMove`, `StagedDeltas {worstPathMsBefore/After|null, egressDeltaMo, portFeesDeltaMo, moves}`.
- `aiStratum(cc)`: {modelsReady, modelsTotal, tokensToday, spendToday, ungovernedToday}
  via modelCatalog()/tokenMeterList()/aiSpendTotals().
- `naasStratum(cc)`: {regionsAttached, regionsTotal, sites, egressPubMo,
  egressPrivMo, availableSavingsMo} via fabricModel()/egress()/arbitrage().
- `cloudStratum(cc)`: {clouds, regions, vpcs} via counts().
- `attachOpportunities(cc)`: unattached fabric regions joined to arbitrage
  buckets by onrampId (bucket.attached===false && bucket.onrampId ∈ region.onrampIds).
- `steerOpportunities(cc)`: routeAdvisor().recommendations with action==='steer',
  joined to routeFlows() for the delta math.
- `stagedDeltas(cc, moves)`: sums; latency states before/after for the single
  worst staged path, in regionLatency vocabulary.
- Tests run against the real CC (import { CC } from engine), like engine tests.

### Task 2: CrossSection UI (StackPanel evolves)
**Files:** modify src/features/discover/StackPanel.tsx, StackPanel.test.tsx
- Keep testids stack-panel / stack-band-*. Live bands add a figure strip
  (small stat cells: label + figure + path name where latency/money).
- Cloud band adds the counts line ("3 clouds · 14 regions · 142 VPCs" from
  counts()) keeping its vision tag and deep link.
- Uses useCloudControlLive so token figures tick.
- Header right side: "Design on the twin" toggle (aria-pressed), off by
  default; renders nothing else when off.

### Task 3: Design mode
**Files:** StackPanel.tsx (+ small DesignTray.tsx if it grows), tests
- Toggle on: each live band lists its opportunities (attach under NaaS,
  steer under NaaS; AI band states "no stageable moves yet" only if its
  list is empty — do not invent AI moves).
- Stage/unstage buttons mutate `StagedMove[]`; tray at panel foot renders
  stagedDeltas() summary + Commit / Discard.
- Commit: for each move call provisionRegion / steerFlow; collect failures;
  toast/announce result; clear tray; exit design mode. Discard: clear only.
- aria-live="polite" on the tray summary.

### Task 4: e2e + verify + browser walk
**Files:** create e2e/cross-section.spec.ts
- Walk per spec Testing section (stage usw2 → deltas → commit → band count +
  /naas/connect edge private → Undo reverts count).
- Cross-check egress figure vs /naas/cost.
- npm run verify; headless screenshots; merge to main.
