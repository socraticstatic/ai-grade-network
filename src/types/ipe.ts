export type DataCenterProvider = 'Equinix' | 'Cisco Jasper' | 'Databank' | 'CoreWeave';
export type IPEStatus = 'active' | 'maintenance' | 'degraded' | 'offline';
export type IPERegion = 'US East' | 'US West' | 'Europe' | 'Asia Pacific' | 'Latin America' | 'Middle East';

export interface CloudOnRamp {
  provider: 'AWS' | 'Azure' | 'Google' | 'Oracle' | 'IBM';
  available: boolean;
  capacity?: string;
  utilized?: string;
  utilization?: number;
}

export interface IPE {
  id: string;
  name: string;
  location: string;
  region: IPERegion;
  dataCenterProvider: DataCenterProvider;
  status: IPEStatus;
  installedCapacity: string;
  availableCapacity: string;
  utilization: number;
  utilizationTrend: number[];
  peakUtilization: number;
  cloudOnRamps: CloudOnRamp[];
  totalConnections: number;
  totalLinks: number;
  totalVNFs: number;
  monthlyRevenue?: number;
  averageLatency?: string;
  uptime?: string;
  redundantIPE?: string;
  address?: {
    street?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  capabilities?: {
    maxBandwidth: string;
    supportedProtocols: string[];
    securityFeatures: string[];
    monitoringCapabilities: string[];
  };
  maintenanceWindow?: {
    day: string;
    time: string;
    timezone: string;
  };
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface IPESummary {
  totalIPEs: number;
  totalCapacity: string;
  averageUtilization: number;
  ipesOverThreshold: number;
  byProvider: Record<DataCenterProvider, number>;
  byRegion: Record<IPERegion, number>;
  totalRevenue: number;
  averageRevenuePerIPE: number;
}
