# NaaS Observe — Sankey + Flow Logs (feature 3 of 3)

**Date:** 2026-07-29
**Status:** Approved design, pre-plan
**Driver:** Exec stakeholder (2026-07-29): "NaaS observe screen is the most important to show — visibility-led selling motion. Beef up the chart to show a Sankey, and the records below need to represent actual flow logs — see example from AI Fabric observe screens." Third of three sequential features; consumes feature 2's managed VPC (vSRX) for record enrichment. NetBond portal samples do not exist in-repo — the stakeholder's conditional offer is unmet; the AI Fabric observe pattern is the reference.

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Sankey placement | The Traffic Flow panel's default **Flow** tab renders the Sankey; trend tabs (throughput/latency/egress/control) stay. |
| 2 | Bands | Source → Path → Destination. Sources: workload groups + sites. Path: AT&T fabric (cobalt) vs Public internet (slate). Destinations: AI endpoints, object storage, inter-cloud, SaaS/internet egress. |
| 3 | Record shape | Time-bucket, source, destination, proto/port, bytes, path, action — plus vSRX enrichment (inspected, zones, session) for flows whose source region has a **live** managed VPC, and deny records only where inspected AND policy says no (finance-invoices no-internet tag, internet-bound). |
| 4 | Architecture | Pure feature-side modules (`flowLogs.ts`, `sankeyModel.ts`); binding-level `view: 'series' \| 'sankey'` flag on flow tabs; AI binding untouched. No engine mutations. |
| 5 | Chart library | recharts `Sankey` (existing dependency). Flywheel palette; no amber. |

## Current state (what this builds on)

- `src/features/observe/ObservabilityShell.tsx` — header + KPI strip + Traffic Flow panel (tabs → line series) + records table + briefing rail + timeline scrubber. Driven by `ObservabilityBinding`.
- `src/features/observe/ObservabilityBinding.ts` — `Kpi`, `FlowTab {id,label}`, `SeriesPoint`, `RecordRow {id,label,cells,tone}`, `Briefing`, binding interface (`kpis()`, `flowTabs()`, `series(tabId)`, `records(groupBy)`, `groupByOptions()`, `briefing()`, `columns`).
- `src/features/observe/networkBinding.ts` — the network binding (KPIs, tabs, series from `telemetry()`/`egress()`, records from `routeFlows()` aggregates, briefing).
- Engine: `flows()` (raw: srcVpc, srcTag, dst, gbps, viaPublic), `routeFlows()` (aggregated by tag+dst with src cloud/region, paths, control verdicts), `branches`, `managedVpcFor` (feature 2), TAGS incl. `finance-invoices` (no direct internet).
- The AI binding + `AiObservePage` reuse the same shell — they must keep rendering unchanged.

## 1. `flowLogs.ts` — pure per-flow record synthesis

`src/features/observe/flowLogs.ts`, precedent `buildMap.ts`: `(cc) → FlowLogRecord[]`, deterministic, no clocks/RNG.

```ts
interface FlowLogRecord {
  id: string;                       // stable: fl-<flowId>-<i>
  bucket: string;                   // 'T-04' … 'T-00' — window fractions, newest last
  src: { kind: 'workload' | 'site'; label: string; cloudId?: string; regionId?: string };
  dst: string;                      // destination label (DST vocabulary below)
  proto: 'TCP' | 'UDP';
  port: number;                     // stable per dst kind: ai-endpoints 443, storage 9093, internet 443/80, intra 5432/8080
  bytes: number;                    // proportional share of the flow's gbps, deterministic split
  path: 'private' | 'public';      // the SAME verdict routeFlows states (attControlled)
  action: 'allow' | 'deny';
  vsrx?: { zoneFrom: string; zoneTo: string; session: string };  // only when inspected
}
```

Rules:
- Each `routeFlows()` row expands into a small fixed number of records (e.g. one per bucket × port variant), bytes split deterministically by index — sums recognizably proportional to the row's Gbps.
- `path` copies the row's control verdict — never re-derived.
- **Enrichment:** a record whose source region has `managedVpcFor(cloudId, regionId)?.stage === 'live'` gains `vsrx` (zones `trust → untrust` outbound, session `s-<flowId>-<i>`).
- **Denies:** `action: 'deny'` ONLY when (a) the record is inspected (vSRX present — an uninspected region cannot claim it blocked anything), (b) the source tag carries the no-internet policy (`finance-invoices`), and (c) the destination is internet-bound. All other records are `allow`.
- Site-sourced records derive from branches with flows toward cloud regions (fixed small set so sites appear as sources; bytes modest). If the engine has no site-flow fact to read, sites appear ONLY in the Sankey via their on-ramp association and NOT in fabricated log records — nothing invents traffic the engine doesn't state. Decide while implementing by reading `flows()`; the honest option wins.

## 2. `sankeyModel.ts` — three-band Sankey derivation

`src/features/observe/sankeyModel.ts`: `(cc) → { nodes: SankeyNode[]; links: SankeyLink[] }` in recharts' `{nodes, links: {source, target, value}}` index form.

- Band 1 sources: one node per `routeFlows()` source group (tag label), plus site nodes if site flows exist (same decision as flowLogs §1).
- Band 2: exactly two nodes — `AT&T fabric`, `Public internet`.
- Band 3 destinations: `AI endpoints`, `Object storage`, `Inter-cloud`, `SaaS / internet egress` (label distinct from the Band-2 path node).
- Every flow contributes to exactly one path node: `attControlled → AT&T fabric`, else `Public internet`. Link value = Gbps (1 decimal). Source→path and path→destination links must balance per flow.
- Node/link palette: cobalt `#0057b8` fabric-side, slate `#94a3b8` public-side; destination nodes neutral. No amber.

## 3. Shell + binding integration

- `ObservabilityBinding.FlowTab` gains optional `view?: 'series' | 'sankey'` (default `'series'` — AI binding untouched, its tabs carry no `view`).
- `ObservabilityShell` renders a new `SankeyPanel` (recharts `Sankey`, custom node/link rendering for palette + labels, accessible fallback list of links for screen readers) when the active tab's `view === 'sankey'`; otherwise the existing series chart. Timeline scrubber continues to apply to series tabs only.
- `networkBinding.flowTabs()`: first tab becomes `{ id: 'flow', label: 'Flow', view: 'sankey' }`; existing trend tabs unchanged and `series()` keeps serving them.

## 4. Records = flow logs

- `networkBinding.columns` → `['Time', 'Source', 'Destination', 'Proto/Port', 'Bytes', 'Path', 'Action']`.
- `records(groupBy)` renders `flowLogs()` rows: tone `bad` for denies, `ok` for inspected allows, `muted` for uninspected public — the table itself carries the visibility story. Inspected rows append the vSRX zone pair in the row label or a cell.
- `groupByOptions()` → None / Source / Destination / Path / Action. Grouped rows sum bytes and count records.
- Briefing: unchanged sources, plus one sentence when denies exist: "vSRX in <region> blocked <n> flows from <tag>-tagged workloads." KPI strip unchanged.

## 5. Out of scope (v1)

- AI binding changes; AiObservePage stays byte-identical in behavior.
- Log pagination, time-range-driven regeneration, CSV export, NetBond sample import.
- New engine derivations or mutations (everything reads existing engine facts + feature 2's `managedVpcFor`).

## 6. Testing

- **flowLogs:** deterministic across calls; every significant `routeFlows` row yields ≥1 record; path copies the control verdict; enrichment appears ONLY when a live managed VPC covers the source region (deploy one in-test via `CC.deployManagedVpc` + 4× `advanceManagedVpc`, restore ramp with `CC.undo()`); denies only inspected+tagged+internet-bound; zero denies pre-deploy.
- **sankeyModel:** per-flow band balance (source→path total == path→destination total); every flow in exactly one path node; no orphan nodes; values match `routeFlows` Gbps.
- **Shell/binding:** Flow tab renders the Sankey (nodes queryable by label); trend tabs still render the series chart; records table shows the new columns; group-by re-groups; AI binding tabs still render series (no `view` flag). Existing observe + ai-fabric suites green.
- Full suite, `tsc --noEmit`, build green. Browser walkthrough: Observe pre-deploy (Sankey + uninspected logs, no denies) → deploy a managed VPC (feature 2 flow) → Observe again: inspected records, deny rows, briefing sentence.
