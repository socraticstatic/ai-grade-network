import { TrendingUp, ArrowUpDown, Activity, Clock, Bell } from 'lucide-react';

interface MetricsOverviewProps {
  metrics: {
    bandwidth: string;
    uptime: string;
  };
}

export function MetricsOverview({ metrics }: MetricsOverviewProps) {
  const summaryMetrics = [
    {
      label: 'Current Utilization',
      value: '85%',
      icon: <TrendingUp className="h-6 w-6 text-fw-link" />,
    },
    {
      label: 'Average Utilization',
      value: '75%',
      icon: <Activity className="h-6 w-6 text-fw-success" />,
    },
    {
      label: 'Peak Utilization',
      value: '95%',
      icon: <ArrowUpDown className="h-6 w-6 text-fw-bodyLight" />,
    },
    {
      label: 'Uptime',
      value: metrics.uptime || '99.97%',
      icon: <Clock className="h-6 w-6 text-fw-link" />,
    }
  ];

  return (
    <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
      {/* Figma: icon 24x24 + "Performance Summary" 16px w700 #1d2329, gap=8 */}
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-6 w-6 text-fw-link" />
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Performance Summary</h3>
      </div>
      {/* Figma: 4 metric cells, each 264x144, fill=#f8fafb, r=8 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryMetrics.map((metric, index) => (
          <div key={index} className="bg-fw-wash rounded-lg p-4">
            {/* Figma: colored icon + label 16px w700 #1d2329 ls:-0.48 */}
            <div className="flex items-center gap-2 mb-3">
              {metric.icon}
              <span className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">{metric.label}</span>
            </div>
            {/* Figma: value 24px w700 #1d2329 ls:-0.96 */}
            <div className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
