import { useState, useEffect, lazy, Suspense } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { MetricChart } from './MetricChart';
import { ConnectionBreakdown } from './ConnectionBreakdown';
import { MetricsSegmentedControl, MetricFilter } from './MetricsSegmentedControl';
import { useMonitoring } from '../context/MonitoringContext';
import { chartColors } from '../../../utils/chartColors';
import { LoadingSpinner } from '../../common/LoadingSpinner';

const RouterMetricsView = lazy(() =>
  import('./RouterMetricsView').then(m => ({ default: m.RouterMetricsView }))
);
const LinkMetricsView = lazy(() =>
  import('./LinkMetricsView').then(m => ({ default: m.LinkMetricsView }))
);
const VNFMetricsView = lazy(() =>
  import('./VNFMetricsView').then(m => ({ default: m.VNFMetricsView }))
);

// ── SLA thresholds (carrier-grade baselines) ─────────────────────────────────
const THRESHOLDS = {
  packetLoss: { warning: 0.1,  critical: 0.5  }, // %
  latency:    { warning: 50,   critical: 100  }, // ms
  jitter:     { warning: 10,   critical: 30   }, // ms
  throughput: { warning: 300,  critical: 200  }, // Mbps — lower is worse
} as const;

const SLA_LABELS = {
  packetLoss: 'SLA: <0.1%',
  latency:    'SLA: <75ms',
  jitter:     'SLA: <10ms',
  throughput: 'Cap: 1 Gbps',
  errorRate:  'Threshold: <0.5%',
  cpuUsage:   'Warning: >70%',
  memoryUsage:'Warning: >75%',
  connections:'Normal: 150–200',
} as const;

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

function getStatus(
  value: number,
  thresholds: { warning: number; critical: number },
  higherIsBetter = false
): 'healthy' | 'warning' | 'critical' {
  if (higherIsBetter) {
    if (value <= thresholds.critical) return 'critical';
    if (value <= thresholds.warning)  return 'warning';
    return 'healthy';
  }
  if (value >= thresholds.critical) return 'critical';
  if (value >= thresholds.warning)  return 'warning';
  return 'healthy';
}

function appendPoint(arr: MetricPoint[], value: number, now: Date): MetricPoint[] {
  return [...arr.slice(-99), { timestamp: now, value }];
}

export function EnhancedMetricsTab() {
  const { generateHourlyData, resourceType, filteredConnections } = useMonitoring();

  const [metrics, setMetrics] = useState<MetricsState>({
    packetLoss: [], latency: [], jitter: [], throughput: [],
    errorRate: [], cpuUsage: [], memoryUsage: [], connections: [],
  });
  const [filter, setFilter]               = useState<MetricFilter>('all');
  const [systemExpanded, setSystemExpanded] = useState(false);

  // Initialize from hourly history, then stream live
  useEffect(() => {
    const hourly = generateHourlyData();
    setMetrics({
      packetLoss:  hourly.map(d => ({ timestamp: new Date(d.timestamp), value: d.packetLoss * 100 })),
      latency:     hourly.map(d => ({ timestamp: new Date(d.timestamp), value: d.latency })),
      jitter:      hourly.map(d => ({ timestamp: new Date(d.timestamp), value: d.jitter })),
      throughput:  hourly.map(d => ({ timestamp: new Date(d.timestamp), value: d.bandwidth * 10 })),
      errorRate:   hourly.map(d => ({ timestamp: new Date(d.timestamp), value: d.errorRate * 100 })),
      cpuUsage:    hourly.map(d => ({ timestamp: new Date(d.timestamp), value: Math.random() * 40 + 30 })),
      memoryUsage: hourly.map(d => ({ timestamp: new Date(d.timestamp), value: Math.random() * 30 + 50 })),
      connections: hourly.map(d => ({ timestamp: new Date(d.timestamp), value: Math.floor(Math.random() * 50) + 150 })),
    });

    const interval = setInterval(() => {
      const now = new Date();
      setMetrics(prev => ({
        packetLoss:  appendPoint(prev.packetLoss,  Math.random() * 0.05,          now),
        latency:     appendPoint(prev.latency,     3 + Math.random() * 4,          now),
        jitter:      appendPoint(prev.jitter,      Math.random() * 1.5,            now),
        throughput:  appendPoint(prev.throughput,  650 + Math.random() * 250,      now),
        errorRate:   appendPoint(prev.errorRate,   Math.random() * 0.01,           now),
        cpuUsage:    appendPoint(prev.cpuUsage,    Math.random() * 40 + 30,        now),
        memoryUsage: appendPoint(prev.memoryUsage, Math.random() * 30 + 50,        now),
        connections: appendPoint(prev.connections, Math.floor(Math.random() * 50) + 150, now),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [generateHourlyData]);

  // ── Resource-specific views (router / link / vnf) ─────────────────────────
  if (resourceType === 'router') {
    return (
      <Suspense fallback={<LoadingSpinner size="lg" text="Loading hub metrics..." />}>
        <RouterMetricsView />
      </Suspense>
    );
  }
  if (resourceType === 'link') {
    return (
      <Suspense fallback={<LoadingSpinner size="lg" text="Loading link metrics..." />}>
        <LinkMetricsView />
      </Suspense>
    );
  }
  if (resourceType === 'vnf') {
    return (
      <Suspense fallback={<LoadingSpinner size="lg" text="Loading VNF metrics..." />}>
        <VNFMetricsView />
      </Suspense>
    );
  }

  if (metrics.latency.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading metrics..." />
      </div>
    );
  }

  // ── Current values ────────────────────────────────────────────────────────
  const last = <K extends keyof MetricsState>(key: K) =>
    metrics[key][metrics[key].length - 1]?.value ?? 0;

  const sparkline = (key: keyof MetricsState) =>
    metrics[key].slice(-40).map(d => d.value);

  // ── Chart visibility ──────────────────────────────────────────────────────
  const show = (key: MetricFilter) => filter === 'all' || filter === key;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">
            Detailed Performance Metrics
          </h2>
          <p className="text-figma-sm text-fw-bodyLight mt-0.5">Live · updates every 2s</p>
        </div>
        <MetricsSegmentedControl value={filter} onChange={setFilter} />
      </div>

      {/* KPI Cards — priority order: loss → latency → jitter → throughput */}
      {filter === 'all' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            title="Packet Loss"
            value={last('packetLoss').toFixed(3)}
            unit="%"
            slaLabel={SLA_LABELS.packetLoss}
            status={getStatus(last('packetLoss'), THRESHOLDS.packetLoss)}
            sparklineData={sparkline('packetLoss')}
            seriesColor={chartColors.series.packetLoss}
          />
          <KpiCard
            title="Latency"
            value={last('latency').toFixed(1)}
            unit="ms"
            slaLabel={SLA_LABELS.latency}
            status={getStatus(last('latency'), THRESHOLDS.latency)}
            sparklineData={sparkline('latency')}
            seriesColor={chartColors.series.latency}
          />
          <KpiCard
            title="Jitter"
            value={last('jitter').toFixed(2)}
            unit="ms"
            slaLabel={SLA_LABELS.jitter}
            status={getStatus(last('jitter'), THRESHOLDS.jitter)}
            sparklineData={sparkline('jitter')}
            seriesColor={chartColors.series.jitter}
          />
          <KpiCard
            title="Throughput"
            value={last('throughput').toFixed(0)}
            unit="Mbps"
            slaLabel={SLA_LABELS.throughput}
            status={getStatus(last('throughput'), THRESHOLDS.throughput, true)}
            sparklineData={sparkline('throughput')}
            seriesColor={chartColors.series.throughput}
          />
        </div>
      )}

      {/* Per-connection latency breakdown */}
      {filter === 'all' && <ConnectionBreakdown connections={filteredConnections} />}

      {/* Packet Loss — full-width */}
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

      {/* Latency — full-width */}
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

      {/* Jitter | Throughput — 2-col */}
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

      {/* System metrics — collapsible */}
      {filter === 'all' && (
        <div className="bg-fw-base rounded-xl border border-fw-secondary overflow-hidden">
          <button
            onClick={() => setSystemExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-figma-sm font-semibold text-fw-bodyLight hover:text-fw-heading hover:bg-fw-wash transition-colors"
          >
            <span>System Metrics</span>
            {systemExpanded
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />
            }
          </button>

          {systemExpanded && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard
                  title="Error Rate"
                  value={last('errorRate').toFixed(3)}
                  unit="%"
                  slaLabel={SLA_LABELS.errorRate}
                  status={getStatus(last('errorRate'), { warning: 0.5, critical: 1.0 })}
                  sparklineData={sparkline('errorRate')}
                  seriesColor={chartColors.categorical[4]}
                />
                <KpiCard
                  title="CPU Usage"
                  value={last('cpuUsage').toFixed(1)}
                  unit="%"
                  slaLabel={SLA_LABELS.cpuUsage}
                  status={getStatus(last('cpuUsage'), { warning: 70, critical: 85 })}
                  sparklineData={sparkline('cpuUsage')}
                  seriesColor={chartColors.categorical[5]}
                />
                <KpiCard
                  title="Memory"
                  value={last('memoryUsage').toFixed(1)}
                  unit="%"
                  slaLabel={SLA_LABELS.memoryUsage}
                  status={getStatus(last('memoryUsage'), { warning: 75, critical: 90 })}
                  sparklineData={sparkline('memoryUsage')}
                  seriesColor={chartColors.categorical[6]}
                />
                <KpiCard
                  title="Active Connections"
                  value={Math.round(last('connections'))}
                  slaLabel={SLA_LABELS.connections}
                  status="healthy"
                  sparklineData={sparkline('connections')}
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
