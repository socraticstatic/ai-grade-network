# AI Insights Rebuild (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/ai/observe` as the AI Gateway "Insights" screen from the Figma NAAS AI specs — KPI strip, code-generated Traffic-flow Sankey, filterable Requests table with savings columns, and Performance / Cost / Security tabs — every figure engine-derived.

**Architecture:** Two small engine extensions (request-log detail on `decisionLog`, two gateway optimization flags) feed a new `src/features/ai-fabric/insights/` module: three pure derivation files (each testable without React) and seven presentation components assembled by `InsightsPage`. `AiObservePage` renders `InsightsPage`; legacy `/ai/connect` and `/ai/cost` redirect; the interim rail items come out.

**Tech Stack:** React 18 + TypeScript, react-router (hash), Tailwind with fw-* tokens, vitest + @testing-library/react, Playwright.

## Global Constraints

- **Engine honesty:** every rendered figure derives from the `CC` engine at call time. No literals, no `Date.now()` in derivations (engine stamps `ts`), no mock rows. Sankey values are `aiSpendRows()` money; request rows are recorded engine decisions.
- **Design tokens:** only `fw-*` Tailwind tokens + the spec's data-viz hexes (`#0074b3`, `#009fdb`, `#00388f`, `#00c9ff`, `#49eedc`, `#5b3bee`, savings green `#2d7e24`, alert red `#c70032`). Radius 16 cards, `border-fw-secondary`, wash `#f8fafb` table headers.
- **Never ship the Figma source typos:** IDENTITY not "IDENTIDY", Anthropic not "Antropic", "Token invalidation", "Search identity, model...", "Total time savings". Our copy uses OUR estate's words (identities are `rd-helion`/`classified-helion`/`shared-services`, providers are CoreWeave/Nebius/OpenAI) — the Figma supplies anatomy, not nouns.
- **No em dashes in user-visible copy.**
- **Shared derivations only:** token money via `aiSpend.ts` (`fmtTokens`, `fmtUsd`, `statesRealMoney`, `aiSpendRows`, `aiSpendTotals`); route wording via `routeLabel`. Never restate.
- **Never orphan a route:** `/ai/connect` and `/ai/cost` stay routable as redirects the moment their rail items are removed — same commit.
- **Verification:** full logs to files, real exit codes. Never pipe a test runner through `tail`/`head`.

## File Structure

```
src/engine/state-console.ts            (modify: decision detail, gateway flags)
src/engine/types.ts                    (modify: RequestRecord, gatewayFlags types)
src/features/ai-fabric/insights/
  insightsFigures.ts                   KPIs + request rows + filter model
  insightsFigures.test.ts
  sankeyModel.ts                       Identity→Endpoint→Route→Provider graph
  sankeyModel.test.ts
  costFigures.ts                       routing/caching/budget/team/provider-share
  costFigures.test.ts
  KpiStrip.tsx                         5-card stat row
  TrafficSankey.tsx                    SVG sankey, generated ribbons, tooltip
  TrafficSankey.test.tsx
  RequestsFilterBar.tsx                search + selects + chips
  RequestsTable.tsx                    the savings-column table
  RequestsPanel.test.tsx
  PerformanceTab.tsx                   incident strip + latency savings
  CostTab.tsx                          both states (warning / achieved)
  CostTab.test.tsx
  SecurityTab.tsx                      blocked summary + existing trace/decisions
  InsightsPage.tsx                     header + assembly + ?tab= routing
  InsightsPage.test.tsx
src/features/ai-fabric/AiObservePage.tsx (modify: render InsightsPage)
src/components/navigation/navItems.ts  (modify: drop interim Connect/Cost)
src/App.tsx                            (modify: redirects)
tests/e2e → e2e/insights.spec.ts       (create)
```

---

### Task 1: Engine — request detail on the decision log

**Files:**
- Modify: `src/engine/state-console.ts:158-196`
- Modify: `src/engine/types.ts`
- Test: `src/engine/state-console.requestLog.test.ts`

**Interfaces:**
- Produces: `CC.decisionLog()` entries gain `{tag: string, modelId: string, tokens: number, ttftMs: number, path: 'private'|'governed egress'|'public', reason: string|null}` alongside the existing `{ts, allowed, guarded}`. `reason` is non-null only when `allowed === false` (the denial sentence from the trace step). Existing consumers (`aiBinding`, `GovernanceDecisions`) read only old fields and keep working.

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/state-console.requestLog.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from './state';

describe('decisionLog request detail', () => {
  it('an allowed trace records tag, model, tokens, ttft and path', () => {
    const before = CC.decisionLog().length;
    CC.promptTrace('rd-helion', 'helion-70b', 'unit test prompt');
    const d = CC.decisionLog()[before] as any;
    expect(d.allowed).toBe(true);
    expect(d.tag).toBe('rd-helion');
    expect(d.modelId).toBe('helion-70b');
    expect(d.tokens).toBeGreaterThan(0);
    expect(d.ttftMs).toBeGreaterThan(0);
    expect(['private', 'governed egress', 'public']).toContain(d.path);
    expect(d.reason).toBeNull();
  });

  it('a denied trace records the denial reason and zero tokens', () => {
    const before = CC.decisionLog().length;
    // classified-helion is scope no-external; gpt-class is the external model.
    CC.promptTrace('classified-helion', 'gpt-class', 'unit test prompt');
    const d = CC.decisionLog()[before] as any;
    expect(d.allowed).toBe(false);
    expect(d.tokens).toBe(0);
    expect(d.reason).toMatch(/no external/i);
  });
});
```

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run src/engine/state-console.requestLog.test.ts` → FAIL (`d.tag` undefined).

- [ ] **Step 3: Implement.** In `state-console.ts`, replace `recordDecision` and thread detail from `promptTrace` (which already holds every value at the moment of the request):

```js
function recordDecision(allowed,guarded,detail){
  decisions.push(Object.assign(
    {ts:Date.now(),allowed,guarded:!!guarded,tag:null,modelId:null,tokens:0,ttftMs:0,path:'public',reason:null},
    detail||{}));
  if(decisions.length>400)decisions.shift();
}
```

In `promptTrace`: the two denial branches call
`recordDecision(false,false,{tag,modelId,tokens:0,ttftMs:0,path:pathOf(tag),reason:'<the DENIED detail string>'})`;
the success path calls
`recordDecision(true,pol&&pol.guardrail,{tag,modelId,tokens,ttftMs:model.p50,path:priv?routePathOf(tag):'public'})`.
For `path`, read the one path derivation: `const route=CC.modelRoutes().find(r=>r.tag===tag); const path=route?route.path:'public';` (compute once at the top of `promptTrace`, use in both denial and success records). `ttftMs` is `model.p50` — the same deterministic figure the Completion hop prints.

- [ ] **Step 4: Run the test, verify PASS.** Also `npx vitest run src/engine` (no regressions in decision consumers).

- [ ] **Step 5:** Add to `src/engine/types.ts` next to the existing decision typing:

```ts
export interface RequestRecord {
  ts: number;
  allowed: boolean;
  guarded: boolean;
  tag: string | null;
  modelId: string | null;
  tokens: number;
  ttftMs: number;
  path: 'private' | 'governed egress' | 'public';
  reason: string | null;
}
```
and type `decisionLog(): RequestRecord[]`. Run `npx tsc --noEmit`.

- [ ] **Step 6: Commit** — `feat(engine): decision log records the request it judged`

---

### Task 2: Engine — gateway optimization flags (routing / caching)

**Files:**
- Modify: `src/engine/state-console.ts` (after the token-policy block)
- Modify: `src/engine/types.ts`
- Test: `src/engine/state-console.gatewayFlags.test.ts`

**Interfaces:**
- Produces: `CC.gatewayFlags(): {routing: boolean, caching: boolean}`; `CC.setGatewayFlag(key: 'routing'|'caching', on: boolean): boolean`. Mutation emits an event and registers undo exactly the way `setTokenPolicy` does (copy its undo-registration pattern verbatim from the file). Both flags start `false` — the Cost tab's warning state is the seeded truth.

- [ ] **Step 1: Failing test**

```ts
// src/engine/state-console.gatewayFlags.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from './state';

describe('gateway optimization flags', () => {
  it('start off, flip on, and undo restores', () => {
    expect(CC.gatewayFlags()).toEqual({ routing: false, caching: false });
    CC.setGatewayFlag('routing', true);
    expect(CC.gatewayFlags().routing).toBe(true);
    CC.undo();
    expect(CC.gatewayFlags().routing).toBe(false);
  });
});
```

- [ ] **Step 2:** Run → FAIL (`gatewayFlags` is not a function).
- [ ] **Step 3:** Implement in `state-console.ts` mirroring `setTokenPolicy`'s event+undo pattern; store on `_` so share/undo plumbing can reach it: `_.gatewayFlags={routing:false,caching:false}`.
- [ ] **Step 4:** Run → PASS. Type both methods in `types.ts`. `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(engine): gateway routing/caching flags, undoable`

---

### Task 3: Derivations — KPIs, request rows, filters

**Files:**
- Create: `src/features/ai-fabric/insights/insightsFigures.ts`
- Test: `src/features/ai-fabric/insights/insightsFigures.test.ts`

**Interfaces:**
- Consumes: `CC.decisionLog()` (Task 1 shape), `aiSpendTotals`, `aiSpendRows`, `tagModelMap`, `fmtTokens`, `fmtUsd`, `routeLabel` from `../aiSpend`, `CC.modelCatalog()`, `CC.modelLatencySeries(id, n)`.
- Produces:

```ts
export interface InsightKpi { key: string; title: string; value: string; unit?: string;
  sub: string; subTone: 'neutral' | 'savings'; }
export function insightKpis(cc: CloudControl): InsightKpi[];
// exactly 5, keys: 'tokens' | 'cost' | 'ttft' | 'requests' | 'blocked'

export interface InsightRequestRow {
  id: string;            // `${ts}-${i}` stable within a snapshot
  time: string;          // HH:MM:SS via toLocaleTimeString('en-US',{hour12:false})
  status: number;        // 200 allowed, 403 denied
  ok: boolean;
  identity: string;      // tag
  model: string;         // model display name
  provider: string;      // CoreWeave | Nebius | OpenAI (external)
  route: string;         // routeLabel(path)
  tokens: number;
  cost: number;          // tokens/1e6 * price
  costSaved: number;     // tokens/1e6 * (externalPrice - price), floor 0
  ttftMs: number;
  reason: string | null;
}
export function requestRows(cc: CloudControl): InsightRequestRow[]; // newest first

export interface RequestFilters { q: string; provider: string; model: string;
  identity: string; path: string; status: string; }  // 'all' = no constraint
export const EMPTY_FILTERS: RequestFilters;
export function filterOptions(rows: InsightRequestRow[]):
  { provider: string[]; model: string[]; identity: string[]; path: string[]; status: string[] };
export function applyFilters(rows: InsightRequestRow[], f: RequestFilters): InsightRequestRow[];
export function activeChips(f: RequestFilters):
  { key: keyof RequestFilters; label: string; value: string }[];
```

KPI derivations (each states the same figure its sibling screens state):
1. `tokens` — `fmtTokens(totals.tokensToday)`, sub `"{governed} governed · {ungoverned} public"` (both `fmtTokens`), tone neutral.
2. `cost` — `fmtUsd(totals.spendToday)`, sub `Savings ${fmtUsd(totals.savings)}` + percent of `spendIfExternal` when `statesRealMoney(totals.savings)`, tone savings; otherwise sub `'/today'` neutral.
3. `ttft` — P95 over `modelCatalog()` × `modelLatencySeries` (move `percentile95` here from `aiBinding` logic, population = full catalog exactly as `aiBinding.buildKpis` documents), unit `'ms'`, sub `P95 across {n} models`.
4. `requests` — `decisionLog().length`, sub `'total today'`.
5. `blocked` — denied count, sub `"{n} policy denials"` (that is what the engine's denials are; there is no "token invalidation" in this estate).

Request rows come from `decisionLog()` entries that carry a `tag` (skip legacy detail-less entries), priced via `tagModelMap`+`modelCatalog`; denied rows show the model they asked for and cost 0.

- [ ] **Step 1:** Write tests: KPI count/keys; cost KPI equals `aiSpendTotals` figures; a driven `CC.promptTrace('rd-helion','helion-70b','x')` appears as the first row with status 200, provider `CoreWeave`, `costSaved > 0`; a driven denial rows in as 403 with `cost === 0` and its reason; `applyFilters` narrows by each key and by `q` against identity+model; `activeChips` skips `'all'` and empty `q`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** — `feat(insights): KPI and request-log derivations`

---

### Task 4: Derivation — the Sankey model

**Files:**
- Create: `src/features/ai-fabric/insights/sankeyModel.ts`
- Test: `src/features/ai-fabric/insights/sankeyModel.test.ts`

**Interfaces:**
- Consumes: `aiSpendRows(cc)`, `CC.modelRoutes()`, `CC.modelCatalog()`.
- Produces:

```ts
export interface SankeyNode { id: string; col: 0|1|2|3; label: string; value: number; // $ spendToday
  color: string; }
export interface SankeyPath { id: string; // the identity tag — one path per identity
  nodes: [string, string, string, string]; // node ids hop by hop
  value: number; cost: number; saved: number;
  hops: { identity: string; source: string; route: string; provider: string }; }
export interface SankeyGraph { nodes: SankeyNode[]; paths: SankeyPath[];
  columns: { title: string; subtitle: string }[]; totalValue: number; }
export function sankeyGraph(cc: CloudControl): SankeyGraph;
```

Column semantics from OUR estate (the Figma's hops, our nouns):
- Col 0 **Identity** (`User / Agent`): one node per metered tag, value `spendToday`.
- Col 1 **Source** (`Model endpoint`): `modelRoutes().endpoint` for that tag.
- Col 2 **Fabric route** (`Egress path`): `routeLabel(path)` — at most 3 nodes.
- Col 3 **Provider / model** (`Destination`): `"{provider}/{modelName}"` where provider maps `cloud` `cw→CoreWeave`, `neb→Nebius`, `null→OpenAI (external)`.
Node value = sum of the spend of paths through it. Colors: cols 0-2 all `#0074b3`; col 3 by provider — CoreWeave `#009fdb`, Nebius `#00388f`, OpenAI `#00c9ff`, further providers in order `#49eedc`, `#5b3bee`. `saved` per path = `spendIfExternal - spendToday` floored at 0. When every identity's spend is 0 (nothing metered yet), `value` falls back to `tokensToday`; if that is also all-zero, fall back to `budgetTokens` so the seeded estate still draws its shape — and `totalValue` carries which basis was used via `basis: 'spend' | 'tokens' | 'budget'` added to `SankeyGraph`, so the UI can title the values honestly (`$` only when basis is spend).

- [ ] **Step 1:** Tests: 3 identity paths on the seeded engine; node values equal the sum of member path values; every path's 4 node ids exist; column count 4; basis reflects the estate (drive `CC.promptTrace` first to force `spend` basis and assert `$` values match `aiSpendRows().spendToday`).
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(insights): sankey graph derivation, one path per identity`

---

### Task 5: Derivation — cost figures

**Files:**
- Create: `src/features/ai-fabric/insights/costFigures.ts`
- Test: `src/features/ai-fabric/insights/costFigures.test.ts`

**Interfaces:**
- Consumes: `aiSpendRows/Totals`, `CC.tokenPolicyList()`, `CC.tokenSeries(tag,n)`, `CC.gatewayFlags()`, `CC.setGatewayFlag` (UI actions), `EXTERNAL_MODEL_ID` price from catalog.
- Produces:

```ts
export const CACHE_HIT_RATE = 0.35; // stated in the card copy, single source

export interface CostCardState { achieved: boolean; } // gatewayFlags drive this
export interface RoutingCard extends CostCardState {
  currentMonthly: number;   // spendIfExternal * 30
  routedMonthly: number;    // spendToday * 30
  savingMonthly: number; }
export interface CachingCard extends CostCardState {
  perModel: { model: string; monthly: number; cachedMonthly: number }[];
  savingMonthly: number; }  // sum(monthly) * CACHE_HIT_RATE
export interface BudgetTrack {
  budgetMonthly: number;    // Σ (budgetTokens/1e6 * price) * 30 over metered rows
  spentSeries: number[];    // cumulative $ from tokenSeries × price, 24 pts
  predictedMonthly: number; // last-cumulative / points * 30 days-equivalent
  overBudget: boolean; }
export interface TeamCard { tag: string; spendToday: number; vsAvgPct: number;
  driver: string;           // its model name
  budgetPct: number; }
export interface ProviderShare { provider: string; color: string; spend: number; pct: number; }
export function routingCard(cc: CloudControl): RoutingCard;
export function cachingCard(cc: CloudControl): CachingCard;
export function budgetTrack(cc: CloudControl): BudgetTrack;
export function teamCards(cc: CloudControl): TeamCard[];   // sorted by spend desc
export function providerShare(cc: CloudControl): ProviderShare[];
```

`achieved` = the relevant `gatewayFlags()` flag. All money through `fmtUsd` at render time, not here — these return numbers.

- [ ] **Step 1:** Tests: routing saving = `spendIfExternal*30 - spendToday*30` (drive a trace first so spend is non-zero); caching saving = 35% of routed monthly; `budgetTrack.overBudget` false on seeded estate; provider share percentages sum to 100 (±1 rounding) when spend exists; `teamCards` sorted; flags flip `achieved`.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(insights): cost tab derivations`

---

### Task 6: TrafficSankey component (delegated-agent friendly, self-contained)

**Files:**
- Create: `src/features/ai-fabric/insights/TrafficSankey.tsx`
- Test: `src/features/ai-fabric/insights/TrafficSankey.test.tsx`

**Interfaces:**
- Consumes: `sankeyGraph(cc)` via prop `graph: SankeyGraph` (pure component, no CC).
- Produces: `<TrafficSankey graph={graph} />`. Test ids: `sankey`, `sankey-node-{id}`, `sankey-ribbon-{pathId}`, `sankey-tooltip`.

Rendering spec (from the pixel doc, section 4):
- Card: white, `border-fw-secondary`, radius 16. Title row: `Traffic flow` bold 16, legend chips right (8px square swatch radius 2 + provider name, one per col-3 provider actually present).
- SVG `viewBox="0 0 1417 400"` width 100% height auto. Four node columns at x 0 / 467 / 934 / 1400; bar width 16; each column stacks its nodes proportionally to value with 16px gaps, total height 400. Bar fill = node color. Label right of bar (left of bar for col 3): name 12px `fill-fw-body`, value 12px medium `#13171b` (`$` formatting only when `graph.basis === 'spend'`, else `fmtTokens`).
- Ribbons: for each path, one cubic-bezier band per hop pair, drawn node-edge to node-edge. Band thickness at a node ∝ path value share of that node; stack offsets in path order so bands never overlap at a node. Path `d`: `M x0,y0t C xm,y0t xm,y1t x1,y1t L x1,y1b C xm,y1b xm,y0b x0,y0b Z` with `xm = (x0+x1)/2`. Default fill `#0074b3` at `fillOpacity 0.10`; selected path all three bands `#00c9ff` at `0.85`.
- Interaction: click (or Enter — each ribbon gets `tabIndex=0`, `role="button"`, `aria-label` naming the four hops) selects a path; clicking again clears. Hover/selection shows the tooltip card: `Event path` + `Cost {fmtUsd}` + green `Saved {fmtUsd}` (Saved only when `statesRealMoney`), then the four hops labelled Identity / Source / Fabric route / Provider and model. Tooltip is HTML positioned inside the card (absolute, near the pointer, clamped), `data-testid="sankey-tooltip"`.

- [ ] **Step 1:** Tests (jsdom): renders one ribbon per graph path and one node per graph node; clicking `sankey-ribbon-{id}` shows the tooltip naming that path's identity and provider; selected ribbon has `fill="#00c9ff"`; tooltip omits `Saved` when saved is 0.
  Build a small literal `SankeyGraph` fixture in the test file (2 paths, shared route node) rather than driving CC — this component is pure.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(insights): traffic-flow sankey with generated ribbons`

---

### Task 7: KPI strip, filter bar, requests table

**Files:**
- Create: `KpiStrip.tsx`, `RequestsFilterBar.tsx`, `RequestsTable.tsx` in `src/features/ai-fabric/insights/`
- Test: `src/features/ai-fabric/insights/RequestsPanel.test.tsx`

**Interfaces:**
- `<KpiStrip kpis={InsightKpi[]} />` — 5-up row (grid, 16px gap, wraps 2-up under lg), card radius 16, title 14 medium, value 36 bold (`unit` 20 bold beside it), sub 12 (`subTone==='savings'` renders `text-[#2d7e24]` medium). Test id `kpi-{key}`.
- `<RequestsFilterBar rows filters onChange />` — search input (placeholder `Search identity, model...`), five labelled selects (Provider, Model, Identity, Path, Status) fed by `filterOptions(rows)` with an `All` first option, chip row via `activeChips` (chip: accent `#f2fafd` pill, prefix span `text-[#0074b3]`, × button clears that key), `Clear all` ghost button (`text-fw-ctaPrimaryHover`) when any chip. Test ids `req-search`, `req-filter-{key}`, `req-chip-{key}`, `req-clear-all`.
- `<RequestsTable rows />` — columns: Time, Status, Identity, Model, Route, Tokens, Cost, Cost savings, TTFT, Reason. (Our estate has no Source site / body sizes / total time; 10 honest columns beat 15 with 5 invented.) Header row: wash bg, bold 14, bottom border. Row h-14, divider borders only. Status: pill with 8px dot, green `#2d7e24` + `200` for ok, red `#c70032` + `403` denied. Cost savings cell: both lines green (`fmtUsd(costSaved)` + percent of what external would have cost). Tokens: `fmtTokens`. Section header `Requests ({n})`. Empty state when no rows: `No requests yet. Agents issue traced requests every few seconds, so this table fills on its own.` Test ids `requests-table`, `req-row-{id}`.

- [ ] **Step 1:** Tests: KpiStrip renders 5 cards from `insightKpis(CC)`; a driven `promptTrace` row renders with green savings cell and 200 pill; a denial renders 403 with its reason; typing in `req-search` narrows rows (wrap the three in a tiny harness component holding filter state); chip × clears one filter, `req-clear-all` clears all.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(insights): kpi strip, filter bar, requests table`

---

### Task 8: Performance, Cost, Security tabs

**Files:**
- Create: `PerformanceTab.tsx`, `CostTab.tsx`, `SecurityTab.tsx`
- Test: `src/features/ai-fabric/insights/CostTab.test.tsx`

**Interfaces:**
- `<PerformanceTab />` (reads CC live via `useCloudControlLive`): 
  - Incident strip: derive from `CC.modelLatencySeries` — for each catalog model whose max series point ≥ 1.5× its median, one incident card: model name, peak ms vs P50, driver sentence naming the route it rides (`routeLabel`), actions `Ask Andi` (dispatches the existing `cc-andi-toggle` event) and, when `CC.undoAvailable?.()` or the undo stack is non-empty, `Rollback` → `CC.undo()`. If no model qualifies, render the quiet state: `No latency incidents in this window.`
  - Latency-routing savings card: Direct vs With-routing bars — direct = external model p50 (`gpt-class`), routed = spend-weighted p50 across metered models; deltas stated as percentages.
  - `providerShare` stacked bar (reuse Task 5 derivation).
- `<CostTab />`: routing card + caching card (each: value row, bar pair or per-model bars, then footer — warning state: amber-tinted footer `Routing policy not configured` / `Caching disabled` with CTA button `Set policy` / `Enable caching` calling `CC.setGatewayFlag(key,true)`; achieved state: green footer `AI Gateway routing is on. {fmtUsd(saving)} per month stays in budget.` style with the flag on). Budget tracking card: SVG polyline of `spentSeries` + budget line + predicted marker, `Add policy` link → `/ai/govern` when `overBudget`. Team cards grid from `teamCards` (spend, vs-avg %, driver model, `Update limits` → `/ai/teams`, `Ask Andi` button). Provider share card. Test ids: `cost-routing`, `cost-caching`, `cost-budget`, `cost-team-{tag}`, `cost-flag-{key}`.
- `<SecurityTab />`: blocked-requests summary strip derived from `requestRows` (denied count, which identities, which reasons) + the existing `<PromptTrace />` above `<GovernanceDecisions />` (that order is load-bearing; see AiObservePage's old comment — preserve it and the comment).

- [ ] **Step 1:** CostTab tests: warning footers + CTAs render with flags off; clicking `cost-flag-routing` flips the engine flag and the footer goes achieved (restore with `CC.undo()` in `afterEach`); budget card renders a polyline; team cards sorted by spend.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(insights): performance, cost and security tabs`

---

### Task 9: InsightsPage assembly + route/nav sweep

**Files:**
- Create: `InsightsPage.tsx`; Test: `InsightsPage.test.tsx`
- Modify: `AiObservePage.tsx` (render InsightsPage inside `AiDomainPage`, verb stays `Observe`, description updated to name Insights)
- Modify: `src/components/navigation/navItems.ts` (remove interim Connect/Cost rail items + their comment)
- Modify: `src/App.tsx` (`/ai/connect` → `<Navigate to="/ai/providers" replace />`; `/ai/cost` → `<Navigate to="/ai/observe?tab=cost" replace />`)
- Modify: `tests/e2e/helpers.ts` `openLayerVerb` AI mappings (Observe→Insights stays; Connect→Providers; Cost→Insights then tab)
- Modify: `e2e/mobile-nav.spec.ts` fold count (AI loses 2 destinations), any spec touching `/ai/connect` or `/ai/cost` directly, `andiBrain` navigate targets if any point at the removed routes (grep `'/ai/connect'`, `'/ai/cost'` across `src/` and `e2e/`).

**Interfaces:**
- `InsightsPage` reads `?tab=` via `useSearchParams` (`performance` default, `cost`, `security`), renders: inner header row (title `Insights`, right: `Updated {n}s ago` live from the last engine tick, range chip `Last 24h` — the only window the engine derives, disabled with `title="The engine derives one 24h window"`, and the segmented Tokens/Requests/Cost toggle driving which unit the KPI strip emphasizes first) → `KpiStrip` → tab bar (`tab-performance`, `tab-cost`, `tab-security`) → active tab → `TrafficSankey` (performance tab only, above the incident strip) → filter bar + requests table (all tabs, below).
- Setting a tab writes `?tab=`, so `/ai/cost`'s redirect deep-links correctly.

- [ ] **Step 1:** InsightsPage tests: renders KPI strip + tab bar; `?tab=cost` opens Cost; switching tabs updates the URL; requests table present on every tab. Nav tests: `railSectionsFor(ai)` no longer lists Connect/Cost (update `LeftRail.test.tsx` expected hrefs to `['/ai/home','/ai/observe','/ai/govern','/ai/teams','/ai/providers','/ai/keys']`); MobileMenu duplicate-label logic still passes (Cost is now unique to NaaS, so its NaaS drawer item renders compact — the generalized test already handles this, just re-run it).
- [ ] **Step 2:** FAIL → **Step 3:** implement + sweep → **Step 4:** `npx vitest run` full, PASS; `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** — `feat(insights): assemble the page; Connect folds into Providers, Cost into the Cost tab`

---

### Task 10: E2e + full verification + deploy

**Files:**
- Create: `e2e/insights.spec.ts`
- Modify: any red specs surfaced by the sweep

- [ ] **Step 1:** Write `e2e/insights.spec.ts`:
  - boots `/ai/observe`: 5 KPI cards, sankey with ≥3 ribbons, requests empty-or-filling state.
  - drives `page.evaluate(() => (window as any).CC.promptTrace('rd-helion','helion-70b','e2e'))`, expects a 200 row to appear and the Requests KPI to increment.
  - clicks a sankey ribbon → tooltip names the identity; presses Escape/again → clears.
  - filters: picks a Provider, chip appears, row set narrows, Clear all restores.
  - Cost tab: warning footer visible; `cost-flag-caching` click → achieved footer; reload → still achieved (engine state), then `CC.undo()` via evaluate → warning again.
  - `/ai/cost` redirects to the Cost tab; `/ai/connect` redirects to `/ai/providers`.
  - axe pass on the page (match the pattern in `mvp-screens.spec.ts`).
- [ ] **Step 2:** Full verify with honest logging:
```bash
npx vitest run > "$S/p3-unit.log" 2>&1; U=$?
npm run build   > "$S/p3-build.log" 2>&1; B=$?
npx playwright test > "$S/p3-e2e.log" 2>&1; E=$?
echo "unit=$U build=$B e2e=$E"
```
  All three must be 0 (re-run a lone failing spec in isolation before calling it flake, and say so in the report).
- [ ] **Step 3:** Browser walk as a user on localhost: open Insights, watch a request row arrive on the agent cadence, flip caching, undo, screenshot each.
- [ ] **Step 4:** Commit remaining work, push main, deploy (Actions workflow), wait for the new bundle hash, walk the LIVE site the same way, screenshot proof.
- [ ] **Step 5:** Report with screenshots + the honest numbers.

## Self-Review

- **Spec coverage:** KPI row (T3/T7) ✓; Sankey generated ribbons + tooltip + selection (T4/T6) ✓; requests table + savings columns + filters + chips (T3/T7) ✓; Performance incident strip + Rollback + latency savings (T8) ✓; Cost both states + budget line + team cards + provider share (T5/T8) ✓; Security (T8) ✓; inner header Updated/range/toggle (T9) ✓; rail cleanup + redirects, no orphaned routes (T9) ✓. Deliberate deviations, stated: 10 request columns not 15 (no Source-site/body-size/total-time facts in the engine — invented columns would break engine honesty); KPI card 5 sub names policy denials only (no token-invalidation concept); Sankey col 1 is the model endpoint, not an ingress site (that is what our estate's hop 2 truly is). Dark theme and Andi motion states stay out of scope per the assessment.
- **Placeholder scan:** none.
- **Type consistency:** `SankeyGraph.basis` added in T4 and consumed in T6; `InsightRequestRow` produced T3, consumed T7/T8(Security)/T10; `gatewayFlags` produced T2, consumed T5/T8.
