import { useState } from 'react';
import { Activity, TrendingUp, ArrowUpDown } from '../../../utils/iconImports';
import { MetricCard } from './MetricCard';
import { PerformanceChart } from './PerformanceChart';
import { chartColors } from '../../../utils/chartColors';

interface NetworkMetricsProps {
  metrics: {
    bandwidth: string;
    uptime: string;
  };
}

export function NetworkMetrics({ metrics }: NetworkMetricsProps) {
  const [bandwidthData] = useState({
    current: 85,
    average: 75,
    minimum: 45,
    maximum: 95,
    history: [65, 70, 75, 82, 85, 80, 85]
  });

  const timeLabels = Array(7).fill('').map((_, i) => i === 6 ? 'Now' : `${6-i}h ago`);

  const metricCards = [
    {
      title: 'Current Utilization',
      value: `${bandwidthData.current}%`,
      icon: <TrendingUp className={`h-5 w-5 ${bandwidthData.current > 90 ? 'text-fw-error' : bandwidthData.current > 80 ? 'text-fw-bodyLight' : 'text-fw-success'}`} />,
      status: bandwidthData.current > 90 ? 'error' : bandwidthData.current > 80 ? 'warning' : 'success',
      description: 'Real-time bandwidth usage',
      chart: {
        data: bandwidthData.history,
        labels: timeLabels,
        color: chartColors.primary
      }
    },
    {
      title: 'Average Utilization',
      value: `${bandwidthData.average}%`,
      icon: <Activity className={`h-5 w-5 ${bandwidthData.average > 90 ? 'text-fw-error' : bandwidthData.average > 80 ? 'text-fw-bodyLight' : 'text-fw-success'}`} />,
      status: bandwidthData.average > 90 ? 'error' : bandwidthData.average > 80 ? 'warning' : 'success',
      description: 'Average usage over time period',
      chart: {
        data: [70, 72, 75, 73, 75, 74, 75],
        labels: timeLabels,
        color: chartColors.success
      }
    },
    {
      title: 'Security Status',
      value: 'Protected',
      icon: <ArrowUpDown className="h-5 w-5 text-fw-success" />,
      status: 'success',
      description: 'Network security status',
      chart: {
        data: [100, 100, 100, 98, 100, 100, 100],
        labels: timeLabels,
        color: chartColors.categorical[2]
      }
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metricCards.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          icon={metric.icon}
          status={metric.status}
          description={metric.description}
          chart={
            <PerformanceChart 
              data={metric.chart.data}
              labels={metric.chart.labels}
              color={metric.chart.color}
            />
          }
        />
      ))}
    </div>
  );
}