# VNF Monitoring - Hyperscaler Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Monitor section's VNF view to match hyperscaler (AWS/Azure/GCP) patterns: health state first, storage as a first-class metric, CPU min/max, and a fleet overview for multi-VNF selection. All data is intentionally mock — this is a requirements visualization prototype.

**Architecture:** Five targeted changes. One shared util (`vnfHealthUtils.ts`) used by two new components (`VNFHealthBanner`, `VNFFleetView`). Two modified components: `RealTimeMetricCard` gains a `subtitle` prop, `VNFMetricsView` gains storage + CPU min/max + wires the new components.

**Tech Stack:** React 18, TypeScript, Tailwind (fw-* design tokens), Lucide icons, existing `RealTimeMetricCard` / `RealTimeChart` primitives, `chartColors` from `src/utils/chartColors.ts`.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/components/monitoring/metrics/RealTimeMetricCard.tsx` | Add optional `subtitle` prop |
| Create | `src/components/monitoring/metrics/vnfHealthUtils.ts` | Shared `deriveHealth` function — single source of truth |
| Create | `src/components/monitoring/metrics/VNFHealthBanner.tsx` | VM running state + aggregate health badge above charts |
| Modify | `src/components/monitoring/metrics/VNFMetricsView.tsx` | Add storage metric, CPU min/max, integrate VNFHealthBanner, branch fleet vs. single-VNF |
| Create | `src/components/monitoring/metrics/VNFFleetView.tsx` | Per-VNF health grid for multi-VNF selection |

---

## Task 1: Add `subtitle` prop to `RealTimeMetricCard`

**Files:**
- Modify: `src/components/monitoring/metrics/RealTimeMetricCard.tsx`

- [ ] **Step 1: Add `subtitle` to the props interface**

In `RealTimeMetricCard.tsx`, the `RealTimeMetricCardProps` interface starts at line 3. Add `subtitle?: string` after `unit`:

```tsx
interface RealTimeMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: ReactNode;
  status: 'healthy' | 'warning' | 'critical' | 'neutral';
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    timeframe: string;
  };
  sparklineData?: number[];
  target?: {
    value: number;
    label: string;
  };
  lastUpdate?: Date;
  isLive?: boolean;
}
```

- [ ] **Step 2: Destructure and render `subtitle`**

Add `subtitle` to the function destructuring (line ~24):

```tsx
export function RealTimeMetricCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  status,
  trend,
  sparklineData = [],
  target,
  lastUpdate,
  isLive = true
}: RealTimeMetricCardProps) {
```

Find where `value` and `unit` are rendered — it looks like:
```tsx
<span className="text-2xl font-bold ...">
  {value}{unit && <span ...>{unit}</span>}
</span>
```

Add the subtitle directly below that span:
```tsx
{subtitle && (
  <p className="text-figma-xs text-fw-bodyLight mt-0.5">{subtitle}</p>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/monitoring/metrics/RealTimeMetricCard.tsx
git commit -m "feat(monitoring): add subtitle prop to RealTimeMetricCard"
```

---

## Task 2: Create `vnfHealthUtils.ts` — shared health logic

**Files:**
- Create: `src/components/monitoring/metrics/vnfHealthUtils.ts`

This is the single source for health state derivation. Both `VNFHealthBanner` and `VNFFleetView` import from here — no duplication.

- [ ] **Step 1: Create the file**

```ts
// src/components/monitoring/metrics/vnfHealthUtils.ts

export type HealthState = 'healthy' | 'warning' | 'critical';

export function deriveHealth(
  cpuUsage: number,
  memoryUsage: number,
  storageUsage: number
): HealthState {
  if (cpuUsage >= 85 || memoryUsage >= 90 || storageUsage >= 90) return 'critical';
  if (cpuUsage >= 70 || memoryUsage >= 75 || storageUsage >= 80) return 'warning';
  return 'healthy';
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/monitoring/metrics/vnfHealthUtils.ts
git commit -m "feat(monitoring): add vnfHealthUtils — shared deriveHealth function"
```

---

## Task 3: Create `VNFHealthBanner`

**Files:**
- Create: `src/components/monitoring/metrics/VNFHealthBanner.tsx`

Renders the health-first header row above VNF charts. Shows: VM running state (Running/Stopped from `vnf.status`), aggregate health badge, and last-updated timestamp.

- [ ] **Step 1: Create the file**

```tsx
// src/components/monitoring/metrics/VNFHealthBanner.tsx
import { CheckCircle2, AlertTriangle, XCircle, Power } from 'lucide-react';
import { VNF } from '../../../types/vnf';
import { deriveHealth, HealthState } from './vnfHealthUtils';

interface VNFHealthBannerProps {
  vnf: VNF;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  lastUpdate?: Date;
}

const healthConfig: Record<HealthState, {
  icon: typeof CheckCircle2;
  label: string;
  cls: string;
}> = {
  healthy:  { icon: CheckCircle2,  label: 'Healthy',  cls: 'bg-fw-success/10 border-fw-success/30 text-fw-success' },
  warning:  { icon: AlertTriangle, label: 'Warning',  cls: 'bg-fw-warn/10 border-fw-warn/30 text-fw-warn'         },
  critical: { icon: XCircle,       label: 'Critical', cls: 'bg-fw-error/10 border-fw-error/30 text-fw-error'       },
};

export function VNFHealthBanner({
  vnf,
  cpuUsage,
  memoryUsage,
  storageUsage,
  lastUpdate,
}: VNFHealthBannerProps) {
  const isRunning = vnf.status === 'active';
  const health = isRunning ? deriveHealth(cpuUsage, memoryUsage, storageUsage) : 'critical';
  const { icon: HealthIcon, label: healthLabel, cls: healthCls } = healthConfig[health];

  const vmCls = isRunning
    ? 'bg-fw-success/10 border-fw-success/30 text-fw-success'
    : 'bg-fw-error/10 border-fw-error/30 text-fw-error';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-figma-sm font-medium border ${vmCls}`}>
        <Power className="h-3.5 w-3.5" />
        {isRunning ? 'Running' : 'Stopped'}
      </span>

      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-figma-sm font-medium border ${healthCls}`}>
        <HealthIcon className="h-3.5 w-3.5" />
        {healthLabel}
      </span>

      {lastUpdate && (
        <span className="text-figma-xs text-fw-bodyLight ml-auto">
          Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/monitoring/metrics/VNFHealthBanner.tsx
git commit -m "feat(monitoring): add VNFHealthBanner — health-first VM status indicator"
```

---

## Task 4: Add storage metric + CPU min/max to `VNFMetricsView`

**Files:**
- Modify: `src/components/monitoring/metrics/VNFMetricsView.tsx`

Three sub-changes: add `storageUsage` to the data model, compute CPU min/max, integrate `VNFHealthBanner`.

- [ ] **Step 1: Update imports**

Replace the existing lucide import line with:
```tsx
import { Box, Zap, Users, Shield, Cpu, Database, Globe, Scale, AlertTriangle, HardDrive } from 'lucide-react';
```

Add below the existing imports:
```tsx
import { VNFHealthBanner } from './VNFHealthBanner';
```

- [ ] **Step 2: Add `storageUsage` to the `VNFMetricData` interface**

Replace lines 9-17:
```tsx
interface VNFMetricData {
  timestamp: Date;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  activeSessions: number;
  policyHitRate: number;
  licenseUtilization: number;
}
```

- [ ] **Step 3: Add storage to initial data generation**

Replace the `initialData` mapping (inside `useEffect`, the `.map(d => ({...}))` block):
```tsx
const initialData = generateHourlyData().map(d => ({
  timestamp: new Date(d.timestamp),
  throughput: Math.random() * 250 + 650,
  cpuUsage: Math.random() * 35 + 35,
  memoryUsage: Math.random() * 25 + 55,
  storageUsage: Math.random() * 30 + 40,
  activeSessions: Math.floor(Math.random() * 5000) + 15000,
  policyHitRate: Math.random() * 10 + 85,
  licenseUtilization: Math.random() * 20 + 60,
}));
```

- [ ] **Step 4: Add storage to the live interval update**

Replace the `newPoint` object inside `setInterval`:
```tsx
const newPoint: VNFMetricData = {
  timestamp: new Date(),
  throughput: Math.random() * 250 + 650,
  cpuUsage: Math.random() * 35 + 35,
  memoryUsage: Math.random() * 25 + 55,
  storageUsage: Math.random() * 30 + 40,
  activeSessions: Math.floor(Math.random() * 5000) + 15000,
  policyHitRate: Math.random() * 10 + 85,
  licenseUtilization: Math.random() * 20 + 60,
};
```

- [ ] **Step 5: Replace the entire `currentMetrics` useMemo return with the complete updated version**

Replace everything inside the `useMemo` callback — from the `if (metricsData.length === 0) return null;` guard through to the closing `}` of the returned object — with:

```tsx
if (metricsData.length === 0) return null;

const current  = metricsData[metricsData.length - 1];
const previous = metricsData[Math.max(0, metricsData.length - 10)];
const window20 = metricsData.slice(-20);

const calculateTrend = (currentVal: number, prevVal: number) => {
  const change = ((currentVal - prevVal) / prevVal) * 100;
  return {
    direction: change > 1 ? 'up' as const : change < -1 ? 'down' as const : 'stable' as const,
    percentage: Math.abs(change),
    timeframe: '10 samples',
  };
};

const getStatus = (value: number, thresholds: { warning: number; critical: number }) => {
  if (value >= thresholds.critical) return 'critical' as const;
  if (value >= thresholds.warning)  return 'warning' as const;
  return 'healthy' as const;
};

const cpuValues = window20.map(d => d.cpuUsage);
const cpuSubtitle = `Min ${Math.min(...cpuValues).toFixed(1)}% / Max ${Math.max(...cpuValues).toFixed(1)}%`;

return {
  cpuSubtitle,
  throughput: {
    value: current.throughput.toFixed(0),
    trend: calculateTrend(current.throughput, previous.throughput),
    status: current.throughput > 700 ? 'healthy' as const : current.throughput > 500 ? 'warning' as const : 'critical' as const,
    sparkline: window20.map(d => d.throughput),
  },
  cpuUsage: {
    value: current.cpuUsage.toFixed(1),
    trend: calculateTrend(current.cpuUsage, previous.cpuUsage),
    status: getStatus(current.cpuUsage, { warning: 70, critical: 85 }),
    sparkline: window20.map(d => d.cpuUsage),
  },
  memoryUsage: {
    value: current.memoryUsage.toFixed(1),
    trend: calculateTrend(current.memoryUsage, previous.memoryUsage),
    status: getStatus(current.memoryUsage, { warning: 75, critical: 90 }),
    sparkline: window20.map(d => d.memoryUsage),
  },
  storageUsage: {
    value: current.storageUsage.toFixed(1),
    trend: calculateTrend(current.storageUsage, previous.storageUsage),
    status: getStatus(current.storageUsage, { warning: 80, critical: 90 }),
    sparkline: window20.map(d => d.storageUsage),
  },
  activeSessions: {
    value: current.activeSessions.toLocaleString(),
    trend: calculateTrend(current.activeSessions, previous.activeSessions),
    status: 'healthy' as const,
    sparkline: window20.map(d => d.activeSessions),
  },
  policyHitRate: {
    value: current.policyHitRate.toFixed(1),
    trend: calculateTrend(current.policyHitRate, previous.policyHitRate),
    status: current.policyHitRate > 85 ? 'healthy' as const : current.policyHitRate > 70 ? 'warning' as const : 'critical' as const,
    sparkline: window20.map(d => d.policyHitRate),
  },
  licenseUtilization: {
    value: current.licenseUtilization.toFixed(1),
    trend: calculateTrend(current.licenseUtilization, previous.licenseUtilization),
    status: getStatus(current.licenseUtilization, { warning: 80, critical: 95 }),
    sparkline: window20.map(d => d.licenseUtilization),
  },
};
```

- [ ] **Step 6: Add `VNFHealthBanner` to the header**

Find the header block — it ends with the closing `</div>` of the `flex items-center justify-between` div (around line 155). After that closing tag, insert:

```tsx
<VNFHealthBanner
  vnf={selectedVNF}
  cpuUsage={Number(currentMetrics.cpuUsage.value)}
  memoryUsage={Number(currentMetrics.memoryUsage.value)}
  storageUsage={Number(currentMetrics.storageUsage.value)}
  lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
/>
```

Note: this render is inside the block where `selectedVNF` is already guaranteed non-null (Task 5 adds the fleet branch before this point, so by the time we reach this JSX, `filteredVNFs.length === 1`).

- [ ] **Step 7: Add `subtitle` to the CPU card and add the Storage card to the grid**

Find the CPU `RealTimeMetricCard` (currently around line 212) and add the `subtitle` prop:

```tsx
<RealTimeMetricCard
  title="CPU Usage"
  value={currentMetrics.cpuUsage.value}
  unit="%"
  subtitle={currentMetrics.cpuSubtitle}
  icon={<Cpu className="h-5 w-5" />}
  status={currentMetrics.cpuUsage.status}
  trend={currentMetrics.cpuUsage.trend}
  sparklineData={currentMetrics.cpuUsage.sparkline}
  target={{ value: Number(currentMetrics.cpuUsage.value), label: 'Current Load' }}
  lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
  isLive={true}
/>
```

After the Memory card, add the Storage card:

```tsx
<RealTimeMetricCard
  title="Storage Usage"
  value={currentMetrics.storageUsage.value}
  unit="%"
  icon={<HardDrive className="h-5 w-5" />}
  status={currentMetrics.storageUsage.status}
  trend={currentMetrics.storageUsage.trend}
  sparklineData={currentMetrics.storageUsage.sparkline}
  target={{ value: Number(currentMetrics.storageUsage.value), label: 'Current Usage' }}
  lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
  isLive={true}
/>
```

- [ ] **Step 8: Add a storage `RealTimeChart`**

Find the 2-col chart grid near the bottom of the render (currently Active Sessions + Policy Hit Rate). Replace it with a 3-chart layout — CPU history, storage history, and keep the existing two:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <RealTimeChart
    data={metricsData.map(d => ({ timestamp: d.timestamp, value: d.cpuUsage }))}
    title="CPU Utilization"
    unit="%"
    color={chartColors.warn}
    thresholds={{ warning: 70, critical: 85 }}
    height={250}
  />
  <RealTimeChart
    data={metricsData.map(d => ({ timestamp: d.timestamp, value: d.storageUsage }))}
    title="Storage Utilization"
    unit="%"
    color={chartColors.categorical[2]}
    thresholds={{ warning: 80, critical: 90 }}
    height={250}
  />
</div>
```

`chartColors.categorical[2]` is `'#CC79A7'` (Reddish Purple, Okabe-Ito palette) — confirmed in `src/utils/chartColors.ts`.

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/monitoring/metrics/VNFMetricsView.tsx
git commit -m "feat(monitoring): add storage metric, CPU min/max, and health banner to VNF detail view"
```

---

## Task 5: Create `VNFFleetView` — multi-VNF health grid

**Files:**
- Create: `src/components/monitoring/metrics/VNFFleetView.tsx`

Renders when multiple VNFs are in view. Each row: VNF name + type, VM status badge, health badge, three utilization bars. Clicking a row calls `setSelectedVNF(vnf.id)` — this changes `filteredVNFs` to one item, causing `VNFMetricsView` to switch to the detail view automatically (no separate `setResourceType` call needed — we're already inside `resourceType === 'vnf'`).

Mock metrics are seeded from the VNF's `performance` object when available, otherwise derived from the VNF id to ensure stable values across renders.

- [ ] **Step 1: Create the file**

```tsx
// src/components/monitoring/metrics/VNFFleetView.tsx
import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Power } from 'lucide-react';
import { useMonitoring } from '../context/MonitoringContext';
import { getVNFTypeInfo } from '../../../utils/vnfTypes';
import { deriveHealth, HealthState } from './vnfHealthUtils';

function UtilizationBar({
  value,
  warning,
  critical,
}: {
  value: number;
  warning: number;
  critical: number;
}) {
  const color =
    value >= critical ? 'bg-fw-error' :
    value >= warning  ? 'bg-fw-warn' :
                        'bg-fw-success';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-fw-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-figma-xs text-fw-body w-9 text-right tabular-nums">
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

const healthConfig: Record<HealthState, {
  icon: typeof CheckCircle2;
  label: string;
  cls: string;
}> = {
  healthy:  { icon: CheckCircle2,  label: 'Healthy',  cls: 'text-fw-success' },
  warning:  { icon: AlertTriangle, label: 'Warning',  cls: 'text-fw-warn'    },
  critical: { icon: XCircle,       label: 'Critical', cls: 'text-fw-error'   },
};

export function VNFFleetView() {
  const { filteredVNFs, setSelectedVNF } = useMonitoring();

  const vnfMetrics = useMemo(() => {
    return filteredVNFs.map(vnf => {
      // Stable seed from VNF id so values don't jump on re-render
      const seed = vnf.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const cpu     = vnf.performance?.cpuUsage    ?? (30 + (seed % 55));
      const memory  = vnf.performance?.memoryUsage ?? (45 + ((seed * 3) % 45));
      const storage = 30 + ((seed * 7) % 55);
      return { vnf, cpu, memory, storage };
    });
  }, [filteredVNFs]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">
          VNF Fleet Health
        </h2>
        <p className="text-figma-sm text-fw-bodyLight mt-0.5">
          {filteredVNFs.length} virtual network function{filteredVNFs.length !== 1 ? 's' : ''} — click a row to drill in
        </p>
      </div>

      <div className="bg-fw-base rounded-xl border border-fw-secondary overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_2fr] gap-4 px-4 py-2 border-b border-fw-secondary bg-fw-wash">
          <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wider">VNF</span>
          <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wider">State</span>
          <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wider">Health</span>
          <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wider">CPU / Memory / Storage</span>
        </div>

        {vnfMetrics.map(({ vnf, cpu, memory, storage }, i) => {
          const isRunning = vnf.status === 'active';
          const health = isRunning ? deriveHealth(cpu, memory, storage) : 'critical';
          const { icon: HealthIcon, label: healthLabel, cls: healthCls } = healthConfig[health];
          const typeInfo = getVNFTypeInfo(vnf.type);

          return (
            <button
              key={vnf.id}
              onClick={() => setSelectedVNF(vnf.id)}
              className={`w-full grid grid-cols-[1fr_auto_auto_2fr] gap-4 px-4 py-3 text-left hover:bg-fw-wash transition-colors ${
                i < vnfMetrics.length - 1 ? 'border-b border-fw-secondary' : ''
              }`}
            >
              {/* Name + type */}
              <div className="min-w-0">
                <p className="text-figma-sm font-medium text-fw-heading truncate">{vnf.name}</p>
                <p className="text-figma-xs text-fw-bodyLight">
                  {typeInfo?.label ?? vnf.type} · {vnf.vendor}
                </p>
              </div>

              {/* VM state */}
              <div className="flex items-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-figma-xs font-medium border ${
                  isRunning
                    ? 'bg-fw-success/10 border-fw-success/30 text-fw-success'
                    : 'bg-fw-error/10 border-fw-error/30 text-fw-error'
                }`}>
                  <Power className="h-3 w-3" />
                  {isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>

              {/* Health */}
              <div className="flex items-center">
                <span className={`inline-flex items-center gap-1 text-figma-xs font-medium ${healthCls}`}>
                  <HealthIcon className="h-3.5 w-3.5" />
                  {healthLabel}
                </span>
              </div>

              {/* Utilization bars */}
              <div className="flex flex-col gap-1.5 justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-figma-xs text-fw-bodyLight w-14">CPU</span>
                  <UtilizationBar value={cpu} warning={70} critical={85} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-figma-xs text-fw-bodyLight w-14">Memory</span>
                  <UtilizationBar value={memory} warning={75} critical={90} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-figma-xs text-fw-bodyLight w-14">Storage</span>
                  <UtilizationBar value={storage} warning={80} critical={90} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/monitoring/metrics/VNFFleetView.tsx
git commit -m "feat(monitoring): add VNFFleetView — per-VNF health grid with utilization bars"
```

---

## Task 6: Wire `VNFFleetView` into `VNFMetricsView`

**Files:**
- Modify: `src/components/monitoring/metrics/VNFMetricsView.tsx`

- [ ] **Step 1: Import `VNFFleetView`**

Add to the imports:
```tsx
import { VNFFleetView } from './VNFFleetView';
```

- [ ] **Step 2: Add the fleet branch**

After the loading guard (`if (!currentMetrics) { return ... }`) block and the VNF detail variable derivations (`selectedVNF`, `vnfTypeInfo`, `VNFIcon`), add:

```tsx
if (filteredVNFs.length !== 1) {
  return <VNFFleetView />;
}
```

This must appear before the main `return (...)` of the detailed view. After this branch, `selectedVNF` is guaranteed to be `filteredVNFs[0]` (non-null), so the null checks in the JSX below are TypeScript safety only.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Start dev server and verify manually**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci && npm run dev
```

Navigate to Monitor → Metrics tab → VNF resource type. Check three states:

1. **Multiple VNFs** → `VNFFleetView` renders: rows per VNF, status badges, three utilization bars
2. **Click a row** → transitions to single-VNF detail view (no page reload, no resource type change needed)
3. **Single VNF selected** → detail view shows `VNFHealthBanner` at top (Running/Stopped + Healthy/Warning/Critical), 7 metric cards including Storage, CPU card shows "Min X% / Max Y%" subtitle

- [ ] **Step 5: Commit**

```bash
git add src/components/monitoring/metrics/VNFMetricsView.tsx
git commit -m "feat(monitoring): wire VNFFleetView — health-first fleet grid for multi-VNF selection"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| CPU utilization min/max | Task 4 Step 5 — `cpuSubtitle` computed from 20-sample window |
| Memory utilization | Present before this plan — unchanged |
| Storage utilization | Task 4 Steps 2-8 — new data field, card, chart |
| Network connectivity utilization | Present before this plan — throughput/bandwidth metrics |
| Network connectivity status | Present before this plan — link/connection health |
| VM up/down status | Task 3 — `VNFHealthBanner` Running/Stopped from `vnf.status` |
| Health state first (hyperscaler pattern) | Task 3 — `VNFHealthBanner` renders before all charts |
| Fleet overview (Azure/GCP at-scale) | Tasks 5+6 — `VNFFleetView` per-VNF health grid |

**DRY check:** `deriveHealth` defined once in `vnfHealthUtils.ts`, imported by both `VNFHealthBanner` and `VNFFleetView`. No duplication.

**No placeholders:** Task 4 Step 5 contains the complete `currentMetrics` useMemo return — all fields, all values, no `// ... unchanged ...` comments.

**Type consistency:** `storageUsage` added to `VNFMetricData` in Task 4 Step 2, used in Steps 3, 4, 5, 7, 8. `cpuSubtitle` returned from `currentMetrics` useMemo in Step 5, consumed in Step 7. `HealthState` type exported from `vnfHealthUtils.ts` in Task 2, imported in Tasks 3 and 5.
