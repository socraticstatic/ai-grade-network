import { useState, useEffect, useMemo } from 'react';
import { Box, Zap, Users, Shield, Cpu, Database, Globe, Scale, AlertTriangle, HardDrive } from 'lucide-react';
import { RealTimeMetricCard } from './RealTimeMetricCard';
import { RealTimeChart } from './RealTimeChart';
import { useMonitoring } from '../context/MonitoringContext';
import { chartColors } from '../../../utils/chartColors';
import { getVNFTypeInfo, getVNFTypeIcon } from '../../../utils/vnfTypes';
import { VNFHealthBanner } from './VNFHealthBanner';
import { VNFFleetView } from './VNFFleetView';

interface VNFMetricData {
  timestamp: Date;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  activeSessions: number;
  policyHitRate: number;
  licenseUtilization: number;
}

export function VNFMetricsView() {
  const { filteredVNFs, generateHourlyData } = useMonitoring();
  const [metricsData, setMetricsData] = useState<VNFMetricData[]>([]);

  useEffect(() => {
    const initialData = generateHourlyData().map(d => ({
      timestamp: new Date(d.timestamp),
      throughput: Math.random() * 250 + 650,
      cpuUsage: Math.random() * 35 + 35,
      memoryUsage: Math.random() * 25 + 55,
      storageUsage: Math.random() * 30 + 40,
      activeSessions: Math.floor(Math.random() * 5000) + 15000,
      policyHitRate: Math.random() * 10 + 85,
      licenseUtilization: Math.random() * 20 + 60,
    }));
    setMetricsData(initialData);

    const interval = setInterval(() => {
      setMetricsData(prev => {
        const newPoint: VNFMetricData = {
          timestamp: new Date(),
          throughput: Math.random() * 250 + 650,
          cpuUsage: Math.random() * 35 + 35,
          memoryUsage: Math.random() * 25 + 55,
          storageUsage: Math.random() * 30 + 40,
          activeSessions: Math.floor(Math.random() * 5000) + 15000,
          policyHitRate: Math.random() * 10 + 85,
          licenseUtilization: Math.random() * 20 + 60,
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
    const window20 = metricsData.slice(-20);

    const calculateTrend = (currentVal: number, prevVal: number) => {
      const change = ((currentVal - prevVal) / prevVal) * 100;
      return {
        direction: change > 1 ? 'up' as const : change < -1 ? 'down' as const : 'stable' as const,
        percentage: Math.abs(change),
        timeframe: '10 samples',
      };
    };

    const getStatus = (value: number, thresholds: { warning: number; critical: number }) => {
      if (value >= thresholds.critical) return 'critical' as const;
      if (value >= thresholds.warning) return 'warning' as const;
      return 'healthy' as const;
    };

    const cpuValues = window20.map(d => d.cpuUsage);
    const cpuSubtitle = `Min ${Math.min(...cpuValues).toFixed(1)}% / Max ${Math.max(...cpuValues).toFixed(1)}%`;

    return {
      cpuSubtitle,
      throughput: {
        value: current.throughput.toFixed(0),
        trend: calculateTrend(current.throughput, previous.throughput),
        status: current.throughput > 700 ? 'healthy' as const : current.throughput > 500 ? 'warning' as const : 'critical' as const,
        sparkline: window20.map(d => d.throughput),
      },
      cpuUsage: {
        value: current.cpuUsage.toFixed(1),
        trend: calculateTrend(current.cpuUsage, previous.cpuUsage),
        status: getStatus(current.cpuUsage, { warning: 70, critical: 85 }),
        sparkline: window20.map(d => d.cpuUsage),
      },
      memoryUsage: {
        value: current.memoryUsage.toFixed(1),
        trend: calculateTrend(current.memoryUsage, previous.memoryUsage),
        status: getStatus(current.memoryUsage, { warning: 75, critical: 90 }),
        sparkline: window20.map(d => d.memoryUsage),
      },
      storageUsage: {
        value: current.storageUsage.toFixed(1),
        trend: calculateTrend(current.storageUsage, previous.storageUsage),
        status: getStatus(current.storageUsage, { warning: 80, critical: 90 }),
        sparkline: window20.map(d => d.storageUsage),
      },
      activeSessions: {
        value: current.activeSessions.toLocaleString(),
        trend: calculateTrend(current.activeSessions, previous.activeSessions),
        status: 'healthy' as const,
        sparkline: window20.map(d => d.activeSessions),
      },
      policyHitRate: {
        value: current.policyHitRate.toFixed(1),
        trend: calculateTrend(current.policyHitRate, previous.policyHitRate),
        status: current.policyHitRate > 85 ? 'healthy' as const : current.policyHitRate > 70 ? 'warning' as const : 'critical' as const,
        sparkline: window20.map(d => d.policyHitRate),
      },
      licenseUtilization: {
        value: current.licenseUtilization.toFixed(1),
        trend: calculateTrend(current.licenseUtilization, previous.licenseUtilization),
        status: getStatus(current.licenseUtilization, { warning: 80, critical: 95 }),
        sparkline: window20.map(d => d.licenseUtilization),
      },
      charts: {
        throughput:  metricsData.map(d => ({ timestamp: d.timestamp, value: d.throughput })),
        cpuUsage:    metricsData.map(d => ({ timestamp: d.timestamp, value: d.cpuUsage })),
        storage:     metricsData.map(d => ({ timestamp: d.timestamp, value: d.storageUsage })),
        sessions:    metricsData.map(d => ({ timestamp: d.timestamp, value: d.activeSessions })),
        policyHit:   metricsData.map(d => ({ timestamp: d.timestamp, value: d.policyHitRate })),
      },
    };
  }, [metricsData]);

  if (!currentMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Box className="h-12 w-12 text-fw-bodyLight mx-auto mb-4 animate-pulse" />
          <p className="text-fw-body">Loading VNF metrics...</p>
        </div>
      </div>
    );
  }

  // Get VNF details for display
  const selectedVNF = filteredVNFs.length === 1 ? filteredVNFs[0] : null;
  const vnfTypeInfo = selectedVNF ? getVNFTypeInfo(selectedVNF.type) : null;
  const VNFIcon = selectedVNF ? getVNFTypeIcon(selectedVNF.type) : Box;

  // Fleet view for multiple VNFs
  if (filteredVNFs.length !== 1) {
    return <VNFFleetView />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {selectedVNF && <VNFIcon className="h-8 w-8 text-fw-link" />}
            <div>
              <h2 className="text-2xl font-bold text-fw-heading tracking-[-0.03em]">
                {selectedVNF ? `${selectedVNF.name} Performance` : 'VNF Performance & Capacity'}
              </h2>
              <p className="text-figma-base text-fw-body mt-1">
                {selectedVNF ? (
                  <>
                    {vnfTypeInfo?.label} • {selectedVNF.vendor}
                    {selectedVNF.model && ` ${selectedVNF.model}`}
                  </>
                ) : (
                  `Monitoring ${filteredVNFs.length} VNF${filteredVNFs.length !== 1 ? 's' : ''}`
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {selectedVNF && (
        <VNFHealthBanner
          vnf={selectedVNF}
          cpuUsage={Number(currentMetrics.cpuUsage.value)}
          memoryUsage={Number(currentMetrics.memoryUsage.value)}
          storageUsage={Number(currentMetrics.storageUsage.value)}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
        />
      )}

      {/* VNF Type Information */}
      {selectedVNF && vnfTypeInfo && (
        <div className="bg-fw-accent border border-fw-active rounded-lg p-4">
          <h3 className="font-medium text-fw-linkHover mb-2">VNF Type: {vnfTypeInfo.label}</h3>
          <p className="text-figma-base text-fw-link mb-3">{vnfTypeInfo.description}</p>
          <div className="flex flex-wrap gap-2">
            {vnfTypeInfo.commonFeatures.slice(0, 5).map((feature, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-figma-sm font-medium bg-fw-accent text-fw-linkHover"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <RealTimeMetricCard
          title="Throughput"
          value={currentMetrics.throughput.value}
          unit="Mbps"
          icon={<Zap className="h-5 w-5" />}
          status={currentMetrics.throughput.status}
          trend={currentMetrics.throughput.trend}
          sparklineData={currentMetrics.throughput.sparkline}
          target={{ value: 75, label: 'Capacity Usage' }}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Active Sessions"
          value={currentMetrics.activeSessions.value}
          icon={<Users className="h-5 w-5" />}
          status={currentMetrics.activeSessions.status}
          trend={currentMetrics.activeSessions.trend}
          sparklineData={currentMetrics.activeSessions.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="Policy Hit Rate"
          value={currentMetrics.policyHitRate.value}
          unit="%"
          icon={<Shield className="h-5 w-5" />}
          status={currentMetrics.policyHitRate.status}
          trend={currentMetrics.policyHitRate.trend}
          sparklineData={currentMetrics.policyHitRate.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="CPU Usage"
          value={currentMetrics.cpuUsage.value}
          unit="%"
          subtitle={currentMetrics.cpuSubtitle}
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
          title="Storage Usage"
          value={currentMetrics.storageUsage.value}
          unit="%"
          icon={<HardDrive className="h-5 w-5" />}
          status={currentMetrics.storageUsage.status}
          trend={currentMetrics.storageUsage.trend}
          sparklineData={currentMetrics.storageUsage.sparkline}
          target={{ value: Number(currentMetrics.storageUsage.value), label: 'Current Usage' }}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />

        <RealTimeMetricCard
          title="License Utilization"
          value={currentMetrics.licenseUtilization.value}
          unit="%"
          icon={<Box className="h-5 w-5" />}
          status={currentMetrics.licenseUtilization.status}
          trend={currentMetrics.licenseUtilization.trend}
          sparklineData={currentMetrics.licenseUtilization.sparkline}
          lastUpdate={metricsData[metricsData.length - 1]?.timestamp}
          isLive={true}
        />
      </div>

      <RealTimeChart
        data={currentMetrics.charts.throughput}
        title="VNF Throughput Over Time"
        unit="Mbps"
        color={chartColors.purple}
        thresholds={{ warning: 500, critical: 300 }}
        height={300}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealTimeChart
          data={currentMetrics.charts.cpuUsage}
          title="CPU Utilization"
          unit="%"
          color={chartColors.warn}
          thresholds={{ warning: 70, critical: 85 }}
          height={250}
        />
        <RealTimeChart
          data={currentMetrics.charts.storage}
          title="Storage Utilization"
          unit="%"
          color={chartColors.categorical[2]}
          thresholds={{ warning: 80, critical: 90 }}
          height={250}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealTimeChart
          data={currentMetrics.charts.sessions}
          title="Active Sessions"
          unit="sessions"
          color={chartColors.success}
          height={250}
        />

        <RealTimeChart
          data={currentMetrics.charts.policyHit}
          title="Policy Hit Rate"
          unit="%"
          color={chartColors.warn}
          height={250}
        />
      </div>

      {/* VNF Type-Specific Metrics */}
      {selectedVNF && (
        <div className="bg-fw-wash border border-fw-secondary rounded-lg p-6">
          <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em] mb-4">
            {vnfTypeInfo?.label}-Specific Metrics
          </h3>

          {selectedVNF.type === 'firewall' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">Threat Blocks</span>
                  <Shield className="h-5 w-5 text-fw-error" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{Math.floor(Math.random() * 500 + 1000).toLocaleString()}</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Last hour</p>
              </div>
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">Rules Active</span>
                  <Shield className="h-5 w-5 text-fw-success" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{Math.floor(Math.random() * 200 + 800)}</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Security policies</p>
              </div>
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">VPN Tunnels</span>
                  <Shield className="h-5 w-5 text-fw-link" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{Math.floor(Math.random() * 20 + 15)}</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Active connections</p>
              </div>
            </div>
          )}

          {selectedVNF.type === 'sdwan' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">WAN Links</span>
                  <Globe className="h-5 w-5 text-fw-bodyLight" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{Math.floor(Math.random() * 3 + 3)}</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Active paths</p>
              </div>
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">Path Selection</span>
                  <Globe className="h-5 w-5 text-fw-success" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{(Math.random() * 20 + 70).toFixed(1)}%</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Optimal routing</p>
              </div>
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">Applications</span>
                  <Globe className="h-5 w-5 text-fw-link" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{Math.floor(Math.random() * 50 + 150)}</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Recognized apps</p>
              </div>
            </div>
          )}

          {selectedVNF.type === 'load_balancer' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">Backend Servers</span>
                  <Scale className="h-5 w-5 text-fw-bodyLight" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{Math.floor(Math.random() * 5 + 8)}</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Healthy nodes</p>
              </div>
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">Requests/sec</span>
                  <Scale className="h-5 w-5 text-fw-success" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{Math.floor(Math.random() * 5000 + 15000).toLocaleString()}</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Current load</p>
              </div>
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">SSL Offload</span>
                  <Scale className="h-5 w-5 text-fw-link" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{(Math.random() * 30 + 60).toFixed(1)}%</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Enabled</p>
              </div>
            </div>
          )}

          {selectedVNF.type === 'ids_ips' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">Threats Detected</span>
                  <AlertTriangle className="h-5 w-5 text-fw-bodyLight" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{Math.floor(Math.random() * 100 + 50)}</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Last hour</p>
              </div>
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">Signatures</span>
                  <AlertTriangle className="h-5 w-5 text-fw-success" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{Math.floor(Math.random() * 5000 + 25000).toLocaleString()}</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Active rules</p>
              </div>
              <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-figma-base font-medium text-fw-body">False Positives</span>
                  <AlertTriangle className="h-5 w-5 text-fw-bodyLight" />
                </div>
                <p className="text-2xl font-bold text-fw-heading">{(Math.random() * 5).toFixed(1)}%</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Detection rate</p>
              </div>
            </div>
          )}

          {(!selectedVNF.type ||
            !['firewall', 'sdwan', 'load_balancer', 'ids_ips'].includes(selectedVNF.type)) && (
            <div className="text-center py-8">
              <Box className="h-12 w-12 text-fw-bodyLight mx-auto mb-4" />
              <p className="text-fw-body">
                Type-specific metrics for {vnfTypeInfo?.label || 'this VNF type'} will be displayed here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
