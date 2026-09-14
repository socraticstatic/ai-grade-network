# Request Deep Dive + Discover Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** /ai/observe leads with a request-analysis deep dive (verdict, click-to-filter facets, outliers) with the raw log demoted behind a disclosure; Discover gains estate filter chips scoping tree and map, opens at cloud rollups, and compresses its stat sections into one summary band. Spec: docs/superpowers/specs/2026-08-07-request-deep-dive-discover-filters-design.md.

**Architecture:** Two pure modules + two components per surface, following the figures/component split the codebase already uses. `requestAnalysis.ts` + `RequestDeepDive.tsx` beside `insightsFigures.ts`; `estateFilters.ts` + `EstateFilterChips.tsx` in `src/features/discover/`. Existing `RequestFilters`/`RequestsFilterBar`/`RequestsTable`/`RequestDrawer` and the tree/map components are consumed, not rewritten.

**Tech Stack:** React 18 + TypeScript, VizKit (`CategoryBars`, `VIZ_HEX`), Vitest + @testing-library/react.

**Ground truth (verified this session):**
- The flat list: `InsightsPage.tsx:151-152` renders `<RequestsFilterBar rows={view.rows} filters={filters} onChange={setFilters} />` then `<RequestsTable rows={visibleRows} />` unconditionally below the tabs. `filters`/`setFilters` state and `visibleRows` (via `applyFilters`) already exist in InsightsPage.
- Row shape: `InsightRequestRow` (`insightsFigures.ts:114-131`): `{ id, ts, time, status, ok, identity, model, provider, route, tokens, cost, costSaved, savedPct, ttftMs, reason }`. `RequestFilters` (`:228-236`): `{ q, provider, model, identity, path, status }` with `EMPTY_FILTERS` (`:237`). The `path` filter values are how the app names fabric vs public routes - read `applyFilters` (`:258`) and `filterOptions` (`:248`) to reuse their exact value vocabulary for facet clicks.
- `RequestDrawer` opens per-row from RequestsTable; it takes the row (see `RequestsTable.tsx:9,45` usage).
- Discover: `UnifiedDiscovery.tsx:379` `const [open, setOpen] = useState<ReadonlySet<string>>(new Set(['aws']))` (the default-expanded cloud); `:381` view toggle; the three stat sections render inside the `domains.map` block (moved below the tree in the P2 reorder); `AttachmentMap.tsx` draws the map from its own model derivation.
- Money formatting: `fmtUsd`/`fmtTokens` from `../aiSpend`.

## Global Constraints

- All standing guards hold: `src/__tests__/vocabulary.test.ts` (acronyms glossed, savings-first, spine dirs incl. discover), `no-horizontal-scroll.test.ts` (no overflow-x-auto in spine feature dirs), `vizkit-deps.test.ts` (no chart libs under src/features). New copy: no em dashes, savings-first.
- Verdict/aggregate text comes from pure selectors; components only render.
- Colors from `VIZ_HEX` / existing Tailwind fw-* tokens; facet bars use `CategoryBars` from `src/components/viz/kit`.
- Existing testids and tests survive: `unit-*`, `tab-*`, KpiStrip, RequestsTable/FilterBar/Drawer tests, discover tree/map testids, tour anchors (`src/features/tour` suite must stay green).
- ANDI drafts nothing here; no engine mutations - both features are read-only views over existing state.
- Test commands `npx vitest run <path>`; commits end with trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: requestAnalysis module (pure)

**Files:**
- Create: `src/features/ai-fabric/insights/requestAnalysis.ts`
- Test: `src/features/ai-fabric/insights/requestAnalysis.test.ts`

**Interfaces:**
- Consumes: `InsightRequestRow`, `RequestFilters` field vocabulary from `./insightsFigures` (import the types; reuse the exact `path`/`status` filter values `applyFilters` recognizes).
- Produces:
  - `export interface FacetBucket { label: string; value: number; filterKey: keyof RequestFilters; filterValue: string }`
  - `export interface RequestFacet { id: 'identity' | 'model' | 'route' | 'outcome'; title: string; buckets: FacetBucket[] }`
  - `export interface RequestOutlier { row: InsightRequestRow; kind: 'cost' | 'slow' }`
  - `export function requestVerdict(rows: InsightRequestRow[]): string` - e.g. `'59 requests today: 40 allowed, 19 guardrailed, 0 denied. $208.72 spent, $291.53 saved.'` The allowed/guardrailed/denied split derives from `ok` + `reason` the same way SecurityTab/GovernanceDecisions classify decisions - read `GovernanceDecisions.tsx:51-56` and mirror its predicate exactly (allowed = ok && no guardrail reason; guardrailed = ok with reason; denied = !ok). Spend = sum(cost), saved = sum(costSaved), formatted with `fmtUsd`. Empty rows: `'No requests traced yet. Run a trace to populate this view.'`
  - `export function requestFacets(rows: InsightRequestRow[]): RequestFacet[]` - four facets; buckets sorted by value desc; identity/model capped at top 6 with a final `'Other'` bucket (filterValue `''` marks it unclickable); route buckets map to the `path` filter's real values; outcome buckets map to the `status` filter's real values.
  - `export function requestOutliers(rows: InsightRequestRow[]): { cost: RequestOutlier[]; slow: RequestOutlier[] }` - top 5 by `cost` desc and top 5 by `ttftMs` desc, stable tie-break by `ts` desc.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/ai-fabric/insights/requestAnalysis.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../../engine';
import { requestRows } from './insightsFigures';
import { requestVerdict, requestFacets, requestOutliers } from './requestAnalysis';

const rows = requestRows(CC);

describe('requestVerdict', () => {
  it('states count, outcome split, spend and savings in one sentence pair', () => {
    const v = requestVerdict(rows);
    expect(v).toMatch(new RegExp(`^${rows.length} requests today: \\d+ allowed, \\d+ guardrailed, \\d+ denied\\.`));
    expect(v).toMatch(/\$[\d,.]+ spent, \$[\d,.]+ saved\.$/);
  });
  it('empty rows return a sentence, not silence', () => {
    expect(requestVerdict([])).toBe('No requests traced yet. Run a trace to populate this view.');
  });
});

describe('requestFacets', () => {
  it('returns the four facets with desc-sorted buckets whose values sum to the row count', () => {
    const facets = requestFacets(rows);
    expect(facets.map(f => f.id)).toEqual(['identity', 'model', 'route', 'outcome']);
    for (const f of facets) {
      const values = f.buckets.map(b => b.value);
      expect([...values].sort((a, b) => b - a)).toEqual(values);
      expect(values.reduce((s, v) => s + v, 0)).toBe(rows.length);
    }
  });
  it('facet buckets carry the filter vocabulary applyFilters understands', () => {
    const route = requestFacets(rows).find(f => f.id === 'route')!;
    for (const b of route.buckets) expect(b.filterKey).toBe('path');
  });
});

describe('requestOutliers', () => {
  it('top five by cost and by slowness, descending', () => {
    const { cost, slow } = requestOutliers(rows);
    expect(cost.length).toBeLessThanOrEqual(5);
    expect(slow.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < cost.length; i++) expect(cost[i].row.cost).toBeLessThanOrEqual(cost[i - 1].row.cost);
    for (let i = 1; i < slow.length; i++) expect(slow[i].row.ttftMs).toBeLessThanOrEqual(slow[i - 1].row.ttftMs);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** - `npx vitest run src/features/ai-fabric/insights/requestAnalysis.test.ts` - FAIL, unresolved import.

- [ ] **Step 3: Implement** the module per the Produces contract. Derivation rules that bind: outcome classification mirrors GovernanceDecisions' predicate; route buckets use the same labels/values `filterOptions`/`applyFilters` use for `path`; every derived sentence uses `fmtUsd`; no em dashes.

- [ ] **Step 4: Run test to verify it passes.**

- [ ] **Step 5: Commit** - `feat(ai-fabric): requestAnalysis - the day's requests as verdict, facets, outliers`

---

### Task 2: RequestDeepDive component + InsightsPage swap

**Files:**
- Create: `src/features/ai-fabric/insights/RequestDeepDive.tsx`
- Test: `src/features/ai-fabric/insights/RequestDeepDive.test.tsx`
- Modify: `src/features/ai-fabric/insights/InsightsPage.tsx:151-152`

**Interfaces:**
- Consumes: Task 1's module; `CategoryBars` + `VIZ_HEX` from `src/components/viz/kit`; `RequestDrawer`; `RequestsFilterBar`/`RequestsTable` (moved inside the disclosure); InsightsPage's existing `filters`/`setFilters`/`visibleRows`/`view.rows`.
- Produces: `export function RequestDeepDive({ rows, filters, onFiltersChange }: { rows: InsightRequestRow[]; filters: RequestFilters; onFiltersChange: (f: RequestFilters) => void })` rendering:
  - `<p data-testid="requests-verdict">` with `requestVerdict(rows)`,
  - one `CategoryBars` per facet (`aria-label` = facet title) where each bucket row is wrapped in a real `<button data-testid={'facet-' + facet.id + '-' + bucket.filterValue}>`; clicking sets `onFiltersChange({ ...filters, [filterKey]: filterValue })`, clicking the active one resets that key to `'all'`; the active bucket's button has `aria-pressed="true"`. (If wrapping CategoryBars rows in buttons fights its markup, render facet rows as your own buttons styled like CategoryBars rows and use CategoryBars only where non-interactive - state the choice in the report.)
  - outlier lists (`data-testid="outliers-cost"`, `data-testid="outliers-slow"`): five rows each showing time, identity, model, and the headline number (cost via fmtUsd / TTFT ms); clicking a row opens `RequestDrawer` for it.

  In `InsightsPage.tsx`, replace lines 151-152 with the deep dive over ALL rows plus the disclosure over the filtered rows:

```tsx
      <RequestDeepDive rows={view.rows} filters={filters} onFiltersChange={setFilters} />
      <details data-testid="raw-log">
        <summary className="cursor-pointer text-figma-sm font-medium text-fw-link">Show the raw log</summary>
        <div className="mt-3 space-y-3">
          <RequestsFilterBar rows={view.rows} filters={filters} onChange={setFilters} />
          <RequestsTable rows={visibleRows} />
        </div>
      </details>
```

- [ ] **Step 1: Write the failing test** - render `RequestDeepDive` with `requestRows(CC)`, `EMPTY_FILTERS`, and a spy: assert the verdict testid text matches `requestVerdict`; clicking a model facet button calls the spy with that model set; clicking an outlier row opens the drawer (drawer heading visible); with the spy-fed active filter, that button is `aria-pressed`.

```tsx
// src/features/ai-fabric/insights/RequestDeepDive.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CC } from '../../../engine';
import { requestRows, EMPTY_FILTERS } from './insightsFigures';
import { requestVerdict, requestFacets } from './requestAnalysis';
import { RequestDeepDive } from './RequestDeepDive';

const rows = requestRows(CC);

describe('RequestDeepDive', () => {
  it('opens with the requests verdict', () => {
    render(<RequestDeepDive rows={rows} filters={EMPTY_FILTERS} onFiltersChange={() => {}} />);
    expect(screen.getByTestId('requests-verdict').textContent).toBe(requestVerdict(rows));
  });
  it('clicking a facet bucket applies that filter; clicking it again clears it', () => {
    const spy = vi.fn();
    const model = requestFacets(rows).find(f => f.id === 'model')!.buckets[0];
    const { rerender } = render(<RequestDeepDive rows={rows} filters={EMPTY_FILTERS} onFiltersChange={spy} />);
    fireEvent.click(screen.getByTestId(`facet-model-${model.filterValue}`));
    expect(spy).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, model: model.filterValue });
    rerender(<RequestDeepDive rows={rows} filters={{ ...EMPTY_FILTERS, model: model.filterValue }} onFiltersChange={spy} />);
    const active = screen.getByTestId(`facet-model-${model.filterValue}`);
    expect(active).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(active);
    expect(spy).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, model: 'all' });
  });
  it('outlier lists render at most five rows each and open the drawer', () => {
    render(<RequestDeepDive rows={rows} filters={EMPTY_FILTERS} onFiltersChange={() => {}} />);
    const cost = screen.getByTestId('outliers-cost');
    expect(cost.querySelectorAll('[data-testid^="outlier-row-"]').length).toBeLessThanOrEqual(5);
    fireEvent.click(cost.querySelector('[data-testid^="outlier-row-"]')!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

(Adapt the drawer assertion to RequestDrawer's real container role/testid - read `RequestDrawer.tsx` and use whatever RequestsTable's own test asserts.)

- [ ] **Step 2: FAIL run.** - [ ] **Step 3: Implement component + page swap.** - [ ] **Step 4:** `npx vitest run src/features/ai-fabric` - PASS; if `RequestsPanel.test.tsx` asserts the table renders by default, update it to open the `raw-log` disclosure first and note it in the report; nothing else edited. - [ ] **Step 5: Commit** - `feat(ai-fabric): the request log becomes a deep dive - verdict, facets, outliers, log on demand`

---

### Task 3: estateFilters module + chips on Discover

**Files:**
- Create: `src/features/discover/estateFilters.ts`, `src/features/discover/EstateFilterChips.tsx`
- Test: `src/features/discover/estateFilters.test.ts`
- Modify: `src/features/discover/UnifiedDiscovery.tsx` (chips under the Tree/Map toggle; thread filters into tree + map; default rollup)
- Modify: `src/features/discover/AttachmentMap.tsx` (accept optional filter, dim non-matching regions)
- Test: `src/features/discover/UnifiedDiscovery.viewToggle.test.tsx` (append)

**Interfaces:**
- Consumes: `FabricModel`/`FabricRegion` from `../connect/FabricHero`; the tree's cloud grouping (UnifiedDiscovery's existing derivations).
- Produces:
  - `export interface EstateFilters { cloud: string | 'all'; path: 'private' | 'public' | 'all'; domain: 'network' | 'ai' | 'all' }`
  - `export const EMPTY_ESTATE_FILTERS: EstateFilters`
  - `export function regionMatches(r: FabricRegion, f: EstateFilters): boolean` - cloud matches `r.cloudId`; path matches `r.path`; domain: `'ai'` matches the AI/GPU clouds (`cw`, `neb` - the ids `providerName` special-cases), `'network'` matches the rest.
  - `export function EstateFilterChips({ model, filters, onChange }: { model: FabricModel; filters: EstateFilters; onChange: (f: EstateFilters) => void })` - one chip per cloud present in the model (label = cloudName), plus `On the fabric`, `Public internet`, `Network`, `AI`; toggle semantics (click active → back to 'all'); active chips `aria-pressed="true"`; a `Clear filters` chip renders only when any filter is non-'all'; container `data-testid="estate-filter-chips"`.

- [ ] **Step 1: Failing module test** - `regionMatches` truth table over the seeded model (a `cw` region matches domain 'ai' and not 'network'; path/cloud combinations AND together; EMPTY matches everything).

```ts
// src/features/discover/estateFilters.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { regionMatches, EMPTY_ESTATE_FILTERS } from './estateFilters';
import type { FabricModel } from '../connect/FabricHero';

const model = CC.fabricModel() as FabricModel;

describe('regionMatches', () => {
  it('empty filters match every region', () => {
    expect(model.regions.every(r => regionMatches(r, EMPTY_ESTATE_FILTERS))).toBe(true);
  });
  it('cloud, path and domain narrow conjunctively', () => {
    const cw = model.regions.find(r => r.cloudId === 'cw')!;
    expect(regionMatches(cw, { ...EMPTY_ESTATE_FILTERS, domain: 'ai' })).toBe(true);
    expect(regionMatches(cw, { ...EMPTY_ESTATE_FILTERS, domain: 'network' })).toBe(false);
    expect(regionMatches(cw, { ...EMPTY_ESTATE_FILTERS, cloud: 'aws' })).toBe(false);
    expect(regionMatches(cw, { cloud: 'cw', path: cw.path, domain: 'ai' })).toBe(true);
  });
});
```

- [ ] **Step 2: FAIL run.** - [ ] **Step 3: Implement module + chips.**
- [ ] **Step 4: Wire UnifiedDiscovery.** Add `const [estateFilters, setEstateFilters] = useState(EMPTY_ESTATE_FILTERS);` render `<EstateFilterChips>` directly under the Tree/Map toggle row; tree cloud groups and their regions/VPCs hide when no region of that cloud matches (`regionMatches` against the group's regions); the map gets `filters={estateFilters}`. Change the rollup default: `useState<ReadonlySet<string>>(new Set(['aws']))` at line 379 → `useState<ReadonlySet<string>>(new Set())`. In `AttachmentMap.tsx` accept optional `filters` and render non-matching region rows at `opacity 0.25` with their edges dashed-dimmed (do not remove them - the map keeps its geometry, filtering reads as focus). If a tree test asserts aws starts expanded, update only that assertion and report it.
- [ ] **Step 5: Append the interaction test** to `UnifiedDiscovery.viewToggle.test.tsx` (file's existing render idiom): clicking the `Public internet` chip leaves only groups containing public regions visible and marks the chip pressed; clicking `Clear filters` restores all groups; the tree starts with zero expanded clouds (collapsed rollups).
- [ ] **Step 6:** `npx vitest run src/features/discover src/features/tour src/__tests__/vocabulary.test.ts src/__tests__/no-horizontal-scroll.test.ts` - PASS. - [ ] **Step 7: Commit** - `feat(discover): the estate filters at the top - chips scope tree and map, rollups first`

---

### Task 4: Summary band on Discover

**Files:**
- Modify: `src/features/discover/UnifiedDiscovery.tsx` (the three stat sections compress into one band + disclosure)
- Test: `src/features/discover/UnifiedDiscovery.test.tsx` (adjust only what the compression breaks)

**Interfaces:** consumes the existing `domains` derivations (the tiles' values are already computed; the band re-uses the same numbers, no new data paths).

- [ ] **Step 1:** Write the failing test in `UnifiedDiscovery.viewToggle.test.tsx`: a `data-testid="estate-summary-band"` renders exactly one row of tiles containing the headline figures (sites count, active on-ramps, clouds·regions, workloads, attached, exposed endpoints), and a `data-testid="estate-breakdown"` `<details>` contains the previous full sections (assert one known per-section label only appears inside it, e.g. 'ROUTES').
- [ ] **Step 2: FAIL run.** - [ ] **Step 3: Implement**: the band is one flex row of the six headline tiles (reuse the existing tile markup at smaller width); wrap the current three `<section>` blocks in `<details data-testid="estate-breakdown"><summary>Show the breakdown</summary>...</details>`. Keep every existing testid and `data-tour="discover-estate"` anchor INSIDE the details (tour must still find it - if the tour spotlight needs the section visible, set the details `open` when `data-tour` is being targeted is out of scope; instead keep `data-tour="discover-estate"` on the summary band container so the tour highlights the visible band; verify `src/features/tour` suite and adapt which element carries the anchor, reporting the choice).
- [ ] **Step 4:** `npx vitest run src/features/discover src/features/tour` - PASS. - [ ] **Step 5: Commit** - `feat(discover): one summary band - the breakdown on demand`

---

### Task 5: Verification

- [ ] **Step 1:** `npx vitest run` - PASS. `npx playwright test` - PASS (tour + discover + andi + wizard specs all still green).
- [ ] **Step 2:** Browser walkthrough (gate mode): /ai/observe opens with the deep dive (verdict, four facets, outliers); click a model facet → open the raw log → the table is filtered; click an outlier → drawer. /discover: rollups + chips; Public internet chip narrows tree and dims map; summary band + breakdown disclosure. Screenshots of both.
- [ ] **Step 3:** Straggler fixes commit (skip if clean).

---

### Task 6 (addendum, owner-directed 2026-08-07): At-a-glance landing pages - the metric diet

Direct requirement from Micah mid-execution: "There's a lot of low impact metrics on the key pages - too much! All landing pages should be at-a-glance! The Sankey and the AT&T fabric are good - cards with high impact."

Principle: a landing page is verdict → hero visual → at most three high-impact cards. Everything else folds behind a quiet disclosure. The heroes (SankeyPanel, FabricHero) stay exactly as they are.

**Files:**
- Modify: `src/features/observe/ObservabilityShell.tsx` (the 6-tile KPI row)
- Modify: `src/features/ai-fabric/insights/InsightsPage.tsx` + `KpiStrip.tsx` (the 5-tile strip)
- Modify: `src/features/layer-home/dashboard/widgets/EstateFiguresWidget.tsx` (compress to headline row)
- Tests: the corresponding existing test files, adjusted only where the fold breaks an assertion (each adjustment named in the report)

**Interfaces:** no new modules; presentational splits only. Bindings/figures functions stay untouched - `networkBinding.kpis()` still returns 6, `insightKpis` still returns 5; the PAGES choose what leads.

- [ ] **Step 1: Observe KPI diet.** In ObservabilityShell, the KPI row renders only the high-impact three, savings-first order: Savings, Under Control, Throughput (`kpis().filter` by key: `savings`, `under-control`, `throughput`). The remaining tiles (P95 Latency, Packet Loss, Egress) render inside `<details data-testid="all-metrics"><summary>All metrics</summary>...</details>` directly under the row, same tile markup. Failing test first (in the shell's existing test file): exactly 3 tiles visible by default, `all-metrics` present, opening it reveals the other three labels.
- [ ] **Step 1b: The Sankey page stays light, actionable elements only** (owner-directed follow-up: "Keep the sankey page as light as possible but with actionable elements"). On /naas/observe:
  - KEEP visible: the verdict, the FlowBar CTA, the 3-tile KPI row (Step 1), the flow tabs + Sankey/TrendBand hero + scrubber, and the Paths table (`PathTable` - it carries the steer/failover ACTIONS; it is the actionable element and stays).
  - FOLD: the records table + group-by select (ObservabilityShell:156-182) behind `<details data-testid="records-fold"><summary>Flow records</summary>` and the briefing band (ObservabilityShell:183+) behind `<details data-testid="briefing-fold"><summary>Briefing</summary>` - keep all testids (`groupby-select`, `briefing`) inside; the briefing's action buttons stay functional within the fold.
  - In ObservePage, `EventStream` folds behind `<details data-testid="events-fold"><summary>Live events</summary>`.
  - Failing tests first in the shell/page test files: default view shows no records table and no briefing content; the three folds open to reveal them; PathTable still renders by default. If AI observe (`AiObservePage`) shares ObservabilityShell, the folds apply there identically - verify and note it.

- [ ] **Step 2: AI Insights KPI diet.** In InsightsPage, split `view.kpis` into primary (the token, cost/spend, and blocked-requests entries - verify the real `key` values in `insightKpis` and name them in the report) and rest (TTFT, requests). `<KpiStrip kpis={primary} .../>` leads; rest render in the same `all-metrics` details pattern (reuse KpiStrip inside it: `<KpiStrip kpis={rest} />`). The `unit-*` emphasis toggle and `data-tour="insights-kpis"` stay on the primary strip. Failing test first: 3 primary tiles, disclosure holds the other two.
- [ ] **Step 3: Home estate figures diet.** EstateFiguresWidget compresses to its single headline row of figures (the widget's existing top-line numbers); any secondary rows/grids inside it move behind the same details pattern (`data-testid="estate-figures-more"`). If the widget is already a single row, report that and skip the change. Failing test first if changed.
- [ ] **Step 4:** `npx vitest run src/features/observe src/features/ai-fabric src/features/layer-home src/features/tour` - PASS (tour anchors must still resolve; if the insights tour beat targets the strip, the primary strip carries the anchor).
- [ ] **Step 5: Commit** - `feat(spine): at-a-glance landing pages - three high-impact cards, the rest on demand`

---

### Task 7 (addendum, owner-directed 2026-08-07): The with/without-AT&T lens on all key pages

Owner directive: "on all pages, with AT&T, and without AT&T." Interpretation (stated to owner): a counterfactual toggle - every key landing page can flip between today's estate (with AT&T) and the same estate without AT&T (every region public, latency at publicMs, egress at hyperscaler rates, savings zero). The engine already carries both sides of every figure.

**Files:**
- Create: `src/features/_shared/CounterfactualToggle.tsx` (segmented control: `With AT&T` / `Without AT&T`; controlled props `{ value: 'with' | 'without'; onChange }`; `data-testid="counterfactual-toggle"`, options `data-testid="lens-with"` / `data-testid="lens-without"`, `aria-pressed` semantics)
- Create: `src/features/_shared/counterfactual.ts` (pure lenses)
- Test: `src/features/_shared/counterfactual.test.ts`, `CounterfactualToggle.test.tsx`
- Modify: `src/features/connect/ConnectPage.tsx` (toggle above FabricHero; hero + verdict consume the lensed model)
- Modify: `src/features/observe/ObservePage.tsx` + `ObservabilityShell.tsx` (toggle in the shell header; verdict, KPI trio and sankey consume lensed inputs)
- Modify: `src/features/discover/UnifiedDiscovery.tsx` (toggle beside the estate filter chips; verdict + tree path badges consume the lensed model)
- Tests: corresponding page/shell test files (append lens cases)

**Interfaces:**
- `export type Lens = 'with' | 'without';`
- `export function withoutAttModel(model: FabricModel): FabricModel` - every region `{ path: 'public', attached: false, reliability: 'none', currentMs: publicMs }`; every c2c `{ controlled: false, viaPublic: true }`; onramps `{ active: false }`. Pure, deterministic; `'with'` lens is the identity.
- `export function withoutAttSankey(model: SankeyModel): SankeyModel` - every link `pathKind: 'public'`, all mid-band flow through the public-path node (merge the AT&T-fabric node's links into the public node; drop the fabric node when its value reaches zero).
- Verdicts need no new selectors: the pages pass the LENSED model into the existing `discoverVerdict`/`connectVerdict`; Observe's without-lens verdict comes from a new pure `withoutAttObserveVerdict(cc)` in `networkBinding.ts` stating the counterfactual with the existing raw figures: total Gbps all public, egress total at hyperscaler rates (`eg.total + eg.savings` - what you would pay without the fabric discount), savings zero. Copy pattern: `'Without AT&T: all of your N Gbps rides the public internet. $X/mo egress at hyperscaler rates. Nothing saved.'` (verify eg field semantics against `CloudControlEgress` - `total`/`pub`/`priv`/`savings` - and derive honestly; state the mapping in the report).

- [ ] **Step 1: Failing lens tests** - `withoutAttModel`: every region public/none/`currentMs === publicMs`, identity for 'with'; deterministic. `withoutAttSankey`: no link keeps `pathKind: 'private'`, total link value conserved. Toggle component: two options, aria-pressed flips, onChange fires.
- [ ] **Step 2: Implement the module + toggle.**
- [ ] **Step 3: Wire Connect** - `const [lens, setLens] = useState<Lens>('with');` toggle renders above FabricHero (inside the PageSection, after the VerdictLine); `const lensed = lens === 'without' ? withoutAttModel(model) : model;` FabricHero + connectVerdict + FabricPanel consume `lensed`. Failing test: flipping the toggle turns every fabric edge `data-path="public"` and the verdict says none are on the fabric.
- [ ] **Step 4: Wire Observe** - toggle beside the KPI row; in 'without', the verdict line renders `withoutAttObserveVerdict(cc)`, the KPI trio shows Savings $0.0k/mo + Under Control 0% + Throughput unchanged (derive by mapping the existing kpis - do not touch the binding), and the sankey gets `withoutAttSankey(binding.sankey!())`. Failing test: flip → verdict contains 'Without AT&T', savings tile reads $0.
- [ ] **Step 5: Wire Discover** - toggle next to the filter chips; verdict + tree consume the lensed model (tree rows' via-the-AT&T-fabric badges disappear under 'without'). Failing test: flip → verdict states 0 on the fabric.
- [ ] **Step 6:** `npx vitest run src/features/_shared src/features/connect src/features/observe src/features/discover src/features/tour src/__tests__/vocabulary.test.ts` - PASS.
- [ ] **Step 7: Commit** - `feat(spine): the with/without lens - every page can show the world without the fabric`

---

### Task 8 (addendum, owner-directed 2026-08-07): Site fleets - the fabric graphic scales to enterprise estates

Owner directive: "With the graphic with att fabric, the left might be 5000 sites, like for wells fargo." The left column of FabricHero must read at enterprise scale: each left node is a site CLASS carrying its fleet count, not a single building. A Wells-Fargo-scale estate is the story: thousands of branches ride one first-mile class onto the fabric.

**Files:**
- Modify: `src/engine/state-routing.ts:257-263` (EDGE_NODES gain `fleet`)  and `:466` (sites map carries it through `fabricModel()`)
- Modify: `src/engine/types.ts` (the FabricModel site shape gains `fleet: number` - find the site entry type; FabricHero's local `FabricModel.sites` typing follows)
- Modify: `src/features/connect/FabricHero.tsx` (site node sub-label shows the fleet; site→fabric edge stroke scales with fleet)
- Modify: `src/features/connect/SitePanel.tsx` (fleet figure in the panel)
- Tests: `src/features/connect/FabricHero.layout.test.ts` or FabricHero.test.tsx (append), engine test file for fabricModel if one asserts site shape

**Interfaces:**
- EDGE_NODES seed gains demo-real fleets (Wells-Fargo scale): `e-hq` fleet 1, `e-dc` fleet 2, `e-branch` fleet 4981, `e-mob` fleet 12400, `e-net` no fleet (internet is not a site class - keep it fleetless/undefined and render unchanged).
- `fabricModel()` sites: `{ id, label, firstMile, fleet }`.
- FabricHero: site node sub-label becomes `${fmt(fleet)} sites · first-mile · ${firstMile}` when `fleet > 1` (comma-formatted via `toLocaleString('en-US')`), unchanged single-site copy when fleet is 1 or undefined. Site→fabric edge strokeWidth scales `1.5 + Math.log10(fleet) * 0.9` clamped to [1.5, 5] (pure helper `fleetStroke(fleet?: number): number` exported from FabricHero for the layout test; fleet undefined → 1.5).
- Labels stay the class names (HQ, DC, Branch, Mobility) - the CLASS is the node, the fleet is the count.

- [ ] **Step 1: Failing tests** - engine: `fabricModel().sites` carries the seeded fleets (branch 4981). FabricHero: `fleetStroke(4981)` ≈ 4.8 (assert `toBeCloseTo(1.5 + Math.log10(4981) * 0.9, 1)` and clamping at 1 → 1.5, at 10**9 → 5); render test: the Branch site node shows '4,981 sites'.
- [ ] **Step 2: Implement** engine seed + pass-through, FabricHero sub-label + edge stroke (both collapsed and expanded modes use the same site edges - verify the expanded-mode site edges pick up the stroke too), SitePanel fleet line ('4,981 sites on this first-mile' pattern).
- [ ] **Step 3:** `npx vitest run src/features/connect src/engine src/features/discover src/features/tour` - PASS (discover included: AttachmentMap/tree may render site labels; update only assertions the sub-label change breaks, named in the report).
- [ ] **Step 4: Commit** - `feat(connect): site fleets - the left column reads at Wells Fargo scale`
