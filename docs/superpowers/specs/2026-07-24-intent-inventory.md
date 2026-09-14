# Intent-Grounding Inventory (working notes for the intent-based experience)

Compiled 2026-07-24 by a read-only repo sweep, mapping the external
"Intent Taxonomy ILM 7" document (18 intents, 6 categories) onto the
engine mechanics that exist today. Companion to the coming design doc.

## The intent runtime that already exists
- Typed parser + priced commands: src/features/command/commandRegistry.ts
  (kinds nav/attach/enforce/undo/attach-region/steer/cap; parseIntent cap
  grammar is the only free-text-to-mutation path).
- Andi's router: andiBrain.ts (typed intent -> confirm-to-run; grounded
  answers; honest fallback). Andi drafts; the human commits.
- Design->simulate->share->approve->commit: StackPanel + stackFigures
  (advisorDraft, stagedDeltas, commitMoves) + proposals in state-share.ts
  (links carry intentions, receiving engine reprices).
- Projection before commit: state.ts project()/previewOnramp/previewFix,
  plan()/applyStep, postureCatalog in state-actions.ts.
- Undo + audit on every mutation.

## Category grounding (taxonomy -> engine), and the precise gaps
1. Performance: regionLatency is the ruler; latency-slo policy requirement
   exists; throughputSeries + windowMoments as triggers.
   GAPS: no jitter derivation (only p50/p95/p99); the Perf catalog's P95 is
   a hardcoded literal (state-actions.ts:146); no throughput SLO.
2. Resiliency: reliability dual/single/none derived; isDiverse, routeAdvisor
   'diversify' recs; simulateFailure/simImpact; routingFailover measures.
   GAPS: nothing predictive (only the seeded anomaly); provisionRegion's
   `resilient` opt is label-only; FAILOVER timing is a constant.
3. App-aware routing: steerFlow priced everywhere; routeFlows carries app
   labels/kinds; groups + tags select workloads.
   GAPS: binary path model (AT&T vs public); no QoS class; appList health
   is prose, not a trigger.
4. Security/compliance (richest): REQUIREMENTS vocabulary (isolate-internet,
   require-inspection, intra-tag-only, require-private-path, latency-slo);
   TAGS are a data-sensitivity taxonomy (pci, classified-helion...);
   fixes (fwInspection, dnsFirewall, dataPerimeter...).
   GAPS: no geo/residency evaluator (cloudTags.Region exists, nothing reads
   it); perimeter controls are booleans, not parametrized.
5. AI/workload: setTokenPolicy + the cap intent; ungoverned-token trigger;
   agents act live and are denied live; gatewayFlags levers.
   GAPS: budgets are advisory (promptTrace never denies on exhaustion);
   token-policy moves are NOT stageable on the twin.
6. Operational/governance: project() IS "Simulate and Validate Intent
   Impact"; setAlert cost/latency guardrails; audit log; proposals as the
   approval loop.
   GAPS: no standing intent object (declared/active/violated/reconciled);
   alerts emit events but trigger nothing; no auto-remediation by design
   (the machine stages, never commits - keep this law).

## The architectural fact that shapes the design
The twin loop is the only in-place intent-execution surface on Discover;
StagedMove today is only {attach|steer} (stackFigures.ts:104-106). An
18-intent experience either widens the stageable-move vocabulary or adds a
parallel intent surface. Widening is the path consistent with every law in
/stack's RULES ("the machine has an opinion -> it stages a draft").

## Docs that already demand this vocabulary
2026-07-23-time-machine-and-intents-design.md (the intent spec),
living-cross-section, proposals-and-advisor, layer-first-ia; the /stack
deck's LOOP_STEPS and RULES are the public contract any intent UX must keep.
