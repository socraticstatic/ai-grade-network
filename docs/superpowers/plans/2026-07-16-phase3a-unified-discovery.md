# Phase 3A — Unified Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggregate the split discovery (network Discover + AI-Fabric provider list) into one cloud/provider-keyed inventory where each row shows both its network facet (on-ramp, attach state, path) and its AI facet (model endpoints, connected/pending, models).

**Architecture:** A pure engine-selector (`useUnifiedInventory`) joins `CC.clouds` + `CC.onramps` (network) with `CC.modelCatalog()` (AI) into `InventoryRow[]`; a presentational `DiscoveryRow` renders each row's two facets; `UnifiedDiscovery` composes the list with All/Network/AI lens chips and mounts on the Discover route. No new engine mutations — reuse `activateOnramp`.

**Tech Stack:** React + TypeScript, Vite, Vitest + React Testing Library, Tailwind (light Flywheel tokens), `useCloudControl`/`useCloudControlActions` engine hooks.

## Global Constraints

- Engine-backed only via `useCloudControl(selector)` (object-selector safe) / `useCloudControlActions()`. No mock/local data for inventory content.
- Deterministic: NO `Date.now()` / `Math.random()` in selectors or render.
- Light Flywheel theme only: reuse existing classes — `rounded-2xl border border-fw-secondary bg-fw-base`, `bg-fw-wash`, `text-fw-heading`, `text-fw-body`, `text-fw-bodyLight`, `text-figma-xs`/`text-figma-sm`, uppercase `tracking-wide` headers. No dark-navy palette. No new green/amber unless it is an existing `fw-*` status token.
- Reuse cloud marks: each `CC.clouds` entry has `color` and `mk`; use those for the row mark (match `EstateTable`). AI-only providers (no cloud) use a neutral mark + provider name.
- **Verified repo facts (use exactly):** the engine hook is `import { useCloudControl } from '../../engine/react/useCloudControl'`. Tests import the engine singleton `import { CC } from '../../engine'` and render components with a plain `render(<Component/>)` — there is NO provider wrapper (see `src/features/connect/RouteTopology.test.tsx`). Status tokens that EXIST: `fw-success`, `fw-successLight`, `fw-warn`, `fw-warnLight`, `fw-base`, `fw-body`, `fw-bodyLight`, `fw-heading`, `fw-secondary`. `fw-successWash` does NOT exist — never use it. `text-figma-2xl` exists.
- Keep `src/__tests__/rebrand.test.ts` green (no "NetBond"/legacy strings). `npm run build` + `npx tsc --noEmit` clean. Run vitest with the repo's existing config (no `--project` flags).
- Do NOT modify `~/Developer/cloud-control` (old repo) or `att-netbond-sdci`.

## Engine shapes (verified — use these exact fields)

- `CC.clouds`: `{ id:'aws'|'azure'|'gcp'|'oci'|'cw'|'neb', name, color, mk, workloads, attached, partial?, ai? }[]`.
- `CC.onramps`: `{ id, name, targets: [cloudId, regionId][], active }[]`.
- `CC.modelCatalog()`: `{ id, name, kind, endpoint /* provider label e.g. 'CoreWeave','OpenAI' */, cloud /* cloud id or null */, p50, price, ready /* connected vs pending */ }[]`.
- `CC.counts()`: `{ clouds, ... }`. `CC.actions.activateOnramp(onrampId)`.

## File Structure

- Create `src/features/discover/useUnifiedInventory.ts` — the join selector + `InventoryRow` type.
- Create `src/features/discover/DiscoveryRow.tsx` — one presentational row (collapsed chips + expandable facets).
- Create `src/features/discover/UnifiedDiscovery.tsx` — page: lens chips + list.
- Modify the Discover route/page to render `UnifiedDiscovery` (keep `EstateTable` reachable inside the Network facet or as the network detail).
- Modify `src/features/ai-fabric/ModelCatalog.tsx` — provider *discovery* responsibility moves to Discovery; ModelCatalog keeps only governance-relevant model rows (or a link to Discovery). Minimal change: no behavior removed that a test depends on.
- Tests alongside each component.

---

## Task 1: `useUnifiedInventory` join selector

**Files:**
- Create: `src/features/discover/useUnifiedInventory.ts`
- Test: `src/features/discover/useUnifiedInventory.test.ts`

**Interfaces:**
- Produces:
```ts
export interface NetworkFacet { onrampId: string | null; onrampName: string | null; attached: boolean; workloads: number; path: 'private' | 'public'; }
export interface AiFacet { status: 'connected' | 'pending'; provider: string; models: { id: string; name: string; ready: boolean }[]; readyCount: number; }
export interface InventoryRow { key: string; name: string; mark: { color: string; label: string }; network: NetworkFacet | null; ai: AiFacet | null; }
export function buildInventory(cc: EngineApi): InventoryRow[]; // pure
export function useUnifiedInventory(): InventoryRow[];         // = useCloudControl(buildInventory)
```
- Consumes: `CC.clouds`, `CC.onramps`, `CC.modelCatalog()`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildInventory } from './useUnifiedInventory';
import { CC } from '../../engine'; // engine singleton, same import the other tests use

describe('buildInventory', () => {
  const cc = CC;
  const rows = buildInventory(cc);

  it('covers every cloud that has a network on-ramp or estate, plus AI-only providers, with no dupes', () => {
    const keys = rows.map(r => r.key);
    expect(new Set(keys).size).toBe(keys.length);              // no duplicates
    for (const c of cc.clouds) expect(keys).toContain(c.id);   // no cloud dropped
    // an external model (cloud === null) becomes an AI-only provider row
    const external = cc.modelCatalog().find(m => m.cloud === null);
    if (external) expect(keys).toContain(external.endpoint);
  });

  it('a cloud with both an on-ramp and a model has both facets; AI-only rows have network === null', () => {
    const cw = rows.find(r => r.key === 'cw')!;               // CoreWeave: on-ramp + helion-70b
    expect(cw.network).not.toBeNull();
    expect(cw.ai).not.toBeNull();
    expect(cw.ai!.models.length).toBeGreaterThan(0);
    const ext = rows.find(r => r.ai && !r.network);
    if (ext) { expect(ext.network).toBeNull(); expect(ext.ai).not.toBeNull(); }
  });

  it('is deterministic (identical across two builds)', () => {
    expect(buildInventory(cc)).toEqual(buildInventory(cc));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/features/discover/useUnifiedInventory.test.ts`
Expected: FAIL — module not found / `buildInventory` undefined.

- [ ] **Step 3: Implement the selector**

```ts
import { useCloudControl } from '../../engine/react/useCloudControl';

export interface NetworkFacet { onrampId: string | null; onrampName: string | null; attached: boolean; workloads: number; path: 'private' | 'public'; }
export interface AiFacet { status: 'connected' | 'pending'; provider: string; models: { id: string; name: string; ready: boolean }[]; readyCount: number; }
export interface InventoryRow { key: string; name: string; mark: { color: string; label: string }; network: NetworkFacet | null; ai: AiFacet | null; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cc = any; // replace with the engine's exported type if available

export function buildInventory(cc: Cc): InventoryRow[] {
  const clouds = cc.clouds as { id: string; name: string; color: string; mk: string; workloads: number; attached: boolean }[];
  const onramps = cc.onramps as { id: string; name: string; targets: [string, string][]; active: boolean }[];
  const models = cc.modelCatalog() as { id: string; name: string; endpoint: string; cloud: string | null; ready: boolean }[];

  const modelsByCloud = new Map<string, typeof models>();
  const externalByProvider = new Map<string, typeof models>();
  for (const m of models) {
    if (m.cloud) { (modelsByCloud.get(m.cloud) ?? modelsByCloud.set(m.cloud, []).get(m.cloud)!).push(m); }
    else { (externalByProvider.get(m.endpoint) ?? externalByProvider.set(m.endpoint, []).get(m.endpoint)!).push(m); }
  }

  const aiFacet = (list: typeof models, provider: string): AiFacet => {
    const readyCount = list.filter(m => m.ready).length;
    return { status: readyCount > 0 ? 'connected' : 'pending', provider, models: list.map(m => ({ id: m.id, name: m.name, ready: m.ready })), readyCount };
  };

  const rows: InventoryRow[] = clouds.map(c => {
    const ramp = onramps.find(o => o.targets.some(([cid]) => cid === c.id)) ?? null;
    const network: NetworkFacet = {
      onrampId: ramp?.id ?? null,
      onrampName: ramp?.name ?? null,
      attached: c.attached,
      workloads: c.workloads,
      path: c.attached ? 'private' : 'public',
    };
    const list = modelsByCloud.get(c.id);
    return { key: c.id, name: c.name, mark: { color: c.color, label: c.mk }, network, ai: list ? aiFacet(list, c.name) : null };
  });

  // AI-only providers (external models with cloud === null), keyed by provider label
  for (const [provider, list] of externalByProvider) {
    rows.push({ key: provider, name: provider, mark: { color: '#6E82A4', label: provider.slice(0, 2).toUpperCase() }, network: null, ai: aiFacet(list, provider) });
  }

  return rows;
}

export function useUnifiedInventory(): InventoryRow[] {
  return useCloudControl(buildInventory);
}
```

> Engine imports are pinned in Global Constraints: `useCloudControl` from `'../../engine/react/useCloudControl'`; the test uses the singleton `import { CC } from '../../engine'` and passes `CC` to `buildInventory`. Match `src/features/connect/RouteTopology.tsx`/`.test.tsx` for the exact pattern.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/features/discover/useUnifiedInventory.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add src/features/discover/useUnifiedInventory.ts src/features/discover/useUnifiedInventory.test.ts
git commit -m "feat: useUnifiedInventory — join network on-ramps + AI endpoints into one inventory"
```

---

## Task 2: `DiscoveryRow` (collapsed chips + expandable facets)

**Files:**
- Create: `src/features/discover/DiscoveryRow.tsx`
- Test: `src/features/discover/DiscoveryRow.test.tsx`

**Interfaces:**
- Consumes: `InventoryRow` (Task 1).
- Produces: `export function DiscoveryRow({ row, lens }: { row: InventoryRow; lens: 'all' | 'network' | 'ai' }): JSX.Element` — collapsed by default; a header button toggles an expanded region with a Network panel and an AI panel. When `lens==='network'` the AI panel is dimmed (`opacity-40`); when `lens==='ai'` the Network panel is dimmed.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DiscoveryRow } from './DiscoveryRow';
import type { InventoryRow } from './useUnifiedInventory';

const both: InventoryRow = {
  key: 'cw', name: 'CoreWeave', mark: { color: '#9a7cff', label: 'CW' },
  network: { onrampId: 'nb2', onrampName: 'NetBond Adv · PE-DAL-01', attached: false, workloads: 6, path: 'public' },
  ai: { status: 'connected', provider: 'CoreWeave', models: [{ id: 'helion-70b', name: 'helion-70b', ready: true }], readyCount: 1 },
};

describe('DiscoveryRow', () => {
  it('shows both a Network chip and an AI chip when both facets exist', () => {
    render(<DiscoveryRow row={both} lens="all" />);
    expect(screen.getByText('CoreWeave')).toBeInTheDocument();
    expect(screen.getByText(/network/i)).toBeInTheDocument();
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('expands to reveal both facet panels', () => {
    render(<DiscoveryRow row={both} lens="all" />);
    fireEvent.click(screen.getByRole('button', { name: /coreweave/i }));
    expect(screen.getByText(/helion-70b/i)).toBeInTheDocument();      // AI facet content
    expect(screen.getByText(/PE-DAL-01/i)).toBeInTheDocument();       // network facet content
  });

  it('dims the non-selected facet under a lens', () => {
    const { container } = render(<DiscoveryRow row={both} lens="network" />);
    fireEvent.click(screen.getByRole('button', { name: /coreweave/i }));
    expect(container.querySelector('[data-facet="ai"]')?.className).toMatch(/opacity-40/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/features/discover/DiscoveryRow.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the row**

```tsx
import { useState } from 'react';
import type { InventoryRow } from './useUnifiedInventory';

function Chip({ tone, children }: { tone: 'private' | 'public' | 'connected' | 'pending' | 'na'; children: React.ReactNode }) {
  const map: Record<string, string> = {
    private: 'bg-fw-successLight text-fw-success border-fw-success',
    public: 'bg-fw-wash text-fw-bodyLight border-fw-secondary',
    connected: 'bg-fw-successLight text-fw-success border-fw-success',
    pending: 'bg-fw-warnLight text-fw-warn border-fw-warn',
    na: 'bg-fw-wash text-fw-bodyLight border-fw-secondary',
  };
  return <span className={`inline-flex items-center h-6 px-2 rounded-full border text-figma-xs font-medium ${map[tone]}`}>{children}</span>;
}

export function DiscoveryRow({ row, lens }: { row: InventoryRow; lens: 'all' | 'network' | 'ai' }) {
  const [open, setOpen] = useState(false);
  const dimNet = lens === 'ai' ? 'opacity-40' : '';
  const dimAi = lens === 'network' ? 'opacity-40' : '';
  return (
    <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} aria-label={row.name}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-fw-wash/60 transition-colors">
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[10px] font-bold text-white" style={{ background: row.mark.color }}>{row.mark.label}</span>
        <span className="font-medium text-fw-heading flex-1">{row.name}</span>
        <span className={`flex items-center gap-2 ${dimNet}`}>
          <span className="text-figma-xs uppercase tracking-wide text-fw-bodyLight">Network</span>
          {row.network ? <Chip tone={row.network.path}>{row.network.path === 'private' ? 'Private' : 'Public'}</Chip> : <Chip tone="na">n/a</Chip>}
        </span>
        <span className={`flex items-center gap-2 ${dimAi}`}>
          <span className="text-figma-xs uppercase tracking-wide text-fw-bodyLight">AI</span>
          {row.ai ? <Chip tone={row.ai.status}>{row.ai.status === 'connected' ? 'Connected' : 'Pending'}</Chip> : <Chip tone="na">n/a</Chip>}
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 pb-4 pt-1 border-t border-fw-secondary">
          <div data-facet="network" className={dimNet}>
            <div className="text-figma-xs uppercase tracking-wide text-fw-bodyLight mb-1">Network</div>
            {row.network ? (
              <div className="text-figma-sm text-fw-body space-y-0.5">
                <div>{row.network.onrampName ?? 'No on-ramp'}</div>
                <div className="text-fw-bodyLight">{row.network.workloads} workloads · {row.network.path} path{row.network.attached ? ' · attached' : ''}</div>
              </div>
            ) : <div className="text-figma-sm text-fw-bodyLight">No network footprint</div>}
          </div>
          <div data-facet="ai" className={dimAi}>
            <div className="text-figma-xs uppercase tracking-wide text-fw-bodyLight mb-1">AI</div>
            {row.ai ? (
              <div className="text-figma-sm text-fw-body space-y-0.5">
                <div className="text-fw-bodyLight">{row.ai.provider} · {row.ai.readyCount}/{row.ai.models.length} ready</div>
                {row.ai.models.map(m => <div key={m.id}>{m.name}{m.ready ? '' : ' · pending'}</div>)}
              </div>
            ) : <div className="text-figma-sm text-fw-bodyLight">No AI endpoints</div>}
          </div>
        </div>
      )}
    </div>
  );
}
```

> If any `fw-success`/`fw-successWash` token does not exist in `tailwind.config.js`, use the nearest existing status token (grep `fw-` in the config) or a literal Flywheel hex — do NOT introduce a class that compiles to nothing (see the Phase-2 stroke-token bug). Verify the chip renders a visible color in the dev server.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/features/discover/DiscoveryRow.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/DiscoveryRow.tsx src/features/discover/DiscoveryRow.test.tsx
git commit -m "feat: DiscoveryRow — collapsed network/AI chips, expandable dual facets"
```

---

## Task 3: `UnifiedDiscovery` page + lens chips, mounted on Discover

**Files:**
- Create: `src/features/discover/UnifiedDiscovery.tsx`
- Test: `src/features/discover/UnifiedDiscovery.test.tsx`
- Modify: the Discover page/route entry (find the component the Discover route renders — likely `src/features/discover/DiscoverPage.tsx` or the route table in `src/App.tsx`/router) to render `<UnifiedDiscovery />`.

**Interfaces:**
- Consumes: `useUnifiedInventory` (Task 1), `DiscoveryRow` (Task 2), `useCloudControlActions` for the attach action.
- Produces: `export function UnifiedDiscovery(): JSX.Element` — header + All/Network/AI lens chips (local `useState`) + a list of `DiscoveryRow` for every inventory row.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedDiscovery } from './UnifiedDiscovery';
// No provider wrapper — the engine is a singleton read via useCloudControl (see RouteTopology.test.tsx).

describe('UnifiedDiscovery', () => {
  it('renders one row per inventory entry and the three lens chips', () => {
    render(<UnifiedDiscovery />);
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^network$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ai$/i })).toBeInTheDocument();
    expect(screen.getByText('CoreWeave')).toBeInTheDocument();  // a joined row
    expect(screen.getByText('AWS')).toBeInTheDocument();
  });

  it('selecting the Network lens marks it active', () => {
    render(<UnifiedDiscovery />);
    const net = screen.getByRole('button', { name: /^network$/i });
    fireEvent.click(net);
    expect(net.getAttribute('aria-pressed')).toBe('true');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/features/discover/UnifiedDiscovery.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the page**

```tsx
import { useState } from 'react';
import { useUnifiedInventory } from './useUnifiedInventory';
import { DiscoveryRow } from './DiscoveryRow';

type Lens = 'all' | 'network' | 'ai';

export function UnifiedDiscovery() {
  const rows = useUnifiedInventory();
  const [lens, setLens] = useState<Lens>('all');
  const visible = rows.filter(r => lens === 'all' ? true : lens === 'network' ? r.network : r.ai);
  const chips: { id: Lens; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'network', label: 'Network' }, { id: 'ai', label: 'AI' }];
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-figma-2xl font-semibold text-fw-heading">Discover</h1>
        <p className="text-figma-sm text-fw-bodyLight">One inventory — network on-ramps and AI endpoints across every cloud and provider.</p>
      </div>
      <div className="flex items-center gap-2">
        {chips.map(c => (
          <button key={c.id} type="button" aria-pressed={lens === c.id} onClick={() => setLens(c.id)}
            className={`h-8 px-3 rounded-full border text-figma-xs font-medium transition-colors ${lens === c.id ? 'bg-fw-heading text-white border-fw-heading' : 'bg-fw-base text-fw-body border-fw-secondary hover:bg-fw-wash'}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {visible.map(r => <DiscoveryRow key={r.key} row={r} lens={lens} />)}
      </div>
    </div>
  );
}
```

> `text-figma-2xl` exists (verified). No provider wrapper needed in the test — plain `render()` (the engine is a singleton). If the current DiscoverPage uses a different heading size, match it for consistency.

- [ ] **Step 4: Mount on the Discover route**

Find what the Discover route renders (grep `discover` in the router / `src/App.tsx` and the current `DiscoverPage`). Replace its body with `<UnifiedDiscovery />` (preserve any page chrome/layout wrapper). Keep the old `EstateTable` importable for the network detail if referenced, but the primary Discover view is now `UnifiedDiscovery`.

- [ ] **Step 5: Run tests + build**

Run: `npx vitest run src/features/discover` → all pass.
Run: `npm run build` → green. `npx tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/discover/UnifiedDiscovery.tsx src/features/discover/UnifiedDiscovery.test.tsx
git add -A   # include the route/page change
git commit -m "feat: UnifiedDiscovery page with All/Network/AI lens, mounted on Discover"
```

---

## Task 4: Move provider-discovery out of AI Fabric; reconcile ModelCatalog

**Files:**
- Modify: `src/features/ai-fabric/ModelCatalog.tsx`
- Modify: `src/features/ai-fabric/AiFabricPage.tsx` (if it frames ModelCatalog as "discovery")
- Test: `src/features/ai-fabric/AiFabricPage.test.tsx` (keep green; adjust only if an assertion literally depended on ModelCatalog being the provider-discovery surface)

**Interfaces:**
- Consumes: nothing new. Removes the *discovery* framing from AI Fabric so Discovery is the single source; AI Fabric keeps governance-relevant model context (token routing / readiness as it pertains to policy), not provider onboarding.

- [ ] **Step 1: Assess current ModelCatalog role**

Read `ModelCatalog.tsx` and `AiFabricPage.tsx`. Identify whether ModelCatalog presents provider *onboarding/discovery* (connected/pending, add-provider) vs governance model context. Only the discovery framing moves.

- [ ] **Step 2: Write/adjust the failing test**

If AI Fabric currently asserts a "discovery"/"providers" heading that should now live in Discovery, update that test to assert AI Fabric instead links to Discovery (e.g. a "Discover providers" link/copy), and that Discovery owns provider status. Example assertion to add in `AiFabricPage.test.tsx`:

```tsx
it('AI Fabric points provider discovery to the Discover surface (no duplicate onboarding here)', () => {
  render(<AiFabricPage />);
  // ModelCatalog still shows governed models, but the provider-onboarding/discovery affordance is gone from AI Fabric
  expect(screen.queryByText(/add provider/i)).toBeNull();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/features/ai-fabric/AiFabricPage.test.tsx`
Expected: FAIL if an "Add Provider"/onboarding affordance still exists in AI Fabric.

- [ ] **Step 4: Make the change**

Remove any provider-onboarding/discovery affordance from ModelCatalog/AI Fabric (e.g. an "Add Provider" button or connected/pending provider cards duplicating Discovery). Keep the governed-model list ModelCatalog shows for policy context. If nothing discovery-like exists there, this task is a no-op verification — record that in the report and skip to Step 6.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/features/ai-fabric` → pass.

- [ ] **Step 6: Full green + commit**

Run: `npx vitest run` (full) → pass. `npm run build` → green. `npx tsc --noEmit` → clean. Confirm `src/__tests__/rebrand.test.ts` green.
```bash
git add -A
git commit -m "refactor: AI Fabric defers provider discovery to unified Discovery"
```

---

## Self-Review

**Spec coverage (Feature A):**
- Unified rows keyed by cloud/provider, both facets → Task 1 (`buildInventory`) + Task 2 (`DiscoveryRow`). ✓
- Join on shared cloud key; provider-only (external) rows → Task 1 (external models → provider rows). ✓
- Collapsed chips + expanded facets → Task 2. ✓
- Lens (All/Network/AI) within one page/list → Task 3. ✓
- Mounted on Discover; AI Fabric/Configuration no longer the discovery home → Task 3 (mount) + Task 4 (defer). ✓
- Engine-backed, deterministic, reuse `activateOnramp` → Global Constraints + Task 1 (pure) . ✓
- Light Flywheel theme, cloud marks → Task 2/3 classes + `color`/`mk`. ✓
- Tests: deterministic join covering all keys, both-facet render, lens dim, page rows+chips → Tasks 1–3. ✓

**Placeholder scan:** engine-import path and a couple token names (`fw-success*`, `text-figma-2xl`) are flagged as "confirm against existing code" rather than assumed — each has an explicit fallback instruction (use existing token / match existing page), not a bare TODO. Test-wrapper for the engine provider is directed to copy the existing `*.test.tsx` pattern. These are grounding checks, not gaps.

**Type consistency:** `InventoryRow`/`NetworkFacet`/`AiFacet` defined in Task 1 are consumed unchanged in Tasks 2–3. `lens: 'all'|'network'|'ai'` consistent between `UnifiedDiscovery` and `DiscoveryRow`. `buildInventory(cc)` (pure) vs `useUnifiedInventory()` (hook) both exported and used correctly.

## Deferred to Phase 3B

Dual observability (shared `ObservabilityShell` + network/AI bindings, briefing rail, records table, KPI strip). Separate plan.
