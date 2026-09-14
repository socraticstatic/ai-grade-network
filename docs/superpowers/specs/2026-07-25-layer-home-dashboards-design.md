# Layer-Home Widget Dashboards — Design

**Date:** 2026-07-25
**Surfaces:** NaaS Home (`/naas/home`) and AI Fabric Home (`/ai/home`)
**Status:** Design approved; awaiting spec review before planning.

## Problem

The NaaS and AI Fabric home pages are thin. Both render from one shared
component, `src/features/layer-home/LayerHomePage.tsx`: a four-card "live
figures" grid plus a "Work this layer" grid of verb tiles (Connect / Govern /
Observe / Cost). The figures are accurate but static and non-actionable, and
there is nothing a user can shape to their own job.

Two goals:

1. Replace the four flat stat cards with a board of **useful, actionable**
   widgets that read live engine state and let a user act on what they see.
2. Let a user **build their own board** — add, remove, and reorder widgets —
   with the layout saved per layer.

## What already exists (and what we take from it)

The repo already contains two widget systems. We take different things from
each; we do not adopt either wholesale.

- **System A — `src/components/control-center/`** (dnd-kit sortable grid, an
  Add-Widget drawer, a `WidgetInstance` contract, a pop-out). We borrow its
  **grid/drag/drawer mechanics**. We do **not** adopt its widgets: they are
  read-only, fed `connections: Connection[]` + `MOCK_DATA`, coupled to the
  legacy Manage/Connection views, and its pop-out is already orphaned
  (`/detached/insights` redirects to `/discover`). This subsystem is left in
  place, untouched, for the Manage views that still mount it.

- **System B — `features/observe` (NETWORK BRIEFING rail), the "Advisor: N
  moves" chip, `features/andi` (Resolve cards), `features/netops` (Act button),
  `features/ai-fabric/insights` (`KpiStrip`, `TrafficSankey`).** This is the
  **design language and the actionability** we adopt: engine-grounded copy,
  `rounded-2xl`/`fw-*` tokens, and the Andi Resolve-card pattern (status
  eyebrow + evidence sentence + `saves ~$X/mo` + a wired action button).

The engine (`window.CC`, via `useCloudControlLive`) is the live data source and
is currently wired into **zero** widgets. This feature is, in essence, pointing
a clean widget board at that engine.

## The intent backbone

The flagship widget is grounded in standing intents, which already carry
everything an actionable widget needs. `CC.intentList()` returns each declared
intent joined with a live reading:

- `status`: `aligned` | `drifting` | `violated`
- `evidence`: one engine-derived sentence
- `moves`: a priced, one-click repair (twin `StagedMove` vocabulary)

There are 18 intents across 6 ILM-7 categories (`src/engine/state-intents.ts`
`CATALOG`). The catalog is filterable by category, which is how each layer
offers only intents relevant to it.

## Architecture

Five units, each with one purpose and a defined interface.

### 1. Widget contract + registry — `src/features/layer-home/dashboard/registry.ts`

```ts
type Surface = 'naas' | 'ai';

interface WidgetDef {
  id: string;                    // stable, e.g. 'standing-intents'
  title: string;
  description: string;           // shown in the picker
  icon: LucideIcon;             // or AttIcon key
  category: string;              // picker grouping
  surface: Surface | 'both';     // gates which layer may show it
  defaultSize: { w: 1 | 2 | 3; h: 1 | 2 };
  component: React.ComponentType<LayerWidgetProps>;
}

interface LayerWidgetProps { editing: boolean }   // NO data props
```

- `WIDGET_REGISTRY: Record<string, WidgetDef>`.
- `widgetsForSurface(layer: Surface): WidgetDef[]` — filters on `surface`.
- The `surface` field is the guard that keeps a NaaS-only widget out of the AI
  picker and vice versa.

A widget reads its own data via `useCloudControlLive(selector)`. It receives no
`connections` or config props. This is the deliberate break from System A.

### 2. Widget frame — `src/features/layer-home/dashboard/WidgetFrame.tsx`

Shared chrome in System B's language: `rounded-2xl border border-fw-secondary
bg-fw-base`, a header (icon + title + optional action slot), and, **only in edit
mode**, a drag handle (`GripVertical`) and a remove control (`X`). Every widget
renders inside it, so widgets themselves carry no chrome.

### 3. The board — `src/features/layer-home/dashboard/LayerDashboard.tsx`

`LayerDashboard({ layerKey })`:

- Reads the layout for `layerKey` from the store.
- Renders a reflow grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, each
  widget spanning `size.w` columns / `size.h` rows.
- Array order **is** the layout (no x/y coordinates; a reflow grid, matching
  System A's reorder model).
- A **"Customize"** toggle flips `editing`: it mounts a dnd-kit `DndContext` +
  `SortableContext` (reorder), shows per-widget remove controls, and opens the
  Add-Widget drawer. Outside edit mode the board is static (no dnd overhead).

Replaces the stat grid in `LayerHomePage`. The header and the "Work this layer"
verb tiles are unchanged — the verb tiles remain the page's primary navigation.

### 4. Add-Widget drawer — `src/features/layer-home/dashboard/WidgetDrawer.tsx`

Right-edge drawer, only present in edit mode. Lists `widgetsForSurface(layer)`
grouped by `category`; each entry is a card (icon + title + description + add
control). Already-placed widgets are shown as added/disabled. Adapts System A's
`WidgetDrawer` layout to our registry.

### 5. Layout state — `src/store/slices/layerDashboardSlice.ts`

```ts
interface WidgetInstance { instanceId: string; widgetId: string; size: {w,h} }

interface LayerDashboardState {
  layouts: { naas: WidgetInstance[]; ai: WidgetInstance[] };
  addWidget(layer, widgetId): void;
  removeWidget(layer, instanceId): void;
  reorderWidgets(layer, from, to): void;
  resetLayer(layer): void;         // back to the seeded default
}
```

- Persisted through the existing quota-safe helper (`safeSetItem` /
  `safeGetItem`, `src/utils/localStorageUtils.ts`) under a dedicated key
  (`layer-dashboards-v1`), independent of `appState-v3`. (System A's `widgets`
  are deliberately excluded from `appState-v3`; we do not touch that.)
- **Default layouts are seeded per layer** so a first visit — or a Reset — shows
  a full board, and nothing regresses from today's four stats. Defaults live in
  `registry.ts` as `DEFAULT_LAYOUT[layer]`.
- If persisted state references a `widgetId` no longer in the registry (a widget
  was removed in a later build), that instance is dropped on load rather than
  crashing the board.

## Widget catalog

Each widget = one component, one engine selector, rendered in `WidgetFrame`.
Data sources are named so the plan can wire them directly.

### Phase 1 — the default boards (focused set)

Distinct components built in Phase 1:

| Widget | Surface | Data source | Actionable? |
|---|---|---|---|
| **Standing Intents** (flagship, pinned top-left both layers) | both | `CC.intentList()` filtered to the layer's ILM categories | Yes — per-intent Synchronize (`moves`); empty state offers Declare-an-intent from `CC.intentCatalog()` |
| **Estate figures** (KPI strip) | both | `naasStratum()` / `aiStratum()` (`features/discover/stackFigures.ts`) | No — preserves today's four figures as one KPI widget |
| **Assessment findings** | both | `CC.assessmentReport()` (recoverable $/mo, security events, invisible share) | No (KPI); links to the assessment |
| **Money on the table** | naas | `CC.arbitrage()` (available savings + ranked buckets) | Yes — Advisor pattern: Review → staged moves → commit → Undo |
| **Token budgets** | ai | `CC.tokenPolicyList()` (per-policy budget meters, warn near cap) | Yes — Enforce a policy (`CC.setTokenPolicy` / `intentCapEnforced`) |

Default board per layer (order = layout):

- **NaaS:** Standing Intents · Estate figures · Money on the table · Assessment
  findings.
- **AI Fabric:** Standing Intents · Estate figures · Token budgets · Assessment
  findings.

This is deliberately a strong-but-small set: the flagship actionable widget, the
figures being replaced, one layer-specific actionable widget, and the assessment
KPI. It ships and gets verified fast. The registry and frame carry no assumption
about this count, so growing the catalog is additive.

### Phase 2 — customization + catalog growth

- **Customization** (the "build your own board" half): the `layerDashboardSlice`,
  persistence, and Customize mode (drag reorder, add/remove via the drawer,
  per-layer Reset). Until this ships, Phase 1 boards are the seeded defaults,
  static.
- **Additional widgets**, same contract and engine surface:
  - NaaS: **Public egress** (`egress()` warn + telemetry sparkline),
    **Attach/Steer opportunities** (`attachOpportunities()` /
    `steerOpportunities()`), **Egress trend** chart (`EgressTrend` /
    `state-billing`), a **fabric coverage meter** (`fabricModel()` attached /
    total).
  - AI Fabric: **Live agent activity** (`agentList()` + the 7s `agentTick`
    `decisionLog()` stream, governed vs ungoverned), **Model endpoints**
    (`modelCatalog()` p50/price/ready), **Ungoverned tokens** alert
    (`aiStratum().ungovernedTokensToday`, Govern CTA), **Governance decisions**
    stream, **token series** chart (`tokenSeries()`).
  - Shared: an **estate map** from `region.geo` `[lat,lng]`.

## Data flow

`window.CC` (IIFE-assembled engine) → `useCloudControlLive(selector)` inside each
widget → re-renders on state change and on telemetry `hits` (live meters).
Actionable widgets call a `CC` mutation (`setIntentMode`, `setTokenPolicy`,
`reviewDraft`/commit), which pushes undo, emits an event, and audits — the
existing derive → review → commit → Undo contract. No new engine surface is
added; widgets are pure consumers.

Layout mutations flow only through `layerDashboardSlice`, persisted to
localStorage. Engine state and layout state are independent stores.

## Error handling and edge cases

- A widget whose selector returns empty/zero renders a defined empty state
  (e.g. Standing Intents with none declared → Declare-an-intent CTA), never a
  blank card.
- Unknown `widgetId` in persisted layout → instance dropped on load.
- localStorage unavailable/full → `safeSetItem` fails soft; the board runs on
  in-memory defaults for the session (no crash).
- Reduced motion: widgets honor the existing `prefers-reduced-motion` handling
  already used by charts/heroes (no new animation that ignores it).
- `resetLayer` restores the seeded default for that layer only.

## Testing

- **Unit (vitest):** each widget renders from seeded engine state and shows the
  correct figures; each actionable widget calls the right `CC` mutation on
  click; `widgetsForSurface` filters correctly; the slice add/remove/reorder/
  reset behaves and round-trips through persistence; unknown-widgetId instances
  are dropped.
- **E2e (playwright):** both home pages render their default boards with live
  figures; Customize mode adds, removes, and reorders a widget; a reload
  persists the layout **per layer** (NaaS and AI layouts are independent); the
  NaaS picker never lists an AI-only widget.

## Scope guards (YAGNI)

- No pop-out / detached window (System A's is already orphaned).
- No backend or multi-user; localStorage only (the app has no auth backend).
- No free-canvas dragging and no widget resize in v1 (fixed `defaultSize`,
  reflow grid, reorder only).
- The legacy `control-center` subsystem is not modified.
- Verb tiles are not touched; they remain primary navigation.

## Logistics

Implemented on `feat/layer-dashboards`, a worktree off `main` at
`/Users/micahbos/Developer/cc-widgets` (outside `.claude/worktrees/` so the
Playwright gate runs). Gate: `npm run verify`.
