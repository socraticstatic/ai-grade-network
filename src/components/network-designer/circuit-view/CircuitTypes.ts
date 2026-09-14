// Common types used across the circuit view components
import { NetworkNode, NetworkEdge } from '../../types';

export interface Port {
  id: string;
  name: string;
  type: 'fiber' | 'copper' | 'virtual';
  speed: string;
  status: 'active' | 'inactive' | 'error';
  connectedTo?: string;
  position?: 'front' | 'back';
  slot?: number;
  module?: string;
}

export interface Circuit {
  id: string;
  sourcePort: string;
  targetPort: string;
  type: 'dark-fiber' | 'wave' | 'ethernet' | 'mpls';
  capacity: string;
  status: 'active' | 'inactive' | 'degraded';
  metrics?: {
    light: number;
    loss: number;
    latency: number;
  };
}

export interface ViewMode {
  mode: 'logical' | 'physical' | 'rack';
  deviceId?: string;
}

export interface DraggablePanelPosition {
  x: number;
  y: number;
}

export type DevicePortsMap = Record<string, Port[]>;