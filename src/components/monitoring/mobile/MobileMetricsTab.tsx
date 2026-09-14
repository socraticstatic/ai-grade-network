import { lazy } from 'react';
import { BaseMetricsView } from '../shared/BaseMetricsView';
import { MetricsSummary } from '../shared/MetricsSummary';
import { Activity, TrendingUp, ArrowUpDown } from 'lucide-react';
import { PerformanceCard } from '../shared/PerformanceCard';
import { chartColors } from '../../../utils/chartColors';

// Import the mobile-specific performance chart
import { MobilePerformanceChart } from './MobilePerformanceChart';

interface MobileMetricsTabProps {
  metrics: {
    latency: string;
    packetLoss: string;
    uptime: string;
    bandwidth: string;
    tunnelStatus: string;
  };
}

export function MobileMetricsTab({ metrics }: MobileMetricsTabProps) {
  // Define common metric data
  const metricData = {
    latency: {
      title: 'Network Latency',
      icon: Activity,
      color: 'text-brand-blue',
      value: metrics.latency,
      description: 'End-to-end network delay',
      chart: {
        data: [4.2, 4.5, 4.1, 4.3, 4.7, 4.2, 4.4],
        labels: ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'],
        color: '#003184'
      },
      stats: {
        average: '4.2ms',
        peak: '4.8ms',
        target: '<10ms'
      }
    },
    packetLoss: {
      title: 'Packet Loss',
      icon: TrendingUp,
      color: 'text-fw-error',
      value: metrics.packetLoss,
      description: 'Data transmission reliability',
      chart: {
        data: [0.01, 0.015, 0.008, 0.012, 0.01, 0.014, 0.01],
        labels: ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'],
        color: chartColors.error
      },
      stats: {
        average: '0.01%',
        peak: '0.02%',
        target: '<0.1%'
      }
    },
    bandwidth: {
      title: 'Bandwidth Usage',
      icon: ArrowUpDown,
      color: 'text-fw-success',
      value: '78%',
      description: 'Network capacity utilization',
      chart: {
        data: [65, 70, 75, 82, 78, 80, 78],
        labels: ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'],
        color: chartColors.success
      },
      stats: {
        average: '75%',
        peak: '82%',
        target: '<90%'
      }
    }
  };

  return (
    <BaseMetricsView connections={[]} isMobile={true}>
      {({ activeMetricView, hourlyData, isRefreshing, timeRange }) => (
        <div className="space-y-4">
          {activeMetricView === 'overview' ? (
            <>
              {/* Overview tab with metrics summary */}
              <MetricsSummary metrics={metrics} isMobile={true} />
              
              {/* Resource Utilization */}
              <div className="bg-fw-base rounded-lg border border-fw-secondary p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-fw-success" />
                  <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em]">Resource Utilization</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-figma-base mb-1">
                      <span className="text-fw-bodyLight">Memory</span>
                      <span className="font-medium text-fw-heading">68%</span>
                    </div>
                    <div className="h-2 bg-fw-neutral rounded-full">
                      <div className="h-2 bg-fw-cobalt-600 rounded-full w-[68%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-figma-base mb-1">
                      <span className="text-fw-bodyLight">CPU</span>
                      <span className="font-medium text-fw-heading">45%</span>
                    </div>
                    <div className="h-2 bg-fw-neutral rounded-full">
                      <div className="h-2 bg-fw-success rounded-full w-[45%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-figma-base mb-1">
                      <span className="text-fw-bodyLight">Network I/O</span>
                      <span className="font-medium text-fw-heading">82%</span>
                    </div>
                    <div className="h-2 bg-fw-neutral rounded-full">
                      <div className="h-2 bg-fw-secondary rounded-full w-[82%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Detailed metric view based on selection
            <div className="bg-fw-base rounded-lg border border-fw-secondary p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em] flex items-center">
                    {activeMetricView === 'latency' && (
                      <>
                        <Activity className="h-5 w-5 text-brand-blue mr-2" />
                        {metricData.latency.title}
                      </>
                    )}
                    {activeMetricView === 'packet-loss' && (
                      <>
                        <TrendingUp className="h-5 w-5 text-fw-error mr-2" />
                        {metricData.packetLoss.title}
                      </>
                    )}
                    {activeMetricView === 'bandwidth' && (
                      <>
                        <ArrowUpDown className="h-5 w-5 text-fw-success mr-2" />
                        {metricData.bandwidth.title}
                      </>
                    )}
                    {(activeMetricView !== 'latency' && activeMetricView !== 'packet-loss' && activeMetricView !== 'bandwidth') && (
                      <>
                        <Activity className="h-5 w-5 text-brand-blue mr-2" />
                        Metric Details
                      </>
                    )}
                  </h3>
                  <p className="text-figma-base text-fw-bodyLight mt-1">
                    {activeMetricView === 'latency' && metricData.latency.description}
                    {activeMetricView === 'packet-loss' && metricData.packetLoss.description}
                    {activeMetricView === 'bandwidth' && metricData.bandwidth.description}
                    {(activeMetricView !== 'latency' && activeMetricView !== 'packet-loss' && activeMetricView !== 'bandwidth') && 
                      'Detailed metric analysis and trends'
                    }
                  </p>
                </div>
                <div className="text-2xl font-bold text-fw-heading">
                  {activeMetricView === 'latency' && metricData.latency.value}
                  {activeMetricView === 'packet-loss' && metricData.packetLoss.value}
                  {activeMetricView === 'bandwidth' && metricData.bandwidth.value}
                  {(activeMetricView !== 'latency' && activeMetricView !== 'packet-loss' && activeMetricView !== 'bandwidth') && 
                    '4.2ms'
                  }
                </div>
              </div>
              
              <div className="h-48 mb-4">
                {activeMetricView === 'latency' && (
                  <MobilePerformanceChart 
                    data={metricData.latency.chart.data}
                    labels={metricData.latency.chart.labels}
                    color={metricData.latency.chart.color}
                  />
                )}
                {activeMetricView === 'packet-loss' && (
                  <MobilePerformanceChart 
                    data={metricData.packetLoss.chart.data}
                    labels={metricData.packetLoss.chart.labels}
                    color={metricData.packetLoss.chart.color}
                  />
                )}
                {activeMetricView === 'bandwidth' && (
                  <MobilePerformanceChart 
                    data={metricData.bandwidth.chart.data}
                    labels={metricData.bandwidth.chart.labels}
                    color={metricData.bandwidth.chart.color}
                  />
                )}
                {(activeMetricView !== 'latency' && activeMetricView !== 'packet-loss' && activeMetricView !== 'bandwidth') && (
                  <div className="h-full bg-fw-neutral rounded-lg flex items-center justify-center">
                    <span className="text-fw-bodyLight">Chart placeholder</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4 p-4 bg-fw-wash rounded-lg">
                <div>
                  <div className="text-figma-base text-fw-bodyLight">Average</div>
                  <div className="text-lg font-medium text-fw-heading">
                    {activeMetricView === 'latency' && metricData.latency.stats.average}
                    {activeMetricView === 'packet-loss' && metricData.packetLoss.stats.average}
                    {activeMetricView === 'bandwidth' && metricData.bandwidth.stats.average}
                    {(activeMetricView !== 'latency' && activeMetricView !== 'packet-loss' && activeMetricView !== 'bandwidth') && 
                      '4.2ms'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-figma-base text-fw-bodyLight">Peak</div>
                  <div className="text-lg font-medium text-fw-heading">
                    {activeMetricView === 'latency' && metricData.latency.stats.peak}
                    {activeMetricView === 'packet-loss' && metricData.packetLoss.stats.peak}
                    {activeMetricView === 'bandwidth' && metricData.bandwidth.stats.peak}
                    {(activeMetricView !== 'latency' && activeMetricView !== 'packet-loss' && activeMetricView !== 'bandwidth') && 
                      '4.8ms'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-figma-base text-fw-bodyLight">SLA Target</div>
                  <div className="text-lg font-medium text-fw-success">
                    {activeMetricView === 'latency' && metricData.latency.stats.target}
                    {activeMetricView === 'packet-loss' && metricData.packetLoss.stats.target}
                    {activeMetricView === 'bandwidth' && metricData.bandwidth.stats.target}
                    {(activeMetricView !== 'latency' && activeMetricView !== 'packet-loss' && activeMetricView !== 'bandwidth') && 
                      '<10ms'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </BaseMetricsView>
  );
}

