import { Activity, Shield } from 'lucide-react';
import { Connection } from '../../../../../types';
import { LineChart } from '../../../../monitoring/charts/LineChart';
import { chartColors } from '../../../../../utils/chartColors';

interface ThreatDetectionWidgetProps {
  connections: Connection[];
}

export function ThreatDetectionWidget({ connections }: ThreatDetectionWidgetProps) {
  const threatData = {
    labels: ['5m', '4m', '3m', '2m', '1m', 'now'],
    datasets: [{
      label: 'Threat Level',
      data: [2, 3, 4, 2, 1, 2],
      borderColor: chartColors.error,
      fill: false
    }]
  };

  const activeThreats = [
    { id: '1', type: 'DDoS', severity: 'high' as const, target: 'AWS Interconnect – last mile', status: 'Mitigating' },
    { id: '2', type: 'Brute Force', severity: 'medium' as const, target: 'Azure ExpressRoute', status: 'Monitoring' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-baseline gap-6">
        <div>
          <span className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">24</span>
          <div className="text-figma-xs text-fw-bodyLight mt-0.5">24h threats</div>
        </div>
        <div>
          <span className="text-figma-xl font-bold text-fw-success tracking-[-0.03em]">98%</span>
          <div className="text-figma-xs text-fw-bodyLight mt-0.5">blocked</div>
        </div>
        <div className="ml-auto text-right">
          <div className="flex items-center gap-1 justify-end">
            <Shield className="h-3.5 w-3.5 text-fw-success" />
            <span className="text-figma-sm font-medium text-fw-success">Low Risk</span>
          </div>
          <select className="text-figma-xs border border-fw-secondary rounded px-1 py-0.5 text-fw-bodyLight bg-fw-base mt-0.5">
            <option>1 hr</option>
            <option>24 hr</option>
            <option>7 days</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="h-24">
        <LineChart data={threatData} />
      </div>

      {/* Active threats — no colorbox wrappers */}
      {activeThreats.length > 0 && (
        <div className="divide-y divide-fw-secondary">
          {activeThreats.map((threat) => (
            <div key={threat.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                  threat.severity === 'high' ? 'bg-fw-error animate-pulse' : 'bg-fw-bodyLight'
                }`} />
                <div className="min-w-0">
                  <span className="text-figma-sm text-fw-body">{threat.type} · </span>
                  <span className="text-figma-sm text-fw-bodyLight">{threat.target}</span>
                </div>
              </div>
              <span className={`text-figma-xs font-medium flex-shrink-0 ml-2 ${
                threat.status === 'Mitigating' ? 'text-fw-error' : 'text-fw-bodyLight'
              }`}>
                {threat.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
