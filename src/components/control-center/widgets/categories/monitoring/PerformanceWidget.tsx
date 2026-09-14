import { ArrowUpDown } from 'lucide-react';
import { Connection } from '../../../../../types';
import { LineChart } from '../../../../monitoring/charts/LineChart';
import { chartColors } from '../../../../../utils/chartColors';

interface PerformanceWidgetProps {
  connections: Connection[];
}

export function PerformanceWidget({ connections }: PerformanceWidgetProps) {
  const activeConnections = connections.filter(c => c.status === 'Active');

  const parseLatency = (s: string) => {
    const m = (s || '').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 0;
  };

  const avgLatency = activeConnections.length > 0
    ? activeConnections.reduce((sum, conn) => {
        return sum + parseLatency(conn.performance?.latency || '0');
      }, 0) / activeConnections.length
    : 0;

  const avgBandwidth = activeConnections.length > 0
    ? activeConnections.reduce((sum, conn) => {
        return sum + (conn.performance?.bandwidthUtilization || 0);
      }, 0) / activeConnections.length
    : 0;

  const performanceData = {
    labels: ['W1', 'W2', 'W3', 'W4'],
    datasets: [{
      label: 'Avg Latency (ms)',
      data: [4.2, 4.5, 4.1, 4.3],
      borderColor: chartColors.primary,
      fill: false
    }]
  };

  return (
    <div className="space-y-4">
      {/* Inline stats — no boxes */}
      <div className="flex items-baseline gap-6">
        <div>
          <span className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
            {avgLatency > 0 ? `${avgLatency.toFixed(1)}ms` : '—'}
          </span>
          <div className="text-figma-xs text-fw-bodyLight mt-0.5">avg latency</div>
        </div>
        <div>
          <span className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
            {avgBandwidth > 0 ? `${avgBandwidth.toFixed(0)}%` : '—'}
          </span>
          <div className="text-figma-xs text-fw-bodyLight mt-0.5">bandwidth util.</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-24">
        <LineChart data={performanceData} />
      </div>

      {/* Per-connection list */}
      {activeConnections.length > 0 && (
        <div className="divide-y divide-fw-secondary">
          {activeConnections.slice(0, 3).map((connection) => (
            <div key={connection.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 min-w-0">
                <ArrowUpDown className="h-3.5 w-3.5 text-fw-bodyLight flex-shrink-0" />
                <span className="text-figma-sm text-fw-body truncate">{connection.name}</span>
              </div>
              <span className="text-figma-sm font-medium text-fw-heading tabular-nums flex-shrink-0 ml-2">
                {connection.performance?.latency || '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
