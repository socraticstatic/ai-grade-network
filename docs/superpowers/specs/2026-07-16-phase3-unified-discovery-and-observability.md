# Cloud Connect Phase 3 — Unified Discovery + Dual Observability

**Date:** 2026-07-16
**Status:** Approved direction, pre-plan
**Driver:** Product-owner notes — (1) discovery is split across Discover (network) and AI Fabric/Configuration (AI providers); aggregate into one location since endpoints are largely common. (2) Need a network-focused observability view in the pattern of the AI Fabric Insights view (`ai-fabric-observability-insights_v2.html`).

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Observability scope | **Both** layers get the rich pattern: one shared observability shell, two data bindings (bytes / tokens). |
| 2 | Discovery layout | **Unified rows** keyed by cloud/provider; each row carries both the network facet and the AI facet. |
| 3 | Theme | Translate the reference **IA**, not its dark navy palette — render in the portal's light Flywheel theme + AT&T tokens/icons. |
| 4 | Data | Engine-backed only (`useCloudControl`); no mock/local state. Deterministic (no `Date.now()`/`Math.random()` in render). |

## Reference IA (from `ai-fabric-observability-insights_v2.html`)

The AI Fabric Insights view establishes the pattern both observability views will follow:
- **Header row**: title + breadcrumb, live indicator, time-range control (15 min / 1 h / 2 h / 24 h), Refresh.
- **KPI strip** (5 tiles) with a small breakdown under each.
- **Traffic Flow** panel with view tabs (Flow / Trend / Tokens / Requests / Cost / TTFT).
- **Records table** with Group-by (None / Provider / Model / Identity / Source / Route / Status) and filters (path: All/Private/Internet, status: All/Success/Error/Blocked).
- **Briefing rail** (right, ~360px): AI-generated narrative of the current window + drill-action chips + follow-up questions.

## Current-state map

- `src/features/discover/` — network discovery (`EstateTable`: clouds → regions → VPCs, on-ramps, path control).
- `src/features/ai-fabric/ModelCatalog.tsx` — AI endpoint/provider discovery (Bedrock, Azure OpenAI, OpenAI, CoreWeave, Cursor, Nebius; connected/pending; models; tokens/min).
- `src/features/observe/` — current network observability (telemetry + tokenMeterList + obsSummary + appList), simpler than the reference.
- Engine selectors available: `onramps`, `endpoints`, `modelCatalog`, `counts`, `aiExposed`, `discovered/discovery`, `telemetry`, `egress`, `routeFlows`, `routingKpis`, `obsSummary`, `tokenSeries`, `tokenMeterList`, `decisionLog`, `agentList`, `tokenPolicyList`, `sceneGraph`.

---

## Feature A — Unified Discovery

**Goal:** one Discovery surface where each cloud/provider row shows both its network face (on-ramp, VPCs, private/public path, attach state) and its AI face (model endpoints, provider status connected/pending, tokens/min). AI Fabric keeps tokens/governance/agents; Configuration is no longer where providers are discovered.

**Shape:** a single inventory keyed by `cloud/provider`. Each row is derived by joining the engine's `onramps`/estate (network) with `endpoints`/`modelCatalog` (AI) on the shared cloud key (AWS, Azure, GCP, OCI, CoreWeave, Nebius, plus provider-only entries like OpenAI/Anthropic/Cursor that have no network on-ramp).

**Row (collapsed):** provider mark (AttIcon / brand) · name · **Network** chip (attached-private / public / n-a) · **AI** chip (connected / pending / n-a) · models count · tokens/min · region.
**Row (expanded):** two facet panels — *Network* (on-ramp id, VPCs, path, latency, egress) and *AI* (model endpoints list, provider status, tokens/min, budget/ready). Actions stay engine-real (attach on-ramp; the AI-side connect/pending mirrors existing model-readiness).

**Segmented lens (optional, within one page):** All / Network / AI filter chips that dim the non-matching facet — but it remains ONE page and one list. Not separate tabs.

**Components:**
- `src/features/discover/UnifiedDiscovery.tsx` — page shell + lens chips + list.
- `src/features/discover/DiscoveryRow.tsx` — collapsed row + expand.
- `src/features/discover/useUnifiedInventory.ts` — selector that joins network + AI facets into `InventoryRow[]` from engine state (pure, memoized via `useCloudControl`).
- Move the provider-card content out of `ModelCatalog` into the AI facet (AI Fabric links to Discovery for provider status; ModelCatalog may keep a governance-focused model list or be slimmed).

**Data join (engine, read-only):** `useUnifiedInventory` maps each cloud key to `{ key, name, mark, network: {onramp, attached, path, vpcs, latencyMs, egress} | null, ai: {status, models[], tokensPerMin, ready} | null }`. No new engine mutations required for v1; reuse `activateOnramp` for the network attach action.

---

## Feature B — Dual Observability (shared shell)

**Goal:** bring both network and AI observability to the reference pattern, sharing one shell with two bindings.

**Shared shell:** `src/features/observe/ObservabilityShell.tsx` renders header (title/breadcrumb/live/time-range/refresh) + KPI strip + Traffic Flow panel + Records table + Briefing rail, all driven by an `ObservabilityBinding` prop:

```ts
interface ObservabilityBinding {
  layer: 'network' | 'ai';
  kpis(): Kpi[];                       // 5 tiles {label, value, unit, sub, breakdown[]}
  flowTabs(): FlowTab[];               // tab id/label + series selector
  flowSeries(tabId, range): Series;    // deterministic time-series for the chart
  records(groupBy, filters): Row[];    // table rows
  groupByOptions(): Opt[];
  filterOptions(): FilterDef[];
  briefing(range): { narrative: Block[]; actions: Chip[]; followups: string[] };
}
```

**Network binding** (`networkBinding.ts`): KPIs = throughput (Gbps), p95 latency, egress $/mo, % under AT&T control, private-path savings. Flow tabs = Flow / Trend / Throughput / Latency / Egress / Control. Series from `telemetry()`/`egress()`. Records from `routeFlows()` grouped by path / cloud / region / control-state; filters path (private/internet) + control. Briefing from `obsSummary()`/`routingKpis()` narrating control %, top public flows, egress driver, with drill chips (e.g. "Show public flows", "Steer top flow").

**AI binding** (`aiBinding.ts`): the reference view itself — KPIs = Tokens / Requests / Cost / TTFT / Savings. Flow tabs = Flow / Trend / Tokens / Requests / Cost / TTFT. Series from `tokenSeries()`/`tokenMeterList()`. Records = token records grouped by provider / model / identity / route / status; filters path + status. Briefing from token state (private vs internet %, top identity, top provider) with drill chips.

**Routing:** network binding mounts under **Observe**; AI binding mounts under **AI Fabric → Observability** (a sub-view / tab within AI Fabric). Both reuse `ObservabilityShell`.

**Chart:** reuse the repo's existing charting — `recharts` + `chart.js`/`react-chartjs-2` are already deps, and `observe/TelemetryCharts.tsx` (bytes) and `observe/TokenCharts.tsx` (tokens) already exist. The shell's Traffic Flow panel wraps/extends these; **do not add a charting dependency**. Deterministic series only.

**Briefing rail:** narrative is generated from engine state (same approach as the existing `obsSummary`), not an LLM call. Drill chips call existing engine actions / set local filters. No network requests.

---

## Out of scope (v1)

- New engine mutations beyond reusing `activateOnramp` and existing steer/failover.
- Real LLM generation for the briefing (it is state-derived text).
- Cost/TTFT accuracy beyond the existing token/billing model.
- Configuration tab redesign (only the provider-discovery responsibility moves out of it).

## Testing

- **Unified Discovery:** `useUnifiedInventory` join is deterministic and covers every cloud key that has a network on-ramp OR an AI endpoint (no cloud dropped, no dupes). A row with both facets renders both chips; a provider-only row renders AI-only with network n-a. Clicking the network attach action flips the row's network chip via real engine state.
- **Observability shell:** given a binding, renders 5 KPI tiles, the flow tabs, a records table with ≥1 row per `records()`, and a briefing rail. Switching group-by re-groups rows. Network and AI bindings each produce non-empty KPIs/records/briefing deterministically.
- Keep `src/__tests__/rebrand.test.ts` and existing feature tests green. `npm run build` + `tsc --noEmit` clean.

## Rollout

Phase 3 splits into two plans (each its own SDD run):
- **3A — Unified Discovery** (Feature A).
- **3B — Dual Observability** (Feature B; shared shell + two bindings + routing).
Ship 3A first (self-contained), then 3B.
