# Phase 3B — Dual Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bring both network and AI observability to the AI-Fabric-Insights pattern (KPI strip + traffic-flow panel with tabs + records table with group-by/filters + AI briefing rail) via ONE shared shell driven by two engine bindings (bytes / tokens).

**Architecture:** `ObservabilityShell` is a presentational component driven by an `ObservabilityBinding` prop; it owns UI state (time range, flow tab, group-by, filters). `networkBinding(cc)` and `aiBinding(cc)` are pure builders that read engine selectors and return the binding data. Network binding mounts on Observe; AI binding mounts as an AI-Fabric → Observability sub-view.

**Tech Stack:** React + TS, Vite, Vitest + RTL, Tailwind (light Flywheel), `useCloudControl` hook. Reuse existing `observe/TelemetryCharts.tsx` / `observe/TokenCharts.tsx` charting — no new charting dep.

## Global Constraints

- Engine-backed via `import { useCloudControl } from '../../engine/react/useCloudControl'`; tests import singleton `import { CC } from '../../engine'` + plain `render()` (no provider).
- Deterministic: NO `Date.now()`/`Math.random()` in bindings or render. Series come from engine selectors (seeded).
- Light Flywheel only. Every `fw-*`/`figma-*` class MUST exist in `tailwind.config.js` (verify by grep — `fw-successWash` does NOT exist; `fw-success`/`fw-successLight`/`fw-warn`/`fw-warnLight`/`fw-base`/`fw-wash`/`fw-body`/`fw-bodyLight`/`fw-heading`/`fw-secondary`/`fw-neutral` do; sizes `figma-xs/sm/base/lg/xl/2xl`). A class not in the config compiles to nothing (Phase-2 invisible-element bug).
- Keep `src/__tests__/rebrand.test.ts` + all existing feature tests green. `npm run build` + `npx tsc --noEmit` clean. `npx vitest run <path>` (no `--project`).
- Do NOT modify `~/Developer/cloud-control` or `att-netbond-sdci`.

## Engine selectors (verified — use these)

- Network: `cc.telemetry()` (bytes time-series), `cc.egress()` (`{total, pub, priv, savings, ...}`), `cc.routeFlows()` (rows w/ `{label,gbps,viaPublic,current:{attControlled,latencyMs},kind,...}`), `cc.routingKpis()` (`{pctUnderControl, pctDiverse, eastWestGbps, eastWestControlledPct, ...Gbps}`), `cc.obsSummary()` (HTML/string narrative).
- AI: `cc.tokenSeries(tag, N)` (number[]), `cc.tokenMeterList()` (`{tag, today, budget, ready}[]`), `cc.decisionLog()` (allowed/denied records), `cc.agentList()`, `cc.tokenPolicyList()`.

## File Structure

- Create `src/features/observe/ObservabilityBinding.ts` — the binding interface + shared value types.
- Create `src/features/observe/ObservabilityShell.tsx` — the shared shell (header, KPI strip, flow panel, records table, briefing rail).
- Create `src/features/observe/networkBinding.ts` — bytes builder.
- Create `src/features/observe/aiBinding.ts` — tokens builder.
- Modify `src/features/observe/ObservePage.tsx` — render `ObservabilityShell` with `networkBinding` (keep `EventStream`/`AppsPanel` if desired below the shell).
- Modify `src/features/ai-fabric/AiFabricPage.tsx` — add an "Observability" sub-view/tab rendering `ObservabilityShell` with `aiBinding`.
- Tests alongside each.

---

## Task 1: `ObservabilityBinding` types + `ObservabilityShell`

**Files:**
- Create: `src/features/observe/ObservabilityBinding.ts`
- Create: `src/features/observe/ObservabilityShell.tsx`
- Test: `src/features/observe/ObservabilityShell.test.tsx`

**Interfaces:**
- Produces:
```ts
export interface Kpi { key: string; label: string; value: string; unit?: string; sub?: string; }
export interface FlowTab { id: string; label: string; }
export interface SeriesPoint { t: string; v: number; }
export interface RecordRow { id: string; label: string; cells: string[]; tone?: 'ok' | 'warn' | 'bad' | 'muted'; }
export interface BriefingBlock { text: string; emphasis?: 'strong' | 'risk'; }
export interface Briefing { narrative: BriefingBlock[]; actions: { id: string; label: string }[]; followups: string[]; }
export interface ObservabilityBinding {
  layer: 'network' | 'ai';
  title: string;
  columns: string[];                 // records-table headers
  kpis(): Kpi[];
  flowTabs(): FlowTab[];
  flowSeries(tabId: string): SeriesPoint[];
  groupByOptions(): { id: string; label: string }[];
  records(groupBy: string): RecordRow[];
  briefing(): Briefing;
}
```
- Consumes: nothing (presentational; a fake binding drives the test).

- [ ] **Step 1: Write the failing test** (`ObservabilityShell.test.tsx`)

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ObservabilityShell } from './ObservabilityShell';
import type { ObservabilityBinding } from './ObservabilityBinding';

const fake: ObservabilityBinding = {
  layer: 'network', title: 'Network Observability', columns: ['Flow', 'Gbps', 'Path'],
  kpis: () => [
    { key: 'a', label: 'Throughput', value: '48', unit: 'Gbps' }, { key: 'b', label: 'P95', value: '31', unit: 'ms' },
    { key: 'c', label: 'Egress', value: '$46.5k' }, { key: 'd', label: 'Under control', value: '78', unit: '%' },
    { key: 'e', label: 'Savings', value: '$1.7k' },
  ],
  flowTabs: () => [{ id: 'flow', label: 'Flow' }, { id: 'trend', label: 'Trend' }],
  flowSeries: (tab) => tab === 'flow' ? [{ t: 't0', v: 1 }, { t: 't1', v: 2 }] : [{ t: 't0', v: 9 }],
  groupByOptions: () => [{ id: 'none', label: 'None' }, { id: 'path', label: 'Path' }],
  records: (g) => g === 'path'
    ? [{ id: 'r1', label: 'Private', cells: ['Private', '30', 'private'] }]
    : [{ id: 'r1', label: 'rd-helion', cells: ['rd-helion', '12', 'private'] }, { id: 'r2', label: 'shared', cells: ['shared', '8', 'public'] }],
  briefing: () => ({ narrative: [{ text: '78% flows private', emphasis: 'strong' }], actions: [{ id: 'x', label: 'Show public flows' }], followups: ['Which teams use the Internet path?'] }),
};

describe('ObservabilityShell', () => {
  it('renders 5 KPI tiles, flow tabs, a records row per records(), and the briefing rail', () => {
    render(<ObservabilityShell binding={fake} />);
    expect(screen.getByText('Throughput')).toBeInTheDocument();
    expect(screen.getAllByTestId('kpi-tile')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Flow' })).toBeInTheDocument();
    expect(screen.getAllByTestId('record-row')).toHaveLength(2);      // default group 'none'
    expect(screen.getByText(/78% flows private/)).toBeInTheDocument(); // briefing
    expect(screen.getByText('Show public flows')).toBeInTheDocument();
  });

  it('changing group-by re-groups the records table', () => {
    render(<ObservabilityShell binding={fake} />);
    fireEvent.change(screen.getByTestId('groupby-select'), { target: { value: 'path' } });
    expect(screen.getAllByTestId('record-row')).toHaveLength(1);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('switching the flow tab swaps the series', () => {
    render(<ObservabilityShell binding={fake} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trend' }));
    expect(screen.getByTestId('flow-panel').getAttribute('data-tab')).toBe('trend');
  });
});
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/features/observe/ObservabilityShell.test.tsx`) — module not found.

- [ ] **Step 3: Implement `ObservabilityBinding.ts`** — exactly the interface block above (types only, no logic).

- [ ] **Step 4: Implement `ObservabilityShell.tsx`**

```tsx
import { useState } from 'react';
import type { ObservabilityBinding } from './ObservabilityBinding';

export function ObservabilityShell({ binding }: { binding: ObservabilityBinding }) {
  const tabs = binding.flowTabs();
  const groups = binding.groupByOptions();
  const [tab, setTab] = useState(tabs[0]?.id ?? '');
  const [groupBy, setGroupBy] = useState(groups[0]?.id ?? 'none');
  const kpis = binding.kpis();
  const rows = binding.records(groupBy);
  const series = binding.flowSeries(tab);
  const brief = binding.briefing();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-figma-2xl font-semibold text-fw-heading">{binding.title}</h1>
        <span className="inline-flex items-center gap-1.5 text-figma-xs font-medium text-fw-success">
          <span className="h-2 w-2 rounded-full bg-fw-success" /> Live
        </span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map(k => (
          <div key={k.key} data-testid="kpi-tile" className="rounded-2xl border border-fw-secondary bg-fw-base p-4">
            <div className="text-figma-xs uppercase tracking-wide text-fw-bodyLight">{k.label}</div>
            <div className="mt-1 text-figma-2xl font-semibold text-fw-heading tabular-nums">
              {k.value}{k.unit ? <span className="text-figma-sm text-fw-bodyLight ml-1">{k.unit}</span> : null}
            </div>
            {k.sub ? <div className="text-figma-xs text-fw-bodyLight mt-0.5">{k.sub}</div> : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* flow panel */}
          <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
            <div className="flex items-center gap-1 px-3 py-2 border-b border-fw-secondary bg-fw-wash">
              {tabs.map(t => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  className={`h-8 px-3 rounded-full text-figma-xs font-medium ${tab === t.id ? 'bg-fw-heading text-white' : 'text-fw-body hover:bg-fw-wash'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div data-testid="flow-panel" data-tab={tab} className="p-4">
              {/* deterministic mini bar series (reuse TelemetryCharts/TokenCharts later; inline SVG keeps it dep-free + testable) */}
              <svg viewBox={`0 0 ${Math.max(series.length * 10, 10)} 40`} className="w-full h-24">
                {series.map((p, i) => {
                  const max = Math.max(...series.map(s => s.v), 1);
                  const h = (p.v / max) * 36;
                  return <rect key={i} x={i * 10 + 1} y={40 - h} width="8" height={h} rx="1" fill="#009FDB" />;
                })}
              </svg>
            </div>
          </div>

          {/* records table */}
          <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
              <span className="font-medium text-fw-heading flex-1">Records</span>
              <label className="text-figma-xs text-fw-bodyLight">Group by</label>
              <select data-testid="groupby-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}
                className="h-8 px-2 rounded-md border border-fw-secondary bg-fw-base text-figma-xs text-fw-body">
                {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
            <table className="w-full text-figma-sm">
              <thead>
                <tr className="text-left text-figma-xs uppercase tracking-wide text-fw-bodyLight bg-fw-wash/60">
                  {binding.columns.map(c => <th key={c} className="px-5 py-2 font-medium">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-fw-secondary">
                {rows.map(r => (
                  <tr key={r.id} data-testid="record-row">
                    {r.cells.map((cell, i) => <td key={i} className="px-5 py-2.5 text-fw-body">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* briefing rail */}
        <aside className="rounded-2xl border border-fw-secondary bg-fw-wash p-4 space-y-3">
          <div className="text-figma-xs uppercase tracking-wide text-fw-bodyLight">{binding.layer === 'ai' ? 'Fabric briefing' : 'Network briefing'}</div>
          <div className="space-y-2 text-figma-sm text-fw-body">
            {brief.narrative.map((b, i) => (
              <p key={i} className={b.emphasis === 'risk' ? 'text-fw-warn' : b.emphasis === 'strong' ? 'text-fw-heading font-medium' : ''}>{b.text}</p>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {brief.actions.map(a => (
              <button key={a.id} type="button" className="h-8 px-3 rounded-full border border-fw-secondary bg-fw-base text-figma-xs text-fw-body hover:bg-fw-wash">{a.label}</button>
            ))}
          </div>
          <div className="pt-2 border-t border-fw-secondary space-y-1">
            {brief.followups.map((q, i) => <div key={i} className="text-figma-xs text-fw-bodyLight">{q}</div>)}
          </div>
        </aside>
      </div>
    </div>
  );
}
```

> Grep each `fw-*`/`figma-*` class above against `tailwind.config.js` before finishing; swap any that don't resolve. `#009FDB` is the AT&T-blue literal for the bar fill (SVG fills can't use Tailwind text tokens reliably — Phase-2 lesson).

- [ ] **Step 5: Run → PASS** (`npx vitest run src/features/observe/ObservabilityShell.test.tsx`), `npx tsc --noEmit` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: ObservabilityShell + binding interface (KPI strip, flow tabs, records, briefing rail)"`

---

## Task 2: `networkBinding` (bytes)

**Files:** Create `src/features/observe/networkBinding.ts`; Test `src/features/observe/networkBinding.test.ts`.

**Interfaces:**
- Produces `export function networkBinding(cc: CloudControl): ObservabilityBinding;` (pure). Uses `cc.routingKpis()`, `cc.egress()`, `cc.routeFlows()`, `cc.telemetry()`, `cc.obsSummary()`.
- Consumes: engine + `ObservabilityBinding` (Task 1).

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { networkBinding } from './networkBinding';

describe('networkBinding', () => {
  const b = networkBinding(CC);
  it('is a network binding with 5 KPIs, tabs, records, and a briefing', () => {
    expect(b.layer).toBe('network');
    expect(b.kpis()).toHaveLength(5);
    expect(b.flowTabs().length).toBeGreaterThan(0);
    expect(b.records('none').length).toBeGreaterThan(0);
    expect(b.briefing().narrative.length).toBeGreaterThan(0);
  });
  it('group-by path collapses records into private/public buckets', () => {
    const byPath = b.records('path').map(r => r.label.toLowerCase());
    expect(byPath.some(l => /private|public/.test(l))).toBe(true);
  });
  it('is deterministic', () => {
    expect(networkBinding(CC).kpis()).toEqual(networkBinding(CC).kpis());
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — map `routingKpis()`/`egress()` to the 5 KPIs (Throughput Gbps, P95 latency, Egress $, Under-control %, Savings $); `flowTabs()` = Flow/Trend/Throughput/Latency/Egress/Control; `flowSeries(tab)` derived from `telemetry()` (deterministic); `groupByOptions()` = None/Path/Cloud/Region/Control; `records(groupBy)` from `routeFlows()` grouped accordingly with `columns=['Flow','Gbps','Latency','Path','Control']`; `briefing()` derived from `obsSummary()`/`routingKpis()` (strong: under-control %, risk: public %). NO `Date.now`/`Math.random`. Read the exact `routeFlows()` row fields from `src/engine/state-routing.ts` before mapping.
- [ ] **Step 4: Run → PASS**, tsc clean.
- [ ] **Step 5: Commit** — `git commit -m "feat: networkBinding — bytes KPIs/flows/records/briefing from engine"`

---

## Task 3: Mount network binding on Observe

**Files:** Modify `src/features/observe/ObservePage.tsx`; keep `src/features/observe/ObservePage.test.tsx` green (retarget if it asserted the old layout).

- [ ] **Step 1** Read ObservePage + its test. **Step 2** Retarget the test to assert the shell renders (KPI tiles + a records row + briefing). **Step 3** Render `<ObservabilityShell binding={useCloudControl(networkBinding)} />` as the primary Observe body (keep `EventStream`/`AppsPanel` below if present). Note: `useCloudControl(networkBinding)` returns the binding object — acceptable since `networkBinding` is a pure selector; if the hook memoization needs a stable ref, wrap with `useMemo` keyed on a cheap state signature, or call `networkBinding(cc)` inside a `useCloudControl(cc => networkBinding(cc))`. **Step 4** `npx vitest run src/features/observe` green; `npm run build` green. **Step 5** Commit — `git commit -m "feat: Observe renders the network observability shell"`.

---

## Task 4: `aiBinding` (tokens)

**Files:** Create `src/features/observe/aiBinding.ts`; Test `src/features/observe/aiBinding.test.ts`.

- [ ] Mirror Task 2 for the token layer: `layer:'ai'`, KPIs = Tokens / Requests / Cost / TTFT / Savings from `tokenMeterList()`/`tokenSeries()`/`decisionLog()`; tabs = Flow/Trend/Tokens/Requests/Cost/TTFT; `records(groupBy)` from token records grouped by Provider/Model/Identity/Route/Status with `columns=['Identity','Tokens','Model','Route','Status']`; `briefing()` from token state (strong: top identity/route %, risk: public %/top external provider). Test shape mirrors Task 2 (`layer==='ai'`, 5 KPIs, records>0, deterministic). Read `tokenMeterList()`/`decisionLog()` exact fields first. Commit — `git commit -m "feat: aiBinding — token KPIs/flows/records/briefing from engine"`.

---

## Task 5: Mount AI binding as AI Fabric → Observability

**Files:** Modify `src/features/ai-fabric/AiFabricPage.tsx`; keep `AiFabricPage.test.tsx` green.

- [ ] Add an "Observability" sub-view/tab to AI Fabric (segmented control or tab) that renders `<ObservabilityShell binding={useCloudControl(aiBinding)} />` alongside the existing governance panels. **Test:** AI Fabric shows an "Observability" affordance; selecting it renders the shell (KPI tiles + briefing). Keep existing AiFabric assertions green. Commit — `git commit -m "feat: AI Fabric Observability sub-view on the shared shell"`.

---

## Task 6: Full green + live verify

- [ ] `npx vitest run` (full) green; `npm run build` + `npx tsc --noEmit` clean; `rebrand.test.ts` green. Live-verify (dev server, headless): `/observe` shows the network shell (5 KPIs, records, briefing, tab switch); AI Fabric Observability shows the token shell; no page errors; chips/bars render visible colors (grep-audit passed). Screenshot both. Commit any fixes — `git commit -m "test: verify dual observability end-to-end"`.

## Self-Review

- Shared shell + binding interface → Task 1. Network binding → Task 2; mounted Observe → Task 3. AI binding → Task 4; mounted AI Fabric → Task 5. Reference-IA parity (KPI strip, flow tabs, records+group-by, briefing rail) → Task 1 shell. Light theme + token audit → Global Constraints + each task. Determinism → bindings pure, tested. Coverage complete.
- Placeholder scan: Tasks 2/4 say "read exact `routeFlows()`/`tokenMeterList()` fields before mapping" — a grounding instruction, not a gap; the KPI/record/briefing *shape* is fully specified, only the field-name wiring is read-at-impl (the safe pattern). No bare TODOs.
- Type consistency: `ObservabilityBinding` + value types defined once (Task 1), consumed by shell (Task 1), produced by `networkBinding`/`aiBinding` (Tasks 2/4), mounted via `useCloudControl` (Tasks 3/5). Consistent.
