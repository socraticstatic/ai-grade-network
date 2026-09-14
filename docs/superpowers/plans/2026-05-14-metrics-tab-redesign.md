# Metrics Tab Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the canvas-based Detailed Performance Metrics tab with a Recharts-powered NOC-grade dashboard with correct metric priority, colorblind-safe palette, synchronized crosshairs, and threshold zone bands.

**Architecture:** Install Recharts. Create four focused components (KpiCard, MetricChart, BgpStatusTimeline, MetricsSegmentedControl). Rewrite EnhancedMetricsTab as a layout orchestrator that composes them. Leave RealTimeChart and RealTimeMetricCard untouched — they're still used by Router/Link/VNF metric views.

**Tech Stack:** React 19, TypeScript, Recharts 2.x, Tailwind CSS, AT&T design tokens (fw-* classes)

---

## File Map

| File | Action |
|---|---|
| `package.json` | Add `recharts` |
| `src/utils/chartColors.ts` | Add `categorical`, `sequential`, `status` palettes |
| `src/components/monitoring/metrics/KpiCard.tsx` | Create |
| `src/components/monitoring/metrics/MetricChart.tsx` | Create |
| `src/components/monitoring/metrics/BgpStatusTimeline.tsx` | Create |
| `src/components/monitoring/metrics/MetricsSegmentedControl.tsx` | Create |
| `src/components/monitoring/metrics/EnhancedMetricsTab.tsx` | Rewrite |

---

## Task 1: Install Recharts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install recharts**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci
npm install recharts
```

Expected output: `added N packages` with no errors. Recharts is ~290KB gzipped.

- [ ] **Step 2: Verify TypeScript types are included**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors mentioning recharts. (Types are bundled with recharts 2.x — no `@types/recharts` needed.)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add recharts for enterprise metrics charts"
```

---

## Task 2: Extend chartColors with NOC-grade palette

**Files:**
- Modify: `src/utils/chartColors.ts`

**Context:** The current file has `primary`, `success`, `error`, `secondary`. We need Okabe-Ito derived categorical colors and threshold zone fills that are distinguishable under deuteranopia/protanopia.

- [ ] **Step 1: Replace the file content**

Replace the entire content of `src/utils/chartColors.ts` with:

```typescript
/**
 * Chart color constants — matches fw-* design tokens and Okabe-Ito CVD-safe palette.
 * 
 * Rules:
 * - Never pair red + green as opposing series (deuteranopia collapses both)
 * - Categorical series use Okabe-Ito derived hues (Nature Methods endorsed)
 * - Threshold zones use 8% opacity fills — preattentive without overwhelming data
 * - Status dots use AT&T brand colors (not chart series colors)
 */
export const chartColors = {
  // ── Legacy (used by RealTimeChart, keep intact) ────────────────────────────
  primary: '#0057b8',
  primaryLight: 'rgba(0, 87, 184, 0.1)',
  success: '#2d7e24',
  successLight: 'rgba(45, 126, 36, 0.1)',
  error: '#c70032',
  errorLight: 'rgba(199, 0, 50, 0.1)',
  secondary: '#454b52',
  secondaryLight: 'rgba(69, 75, 82, 0.12)',
  info: '#0074b3',
  infoLight: 'rgba(0, 116, 179, 0.1)',
  bodyLight: '#686e74',
  bodyLightAlpha: 'rgba(104, 110, 116, 0.16)',
  heading: '#1d2329',
  neutral: '#f3f4f6',
  wash: '#f8fafb',
  warn: '#d97706',

  // ── Categorical — Okabe-Ito derived, CVD-safe ──────────────────────────────
  // Safe to use as multi-series line colors. Never pair [0] with [2] on same chart.
  categorical: [
    '#0072B2', // Okabe-Ito Blue     — Latency (close to AT&T cobalt)
    '#D55E00', // Okabe-Ito Vermillion — Packet Loss (orange-red, not pure red)
    '#CC79A7', // Okabe-Ito Reddish Purple — Jitter
    '#009E73', // Okabe-Ito Bluish Green — Throughput
    '#E69F00', // Okabe-Ito Orange   — 5th series
    '#56B4E9', // Okabe-Ito Sky Blue — 6th series
    '#000000', // Black              — 7th series
  ] as const,

  // ── Named series (for the 4 primary network metrics) ──────────────────────
  series: {
    packetLoss:  '#D55E00', // Okabe-Ito Vermillion
    latency:     '#0072B2', // Okabe-Ito Blue
    jitter:      '#CC79A7', // Okabe-Ito Reddish Purple
    throughput:  '#009E73', // Okabe-Ito Bluish Green
  } as const,

  // ── Threshold zones (ReferenceArea fills) ─────────────────────────────────
  // Sequential single-hue, 8% opacity — preattentive, doesn't overwhelm data
  threshold: {
    warningFill:   'rgba(230, 159, 0, 0.08)',  // Okabe-Ito Orange, 8%
    criticalFill:  'rgba(213, 94, 0, 0.08)',   // Okabe-Ito Vermillion, 8%
    warnStroke:    '#E69F00',                   // Okabe-Ito Orange
    criticalStroke:'#D55E00',                   // Okabe-Ito Vermillion
  } as const,

  // ── Status dots (AT&T brand, used on KPI cards — not chart series) ─────────
  status: {
    healthy:  '#2d7e24', // AT&T success green
    warning:  '#E69F00', // Okabe-Ito Orange
    critical: '#c70032', // AT&T crimson
    neutral:  '#686e74', // fw-bodyLight
  } as const,
} as const;

export type SeriesKey = keyof typeof chartColors.series;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "chartColors" | head -10
```

Expected: No errors mentioning chartColors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/chartColors.ts
git commit -m "feat: extend chartColors with Okabe-Ito NOC palette"
```

---

## Task 3: Create MetricsSegmentedControl

**Files:**
- Create: `src/components/monitoring/metrics/MetricsSegmentedControl.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/monitoring/metrics/MetricsSegmentedControl.tsx

export type MetricFilter = 'all' | 'packetLoss' | 'latency' | 'jitter' | 'throughput';

interface Option {
  value: MetricFilter;
  label: string;
}

const OPTIONS: Option[] = [
  { value: 'all',        label: 'All Metrics'  },
  { value: 'packetLoss', label: 'Packet Loss'  },
  { value: 'latency',    label: 'Latency'      },
  { value: 'jitter',     label: 'Jitter'       },
  { value: 'throughput', label: 'Throughput'   },
];

interface MetricsSegmentedControlProps {
  value: MetricFilter;
  onChange: (value: MetricFilter) => void;
}

export function MetricsSegmentedControl({ value, onChange }: MetricsSegmentedControlProps) {
  return (
    <div
      role="group"
      aria-label="Metric filter"
      className="inline-flex items-center bg-fw-neutral rounded-xl p-1 gap-0.5"
    >
      {OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`
            px-3 py-1.5 rounded-lg text-figma-sm font-medium transition-all duration-150
            ${value === option.value
              ? 'bg-fw-base text-fw-heading shadow-sm'
              : 'text-fw-bodyLight hover:text-fw-body'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | grep "MetricsSegmented" | head -5
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/monitoring/metrics/MetricsSegmentedControl.tsx
git commit -m "feat: add MetricsSegmentedControl replacing cobalt button group"
```

---

## Task 4: Create KpiCard

**Files:**
- Create: `src/components/monitoring/metrics/KpiCard.tsx`

**Context:** Replaces `RealTimeMetricCard` in the top-row of EnhancedMetricsTab only. No icon, no trend %, SLA context, sparkline via inline SVG. Sparkline hue comes from the `seriesColor` prop.

- [ ] **Step 1: Create the component**

```typescript
// src/components/monitoring/metrics/KpiCard.tsx

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  slaLabel: string;        // e.g. "SLA: <0.1%"
  status: 'healthy' | 'warning' | 'critical' | 'neutral';
  sparklineData: number[]; // last N values, length >= 2
  seriesColor: string;     // hex, e.g. chartColors.series.packetLoss
  isLive?: boolean;
}

const STATUS_DOT: Record<KpiCardProps['status'], string> = {
  healthy:  'bg-fw-success',
  warning:  'bg-amber-400',
  critical: 'bg-fw-error',
  neutral:  'bg-fw-bodyLight',
};

const STATUS_BORDER: Record<KpiCardProps['status'], string> = {
  healthy:  'border-fw-success',
  warning:  'border-amber-400',
  critical: 'border-fw-error',
  neutral:  'border-fw-secondary',
};

export function KpiCard({
  title,
  value,
  unit,
  slaLabel,
  status,
  sparklineData,
  seriesColor,
  isLive = true,
}: KpiCardProps) {
  const points = buildSparklinePoints(sparklineData);

  return (
    <div className={`bg-fw-base rounded-xl border-2 ${STATUS_BORDER[status]} p-4 flex flex-col gap-3`}>
      {/* Title row */}
      <div className="flex items-center justify-between">
        <span className="text-figma-sm font-semibold text-fw-bodyLight uppercase tracking-[0.06em]">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fw-link opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fw-link" />
            </span>
          )}
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-bold leading-none text-fw-heading tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-figma-base font-medium text-fw-bodyLight">{unit}</span>
        )}
      </div>

      {/* SLA context */}
      <span className="text-figma-xs text-fw-bodyLight">{slaLabel}</span>

      {/* Sparkline */}
      {sparklineData.length >= 2 && (
        <svg
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          className="w-full h-8"
          aria-hidden="true"
        >
          <polyline
            points={points}
            fill="none"
            stroke={seriesColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
}

function buildSparklinePoints(data: number[]): string {
  if (data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 32 - ((v - min) / range) * 28; // 2px padding top/bottom
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | grep "KpiCard" | head -5
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/monitoring/metrics/KpiCard.tsx
git commit -m "feat: add KpiCard with SLA context and series-colored sparkline"
```

---

## Task 5: Create MetricChart (Recharts wrapper)

**Files:**
- Create: `src/components/monitoring/metrics/MetricChart.tsx`

**Context:** Wraps Recharts `ComposedChart`. Handles: threshold zone bands via `ReferenceArea`, SLA target line via `ReferenceLine`, live dot on last data point, synchronized crosshair via `syncId`, auto-scaled Y-axis, formatted X-axis timestamps, and a rich custom tooltip. Supports both `area` and `line` chart types.

- [ ] **Step 1: Create the component**

```typescript
// src/components/monitoring/metrics/MetricChart.tsx
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
  TooltipProps,
} from 'recharts';
import { chartColors } from '../../../utils/chartColors';

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

interface ThresholdConfig {
  warning: number;
  critical: number;
}

interface MetricChartProps {
  data: MetricDataPoint[];
  title: string;
  unit: string;
  seriesColor: string;         // hex color for the line/area
  seriesType?: 'area' | 'line'; // default: 'area'
  thresholds?: ThresholdConfig; // optional warning/critical bands
  slaTarget?: number;           // draws a reference line at this value
  syncId?: string;              // shared cursor across charts, e.g. "netbond-metrics"
  height?: number;              // default: 220
}

export function MetricChart({
  data,
  title,
  unit,
  seriesColor,
  seriesType = 'area',
  thresholds,
  slaTarget,
  syncId = 'netbond-metrics',
  height = 220,
}: MetricChartProps) {
  const formatted = data.map(d => ({
    ts: d.timestamp.getTime(),
    value: d.value,
  }));

  const values = data.map(d => d.value);
  const dataMax = values.length > 0 ? Math.max(...values) : 100;

  // Y-axis ceiling: whichever is greater — 1.25× data max or critical threshold
  const yMax = thresholds
    ? Math.max(dataMax * 1.25, thresholds.critical * 1.3)
    : dataMax * 1.25;

  const lastPoint = formatted.length > 0 ? formatted[formatted.length - 1] : null;

  return (
    <div className="bg-fw-base rounded-xl border border-fw-secondary p-4">
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-figma-sm font-semibold text-fw-heading">{title}</span>
        {lastPoint && (
          <span className="text-figma-sm font-bold tabular-nums" style={{ color: seriesColor }}>
            {lastPoint.value.toFixed(2)} {unit}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={formatted} syncId={syncId} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid
            strokeDasharray="0"
            stroke={chartColors.neutral}
            strokeWidth={1}
            vertical={false}
          />

          <XAxis
            dataKey="ts"
            type="number"
            domain={['dataMin', 'dataMax']}
            scale="time"
            tickFormatter={formatTimestamp}
            tickCount={6}
            tick={{ fontSize: 10, fill: chartColors.bodyLight }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            domain={[0, yMax]}
            tickFormatter={v => `${v}${unit}`}
            tick={{ fontSize: 10, fill: chartColors.bodyLight }}
            axisLine={false}
            tickLine={false}
            width={48}
          />

          <Tooltip content={<MetricTooltip unit={unit} seriesColor={seriesColor} />} />

          {/* Warning threshold zone */}
          {thresholds && (
            <ReferenceArea
              y1={thresholds.warning}
              y2={thresholds.critical}
              fill={chartColors.threshold.warningFill}
              stroke={chartColors.threshold.warnStroke}
              strokeWidth={0.5}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          )}

          {/* Critical threshold zone */}
          {thresholds && (
            <ReferenceArea
              y1={thresholds.critical}
              y2={yMax}
              fill={chartColors.threshold.criticalFill}
              stroke={chartColors.threshold.criticalStroke}
              strokeWidth={0.5}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          )}

          {/* SLA target line */}
          {slaTarget !== undefined && (
            <ReferenceLine
              y={slaTarget}
              stroke={chartColors.bodyLight}
              strokeDasharray="6 3"
              strokeWidth={1}
              label={{
                value: `SLA`,
                position: 'insideTopRight',
                fontSize: 9,
                fill: chartColors.bodyLight,
              }}
            />
          )}

          {/* Area or Line series */}
          {seriesType === 'area' ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke={seriesColor}
              strokeWidth={2}
              fill={seriesColor}
              fillOpacity={0.08}
              dot={false}
              activeDot={{ r: 4, fill: seriesColor, stroke: '#fff', strokeWidth: 2 }}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke={seriesColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: seriesColor, stroke: '#fff', strokeWidth: 2 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MetricTooltip({ active, payload, unit, seriesColor }: TooltipProps<number, string> & { unit: string; seriesColor: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const ts = new Date(point.payload.ts);

  return (
    <div className="bg-fw-heading text-fw-base rounded-lg px-3 py-2 text-figma-xs shadow-xl">
      <div className="text-fw-bodyLight mb-1">{ts.toLocaleTimeString()}</div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: seriesColor }} />
        <span className="font-bold tabular-nums">{Number(point.value).toFixed(3)} {unit}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | grep "MetricChart" | head -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/monitoring/metrics/MetricChart.tsx
git commit -m "feat: add MetricChart Recharts wrapper with threshold zones and syncId"
```

---

## Task 6: Create BgpStatusTimeline

**Files:**
- Create: `src/components/monitoring/metrics/BgpStatusTimeline.tsx`

**Context:** Shows BGP session state for each active connection as a horizontal bar divided into 60 time buckets. Green = established, amber = degraded, red = down. This is the first thing an NOC engineer looks at — a path down is a full outage.

- [ ] **Step 1: Create the component**

```typescript
// src/components/monitoring/metrics/BgpStatusTimeline.tsx

type BgpState = 'established' | 'degraded' | 'down' | 'unknown';

interface BgpTimelineEntry {
  connectionName: string;
  // 60 buckets, one per minute. Index 0 = 60 min ago, index 59 = now.
  buckets: BgpState[];
  currentState: BgpState;
}

interface BgpStatusTimelineProps {
  entries: BgpTimelineEntry[];
}

const STATE_COLOR: Record<BgpState, string> = {
  established: 'bg-fw-success',
  degraded:    'bg-amber-400',
  down:        'bg-fw-error',
  unknown:     'bg-fw-neutral',
};

const STATE_LABEL: Record<BgpState, string> = {
  established: 'Established',
  degraded:    'Degraded',
  down:        'Down',
  unknown:     'Unknown',
};

export function BgpStatusTimeline({ entries }: BgpStatusTimelineProps) {
  if (entries.length === 0) return null;

  return (
    <div className="bg-fw-base rounded-xl border border-fw-secondary p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-figma-sm font-semibold text-fw-heading">BGP Session State</span>
        <span className="text-figma-xs text-fw-bodyLight">Last 60 min</span>
      </div>

      <div className="space-y-3">
        {entries.map(entry => (
          <div key={entry.connectionName} className="flex items-center gap-3">
            {/* Connection name */}
            <span className="text-figma-xs text-fw-bodyLight w-32 shrink-0 truncate" title={entry.connectionName}>
              {entry.connectionName}
            </span>

            {/* Timeline bar */}
            <div className="flex-1 flex gap-px h-5 rounded overflow-hidden">
              {entry.buckets.map((state, i) => (
                <div
                  key={i}
                  className={`flex-1 ${STATE_COLOR[state]}`}
                  title={`${60 - i} min ago: ${STATE_LABEL[state]}`}
                />
              ))}
            </div>

            {/* Current state badge */}
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded w-24 text-center shrink-0
              ${entry.currentState === 'established' ? 'bg-fw-successLight text-fw-success' :
                entry.currentState === 'degraded'    ? 'bg-amber-50 text-amber-700' :
                entry.currentState === 'down'        ? 'bg-fw-errorLight text-fw-error' :
                                                       'bg-fw-neutral text-fw-bodyLight'}
            `}>
              {STATE_LABEL[entry.currentState]}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-fw-secondary">
        {(['established', 'degraded', 'down'] as BgpState[]).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-sm ${STATE_COLOR[s]}`} />
            <span className="text-figma-xs text-fw-bodyLight">{STATE_LABEL[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Utility: generate mock BGP timeline data from connections ──────────────────
export function generateBgpEntries(connectionNames: string[]): BgpTimelineEntry[] {
  return connectionNames.map(name => {
    // Simulate: mostly established, occasional degraded blip
    const buckets: BgpState[] = Array.from({ length: 60 }, (_, i) => {
      if (i > 45 && i < 50) return 'degraded';
      return 'established';
    });
    return {
      connectionName: name,
      buckets,
      currentState: 'established',
    };
  });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | grep "BgpStatus" | head -5
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/monitoring/metrics/BgpStatusTimeline.tsx
git commit -m "feat: add BgpStatusTimeline for NOC-priority session state visualization"
```

---

## Task 7: Rewrite EnhancedMetricsTab

**Files:**
- Modify: `src/components/monitoring/metrics/EnhancedMetricsTab.tsx`

**Context:** This is the orchestrator. It replaces the old layout (8 RealTimeMetricCard instances + 3 stacked canvas charts) with the new hierarchy: header + segmented control → 4 KpiCards → BgpStatusTimeline → full-width Packet Loss chart → full-width Latency chart → 2-col Jitter | Throughput → collapsible system metrics.

The data generation stays the same (`generateHourlyData` + `setInterval`). We just shape it differently for the new components.

**Important:** The `resourceType` guard at the top (router/link/vnf) must stay — when a specific resource is selected, those views render instead. Only touch the default (`!resourceType || resourceType === 'connection'`) path.

- [ ] **Step 1: Rewrite the file**

Replace the entire content of `src/components/monitoring/metrics/EnhancedMetricsTab.tsx`:

```typescript
// src/components/monitoring/metrics/EnhancedMetricsTab.tsx
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { MetricChart } from './MetricChart';
import { BgpStatusTimeline, generateBgpEntries } from './BgpStatusTimeline';
import { MetricsSegmentedControl, MetricFilter } from './MetricsSegmentedControl';
import { useMonitoring } from '../context/MonitoringContext';
import { chartColors } from '../../../utils/chartColors';
import { LoadingSpinner } from '../../common/LoadingSpinner';

const RouterMetricsView = lazy(() => import('./RouterMetricsView').then(m => ({ default: m.RouterMetricsView })));
const LinkMetricsView   = lazy(() => import('./LinkMetricsView').then(m => ({ default: m.LinkMetricsView })));
const VNFMetricsView    = lazy(() => import('./VNFMetricsView').then(m => ({ default: m.VNFMetricsView })));

// ── SLA thresholds (carrier-grade baselines) ────────────────────────────────
const THRESHOLDS = {
  packetLoss:  { warning: 0.1,  critical: 0.5  },  // percent
  latency:     { warning: 50,   critical: 100  },  // ms
  jitter:      { warning: 10,   critical: 30   },  // ms
  throughput:  { warning: 300,  critical: 200  },  // Mbps (lower = worse)
} as const;

const SLA_LABELS = {
  packetLoss: 'SLA: <0.1%',
  latency:    'SLA: <75ms',
  jitter:     'SLA: <10ms',
  throughput: 'Cap: 1 Gbps',
};

interface MetricPoint {
  timestamp: Date;
  value: number;
}

interface MetricsState {
  packetLoss:  MetricPoint[];
  latency:     MetricPoint[];
  jitter:      MetricPoint[];
  throughput:  MetricPoint[];
  errorRate:   MetricPoint[];
  cpuUsage:    MetricPoint[];
  memoryUsage: MetricPoint[];
  connections: MetricPoint[];
}

function getStatus(value: number, thresholds: { warning: number; critical: number }, higherIsBetter = false): 'healthy' | 'warning' | 'critical' {
  if (higherIsBetter) {
    if (value <= thresholds.critical) return 'critical';
    if (value <= thresholds.warning)  return 'warning';
    return 'healthy';
  }
  if (value >= thresholds.critical) return 'critical';
  if (value >= thresholds.warning)  return 'warning';
  return 'healthy';
}

export function EnhancedMetricsTab() {
  const { summary, generateHourlyData, resourceType, filteredConnections } = useMonitoring();
  const [metrics, setMetrics] = useState<MetricsState>({
    packetLoss: [], latency: [], jitter: [], throughput: [],
    errorRate: [], cpuUsage: [], memoryUsage: [], connections: [],
  });
  const [filter, setFilter] = useState<MetricFilter>('all');
  const [systemExpanded, setSystemExpanded] = useState(false);

  // Initialize from hourly data, then stream live updates
  useEffect(() => {
    const hourly = generateHourlyData();
    const initial: MetricsState = {
      packetLoss:  hourly.map(d => ({ timestamp: new Date(d.timestamp), value: d.packetLoss * 100 })),
      latency:     hourly.map(d => ({ timestamp: new Date(d.timestamp), value: d.latency })),
      jitter:      hourly.map(d => ({ timestamp: new Date(d.timestamp), value: d.jitter })),
      throughput:  hourly.map(d => ({ timestamp: new Date(d.timestamp), value: d.bandwidth * 10 })),
      errorRate:   hourly.map(d => ({ timestamp: new Date(d.timestamp), value: d.errorRate * 100 })),
      cpuUsage:    hourly.map(() => ({ timestamp: new Date(), value: Math.random() * 40 + 30 })),
      memoryUsage: hourly.map(() => ({ timestamp: new Date(), value: Math.random() * 30 + 50 })),
      connections: hourly.map(() => ({ timestamp: new Date(), value: Math.floor(Math.random() * 50) + 150 })),
    };
    setMetrics(initial);

    const interval = setInterval(() => {
      const now = new Date();
      setMetrics(prev => {
        const append = <T extends MetricPoint>(arr: T[], newVal: number): T[] =>
          [...arr.slice(-99), { timestamp: now, value: newVal } as T];

        return {
          packetLoss:  append(prev.packetLoss,  Math.random() * 0.05),
          latency:     append(prev.latency,     3 + Math.random() * 4),
          jitter:      append(prev.jitter,      Math.random() * 1.5),
          throughput:  append(prev.throughput,  650 + Math.random() * 250),
          errorRate:   append(prev.errorRate,   Math.random() * 0.01),
          cpuUsage:    append(prev.cpuUsage,    Math.random() * 40 + 30),
          memoryUsage: append(prev.memoryUsage, Math.random() * 30 + 50),
          connections: append(prev.connections, Math.floor(Math.random() * 50) + 150),
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [generateHourlyData]);

  // Resource-specific views
  if (resourceType === 'router') {
    return <Suspense fallback={<LoadingSpinner size="lg" text="Loading cloud router metrics..." />}><RouterMetricsView /></Suspense>;
  }
  if (resourceType === 'link') {
    return <Suspense fallback={<LoadingSpinner size="lg" text="Loading link metrics..." />}><LinkMetricsView /></Suspense>;
  }
  if (resourceType === 'vnf') {
    return <Suspense fallback={<LoadingSpinner size="lg" text="Loading VNF metrics..." />}><VNFMetricsView /></Suspense>;
  }

  if (metrics.latency.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading metrics..." />
      </div>
    );
  }

  // Current values (last data point)
  const current = {
    packetLoss:  metrics.packetLoss[metrics.packetLoss.length - 1]?.value ?? 0,
    latency:     metrics.latency[metrics.latency.length - 1]?.value ?? 0,
    jitter:      metrics.jitter[metrics.jitter.length - 1]?.value ?? 0,
    throughput:  metrics.throughput[metrics.throughput.length - 1]?.value ?? 0,
    errorRate:   metrics.errorRate[metrics.errorRate.length - 1]?.value ?? 0,
    cpuUsage:    metrics.cpuUsage[metrics.cpuUsage.length - 1]?.value ?? 0,
    memoryUsage: metrics.memoryUsage[metrics.memoryUsage.length - 1]?.value ?? 0,
    connections: metrics.connections[metrics.connections.length - 1]?.value ?? 0,
  };

  const sparkline = (arr: MetricPoint[]) => arr.slice(-40).map(d => d.value);

  // BGP timeline data derived from connections
  const connectionNames = filteredConnections.length > 0
    ? filteredConnections.map(c => c.name)
    : ['NetBond Max — Dallas', 'NetBond Max — Chicago'];
  const bgpEntries = generateBgpEntries(connectionNames);

  // Chart visibility based on filter
  const show = (key: MetricFilter) => filter === 'all' || filter === key;

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">
            Detailed Performance Metrics
          </h2>
          <p className="text-figma-sm text-fw-bodyLight mt-0.5">Live · updates every 2s</p>
        </div>
        <MetricsSegmentedControl value={filter} onChange={setFilter} />
      </div>

      {/* ── KPI Cards (priority order: loss → latency → jitter → throughput) ── */}
      {filter === 'all' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            title="Packet Loss"
            value={current.packetLoss.toFixed(3)}
            unit="%"
            slaLabel={SLA_LABELS.packetLoss}
            status={getStatus(current.packetLoss, THRESHOLDS.packetLoss)}
            sparklineData={sparkline(metrics.packetLoss)}
            seriesColor={chartColors.series.packetLoss}
          />
          <KpiCard
            title="Latency"
            value={current.latency.toFixed(1)}
            unit="ms"
            slaLabel={SLA_LABELS.latency}
            status={getStatus(current.latency, THRESHOLDS.latency)}
            sparklineData={sparkline(metrics.latency)}
            seriesColor={chartColors.series.latency}
          />
          <KpiCard
            title="Jitter"
            value={current.jitter.toFixed(2)}
            unit="ms"
            slaLabel={SLA_LABELS.jitter}
            status={getStatus(current.jitter, THRESHOLDS.jitter)}
            sparklineData={sparkline(metrics.jitter)}
            seriesColor={chartColors.series.jitter}
          />
          <KpiCard
            title="Throughput"
            value={current.throughput.toFixed(0)}
            unit="Mbps"
            slaLabel={SLA_LABELS.throughput}
            status={getStatus(current.throughput, THRESHOLDS.throughput, true)}
            sparklineData={sparkline(metrics.throughput)}
            seriesColor={chartColors.series.throughput}
          />
        </div>
      )}

      {/* ── BGP Session State Timeline ───────────────────────────────────────── */}
      {filter === 'all' && <BgpStatusTimeline entries={bgpEntries} />}

      {/* ── Primary charts: Packet Loss (full-width) ────────────────────────── */}
      {show('packetLoss') && (
        <MetricChart
          data={metrics.packetLoss}
          title="Packet Loss"
          unit="%"
          seriesColor={chartColors.series.packetLoss}
          seriesType="area"
          thresholds={THRESHOLDS.packetLoss}
          slaTarget={0.1}
          syncId="netbond-metrics"
        />
      )}

      {/* ── Primary charts: Latency (full-width) ────────────────────────────── */}
      {show('latency') && (
        <MetricChart
          data={metrics.latency}
          title="Latency"
          unit="ms"
          seriesColor={chartColors.series.latency}
          seriesType="area"
          thresholds={THRESHOLDS.latency}
          slaTarget={75}
          syncId="netbond-metrics"
        />
      )}

      {/* ── Secondary charts: Jitter | Throughput (2-col) ───────────────────── */}
      {(show('jitter') || show('throughput')) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {show('jitter') && (
            <MetricChart
              data={metrics.jitter}
              title="Jitter"
              unit="ms"
              seriesColor={chartColors.series.jitter}
              seriesType="line"
              thresholds={THRESHOLDS.jitter}
              syncId="netbond-metrics"
            />
          )}
          {show('throughput') && (
            <MetricChart
              data={metrics.throughput}
              title="Throughput"
              unit="Mbps"
              seriesColor={chartColors.series.throughput}
              seriesType="area"
              syncId="netbond-metrics"
            />
          )}
        </div>
      )}

      {/* ── System metrics (collapsible) ────────────────────────────────────── */}
      {filter === 'all' && (
        <div className="bg-fw-base rounded-xl border border-fw-secondary overflow-hidden">
          <button
            onClick={() => setSystemExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-figma-sm font-semibold text-fw-bodyLight hover:text-fw-heading hover:bg-fw-wash transition-colors"
          >
            <span>System Metrics</span>
            {systemExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {systemExpanded && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <KpiCard
                  title="Error Rate"
                  value={current.errorRate.toFixed(3)}
                  unit="%"
                  slaLabel="Threshold: <0.5%"
                  status={getStatus(current.errorRate, { warning: 0.5, critical: 1.0 })}
                  sparklineData={sparkline(metrics.errorRate)}
                  seriesColor={chartColors.categorical[4]}
                />
                <KpiCard
                  title="CPU Usage"
                  value={current.cpuUsage.toFixed(1)}
                  unit="%"
                  slaLabel="Warning: >70%"
                  status={getStatus(current.cpuUsage, { warning: 70, critical: 85 })}
                  sparklineData={sparkline(metrics.cpuUsage)}
                  seriesColor={chartColors.categorical[5]}
                />
                <KpiCard
                  title="Memory"
                  value={current.memoryUsage.toFixed(1)}
                  unit="%"
                  slaLabel="Warning: >75%"
                  status={getStatus(current.memoryUsage, { warning: 75, critical: 90 })}
                  sparklineData={sparkline(metrics.memoryUsage)}
                  seriesColor={chartColors.categorical[6]}
                />
                <KpiCard
                  title="Active Connections"
                  value={Math.round(current.connections)}
                  slaLabel="Normal: 150–200"
                  status="healthy"
                  sparklineData={sparkline(metrics.connections)}
                  seriesColor={chartColors.categorical[3]}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: Zero errors. If recharts types cause issues, check that recharts 2.x is properly installed.

- [ ] **Step 3: Smoke test in the browser**

Start dev server if not running: `npm run dev`

Open `http://localhost:5173/monitor` and click "Detailed Metrics". Verify:
- 4 KPI cards visible (Packet Loss, Latency, Jitter, Throughput)
- BGP timeline shows green bars for the active connections
- Packet Loss and Latency charts render (Recharts, not canvas)
- Jitter and Throughput in 2-col below
- "System Metrics" collapsed accordion at bottom
- Hovering one chart shows cursor on all others simultaneously (syncId working)
- Threshold zones visible as faint amber/orange bands in the chart area

- [ ] **Step 4: Commit**

```bash
git add src/components/monitoring/metrics/EnhancedMetricsTab.tsx
git commit -m "feat: rewrite EnhancedMetricsTab with Recharts, NOC priority layout, and synchronized crosshairs"
```

---

## Task 8: Deploy

- [ ] **Step 1: Full build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors. Recharts chunks should appear in the output.

- [ ] **Step 2: Deploy to gh-pages**

```bash
npm run deploy
```

Expected: `Published` at the end.

- [ ] **Step 3: Verify live site**

Open the deployed URL and navigate to Monitor → Detailed Metrics. Confirm:
- No canvas fallback visible (all charts are Recharts SVG)
- BGP timeline renders
- Segmented control pill shape (not cobalt buttons)
- Threshold zones visible on charts
- syncId crosshair works on hover

---

## Self-Review

**Spec coverage:**
- ✅ Priority order (Packet Loss → Latency → Jitter → Throughput) — Task 7 KpiCard order + chart order
- ✅ Recharts — Task 1 install, Task 5 MetricChart
- ✅ Okabe-Ito palette — Task 2 chartColors
- ✅ Threshold zones (not lines) — Task 5 ReferenceArea
- ✅ syncId crosshair — Task 5, consumed in Task 7
- ✅ BGP session state timeline — Task 6
- ✅ No trend % — Task 4 KpiCard (sparklines only)
- ✅ SLA context on cards — Task 4 `slaLabel` prop
- ✅ Segmented control — Task 3
- ✅ Collapsible system metrics — Task 7
- ✅ Auto-scaled Y-axis — Task 5 `domain` prop

**Placeholder scan:** No TBDs found. All code is complete.

**Type consistency:**
- `MetricDataPoint` defined in `MetricChart.tsx`, used only there ✅
- `MetricFilter` defined in `MetricsSegmentedControl.tsx`, imported in `EnhancedMetricsTab.tsx` ✅
- `BgpTimelineEntry` defined and used in `BgpStatusTimeline.tsx` ✅
- `generateBgpEntries` exported from `BgpStatusTimeline.tsx`, imported in `EnhancedMetricsTab.tsx` ✅
- `chartColors.series.packetLoss` — all series keys used match `chartColors.ts` definition ✅
