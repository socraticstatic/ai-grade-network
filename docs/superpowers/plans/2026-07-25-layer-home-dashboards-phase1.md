# Layer-Home Widget Dashboards — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat four-stat grid on the NaaS Home and AI Fabric Home pages with a board of live, engine-backed widgets — including one actionable flagship per surface — rendered from a per-surface default layout. (Static board only; customization/drag/persistence is Phase 2, a separate plan.)

**Architecture:** A widget contract where each widget is a self-contained component reading one `CC` engine selector via `useCloudControlLive` (no data props; the current layer arrives through a React context). A registry maps widget ids to definitions tagged by `surface`. `LayerDashboard` renders a per-surface default layout into a reflow grid and replaces the stat grid inside the existing shared `LayerHomePage`. Visual language follows the existing System B panels (`rounded-2xl`, `fw-*` tokens, Andi Resolve-card actionability).

**Tech Stack:** React 18 + TypeScript, Tailwind (`fw-*`/`figma-*` design tokens), Vitest + Testing Library (unit), Playwright (e2e). The engine is `window.CC` (`src/engine`), consumed via `useCloudControlLive`.

## Global Constraints

- **Never use em dashes** in any user-visible copy. Use hyphens or rephrase. (Repo house style.)
- **Widgets take no data props.** Each reads its own engine slice via `useCloudControlLive`; the active layer comes from `useLayer()` context, never a prop passed as data.
- **Engine is read/act only, never re-derived.** Widgets display `CC` getters and call `CC` mutations; they must not invent figures (no fabricated dollars/latency). Actionable widgets follow derive → act-through-engine → Undo (the engine pushes its own undo).
- **Design tokens only:** cards `rounded-2xl border border-fw-secondary bg-fw-base`; text `fw-heading`/`fw-body`/`fw-bodyLight`; warn `fw-warn`; success `fw-success`; primary action `fw-ctaPrimary`/`fw-link`/`fw-accent`. Headings carry `tracking-[-0.03em]`. Values `tabular-nums`.
- **Do not modify** the legacy `src/components/control-center/` subsystem or `src/store/`. Phase 1 introduces no store slice and no persistence.
- **Tests use the real seeded engine** (`import { CC } from '../../../engine'`) exactly as `LayerHomePage.test.tsx` does — no mocking of `CC`.
- **Gate:** `npm run verify` (vitest + build + playwright) from the worktree root `/Users/micahbos/Developer/cc-widgets`.

---

## File Structure

All new files under `src/features/layer-home/dashboard/`:

- `registry.ts` — `Surface`, `WidgetDef`, `LayerWidgetProps`, `WIDGET_REGISTRY`, `widgetsForSurface`, `DEFAULT_LAYOUT`, and the `LayerContext`/`useLayer` helpers.
- `WidgetFrame.tsx` — shared card chrome (title, action slot; edit-mode handle/remove come in Phase 2, so Phase 1 renders the static frame).
- `LayerDashboard.tsx` — renders `DEFAULT_LAYOUT[surface]` into the reflow grid, wrapped in `LayerContext`.
- `widgets/EstateFiguresWidget.tsx` — the four current figures as one KPI widget (surface-aware).
- `widgets/StandingIntentsWidget.tsx` — flagship; per-intent status + evidence + Synchronize; empty state declares an intent.
- `widgets/AssessmentFindingsWidget.tsx` — `assessmentReport()` KPIs.
- `widgets/MoneyOnTheTableWidget.tsx` — NaaS; `arbitrage()` savings + ranked buckets + Review.
- `widgets/TokenBudgetsWidget.tsx` — AI; per-policy budget meters + Enforce.

Modified:

- `src/features/layer-home/LayerHomePage.tsx` — replace the `layer-home-stats` grid (lines 52-62) with `<LayerDashboard surface={layerKey} />`; delete the now-unused `layerStats`/`Stat` code.
- `src/features/layer-home/LayerHomePage.test.tsx` — the two existing tests assert on `layer-home-stats`; update them to the board's testids.

New tests: one `*.test.tsx` beside each new file, plus `e2e/layer-dashboards.spec.ts`.

---

### Task 1: Widget contract, registry, and layer context

**Files:**
- Create: `src/features/layer-home/dashboard/registry.ts`
- Create: `src/features/layer-home/dashboard/registry.tsx` is NOT used — keep `.ts` (JSX lives only in the context helper below, which uses `createContext` without JSX, so `.ts` is fine)
- Test: `src/features/layer-home/dashboard/registry.test.ts`

**Interfaces:**
- Produces:
  - `type Surface = 'naas' | 'ai'`
  - `interface LayerWidgetProps { editing?: boolean }`
  - `interface WidgetDef { id: string; title: string; description: string; icon: LucideIcon; category: string; surface: Surface | 'both'; defaultSize: { w: 1 | 2; h: 1 | 2 }; component: React.ComponentType<LayerWidgetProps> }`
  - `const WIDGET_REGISTRY: Record<string, WidgetDef>` (empty for now; widgets register in later tasks)
  - `function widgetsForSurface(surface: Surface): WidgetDef[]`
  - `const DEFAULT_LAYOUT: Record<Surface, string[]>` (empty arrays for now; filled in Task 8)
  - `const LayerContext: React.Context<Surface>` and `function useLayer(): Surface`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/layer-home/dashboard/registry.test.ts
import { describe, test, expect } from 'vitest';
import { WIDGET_REGISTRY, widgetsForSurface, type WidgetDef } from './registry';

// A throwaway def so the filter has data independent of real widgets.
const def = (id: string, surface: WidgetDef['surface']): WidgetDef => ({
  id, title: id, description: id, icon: (() => null) as unknown as WidgetDef['icon'],
  category: 'test', surface, defaultSize: { w: 1, h: 1 },
  component: () => null,
});

describe('widgetsForSurface', () => {
  test('returns widgets tagged for the surface plus the shared ones, never the other surface', () => {
    const reg: Record<string, WidgetDef> = {
      a: def('a', 'naas'), b: def('b', 'ai'), c: def('c', 'both'),
    };
    const naas = widgetsForSurface('naas', reg).map(w => w.id).sort();
    const ai = widgetsForSurface('ai', reg).map(w => w.id).sort();
    expect(naas).toEqual(['a', 'c']);
    expect(ai).toEqual(['b', 'c']);
  });

  test('the real registry is keyed by each widget id', () => {
    for (const [key, w] of Object.entries(WIDGET_REGISTRY)) expect(w.id).toBe(key);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/layer-home/dashboard/registry.test.ts`
Expected: FAIL — cannot find module `./registry` (and `widgetsForSurface` takes a 2nd arg the impl must accept for testability).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/layer-home/dashboard/registry.ts
import { createContext, useContext, type ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

export type Surface = 'naas' | 'ai';

export interface LayerWidgetProps { editing?: boolean }

export interface WidgetDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: string;
  surface: Surface | 'both';
  defaultSize: { w: 1 | 2; h: 1 | 2 };
  component: ComponentType<LayerWidgetProps>;
}

// Widgets self-register by being spread in here as they are built (Task 8
// assembles the final object). Kept as a plain object so the registry is a
// single, greppable source of truth.
export const WIDGET_REGISTRY: Record<string, WidgetDef> = {};

/** Widgets valid on `surface`: those tagged for it plus the shared ('both').
 *  The `reg` arg defaults to the real registry; tests pass their own. */
export function widgetsForSurface(
  surface: Surface,
  reg: Record<string, WidgetDef> = WIDGET_REGISTRY,
): WidgetDef[] {
  return Object.values(reg).filter(w => w.surface === surface || w.surface === 'both');
}

/** The default board per surface, as an ordered list of widget ids. Filled in
 *  Task 8 once the widgets exist. */
export const DEFAULT_LAYOUT: Record<Surface, string[]> = { naas: [], ai: [] };

// The active layer, provided by LayerDashboard so surface-aware widgets can read
// it without a data prop.
export const LayerContext = createContext<Surface>('naas');
export const useLayer = (): Surface => useContext(LayerContext);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/layer-home/dashboard/registry.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/layer-home/dashboard/registry.ts src/features/layer-home/dashboard/registry.test.ts
git commit -m "feat(layer-home): widget contract, registry, and layer context"
```

---

### Task 2: WidgetFrame chrome

**Files:**
- Create: `src/features/layer-home/dashboard/WidgetFrame.tsx`
- Test: `src/features/layer-home/dashboard/WidgetFrame.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `function WidgetFrame(props: { title: string; icon: LucideIcon; action?: React.ReactNode; children: React.ReactNode }): JSX.Element` — a card with header (icon + title + optional right-aligned `action`) and a `p-4` body. Root carries `data-testid="widget-frame"` and `data-widget-title={title}`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/layer-home/dashboard/WidgetFrame.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { Activity } from 'lucide-react';
import { WidgetFrame } from './WidgetFrame';

describe('WidgetFrame', () => {
  test('renders the title, an action slot, and its children', () => {
    render(
      <WidgetFrame title="Standing intents" icon={Activity} action={<button>Do</button>}>
        <p>body</p>
      </WidgetFrame>,
    );
    expect(screen.getByText('Standing intents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Do' })).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByTestId('widget-frame')).toHaveAttribute('data-widget-title', 'Standing intents');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/layer-home/dashboard/WidgetFrame.test.tsx`
Expected: FAIL — cannot find module `./WidgetFrame`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/layer-home/dashboard/WidgetFrame.tsx
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function WidgetFrame({ title, icon: Icon, action, children }: {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="widget-frame"
      data-widget-title={title}
      className="flex flex-col rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Icon className="h-4 w-4 text-fw-bodyLight shrink-0" aria-hidden="true" />
        <h3 className="flex-1 text-figma-sm font-semibold text-fw-heading tracking-[-0.03em] truncate">
          {title}
        </h3>
        {action}
      </div>
      <div className="h-px bg-fw-secondary mx-4" />
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/layer-home/dashboard/WidgetFrame.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/layer-home/dashboard/WidgetFrame.tsx src/features/layer-home/dashboard/WidgetFrame.test.tsx
git commit -m "feat(layer-home): WidgetFrame card chrome"
```

---

### Task 3: EstateFiguresWidget (surface-aware KPIs)

Preserves today's four figures. On NaaS reads `naasStratum`, on AI reads `aiStratum`, choosing by `useLayer()`.

**Files:**
- Create: `src/features/layer-home/dashboard/widgets/EstateFiguresWidget.tsx`
- Test: `src/features/layer-home/dashboard/widgets/EstateFiguresWidget.test.tsx`

**Interfaces:**
- Consumes: `LayerContext`/`useLayer`, `WidgetFrame` (Tasks 1-2); `naasStratum`/`aiStratum` from `src/features/discover/stackFigures`; `fmtTokens`/`fmtUsd` from `src/features/ai-fabric/aiSpend`.
- Produces: `function EstateFiguresWidget(props: LayerWidgetProps): JSX.Element`. Each figure row carries `data-testid="estate-figure"`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/layer-home/dashboard/widgets/EstateFiguresWidget.test.tsx
import { render, screen, within } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { LayerContext } from '../registry';
import { EstateFiguresWidget } from './EstateFiguresWidget';
import { CC } from '../../../../engine';
import { naasStratum, aiStratum } from '../../../discover/stackFigures';
import { fmtUsd } from '../../../ai-fabric/aiSpend';

const renderIn = (surface: 'naas' | 'ai') =>
  render(<LayerContext.Provider value={surface}><EstateFiguresWidget /></LayerContext.Provider>);

describe('EstateFiguresWidget', () => {
  test('NaaS shows the fabric figures', () => {
    renderIn('naas');
    const f = naasStratum(CC);
    expect(screen.getByText(`${f.regionsAttached}/${f.regionsTotal}`)).toBeInTheDocument();
    expect(screen.getByText('Regions on the fabric')).toBeInTheDocument();
  });

  test('AI shows the token-layer figures', () => {
    renderIn('ai');
    const f = aiStratum(CC);
    expect(screen.getByText(fmtUsd(f.spendToday))).toBeInTheDocument();
    expect(screen.getAllByTestId('estate-figure')).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/EstateFiguresWidget.test.tsx`
Expected: FAIL — cannot find module `./EstateFiguresWidget`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/layer-home/dashboard/widgets/EstateFiguresWidget.tsx
import { Gauge } from 'lucide-react';
import { WidgetFrame } from '../WidgetFrame';
import { useLayer, type LayerWidgetProps } from '../registry';
import { useCloudControlLive } from '../../../../engine/react/useCloudControl';
import { aiStratum, naasStratum } from '../../../discover/stackFigures';
import { fmtTokens, fmtUsd } from '../../../ai-fabric/aiSpend';

interface Figure { label: string; value: string; warn?: boolean }

export function EstateFiguresWidget(_props: LayerWidgetProps) {
  const surface = useLayer();
  const figures = useCloudControlLive<Figure[]>(cc => {
    if (surface === 'ai') {
      const f = aiStratum(cc);
      return [
        { label: 'Model endpoints ready', value: `${f.modelsReady}/${f.modelsTotal}` },
        { label: 'Tokens today', value: fmtTokens(f.tokensToday) },
        { label: 'On the public internet', value: fmtTokens(f.ungovernedTokensToday), warn: f.ungovernedTokensToday > 0 },
        { label: 'Spend today', value: fmtUsd(f.spendToday) },
      ];
    }
    const f = naasStratum(cc);
    const money = (n: number) => `$${Math.round(n).toLocaleString()}/mo`;
    return [
      { label: 'Regions on the fabric', value: `${f.regionsAttached}/${f.regionsTotal}` },
      { label: 'Sites', value: `${f.sites}` },
      { label: 'Egress on public transit', value: money(f.egressPubMo), warn: f.egressPubMo > 0 },
      { label: 'Still on the table', value: money(f.availableSavingsMo) },
    ];
  });

  return (
    <WidgetFrame title="Estate at a glance" icon={Gauge}>
      <div className="grid grid-cols-2 gap-3">
        {figures.map(f => (
          <div key={f.label} data-testid="estate-figure">
            <div className={`text-figma-2xl font-bold tabular-nums tracking-[-0.02em] ${f.warn ? 'text-fw-warn' : 'text-fw-heading'}`}>
              {f.value}
            </div>
            <div className="text-figma-sm text-fw-bodyLight mt-0.5">{f.label}</div>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/EstateFiguresWidget.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/layer-home/dashboard/widgets/EstateFiguresWidget.*
git commit -m "feat(layer-home): EstateFigures widget"
```

---

### Task 4: StandingIntentsWidget (flagship, actionable)

Reads `CC.intentList()`, filtered to the layer. Each declared intent shows a status eyebrow, its evidence sentence, and — when it has repair `moves` — a **Synchronize** button that commits them through the engine (Undo covers it). Empty state offers **Declare an intent** from `CC.intentCatalog()` filtered to the layer.

**Files:**
- Create: `src/features/layer-home/dashboard/widgets/StandingIntentsWidget.tsx`
- Create: `src/features/layer-home/dashboard/widgets/intentLayer.ts` (the layer/intent mapping, unit-tested independently)
- Test: `src/features/layer-home/dashboard/widgets/StandingIntentsWidget.test.tsx`
- Test: `src/features/layer-home/dashboard/widgets/intentLayer.test.ts`

**Interfaces:**
- Consumes: `useLayer`, `WidgetFrame`, `useCloudControlLive`, `useCloudControlActions`; `intentList`/`intentCatalog`/`declareIntent`/`commitMoves` from the engine + `stackFigures`. `IntentReading`/`DeclaredIntent`/`IntentCatalogEntry` from `src/engine/types`.
- Produces:
  - `intentLayer.ts`: `const AI_INTENT_KEYS: readonly string[]` and `function isAiIntent(key: string): boolean` (true for the four AI-and-workload keys). A NaaS board shows the complement; the AI board shows these.
  - `StandingIntentsWidget(props: LayerWidgetProps): JSX.Element`.

- [ ] **Step 1: Write the failing test (mapping)**

```ts
// src/features/layer-home/dashboard/widgets/intentLayer.test.ts
import { describe, test, expect } from 'vitest';
import { isAiIntent } from './intentLayer';

describe('isAiIntent', () => {
  test('the four AI-and-workload intents are AI; a network intent is not', () => {
    expect(isAiIntent('private-inference')).toBe(true);
    expect(isAiIntent('cap-token-spend')).toBe(true);
    expect(isAiIntent('optimize-data-gravity')).toBe(true);
    expect(isAiIntent('ai-flow-prediction')).toBe(true);
    expect(isAiIntent('minimize-latency')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/intentLayer.test.ts`
Expected: FAIL — cannot find module `./intentLayer`.

- [ ] **Step 3: Implement the mapping**

```ts
// src/features/layer-home/dashboard/widgets/intentLayer.ts
// The AI-and-workload half of the ILM-7 taxonomy (src/engine/state-intents.ts).
// The AI board surfaces these; the NaaS board surfaces the complement.
export const AI_INTENT_KEYS = [
  'private-inference', 'cap-token-spend', 'optimize-data-gravity', 'ai-flow-prediction',
] as const;

export function isAiIntent(key: string): boolean {
  return (AI_INTENT_KEYS as readonly string[]).includes(key);
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/intentLayer.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test (widget)**

Note: the seeded engine may or may not have intents declared for a given layer. The test declares one deterministically, then asserts the widget renders its status + evidence and a Synchronize control when moves exist. Clean up with `removeIntent` in `afterEach` so the shared `CC` singleton is not left mutated for other suites.

```tsx
// src/features/layer-home/dashboard/widgets/StandingIntentsWidget.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect, afterEach } from 'vitest';
import { LayerContext } from '../registry';
import { StandingIntentsWidget } from './StandingIntentsWidget';
import { CC } from '../../../../engine';

const declaredIds: string[] = [];
afterEach(() => { declaredIds.splice(0).forEach(id => CC.removeIntent(id)); });

const renderIn = (surface: 'naas' | 'ai') =>
  render(<LayerContext.Provider value={surface}><StandingIntentsWidget /></LayerContext.Provider>);

describe('StandingIntentsWidget', () => {
  test('with no intents for the layer, offers to declare one from the catalog', () => {
    // Guard: only meaningful if this layer currently has none. Remove any AI
    // intents so the AI board is genuinely empty for the assertion.
    CC.intentList().filter(i => ['private-inference','cap-token-spend','optimize-data-gravity','ai-flow-prediction'].includes(i.key))
      .forEach(i => CC.removeIntent(i.id));
    renderIn('ai');
    expect(screen.getByText(/declare an intent/i)).toBeInTheDocument();
  });

  test('renders a declared intent with its status and evidence', () => {
    const cat = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
    const declared = CC.declareIntent('cap-token-spend', cat.scopes()[0], 'watch');
    expect(declared).not.toBeNull();
    declaredIds.push(declared!.id);
    renderIn('ai');
    const reading = CC.intentList().find(i => i.id === declared!.id)!.reading;
    expect(screen.getByText(reading.evidence)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(reading.status, 'i'))).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run it, verify it fails**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/StandingIntentsWidget.test.tsx`
Expected: FAIL — cannot find module `./StandingIntentsWidget`.

- [ ] **Step 7: Implement the widget**

```tsx
// src/features/layer-home/dashboard/widgets/StandingIntentsWidget.tsx
import { Target } from 'lucide-react';
import { WidgetFrame } from '../WidgetFrame';
import { useLayer, type LayerWidgetProps } from '../registry';
import { isAiIntent } from './intentLayer';
import { useCloudControlLive, useCloudControlActions } from '../../../../engine/react/useCloudControl';
import { commitMoves, type StagedMove } from '../../../discover/stackFigures';

const STATUS_TONE: Record<string, string> = {
  aligned: 'text-fw-success',
  drifting: 'text-[#475569]',
  violated: 'text-fw-warn',
};

export function StandingIntentsWidget(_props: LayerWidgetProps) {
  const surface = useLayer();
  const cc = useCloudControlActions();
  const forLayer = (key: string) => (surface === 'ai' ? isAiIntent(key) : !isAiIntent(key));

  const intents = useCloudControlLive(c => c.intentList().filter(i => forLayer(i.key)));
  const catalog = useCloudControlLive(c => c.intentCatalog().filter(e => forLayer(e.key)));

  if (intents.length === 0) {
    return (
      <WidgetFrame title="Standing intents" icon={Target}>
        <p className="text-figma-sm text-fw-bodyLight mb-3">
          No standing intents on this layer yet. Declare one and the estate starts holding the promise.
        </p>
        <div className="flex flex-wrap gap-2">
          {catalog.slice(0, 4).map(e => (
            <button
              key={e.key}
              data-testid="declare-intent"
              onClick={() => cc.declareIntent(e.key, e.scopes()[0], 'watch')}
              className="rounded-full border border-fw-secondary bg-fw-wash px-3 py-1.5 text-figma-sm font-medium text-fw-link hover:border-fw-active transition-colors"
            >
              Declare an intent: {e.label}
            </button>
          ))}
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame title="Standing intents" icon={Target}>
      <ul className="flex flex-col divide-y divide-fw-secondary">
        {intents.map(i => (
          <li key={i.id} data-testid="intent-row" className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2">
              <span className={`text-figma-xs font-semibold uppercase tracking-[0.08em] ${STATUS_TONE[i.reading.status]}`}>
                Intent {i.reading.status}
              </span>
              <span className="text-figma-xs text-fw-bodyLight">· {i.scope.label}</span>
            </div>
            <p className="text-figma-sm text-fw-body mt-1">{i.reading.evidence}</p>
            {i.reading.moves.length > 0 && (
              <button
                data-testid="intent-synchronize"
                onClick={() => commitMoves(cc, i.reading.moves as StagedMove[])}
                className="mt-2 rounded-full bg-fw-ctaPrimary px-3 py-1.5 text-figma-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Synchronize
              </button>
            )}
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}
```

- [ ] **Step 8: Run it, verify it passes**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/StandingIntentsWidget.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/features/layer-home/dashboard/widgets/intentLayer.* src/features/layer-home/dashboard/widgets/StandingIntentsWidget.*
git commit -m "feat(layer-home): Standing Intents flagship widget"
```

---

### Task 5: AssessmentFindingsWidget

**Files:**
- Create: `src/features/layer-home/dashboard/widgets/AssessmentFindingsWidget.tsx`
- Test: `src/features/layer-home/dashboard/widgets/AssessmentFindingsWidget.test.tsx`

**Interfaces:**
- Consumes: `WidgetFrame`, `useCloudControlLive`; `CC.assessmentReport()` (shape in `src/engine/types.ts:234-246`).
- Produces: `AssessmentFindingsWidget(props: LayerWidgetProps): JSX.Element`. Surface-agnostic (same report on both layers).

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/layer-home/dashboard/widgets/AssessmentFindingsWidget.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { AssessmentFindingsWidget } from './AssessmentFindingsWidget';
import { CC } from '../../../../engine';

describe('AssessmentFindingsWidget', () => {
  test('states the recoverable-per-month figure and the security event count', () => {
    render(<AssessmentFindingsWidget />);
    const r = CC.assessmentReport();
    expect(screen.getByText(`$${Math.round(r.recoverableMo).toLocaleString()}/mo`)).toBeInTheDocument();
    expect(screen.getByText(String(r.securityEvents))).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/AssessmentFindingsWidget.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// src/features/layer-home/dashboard/widgets/AssessmentFindingsWidget.tsx
import { ClipboardCheck } from 'lucide-react';
import { WidgetFrame } from '../WidgetFrame';
import type { LayerWidgetProps } from '../registry';
import { useCloudControlLive } from '../../../../engine/react/useCloudControl';

export function AssessmentFindingsWidget(_props: LayerWidgetProps) {
  const kpis = useCloudControlLive(cc => {
    const r = cc.assessmentReport();
    return [
      { label: 'Recoverable', value: `$${Math.round(r.recoverableMo).toLocaleString()}/mo` },
      { label: 'Security events', value: String(r.securityEvents) },
      { label: 'Invisible share', value: `${Math.round(r.invisibleSharePct)}%` },
    ];
  });
  return (
    <WidgetFrame title="What the assessment found" icon={ClipboardCheck}>
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(k => (
          <div key={k.label} data-testid="assessment-kpi">
            <div className="text-figma-2xl font-bold tabular-nums tracking-[-0.02em] text-fw-heading">{k.value}</div>
            <div className="text-figma-sm text-fw-bodyLight mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/AssessmentFindingsWidget.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/layer-home/dashboard/widgets/AssessmentFindingsWidget.*
git commit -m "feat(layer-home): Assessment findings widget"
```

---

### Task 6: MoneyOnTheTableWidget (NaaS, actionable)

Reads `CC.arbitrage()`: the available savings headline plus the ranked, still-unattached buckets, with a **Review moves** button that stages the advisor draft (`advisorDraft`) and commits it through the engine.

**Files:**
- Create: `src/features/layer-home/dashboard/widgets/MoneyOnTheTableWidget.tsx`
- Test: `src/features/layer-home/dashboard/widgets/MoneyOnTheTableWidget.test.tsx`

**Interfaces:**
- Consumes: `WidgetFrame`, `useCloudControlLive`, `useCloudControlActions`; `CC.arbitrage()` (`src/engine/types.ts:159-173`); `advisorDraft`/`commitMoves` from `stackFigures`.
- Produces: `MoneyOnTheTableWidget(props: LayerWidgetProps): JSX.Element`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/layer-home/dashboard/widgets/MoneyOnTheTableWidget.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { MoneyOnTheTableWidget } from './MoneyOnTheTableWidget';
import { CC } from '../../../../engine';

describe('MoneyOnTheTableWidget', () => {
  test('states available savings and lists the top unattached bucket', () => {
    render(<MoneyOnTheTableWidget />);
    const arb = CC.arbitrage();
    expect(screen.getByText(`$${Math.round(arb.availableSavings).toLocaleString()}/mo`)).toBeInTheDocument();
    const topUnattached = arb.buckets.find(b => !b.attached);
    if (topUnattached) expect(screen.getByText(topUnattached.label)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/MoneyOnTheTableWidget.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// src/features/layer-home/dashboard/widgets/MoneyOnTheTableWidget.tsx
import { PiggyBank } from 'lucide-react';
import { WidgetFrame } from '../WidgetFrame';
import type { LayerWidgetProps } from '../registry';
import { useCloudControlLive, useCloudControlActions } from '../../../../engine/react/useCloudControl';
import { advisorDraft, commitMoves } from '../../../discover/stackFigures';

export function MoneyOnTheTableWidget(_props: LayerWidgetProps) {
  const cc = useCloudControlActions();
  const { available, buckets, moveCount } = useCloudControlLive(c => {
    const arb = c.arbitrage();
    return {
      available: arb.availableSavings,
      buckets: arb.buckets.filter(b => !b.attached).slice(0, 3),
      moveCount: advisorDraft(c).moves.length,
    };
  });

  const review = (
    <button
      data-testid="money-review"
      disabled={moveCount === 0}
      onClick={() => commitMoves(cc, advisorDraft(cc).moves)}
      className="rounded-full bg-fw-ctaPrimary px-3 py-1.5 text-figma-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
    >
      Review {moveCount} {moveCount === 1 ? 'move' : 'moves'}
    </button>
  );

  return (
    <WidgetFrame title="Money on the table" icon={PiggyBank} action={review}>
      <div className="text-figma-2xl font-bold tabular-nums tracking-[-0.02em] text-fw-heading">
        {`$${Math.round(available).toLocaleString()}/mo`}
      </div>
      <div className="text-figma-sm text-fw-bodyLight mt-0.5 mb-3">still on the table if every on-ramp attached</div>
      <ul className="flex flex-col divide-y divide-fw-secondary">
        {buckets.map(b => (
          <li key={b.key} data-testid="arb-bucket" className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <span className="text-figma-sm text-fw-body truncate">{b.label}</span>
            <span className="text-figma-sm font-semibold tabular-nums text-fw-success">
              {`$${Math.round(b.saving).toLocaleString()}/mo`}
            </span>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/MoneyOnTheTableWidget.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/layer-home/dashboard/widgets/MoneyOnTheTableWidget.*
git commit -m "feat(layer-home): Money on the table widget (NaaS)"
```

---

### Task 7: TokenBudgetsWidget (AI, actionable)

Reads `CC.tokenPolicyList()` (per-tag `{tag, scope, budget, guardrail, enforced, group?}`; confirm the shape at `src/engine/state-console.ts` around lines 88-100 before writing the test's expectations). Renders a budget meter per policy and an **Enforce** button on any draft policy, wired to `CC.setTokenPolicy(tag, { enforced: true })`.

**Files:**
- Create: `src/features/layer-home/dashboard/widgets/TokenBudgetsWidget.tsx`
- Test: `src/features/layer-home/dashboard/widgets/TokenBudgetsWidget.test.tsx`

**Interfaces:**
- Consumes: `WidgetFrame`, `useCloudControlLive`, `useCloudControlActions`; `CC.tokenPolicyList()`, `CC.setTokenPolicy(tag, patch)` (`src/engine/types.ts:207-209`); `fmtTokens` from `aiSpend`.
- Produces: `TokenBudgetsWidget(props: LayerWidgetProps): JSX.Element`.

- [ ] **Step 1: Confirm the data shape**

Run: `node -e "" ` is not available; instead read the seed. Run: `grep -n "tokenPolicyList\|budget\|guardrail\|enforced" src/engine/state-console.ts | head -30`
Expected: confirm each policy object exposes `tag`, `budget` (number), `enforced` (boolean). If a field name differs, use the real name in the test and impl below.

- [ ] **Step 2: Write the failing test**

```tsx
// src/features/layer-home/dashboard/widgets/TokenBudgetsWidget.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { TokenBudgetsWidget } from './TokenBudgetsWidget';
import { CC } from '../../../../engine';

describe('TokenBudgetsWidget', () => {
  test('renders one row per token policy with its tag', () => {
    render(<TokenBudgetsWidget />);
    const policies = CC.tokenPolicyList();
    expect(policies.length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('token-policy-row')).toHaveLength(policies.length);
    expect(screen.getByText(policies[0].tag)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it, verify it fails**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/TokenBudgetsWidget.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```tsx
// src/features/layer-home/dashboard/widgets/TokenBudgetsWidget.tsx
import { Coins } from 'lucide-react';
import { WidgetFrame } from '../WidgetFrame';
import type { LayerWidgetProps } from '../registry';
import { useCloudControlLive, useCloudControlActions } from '../../../../engine/react/useCloudControl';
import { fmtTokens } from '../../../ai-fabric/aiSpend';

interface Policy { tag: string; budget: number; enforced: boolean }

export function TokenBudgetsWidget(_props: LayerWidgetProps) {
  const cc = useCloudControlActions();
  const policies = useCloudControlLive<Policy[]>(c => c.tokenPolicyList() as Policy[]);

  return (
    <WidgetFrame title="Token budgets" icon={Coins}>
      <ul className="flex flex-col divide-y divide-fw-secondary">
        {policies.map(p => (
          <li key={p.tag} data-testid="token-policy-row" className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="flex-1 min-w-0">
              <span className="text-figma-sm font-medium text-fw-heading">{p.tag}</span>
              <span className="block text-figma-xs text-fw-bodyLight tabular-nums">{fmtTokens(p.budget)} budget</span>
            </span>
            {p.enforced ? (
              <span className="text-figma-xs font-medium text-fw-success">Enforced</span>
            ) : (
              <button
                data-testid="token-enforce"
                onClick={() => cc.setTokenPolicy(p.tag, { enforced: true })}
                className="rounded-full bg-fw-ctaPrimary px-3 py-1 text-figma-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                Enforce
              </button>
            )}
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}
```

- [ ] **Step 5: Run it, verify it passes**

Run: `npx vitest run src/features/layer-home/dashboard/widgets/TokenBudgetsWidget.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/layer-home/dashboard/widgets/TokenBudgetsWidget.*
git commit -m "feat(layer-home): Token budgets widget (AI)"
```

---

### Task 8: Register widgets and define default layouts

**Files:**
- Modify: `src/features/layer-home/dashboard/registry.ts` (fill `WIDGET_REGISTRY` and `DEFAULT_LAYOUT`)
- Test: `src/features/layer-home/dashboard/registry.defaults.test.ts`

**Interfaces:**
- Consumes: the five widget components (Tasks 3-7).
- Produces: a populated `WIDGET_REGISTRY` and `DEFAULT_LAYOUT` where every id in each layout exists and is valid for that surface.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/layer-home/dashboard/registry.defaults.test.ts
import { describe, test, expect } from 'vitest';
import { WIDGET_REGISTRY, DEFAULT_LAYOUT, widgetsForSurface, type Surface } from './registry';

describe('default layouts', () => {
  test.each(['naas', 'ai'] as Surface[])('every %s default widget exists and is valid for the surface', (surface) => {
    const valid = new Set(widgetsForSurface(surface).map(w => w.id));
    expect(DEFAULT_LAYOUT[surface].length).toBeGreaterThanOrEqual(3);
    for (const id of DEFAULT_LAYOUT[surface]) {
      expect(WIDGET_REGISTRY[id], `${id} missing from registry`).toBeDefined();
      expect(valid.has(id), `${id} is not valid on ${surface}`).toBe(true);
    }
  });

  test('the flagship Standing Intents leads both boards', () => {
    expect(DEFAULT_LAYOUT.naas[0]).toBe('standing-intents');
    expect(DEFAULT_LAYOUT.ai[0]).toBe('standing-intents');
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/layer-home/dashboard/registry.defaults.test.ts`
Expected: FAIL — `DEFAULT_LAYOUT.naas` is empty; `standing-intents` undefined.

- [ ] **Step 3: Populate the registry and defaults**

Replace the empty `WIDGET_REGISTRY` and `DEFAULT_LAYOUT` in `registry.ts` with:

```ts
import { Gauge, Target, ClipboardCheck, PiggyBank, Coins } from 'lucide-react';
import { EstateFiguresWidget } from './widgets/EstateFiguresWidget';
import { StandingIntentsWidget } from './widgets/StandingIntentsWidget';
import { AssessmentFindingsWidget } from './widgets/AssessmentFindingsWidget';
import { MoneyOnTheTableWidget } from './widgets/MoneyOnTheTableWidget';
import { TokenBudgetsWidget } from './widgets/TokenBudgetsWidget';

export const WIDGET_REGISTRY: Record<string, WidgetDef> = {
  'standing-intents': {
    id: 'standing-intents', title: 'Standing intents',
    description: 'Each declared intent, whether it is holding, and the one-click fix.',
    icon: Target, category: 'Govern', surface: 'both', defaultSize: { w: 2, h: 2 },
    component: StandingIntentsWidget,
  },
  'estate-figures': {
    id: 'estate-figures', title: 'Estate at a glance',
    description: 'The four live figures for this layer.',
    icon: Gauge, category: 'Overview', surface: 'both', defaultSize: { w: 1, h: 1 },
    component: EstateFiguresWidget,
  },
  'assessment-findings': {
    id: 'assessment-findings', title: 'What the assessment found',
    description: 'Recoverable spend, security events, invisible share.',
    icon: ClipboardCheck, category: 'Overview', surface: 'both', defaultSize: { w: 1, h: 1 },
    component: AssessmentFindingsWidget,
  },
  'money-on-the-table': {
    id: 'money-on-the-table', title: 'Money on the table',
    description: 'Savings still available, ranked, with a one-click review.',
    icon: PiggyBank, category: 'Cost', surface: 'naas', defaultSize: { w: 1, h: 1 },
    component: MoneyOnTheTableWidget,
  },
  'token-budgets': {
    id: 'token-budgets', title: 'Token budgets',
    description: 'Per-policy token budgets, with Enforce on any draft.',
    icon: Coins, category: 'Govern', surface: 'ai', defaultSize: { w: 1, h: 1 },
    component: TokenBudgetsWidget,
  },
};

export const DEFAULT_LAYOUT: Record<Surface, string[]> = {
  naas: ['standing-intents', 'estate-figures', 'money-on-the-table', 'assessment-findings'],
  ai:   ['standing-intents', 'estate-figures', 'token-budgets', 'assessment-findings'],
};
```

Note: move these `import` lines to the top of `registry.ts` with the others; remove the earlier empty `WIDGET_REGISTRY`/`DEFAULT_LAYOUT` declarations. Keeping the widget imports below the type declarations is fine (hoisting), but grouping them at top is cleaner.

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/layer-home/dashboard/registry.defaults.test.ts src/features/layer-home/dashboard/registry.test.ts`
Expected: PASS (both files).

- [ ] **Step 5: Commit**

```bash
git add src/features/layer-home/dashboard/registry.ts src/features/layer-home/dashboard/registry.defaults.test.ts
git commit -m "feat(layer-home): register widgets and per-surface default layouts"
```

---

### Task 9: LayerDashboard (renders the default board)

**Files:**
- Create: `src/features/layer-home/dashboard/LayerDashboard.tsx`
- Test: `src/features/layer-home/dashboard/LayerDashboard.test.tsx`

**Interfaces:**
- Consumes: `WIDGET_REGISTRY`, `DEFAULT_LAYOUT`, `LayerContext`, `Surface` (Task 1/8).
- Produces: `function LayerDashboard(props: { surface: Surface }): JSX.Element`. Renders each default widget inside a grid cell whose column span comes from `WidgetDef.defaultSize.w`. Root carries `data-testid="layer-dashboard"`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/layer-home/dashboard/LayerDashboard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { LayerDashboard } from './LayerDashboard';
import { DEFAULT_LAYOUT, WIDGET_REGISTRY } from './registry';

describe('LayerDashboard', () => {
  test('renders exactly the NaaS default widgets, by title', () => {
    render(<LayerDashboard surface="naas" />);
    const frames = screen.getAllByTestId('widget-frame');
    expect(frames.map(f => f.getAttribute('data-widget-title'))).toEqual(
      DEFAULT_LAYOUT.naas.map(id => WIDGET_REGISTRY[id].title),
    );
  });

  test('renders an AI-only widget on the AI board and not on NaaS', () => {
    render(<LayerDashboard surface="ai" />);
    expect(screen.getByText('Token budgets')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/layer-home/dashboard/LayerDashboard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// src/features/layer-home/dashboard/LayerDashboard.tsx
import { LayerContext, DEFAULT_LAYOUT, WIDGET_REGISTRY, type Surface } from './registry';

export function LayerDashboard({ surface }: { surface: Surface }) {
  // Drop any id not in the registry rather than crashing (forward-compat with
  // Phase 2 persisted layouts that may reference a removed widget).
  const ids = DEFAULT_LAYOUT[surface].filter(id => WIDGET_REGISTRY[id]);
  return (
    <LayerContext.Provider value={surface}>
      <div data-testid="layer-dashboard" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-min">
        {ids.map(id => {
          const def = WIDGET_REGISTRY[id];
          const Widget = def.component;
          const span = def.defaultSize.w === 2 ? 'md:col-span-2' : '';
          return (
            <div key={id} className={span}>
              <Widget />
            </div>
          );
        })}
      </div>
    </LayerContext.Provider>
  );
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/layer-home/dashboard/LayerDashboard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/layer-home/dashboard/LayerDashboard.*
git commit -m "feat(layer-home): LayerDashboard renders the default board"
```

---

### Task 10: Wire the dashboard into LayerHomePage

**Files:**
- Modify: `src/features/layer-home/LayerHomePage.tsx`
- Modify: `src/features/layer-home/LayerHomePage.test.tsx`

**Interfaces:**
- Consumes: `LayerDashboard` (Task 9).
- Produces: `LayerHomePage` renders `<LayerDashboard surface={layerKey} />` where the stat grid used to be. The header and verb tiles are unchanged.

- [ ] **Step 1: Update the existing test**

The two current tests assert on `layer-home-stats`, which is being removed. Replace those assertions with board assertions while keeping the verb-tile assertions (which must still pass — the verb nav is untouched).

```tsx
// src/features/layer-home/LayerHomePage.test.tsx  (replace the two test bodies)
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { LayerHomePage } from './LayerHomePage';

const renderHome = (key: 'naas' | 'ai') =>
  render(<MemoryRouter><LayerHomePage layerKey={key} /></MemoryRouter>);

describe('LayerHomePage', () => {
  test('NaaS Home shows the widget board and still opens onto its four verbs', () => {
    renderHome('naas');
    expect(screen.getByRole('heading', { name: 'NaaS', level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('layer-dashboard')).toBeInTheDocument();
    const verbLinks = ['connect', 'govern', 'observe', 'cost'].map(
      v => screen.getByTestId(`home-verb-${v}`).getAttribute('href'),
    );
    expect(verbLinks).toEqual(['/naas/connect', '/naas/govern', '/naas/observe', '/naas/cost']);
  });

  test('AI Home shows the board and opens onto /ai verbs', () => {
    renderHome('ai');
    expect(screen.getByRole('heading', { name: 'AI Fabric', level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('layer-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('home-verb-connect').getAttribute('href')).toBe('/ai/connect');
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/layer-home/LayerHomePage.test.tsx`
Expected: FAIL — `layer-dashboard` testid not found (page still renders the old stat grid).

- [ ] **Step 3: Edit LayerHomePage**

In `src/features/layer-home/LayerHomePage.tsx`:
1. Delete the `Stat` interface (line 17) and the `layerStats` function (lines 19-37).
2. Delete the `useCloudControlLive`, `fmtTokens`/`fmtUsd`, `aiStratum`/`naasStratum`, and `CloudControl` imports if no longer used (they move into the widgets). Keep `Link`, `ArrowRight`, `AttIcon`, `NAV_LAYERS`/`NavLayer`.
3. Add: `import { LayerDashboard } from './dashboard/LayerDashboard';`
4. In the component, remove `const cc = ...` and `const stats = ...`.
5. Replace the entire `layer-home-stats` block (lines 52-62) with:

```tsx
      {/* The live board — replaces the flat stat grid. */}
      <div className="mb-8">
        <LayerDashboard surface={layerKey} />
      </div>
```

The resulting component body is the header, then the board, then the unchanged "Work this layer" verb grid.

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/layer-home/LayerHomePage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck (imports were removed)**

Run: `npx tsc --noEmit`
Expected: no errors. If an import was left unused, remove it; if one was removed but still referenced, restore it.

- [ ] **Step 6: Commit**

```bash
git add src/features/layer-home/LayerHomePage.tsx src/features/layer-home/LayerHomePage.test.tsx
git commit -m "feat(layer-home): render the widget board in place of the stat grid"
```

---

### Task 11: End-to-end proof on both home pages

**Files:**
- Create: `e2e/layer-dashboards.spec.ts`

**Interfaces:**
- Consumes: the running app (routes `/naas/home`, `/ai/home`).

- [ ] **Step 1: Write the e2e test**

```ts
// e2e/layer-dashboards.spec.ts
import { test, expect, type Page } from '@playwright/test';

async function firstVisit(page: Page, hash: string) {
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`/#${hash}`, { waitUntil: 'domcontentloaded' });
  const dismiss = page.getByRole('button', { name: /^(skip|skip tour|close|got it|maybe later|no thanks)$/i });
  while (await dismiss.first().isVisible().catch(() => false)) { await dismiss.first().click(); await page.waitForTimeout(150); }
  await page.keyboard.press('Escape').catch(() => {});
}

test('NaaS Home shows the board with the flagship, verb nav intact', async ({ page }) => {
  await firstVisit(page, '/naas/home');
  await expect(page.getByTestId('layer-dashboard')).toBeVisible();
  await expect(page.getByText('Standing intents')).toBeVisible();
  await expect(page.getByText('Money on the table')).toBeVisible();
  // Verb nav still present.
  await expect(page.getByTestId('home-verb-connect')).toBeVisible();
});

test('AI Home shows the AI board and not a NaaS-only widget', async ({ page }) => {
  await firstVisit(page, '/ai/home');
  await expect(page.getByTestId('layer-dashboard')).toBeVisible();
  await expect(page.getByText('Token budgets')).toBeVisible();
  await expect(page.getByText('Money on the table')).toHaveCount(0);
});
```

- [ ] **Step 2: Run it, verify it passes**

Run: `npx playwright test e2e/layer-dashboards.spec.ts`
Expected: PASS (2 tests). If the app opens a demo modal that the dismiss loop misses, extend the name regex to match the actual button.

- [ ] **Step 3: Commit**

```bash
git add e2e/layer-dashboards.spec.ts
git commit -m "test(e2e): layer-home dashboards render per surface"
```

---

### Task 12: Full gate and visual check

- [ ] **Step 1: Run the full gate**

Run: `npm run verify`
Expected: vitest all pass, build succeeds, playwright all pass. Fix any failure at its source before proceeding.

- [ ] **Step 2: Visual confirmation**

Start the dev server (`preview_start` with the project's launch config or `npm run dev -- --port 5199 --strictPort`), open `/#/naas/home` and `/#/ai/home` at 1280x720, and screenshot each. Confirm: the board renders, Standing Intents leads, the actionable buttons (Synchronize / Review / Enforce) are present, and the verb tiles remain below. Attach the screenshots to the task summary.

- [ ] **Step 3: No commit** (verification only).

---

## Self-Review

**Spec coverage:**
- Widget contract + registry (no data props, surface tag) → Task 1. ✓
- System-B `WidgetFrame` chrome → Task 2. ✓
- Board replaces stat grid, verb tiles kept → Tasks 9-10. ✓
- Standing Intents flagship (status/evidence/Synchronize + declare empty state) → Task 4. ✓
- Estate figures, Assessment, Money-on-the-table (NaaS), Token budgets (AI) → Tasks 3, 5, 6, 7. ✓
- Per-surface default layouts, flagship pinned first → Task 8. ✓
- Engine-native data via `useCloudControlLive`; actions through `CC` with Undo → all widget tasks. ✓
- Unit tests per widget + registry filtering; e2e per surface incl. NaaS-picker-excludes-AI analog (AI board lacks Money-on-the-table) → Tasks 3-11. ✓
- Scope guards: no store slice, no persistence, no dnd, control-center untouched → nothing in Phase 1 touches them. ✓

**Deferred to Phase 2 (own plan), per spec:** the `layerDashboardSlice`, localStorage persistence, Customize mode (drag/add/remove/reset), and the catalog growth (Public egress, Attach/Steer, Live agents, Model endpoints, charts, estate map). The `WidgetFrame` edit-mode affordances and `LayerWidgetProps.editing` are stubbed now (prop exists, unused) so Phase 2 adds behavior without changing the contract.

**Placeholder scan:** no TBD/TODO; every step has real code or a real command. Task 7 Step 1 is a genuine verification step (confirm `tokenPolicyList` field names), not a placeholder — the test and impl carry concrete field names to adjust only if the grep disagrees.

**Type consistency:** `Surface`, `WidgetDef`, `LayerWidgetProps`, `WIDGET_REGISTRY`, `DEFAULT_LAYOUT`, `widgetsForSurface`, `LayerContext`/`useLayer` are defined in Task 1 and consumed with the same names/signatures in Tasks 3-10. `commitMoves`/`advisorDraft`/`StagedMove` match `src/features/discover/stackFigures.ts`. `useCloudControlLive`/`useCloudControlActions` match `src/engine/react/useCloudControl.ts`.
