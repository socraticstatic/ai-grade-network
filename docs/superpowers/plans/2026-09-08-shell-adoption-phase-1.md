# Shell Adoption, Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put every NaaS and AI Fabric screen inside the shell drawn on the "AI Fabric UI" Figma page: product pills in the top bar, a 240px grouped rail, and a page frame with a KPI row and one "Act on it" row, then freeze the result to Figma.

**Architecture:** Three new shell components (`TopBar`, `GroupedRail`, `PageFrame`) replace `MainNav`, `LeftRail`, `PageSection`, `FlowBar`, and `StageIntent`. Nav data stays in `navItems.ts` and gains rail groups. Each page keeps its body and gets a small pure `*Kpis.ts` module that turns figures it already computes into the frame's KPI cards and its top finding. Their chart token names become aliases over ours.

**Tech Stack:** React 18, TypeScript, react-router (HashRouter), Tailwind with `fw-*` tokens, Vitest + Testing Library, Playwright e2e, the Figma freeze pipeline in `scripts/figma-handoff/`.

**Spec:** `docs/superpowers/specs/2026-09-08-shell-adoption-and-insights-design.md`

## Global Constraints

- Display copy says "AT&T AI-grade network" (bare: "the AI-grade network"); never "Cloud Connect" or "NetBond Advanced" as the portal name. `src/__tests__/rebrand.test.ts` enforces it.
- Product pill labels are exactly `AI Fabric` and `NaaS`, in that order.
- Rail width is 240px (`w-60`), always expanded, no collapse control, no `localStorage` key for it.
- No chart library: `src/__tests__/vizkit-deps.test.ts` fails on `recharts`, `chart.js`, `react-chartjs-2` under `src/features/`.
- No new rail item without a mounted route behind it (the nav test in Task 1 enforces it).
- The dark skin `src/styles/dark.css` is generated; never hand-edit it. Hand-edit only `src/styles/tokens.css`.
- No em dashes in any copy or comment you write.
- Hash routing: page-internal targets are query params (`?tab=`, `?panel=`, `?range=`), never a second `#`.
- Commit after every task with the message given; end every commit message with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Run `npx vitest run <file>` for the task's tests and `npx vitest run` before each commit; both must pass.

---

## File map

| File | Responsibility |
|---|---|
| `src/components/navigation/navItems.ts` (modify) | Nav data: layers, rail groups, product pill order, wordmark home, `railLayerFor` |
| `src/components/navigation/navItems.test.ts` (create) | Every rail item resolves to a mounted route |
| `src/styles/tokens.css` (modify) | Chart alias tokens, light and dark |
| `src/__tests__/chart-aliases.test.ts` (create) | Alias names present in both theme blocks |
| `scripts/figma-handoff/audit.cjs` (modify) | Allowlist gains their mint, light blue, lime, orange, red |
| `src/components/viz/KpiCard.tsx` (create) | One KPI card: label, delta pill, figure, sub-line |
| `src/components/common/ActOnIt.tsx` (create) | The one-row finding strip with a CTA |
| `src/components/common/DateRange.tsx` (create) | Range control bound to `?range=` plus `useDateRange()` |
| `src/components/common/layouts/PageFrame.tsx` (create) | Header row, KPI row, Act on it, body |
| `src/components/navigation/TopBar.tsx` (create) | Wordmark, product pills, Ask Andi, bell, avatar menu |
| `src/components/navigation/AvatarMenu.tsx` (create) | Avatar dropdown: search, tenant, tour, theme, undo, sign out |
| `src/components/navigation/GroupedRail.tsx` (create) | The 240px grouped rail |
| `src/components/common/layouts/DashboardLayout.tsx` (modify) | Mount TopBar and GroupedRail |
| `src/features/handoff/HandoffGallery.tsx` (modify) | Gallery sections use the new shell |
| `src/features/layer-home/homeKpis.ts` (create) | Stage rollup as KPI cards; hero as the finding |
| `src/features/connect/connectKpis.ts` (create) | Fabric model as KPI cards; worst region as the finding |
| `src/features/govern/governKpis.ts` (create) | Rules and violations as KPI cards and finding |
| `src/features/observe/observeKpis.ts` (create) | Binding KPIs as KPI cards; verdict as the finding |
| `src/features/cost/costKpis.ts` (create) | Arbitrage as KPI cards and finding |
| Pages under `src/features/` (modify) | Re-wrapped in `PageFrame` |
| `src/components/flow/*`, `src/features/_shared/StageIntent.tsx`, `MainNav.tsx`, `LeftRail.tsx` and their tests (delete) | Retired shell |
| `e2e/*.spec.ts` (modify) | Selectors for the new shell |

---

### Task 1: Nav data with rail groups

**Files:**
- Modify: `src/components/navigation/navItems.ts`
- Create: `src/components/navigation/navItems.test.ts`

**Interfaces:**
- Produces: `PRODUCT_LAYERS: NavLayer[]` (order `['ai','naas']`), `WORDMARK_HOME = '/naas/home'`, `railLayerFor(pathname: string, search: string): NavLayer | null`, and `RailSection[]` on both layers via `railSectionsFor(layer)`. Item labels are verbatim from the spec section 3.2.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/navigation/navItems.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { NAV_LAYERS, PRODUCT_LAYERS, WORDMARK_HOME, railSectionsFor, railLayerFor } from './navItems';

/** Every `path="..."` App.tsx mounts, pathname only. */
function mountedPaths(): Set<string> {
  const src = readFileSync('src/App.tsx', 'utf8');
  return new Set([...src.matchAll(/path="([^"]+)"/g)].map(m => m[1]));
}

describe('navItems: the grouped rails', () => {
  it('NaaS rail: Home, then Connect, Observe, Deep dive, Govern, labels verbatim', () => {
    const naas = NAV_LAYERS.find(l => l.key === 'naas')!;
    const groups = railSectionsFor(naas).map(s => [s.title ?? '', s.items.map(i => i.label)]);
    expect(groups).toEqual([
      ['', ['NaaS']],
      ['Connect', ['Fabric', 'Compose']],
      ['Observe', ['Traffic', 'Cost']],
      ['Deep dive', ['Explore 360', 'Logs']],
      ['Govern', ['Policies', 'Groups', 'Posture']],
    ]);
  });

  it('AI Fabric rail: theirs verbatim', () => {
    const ai = NAV_LAYERS.find(l => l.key === 'ai')!;
    const groups = railSectionsFor(ai).map(s => [s.title ?? '', s.items.map(i => i.label)]);
    expect(groups).toEqual([
      ['', ['AI Fabric']],
      ['Observe', ['Security & Governance', 'Cost', 'Performance & Reliability']],
      ['Deep dive', ['Explore 360', 'Logs']],
      ['Govern', ['Policies', 'Budget & Limits', 'Providers', 'Virtual Keys']],
    ]);
  });

  it('every rail item resolves to a mounted route', () => {
    const mounted = mountedPaths();
    for (const layer of NAV_LAYERS) {
      for (const item of railSectionsFor(layer).flatMap(s => s.items)) {
        const pathname = item.to.split('?')[0];
        expect(mounted.has(pathname), `${item.label} -> ${item.to}`).toBe(true);
      }
    }
  });

  it('product pills are AI Fabric then NaaS; the wordmark lands on NaaS Home in Phase 1', () => {
    expect(PRODUCT_LAYERS.map(l => l.label)).toEqual(['AI Fabric', 'NaaS']);
    expect(WORDMARK_HOME).toBe('/naas/home');
  });

  it('the rail stays up on Explore 360: /discover reads the NaaS rail, ?lens=ai reads the AI rail', () => {
    expect(railLayerFor('/discover', '')?.key).toBe('naas');
    expect(railLayerFor('/discover', '?lens=ai')?.key).toBe('ai');
    expect(railLayerFor('/ai/keys', '')?.key).toBe('ai');
    expect(railLayerFor('/tasks', '')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/navigation/navItems.test.ts`
Expected: FAIL, `PRODUCT_LAYERS` is not exported and the NaaS group list does not match.

- [ ] **Step 3: Rewrite the two layers and add the exports**

In `src/components/navigation/navItems.ts`, replace the `NAV_LAYERS` constant with:

```ts
export const NAV_LAYERS: NavLayer[] = [
  {
    key: 'naas',
    label: 'NaaS',
    blurb: 'Network as a service: the paths, the policy on them, and what they cost.',
    tagline: 'The network layer',
    home: { label: 'NaaS', to: '/naas/home', icon: 'home', description: 'The network layer at a glance' },
    /* Their grammar (Figma "AI Fabric UI" overview): labeled groups, text
       items. Ours adds a Connect group because Connect is a place in the
       layer-first rule, never an action hidden inside Govern. */
    railSections: [
      { items: [{ label: 'NaaS', to: '/naas/home', icon: 'home', description: 'The network layer at a glance' }] },
      {
        title: 'Connect',
        items: [
          { label: 'Fabric', to: '/naas/connect', icon: 'cloud', description: 'Attach clouds and sites to the fabric' },
          { label: 'Compose', to: '/naas/connect?compose=1', icon: 'plus', description: 'Describe the outcome; AT&T composes the connection' },
        ],
      },
      {
        title: 'Observe',
        items: [
          { label: 'Traffic', to: '/naas/observe', icon: 'high-meter', description: 'Paths, throughput, latency and loss' },
          { label: 'Cost', to: '/naas/cost', icon: 'bill', description: 'What the fabric saves and what is still on the table' },
        ],
      },
      {
        title: 'Deep dive',
        items: [
          { label: 'Explore 360', to: '/discover', icon: 'search', description: 'Every site, cloud, region and workload' },
          { label: 'Logs', to: '/naas/observe?panel=records', icon: 'checklist', description: 'Flow records behind the picture' },
        ],
      },
      {
        title: 'Govern',
        items: [
          { label: 'Policies', to: '/naas/govern?tab=policies', icon: 'check-shield', description: 'Rules over tags and regions' },
          { label: 'Groups', to: '/naas/govern?tab=groups', icon: 'person-group', description: 'What a policy names' },
          { label: 'Posture', to: '/naas/govern?tab=posture', icon: 'smart-meter', description: 'Enforcement and violations' },
        ],
      },
    ],
    items: [
      { label: 'Connect', to: '/naas/connect', icon: 'cloud', description: 'Attach clouds and sites to the fabric' },
      { label: 'Govern', to: '/naas/govern', icon: 'check-shield', description: 'Policy on network paths' },
      { label: 'Observe', to: '/naas/observe', icon: 'high-meter', description: 'Path health and performance' },
      { label: 'Cost', to: '/naas/cost', icon: 'bill', description: 'Transport and egress cost control' },
    ],
  },
  {
    key: 'ai',
    label: 'AI Fabric',
    blurb: 'The token layer: model endpoints, the agents calling them, and their budgets.',
    tagline: 'The token layer',
    home: { label: 'AI Fabric', to: '/ai/home', icon: 'home', description: 'The token layer at a glance' },
    /* Verbatim from the Figma "AI Fabric UI" overview rail. */
    railSections: [
      { items: [{ label: 'AI Fabric', to: '/ai/home', icon: 'home', description: 'The token layer at a glance' }] },
      {
        title: 'Observe',
        items: [
          { label: 'Security & Governance', to: '/ai/observe?tab=security', icon: 'check-shield', description: 'Governed versus shadow traffic, events, exposure' },
          { label: 'Cost', to: '/ai/observe?tab=savings', icon: 'bill', description: 'Spend, drivers, savings' },
          { label: 'Performance & Reliability', to: '/ai/observe?tab=performance', icon: 'high-meter', description: 'Success rate, TTFT, failover' },
        ],
      },
      {
        title: 'Deep dive',
        items: [
          { label: 'Explore 360', to: '/discover?lens=ai', icon: 'search', description: 'Every model, key and path' },
          { label: 'Logs', to: '/ai/observe?panel=records', icon: 'checklist', description: 'Request records' },
        ],
      },
      {
        title: 'Govern',
        items: [
          { label: 'Policies', to: '/ai/govern', icon: 'check-shield', description: 'Token policy and guardrails' },
          { label: 'Budget & Limits', to: '/ai/teams', icon: 'person-group', description: 'Budgets and limits by team' },
          { label: 'Providers', to: '/ai/providers', icon: 'apis', description: 'Model endpoints and neoclouds' },
          { label: 'Virtual Keys', to: '/ai/keys', icon: 'lock', description: 'Agent identities and scopes' },
        ],
      },
    ],
    items: [
      { label: 'Connect', to: '/ai/connect', icon: 'apis', description: 'Attach model endpoints and neoclouds' },
      { label: 'Govern', to: '/ai/govern', icon: 'check-shield', description: 'Token policy and guardrails' },
      { label: 'Observe', to: '/ai/observe', icon: 'high-meter', description: 'Prompt traces and agent decisions' },
      { label: 'Cost', to: '/ai/cost', icon: 'bill', description: 'Token budgets and spend' },
    ],
  },
];
```

Then, after `STACK_LAYERS`, add:

```ts
/** The top bar's product pills, in their file's order: AI Fabric, then NaaS. */
export const PRODUCT_LAYERS: NavLayer[] = STACK_LAYERS;

/** Where the wordmark lands. Phase 2 moves this to the unified Home. */
export const WORDMARK_HOME = '/naas/home';

/**
 * The layer whose rail stays up for a path. Layer routes answer for
 * themselves; Explore 360 (/discover) belongs to a layer's Deep dive group,
 * so it keeps the NaaS rail unless the AI lens is on. Global state routes
 * (/tasks) carry no rail.
 */
export function railLayerFor(pathname: string, search: string): NavLayer | null {
  const own = layerForPath(pathname);
  if (own) return own;
  if (pathname === '/discover' || pathname.startsWith('/discover/')) {
    const lens = new URLSearchParams(search).get('lens');
    return NAV_LAYERS.find(l => l.key === (lens === 'ai' ? 'ai' : 'naas')) ?? null;
  }
  return null;
}
```

Fix `isNavRouteActive` so items that carry a query match on the query too. Replace its body's last line with:

```ts
  const [hrefPath, hrefQuery] = href.split('?');
  if (hrefQuery) {
    // A grouped-rail item with a query (?tab=groups) is active only when the
    // current search carries the same pairs; otherwise two Govern items
    // would light together.
    return pathname === hrefPath && new URLSearchParams(hrefQuery).toString() ===
      new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').toString();
  }
  return pathname === hrefPath || pathname.startsWith(hrefPath + '/');
```

Also change `layerRail` and `railSectionsFor` to keep working: `railSectionsFor` already prefers `railSections`; `layerRail` stays for the drawer. Update the `MobileMenu.tsx` nothing; it reads `layerDestinations`, which dedupes by `to` and now includes query-bearing entries. That is fine for a drawer.

- [ ] **Step 4: Run the test and the existing nav tests**

Run: `npx vitest run src/components/navigation/`
Expected: `navItems.test.ts` PASS. `LeftRail.test.tsx` and `MainNav.curated.test.tsx` FAIL (they assert the old rail); they are deleted in Tasks 5 and 6. Everything else passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/navigation/navItems.ts src/components/navigation/navItems.test.ts
git commit -m "feat(nav): grouped rails from the AI Fabric UI shell, Connect group for NaaS

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Chart token aliases and the audit allowlist

**Files:**
- Modify: `src/styles/tokens.css` (light block near line 364, dark block near line 407)
- Modify: `scripts/figma-handoff/audit.cjs:18-25`
- Create: `src/__tests__/chart-aliases.test.ts`

**Interfaces:**
- Produces: CSS variables `--chart-1` … `--chart-5`, `--chart-func-success`, `--chart-func-warn`, `--chart-func-error`, `--chart-blocked`, `--chart-detected`, `--chart-light-fill-1` … `--chart-light-fill-5`, `--chart-light-fill-success`, `--chart-light-fill-warn`, `--chart-light-fill-error`, defined in both theme blocks.

Hex values come from the Figma variables on node 114:2488 and the Data VIZ frame's own order (att-blue, cobalt-700, mint, light-blue, functional-blue). The variable set names chart-2 as `#00c9ff` and chart-3 as `#00388f`; the frame text says the opposite. The frame is the designer's intent, so the aliases follow the frame.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/chart-aliases.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const ALIASES = [
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  '--chart-func-success', '--chart-func-warn', '--chart-func-error',
  '--chart-blocked', '--chart-detected',
  '--chart-light-fill-1', '--chart-light-fill-2', '--chart-light-fill-3', '--chart-light-fill-4', '--chart-light-fill-5',
  '--chart-light-fill-success', '--chart-light-fill-warn', '--chart-light-fill-error',
];

describe('their chart token names are aliases in both themes', () => {
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  const darkStart = css.indexOf('html.dark');
  const light = css.slice(0, darkStart);
  const dark = css.slice(darkStart);

  it.each(ALIASES)('%s is defined in the light block', name => {
    expect(light).toMatch(new RegExp(`${name}\\s*:`));
  });
  it.each(ALIASES)('%s is defined in the dark block', name => {
    expect(dark).toMatch(new RegExp(`${name}\\s*:`));
  });
  it('chart-1 is AT&T blue in light', () => {
    expect(light).toMatch(/--chart-1:\s*#009fdb/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/chart-aliases.test.ts`
Expected: FAIL, none of the aliases are defined.

- [ ] **Step 3: Add the aliases**

In `src/styles/tokens.css`, directly after the line `--chart-compare-public-wash: rgba(104, 110, 116, 0.10);` in the light `:root` block, add:

```css
  /* Aliases for the AI Fabric UI chart tokens (Figma page 113:51, Data VIZ
     frame). Their names, our values. Components reference these only through
     kit/palette.ts; nothing reads them by their Figma name. */
  --chart-1: #009fdb;            /* att-blue */
  --chart-2: #00388f;            /* cobalt-700 */
  --chart-3: #49eedc;            /* mint */
  --chart-4: #00c9ff;            /* light-blue */
  --chart-5: #0074b3;            /* functional-blue */
  --chart-func-success: #91dc00; /* lime */
  --chart-func-warn: #ff8500;    /* orange-400 */
  --chart-func-error: #ff605d;   /* red-400 */
  --chart-blocked: var(--chart-1);
  --chart-detected: var(--chart-2);
  --chart-light-fill-1: #e6f6fd;
  --chart-light-fill-2: #e6ecf5;
  --chart-light-fill-3: #ecfdfb;
  --chart-light-fill-4: #e6faff;
  --chart-light-fill-5: #e6f1f7;
  --chart-light-fill-success: #f4fbe6;
  --chart-light-fill-warn: #fff3e6;
  --chart-light-fill-error: #ffefef;
```

In the `html.dark` block, directly after `--chart-warn-wash: #222e3c;`, add:

```css
  --chart-1: #33b5eb;
  --chart-2: #6ea3e8;
  --chart-3: #5ef0e0;
  --chart-4: #4dd6ff;
  --chart-5: #3d8de0;
  --chart-func-success: #a6e534;
  --chart-func-warn: #ff9d33;
  --chart-func-error: #ff7f7c;
  --chart-blocked: var(--chart-1);
  --chart-detected: var(--chart-2);
  --chart-light-fill-1: #16324e;
  --chart-light-fill-2: #1b2f4a;
  --chart-light-fill-3: #143a3a;
  --chart-light-fill-4: #14364a;
  --chart-light-fill-5: #162e44;
  --chart-light-fill-success: #223a16;
  --chart-light-fill-warn: #3d2a14;
  --chart-light-fill-error: #3d1f1f;
```

In `scripts/figma-handoff/audit.cjs`, add one line inside the `TOKENS` set, after the VizKit line:

```js
  '#49eedc','#00c9ff','#91dc00','#ff8500','#ff605d',   // AI Fabric UI chart tokens (Figma 114:2488)
```

- [ ] **Step 4: Run the test and the dark generator's no-op check**

Run: `npx vitest run src/__tests__/chart-aliases.test.ts && node scripts/figma-handoff/generate-dark-css.mjs && git diff --stat src/styles/dark.css`
Expected: PASS; the generator reports no new unmapped classes and `dark.css` shows no diff (the aliases live in tokens.css, which the generator does not rewrite).

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css scripts/figma-handoff/audit.cjs src/__tests__/chart-aliases.test.ts
git commit -m "feat(tokens): AI Fabric UI chart token aliases, light and dark; audit allowlist

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: KpiCard, ActOnIt, DateRange

**Files:**
- Create: `src/components/viz/KpiCard.tsx`, `src/components/viz/KpiCard.test.tsx`
- Create: `src/components/common/ActOnIt.tsx`, `src/components/common/ActOnIt.test.tsx`
- Create: `src/components/common/DateRange.tsx`, `src/components/common/DateRange.test.tsx`
- Modify: `src/components/viz/index.ts` (export `KpiCard`)

**Interfaces:**
- Produces:
  ```ts
  export interface KpiCardProps { label: string; value: string; unit?: string; delta?: { text: string; good: boolean }; sub?: string; }
  export function KpiCard(props: KpiCardProps): JSX.Element  // data-testid="kpi-card"
  export type FindingTone = 'risk' | 'warn' | 'good' | 'info';
  export interface Finding { tone: FindingTone; sentence: string; cta?: { label: string; to?: string; onClick?: () => void }; key?: string; }
  export function ActOnIt({ finding }: { finding: Finding }): JSX.Element  // data-testid="act-on-it"
  export type Range = '24h' | '7d' | '30d' | '90d';
  export function useDateRange(): { range: Range; setRange: (r: Range) => void }
  export function DateRange(): JSX.Element  // data-testid="date-range", a <select aria-label="Date range">
  ```

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/viz/KpiCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KpiCard } from './KpiCard';

describe('KpiCard', () => {
  it('renders label, figure, unit and sub-line', () => {
    render(<KpiCard label="Total requests" value="128" unit="k" sub="126.9k success" />);
    expect(screen.getByTestId('kpi-card')).toHaveTextContent('Total requests');
    expect(screen.getByTestId('kpi-value')).toHaveTextContent('128k');
    expect(screen.getByText('126.9k success')).toBeInTheDocument();
  });
  it('the delta pill is green when good and red when bad, never by sign', () => {
    const { rerender } = render(<KpiCard label="Cost" value="$999" delta={{ text: '+5%', good: false }} />);
    expect(screen.getByTestId('kpi-delta')).toHaveAttribute('data-good', 'false');
    rerender(<KpiCard label="Savings" value="$240" delta={{ text: '+25%', good: true }} />);
    expect(screen.getByTestId('kpi-delta')).toHaveAttribute('data-good', 'true');
  });
});
```

```tsx
// src/components/common/ActOnIt.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ActOnIt } from './ActOnIt';

describe('ActOnIt', () => {
  it('renders the label, the sentence and a CTA link for risk', () => {
    render(
      <MemoryRouter>
        <ActOnIt finding={{ tone: 'risk', sentence: 'p95 over SLO on ap-southeast-1.', cta: { label: 'Steer the flow', to: '/naas/observe' } }} />
      </MemoryRouter>,
    );
    const strip = screen.getByTestId('act-on-it');
    expect(strip).toHaveAttribute('data-tone', 'risk');
    expect(strip).toHaveTextContent('Act on it');
    expect(strip).toHaveTextContent('p95 over SLO on ap-southeast-1.');
    expect(screen.getByRole('link', { name: 'Steer the flow' })).toHaveAttribute('href', '/naas/observe');
  });
  it('good and info render the CTA as a plain link, not a button', () => {
    render(
      <MemoryRouter>
        <ActOnIt finding={{ tone: 'good', sentence: '$12,400/mo avoidable.', cta: { label: 'See the arithmetic', to: '/naas/cost' } }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'See the arithmetic' })).toHaveAttribute('data-variant', 'link');
  });
});
```

```tsx
// src/components/common/DateRange.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { DateRange, useDateRange } from './DateRange';

function Probe() {
  const { range } = useDateRange();
  const { search } = useLocation();
  return <p data-testid="probe">{range}|{search}</p>;
}

describe('DateRange', () => {
  it('defaults to 7d and writes ?range= on change', () => {
    render(
      <MemoryRouter initialEntries={['/naas/observe']}>
        <Routes><Route path="/naas/observe" element={<><DateRange /><Probe /></>} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('7d|');
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: '30d' } });
    expect(screen.getByTestId('probe')).toHaveTextContent('30d|?range=30d');
  });
  it('reads an existing ?range= from the URL', () => {
    render(
      <MemoryRouter initialEntries={['/naas/observe?range=90d']}>
        <Routes><Route path="/naas/observe" element={<><DateRange /><Probe /></>} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Date range')).toHaveValue('90d');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/viz/KpiCard.test.tsx src/components/common/ActOnIt.test.tsx src/components/common/DateRange.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the components**

```tsx
// src/components/viz/KpiCard.tsx
export interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  /** Direction pill, top right. `good` decides the color, never the sign:
   *  "Cost +5%" is red, "Savings +25%" is green, as in the Figma. */
  delta?: { text: string; good: boolean };
  /** One line of evidence under the figure. */
  sub?: string;
}

/** Their KPI card: label, delta pill, big figure, one sub-line. */
export function KpiCard({ label, value, unit, delta, sub }: KpiCardProps) {
  return (
    <div
      data-testid="kpi-card"
      className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-fw-secondary bg-fw-base p-4 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-figma-sm font-medium text-fw-heading">{label}</p>
        {delta && (
          <span
            data-testid="kpi-delta"
            data-good={delta.good ? 'true' : 'false'}
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              delta.good ? 'bg-[var(--chart-light-fill-success)] text-fw-success' : 'bg-[var(--chart-light-fill-error)] text-fw-error'
            }`}
          >
            {delta.text}
          </span>
        )}
      </div>
      <p data-testid="kpi-value" className="text-fw-heading leading-9">
        <span className="text-[34px] font-bold tracking-[-0.03em] tabular-nums">{value}</span>
        {unit && <span className="ml-0.5 text-xl font-bold">{unit}</span>}
      </p>
      {sub ? <p className="text-xs text-fw-bodyLight">{sub}</p> : <span className="h-4" aria-hidden="true" />}
    </div>
  );
}
```

```tsx
// src/components/common/ActOnIt.tsx
import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';

export type FindingTone = 'risk' | 'warn' | 'good' | 'info';

/** One finding: one tone, one sentence with the figure in it, one CTA that
 *  lands on the screen that fixes it. Spec section 6. */
export interface Finding {
  tone: FindingTone;
  sentence: string;
  cta?: { label: string; to?: string; onClick?: () => void };
  /** Requirement key (AO-363) when the finding traces to one. */
  key?: string;
}

const BUTTON =
  'inline-flex h-9 items-center rounded-full border border-fw-secondary bg-fw-base px-4 text-figma-sm font-medium text-fw-heading transition-colors hover:border-fw-active hover:text-fw-link';
const LINK = 'inline-flex h-9 items-center text-figma-sm font-medium text-fw-link hover:underline';

/** Their "Act on it" strip. Risk and warn get a button; good and info a link. */
export function ActOnIt({ finding }: { finding: Finding }) {
  const asButton = finding.tone === 'risk' || finding.tone === 'warn';
  const cls = asButton ? BUTTON : LINK;
  const variant = asButton ? 'button' : 'link';
  let action = null;
  if (finding.cta?.to) {
    action = <Link to={finding.cta.to} data-variant={variant} className={cls}>{finding.cta.label}</Link>;
  } else if (finding.cta) {
    action = <button type="button" onClick={finding.cta.onClick} data-variant={variant} className={cls}>{finding.cta.label}</button>;
  }
  return (
    <section
      data-testid="act-on-it"
      data-tone={finding.tone}
      aria-label="Act on it"
      className="flex items-center gap-4 rounded-2xl border border-fw-secondary bg-fw-base px-5 py-3"
    >
      <Lightbulb className="h-5 w-5 flex-shrink-0 text-fw-bodyLight" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-figma-sm font-semibold text-fw-heading">Act on it</p>
        <p className="text-figma-sm text-fw-body">{finding.sentence}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </section>
  );
}
```

```tsx
// src/components/common/DateRange.tsx
import { useSearchParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';

export type Range = '24h' | '7d' | '30d' | '90d';
const RANGES: { id: Range; label: string }[] = [
  { id: '24h', label: 'Last 24 hrs' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];
const DEFAULT: Range = '7d';

/** The page's time window, held in the URL so every KPI, chart and finding
 *  on the page reads the same one. Absent means the default. */
export function useDateRange() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('range');
  const range: Range = RANGES.some(r => r.id === raw) ? (raw as Range) : DEFAULT;
  const setRange = (r: Range) => {
    const next = new URLSearchParams(params);
    if (r === DEFAULT) next.delete('range'); else next.set('range', r);
    setParams(next, { replace: true });
  };
  return { range, setRange };
}

/** Their header-row control: calendar glyph, "Last 7 days", chevron. */
export function DateRange() {
  const { range, setRange } = useDateRange();
  return (
    <label data-testid="date-range" className="inline-flex items-center gap-1.5 text-figma-sm font-medium text-fw-heading">
      <Calendar className="h-4 w-4 text-fw-bodyLight" aria-hidden="true" />
      <select
        aria-label="Date range"
        value={range}
        onChange={e => setRange(e.target.value as Range)}
        className="bg-transparent pr-1 font-medium text-fw-heading focus:outline-none"
      >
        {RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
    </label>
  );
}
```

Add `export { KpiCard } from './KpiCard'; export type { KpiCardProps } from './KpiCard';` to `src/components/viz/index.ts`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/viz/KpiCard.test.tsx src/components/common/ActOnIt.test.tsx src/components/common/DateRange.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/viz/KpiCard.tsx src/components/viz/KpiCard.test.tsx src/components/viz/index.ts src/components/common/ActOnIt.tsx src/components/common/ActOnIt.test.tsx src/components/common/DateRange.tsx src/components/common/DateRange.test.tsx
git commit -m "feat(shell): KpiCard, ActOnIt and DateRange primitives from the AI Fabric UI

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: PageFrame

**Files:**
- Create: `src/components/common/layouts/PageFrame.tsx`, `src/components/common/layouts/PageFrame.test.tsx`
- Modify: `src/components/common/layouts/index.ts` (export `PageFrame`)

**Interfaces:**
- Consumes: `KpiCard`, `KpiCardProps`, `ActOnIt`, `Finding`, `DateRange`.
- Produces:
  ```ts
  export interface PageFrameProps { title: string; kpis: KpiCardProps[]; finding?: Finding | null; updatedLabel?: string; children: ReactNode; }
  export function PageFrame(props: PageFrameProps): JSX.Element
  ```
  DOM: `data-testid="page-frame"`, `<h1>` title, `data-testid="page-updated"`, `data-testid="kpi-row"` containing the cards, at most one `act-on-it`, then children.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/common/layouts/PageFrame.test.tsx
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { PageFrame } from './PageFrame';

const kpis = [
  { label: 'Workloads private', value: '86', unit: '%' },
  { label: 'Regions attached', value: '16 of 18' },
  { label: 'Saved', value: '$61,400', unit: '/mo', delta: { text: '+4%', good: true } },
];

describe('PageFrame', () => {
  it('header row, KPI row, one Act on it, then the body', () => {
    render(
      <MemoryRouter>
        <PageFrame title="NaaS" kpis={kpis} finding={{ tone: 'warn', sentence: '4 regions still ride the public internet.', cta: { label: 'Attach them', to: '/naas/connect' } }}>
          <p>body</p>
        </PageFrame>
      </MemoryRouter>,
    );
    const frame = screen.getByTestId('page-frame');
    expect(within(frame).getByRole('heading', { level: 1 })).toHaveTextContent('NaaS');
    expect(within(frame).getByTestId('page-updated')).toHaveTextContent(/Updated/);
    expect(within(frame).getByLabelText('Date range')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-row')).getAllByTestId('kpi-card')).toHaveLength(3);
    expect(within(frame).getAllByTestId('act-on-it')).toHaveLength(1);
    expect(within(frame).getByText('body')).toBeInTheDocument();
    // Order: header, kpis, act on it, body.
    const html = frame.innerHTML;
    expect(html.indexOf('kpi-row')).toBeLessThan(html.indexOf('act-on-it'));
    expect(html.indexOf('act-on-it')).toBeLessThan(html.indexOf('body'));
  });
  it('no finding, no strip', () => {
    render(<MemoryRouter><PageFrame title="Cost" kpis={kpis}><p>body</p></PageFrame></MemoryRouter>);
    expect(screen.queryByTestId('act-on-it')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/common/layouts/PageFrame.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write PageFrame**

```tsx
// src/components/common/layouts/PageFrame.tsx
import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { KpiCard, type KpiCardProps } from '../../viz/KpiCard';
import { ActOnIt, type Finding } from '../ActOnIt';
import { DateRange } from '../DateRange';

export interface PageFrameProps {
  title: string;
  /** Three to five cards. More than five is a design error, not a layout case. */
  kpis: KpiCardProps[];
  /** The page's top finding. Exactly one strip when present. */
  finding?: Finding | null;
  /** "Updated 5m ago" by default; pages with a live feed pass their own. */
  updatedLabel?: string;
  children: ReactNode;
}

/**
 * The page template from the AI Fabric UI overview: header row (title,
 * updated, date range), KPI row, Act on it, then the body. Spec section 4.
 */
export function PageFrame({ title, kpis, finding, updatedLabel = 'Updated 5m ago', children }: PageFrameProps) {
  const cols = Math.min(5, Math.max(1, kpis.length));
  return (
    <div data-testid="page-frame" className="mx-auto max-w-[1440px] px-6 pb-10 pt-5">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-fw-secondary pb-4">
        <h1 className="text-figma-xl font-bold tracking-[-0.03em] text-fw-heading">{title}</h1>
        <div className="flex items-center gap-3">
          <span data-testid="page-updated" className="inline-flex items-center gap-1.5 text-xs text-fw-bodyLight">
            {updatedLabel}
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="h-4 w-px bg-fw-secondary" aria-hidden="true" />
          <DateRange />
        </div>
      </header>

      {kpis.length > 0 && (
        <div
          data-testid="kpi-row"
          className="mb-4 grid gap-4"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {kpis.map(k => <KpiCard key={k.label} {...k} />)}
        </div>
      )}

      {finding && <div className="mb-6"><ActOnIt finding={finding} /></div>}

      <div className="space-y-6">{children}</div>
    </div>
  );
}
```

Add `export { PageFrame } from './PageFrame'; export type { PageFrameProps } from './PageFrame';` to `src/components/common/layouts/index.ts`.

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/components/common/layouts/PageFrame.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/layouts/PageFrame.tsx src/components/common/layouts/PageFrame.test.tsx src/components/common/layouts/index.ts
git commit -m "feat(shell): PageFrame, the AI Fabric UI page template

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: TopBar replaces MainNav

**Files:**
- Create: `src/components/navigation/TopBar.tsx`, `src/components/navigation/AvatarMenu.tsx`, `src/components/navigation/TopBar.test.tsx`
- Modify: `src/components/common/layouts/DashboardLayout.tsx:2,68`
- Modify: `src/features/handoff/HandoffGallery.tsx:12,61-62`
- Delete: `src/components/navigation/MainNav.tsx`, `MainNav.test.tsx`, `MainNav.curated.test.tsx`, `MainNav.tourReach.test.tsx`, `src/components/navigation/CreateMenu.tsx` and its test if one exists.

**Interfaces:**
- Consumes: `PRODUCT_LAYERS`, `WORDMARK_HOME`, `layerForPath`, `toggleAndi`, `TasksButton`-style queue derivation via `workQueue`, `TenantSelector`, `ThemeToggle`, `UndoControl`, `TourLauncher` + `START_TOUR_EVENT`, `CommandPalette`, `MobileMenu`, `useAuth`.
- Produces: `TopBar` with `aria-label="Main navigation"`, `role="tablist" aria-label="Products"` holding two `role="tab"` links, `data-testid="andi-toggle"` (the Ask Andi pill), `data-testid="tasks-badge"` (the bell) with `data-testid="tasks-badge-count"` dot, `data-testid="avatar-menu"` button opening `role="menu" aria-label="Account"`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/navigation/TopBar.test.tsx
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { TopBar } from './TopBar';
import { AuthProvider } from '../../contexts/AuthContext';

const renderBar = (path = '/naas/home') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><TopBar /></AuthProvider>
    </MemoryRouter>,
  );

describe('TopBar: the AI Fabric UI shell', () => {
  test('two product pills, AI Fabric then NaaS, each to its Home; no Discover, no verbs', () => {
    renderBar();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(t => t.textContent?.trim())).toEqual(['AI Fabric', 'NaaS']);
    expect(tabs[0]).toHaveAttribute('href', '/ai/home');
    expect(tabs[1]).toHaveAttribute('href', '/naas/home');
    for (const gone of ['Discover', 'Connect', 'Govern', 'Observe', 'Cost']) {
      expect(screen.queryByRole('tab', { name: gone })).toBeNull();
    }
  });

  test('the active pill tracks the layer, from any of its routes', () => {
    renderBar('/ai/keys');
    expect(screen.getByRole('tab', { name: 'AI Fabric' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'NaaS' })).toHaveAttribute('aria-selected', 'false');
  });

  test('the wordmark is a link to the wordmark home', () => {
    renderBar();
    expect(screen.getByRole('link', { name: /AI-grade network/ })).toHaveAttribute('href', '/naas/home');
  });

  test('Ask Andi is a labeled pill; the bell carries the tasks dot', () => {
    renderBar();
    expect(screen.getByTestId('andi-toggle')).toHaveTextContent('Ask Andi');
    expect(screen.getByTestId('tasks-badge')).toBeInTheDocument();
    expect(Number(screen.getByTestId('tasks-badge-count').dataset.count)).toBeGreaterThan(0);
  });

  test('search, tenant, tour, theme and sign out live behind the avatar', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('avatar-menu'));
    const menu = screen.getByRole('menu', { name: 'Account' });
    for (const item of ['Search', 'Start guided tour', 'Sign out']) {
      expect(within(menu).getByRole('menuitem', { name: new RegExp(item) })).toBeInTheDocument();
    }
    expect(within(menu).getByTestId('tenant-selector')).toBeInTheDocument();
    expect(within(menu).getByTestId('theme-toggle')).toBeInTheDocument();
  });

  test('the guided tour launcher stays mounted at every width', () => {
    renderBar();
    expect(screen.getByTestId('tour-launcher')).toBeInTheDocument();
  });
});
```

If `TenantSelector`, `ThemeToggle`, or `TourLauncher` lack those test ids, add `data-testid="tenant-selector"`, `data-testid="theme-toggle"`, and `data-testid="tour-launcher"` to their root elements; that is a one-attribute change each and part of this task.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/navigation/TopBar.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write AvatarMenu and TopBar**

```tsx
// src/components/navigation/AvatarMenu.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Play, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TenantSelector } from './TenantSelector';
import { ThemeToggle } from './ThemeToggle';
import { UndoControl } from '../../features/undo/UndoControl';
import { START_TOUR_EVENT } from '../../features/tour/TourLauncher';

const ITEM = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-figma-sm text-fw-body transition-colors hover:bg-fw-wash';

/** Everything the old utility cluster held that their bar does not show:
 *  search, tenant, tour, theme, undo, sign out. One menu, each with a label. */
export function AvatarMenu({ initials }: { initials: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const openSearch = () => {
    setOpen(false);
    // CommandPalette listens for Cmd/Ctrl+K; dispatch the same chord.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="avatar-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen(o => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-fw-secondary bg-fw-base text-figma-xs font-semibold text-fw-heading"
      >
        {initials}
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-fw-secondary bg-fw-base p-1.5 shadow-lg" style={{ zIndex: 60 }}>
          <button type="button" role="menuitem" onClick={openSearch} className={ITEM}>
            <Search className="h-4 w-4" aria-hidden="true" /> Search <span className="ml-auto text-xs text-fw-bodyLight">⌘K</span>
          </button>
          <div role="menuitem" className="px-1 py-1"><TenantSelector /></div>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); window.dispatchEvent(new Event(START_TOUR_EVENT)); }}
            className={ITEM}
          >
            <Play className="h-4 w-4" aria-hidden="true" /> Start guided tour
          </button>
          <div role="menuitem" className="px-1 py-1"><ThemeToggle /></div>
          <div role="menuitem" className="px-1 py-1"><UndoControl /></div>
          <div className="my-1 border-t border-fw-secondary" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            onClick={async () => { setOpen(false); await signOut(); navigate('/login'); }}
            className={ITEM}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/components/navigation/TopBar.tsx
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Sparkles } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { PRODUCT_LAYERS, WORDMARK_HOME, layerForPath } from './navItems';
import { AvatarMenu } from './AvatarMenu';
import { MobileMenu } from './MobileMenu';
import { TourLauncher } from '../../features/tour/TourLauncher';
import { CommandPalette } from '../../features/command/CommandPalette';
import { toggleAndi } from '../../features/andi/AndiPanel';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { workQueue } from '../../features/work/workQueue';
import { useStore } from '../../store/useStore';

/**
 * The top bar from the AI Fabric UI overview: wordmark, two product pills,
 * then Ask Andi, the bell, the avatar. Discover is a rail item now (Explore
 * 360); tasks ride the bell as a dot; everything occasional lives behind
 * the avatar. Spec section 3.1.
 */
export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tenantBranding = useStore(s => s.tenantBranding);
  const active = layerForPath(pathname)?.key ?? null;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { count, violated } = useCloudControl(cc => {
    const rows = workQueue(cc);
    return { count: rows.length, violated: rows.some(r => r.status === 'violated') };
  });

  const userInfo = { name: 'Emilio', role: 'Admin', account: 'AT&T', email: 'emilio.estevez@att.com' };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-fw-secondary bg-fw-base" role="navigation" aria-label="Main navigation">
        <div className="flex h-16 w-full items-center justify-between pl-6 pr-4">
          <div className="flex min-w-0 items-center gap-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-fw-bodyLight hover:bg-fw-wash min-[1024px]:hidden"
              data-nav-toggle="true"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to={WORDMARK_HOME} className="flex flex-shrink-0 items-baseline gap-1.5" aria-label="AT&T AI-grade network, home">
              {tenantBranding.productName === 'AI-grade network' ? (
                <>
                  <span className="text-[11px] font-bold tracking-[-0.02em] text-brand-accent">AT&T</span>
                  <span className="text-[22px] font-bold tracking-[-0.03em] text-fw-heading">AI-grade network</span>
                </>
              ) : (
                <span className="text-[22px] font-bold tracking-[-0.03em]" style={{ color: tenantBranding.primaryColor }}>{tenantBranding.productName}</span>
              )}
            </Link>

            {/* Product pills: AI Fabric, NaaS. A pill lands on its Home. */}
            <div className="hidden items-center gap-1 rounded-full bg-fw-wash p-1 min-[1024px]:flex" role="tablist" aria-label="Products">
              {PRODUCT_LAYERS.map(layer => {
                const on = active === layer.key;
                return (
                  <Link
                    key={layer.key}
                    to={layer.home.to}
                    role="tab"
                    aria-selected={on}
                    aria-current={on ? 'page' : undefined}
                    className={`inline-flex h-8 items-center rounded-full px-3 text-figma-sm font-medium transition-colors ${
                      on ? 'bg-fw-accent text-fw-link' : 'text-fw-heading hover:bg-fw-base'
                    }`}
                  >
                    {layer.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="andi-toggle"
              onClick={toggleAndi}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-fw-secondary bg-fw-base px-3 text-figma-sm font-medium text-fw-heading transition-colors hover:border-fw-active"
            >
              <Sparkles className="h-4 w-4 text-fw-link" aria-hidden="true" />
              Ask Andi
            </button>

            {/* The bell: tasks are state that follows you. A dot, red only
                when a promise is violated. Click opens the queue. */}
            <button
              type="button"
              data-testid="tasks-badge"
              aria-label={`Tasks: ${count} pending${violated ? ', promises violated' : ''}`}
              onClick={() => navigate('/tasks')}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-fw-heading transition-colors hover:bg-fw-wash"
            >
              <AttIcon name="bell" className="h-5 w-5" />
              {count > 0 && (
                <span
                  data-testid="tasks-badge-count"
                  data-count={count}
                  data-violated={violated ? 'true' : 'false'}
                  aria-hidden="true"
                  className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-fw-base ${violated ? 'bg-fw-error' : 'bg-fw-cobalt-600'}`}
                />
              )}
            </button>

            {/* Mounted at every width: it owns the running tour's state. */}
            <span data-testid="tour-launcher"><TourLauncher trigger="none" /></span>

            <AvatarMenu initials="LG" />
          </div>
        </div>
        <CommandPalette />
      </nav>

      <MobileMenu isOpen={mobileOpen && isMobile} onClose={() => setMobileOpen(false)} userInfo={{ ...userInfo, avatar: '' }} notifications={0} />
    </>
  );
}
```

If `TourLauncher` already renders a root with a test id, drop the wrapping `<span>` and put `data-testid="tour-launcher"` on its root instead. If `MobileMenu`'s `userInfo` type requires `avatar`, keep the empty string.

In `DashboardLayout.tsx`, replace `import { MainNav } from '../../navigation/MainNav';` with `import { TopBar } from '../../navigation/TopBar';` and `<MainNav />` with `<TopBar />`.

In `HandoffGallery.tsx`, replace the `MainNav` import and section with `TopBar`:

```tsx
import { TopBar } from '../../components/navigation/TopBar';
// ...
      <Section name="TopBar">
        <TopBar />
      </Section>
```

Delete `MainNav.tsx`, its three tests, and `CreateMenu.tsx` (plus `CreateMenu.test.tsx` if present). Grep first: `grep -rn "CreateMenu\|MainNav" src e2e --include=*.ts --include=*.tsx`; every hit must be gone or updated (`HandoffGallery.test.tsx` names the section "MainNav": rename to "TopBar").

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/navigation/TopBar.test.tsx src/features/handoff/ src/features/andi/`
Expected: PASS. Then `npx vitest run` overall: only `LeftRail.test.tsx` fails (Task 6 removes it).

- [ ] **Step 5: Commit**

```bash
git add -A src/components/navigation src/components/common/layouts/DashboardLayout.tsx src/features/handoff src/features/tour src/features/undo
git commit -m "feat(shell): TopBar with product pills, Ask Andi, bell and avatar menu; MainNav retired

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: GroupedRail replaces LeftRail

**Files:**
- Create: `src/components/navigation/GroupedRail.tsx`, `src/components/navigation/GroupedRail.test.tsx`
- Modify: `src/components/common/layouts/DashboardLayout.tsx:4,90`
- Modify: `src/features/handoff/HandoffGallery.tsx:13,65-68`, `src/features/handoff/HandoffGallery.test.tsx:40-43`
- Delete: `src/components/navigation/LeftRail.tsx`, `LeftRail.test.tsx`

**Interfaces:**
- Consumes: `railLayerFor`, `railSectionsFor`, `isNavRouteActive`, `GatewaySelector`, `AttIcon`.
- Produces: `GroupedRail` with `data-testid="left-rail"`, `aria-label="<layer> sections"`, group headings as `<p data-testid="rail-group">`, items `data-testid="rail-<slug>"` where slug is the label lowercased with non-letters collapsed to `-` (`rail-explore-360`, `rail-budget-limits`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/navigation/GroupedRail.test.tsx
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { GroupedRail } from './GroupedRail';

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><GroupedRail /></MemoryRouter>);

describe('GroupedRail', () => {
  test('absent on global state routes', () => {
    renderAt('/tasks');
    expect(screen.queryByTestId('left-rail')).toBeNull();
  });

  test('NaaS: Home, then Connect, Observe, Deep dive, Govern, 240px, no collapse', () => {
    renderAt('/naas/connect');
    const rail = screen.getByTestId('left-rail');
    expect(within(rail).getAllByTestId('rail-group').map(p => p.textContent)).toEqual(['Connect', 'Observe', 'Deep dive', 'Govern']);
    const labels = within(rail).getAllByRole('link').map(a => a.textContent?.trim());
    expect(labels).toEqual(['NaaS', 'Fabric', 'Compose', 'Traffic', 'Cost', 'Explore 360', 'Logs', 'Policies', 'Groups', 'Posture']);
    expect(rail.className).toContain('w-60');
    expect(screen.queryByTestId('rail-collapse-toggle')).toBeNull();
    expect(screen.queryByTestId('rail-layer-switcher')).toBeNull();
  });

  test('AI Fabric: their groups, Budget & Limits relabeled, gateway selector kept', () => {
    renderAt('/ai/teams');
    const rail = screen.getByTestId('left-rail');
    expect(within(rail).getAllByTestId('rail-group').map(p => p.textContent)).toEqual(['Observe', 'Deep dive', 'Govern']);
    expect(within(rail).getByTestId('rail-budget-limits')).toHaveAttribute('href', '/ai/teams');
    expect(within(rail).getByTestId('gateway-selector')).toBeInTheDocument();
    expect(rail.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/ai/teams');
  });

  test('Explore 360 keeps the rail up: NaaS on /discover, AI with the lens', () => {
    renderAt('/discover');
    expect(screen.getByTestId('left-rail')).toHaveAttribute('aria-label', 'NaaS sections');
    expect(screen.getByTestId('left-rail').querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('/discover');
  });

  test('a query-bearing item is active only with its query', () => {
    renderAt('/naas/govern?tab=groups');
    const active = screen.getByTestId('left-rail').querySelectorAll('[aria-current="page"]');
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute('href')).toBe('/naas/govern?tab=groups');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/navigation/GroupedRail.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write GroupedRail**

`isNavRouteActive` reads `window.location.search`, which MemoryRouter does not set. Give it the search explicitly instead: change its signature in `navItems.ts` to `isNavRouteActive(pathname: string, href: string, search = '')` and use `search` in place of `window.location.search`. Update the one call in `MobileMenu.tsx` to pass `location.search`.

```tsx
// src/components/navigation/GroupedRail.tsx
import { Link, useLocation } from 'react-router-dom';
import { AttIcon } from '../icons/AttIcon';
import { isNavRouteActive, railLayerFor, railSectionsFor } from './navItems';
import { GatewaySelector } from './GatewaySelector';

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * The 240px grouped rail from the AI Fabric UI overview: the layer's Home
 * first, then labeled groups of text items with AT&T icons. Always
 * expanded; no collapse, no switcher (the product pills switch layers).
 * Renders on layer routes and on Explore 360. Desktop only; the mobile
 * drawer carries the same destinations. Spec section 3.2.
 */
export function GroupedRail() {
  const { pathname, search } = useLocation();
  const layer = railLayerFor(pathname, search);
  if (!layer) return null;

  return (
    <nav
      aria-label={`${layer.label} sections`}
      data-testid="left-rail"
      className="hidden w-60 flex-shrink-0 flex-col border-r border-fw-secondary bg-fw-base px-3 py-4 min-[1024px]:flex"
    >
      {layer.key === 'ai' && <GatewaySelector />}
      {railSectionsFor(layer).map((section, si) => (
        <div key={section.title ?? si} className="w-full">
          {section.title && (
            <p data-testid="rail-group" className="px-3 pb-1 pt-5 text-figma-xs font-bold text-fw-heading">
              {section.title}
            </p>
          )}
          <ul className="w-full space-y-0.5">
            {section.items.map(item => {
              const active = isNavRouteActive(pathname, item.to, search);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    data-testid={`rail-${slug(item.label)}`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-figma-sm font-medium transition-colors ${
                      active ? 'bg-fw-accent text-fw-link' : 'text-fw-body hover:bg-fw-wash hover:text-fw-heading'
                    }`}
                  >
                    <AttIcon name={item.icon} className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-fw-link' : 'text-fw-bodyLight'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

Explore 360 activeness: `isNavRouteActive('/discover', '/discover', '')` is true by the exact match, and `'/discover?lens=ai'` matches only with the lens. Good.

In `DashboardLayout.tsx`, replace the `LeftRail` import and element with `GroupedRail`. In `HandoffGallery.tsx` replace the `LeftRail` import and section (`<Section name="GroupedRail">`), and update `HandoffGallery.test.tsx` line 43 to `[data-handoff="GroupedRail"] [data-testid="left-rail"]`. Delete `LeftRail.tsx` and `LeftRail.test.tsx`. Grep `LeftRail` across `src` and `e2e`; nothing may remain.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`
Expected: all green except tests that assert the old page chrome (`FlowStepper.test.tsx`, `FlowBar.test.tsx`, `useFlowProgress.test.tsx`), which Task 10 removes with their components. If any page test fails on `PageSection` or `FlowBar`, note it for Tasks 7 to 9.

- [ ] **Step 5: Commit**

```bash
git add -A src/components/navigation src/components/common/layouts/DashboardLayout.tsx src/features/handoff
git commit -m "feat(shell): GroupedRail, the 240px grouped rail; LeftRail retired

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: NaaS Home and Connect in the frame

**Files:**
- Create: `src/features/layer-home/homeKpis.ts`, `src/features/layer-home/homeKpis.test.ts`
- Create: `src/features/connect/connectKpis.ts`, `src/features/connect/connectKpis.test.ts`
- Modify: `src/features/layer-home/LayerHomePage.tsx:18-50`
- Modify: `src/features/connect/ConnectPage.tsx:4-8,169-240`

**Interfaces:**
- Consumes: `stageRollup(cc, surface): StageCard[]`, `layerHero(cc, surface): LayerHero`, `FabricModel`, `connectVerdict`, `PageFrame`, `Finding`, `KpiCardProps`.
- Produces:
  ```ts
  export function homeKpis(stages: StageCard[]): KpiCardProps[]
  export function homeFinding(hero: LayerHero): Finding
  export function connectKpis(model: FabricModel): KpiCardProps[]
  export function connectFinding(model: FabricModel): Finding | null
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/layer-home/homeKpis.test.ts
import { describe, it, expect } from 'vitest';
import { homeKpis, homeFinding } from './homeKpis';
import type { StageCard } from './stageRollup';
import type { LayerHero } from './heroModel';

const stage = (key: string, label: string, value: string, caption: string, alarm = false): StageCard =>
  ({ key, label, value, caption, detail: null, to: `/naas/${key}`, progress: null, alarm });

describe('homeKpis', () => {
  it('one card per stage, label from the caption, alarm reads as a bad delta', () => {
    const cards = homeKpis([
      stage('discover', 'Discover', '940', 'assets discovered'),
      stage('connect', 'Connect', '16 of 18', 'regions attached'),
      stage('govern', 'Govern', '14 of 16', 'policies enforced'),
      stage('observe', 'Observe', '95%', 'traffic observed'),
      stage('cost', 'Cost', '$61,400/mo', 'saved', true),
    ]);
    expect(cards).toHaveLength(5);
    expect(cards[0]).toMatchObject({ label: 'Assets discovered', value: '940' });
    expect(cards[4]).toMatchObject({ label: 'Saved', value: '$61,400/mo', delta: { text: 'Attention', good: false } });
  });
  it('the hero becomes the finding: verdict as the sentence, headline CTA as the action', () => {
    const hero = {
      verdict: '86% of 940 workloads private. 4 to close.',
      headline: { value: '86%', label: 'private', to: '/naas/connect', cta: 'Attach the rest' },
      split: [], evidence: [], source: '', risks: [{ label: 'x', value: 4, hex: '#000' }],
    } as unknown as LayerHero;
    expect(homeFinding(hero)).toEqual({
      tone: 'warn',
      sentence: '86% of 940 workloads private. 4 to close.',
      cta: { label: 'Attach the rest', to: '/naas/connect' },
    });
  });
});
```

```ts
// src/features/connect/connectKpis.test.ts
import { describe, it, expect } from 'vitest';
import { connectKpis, connectFinding } from './connectKpis';
import type { FabricModel } from './FabricHero';

const region = (id: string, path: 'private' | 'public', reliability: 'dual' | 'single' = 'single') =>
  ({ id, label: id, path, reliability } as unknown as FabricModel['regions'][number]);

const model = {
  sites: [], onramps: [], c2c: [],
  regions: [region('use1', 'private', 'dual'), region('usw2', 'private'), region('apse1', 'public'), region('euc1', 'public')],
} as unknown as FabricModel;

describe('connectKpis', () => {
  it('on fabric, public, dual paths, attach rate', () => {
    expect(connectKpis(model)).toEqual([
      { label: 'Regions on the fabric', value: '2 of 4' },
      { label: 'On the public internet', value: '2', delta: { text: 'Exposed', good: false } },
      { label: 'Dual paths', value: '1' },
      { label: 'Attach rate', value: '50', unit: '%' },
    ]);
  });
  it('the finding names the public count and sends you to attach', () => {
    expect(connectFinding(model)).toEqual({
      tone: 'warn',
      sentence: '2 of 4 regions still ride the public internet.',
      cta: { label: 'Attach them', to: '/naas/connect?compose=1' },
      key: 'AO-366',
    });
    expect(connectFinding({ ...model, regions: [region('use1', 'private')] })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/layer-home/homeKpis.test.ts src/features/connect/connectKpis.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the derivations and re-wrap the pages**

```ts
// src/features/layer-home/homeKpis.ts
import type { KpiCardProps } from '../../components/viz/KpiCard';
import type { Finding } from '../../components/common/ActOnIt';
import type { StageCard } from './stageRollup';
import type { LayerHero } from './heroModel';

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The stage rollup as the frame's KPI row: one card per lifecycle stage. */
export function homeKpis(stages: StageCard[]): KpiCardProps[] {
  return stages.map(s => ({
    label: sentence(s.caption),
    value: s.value,
    sub: s.detail ?? undefined,
    delta: s.alarm ? { text: 'Attention', good: false } : undefined,
  }));
}

/** The layer hero as the page's top finding: its verdict, its one action. */
export function homeFinding(hero: LayerHero): Finding {
  return {
    tone: hero.risks.length > 0 ? 'warn' : 'good',
    sentence: hero.verdict,
    cta: { label: hero.headline.cta, to: hero.headline.to },
  };
}
```

```ts
// src/features/connect/connectKpis.ts
import type { KpiCardProps } from '../../components/viz/KpiCard';
import type { Finding } from '../../components/common/ActOnIt';
import type { FabricModel } from './FabricHero';

/** The fabric picture's own counts, as the frame's KPI row. */
export function connectKpis(model: FabricModel): KpiCardProps[] {
  const total = model.regions.length;
  const attached = model.regions.filter(r => r.path === 'private');
  const dual = attached.filter(r => r.reliability === 'dual').length;
  const pub = total - attached.length;
  const rate = total ? Math.round((attached.length / total) * 100) : 0;
  return [
    { label: 'Regions on the fabric', value: `${attached.length} of ${total}` },
    { label: 'On the public internet', value: String(pub), delta: pub > 0 ? { text: 'Exposed', good: false } : undefined },
    { label: 'Dual paths', value: String(dual) },
    { label: 'Attach rate', value: String(rate), unit: '%' },
  ];
}

/** AO-366: the regions still off the fabric, and the door to attach them. */
export function connectFinding(model: FabricModel): Finding | null {
  const total = model.regions.length;
  const pub = model.regions.filter(r => r.path !== 'private').length;
  if (!total || !pub) return null;
  return {
    tone: 'warn',
    sentence: `${pub} of ${total} regions still ride${pub === 1 ? 's' : ''} the public internet.`,
    cta: { label: 'Attach them', to: '/naas/connect?compose=1' },
    key: 'AO-366',
  };
}
```

`LayerHomePage.tsx`: replace the header, `StageIntent`, `LayerHero`, and `StageRollupBand` blocks (lines 18 to 47) with the frame. The hero's split bar and exposures move into the body as the first card; the rollup band is now the KPI row and is no longer rendered.

```tsx
import { PageFrame } from '../../components/common/layouts';
import { useCloudControlLive } from '../../engine/react/useCloudControl';
import { stageRollup } from './stageRollup';
import { layerHero } from './heroModel';
import { homeKpis, homeFinding } from './homeKpis';
// keep: LayerHero, LayerDashboard, NAV_LAYERS, and the "Work this layer" grid

export function LayerHomePage({ layerKey }: { layerKey: 'naas' | 'ai' }) {
  const layer = NAV_LAYERS.find(l => l.key === layerKey)!;
  const stages = useCloudControlLive(cc => stageRollup(cc, layerKey));
  const hero = useCloudControlLive(cc => layerHero(cc, layerKey));
  return (
    <PageFrame title={layer.label} kpis={homeKpis(stages)} finding={homeFinding(hero)}>
      {/* The answer, drawn: the hero's split and its exposures. */}
      <LayerHero surface={layerKey} />
      <LayerDashboard surface={layerKey} />
      {/* ...the existing "Work this layer" verb grid, unchanged... */}
    </PageFrame>
  );
}
```

Remove the `StageIntent` and `StageRollupBand` imports. Keep every other import the file uses.

`ConnectPage.tsx`: replace lines 169 to 175 (the `PageSection` opening, `VerdictLine`, `StageIntent`, `FlowBar`) with:

```tsx
    <PageFrame title="Fabric" kpis={connectKpis(model)} finding={connectFinding(model)}>
```

and the closing `</PageSection>` at line 240 with `</PageFrame>`. Add `import { PageFrame } from '../../components/common/layouts';` and `import { connectKpis, connectFinding } from './connectKpis';`; remove the `PageSection`, `FlowBar`, `VerdictLine`, `StageIntent` imports. The `EdgeTrail` and `FabricHero` stay first in the body. If `PageSection` took a `title` or `description` prop here, drop them; the frame owns the title.

Also make Compose open from the rail: in `ConnectPage.tsx`, where `?provision=` is read to open `ProvisionWizard`, also open it when `compose=1` is present with no region preselected. Find the `useSearchParams`/`location.search` read near the wizard and extend the condition: `const composeOpen = params.has('provision') || params.get('compose') === '1';`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/layer-home src/features/connect`
Expected: PASS, including existing `LayerHomePage`/`ConnectPage` tests. If an existing test asserted the `stage-rollup` test id or the `verdict-line` on these pages, update it to assert `kpi-row` and `act-on-it` instead; the figures are the same.

- [ ] **Step 5: Commit**

```bash
git add src/features/layer-home src/features/connect
git commit -m "feat(naas): Home and Connect in the page frame; stage rollup as the KPI row

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Govern, Observe, Cost in the frame

**Files:**
- Create: `src/features/govern/governKpis.ts` + test, `src/features/observe/observeKpis.ts` + test, `src/features/cost/costKpis.ts` + test
- Modify: `src/features/govern/GovernPage.tsx:60-70`, `src/features/observe/ObservePage.tsx:55-63`, `src/features/observe/ObservabilityShell.tsx:26-40,102`, `src/features/cost/CostPage.tsx:22-33`

**Interfaces:**
- Consumes: `Kpi` from `ObservabilityBinding.ts`; `cc.ruleList()`, `cc.ruleEnforced(r)`, the `violations` array GovernPage already has; the `arb` object CostPage already has (`hyperscalerBill`, `cloudConnectBill`, `savings`, `savingsPct`, `availableSavings`).
- Produces:
  ```ts
  export function governKpis(i: { authored: number; enforced: number; violations: number; groups: number }): KpiCardProps[]
  export function governFinding(i: { authored: number; enforced: number; violations: number }): Finding | null
  export function observeKpis(kpis: Kpi[]): KpiCardProps[]
  export function observeFinding(verdict: string | undefined): Finding | null
  export function costKpis(a: { cloudConnectBill: number; savings: number; savingsPct: number; availableSavings: number }): KpiCardProps[]
  export function costFinding(a: { availableSavings: number }): Finding | null
  ```
  `ObservabilityShell` gains `showKpis?: boolean` (default `true`); the page passes `false` so the KPI strip is not drawn twice.

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/govern/governKpis.test.ts
import { describe, it, expect } from 'vitest';
import { governKpis, governFinding } from './governKpis';

describe('governKpis', () => {
  it('enforced of authored, violations, groups', () => {
    expect(governKpis({ authored: 16, enforced: 14, violations: 52, groups: 9 })).toEqual([
      { label: 'Policies enforced', value: '14 of 16' },
      { label: 'Open violations', value: '52', delta: { text: 'Violated', good: false } },
      { label: 'Groups', value: '9' },
    ]);
  });
  it('violations outrank unenforced policies', () => {
    expect(governFinding({ authored: 16, enforced: 14, violations: 52 })).toMatchObject({ tone: 'risk', key: 'AO-357', cta: { to: '/naas/govern?tab=policies' } });
    expect(governFinding({ authored: 16, enforced: 14, violations: 0 })).toMatchObject({ tone: 'warn', key: 'AO-365', sentence: '2 policies authored but not enforced.' });
    expect(governFinding({ authored: 3, enforced: 3, violations: 0 })).toBeNull();
  });
});
```

```ts
// src/features/observe/observeKpis.test.ts
import { describe, it, expect } from 'vitest';
import { observeKpis, observeFinding } from './observeKpis';

describe('observeKpis', () => {
  it('maps the binding KPIs one to one, unit kept', () => {
    expect(observeKpis([{ key: 'tp', label: 'Throughput', value: '133.6', unit: 'Gbps', sub: 'vs previous 30d' }])).toEqual([
      { label: 'Throughput', value: '133.6', unit: 'Gbps', sub: 'vs previous 30d' },
    ]);
  });
  it('the verdict is the finding; SLO language reads as risk', () => {
    expect(observeFinding('1 region sends no flow logs.')).toMatchObject({ tone: 'warn', key: 'AO-363', cta: { to: '/naas/observe?panel=records' } });
    expect(observeFinding('p95 over SLO on ap-southeast-1.')).toMatchObject({ tone: 'risk' });
    expect(observeFinding(undefined)).toBeNull();
  });
});
```

```ts
// src/features/cost/costKpis.test.ts
import { describe, it, expect } from 'vitest';
import { costKpis, costFinding } from './costKpis';

describe('costKpis', () => {
  it('spend, saved with its percent, still avoidable', () => {
    expect(costKpis({ cloudConnectBill: 32800, savings: 15300, savingsPct: 32, availableSavings: 17500 })).toEqual([
      { label: 'Egress spend', value: '$32,800', unit: '/mo' },
      { label: 'Saved on the fabric', value: '$15,300', unit: '/mo', delta: { text: '32%', good: true } },
      { label: 'Still avoidable', value: '$17,500', unit: '/mo' },
    ]);
  });
  it('avoidable dollars are a good finding with the arbitrage as the door', () => {
    expect(costFinding({ availableSavings: 17500 })).toEqual({
      tone: 'good',
      sentence: '$17,500/mo leaves through public egress that the fabric would carry.',
      cta: { label: 'See the arbitrage', to: '/naas/cost' },
      key: 'AO-361',
    });
    expect(costFinding({ availableSavings: 0 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/govern/governKpis.test.ts src/features/observe/observeKpis.test.ts src/features/cost/costKpis.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the derivations and re-wrap**

```ts
// src/features/govern/governKpis.ts
import type { KpiCardProps } from '../../components/viz/KpiCard';
import type { Finding } from '../../components/common/ActOnIt';

export function governKpis(i: { authored: number; enforced: number; violations: number; groups: number }): KpiCardProps[] {
  return [
    { label: 'Policies enforced', value: `${i.enforced} of ${i.authored}` },
    { label: 'Open violations', value: String(i.violations), delta: i.violations > 0 ? { text: 'Violated', good: false } : undefined },
    { label: 'Groups', value: String(i.groups) },
  ];
}

export function governFinding(i: { authored: number; enforced: number; violations: number }): Finding | null {
  if (i.violations > 0) {
    return {
      tone: 'risk',
      sentence: `${i.violations} open violation${i.violations === 1 ? '' : 's'} against enforced policy.`,
      cta: { label: 'Review the violations', to: '/naas/govern?tab=policies' },
      key: 'AO-357',
    };
  }
  const gap = i.authored - i.enforced;
  if (gap > 0) {
    return {
      tone: 'warn',
      sentence: `${gap} polic${gap === 1 ? 'y' : 'ies'} authored but not enforced.`,
      cta: { label: 'Enforce them', to: '/naas/govern?tab=posture' },
      key: 'AO-365',
    };
  }
  return null;
}
```

```ts
// src/features/observe/observeKpis.ts
import type { KpiCardProps } from '../../components/viz/KpiCard';
import type { Finding } from '../../components/common/ActOnIt';
import type { Kpi } from './ObservabilityBinding';

export function observeKpis(kpis: Kpi[]): KpiCardProps[] {
  return kpis.map(k => ({ label: k.label, value: k.value, unit: k.unit, sub: k.sub }));
}

/** The binding's verdict is already the sentence; SLO or loss language is risk. */
export function observeFinding(verdict: string | undefined): Finding | null {
  if (!verdict) return null;
  const risk = /SLO|loss|down/i.test(verdict);
  return {
    tone: risk ? 'risk' : 'warn',
    sentence: verdict,
    cta: { label: risk ? 'Steer the flow' : 'See the records', to: '/naas/observe?panel=records' },
    key: 'AO-363',
  };
}
```

```ts
// src/features/cost/costKpis.ts
import type { KpiCardProps } from '../../components/viz/KpiCard';
import type { Finding } from '../../components/common/ActOnIt';

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function costKpis(a: { cloudConnectBill: number; savings: number; savingsPct: number; availableSavings: number }): KpiCardProps[] {
  return [
    { label: 'Egress spend', value: usd(a.cloudConnectBill), unit: '/mo' },
    { label: 'Saved on the fabric', value: usd(a.savings), unit: '/mo', delta: a.savings > 0 ? { text: `${a.savingsPct}%`, good: true } : undefined },
    { label: 'Still avoidable', value: usd(a.availableSavings), unit: '/mo' },
  ];
}

export function costFinding(a: { availableSavings: number }): Finding | null {
  if (a.availableSavings <= 0) return null;
  return {
    tone: 'good',
    sentence: `${usd(a.availableSavings)}/mo leaves through public egress that the fabric would carry.`,
    cta: { label: 'See the arbitrage', to: '/naas/cost' },
    key: 'AO-361',
  };
}
```

`GovernPage.tsx`: add `const rules = useCloudControl(cc => (cc.ruleList?.() ?? []) as { id: string }[]);` and `const enforced = useCloudControl(cc => ((cc.ruleList?.() ?? []) as { id: string }[]).filter(r => cc.ruleEnforced?.(r) ?? false).length);`. Replace the `PageSection` block, `StageIntent`, and `FlowBar` (lines 63 to 69) with:

```tsx
    <PageFrame
      title="Govern"
      kpis={governKpis({ authored: rules.length, enforced, violations: violations.length, groups: groupCount })}
      finding={governFinding({ authored: rules.length, enforced, violations: violations.length })}
    >
      <TabGroup tabs={tabs} activeTab={activeTab} onChange={id => setActiveTab(id as GovernTab)} />
```

and close with `</PageFrame>`. The outer `div` with `max-w-7xl` goes; the frame owns the width.

`ObservePage.tsx`: replace lines 57 to 63 (the `div` with `VerdictLine`, `StageIntent`, `FlowBar`, `EstateFilterChips`) with:

```tsx
    <PageFrame title="Traffic" kpis={observeKpis(binding.kpis())} finding={observeFinding(binding.verdict)} updatedLabel="Live">
      <EstateFilterChips model={fabricModel} cc={cc} filters={filters} onChange={setFilters} />
      <ObservabilityShell showKpis={false} ... />
```

and close with `</PageFrame>` where the old outer `div` closed. In `ObservabilityShell.tsx`, add `showKpis = true` to the props and wrap the KPI strip `div` (the one at line 102 with `grid-cols-6`) in `{showKpis && ( ... )}`. Also make `?panel=records` scroll the records table into view: where the records section renders, give it `id="records"` and add `useEffect(() => { if (new URLSearchParams(location.search).get('panel') === 'records') document.getElementById('records')?.scrollIntoView({ block: 'start' }); }, [location.search]);` in `ObservePage`.

`CostPage.tsx`: replace lines 22 to 33 (`<main>`, `<header>`, `FlowBar`) with:

```tsx
    <PageFrame title="Cost" kpis={costKpis(arb)} finding={costFinding(arb)}>
      <ArbitrageHero />
```

and close with `</PageFrame>` in place of `</main>`. `arb` is the object the page already destructures the bills from; if it is typed narrowly, pass `{ cloudConnectBill: arb.cloudConnectBill, savings: arb.savings, savingsPct: arb.savingsPct, availableSavings: arb.availableSavings }`.

Remove the now-unused imports (`PageSection`, `FlowBar`, `VerdictLine`, `StageIntent`) from all three pages.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/govern src/features/observe src/features/cost`
Expected: PASS. Existing page tests that looked for `verdict-line` on Observe now find the sentence inside `act-on-it`; update those assertions to `screen.getByTestId('act-on-it')`.

- [ ] **Step 5: Commit**

```bash
git add src/features/govern src/features/observe src/features/cost
git commit -m "feat(naas): Govern, Observe and Cost in the page frame with findings

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Discover and the AI Fabric pages in the frame

**Files:**
- Modify: `src/features/discover/DiscoverPage.tsx:60-80`
- Modify: `src/features/ai-fabric/AiDomainPage.tsx` (whole file)
- Modify: `src/features/ai-fabric/insights/InsightsPage.tsx:73-95` and `KpiStrip.tsx` (retire)
- Modify: `src/features/ai-fabric/GatewayGovernancePages.tsx:15-25`
- Modify: `src/features/ai-fabric/AiGovernPage.tsx` (uses `AiDomainPage`)
- Create: `src/features/ai-fabric/insights/insightsKpis.ts` + test

**Interfaces:**
- Consumes: `InsightKpi` from `insightsFigures.ts` (`key`, `title`, `value`, `unit?`, `sub`, `subTone?`), `discoverVerdict(model)`.
- Produces: `insightsKpiCards(kpis: InsightKpi[]): KpiCardProps[]`; `AiDomainPage` now takes `{ title, kpis, finding, children }` and renders `PageFrame`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/ai-fabric/insights/insightsKpis.test.ts
import { describe, it, expect } from 'vitest';
import { insightsKpiCards } from './insightsKpis';

describe('insightsKpiCards', () => {
  it('title to label, savings sub-tone to a good delta', () => {
    expect(insightsKpiCards([
      { key: 'tokens', title: 'Tokens', value: '1.2', unit: 'm', sub: '20k in · 60k out' },
      { key: 'cost', title: 'Cost', value: '$999', sub: 'Savings: $120 (37%)', subTone: 'savings' },
    ] as never)).toEqual([
      { label: 'Tokens', value: '1.2', unit: 'm', sub: '20k in · 60k out' },
      { label: 'Cost', value: '$999', unit: undefined, sub: 'Savings: $120 (37%)', delta: { text: 'Saving', good: true } },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/ai-fabric/insights/insightsKpis.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write it and re-wrap**

```ts
// src/features/ai-fabric/insights/insightsKpis.ts
import type { KpiCardProps } from '../../../components/viz/KpiCard';
import type { InsightKpi } from './insightsFigures';

export function insightsKpiCards(kpis: InsightKpi[]): KpiCardProps[] {
  return kpis.map(k => ({
    label: k.title,
    value: k.value,
    unit: k.unit,
    sub: k.sub,
    delta: k.subTone === 'savings' ? { text: 'Saving', good: true } : undefined,
  }));
}
```

`AiDomainPage.tsx` becomes:

```tsx
import type { ReactNode } from 'react';
import { PageFrame } from '../../components/common/layouts';
import type { KpiCardProps } from '../../components/viz/KpiCard';
import type { Finding } from '../../components/common/ActOnIt';

/** The frame shared by the AI Fabric screens: their page template. */
export function AiDomainPage({ title, kpis = [], finding = null, children }: {
  title: string; kpis?: KpiCardProps[]; finding?: Finding | null; children: ReactNode;
}) {
  return <PageFrame title={title} kpis={kpis} finding={finding}>{children}</PageFrame>;
}
```

`AiGovernPage.tsx` and `AiObservePage.tsx` pass `title` instead of `verb`/`description`. Titles: Govern page `"Policies"`; Observe page reads the tab and passes `"Security & Governance"`, `"Cost"`, or `"Performance & Reliability"` (from `tabFromParam`, exported from `InsightsPage.tsx`; export it). `AiObservePage` also passes `kpis={insightsKpiCards(insightKpis(cc))}` and, for Phase 1, `finding={null}`; Phase 2 writes the AI findings.

`InsightsPage.tsx`: remove the inner `<h2>Insights</h2>` header row (lines 73 to 95, the "Updated ago", "Last 24h" and emphasis group) and the `<KpiStrip>` render; the frame carries the title, updated label, range, and KPI row. Keep the tabs and everything below. Delete `KpiStrip.tsx` and its test if nothing else imports it (`grep -rn KpiStrip src`).

`GatewayGovernancePages.tsx`: `PageShell` becomes a thin call to `PageFrame`:

```tsx
function PageShell({ title, children }: { title: string; blurb?: string; children: React.ReactNode }) {
  return <PageFrame title={title} kpis={[]}>{children}</PageFrame>;
}
```

Titles change to their labels: `AiTeamsPage` → `"Budget & Limits"`, `AiProvidersPage` → `"Providers"`, `AiKeysPage` → `"Virtual Keys"`.

`DiscoverPage.tsx`: replace `VerdictLine`, `StageIntent`, and `FlowBar` (lines 70 to 80) with:

```tsx
    <PageFrame
      title="Explore 360"
      kpis={[]}
      finding={publicWorkloads > 0 ? {
        tone: 'warn',
        sentence: discoverVerdict(model),
        cta: { label: `Attach the ${publicWorkloads} workloads still on the public internet`, to: '/naas/connect?from=discover' },
        key: 'AO-351',
      } : { tone: 'info', sentence: discoverVerdict(model) }}
    >
```

closing with `</PageFrame>` where the outer `div` closed. The stat pills UnifiedDiscovery already draws stay in the body for Phase 1; Phase 2 lifts them into the KPI row with AO-348 to AO-354.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/discover src/features/ai-fabric`
Expected: PASS. Update any test that asserted `Insights` as an `<h2>` or `kpi-tokens` test ids to the frame's `kpi-card`s.

- [ ] **Step 5: Commit**

```bash
git add src/features/discover src/features/ai-fabric
git commit -m "feat(shell): Discover and the AI Fabric pages in the page frame

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Retire the lifecycle stepper and StageIntent; update e2e

**Files:**
- Delete: `src/components/flow/FlowBar.tsx`, `FlowBar.test.tsx`, `FlowStepper.tsx`, `FlowStepper.test.tsx`, `useFlowProgress.ts`, `useFlowProgress.test.tsx`, `src/features/_shared/StageIntent.tsx`
- Modify: `src/features/discover/UnifiedDiscovery.tsx:864` (comment only), `e2e/smoke.spec.ts`, `e2e/full-story.spec.ts`, `e2e/stack.spec.ts`, `e2e/domain-split.spec.ts`, `e2e/tasks.spec.ts`, `e2e/mobile-nav.spec.ts`
- Create: `src/__tests__/page-frame.test.tsx`

- [ ] **Step 1: Write the failing frame test**

```tsx
// src/__tests__/page-frame.test.tsx
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/** Every layer page renders inside PageFrame and nothing ships the old chrome. */
describe('page frame', () => {
  const pages = [
    'src/features/layer-home/LayerHomePage.tsx',
    'src/features/connect/ConnectPage.tsx',
    'src/features/govern/GovernPage.tsx',
    'src/features/observe/ObservePage.tsx',
    'src/features/cost/CostPage.tsx',
    'src/features/discover/DiscoverPage.tsx',
    'src/features/ai-fabric/AiDomainPage.tsx',
    'src/features/ai-fabric/GatewayGovernancePages.tsx',
  ];
  it.each(pages)('%s uses PageFrame', file => {
    expect(readFileSync(file, 'utf8')).toMatch(/<PageFrame/);
  });
  it('no shipped file imports the retired shell', () => {
    const hits = execSync(
      "grep -rlE \"from '.*(FlowBar|FlowStepper|useFlowProgress|StageIntent|MainNav|LeftRail|PageSection)'\" src --include=*.tsx --include=*.ts || true",
    ).toString().trim();
    expect(hits).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/page-frame.test.tsx`
Expected: FAIL on the import scan (the flow components still exist and `PageSection` is still imported somewhere).

- [ ] **Step 3: Delete and update**

Delete the seven files listed. Grep: `grep -rn "FlowBar\|FlowStepper\|useFlowProgress\|StageIntent\|PageSection" src --include=*.ts --include=*.tsx`. For each remaining hit: the `UnifiedDiscovery.tsx:864` comment becomes "the page-level Act on it CTA states it with an action attached"; any other page still on `PageSection` is wrapped in `PageFrame` with `kpis={[]}` and its own `<h1>` text as `title`. `PageSection.tsx` itself may stay in `layouts/` for non-layer pages only if a shipped file still imports it; otherwise delete it too.

e2e updates, exact edits:

- `e2e/smoke.spec.ts:10-12` and `e2e/full-story.spec.ts:23-25`: delete the `Discover` tab expectation; the layer loop stays with `['AI Fabric', 'NaaS']`.
- `e2e/tasks.spec.ts:53`: the tab count is 2.
- `e2e/domain-split.spec.ts:194,266,325`: `'Teams & limits'` becomes `'Budget & Limits'`.
- `e2e/stack.spec.ts:35`: `rail-home` becomes `rail-ai-fabric` after clicking the AI Fabric pill.
- `e2e/mobile-nav.spec.ts`: read it; the drawer is unchanged, but if it asserts the hamburger's `aria-label`, it is still "Open navigation menu".
- Any spec that clicked `rail-connect` now clicks `rail-fabric`; `rail-govern` becomes `rail-policies`; `rail-observe` becomes `rail-traffic`; `rail-cost` is unchanged.

- [ ] **Step 4: Run everything**

Run: `npx vitest run && npm run build && npx playwright test e2e/smoke.spec.ts e2e/stack.spec.ts e2e/domain-split.spec.ts e2e/tasks.spec.ts e2e/andi.spec.ts`
Expected: unit green, type check clean, the listed e2e specs green. Then run the full `npx playwright test`; fix any remaining selector in the same way and re-run until green.

- [ ] **Step 5: Commit**

```bash
git add -A src e2e
git commit -m "chore(shell): retire FlowBar, FlowStepper and StageIntent; e2e on the new shell

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Freeze, audit, and hand the boards to their Figma page

**Files:**
- Modify: `scripts/figma-handoff/sweep-dark.sh` (add a light sweep flag and the new slugs)
- Create: `docs/figma-handoff/23-shell.md`
- Modify: `docs/figma-handoff/figma-state.json`

- [ ] **Step 1: Start the dev server the pipeline expects**

Run: `VITE_AUTH_MODE=gate npx vite --port 5177` in a background shell. Confirm `http://localhost:5177/?estate=meridian#/naas/home` renders the new shell in a browser at 1440 wide before capturing anything.

- [ ] **Step 2: Capture light and dark for every board**

Add to `sweep-dark.sh`, after the `PREFIX` parsing, a `LIGHT` flag: `if [ "$a" = "--light" ]; then M="node scripts/figma-handoff/measure.mjs $FREEZE"; fi`. Then run:

```bash
bash scripts/figma-handoff/sweep-dark.sh --light --freeze shell
bash scripts/figma-handoff/sweep-dark.sh --freeze shell-dark
```

Expected: 22 capture dirs per sweep under `docs/figma-handoff/captures/shell-*`, each with `<slug>@2x.png`, `measure.json`, and a frozen artboard under `docs/figma-handoff/artboards/`.

- [ ] **Step 3: Audit every board**

```bash
for d in docs/figma-handoff/captures/shell-*; do echo "== $d"; node scripts/figma-handoff/audit.cjs "$(basename "$d")" || exit 1; done
```

Expected: `CLEAN` on all 44. On `ISSUES`, the offending hex or size is printed; fix the component (never the allowlist, unless the value is a Figma token from Task 2) and recapture that board.

- [ ] **Step 4: Walk the demo at 1440 and 1280**

In the Browser pane at `http://localhost:5177/?estate=meridian#/naas/home`, at 1440 then at 1280: NaaS Home → Fabric → Compose (the wizard opens from the rail) → Policies → Traffic → Cost → AI Fabric pill → Security & Governance → Budget & Limits. Confirm: two pills, the rail groups, one Act on it per page, the KPI row, the Andi pill opens the panel, no console errors, and the bell dot is present. Screenshot each page at 1440 into `docs/figma-handoff/captures/shell-walk/`.

- [ ] **Step 5: Import to their Figma page and record state**

With the Figma desktop app open on file `GMSruRYGS5uyQLRBk2ADMB`, import each frozen artboard through html.to.design into the "AI Fabric UI" page under a new section named `NaaS in shell`, one row, 1700px step, light then dark, following `docs/figma-handoff/METHOD.md` (layer names at freeze time; no re-composition). Write `docs/figma-handoff/23-shell.md` with the board list, capture dates, and audit results; update `figma-state.json` with a `shell` entry naming the section and the import count.

- [ ] **Step 6: Commit**

```bash
git add scripts/figma-handoff/sweep-dark.sh docs/figma-handoff
git commit -m "feat(handoff): shell boards captured, audited clean, imported as 'NaaS in shell'

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Section 3.1 top bar: Task 5. Section 3.2 rails, both tables: Task 1 and Task 6. Section 3.3 what leaves: Task 10 (and the rail collapse in Task 6). Section 4 page template and 4.1 mapping: Tasks 3, 4, 7, 8, 9. Section 4.2 tokens and audit allowlist: Task 2. Section 7 Phase 1 exit: Task 11. Section 8 tests: nav test (Task 1), frame test (Task 10), audit gate and demo walk (Task 11); the findings test for all 19 keys is Phase 2 with `findings.ts`, as the spec places it. Andi docking at 1440 and drawer below: `AndiPanel` already docks as a flex sibling at 1024 and above at 400px, 480px from 1440; no change in Phase 1.

**Deviations from the spec's 4.1 table, stated.** Connect's KPI row shows dual paths instead of p95, because the fabric model carries no latency figure; Cost's row shows "still avoidable" instead of "avg per path" for the same reason. Both are engine facts the page already has. Phase 2 adds the missing figures with AO-363 and AO-359.

**Placeholders.** None. Every step has its code or its exact command.

**Type consistency.** `KpiCardProps` (`label`, `value`, `unit?`, `delta?: { text, good }`, `sub?`) is used identically in Tasks 3, 4, 7, 8, 9. `Finding` (`tone`, `sentence`, `cta?`, `key?`) likewise. `railLayerFor(pathname, search)` and `isNavRouteActive(pathname, href, search)` match between Tasks 1 and 6. `PageFrame` props (`title`, `kpis`, `finding?`, `updatedLabel?`, `children`) match every call site.
