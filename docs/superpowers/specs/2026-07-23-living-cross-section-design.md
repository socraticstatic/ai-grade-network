# The Living Cross-Section — Design

**Date:** 2026-07-23
**Approved direction:** Discover's stack panel graduates from labeled bands to
a live digital-twin cross-section with a design mode (Micah, this session).
Inspiration: UniFi Design Center's design → simulate → commit loop; Railway's
"the surface is the system" stance. Constraint: every figure derives from the
engine; simulation and committed state read the same getters.

## What it is

The stack panel on /discover becomes two things at once:

1. **A live cross-section (view mode, default).** Each stratum states real
   figures from the engine, in the app's one latency/cost vocabulary:
   - **AI Fabric (live):** models governed & ready (modelCatalog), tokens
     metered today (tokenMeterList), spend today (aiSpendTotals) — the same
     derivations /ai/cost renders.
   - **Cloud (vision):** the estate's real cloud counts (counts(): clouds,
     regions, VPCs). Still a vision stratum: no verbs, deep-link caption to
     NaaS · Connect unchanged.
   - **NaaS (live):** regions on the fabric vs public (fabricModel().regions),
     egress on-fabric vs public $/mo (egress()), and the savings still on the
     table (arbitrage().availableSavings) — the same figures /naas/cost states.
   - **Transport & Access (vision):** unchanged media tiles, no invented data.
2. **A twin you can design on (design mode).** A "Design on the twin" toggle
   reveals the stageable moves the engine actually supports:
   - **Attach a region** — from fabricModel() regions where attached=false.
     Staged delta: latency publicMs → privateMs (regionLatency), and the
     egress saving of the arbitrage bucket keyed to that region's on-ramp,
     port fees disclosed.
   - **Steer a flow** — from routeAdvisor() recommendations. Staged delta:
     $/GB and latency change from routeFlows() current vs the AT&T path.
   Staged moves collect in a tray with summed deltas ("2 moves · −41 ms on
   the worst path · −$9.1k/mo egress · port fees +$400/mo"). **Commit**
   applies each move through the real engine actions (provisionRegion,
   steerFlow) — event-emitting, undoable through the existing Undo control.
   **Discard** clears the tray; staging is pure UI state and never touches
   the engine.

## The honesty invariants (non-negotiable)

- A staged delta is computed from the SAME getters the committed state will
  report: regionLatency for both sides of the latency arrow, arbitrage()
  buckets for egress, routeFlows() for steering. If the engine cannot state a
  delta, the move does not offer one.
- Bare latency figures name their path ("on the fabric" / "public transit"),
  per the one-vocabulary rule.
- No figure on the cross-section may disagree with /naas/cost, /naas/connect
  or /ai/cost — enforced by deriving from the same modules those pages use,
  and by an e2e that cross-checks one figure per stratum against its page.
- Vision strata state only what the estate really contains (counts) or
  nothing numeric at all.

## Components

1. **stackFigures.ts** (src/features/discover/): pure derivation module.
   `aiStratum(cc)`, `naasStratum(cc)`, `cloudStratum(cc)` — typed figures +
   the stageable-move lists (`attachOpportunities(cc)`, `steerOpportunities(cc)`)
   and the delta math (`stagedDeltas(cc, moves)`). No React. Unit-tested
   against the live engine (CC) the way engine tests are.
2. **CrossSection UI** — StackPanel evolves in place (same testids, same
   elevation order, same vision-strata honesty). Live bands gain a figure row;
   the panel header gains the Design toggle; staged state renders as a tray
   pinned to the panel foot. Uses useCloudControlLive (token meters tick).
3. **Design mode staging** — local component state: `StagedMove[]`
   (`{kind:'attach',regionId}` | `{kind:'steer',flowId,pathId}`). Commit maps
   moves onto CC.provisionRegion / CC.steerFlow in order, then exits design
   mode. Failures surface per move; nothing is silently dropped.

## Out of scope

3D/WebGL treatment, the Observe time machine, natural-language intent
execution, free-form canvas dragging, persistence across refresh (the demo
estate is session-scoped by product design; commit durability equals every
other engine mutation's).

## Testing

- Unit: stackFigures derivations agree with the engine getters; delta math
  for attach and steer; staging reducer add/remove/clear.
- Component: view-mode bands render engine figures; design toggle reveals
  opportunities; tray sums; discard clears without engine events.
- e2e (cross-section.spec.ts): stage the usw2 attach → the tray states the
  regionLatency figures → commit → the NaaS band flips its regions-on-fabric
  count AND /naas/connect's usw2 edge shows data-path=private → Undo reverts.
  Cross-check: the band's egress figure equals /naas/cost's.
- npm run verify green; browser walk with screenshots.
