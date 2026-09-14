import { TrendingUp, ArrowUpDown, Activity, Clock } from 'lucide-react';

interface MetricsSummaryProps {
  metrics: {
    bandwidth: string;
    uptime: string;
  };
  isMobile?: boolean;
}

export function MetricsSummary({ metrics, isMobile = false }: MetricsSummaryProps) {
  const summaryMetrics = [
    {
      label: 'Current Utilization',
      value: '85%',
      icon: <TrendingUp className="h-4 w-4 text-fw-link" />,
      color: 'text-fw-link'
    },
    {
      label: 'Average Utilization',
      value: '75%',
      icon: <Activity className="h-4 w-4 text-fw-success" />,
      color: 'text-fw-success'
    },
    {
      label: 'Peak Utilization',
      value: '95%',
      icon: <ArrowUpDown className="h-4 w-4 text-fw-bodyLight" />,
      color: 'text-fw-bodyLight'
    },
    {
      label: 'Uptime',
      value: metrics.uptime,
      icon: <Clock className="h-4 w-4 text-fw-link" />,
      color: 'text-fw-link'
    }
  ];

  if (isMobile) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {summaryMetrics.map((metric, index) => (
          <div key={index} className="bg-fw-wash rounded-lg p-3">
            <div className="flex flex-col items-center text-center">
              <div className={`p-2 rounded-full ${metric.color.replace('text-', 'bg-').replace('500', '100')} mb-2`}>
                {metric.icon}
              </div>
              <div className="text-base font-medium text-fw-heading">{metric.value}</div>
              <div className="text-figma-sm text-fw-bodyLight">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop version
  return (
    <div className="bg-fw-base rounded-xl border border-fw-secondary p-6">
      <h3 className="text-figma-base font-medium text-fw-heading tracking-[-0.03em] mb-6">Performance Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-fw-secondary">
        {summaryMetrics.map((metric, index) => (
          <div key={index} className="px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5 mb-2">
              {metric.icon}
              <span className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">{metric.label}</span>
            </div>
            <div className="text-2xl font-bold text-fw-heading tracking-[-0.03em]">{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}