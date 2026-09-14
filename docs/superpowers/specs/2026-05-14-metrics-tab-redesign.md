# Metrics Tab Redesign — Design Spec

**Date:** 2026-05-14
**Status:** Approved

---

## Goal

Replace the canvas-based Detailed Performance Metrics tab with a Recharts-powered dashboard that reflects NOC-grade operational awareness: correct metric priority order, colorblind-safe palettes, synchronized crosshair across all charts, and threshold zones instead of lines.

---

## Problem Statement

The current `EnhancedMetricsTab` has three structural failures:

1. **Wrong priority order.** Latency leads, but carrier-grade NOC practice puts Packet Loss first (it is the harbinger; latency is often its symptom) and BGP session state before all time-series (a downed session = path unavailable, full stop).
2. **Canvas charts are inflexible.** Threshold zones, synchronized tooltips, and auto-scaling Y-axes require significant custom code in raw canvas. Recharts provides all three declaratively.
3. **Trend % badges are misleading.** On noisy network links, a "↑ 14%" badge fires false alarms. Sparklines communicate trend shape without misleading absolute deltas.

---

## Design

### Information Hierarchy (top → bottom)

1. **Header + segmented control** — All / Packet Loss / Latency / Jitter / Throughput
2. **4 KPI cards** (priority order): Packet Loss · Latency · Jitter · Throughput
3. **BGP session state timeline** — one row per active connection, colored blocks green/amber/red
4. **Packet Loss chart** — full-width, area, Recharts
5. **Latency chart** — full-width, area, Recharts
6. **2-col row** — Jitter (line) | Throughput (area)
7. **Collapsible system section** — Error Rate, CPU, Memory, Active Connections

All four time-series charts share `syncId="netbond-metrics"` so hovering any chart draws a crosshair on all others at the same timestamp.

### KPI Card Design

- No icon (icons add noise, not signal)
- No trend percentage (misleading on noisy data)
- Current value (large, bold)
- Unit inline
- SLA threshold context: `SLA: <0.1%` shown in small text below value
- Status indicator: colored dot (green/amber/red) — not a badge
- Sparkline: last 60 data points, SVG polyline, single hue matching the series color
- Status-derived border: `border-fw-success`, `border-amber-400`, `border-fw-error` (2px)

### Chart Design

Each chart is a Recharts `ComposedChart` with:
- `Area` for volume metrics (Throughput, Packet Loss)
- `Line` for precision metrics (Latency, Jitter)
- `ReferenceArea` for threshold zones (warning band, critical band)
- `ReferenceLine` for SLA target
- Auto-scaling Y: `domain={[0, dataMax => dataMax * 1.25]}`
- X-axis: timestamps, max 6 labels, formatted `HH:mm:ss`
- Tooltip: custom dark card, all series values at hovered timestamp, colored dots per series
- Live dot: `<Dot>` on last data point, 6px, pulses via CSS animation
- No chart title inside the chart area — title lives in the card header above

### Threshold Zones (ReferenceArea)

Instead of dashed lines:
```
Warning zone:  fill="rgba(230,159,0,0.08)"   from warning threshold to critical threshold
Critical zone: fill="rgba(213,94,0,0.08)"    from critical threshold to Y-axis max
```
These use Okabe-Ito Orange and Vermillion at 8% opacity — distinguishable under deuteranopia and protanopia. Never red-green pairs.

### Color Palette

**Sequential (threshold zones):**
- Warning fill: `rgba(230, 159, 0, 0.08)` — Okabe-Ito Orange, 8% opacity
- Critical fill: `rgba(213, 94, 0, 0.08)` — Okabe-Ito Vermillion, 8% opacity
- Warning stroke: `#E69F00`
- Critical stroke: `#D55E00`

**Categorical (series colors, Okabe-Ito derived, AT&T-aligned):**
- Packet Loss: `#D55E00` — Okabe-Ito Vermillion (loss is bad; orange-red, not pure red)
- Latency: `#0072B2` — Okabe-Ito Blue (close to AT&T cobalt `#0057b8`)
- Jitter: `#CC79A7` — Okabe-Ito Reddish Purple
- Throughput: `#009E73` — Okabe-Ito Bluish Green
- Multi-connection series 5+: `#E69F00`, `#56B4E9`, `#000000`

Never pair red + green (deuteranopia/protanopia collapse both to yellow-brown).

**Status indicators (dots, not badges):**
- Healthy: `#2d7e24` (AT&T success green)
- Warning: `#E69F00` (Okabe-Ito Orange)
- Critical: `#c70032` (AT&T crimson — used only for status dots, not chart fills)

### BGP Session State Timeline

Horizontal bar per connection. Each bar is divided into time-bucket segments colored by state:
- `established` → `bg-fw-success` green
- `idle/connect` → amber `bg-amber-400`
- `down/unknown` → `bg-fw-error` red

Shows last 60 minutes. On hover, tooltip shows exact state + duration.

### Segmented Control

Replaces the current cobalt-filled button row.

```
[ All  |  Packet Loss  |  Latency  |  Jitter  |  Throughput ]
```

- Container: `bg-fw-neutral rounded-xl p-1`
- Active segment: `bg-fw-base rounded-lg shadow-sm`
- Typography: `text-figma-sm font-medium`
- No filled cobalt background anywhere

### System Metrics (Collapsible)

Error Rate, CPU Usage, Memory Usage, Active Connections collapse into a `<details>` section below the main charts. Collapsed by default. When expanded, shows 4 smaller `KpiCard` instances in a 2×2 grid.

---

## Component File Map

| File | Status | Purpose |
|---|---|---|
| `src/utils/chartColors.ts` | Modify | Add `categorical`, `sequential`, `status` palette sections |
| `src/components/monitoring/metrics/KpiCard.tsx` | **Create** | Lean stat card: value + SLA + sparkline + status dot |
| `src/components/monitoring/metrics/MetricChart.tsx` | **Create** | Recharts ComposedChart wrapper with zones, syncId, live dot |
| `src/components/monitoring/metrics/BgpStatusTimeline.tsx` | **Create** | BGP session state horizontal timeline |
| `src/components/monitoring/metrics/MetricsSegmentedControl.tsx` | **Create** | Pill segmented control for metric filter |
| `src/components/monitoring/metrics/EnhancedMetricsTab.tsx` | **Rewrite** | New layout orchestrator using all the above |
| `package.json` | Modify | Add `recharts` dependency |

**Do not modify:** `RealTimeMetricCard.tsx`, `RealTimeChart.tsx` — still used by RouterMetricsView, LinkMetricsView, VNFMetricsView.

---

## SLA Thresholds (Carrier-Grade Baselines)

| Metric | Warning | Critical | SLA |
|---|---|---|---|
| Packet Loss | 0.1% | 0.5% | <0.1% |
| Latency | 50ms | 100ms | <75ms |
| Jitter | 10ms | 30ms | <10ms |
| Throughput | below 70% capacity | below 50% capacity | >70% |

---

## What Changes at the Data Layer

No data layer changes. `EnhancedMetricsTab` already derives `metricsData` from `generateHourlyData()` and a simulated interval. The new components consume the same data shape — just rendered differently.

---

## Out of Scope

- Overview tab (separate effort)
- RouterMetricsView, LinkMetricsView, VNFMetricsView (these still use RealTimeChart/RealTimeMetricCard)
- Mobile monitoring view
- Real backend data (still simulated)
