# VizKit Visual Grammar (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One hand-rolled visual grammar (VizKit) across every demo-reachable chart: shared palette and ribbon math extracted from the two loved visuals, a StationTrack for provisioning stages, a TrendBand that replaces the crude bar-series timeline, an expand-in-place AT&T Fabric drill-down, and the last two library charts rewritten in the idiom.

**Architecture:** VizKit lives at `src/components/viz/kit/` as pure geometry modules + presentational SVG components, following the existing idiom (pure `compute*` function returns geometry, component renders it; deterministic, no clocks/RNG, palette constants). FabricHero and SankeyPanel keep their layouts but adopt the shared palette/ribbon module. New capability (drill-down, stations, trends, category bars) is built on the kit.

**Tech Stack:** React 18 + TypeScript, hand-rolled SVG, Vitest + @testing-library/react. NO new dependencies; recharts usage under `src/features/` is removed.

**Ground-truth revisions to the spec (verified this session, spec § Phase 2 amended in Task 1):**
- The NaaS spine (`/discover`, `/naas/connect`, `/naas/observe`) already uses zero chart libraries. The only demo-reachable library charts are `src/features/ai-fabric/GovernanceDecisions.tsx` (recharts BarChart, via /ai/observe → Security tab) and `src/features/cost/EgressTrend.tsx` (recharts, via the Observe CTA → /naas/cost). Those two are the whole "chart migration."
- `BgpStatusTimeline.tsx` is dead code (zero importers) — it is deleted, not replaced. The reachable "horrid timeline" is the 60-rect bar series + scrubber in `ObservabilityShell.tsx:108-126`; TrendBand replaces that.
- The live home for StationTrack is the managed-VPC bring-up (`DeployManagedVpcWizard.tsx:251-275`), which renders engine-driven `ManagedVpcStage[]` as a vertical dot list today. The LMCC-progression components in `src/components/connection/` are all orphaned (unreachable) and are left alone.
- `FlowAxis`/`FabricNode` extraction is dropped (YAGNI): the drill-down builds inside FabricHero, which already owns the axis. Kit primitives are: palette, ribbon, StationTrack, TrendBand, CategoryBars.

## Global Constraints

- Kit files live in `src/components/viz/kit/`. Every geometry function is pure and deterministic: identical input ⇒ identical output; no `Date.now()`, no `Math.random()`.
- Palette values are the existing Flywheel hex constants (cobalt `#0057b8`, cobaltSoft `#7aa6d6`, green `#2d7e24`, slate `#94a3b8`, slateInk `#475569` — plus ink `#1d2329`, inkSoft `#475569`, wash `#f8fafb`, line `#dcdfe3`, band `#eef4fb`, bandStroke `#c7ddf5`, skyCursor `#009FDB`). Color carries one meaning app-wide: cobalt = on the AT&T fabric, slate = public internet, green = resilient/success.
- Left is ingress, right is egress. Time axes run left→right.
- New UI copy: no em dashes (period + new sentence), no unexpanded acronyms (the vocabulary guard runs over connect/discover/observe), savings-first framing.
- Existing test-ids must survive refactors: `stage-${key}`/`data-done` (wizard), `tm-scrubber`/`tm-moment`/`tm-readout`/`flow-panel`/`flow-empty` (observe), `fabric-hero`/`fabric-node-*`/`data-fabric-edge` (FabricHero). Existing suites must stay green.
- All test commands are `npx vitest run <path>`; run the touched feature's suite plus `src/__tests__/rebrand.test.ts` and `src/__tests__/vocabulary.test.ts` before each commit that changes copy.
- Commits follow repo style and end with the trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Kit palette + ribbon module (extraction, zero behavior change)

**Files:**
- Create: `src/components/viz/kit/palette.ts`
- Create: `src/components/viz/kit/ribbon.ts`
- Create: `src/components/viz/kit/index.ts`
- Test: `src/components/viz/kit/ribbon.test.ts`
- Modify: `src/features/observe/SankeyPanel.tsx` (delete its local `HEX`, import kit palette; replace inline ribbon `d` string at line 181 with `ribbonPath(...)`)
- Modify: `src/features/connect/FabricHero.tsx:44-62` (delete local `HEX`, import kit palette)
- Modify: `docs/superpowers/specs/2026-08-07-conversational-cloud-connect-design.md` (Phase 2 section: replace the four-primitive list with the ground-truth revisions quoted in this plan's header)

**Interfaces:**
- Produces: `VIZ_HEX` (const object with keys `cobalt, cobaltSoft, green, slate, slateInk, ink, inkSoft, wash, line, band, bandStroke, skyCursor`), and `ribbonPath(sx: number, sy0: number, tx: number, ty0: number, st: number, tt: number): string` returning exactly the SVG path SankeyPanel builds today. `index.ts` re-exports both plus each later primitive.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/viz/kit/ribbon.test.ts
import { describe, it, expect } from 'vitest';
import { ribbonPath } from './ribbon';

describe('ribbonPath', () => {
  it('emits the sankey ribbon path: top bezier, right edge, bottom bezier, close', () => {
    // sx=220, tx=494 → c1 = 220 + 274*0.45 = 343.3, c2 = 220 + 274*0.55 = 370.7
    expect(ribbonPath(220, 100, 494, 140, 20, 30)).toBe(
      'M 220 100 C 343.3 100 370.7 140 494 140 L 494 170 C 370.7 170 343.3 120 220 120 Z',
    );
  });
  it('is deterministic', () => {
    expect(ribbonPath(0, 0, 100, 50, 10, 10)).toBe(ribbonPath(0, 0, 100, 50, 10, 10));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viz/kit/ribbon.test.ts`
Expected: FAIL - cannot resolve `./ribbon`.

- [ ] **Step 3: Implement palette, ribbon, index**

```ts
// src/components/viz/kit/palette.ts
/** The one visualization palette (Flywheel hex, SVG-attribute form — fill/
 *  stroke cannot reach Tailwind's fw-* classes). Color carries exactly one
 *  meaning app-wide: cobalt = on the AT&T fabric, slate = public internet,
 *  green = resilient/success. Everything else is ink. */
export const VIZ_HEX = {
  cobalt: '#0057b8',
  cobaltSoft: '#7aa6d6',
  green: '#2d7e24',
  slate: '#94a3b8',
  slateInk: '#475569',
  ink: '#1d2329',
  inkSoft: '#475569',
  wash: '#f8fafb',
  line: '#dcdfe3',
  band: '#eef4fb',
  bandStroke: '#c7ddf5',
  skyCursor: '#009FDB',
} as const;
```

```ts
// src/components/viz/kit/ribbon.ts
const r1 = (n: number) => Math.round(n * 10) / 10;

/** The sankey ribbon: a closed shape whose top and bottom edges are the
 *  same horizontal bezier (45%/55% control points), source end st thick,
 *  target end tt thick. Extracted verbatim from SankeyPanel. */
export function ribbonPath(sx: number, sy0: number, tx: number, ty0: number, st: number, tt: number): string {
  const c1 = r1(sx + (tx - sx) * 0.45);
  const c2 = r1(sx + (tx - sx) * 0.55);
  return `M ${sx} ${sy0} C ${c1} ${sy0} ${c2} ${ty0} ${tx} ${ty0} L ${tx} ${ty0 + tt} C ${c2} ${ty0 + tt} ${c1} ${sy0 + st} ${sx} ${sy0 + st} Z`;
}
```

```ts
// src/components/viz/kit/index.ts
export { VIZ_HEX } from './palette';
export { ribbonPath } from './ribbon';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/viz/kit/ribbon.test.ts`
Expected: PASS. NOTE: SankeyPanel's inline template does not round c1/c2; if the extracted values differ in formatting, adjust `ribbonPath` to match SankeyPanel's exact current output (drop the `r1` calls), and fix the test's expected string accordingly — byte-identical output is the acceptance bar, existing SankeyPanel tests are the referee.

- [ ] **Step 5: Adopt the kit in SankeyPanel and FabricHero**

In `src/features/observe/SankeyPanel.tsx`: delete the local `HEX` const (lines 17-23); `import { VIZ_HEX, ribbonPath } from '../../components/viz/kit';`; replace every `HEX.` with `VIZ_HEX.`; replace the template-literal `d:` at line 181 with `d: ribbonPath(sx, sy0, tx, ty0, st, tt),`.

In `src/features/connect/FabricHero.tsx`: delete the local `HEX` const (lines 44-62); `import { VIZ_HEX } from '../../components/viz/kit';`; replace every `HEX.` with `VIZ_HEX.`.

In the spec file, replace the Phase 2 bullet list under "## Phase 2 - One visual grammar (VizKit)" with the ground-truth revision text from this plan's header (verbatim, adjusted to prose).

- [ ] **Step 6: Run the referee suites**

Run: `npx vitest run src/features/observe src/features/connect src/components/viz/kit`
Expected: PASS with zero test edits — this task changes no behavior.

- [ ] **Step 7: Commit**

```bash
git add src/components/viz/kit src/features/observe/SankeyPanel.tsx src/features/connect/FabricHero.tsx docs/superpowers/specs/2026-08-07-conversational-cloud-connect-design.md
git commit -m "feat(vizkit): one palette, one ribbon - extracted from the two visuals that earned it"
```

---

### Task 2: StationTrack + managed-VPC bring-up on the wire

**Files:**
- Create: `src/components/viz/kit/StationTrack.tsx`
- Test: `src/components/viz/kit/StationTrack.test.tsx`
- Modify: `src/components/viz/kit/index.ts` (add export)
- Modify: `src/features/connect/DeployManagedVpcWizard.tsx:251-275` (the `record.stages.map` block)

**Interfaces:**
- Consumes: `VIZ_HEX` from Task 1; `ManagedVpcStage` (`src/engine/types.ts:119-124`): `{ key: 'create'|'vsrx'|'cloud-plumbing'|'att-plumbing'|'live'; label: string; detail: string; done: boolean }`.
- Produces: `export interface Station { key: string; label: string; detail?: string; state: 'done' | 'current' | 'upcoming' }` and `export function StationTrack({ stations, ariaLabel }: { stations: Station[]; ariaLabel: string })` rendering an `<ol data-testid="station-track">` horizontal wire; each station `<li data-testid={`stage-${key}`} data-done={...}>`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/viz/kit/StationTrack.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StationTrack, type Station } from './StationTrack';

const stations: Station[] = [
  { key: 'create', label: 'Create VPC', detail: 'CIDR carved', state: 'done' },
  { key: 'vsrx', label: 'vSRX pair', detail: 'HA booting', state: 'current' },
  { key: 'live', label: 'Live', state: 'upcoming' },
];

describe('StationTrack', () => {
  it('renders one station per stage on a single wire, left to right, with the wizard test contract', () => {
    render(<StationTrack stations={stations} ariaLabel="Bring-up" />);
    const track = screen.getByTestId('station-track');
    expect(track.tagName).toBe('OL');
    expect(track).toHaveAttribute('aria-label', 'Bring-up');
    const items = ['create', 'vsrx', 'live'].map(k => screen.getByTestId(`stage-${k}`));
    expect(items.map(i => i.getAttribute('data-done'))).toEqual(['true', 'false', 'false']);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
  });
  it('shows the label of every station and the detail of the current one', () => {
    render(<StationTrack stations={stations} ariaLabel="Bring-up" />);
    expect(screen.getByText('Create VPC')).toBeInTheDocument();
    expect(screen.getByText('HA booting')).toBeInTheDocument();
    expect(screen.queryByText('CIDR carved')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viz/kit/StationTrack.test.tsx`
Expected: FAIL - cannot resolve `./StationTrack`.

- [ ] **Step 3: Implement StationTrack**

```tsx
// src/components/viz/kit/StationTrack.tsx
import { Check } from 'lucide-react';
import { VIZ_HEX } from './palette';

/** Status as a place on the wire: an ordered left-to-right track of
 *  stations. Done = green check, current = pulsing cobalt (detail shown),
 *  upcoming = neutral dot. Ingress→egress axis, same as every kit visual. */
export interface Station {
  key: string;
  label: string;
  detail?: string;
  state: 'done' | 'current' | 'upcoming';
}

export function StationTrack({ stations, ariaLabel }: { stations: Station[]; ariaLabel: string }) {
  return (
    <ol data-testid="station-track" aria-label={ariaLabel} className="flex items-start">
      {stations.map((s, i) => {
        const last = i === stations.length - 1;
        return (
          <li
            key={s.key}
            data-testid={`stage-${s.key}`}
            data-done={String(s.state === 'done')}
            aria-current={s.state === 'current' ? 'step' : undefined}
            className={`flex items-start ${last ? '' : 'flex-1'} min-w-0`}
          >
            <div className="flex flex-col items-center gap-1 shrink-0 w-20">
              {s.state === 'done' ? (
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-white" style={{ background: VIZ_HEX.green }}>
                  <Check size={12} aria-hidden="true" />
                </span>
              ) : s.state === 'current' ? (
                <span className="relative inline-flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full opacity-60" style={{ background: VIZ_HEX.cobalt }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: VIZ_HEX.cobalt }} />
                </span>
              ) : (
                <span className="inline-flex h-5 w-5 items-center justify-center">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-fw-neutral" />
                </span>
              )}
              <span className={`text-center text-[11px] leading-tight ${s.state === 'upcoming' ? 'text-fw-bodyLight' : 'font-medium text-fw-heading'}`}>
                {s.label}
              </span>
              {s.state === 'current' && s.detail && (
                <span className="text-center text-[10px] leading-tight text-fw-bodyLight">{s.detail}</span>
              )}
            </div>
            {!last && (
              <span
                aria-hidden="true"
                className="mt-2.5 h-0.5 flex-1 rounded"
                style={{ background: s.state === 'done' ? VIZ_HEX.green : VIZ_HEX.line }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

Add to `src/components/viz/kit/index.ts`: `export { StationTrack, type Station } from './StationTrack';`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/viz/kit/StationTrack.test.tsx`
Expected: PASS.

- [ ] **Step 5: Replace the wizard's vertical stage list**

In `src/features/connect/DeployManagedVpcWizard.tsx`, import `{ StationTrack } from '../../components/viz/kit';` and replace the whole `{record.stages.map(s => { ... })}` block (lines 251-275, the vertical dot list inside `<div className="px-5 py-4 space-y-1">`) with:

```tsx
          <StationTrack
            ariaLabel="Bring-up progress"
            stations={record.stages.map(s => ({
              key: s.key,
              label: s.label,
              detail: s.detail,
              state: s.done ? 'done' : s.key === record.stage ? 'current' : 'upcoming',
            }))}
          />
```

(The `data-testid={`stage-${s.key}`}`/`data-done` contract moves into StationTrack unchanged; existing wizard tests keep passing.)

- [ ] **Step 6: Run the wizard suite**

Run: `npx vitest run src/features/connect/DeployManagedVpcWizard.test.tsx src/features/connect`
Expected: PASS with zero test edits. If a wizard test asserts on the removed stage-detail text of non-current stages, update only that assertion (StationTrack shows detail for the current station only) and say so in the report.

- [ ] **Step 7: Commit**

```bash
git add src/components/viz/kit src/features/connect/DeployManagedVpcWizard.tsx
git commit -m "feat(vizkit): StationTrack - bring-up status is a place on the wire, not a list"
```

---

### Task 3: TrendBand replaces the Observe bar-series timeline

**Files:**
- Create: `src/components/viz/kit/trend.ts`
- Create: `src/components/viz/kit/TrendBand.tsx`
- Test: `src/components/viz/kit/trend.test.ts`, `src/components/viz/kit/TrendBand.test.tsx`
- Modify: `src/components/viz/kit/index.ts` (add exports)
- Modify: `src/features/observe/ObservabilityShell.tsx:107-126` (the rect-bar `<svg>` block only; the scrubber/moments/readout block below stays untouched)

**Interfaces:**
- Consumes: `VIZ_HEX`; `SeriesPoint` (`src/features/observe/ObservabilityBinding.ts:5`): `{ t: string; v: number }`.
- Produces: `computeTrendGeometry(values: number[], w: number, h: number): { line: string; area: string; x: (i: number) => number; y: (v: number) => number }` and `TrendBand({ series, cursor, reviewing }: { series: { t: string; v: number }[]; cursor?: number | null; reviewing?: boolean })`.

- [ ] **Step 1: Write the failing geometry test**

```ts
// src/components/viz/kit/trend.test.ts
import { describe, it, expect } from 'vitest';
import { computeTrendGeometry } from './trend';

describe('computeTrendGeometry', () => {
  it('maps points across the full width and values to inverted y', () => {
    const g = computeTrendGeometry([0, 5, 10], 100, 40);
    expect(g.x(0)).toBe(0);
    expect(g.x(2)).toBe(100);
    expect(g.y(10)).toBe(2);   // max value → top pad (2)
    expect(g.y(0)).toBe(38);   // zero → baseline (h - 2)
  });
  it('line visits every point; area closes to the baseline', () => {
    const g = computeTrendGeometry([0, 10], 100, 40);
    expect(g.line).toBe('M 0 38 L 100 2');
    expect(g.area).toBe('M 0 38 L 100 2 L 100 38 L 0 38 Z');
  });
  it('a flat all-zero series stays on the baseline without dividing by zero', () => {
    const g = computeTrendGeometry([0, 0, 0], 90, 40);
    expect(g.line).toBe('M 0 38 L 45 38 L 90 38');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viz/kit/trend.test.ts`
Expected: FAIL - cannot resolve `./trend`.

- [ ] **Step 3: Implement trend geometry + TrendBand**

```ts
// src/components/viz/kit/trend.ts
const PAD = 2;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Pure trend geometry: values → an SVG polyline and its closed area.
 *  Deterministic; max value touches the top pad, zero sits on the baseline. */
export function computeTrendGeometry(values: number[], w: number, h: number) {
  const max = Math.max(...values, 1);
  const n = Math.max(values.length - 1, 1);
  const x = (i: number) => r1((i / n) * w);
  const y = (v: number) => r1(h - PAD - (v / max) * (h - PAD * 2));
  const pts = values.map((v, i) => `${x(i)} ${y(v)}`);
  const line = `M ${pts[0]}${pts.slice(1).map(p => ` L ${p}`).join('')}`;
  const area = `${line} L ${x(values.length - 1)} ${h - PAD} L ${x(0)} ${h - PAD} Z`;
  return { line, area, x, y };
}
```

```tsx
// src/components/viz/kit/TrendBand.tsx
import { useMemo } from 'react';
import { VIZ_HEX } from './palette';
import { computeTrendGeometry } from './trend';

const VIEW_W = 600;
const VIEW_H = 40;

/** The series band: one cobalt area with a line edge, time left→right.
 *  When a cursor index is set (the time machine), a marker dot and a
 *  hairline mark the instant; reviewing dims the band, not the marker. */
export function TrendBand({
  series,
  cursor = null,
  reviewing = false,
}: {
  series: { t: string; v: number }[];
  cursor?: number | null;
  reviewing?: boolean;
}) {
  const g = useMemo(() => computeTrendGeometry(series.map(p => p.v), VIEW_W, VIEW_H), [series]);
  const at = cursor != null && cursor >= 0 && cursor < series.length ? cursor : null;
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} data-testid="trend-band" className="w-full h-24" role="img" aria-label="Flow over the window">
      <path d={g.area} fill={VIZ_HEX.cobalt} fillOpacity={reviewing ? 0.06 : 0.1} />
      <path d={g.line} fill="none" stroke={VIZ_HEX.cobalt} strokeWidth={1.5} strokeOpacity={reviewing ? 0.5 : 1} />
      {at != null && (
        <g data-testid="trend-cursor">
          <line x1={g.x(at)} y1={0} x2={g.x(at)} y2={VIEW_H} stroke={VIZ_HEX.skyCursor} strokeWidth={1} />
          <circle cx={g.x(at)} cy={g.y(series[at].v)} r={3} fill={VIZ_HEX.skyCursor} />
        </g>
      )}
    </svg>
  );
}
```

Add to `src/components/viz/kit/index.ts`:
`export { TrendBand } from './TrendBand';`
`export { computeTrendGeometry } from './trend';`

```tsx
// src/components/viz/kit/TrendBand.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendBand } from './TrendBand';

const series = [{ t: '10:00', v: 1 }, { t: '10:01', v: 4 }, { t: '10:02', v: 2 }];

describe('TrendBand', () => {
  it('renders the band without a cursor by default', () => {
    render(<TrendBand series={series} />);
    expect(screen.getByTestId('trend-band')).toBeInTheDocument();
    expect(screen.queryByTestId('trend-cursor')).not.toBeInTheDocument();
  });
  it('marks the reviewed instant when a cursor is set', () => {
    render(<TrendBand series={series} cursor={1} reviewing />);
    expect(screen.getByTestId('trend-cursor')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/viz/kit/trend.test.ts src/components/viz/kit/TrendBand.test.tsx`
Expected: PASS.

- [ ] **Step 5: Replace the rect bars in ObservabilityShell**

In `src/features/observe/ObservabilityShell.tsx`, import `{ TrendBand } from '../../components/viz/kit';` and replace ONLY the bar `<svg>` block (the comment at line 107 through its closing `</svg>` at line 126) with:

```tsx
                <TrendBand series={series} cursor={at} reviewing={reviewing} />
```

Everything else in the file (empty state, sankey branch, scrubber, moments, readout) stays byte-identical.

- [ ] **Step 6: Run the observe suite**

Run: `npx vitest run src/features/observe`
Expected: PASS. If ObservabilityShell tests assert on `<rect>` bars specifically, update only those assertions to the `trend-band` testid and say so in the report; scrubber/readout assertions must pass unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/components/viz/kit src/features/observe/ObservabilityShell.tsx
git commit -m "feat(vizkit): TrendBand - the series is a band on a time axis, the bar-brick timeline dies"
```

---

### Task 4: AT&T Fabric drill-down (expand in place)

**Files:**
- Modify: `src/features/connect/FabricHero.tsx` (layout fn + fabric band + fabric label button)
- Modify: `src/features/connect/ConnectPage.tsx` (own the `fabricExpanded` state)
- Test: `src/features/connect/FabricHero.test.tsx` (append), `src/features/connect/FabricHero.layout.test.ts` (create)

**Interfaces:**
- Consumes: `VIZ_HEX`, existing `FabricModel`, `computeFabricLayout`, `FabricHeroProps`.
- Produces: `computeFabricLayout(model: FabricModel, opts?: { expanded?: boolean }): FabricLayout` where `FabricLayout` gains optional `internals?: { sites: { id: string; label: string; y: number }[]; paths: { id: string; label: string; y: number; siteIdx: 0 | 1 }[]; caption: string }`; `FabricHero` gains props `expanded?: boolean; onToggleExpand?: () => void`.

- [ ] **Step 1: Write the failing layout test**

```ts
// src/features/connect/FabricHero.layout.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { computeFabricLayout } from './FabricHero';
import type { FabricModel } from './FabricHero';

const model = CC.fabricModel() as FabricModel;

describe('computeFabricLayout expanded mode', () => {
  it('collapsed: no internals, band at the classic x', () => {
    const l = computeFabricLayout(model);
    expect(l.internals).toBeUndefined();
    expect(l.fabric.x).toBe(404);
  });
  it('expanded: band widens leftward, right edge fixed so region edges stay put', () => {
    const collapsed = computeFabricLayout(model);
    const l = computeFabricLayout(model, { expanded: true });
    expect(l.fabric.x).toBeLessThan(404);
    expect(l.fabric.x + l.fabric.w).toBe(collapsed.fabric.x + collapsed.fabric.w);
    expect(l.regions.map(r => r.edge.to.x)).toEqual(collapsed.regions.map(r => r.edge.to.x));
  });
  it('expanded: two site rows and four ordered paths inside the band, left to right facts', () => {
    const l = computeFabricLayout(model, { expanded: true });
    expect(l.internals!.sites).toHaveLength(2);
    expect(l.internals!.paths).toHaveLength(4);
    expect(l.internals!.paths.map(p => p.siteIdx)).toEqual([0, 0, 1, 1]);
    expect(l.internals!.caption).toBe('4 paths · 2 diverse sites · failover detect in 900ms (BFD)');
    // paths of a site sit between the band's top and bottom
    for (const p of l.internals!.paths) {
      expect(p.y).toBeGreaterThan(l.fabric.y);
      expect(p.y).toBeLessThan(l.fabric.y + l.fabric.h);
    }
  });
  it('deterministic in both modes', () => {
    expect(computeFabricLayout(model, { expanded: true })).toEqual(computeFabricLayout(model, { expanded: true }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/connect/FabricHero.layout.test.ts`
Expected: FAIL - `internals` undefined / signature mismatch.

- [ ] **Step 3: Extend the layout function**

In `FabricHero.tsx`, add after the layout constants (near line 74):

```ts
/** Expanded drill-down: the band grows leftward into the empty mid-stage;
 *  FABRIC_RIGHT is fixed so no region edge moves. */
const FABRIC_X_EXPANDED = 254;
```

Change the signature and body of `computeFabricLayout`:

```ts
export function computeFabricLayout(model: FabricModel, opts?: { expanded?: boolean }): FabricLayout {
```

Inside, replace the `fabric` const with:

```ts
  const expanded = opts?.expanded ?? false;
  const fx = expanded ? FABRIC_X_EXPANDED : FABRIC_X;
  const fabric = { x: fx, y: bandTop, w: FABRIC_RIGHT - fx, h: bandBottom - bandTop, cx: fx + (FABRIC_RIGHT - fx) / 2, cy: viewH / 2 };
```

Before the final `return`, add:

```ts
  /* Drill-down internals: the LMCC architecture on the same axis. Two
     diverse sites, two IPE paths each. Site labels come from the model's
     first two sites when present; the architecture facts are the product's
     (4 paths, 2 sites, 900ms BFD detection). */
  let internals: FabricLayout['internals'];
  if (expanded) {
    const siteLabels = [
      model.sites[0]?.label.split(' · ')[0] ?? 'Site A',
      model.sites[1]?.label.split(' · ')[0] ?? 'Site B',
    ];
    const innerTop = fabric.y + 34;
    const innerBottom = fabric.y + fabric.h - 26;
    const half = (innerBottom - innerTop) / 2;
    const siteY = (i: number) => innerTop + i * half + 10;
    const pathY = (i: number) => {
      const siteIdx = i < 2 ? 0 : 1;
      return siteY(siteIdx) + 18 + (i % 2) * 16;
    };
    internals = {
      sites: siteLabels.map((label, i) => ({ id: `fab-site-${i}`, label, y: siteY(i) })),
      paths: [0, 1, 2, 3].map(i => ({
        id: `fab-path-${i}`,
        label: `MX-304 · path ${i + 1}`,
        y: pathY(i),
        siteIdx: (i < 2 ? 0 : 1) as 0 | 1,
      })),
      caption: '4 paths · 2 diverse sites · failover detect in 900ms (BFD)',
    };
  }
```

And extend the `FabricLayout` interface (after `arcs`):

```ts
  internals?: {
    sites: { id: string; label: string; y: number }[];
    paths: { id: string; label: string; y: number; siteIdx: 0 | 1 }[];
    caption: string;
  };
```

Return `{ viewW: VIEW_W, viewH, fabric, sites, regions, internet, arcs, internals }`.

- [ ] **Step 4: Run the layout test**

Run: `npx vitest run src/features/connect/FabricHero.layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Render the drill-down and wire the toggle**

In `FabricHero`:
- Props: `expanded?: boolean; onToggleExpand?: () => void` (default `expanded = false`). Compute layout with `useMemo(() => computeFabricLayout(model, { expanded }), [model, expanded])`.
- Fabric label button (lines ~346-359): `onClick` becomes `() => { select({ kind: 'fabric' }); onToggleExpand?.(); }` and, under the two label lines, add `<span className="text-[10px] leading-tight text-fw-bodyLight">{expanded ? 'collapse' : 'see inside'}</span>`. When `expanded`, move the label block to the band's top: `y={layout.fabric.y + 2}` instead of `layout.fabric.cy - 30`.
- After the band `<rect>` group, when `layout.internals` exists render:

```tsx
        {layout.internals && (
          <g data-testid="fabric-internals">
            {layout.internals.sites.map(s => (
              <text key={s.id} x={layout.fabric.x + 14} y={s.y} fill={VIZ_HEX.slateInk} className="text-[10px] font-semibold">
                {s.label}
              </text>
            ))}
            {layout.internals.paths.map(p => (
              <g key={p.id}>
                <line
                  x1={layout.fabric.x + 14} y1={p.y} x2={FABRIC_RIGHT - 14} y2={p.y}
                  stroke={VIZ_HEX.cobalt} strokeWidth={1.5} strokeOpacity={0.75} strokeLinecap="round"
                />
                <circle cx={layout.fabric.x + 14} cy={p.y} r={2.5} fill={VIZ_HEX.cobalt} />
                <circle cx={FABRIC_RIGHT - 14} cy={p.y} r={2.5} fill={VIZ_HEX.cobalt} />
                <text x={layout.fabric.x + 22} y={p.y - 4} fill={VIZ_HEX.slateInk} className="text-[9px]">
                  {p.label}
                </text>
              </g>
            ))}
            <text x={layout.fabric.cx} y={layout.fabric.y + layout.fabric.h - 10} textAnchor="middle" fill={VIZ_HEX.slateInk} className="text-[10px]">
              {layout.internals.caption}
            </text>
          </g>
        )}
```

In `ConnectPage.tsx`: `const [fabricExpanded, setFabricExpanded] = useState(false);` and pass `expanded={fabricExpanded} onToggleExpand={() => setFabricExpanded(v => !v)}` to `<FabricHero ...>` (find its render site by searching `<FabricHero`).

- [ ] **Step 6: Write the failing interaction test, then make it pass**

Append to `src/features/connect/FabricHero.test.tsx`, reusing that file's existing render arrangement for FabricHero:

```tsx
  it('clicking the fabric node expands the internals in place, clicking again collapses', async () => {
    // use this file's existing render helper with a stateful wrapper:
    function Harness() {
      const [expanded, setExpanded] = useState(false);
      return <FabricHero model={model} expanded={expanded} onToggleExpand={() => setExpanded(v => !v)} />;
    }
    render(<Harness />);
    expect(screen.queryByTestId('fabric-internals')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('fabric-node-fabric'));
    expect(screen.getByTestId('fabric-internals')).toBeInTheDocument();
    expect(screen.getByText('collapse')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('fabric-node-fabric'));
    expect(screen.queryByTestId('fabric-internals')).not.toBeInTheDocument();
    expect(screen.getByText('see inside')).toBeInTheDocument();
  });
```

(If the file uses `fireEvent` instead of `userEvent`, follow the file's existing idiom.)

Run: `npx vitest run src/features/connect/FabricHero.test.tsx src/features/connect`
Expected: PASS (all pre-existing FabricHero tests must pass unchanged — collapsed mode is byte-identical geometry).

- [ ] **Step 7: Vocabulary + commit**

Run: `npx vitest run src/__tests__/vocabulary.test.ts src/__tests__/rebrand.test.ts`
Expected: PASS (the caption glosses BFD as `(BFD)` after plain words; MX-304 is a product model number, not an acronym in the guard list).

```bash
git add src/features/connect
git commit -m "feat(connect): click the fabric to see inside - 4 paths, 2 sites, one axis"
```

---

### Task 5: CategoryBars + the last two library charts fall + guard

**Files:**
- Create: `src/components/viz/kit/CategoryBars.tsx`
- Test: `src/components/viz/kit/CategoryBars.test.tsx`
- Modify: `src/components/viz/kit/index.ts` (add export)
- Modify: `src/features/ai-fabric/GovernanceDecisions.tsx` (drop recharts; render CategoryBars)
- Modify: `src/features/cost/EgressTrend.tsx` (drop recharts; hand-rolled two-series band via `computeTrendGeometry`)
- Create: `src/__tests__/vizkit-deps.test.ts`
- Delete: `src/components/monitoring/metrics/BgpStatusTimeline.tsx`

**Interfaces:**
- Consumes: `VIZ_HEX`, `computeTrendGeometry` (Task 3).
- Produces: `CategoryBars({ items, ariaLabel }: { items: { label: string; value: number; color: string }[]; ariaLabel: string })` - horizontal labeled bars scaled to the max value.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/viz/kit/CategoryBars.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryBars } from './CategoryBars';

const items = [
  { label: 'Allowed', value: 8, color: '#2d7e24' },
  { label: 'Guardrail', value: 2, color: '#0057b8' },
  { label: 'Denied', value: 0, color: '#94a3b8' },
];

describe('CategoryBars', () => {
  it('renders one row per category with label, count, and a bar scaled to the max', () => {
    render(<CategoryBars items={items} ariaLabel="Decision outcomes" />);
    const list = screen.getByRole('list', { name: 'Decision outcomes' });
    expect(list.children).toHaveLength(3);
    const allowedBar = screen.getByTestId('category-bar-Allowed');
    expect(allowedBar.style.width).toBe('100%');
    expect(screen.getByTestId('category-bar-Guardrail').style.width).toBe('25%');
    expect(screen.getByTestId('category-bar-Denied').style.width).toBe('0%');
  });
  it('shows the value beside every label', () => {
    render(<CategoryBars items={items} ariaLabel="Decision outcomes" />);
    expect(screen.getByText('Allowed · 8')).toBeInTheDocument();
    expect(screen.getByText('Denied · 0')).toBeInTheDocument();
  });
});
```

```ts
// src/__tests__/vizkit-deps.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/** VizKit dependency guard: feature code draws with the kit, never with a
 *  chart library. Legacy monitoring widgets under src/components keep their
 *  imports until touched (they are unreachable from routed pages). */
describe('vizkit dependency guard', () => {
  it('no chart-library import under src/features/', () => {
    const files = execSync('git ls-files', { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.startsWith('src/features/') && /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
    const banned = /from\s+['"](recharts|chart\.js|react-chartjs-2)['"]|import\(['"](chart\.js|react-chartjs-2)/;
    const hits = files.filter(f => banned.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/viz/kit/CategoryBars.test.tsx src/__tests__/vizkit-deps.test.ts`
Expected: CategoryBars FAILS (unresolved import). The deps guard FAILS listing exactly `src/features/ai-fabric/GovernanceDecisions.tsx` and `src/features/cost/EgressTrend.tsx`.

- [ ] **Step 3: Implement CategoryBars**

```tsx
// src/components/viz/kit/CategoryBars.tsx
/** Horizontal category bars in the kit idiom: label + count on the left,
 *  a single-hue bar scaled to the max on the right. Deterministic divs -
 *  no chart library, no animation. */
export function CategoryBars({
  items,
  ariaLabel,
}: {
  items: { label: string; value: number; color: string }[];
  ariaLabel: string;
}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <ul aria-label={ariaLabel} className="space-y-2">
      {items.map(i => (
        <li key={i.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-figma-xs text-fw-body tabular-nums">{`${i.label} · ${i.value}`}</span>
          <span className="relative h-3 flex-1 overflow-hidden rounded bg-fw-wash">
            <span
              data-testid={`category-bar-${i.label}`}
              className="absolute inset-y-0 left-0 rounded"
              style={{ width: `${(i.value / max) * 100}%`, background: i.color }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
```

Add to `src/components/viz/kit/index.ts`: `export { CategoryBars } from './CategoryBars';`

- [ ] **Step 4: Rewrite the two chart consumers**

`src/features/ai-fabric/GovernanceDecisions.tsx`: delete the recharts import line and the whole `<div style={{ width: '100%', height: 200 }}>...<ResponsiveContainer>...</div>` block; in its place:

```tsx
        <div className="px-5 pb-4 pt-2">
          <CategoryBars ariaLabel="Decision counts" items={data.map(d => ({ label: d.name, value: d.count, color: d.color }))} />
        </div>
```

with `import { CategoryBars } from '../../components/viz/kit';`. Keep the header, the legend `<ul>`, the empty state, and the live `useCloudControlLive` subscription byte-identical.

`src/features/cost/EgressTrend.tsx`: full rewrite, same exported signature `EgressTrend({ actual, hyper }: { actual: number[]; hyper: number[] })`:

```tsx
import { VIZ_HEX, computeTrendGeometry } from '../../components/viz/kit';

const VIEW_W = 600;
const VIEW_H = 176;

/**
 * The widening gap, hand-rolled: what the same egress would cost at
 * hyperscaler public rates (cobalt band) vs what it actually costs on the
 * AT&T fabric (green line). The gap between them IS the accumulating
 * saving. One axis, three recessive gridlines, no animation.
 */
export function EgressTrend({ actual, hyper }: { actual: number[]; hyper: number[] }) {
  const both = [...actual, ...hyper];
  const max = Math.max(...both, 1);
  const gHyper = computeTrendGeometry(hyper.map(v => (v / max) * 100), VIEW_W, VIEW_H);
  const gActual = computeTrendGeometry(actual.map(v => (v / max) * 100), VIEW_W, VIEW_H);
  const gridYs = [0.25, 0.5, 0.75].map(f => VIEW_H * f);
  const kPerDay = (f: number) => `$${Math.round((max * (1 - f)) / 1000)}k/d`;
  return (
    <div className="h-44" role="img" aria-label="Egress spend on the fabric vs at hyperscaler rates, trailing 60 days">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full">
        {gridYs.map((y, i) => (
          <g key={y}>
            <line x1={0} y1={y} x2={VIEW_W} y2={y} stroke={VIZ_HEX.line} strokeDasharray="3 3" />
            <text x={4} y={y - 3} fill={VIZ_HEX.slateInk} className="text-[10px] tabular-nums">
              {kPerDay([0.25, 0.5, 0.75][i])}
            </text>
          </g>
        ))}
        <path d={gHyper.area} fill={VIZ_HEX.cobalt} fillOpacity={0.06} />
        <path d={gHyper.line} fill="none" stroke={VIZ_HEX.cobalt} strokeWidth={1.5} />
        <path d={gActual.line} fill="none" stroke="#00a862" strokeWidth={2} />
      </svg>
    </div>
  );
}
```

NOTE the scaling trick: both series are normalized to a shared max before `computeTrendGeometry` so the two lines share one y-axis (computeTrendGeometry scales to its own max; feeding pre-normalized 0-100 values with a shared denominator keeps them comparable). `#00a862` is the existing actual-line green from the current file - keep it verbatim (it is the money-green the Cost page already established; do not swap it for VIZ_HEX.green without a design pass).

Delete `src/components/monitoring/metrics/BgpStatusTimeline.tsx` (`git rm`); it has zero importers (verified this session; re-verify with `grep -rn "BgpStatusTimeline" src` before removing).

- [ ] **Step 5: Run everything touched**

Run: `npx vitest run src/components/viz/kit src/__tests__/vizkit-deps.test.ts src/features/ai-fabric src/features/cost`
Expected: PASS. If GovernanceDecisions or cost tests assert recharts internals, update only those assertions to the new DOM (legend text is unchanged, so most should hold) and say so in the report.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/viz/kit src/features/ai-fabric/GovernanceDecisions.tsx src/features/cost/EgressTrend.tsx src/__tests__/vizkit-deps.test.ts src/components/monitoring/metrics
git commit -m "feat(vizkit): the last two library charts fall - CategoryBars, hand-rolled EgressTrend, deps guard, dead timeline deleted"
```

---

### Task 6: Full-suite verification and visual check

**Files:** none created; verification only.

**Interfaces:** consumes everything above.

- [ ] **Step 1: Full unit suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 2: Dev-server walkthrough (gate mode)**

Walk these five moments in the browser and screenshot each:
1. `/naas/observe` → a series tab (Trend): the TrendBand replaces the bar bricks; drag the scrubber and confirm the cursor marker + readout still work.
2. `/naas/connect`: click the AT&T Fabric node → internals expand in place (sites, 4 paths, BFD caption); region edges do not move; click again → collapse.
3. `/naas/connect`: open Deploy managed VPC from a public region, reach the bring-up screen: stations run left to right and advance live.
4. `/ai/observe?tab=security`: Governance decisions renders CategoryBars, counts still tick live.
5. `/naas/cost`: EgressTrend renders the two-series gap hand-rolled.

- [ ] **Step 3: Commit any straggler fixes**

```bash
git add -A src
git commit -m "fix(vizkit): rendering fixes from browser verification"
```

(Skip if the walkthrough was clean.)

---

### Task 7 (addendum, owner-directed 2026-08-07): No horizontal scrolls; Discover leads with the Tree/Map

Direct requirements from Micah mid-execution: "NO HORIZONTAL SCROLLS. ON DISCOVER, TREE/MAP VIEW IS ON TOP."

**Files:**
- Modify: `src/features/connect/FabricHero.tsx:283-292` (wrapper div + svg className)
- Modify: `src/features/discover/AttachmentMap.tsx:35-38` (wrapper div + svg className)
- Modify: `src/features/discover/UnifiedDiscovery.tsx` (section order)
- Create: `src/__tests__/no-horizontal-scroll.test.ts`
- Test: extend `src/features/discover/UnifiedDiscovery.viewToggle.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: a standing guard test; no API changes.

- [ ] **Step 1: Write the failing guard test**

```ts
// src/__tests__/no-horizontal-scroll.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/** Owner rule (2026-08-07): spine visuals scale to their container - they
 *  never scroll sideways. SVGs with a viewBox already scale; a min-width
 *  plus overflow-x-auto forces a horizontal scrollbar instead. */
describe('no horizontal scroll on the spine', () => {
  it('no overflow-x-auto in spine feature code', () => {
    const files = execSync('git ls-files', { encoding: 'utf8' })
      .split('\n')
      .filter(f => /^src\/features\/(discover|connect|observe)\//.test(f) && /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f));
    const hits = files.filter(f => /overflow-x-auto/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL naming FabricHero.tsx and AttachmentMap.tsx**

Run: `npx vitest run src/__tests__/no-horizontal-scroll.test.ts`

- [ ] **Step 3: Make the two visuals scale instead of scroll**

- `FabricHero.tsx`: wrapper className `"rounded-2xl border border-fw-secondary bg-fw-base overflow-x-auto"` → `"rounded-2xl border border-fw-secondary bg-fw-base"`; svg className `"min-w-[720px]"` → removed entirely (the svg keeps `viewBox` + `width="100%"`, so it scales).
- `AttachmentMap.tsx`: wrapper `"min-w-0 flex-1 overflow-x-auto rounded-2xl ..."` → `"min-w-0 flex-1 rounded-2xl ..."`; svg `className="min-w-[860px]"` → removed (verify the svg has a viewBox + width 100%; if it has fixed width/height attributes instead, convert them to a viewBox with width="100%").
- Verify in the browser at 1280 and 1440 wide: neither visual shows a horizontal scrollbar; both remain legible (labels may shrink - acceptable; grotesque squash is not, report it if seen).

- [ ] **Step 4: Reorder Discover — the tree/map leads**

In `UnifiedDiscovery.tsx`, the render currently goes: FlowBar (~line 427) → stat-tile sections (Network / Cloud / AI workflows) → sites panel → tree controls (~line 525) → tree/map body (~548-727). Move the tree-controls + tree/map block (including the Tree/Map toggle and both `view === 'tree'` / `view === 'map'` branches) so it sits DIRECTLY after the FlowBar block; the stat sections and sites panel follow it. Do not change any block internally - this is a pure reorder. Keep every data-testid and tour anchor intact (check `src/features/tour/tourAnchors.test.tsx` still passes - tour anchors reference sections by testid, not position).

Add to `UnifiedDiscovery.viewToggle.test.tsx`, following its existing render arrangement:

```tsx
  it('the tree/map view leads the page - toggle renders before the Network section', () => {
    // render per this file's existing helper
    const toggle = screen.getByRole('button', { name: 'Tree view' });
    const network = screen.getByText('Network');
    expect(toggle.compareDocumentPosition(network) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
```

- [ ] **Step 5: Run the suites**

Run: `npx vitest run src/__tests__/no-horizontal-scroll.test.ts src/features/discover src/features/connect src/features/tour`
Expected: PASS. If a discover test asserts the old section order, update only that assertion and say so in the report.

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/no-horizontal-scroll.test.ts src/features/connect/FabricHero.tsx src/features/discover
git commit -m "feat(spine): visuals scale, never scroll sideways - and Discover leads with the tree"
```
