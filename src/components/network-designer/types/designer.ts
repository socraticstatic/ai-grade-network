export type NodeStatus = 'unconfigured' | 'configured-inactive' | 'active' | 'active-down';
export type EdgeStatus = 'active' | 'inactive' | 'down';

export type ResiliencyTier = 'standard' | 'maximum' | 'geodiversity';

export interface NetworkNode {
  id: string;
  type: 'function' | 'destination' | 'network' | 'datacenter';
  functionType: string;
  subType?: string;
  cloudProvider?: string;
  dcProvider?: string;
  metro?: string;
  x: number;
  y: number;
  name: string;
  icon: string;
  status: NodeStatus;
  config: Record<string, any>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  bandwidth: string;
  status: EdgeStatus;
  vlan?: number;
  metrics?: {
    latency?: string;
    throughput?: string;
    packetLoss?: string;
    bandwidthUtilization?: number;
  };
  config?: {
    resilience?: 'single' | 'redundant' | 'ha' | 'dual-diverse';
    rto?: 'standard' | 'fast' | 'immediate';
    encrypted?: boolean;
    bfd?: boolean;
    qosProfile?: string;
  };
}

export type SimulationPhase = 'idle' | 'initializing' | 'running' | 'paused' | 'completed' | 'error';

export interface SimulationMetrics {
  bandwidth: { current: number; max: number };
  latency: { current: number; max: number };
  packets: { sent: number; received: number; errors: number };
}

export interface SimulationScores {
  resiliency: number;
  redundancy: number;
  disaster: number;
  security: number;
  performance: number;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
}

export interface DesignerTemplate {
  id: string;
  name: string;
  description: string;
  tier?: ResiliencyTier;
  providerOnly?: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  nodeCount: number;
  edgeCount: number;
}
