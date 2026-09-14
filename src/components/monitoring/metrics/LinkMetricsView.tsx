import { useState, useEffect, useMemo } from 'react';
import { Link as LinkIcon, Gauge, TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react';
import { RealTimeMetricCard } from './RealTimeMetricCard';
import { RealTimeChart } from './RealTimeChart';
import { useMonitoring } from '../context/MonitoringContext';
import { chartColors } from '../../../utils/chartColors';

interface LinkMetricData {
  timestamp: Date;
  utilizationPercentage: number;
  inboundRate: number;
  outboundRate: number;
  latency: number;
  packetLoss: number;
  errorRate: number;
}

export function LinkMetricsView() {
  const { filteredLinks, generateHourlyData } = useMonitoring();
  const [metricsData, setMetricsData] = useState<LinkMetricData[]>([]);

  useEffect(() => {
    const initialData = generateHourlyData().map(d => ({
      timestamp: new Date(d.timestamp),
      utilizationPercentage: Math.random() * 30 + 50,
      inboundRate: Math.random() * 300 + 400,
      outboundRate: Math.random() * 200 + 350,
      latency: d.latency,
      packetLoss: d.packetLoss,
      errorRate: Math.random() * 0.01
    }));
    setMetricsData(initialData);

    const interval = setInterval(() => {
      setMetricsData(prev => {
        const newPoint: LinkMetricData = {
          timestamp: new Date(),
          utilizationPercentage: Math.random() * 30 + 50,
          inboundRate: Math.random() * 300 + 400,
          outboundRate: Math.random() * 200 + 350,
          latency: 3 + Math.random() * 4,
          packetLoss: Math.random() * 0.05,
          errorRate: Math.random() * 0.01
        };

        const updated = [...prev, newPoint];
        return updated.slice(-100);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [generateHourlyData]);

  const currentMetrics = useMemo(() => {
    if (metricsData.length === 0) return null;

    const current = metricsData[metricsData.length - 1];
    const previous = metricsData[Math.max(0, metricsData.length - 10)];

    const calculateTrend = (currentVal: number, prevVal: number) => {
      const change = ((currentVal - prevVal) / prevVal) * 100;
      return {
        direction: change > 1 ? 'up' as const : change < -1 ? 'down' as const : 'stable' as const,
        percentage: Math.abs(change),
        timeframe: '10 samples'
      };
    };

    const getStatus = (value: number, thresholds: { warning: number; critical: number }) => {
      if (value >= thresholds.critical) return 'critical' as const;
      if (value >= thresholds.warning) return 'warning' as const;
      return 'healthy' as const;
    };

    return {
      utilization: {
        value: current.utilizationPercentage.toFixed(1),
        trend: calculateTrend(current.utilizationPercentage, previous.utilizationPercentage),
        status: getStatus(current.utilizationPercentage, { warning: 75, critical: 90 }),
        sparkline: metricsData.slice(-20).map(d => d.utilizationPercentage)
      },
      inbound: {
        value: current.inboundRate.toFixed(0),
        trend: calculateTrend(current.inboundRate, previous.inboundRate),
        status: 'healthy' as const,
        sparkline: metricsData.slice(-20).map(d => d.inboundRate)
      },
      outbound: {
        value: current.outboundRate.toFixed(0),
        trend: calculateTrend(current.outboundRate, previous.outboundRate),
        status: 'healthy' as const,
        sparkline: metricsData.slice(-20).map(d => d.outboundRate)
      },
      latency: {
        value: current.latency.toFixed(2),
        trend: calculateTrend(current.latency, previous.latency),
        status: getStatus(current.latency, { warning: 10, critical: 20 }),
        sparkline: metricsData.slice(-20).map(d => d.latency)
      },
      packetLoss: {
        value: (current.packetLoss * 100).toFixed(3),
        trend: calculateTrend(current.packetLoss, previous.packetLoss),
        status: getStatus(current.packetLoss * 100, { warning: 0.1, critical: 0.5 }),
        sparkline: metricsData.slice(-20).map(d => d.packetLoss * 100)
      },
      errorRate: {
        value: (current.errorRate * 100).toFixed(3),
        trend: calculateTrend(current.errorRate, previous.errorRate),
        status: getStatus(current.errorRate * 100, { warning: 0.5, critical: 1.0 }),
        sparkline: metricsData.slice(-20).map(d => d.errorRate * 100)
      }
    };
  }, [metricsData]);

  if (!currentMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LinkIcon className="h-12 w-12 text-fw-bodyLight mx-auto mb-4 animate-pulse" />
          <p className="text-fw-body">Loading link metrics...</p>
        </div>
      </div>
    );
  }

  const selectedLink = filteredLinks.length === 1 ? filteredLinks[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <LinkIcon className="h-8 w-8 text-fw-link" />
            <div>
              <h2 className="text-2xl font-bold text-fw-heading tracking-[-0.03em]">
                {selectedLink ? `${selectedLink.name} Performance` : 'Link Performance & Utilization'}
              </h2>
              <p className="text-figma-base text-fw-body mt-1">
                {selectedLink ? (
                  <>
                    VLAN {selectedLink.vlanId} • {selectedLink.ipSubnet} • MTU {selectedLink.mtu}
                  </>
                ) : (
                  `Monitoring ${filteredLinks.length} link${filteredLinks.length !== 1 ? 's' : ''}`
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <RealTimeMetricCard
          title="Bandwidth Utilization"
          value={currentMetrics.utilization.value}
          unit="%"
          icon={<Gauge className="h-5 w-5" />}
          status={currentMetrics.utilization.status}
          trend={currentMetrics.utilization.trend}
          sparklineData={currentMetrics.utilization.sparkline}
          target={{ value: Number(currentMetrics.utilization.value), label: 'Current Usage' }}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Inbound Traffic"
          value={currentMetrics.inbound.value}
          unit="Mbps"
          icon={<TrendingDown className="h-5 w-5" />}
          status={currentMetrics.inbound.status}
          trend={currentMetrics.inbound.trend}
          sparklineData={currentMetrics.inbound.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Outbound Traffic"
          value={currentMetrics.outbound.value}
          unit="Mbps"
          icon={<TrendingUp className="h-5 w-5" />}
          status={currentMetrics.outbound.status}
          trend={currentMetrics.outbound.trend}
          sparklineData={currentMetrics.outbound.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Link Latency"
          value={currentMetrics.latency.value}
          unit="ms"
          icon={<Activity className="h-5 w-5" />}
          status={currentMetrics.latency.status}
          trend={currentMetrics.latency.trend}
          sparklineData={currentMetrics.latency.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Packet Loss"
          value={currentMetrics.packetLoss.value}
          unit="%"
          icon={<AlertTriangle className="h-5 w-5" />}
          status={currentMetrics.packetLoss.status}
          trend={currentMetrics.packetLoss.trend}
          sparklineData={currentMetrics.packetLoss.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Error Rate"
          value={currentMetrics.errorRate.value}
          unit="%"
          icon={<AlertTriangle className="h-5 w-5" />}
          status={currentMetrics.errorRate.status}
          trend={currentMetrics.errorRate.trend}
          sparklineData={currentMetrics.errorRate.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />
      </div>

      <RealTimeChart
        data={metricsData.map(d => ({ timestamp: d.timestamp, value: d.utilizationPercentage }))}
        title="Bandwidth Utilization Over Time"
        unit="%"
        color={chartColors.warn}
        thresholds={{ warning: 75, critical: 90 }}
        height={300}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealTimeChart
          data={metricsData.map(d => ({ timestamp: d.timestamp, value: d.inboundRate }))}
          title="Inbound Traffic Rate"
          unit="Mbps"
          color={chartColors.success}
          height={250}
        />

        <RealTimeChart
          data={metricsData.map(d => ({ timestamp: d.timestamp, value: d.outboundRate }))}
          title="Outbound Traffic Rate"
          unit="Mbps"
          color={chartColors.primary}
          height={250}
        />
      </div>
    </div>
  );
}
