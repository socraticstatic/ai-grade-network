import { Connection } from '../../../../../types';
import { LineChart } from '../../../../monitoring/charts/LineChart';
import { chartColors } from '../../../../../utils/chartColors';

interface MetricsExplorerWidgetProps {
  connections: Connection[];
}

export function MetricsExplorerWidget({ connections }: MetricsExplorerWidgetProps) {
  const metrics = {
    latency: { current: 4.2, trend: [4.0, 4.1, 4.3, 4.2, 4.1, 4.2], unit: 'ms' },
    bandwidth: { current: 85, trend: [80, 82, 85, 83, 84, 85], unit: '%' },
    packetLoss: { current: 0.01, trend: [0.01, 0.02, 0.01, 0.01, 0.01, 0.01], unit: '%' },
  };

  const chartData = {
    labels: ['5m', '4m', '3m', '2m', '1m', 'now'],
    datasets: [
      {
        label: 'Latency',
        data: metrics.latency.trend,
        borderColor: chartColors.primary,
        fill: false
      },
      {
        label: 'Bandwidth',
        data: metrics.bandwidth.trend,
        borderColor: chartColors.success,
        fill: false
      }
    ]
  };

  return (
    <div className="space-y-4">
      {/* Compact metric row + time selector */}
      <div className="flex items-center gap-1">
        <div className="flex-1 flex items-baseline gap-4">
          <div>
            <span className="text-figma-base font-semibold text-fw-heading tabular-nums">
              {metrics.latency.current}ms
            </span>
            <span className="text-figma-xs text-fw-bodyLight ml-1">latency</span>
          </div>
          <div>
            <span className="text-figma-base font-semibold text-fw-heading tabular-nums">
              {metrics.bandwidth.current}%
            </span>
            <span className="text-figma-xs text-fw-bodyLight ml-1">bandwidth</span>
          </div>
          <div>
            <span className="text-figma-base font-semibold text-fw-heading tabular-nums">
              {metrics.packetLoss.current}%
            </span>
            <span className="text-figma-xs text-fw-bodyLight ml-1">pkt loss</span>
          </div>
        </div>
        <select className="text-figma-xs border border-fw-secondary rounded px-1.5 py-0.5 text-fw-bodyLight bg-fw-base flex-shrink-0">
          <option>5 min</option>
          <option>1 hr</option>
          <option>24 hr</option>
        </select>
      </div>

      {/* Chart — primary element */}
      <div className="h-36">
        <LineChart data={chartData} />
      </div>

      {/* Insights footer */}
      <div className="flex items-center justify-between text-figma-xs text-fw-bodyLight border-t border-fw-secondary pt-2">
        <span>Peak: 85% at 14:30</span>
        <span>Avg response: 4.2ms today</span>
      </div>
    </div>
  );
}
