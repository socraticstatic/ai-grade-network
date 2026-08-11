# Phase 2b: Observe at Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Sankey gains a rollup-first site-origin band fed by the engine's branch flows, with one-level metro drill-in, scoped by the same estate filter chips Discover ships - the money screen survives Wells Fargo.

**Architecture:** `sankeyModel.buildSankey(cc, opts)` grows pure site-origin derivation from `state-rules.flows()` branch rows (rolled by site class, drillable to metro); `SankeyPanel` owns drill state and rollup-node affordance; `ObservePage` mounts `EstateFilterChips` and shares one `EstateFilters` state. flowLogs untouched.

**Tech Stack:** TypeScript, React, Vitest, Playwright, Flywheel `fw-*` tokens.

## Global Constraints

- Rollup-first: no per-site nodes ever; drilled class = top 8 metros + "Other (N sites)"; widest model stays under 40 nodes (unit-asserted).
- Every link value sums real engine flow rows (`gbps`); no invented numbers; Intl.NumberFormat('en-US') for counts; same class vocabulary as Discover ("data centers/offices/branches/ATMs").
- One filter vocabulary: the shipped `EstateFilters`/`EstateFilterChips`/`branchMatches` - no parallel filter model.
- KPI strip and flowLogs untouched; caption states scope: "All flows - N site-originated, M cloud-originated."
- "Save, not cost"; never "Cloud Connect"; suites never weakened; ACME regression-clean; Flywheel tokens only.
- `flows()` called once per render through the existing memo idiom; Meridian Observe interactive within the e2e 5s guard.

---

### Task 1: sankeyModel - site-origin band

**Files:**
- Modify: `src/features/observe/sankeyModel.ts`
- Test: `src/features/observe/sankeyModel.test.ts` (extend)

**Interfaces:**
- Consumes: `cc.flows()` branch rows (`srcBranch`, `srcName`, `dstCloud`, `dstVpc`, `viaPublic`, `gbps` - shape at state-rules.ts:274-277), `branchesOf`, `branchMatches`, `EstateFilters`, `SiteClass`.
- Produces (SankeyPanel relies on these exact shapes):

```ts
export interface SankeyNode { name: string; band: 'source' | 'path' | 'dest'; rollup?: { siteClass: SiteClass; count: number } }
export interface BuildOpts { filters?: EstateFilters; drill?: SiteClass | null }
export function buildSankey(cc: CloudControl, opts?: BuildOpts): SankeyModel;
export function siteOriginSummary(cc: CloudControl, filters?: EstateFilters): { siteFlows: number; cloudFlows: number };
```

Behavior: branch flow rows join `branchesOf(cc)` by `srcBranch` id to get `siteClass`/`city`; rows whose branch fails `branchMatches(branch, filters)` are excluded; remaining rows group to one source node per class (label `${nf.format(count)} ${classPlural}` where count = DISTINCT branches with surviving flows in that class) unless `drill === thatClass`, in which case that class renders top-8 metros by summed gbps (`${city} · ${nf.format(n)} sites`) + `Other (${nf.format(rest)} sites)` when overflow exists. Links: class/metro node → path node (viaPublic ? public : private) → dest node named for the target cloud (`clouds.find(c=>c.id===dstCloud).name`), value = summed gbps (2dp). Existing routeFlows nodes/links unchanged and filtered by the cloud facet only where `regionMatches` semantics already apply on Discover - concretely: a `filters.cloud !== 'all'` drops routeFlows rows whose source region belongs to another cloud (parse via the same rowEndpoints source names? NO - match on the row's region id is not available; instead filter app rows by `label.startsWith(cloudName)` is brittle - implement by extending RouteFlowRow mirror with the fields routeFlows actually carries (read state-routing.ts:120-165 for the real row fields; rows carry endpoint region ids per the comment at line 96) and match cloud honestly; if the rows genuinely lack a cloud id, leave routeFlows rows unfiltered and document the caption as the honest scope - the TEST will assert whichever contract you implement, and the report must state the choice).

- [ ] **Step 1: Failing tests** - under meridian: source band contains "2,840 branches" and "1,130 ATMs" nodes with rollup metadata; total node count < 40 undrilled AND drilled; class node's link values equal the hand-summed gbps of that class's flow rows (compute in-test from cc.flows()); drill('branch') yields ≤ 9 branch-class nodes (8 metros + Other) and no "2,840 branches" node; filters siteClass='atm' leaves exactly one site-origin class node; siteOriginSummary counts match flows() row partition; under acme: site band present with office/dc nodes summing acme's branch flows; existing buildSankey assertions untouched and green; restore acme in afterEach.
- [ ] **Step 2: RED** - `npx vitest run src/features/observe/sankeyModel.test.ts`.
- [ ] **Step 3: Implement** (pure; one pass over flows; memoization left to callers per file convention).
- [ ] **Step 4: GREEN** + `npx vitest run src/features/observe/` + tsc.
- [ ] **Step 5: Commit** - `feat(observe): site-origin rollup band in the sankey model`

### Task 2: SankeyPanel - drill + caption

**Files:**
- Modify: `src/features/observe/SankeyPanel.tsx`
- Test: `src/features/observe/SankeyPanel.test.tsx` (extend or create beside existing tests - read what exists)

**Interfaces:**
- Consumes: Task 1's `buildSankey(cc, opts)`, `siteOriginSummary`; receives `filters: EstateFilters` as a new prop (default `EMPTY_ESTATE_FILTERS`).
- Produces: rollup nodes render with the count label and a drill affordance (`data-testid="sankey-rollup-node"`, aria-pressed reflects drilled state); clicking toggles drill for that class (one class drilled at a time); caption `data-testid="sankey-scope-caption"` renders the summary sentence.

- [ ] **Step 1: Failing tests** - meridian render shows rollup nodes; click "2,840 branches" → metro nodes appear, click again → collapses; caption shows both counts formatted; acme render unchanged except the site band and caption exist.
- [ ] **Step 2: RED.** — [ ] **Step 3: Implement** (existing node/label idiom, fw-* only; drill state is component state, model stays pure). — [ ] **Step 4: GREEN + tsc.** — [ ] **Step 5: Commit** - `feat(observe): drillable rollup nodes and scope caption on the sankey`

### Task 3: ObservePage - estate chips scope the money screen

**Files:**
- Modify: `src/features/observe/ObservePage.tsx`
- Test: extend the page's existing test file (find `ObservePage.test.tsx` or the binding tests)

**Interfaces:**
- Consumes: `EstateFilterChips` (its real prop contract - read the component: it takes `cc`, `filters`, `onChange`-shaped props as used by UnifiedDiscovery - mirror that call site exactly), Task 2's `filters` prop.
- Produces: ObservePage owns `useState<EstateFilters>(EMPTY_ESTATE_FILTERS)`, renders the chips above the Sankey, threads filters into SankeyPanel. Other Observe widgets (KPI strip, flow logs, event stream) untouched.

- [ ] **Step 1: Failing tests** - chips render on Observe; clicking the ATMs chip narrows SankeyPanel to one site-origin node (integration test through the page); KPI strip assertions unchanged.
- [ ] **Step 2: RED.** — [ ] **Step 3: Implement.** — [ ] **Step 4: GREEN + full `npx vitest run` + tsc.** — [ ] **Step 5: Commit** - `feat(observe): estate filter chips scope the sankey`

### Task 4: E2E + browser walk

**Files:**
- Create: `e2e/observe-at-scale.spec.ts`

- [ ] **Step 1: Write the spec** (meridian-estate.spec.ts URL/auth idiom): (1) meridian `/naas/observe`: "2,840 branches" rollup node visible, caption shows site/cloud flow counts, interactive < 5s; (2) ATMs chip → exactly one site-origin rollup node; (3) drill branches → a metro node (e.g. "Dallas ·") visible, collapse restores; (4) acme `/naas/observe`: site band present, existing KPI strip assertions from neighboring specs still pass.
- [ ] **Step 2: Run it** + neighboring observe/sankey e2e specs (skip known pre-existing failures; document).
- [ ] **Step 3: Browser walk** - dev server from the worktree, both profiles, screenshots into the plan workspace.
- [ ] **Step 4: Commit** - `test(e2e): sankey site band, chip scoping, drill, acme regression`
