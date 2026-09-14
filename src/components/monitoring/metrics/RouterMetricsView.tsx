import { useState, useEffect, useMemo } from 'react';
import { Radio, Cpu, Database, Activity, TrendingUp, Network } from 'lucide-react';
import { RealTimeMetricCard } from './RealTimeMetricCard';
import { RealTimeChart } from './RealTimeChart';
import { useMonitoring } from '../context/MonitoringContext';
import { chartColors } from '../../../utils/chartColors';

interface RouterMetricData {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  bgpActiveSessions: number;
  routingTableSize: number;
  packetForwardingRate: number;
  controlPlaneLoad: number;
}

export function RouterMetricsView() {
  const { filteredRouters, generateHourlyData } = useMonitoring();
  const [metricsData, setMetricsData] = useState<RouterMetricData[]>([]);

  useEffect(() => {
    const initialData = generateHourlyData().map(d => ({
      timestamp: new Date(d.timestamp),
      cpuUsage: Math.random() * 40 + 30,
      memoryUsage: Math.random() * 30 + 50,
      bgpActiveSession: Math.floor(Math.random() * 8) + 12,
      routingTableSize: Math.floor(Math.random() * 5000) + 45000,
      packetForwardingRate: Math.random() * 200 + 800,
      controlPlaneLoad: Math.random() * 20 + 10
    }));
    setMetricsData(initialData);

    const interval = setInterval(() => {
      setMetricsData(prev => {
        const newPoint: RouterMetricData = {
          timestamp: new Date(),
          cpuUsage: Math.random() * 40 + 30,
          memoryUsage: Math.random() * 30 + 50,
          bgpActiveSessions: Math.floor(Math.random() * 8) + 12,
          routingTableSize: Math.floor(Math.random() * 5000) + 45000,
          packetForwardingRate: Math.random() * 200 + 800,
          controlPlaneLoad: Math.random() * 20 + 10
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
      cpuUsage: {
        value: current.cpuUsage.toFixed(1),
        trend: calculateTrend(current.cpuUsage, previous.cpuUsage),
        status: getStatus(current.cpuUsage, { warning: 70, critical: 85 }),
        sparkline: metricsData.slice(-20).map(d => d.cpuUsage)
      },
      memoryUsage: {
        value: current.memoryUsage.toFixed(1),
        trend: calculateTrend(current.memoryUsage, previous.memoryUsage),
        status: getStatus(current.memoryUsage, { warning: 75, critical: 90 }),
        sparkline: metricsData.slice(-20).map(d => d.memoryUsage)
      },
      bgpSessions: {
        value: current.bgpActiveSessions,
        trend: calculateTrend(current.bgpActiveSessions, previous.bgpActiveSessions),
        status: 'healthy' as const,
        sparkline: metricsData.slice(-20).map(d => d.bgpActiveSessions)
      },
      routingTable: {
        value: current.routingTableSize,
        trend: calculateTrend(current.routingTableSize, previous.routingTableSize),
        status: 'healthy' as const,
        sparkline: metricsData.slice(-20).map(d => d.routingTableSize)
      },
      forwardingRate: {
        value: current.packetForwardingRate.toFixed(0),
        trend: calculateTrend(current.packetForwardingRate, previous.packetForwardingRate),
        status: 'healthy' as const,
        sparkline: metricsData.slice(-20).map(d => d.packetForwardingRate)
      },
      controlPlane: {
        value: current.controlPlaneLoad.toFixed(1),
        trend: calculateTrend(current.controlPlaneLoad, previous.controlPlaneLoad),
        status: getStatus(current.controlPlaneLoad, { warning: 25, critical: 40 }),
        sparkline: metricsData.slice(-20).map(d => d.controlPlaneLoad)
      }
    };
  }, [metricsData]);

  if (!currentMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Radio className="h-12 w-12 text-fw-bodyLight mx-auto mb-4 animate-pulse" />
          <p className="text-fw-body">Loading hub metrics...</p>
        </div>
      </div>
    );
  }

  const selectedRouter = filteredRouters.length === 1 ? filteredRouters[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Radio className="h-8 w-8 text-fw-link" />
            <div>
              <h2 className="text-2xl font-bold text-fw-heading tracking-[-0.03em]">
                {selectedRouter ? `${selectedRouter.name} Performance` : 'Hub Performance'}
              </h2>
              <p className="text-figma-base text-fw-body mt-1">
                {selectedRouter ? (
                  <>
                    {selectedRouter.vendor} • {selectedRouter.location} • ASN {selectedRouter.configuration?.asn || 'N/A'}
                  </>
                ) : (
                  `Monitoring ${filteredRouters.length} hub${filteredRouters.length !== 1 ? 's' : ''}`
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <RealTimeMetricCard
          title="CPU Usage"
          value={currentMetrics.cpuUsage.value}
          unit="%"
          icon={<Cpu className="h-5 w-5" />}
          status={currentMetrics.cpuUsage.status}
          trend={currentMetrics.cpuUsage.trend}
          sparklineData={currentMetrics.cpuUsage.sparkline}
          target={{ value: Number(currentMetrics.cpuUsage.value), label: 'Current Load' }}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Memory Usage"
          value={currentMetrics.memoryUsage.value}
          unit="%"
          icon={<Database className="h-5 w-5" />}
          status={currentMetrics.memoryUsage.status}
          trend={currentMetrics.memoryUsage.trend}
          sparklineData={currentMetrics.memoryUsage.sparkline}
          target={{ value: Number(currentMetrics.memoryUsage.value), label: 'Current Usage' }}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="BGP Sessions"
          value={currentMetrics.bgpSessions.value}
          icon={<Network className="h-5 w-5" />}
          status={currentMetrics.bgpSessions.status}
          trend={currentMetrics.bgpSessions.trend}
          sparklineData={currentMetrics.bgpSessions.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Routing Table Size"
          value={currentMetrics.routingTable.value}
          unit="routes"
          icon={<Activity className="h-5 w-5" />}
          status={currentMetrics.routingTable.status}
          trend={currentMetrics.routingTable.trend}
          sparklineData={currentMetrics.routingTable.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Packet Forwarding"
          value={currentMetrics.forwardingRate.value}
          unit="Kpps"
          icon={<TrendingUp className="h-5 w-5" />}
          status={currentMetrics.forwardingRate.status}
          trend={currentMetrics.forwardingRate.trend}
          sparklineData={currentMetrics.forwardingRate.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Control Plane Load"
          value={currentMetrics.controlPlane.value}
          unit="%"
          icon={<Radio className="h-5 w-5" />}
          status={currentMetrics.controlPlane.status}
          trend={currentMetrics.controlPlane.trend}
          sparklineData={currentMetrics.controlPlane.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />
      </div>

      <RealTimeChart
        data={metricsData.map(d => ({ timestamp: d.timestamp, value: d.cpuUsage }))}
        title="CPU Usage Over Time"
        unit="%"
        color={chartColors.primary}
        thresholds={{ warning: 70, critical: 85 }}
        height={300}
      />

      <RealTimeChart
        data={metricsData.map(d => ({ timestamp: d.timestamp, value: d.packetForwardingRate }))}
        title="Packet Forwarding Rate"
        unit="Kpps"
        color={chartColors.success}
        height={300}
      />
    </div>
  );
}
