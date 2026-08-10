# Phase 0: Metric Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inventory every top-level number in the portal against the four tests (savings-first, connected, right measurement/label, two-second), record verdicts, and apply the relabel/demote/cut verdicts.

**Architecture:** An audit document drives mechanical edits. No new components, no new derivations. Verdict `keep` changes nothing; `relabel` is copy + test updates; `demote` moves a figure into an existing disclosure on the same screen; `cut` deletes the figure and its dead derivation callers (never engine derivations themselves). Anything needing new UI structure is logged in the audit doc for Phase 2c, not built.

**Tech Stack:** React/TypeScript, Vitest, Playwright, existing Flywheel (`fw-*`) tokens only.

## Global Constraints

- "Save, not cost" vocabulary: labels lead with savings framing; "Cost" appears only where the figure is literally spend.
- Rebrand guard: `rebrand.test.ts` must stay green - the portal is "AT&T AI-grade network"; never reintroduce "Cloud Connect".
- Flywheel compliance: copy changes only touch text and existing `fw-*`-token components.
- No behavior changes: every number that survives shows the same value from the same derivation; only position and words change.
- Test discipline: label assertions are updated in the same commit as the label they assert; suites are never weakened (assertions move, they don't disappear - a cut figure's test becomes an absence assertion only when the test guarded top-level presence).

---

### Task 1: Write the audit inventory

**Files:**
- Create: `docs/superpowers/metric-audit-2026-08.md`
- Read (sources of every top-level number):
  - `src/features/layer-home/dashboard/widgets/EstateFiguresWidget.tsx`
  - `src/features/layer-home/dashboard/widgets/MoneyOnTheTableWidget.tsx`
  - `src/features/layer-home/dashboard/widgets/AssessmentFindingsWidget.tsx`
  - `src/features/layer-home/dashboard/widgets/StandingIntentsWidget.tsx`
  - `src/features/layer-home/dashboard/widgets/TokenBudgetsWidget.tsx`
  - `src/features/discover/verdict.ts`, `src/features/discover/StackPanel.tsx`
  - `src/features/connect/FabricHero.tsx`
  - `src/features/observe/ObservePage.tsx`, `src/features/observe/SankeyPanel.tsx`
  - `src/features/cost/` (page + figures), `src/features/ai-fabric/` (insightsFigures and page)
  - Every `VerdictLine` call site: `grep -rn "VerdictLine" src/features --include="*.tsx"`

**Interfaces:**
- Produces: the verdict table consumed by Tasks 2-4. Row shape (one row per rendered number):
  `| Screen | Component:line | Label as shown | Value derivation | Persona | T1 savings-first | T2 connected | T3 right measure/label | T4 two-second | Verdict | Action note |`
  Verdict is exactly one of `keep` / `relabel` / `demote` / `cut` / `phase-2c`.

- [ ] **Step 1: Enumerate rendered numbers from code**

For each file above, list every JSX-rendered numeric or currency figure and its label. Include verdict-line sentences (they lead screens). Record component and line.

- [ ] **Step 2: Walk the rendered screens**

Start the dev server via the Browser pane (launch config in `.claude/launch.json`), visit `/` (dashboard), `/discover`, `/connect`, `/observe`, `/govern`, `/cost`, and the AI Fabric layer. Confirm the code inventory matches what renders; add anything missed (numbers can arrive via shared components).

- [ ] **Step 3: Apply the four tests per row**

Fill T1-T4 pass/fail with a one-clause reason each. Persona per screen from the value map: dashboard=exec, Discover=Architect, Connect=NetOps, Observe=FinOps+SRE, Govern=Security, Cost=FinOps, AI Fabric=platform/ML.

- [ ] **Step 4: Assign verdicts**

Rules: all four pass → `keep`. Fails only T3 wording → `relabel` (write the new label in the Action note - actual copy, not intent). True but second-order → `demote` (name the existing disclosure it moves into). Fails T1+T4 with no story → `cut`. Needs structure that doesn't exist (evidence popover, new disclosure) → `phase-2c` with one line of what's needed.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/metric-audit-2026-08.md
git commit -m "docs: metric audit inventory and verdicts (phase 0)"
```

### Task 2: Apply relabel verdicts

**Files:**
- Modify: every component the audit marked `relabel` (from Task 1's table)
- Modify: their sibling `.test.tsx` label assertions

**Interfaces:**
- Consumes: Task 1's verdict table `relabel` rows (Action note holds the exact new copy).

- [ ] **Step 1: Update the label assertions first (RED)**

For each relabel row, change the test to expect the new label. Example shape (real labels come from the audit table):

```tsx
// Before: expect(screen.getByText('Egress cost')).toBeInTheDocument();
expect(screen.getByText('Egress you could save')).toBeInTheDocument();
```

- [ ] **Step 2: Run the touched suites, expect failures**

Run: `npx vitest run src/features/<touched paths>` — every changed assertion FAILS against the old copy.

- [ ] **Step 3: Change the labels**

Apply the Action-note copy verbatim in each component. Copy only - no value, derivation, or layout changes.

- [ ] **Step 4: Run the suites green**

Run: `npx vitest run src/features/<touched paths>` — PASS. Then `npx vitest run src/__tests__/rebrand.test.ts` — PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src docs
git commit -m "feat(metrics): relabel top-level figures per phase 0 audit"
```

### Task 3: Apply demote and cut verdicts

**Files:**
- Modify: every component the audit marked `demote` or `cut`, plus sibling tests

**Interfaces:**
- Consumes: Task 1's verdict table `demote`/`cut` rows.

- [ ] **Step 1: Write the expectations first (RED)**

Demote: assert the figure renders inside the named existing disclosure (`data-testid` of the disclosure) and NOT in the top band. Cut: assert the label is absent from the screen render.

```tsx
expect(within(screen.getByTestId('estate-breakdown')).getByText(/Routes/)).toBeInTheDocument();
expect(screen.queryByTestId('top-band-routes')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run touched suites, expect failures**

Run: `npx vitest run src/features/<touched paths>` — FAIL.

- [ ] **Step 3: Move or remove the figures**

Demotes relocate the existing JSX into the named disclosure; cuts delete the JSX and any now-unused local helper (leave engine derivations - other consumers and Phase 2c may use them; note orphaned derivations in the audit doc instead).

- [ ] **Step 4: Full unit suite green**

Run: `npx vitest run` — PASS, no skips added.

- [ ] **Step 5: Commit**

```bash
git add -A src docs
git commit -m "feat(metrics): demote and cut top-level figures per phase 0 audit"
```

### Task 4: Verify end to end and close the audit

**Files:**
- Modify: `e2e/*.spec.ts` only where a spec asserted a moved/removed label
- Modify: `docs/superpowers/metric-audit-2026-08.md` (final state section)

**Interfaces:**
- Consumes: all prior tasks' edits.

- [ ] **Step 1: Run the full verify pipeline**

Run: `npm run verify` (vitest run + build + playwright). Fix only assertion drift caused by Tasks 2-3; any product regression means a Task 2/3 edit went beyond copy/position - revert that edit and re-do it minimally.

- [ ] **Step 2: Walk the screens again**

Dev server up; confirm each audited screen leads with only `keep`/`relabel` figures and reads in two seconds. Screenshot each for the record.

- [ ] **Step 3: Close the audit doc**

Append a "Applied" section: per row, done/deferred-to-2c. The `phase-2c` rows become the seed list in the roadmap's Phase 2c.

- [ ] **Step 4: Commit**

```bash
git add -A e2e docs
git commit -m "test(metrics): settle e2e assertions; close phase 0 audit"
```
