import { Connection } from '../../../../../types';
import { LineChart } from '../../../../monitoring/charts/LineChart';
import { chartColors } from '../../../../../utils/chartColors';

interface NetworkStatusWidgetProps {
  connections: Connection[];
}

export function NetworkStatusWidget({ connections }: NetworkStatusWidgetProps) {
  const activeConnections = connections.filter(c => c.status === 'Active');
  const inactiveCount = connections.length - activeConnections.length;

  // Parse latency strings like "4.2ms", "<10ms", "N/A"
  const parseLatency = (s: string) => {
    const m = (s || '').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 0;
  };

  const avgLatency = activeConnections.length > 0
    ? activeConnections.reduce((sum, conn) => {
        return sum + parseLatency(conn.performance?.latency || '0');
      }, 0) / activeConnections.length
    : 0;

  const uptimeAvg = activeConnections.length > 0
    ? activeConnections.reduce((sum, conn) => {
        return sum + (conn.performance?.uptime || 99.9);
      }, 0) / activeConnections.length
    : 0;

  const performanceData = {
    labels: ['W1', 'W2', 'W3', 'W4'],
    datasets: [{
      label: 'Performance',
      data: [98, 99, 97, 99],
      borderColor: chartColors.primary,
      fill: false
    }]
  };

  return (
    <div className="space-y-4">
      {/* Primary stats — no colored boxes */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
            {activeConnections.length}
          </span>
          <span className="text-figma-sm text-fw-bodyLight ml-1.5">
            of {connections.length} active
          </span>
        </div>
        <div className="text-right">
          <div className="text-figma-base font-semibold text-fw-heading">
            {avgLatency > 0 ? `${avgLatency.toFixed(1)}ms` : '—'}
          </div>
          <div className="text-figma-xs text-fw-bodyLight">avg latency</div>
        </div>
      </div>

      {/* Status dots */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-fw-success" />
          <span className="text-figma-xs text-fw-bodyLight">
            {activeConnections.length} healthy
          </span>
        </div>
        {inactiveCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-fw-error" />
            <span className="text-figma-xs text-fw-bodyLight">
              {inactiveCount} inactive
            </span>
          </div>
        )}
        {uptimeAvg > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-figma-xs font-medium text-fw-heading">
              {uptimeAvg.toFixed(2)}%
            </span>
            <span className="text-figma-xs text-fw-bodyLight">uptime</span>
          </div>
        )}
      </div>

      {/* Trend chart */}
      <div className="h-24">
        <LineChart data={performanceData} />
      </div>
    </div>
  );
}
