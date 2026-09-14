# NaaS Observe — Sankey + Flow Logs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The NaaS Observe screen's Flow tab becomes a three-band Sankey (source → path → destination) and its records table becomes actual flow-log records, vSRX-enriched when feature 2's managed VPC is live — the visibility-led money screen.

**Architecture:** Two pure modules (`flowLogs.ts`, `sankeyModel.ts`) derive from existing engine facts; `ObservabilityBinding.FlowTab` gains an optional `view: 'series' | 'sankey'`; `ObservabilityShell` renders a new `SankeyPanel` for sankey tabs; `networkBinding` rewires its Flow tab and records. The AI binding declares no `view` and stays behaviorally identical.

**Tech Stack:** React 18 + TS, recharts `Sankey` (existing dep), Vitest + Testing Library, Flywheel `fw-*`.

## Global Constraints

- Deterministic: no `Date.now`/`Math.random`. Buckets are fixed labels (`T-04`…`T-00`), bytes derive from Gbps × fixed weights.
- Path verdicts are COPIED from the engine's existing facts (region `attached` / `attControlled`) — never re-derived.
- Denies only when inspected (live managed VPC on the source region) AND source tag is `finance-invoices` AND destination is internet-bound. Zero denies pre-deploy.
- vSRX enrichment only at `managedVpcFor(cloudId, regionId)?.stage === 'live'`.
- AI binding (`aiBinding`/`AiObservePage`) must remain behaviorally identical — its tabs carry no `view` flag and keep rendering the series chart.
- Palette: cobalt `#0057b8` fabric-side, slate `#94a3b8` public-side, no amber. Brand: no `Cloud Connect` string (guard test scans).
- Tests that deploy a managed VPC advance it synchronously (`CC.advanceManagedVpc` ×4) and restore on-ramp activation with `CC.undo()`. Fresh `window.CC` per test FILE; order within a file accordingly.
- Sankey accessibility: `SankeyPanel` renders an accessible link list (`data-testid="sankey-links"`) alongside the chart — component tests assert through it, not through recharts internals.

---

### Task 1: flowLogs — per-flow record synthesis

**Files:**
- Create: `src/features/observe/flowLogs.ts`
- Test: `src/features/observe/flowLogs.test.ts`

**Interfaces:**
- Consumes: `CC.flows()` (raw rows `{srcVpc, srcTag, dst, gbps, viaPublic}` — mirror the fields, the source is `// @ts-nocheck`), `cc.clouds`/`cc.regions`/`cc.vpcs` (to map `srcVpc` → cloud/region/vpc name), `cc.managedVpcFor` (feature 2), `cc.TAGS`.
- Produces (Task 4 imports these exact names):
  - `interface FlowLogRecord { id: string; bucket: string; src: { kind: 'workload'; label: string; cloudId: string; regionId: string; tag: string }; dst: string; proto: 'TCP' | 'UDP'; port: number; bytes: number; path: 'private' | 'public'; action: 'allow' | 'deny'; vsrx?: { zoneFrom: string; zoneTo: string; session: string } }`
  - `flowLogs(cc: CloudControl): FlowLogRecord[]`
  - `BUCKETS: readonly string[]` (`['T-04','T-03','T-02','T-01','T-00']`)
  - `DST_LABELS: Record<string, string>` (`'ai-endpoints' → 'AI endpoints'`, `'storage' → 'Object storage'`, `'internet' → 'SaaS / internet egress'`, `'intra-tag'` rows are SKIPPED like routeFlows does)

Rules to encode:
- One record per (flow row × bucket), port cycling per destination: ai-endpoints `TCP 443`; storage `TCP 9093`; internet alternating `TCP 443` / `TCP 80` by bucket index.
- `bytes = Math.round(gbps * WEIGHTS[bucketIndex] * 1e8)` with `WEIGHTS = [0.7, 0.85, 1, 0.9, 1.05]` — deterministic, recognizably proportional.
- `path`: `'private'` iff the source region's seeded `attached` flag is true (the same fact routeFlows' verdict rests on).
- Enrichment: live managed VPC on the source region → `vsrx: { zoneFrom: 'trust', zoneTo: 'untrust', session: 's-' + <flowIndex> + '-' + <bucketIndex> }`.
- `action: 'deny'` per the Global Constraint triple; all else `'allow'`.
- Sites: `flows()` has no site-sourced rows (verify while implementing — grep the seeds); per the spec's honesty rule, flow logs contain ONLY workload records. State this in a comment.

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/observe/flowLogs.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { flowLogs, BUCKETS } from './flowLogs';

describe('flowLogs', () => {
  it('is deterministic and yields records for every significant flow', () => {
    const a = flowLogs(CC);
    const b = flowLogs(CC);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    // every record's bucket is from the fixed window
    expect(a.every(r => BUCKETS.includes(r.bucket))).toBe(true);
    // ids unique
    expect(new Set(a.map(r => r.id)).size).toBe(a.length);
  });

  it('path copies the engine attachment fact', () => {
    for (const r of flowLogs(CC)) {
      const region = (CC.regions[r.src.cloudId] || []).find((x: { id: string }) => x.id === r.src.regionId) as { attached?: boolean };
      expect(r.path).toBe(region?.attached ? 'private' : 'public');
    }
  });

  it('pre-deploy: no record is inspected and none is denied', () => {
    const recs = flowLogs(CC);
    expect(recs.every(r => !r.vsrx)).toBe(true);
    expect(recs.every(r => r.action === 'allow')).toBe(true);
  });

  it('a live managed VPC inspects its region and denies tagged internet-bound flows there', () => {
    // pick a region that actually sources a finance-invoices → internet flow
    const candidate = flowLogs(CC).find(r => r.src.tag === 'finance-invoices' && r.dst === 'SaaS / internet egress');
    expect(candidate).toBeTruthy();
    const { cloudId, regionId } = candidate!.src;
    const m = CC.deployManagedVpc({ cloudId, regionId })!;
    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    const recs = flowLogs(CC);
    const inRegion = recs.filter(r => r.src.regionId === regionId);
    expect(inRegion.length).toBeGreaterThan(0);
    expect(inRegion.every(r => r.vsrx?.zoneFrom === 'trust')).toBe(true);
    const denies = recs.filter(r => r.action === 'deny');
    expect(denies.length).toBeGreaterThan(0);
    expect(denies.every(r => r.src.tag === 'finance-invoices' && r.src.regionId === regionId)).toBe(true);
    // outside the inspected region nothing changed
    expect(recs.filter(r => r.src.regionId !== regionId).every(r => !r.vsrx && r.action === 'allow')).toBe(true);
    if (CC.canUndo()) CC.undo(); // restore any on-ramp activation
  });

  it('bytes scale with the flow gbps', () => {
    const recs = flowLogs(CC);
    const byFlow = new Map<string, number>();
    for (const r of recs) byFlow.set(r.src.label + '→' + r.dst, (byFlow.get(r.src.label + '→' + r.dst) ?? 0) + r.bytes);
    const sums = [...byFlow.values()];
    expect(Math.max(...sums)).toBeGreaterThan(Math.min(...sums)); // heavier flows carry more bytes
  });
});
```

If NO seeded flow is `finance-invoices → internet`, that is a real discovery: read the seeds (`state-rules.ts` flows / tags), pick the actual no-internet-tagged flow shape, and adjust BOTH the deny rule's tag constant AND this test to the estate's real policy tag — the spec's intent is "the estate's own no-internet policy," not the literal string. Record the substitution in your report.

- [ ] **Step 2: FAIL** — `npx vitest run src/features/observe/flowLogs.test.ts` (module not found).
- [ ] **Step 3: Implement** per the rules block. Map `srcVpc → {cloudId, regionId, vpcName}` by iterating `cc.clouds`/`cc.regions[cloudId]`/`cc.vpcs[regionId]` once into a lookup. Skip `dst === 'intra-tag'`.
- [ ] **Step 4: PASS** + `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(observe): flow logs — records the estate can actually back"`

---

### Task 2: sankeyModel — three-band derivation

**Files:**
- Create: `src/features/observe/sankeyModel.ts`
- Test: `src/features/observe/sankeyModel.test.ts`

**Interfaces:**
- Consumes: `cc.routeFlows()` (mirror `RouteFlowRow` fields from `networkBinding.ts`: `id, kind, label, gbps, current.attControlled`), `cc.TAGS`.
- Produces (Task 3 imports):
  - `interface SankeyModel { nodes: { name: string; band: 'source' | 'path' | 'dest' }[]; links: { source: number; target: number; value: number; pathKind: 'private' | 'public' }[] }`
  - `buildSankey(cc: CloudControl): SankeyModel` — recharts index form.
  - `PATH_NODES = { private: 'AT&T fabric', public: 'Public internet' }`

Rules: band-1 node per routeFlows source group (parse the group from `label` before the `→`, trimmed); band-2 exactly the two path nodes; band-3 dest node per distinct destination label (after the `→`), with `internet`-destined app rows labeled `SaaS / internet egress` and `c2c` rows labeled `Inter-cloud`. Each row contributes `gbps` to source→path AND path→dest (balance). Path pick: `current.attControlled ? private : public`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/observe/sankeyModel.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { buildSankey, PATH_NODES } from './sankeyModel';

describe('buildSankey', () => {
  it('has exactly two path nodes and no orphans', () => {
    const s = buildSankey(CC);
    const pathNodes = s.nodes.filter(n => n.band === 'path');
    expect(pathNodes.map(n => n.name).sort()).toEqual([PATH_NODES.private, PATH_NODES.public].sort());
    const linked = new Set(s.links.flatMap(l => [l.source, l.target]));
    s.nodes.forEach((_, i) => expect(linked.has(i)).toBe(true));
  });

  it('balances per path node: inflow equals outflow', () => {
    const s = buildSankey(CC);
    for (const [i, n] of s.nodes.entries()) {
      if (n.band !== 'path') continue;
      const inflow = s.links.filter(l => l.target === i).reduce((x, l) => x + l.value, 0);
      const outflow = s.links.filter(l => l.source === i).reduce((x, l) => x + l.value, 0);
      expect(Math.abs(inflow - outflow)).toBeLessThan(0.01);
    }
  });

  it('totals match routeFlows gbps', () => {
    const s = buildSankey(CC);
    const total = (CC.routeFlows() as { gbps: number }[]).reduce((x, r) => x + r.gbps, 0);
    const sourceOut = s.links.filter(l => s.nodes[l.source].band === 'source').reduce((x, l) => x + l.value, 0);
    expect(Math.abs(sourceOut - total)).toBeLessThan(0.5);
  });

  it('every link is directional: source→path or path→dest only', () => {
    const s = buildSankey(CC);
    for (const l of s.links) {
      const a = s.nodes[l.source].band, b = s.nodes[l.target].band;
      expect((a === 'source' && b === 'path') || (a === 'path' && b === 'dest')).toBe(true);
    }
  });
});
```

- [ ] **Step 2: FAIL.** — module not found.
- [ ] **Step 3: Implement.** Aggregate path→dest links (one link per path×dest pair, summed) — Sankeys with duplicate links render badly.
- [ ] **Step 4: PASS** + tsc clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(observe): the sankey model — every flow lands in exactly one path"`

---

### Task 3: Shell — the view flag and SankeyPanel

**Files:**
- Modify: `src/features/observe/ObservabilityBinding.ts` (FlowTab gains `view?: 'series' | 'sankey'`)
- Create: `src/features/observe/SankeyPanel.tsx`
- Modify: `src/features/observe/ObservabilityShell.tsx` (render SankeyPanel when active tab's `view === 'sankey'`)
- Test: `src/features/observe/SankeyPanel.test.tsx`

**Interfaces:**
- Consumes: `buildSankey`, `SankeyModel` (Task 2); recharts `Sankey`, `ResponsiveContainer`, `Tooltip`.
- Produces: `export function SankeyPanel({ model }: { model: SankeyModel })`. Shell change: `ObservabilityBinding` gains optional `sankey?(): SankeyModel`; the shell calls it for sankey-view tabs. (The binding builds the model so the shell stays binding-agnostic.)

Behavior:
- `SankeyPanel` renders recharts `<Sankey data={{nodes, links}} …/>` inside `ResponsiveContainer` (height ~280), custom node fill by band (source slate-ink `#475569`, path private cobalt `#0057b8`, path public slate `#94a3b8`, dest neutral `#64748b`), custom link stroke by `pathKind` (cobalt/slate at low opacity). Node labels rendered as SVG text (name + Gbps).
- Below the chart: the accessible fallback — `<ul data-testid="sankey-links">` with one `<li>` per link: `"<source> → <target> · <value> Gbps"`.
- Shell: when `tabs.find(t => t.id === tab)?.view === 'sankey'` render `<SankeyPanel model={binding.sankey!()} />` instead of the bar-series SVG; the timeline scrubber block renders only for series tabs (guard the existing scrubber JSX with the same condition). The `flow-empty` empty-state check applies only to series tabs.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/observe/SankeyPanel.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { CC } from '../../engine';
import { buildSankey } from './sankeyModel';
import { SankeyPanel } from './SankeyPanel';
import { ObservabilityShell } from './ObservabilityShell';
import { networkBinding } from './networkBinding';

afterEach(cleanup);

describe('SankeyPanel', () => {
  it('renders one accessible link row per model link, with values', () => {
    const model = buildSankey(CC);
    render(<SankeyPanel model={model} />);
    const list = screen.getByTestId('sankey-links');
    expect(within(list).getAllByRole('listitem').length).toBe(model.links.length);
    expect(list.textContent).toContain('AT&T fabric');
  });
});

describe('ObservabilityShell × sankey view', () => {
  it('the network Flow tab renders the sankey, and a trend tab still renders the series chart', () => {
    render(<ObservabilityShell binding={networkBinding(CC)} />);
    // Flow is the default tab → sankey visible
    expect(screen.getByTestId('sankey-links')).toBeInTheDocument();
    // switch to a series tab
    screen.getByRole('button', { name: 'Throughput' }).click();
  });
});
```

Check how the existing `ObservabilityShell.test.tsx` renders the shell (props, router wrappers) and mirror it — including any required `MemoryRouter`. After clicking Throughput, assert the series SVG path the existing tests use (read them; reuse their selector — likely the `flow-panel`'s `svg rect` count or `data-tab`), wrapped in `fireEvent`/`act` as those tests do. Do not invent a new assertion style when the file beside you has one.

- [ ] **Step 2: FAIL.**
- [ ] **Step 3: Implement** (binding interface: add `view?` to FlowTab and optional `sankey?(): SankeyModel` to ObservabilityBinding; networkBinding is wired in Task 4 — for THIS task's shell test to pass, also make `networkBinding.flowTabs()` mark the flow tab `view: 'sankey'` and add `sankey: () => buildSankey(cc)`; keep its `flowSeries('flow')` intact for nothing — remove the flow case only if no test references it; check `networkBinding.test.ts` first).
- [ ] **Step 4: PASS** + run `npx vitest run src/features/observe/ src/features/ai-fabric/` — the AI observe surfaces must be untouched and green.
- [ ] **Step 5: Commit** — `git commit -m "feat(observe): the flow tab is a sankey — the money screen shows the paths"`

---

### Task 4: networkBinding — records become flow logs

**Files:**
- Modify: `src/features/observe/networkBinding.ts` (columns, records, groupByOptions, briefing deny sentence)
- Modify (if assertions reference old columns/records): `src/features/observe/networkBinding.test.ts`, `src/features/observe/ObservabilityShell.test.tsx`, `src/features/observe/kpiPopulations.test.ts`
- Test: `src/features/observe/networkBinding.flowlogs.test.ts` (new)

**Interfaces:**
- Consumes: `flowLogs`, `FlowLogRecord`, `BUCKETS` (Task 1).
- Produces: binding behavior only.

Behavior:
- `columns` → `['Time', 'Source', 'Destination', 'Proto/Port', 'Bytes', 'Path', 'Action']`.
- `records(groupBy)`:
  - `none`: one row per `FlowLogRecord`, newest bucket first; cells `[bucket, src.label, dst, proto + '/' + port, fmtBytes(bytes), path, action + (vsrx ? ' · ' + vsrx.zoneFrom + '→' + vsrx.zoneTo : '')]`; tone: deny → `'bad'`, inspected allow → `'ok'`, uninspected public → `'muted'`, else undefined.
  - `source` / `destination` / `path` / `action`: group rows summing bytes with a record count cell (`'<n> records'`), label = group key.
- `groupByOptions()` → None / Source / Destination / Path / Action.
- `fmtBytes`: `≥1e9 → (x/1e9).toFixed(1)+' GB'`, `≥1e6 → MB`, else KB.
- Briefing: after the existing narrative blocks, when denies exist append `{ text: 'vSRX in <regionName> blocked <n> flows from <tag>-tagged workloads.', emphasis: 'risk' }` (region name from the denied records' regionId via `cc.regions`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/observe/networkBinding.flowlogs.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { networkBinding } from './networkBinding';
import { flowLogs } from './flowLogs';

describe('networkBinding flow-log records', () => {
  it('ungrouped records mirror flowLogs with the seven columns', () => {
    const b = networkBinding(CC);
    expect(b.columns).toEqual(['Time', 'Source', 'Destination', 'Proto/Port', 'Bytes', 'Path', 'Action']);
    const rows = b.records('none');
    expect(rows.length).toBe(flowLogs(CC).length);
    expect(rows[0].cells.length).toBe(7 - 1 /* label carries the first column? match the shell's rendering — see note */);
  });

  it('group-by path yields exactly the private/public buckets present', () => {
    const b = networkBinding(CC);
    const rows = b.records('path');
    const labels = rows.map(r => r.label).sort();
    const paths = [...new Set(flowLogs(CC).map(r => r.path))].sort();
    expect(labels).toEqual(paths);
  });

  it('pre-deploy: no deny rows and no deny briefing sentence', () => {
    const b = networkBinding(CC);
    expect(b.records('none').every(r => r.tone !== 'bad')).toBe(true);
    expect(b.briefing().narrative.some(n => /blocked/.test(n.text))).toBe(false);
  });

  it('after a live managed VPC: deny rows are bad-toned and the briefing states the block', () => {
    const target = flowLogs(CC).find(r => r.src.tag === 'finance-invoices' && /internet/i.test(r.dst))!;
    const m = CC.deployManagedVpc({ cloudId: target.src.cloudId, regionId: target.src.regionId })!;
    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    const b = networkBinding(CC);
    const denies = b.records('none').filter(r => r.tone === 'bad');
    expect(denies.length).toBeGreaterThan(0);
    expect(b.briefing().narrative.some(n => /blocked \d+ flows/.test(n.text))).toBe(true);
    if (CC.canUndo()) CC.undo();
  });
});
```

Resolve the first test's cells-length note by reading how the shell renders `RecordRow` (`label` + `cells`): if the shell prints `label` as the first column, `cells` carries the remaining 6 — pin the actual contract you implement, don't leave both possibilities alive.

- [ ] **Step 2: FAIL.**
- [ ] **Step 3: Implement.** Update any existing observe tests that assert the OLD columns/records — assertions move to the new contract, never get deleted. `flowSeries('flow')` case: remove if and only if no test references it after your updates.
- [ ] **Step 4: PASS** + `npx vitest run src/features/observe/ src/features/ai-fabric/` green + tsc clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(observe): the records are flow logs — allow, deny, and who inspected"`

---

### Task 5: Full verification

- [ ] **Step 1:** `npx vitest run` — full suite green.
- [ ] **Step 2:** `npm run build` — clean.
- [ ] **Step 3 (orchestrating session):** browser walkthrough — Observe pre-deploy: Sankey with two path bands, flow-log records, no denies. Deploy a managed VPC into the finance-flow region (feature 2 wizard), return to Observe: inspected records, deny rows red-toned, briefing sentence present. Trend tabs still chart. AI Observe unchanged.
