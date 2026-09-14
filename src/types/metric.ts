interface Metric {
  id: string;
  name: string;
  description: string;
  category: string;
  dataType: 'number' | 'percentage' | 'string';
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  unit?: string;
}

export interface MetricGroup {
  id: string;
  name: string;
  metrics: Metric[];
}

export interface ThresholdRule {
  id: string;
  metricId: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  value1: number;
  value2?: number;
  severity: 'info' | 'warning' | 'critical';
  action?: 'notify' | 'alert' | 'escalate';
}

export type ResourceType = 'connection' | 'pool' | 'router' | 'link' | 'vnf';

export interface PerformanceMetrics {
  timestamp: string;
  latency?: number;
  throughput?: number;
  packetLoss?: number;
  jitter?: number;
  errorRate?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  bandwidth?: number;
  utilization?: number;
}

export interface RouterPerformanceMetrics extends PerformanceMetrics {
  bgpSessions: {
    total: number;
    active: number;
    idle: number;
  };
  routingTableSize: number;
  packetForwardingRate: number;
  controlPlaneLoad: number;
}

export interface LinkPerformanceMetrics extends PerformanceMetrics {
  bandwidthCapacity: number;
  currentUsage: number;
  utilizationPercentage: number;
  inboundRate: number;
  outboundRate: number;
  qosMetrics: {
    delayVariation: number;
    priorityQueueDepth: number;
  };
}

export interface VNFPerformanceMetrics extends PerformanceMetrics {
  activeSessions: number;
  maxSessions: number;
  policyHitRate: number;
  serviceSpecificMetrics: Record<string, number>;
  licenseUtilization: number;
}