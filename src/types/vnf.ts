import { DivideIcon as LucideIcon } from 'lucide-react';

export type VNFType =
  | 'firewall'
  | 'sdwan'
  | 'router'
  | 'vnat'
  | 'load_balancer'
  | 'ids_ips'
  | 'wan_optimizer'
  | 'custom';

export interface VNF {
  id: string;
  name: string;
  type: VNFType;
  vendor: string;
  model?: string;
  version?: string;
  status: 'active' | 'inactive' | 'provisioning' | 'error';
  throughput?: string;
  size?: VNFSize;
  licenseExpiry?: string;
  configuration?: {
    interfaces?: VNFInterface[];
    routingProtocols?: string[];
    policies?: any[];
    highAvailability?: boolean;
    managementIP?: string;
    [key: string]: any;
  };
  position?: {
    x: number;
    y: number;
  };
  createdAt: string;
  updatedAt?: string;
  icon?: typeof LucideIcon;
  description?: string;
  connectionId: string;
  hubIds?: string[];
  linkIds: string[];
  performance?: {
    throughput: string;
    latency: string;
    cpuUsage: number;
    memoryUsage: number;
    activeSessions: number;
    maxSessions: number;
    policyHitRate: number;
    licenseUtilization: number;
    serviceSpecificMetrics: Record<string, number>;
  };
  origin?: {
    source: 'manual' | 'aws-marketplace' | 'azure-marketplace' | 'gcp-marketplace';
    requestId?: string;
    externalAccountId?: string;
    initiatedAt?: string;
    metadata?: Record<string, any>;
  };
}

export interface VNFTypeInfo {
  type: VNFType;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultVendors: string[];
  commonFeatures: string[];
}

export interface VNFInterface {
  id: string;
  name: string;
  type: 'wan' | 'lan' | 'management' | 'ha';
  ipAddress?: string;
  subnetMask?: string;
  hub?: string;
  vlanId?: number;
  mtu?: number;
  status: 'up' | 'down';
}

export interface VNFTemplate {
  id: string;
  name: string;
  description: string;
  type: VNFType;
  vendor: string;
  model?: string;
  throughput: string;
  defaultConfiguration?: {
    interfaces?: Partial<VNFInterface>[];
    routingProtocols?: string[];
    policies?: any[];
    [key: string]: any;
  };
  icon: typeof LucideIcon;
  recommendedUseCase?: string;
  licenseRequired: boolean;
}

export type VNFSize = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface VNFSizeTier {
  id: VNFSize;
  label: string;
  vcpuRange: string;
  ramRange: string;
  storageRange: string;
  monthlyPrice: number;
}

export const VNF_SIZE_TIERS: VNFSizeTier[] = [
  { id: 'xs', label: 'XS', vcpuRange: '1–2',  ramRange: '2–4 GB',   storageRange: '20–50 GB',   monthlyPrice: 250  },
  { id: 's',  label: 'S',  vcpuRange: '2–4',  ramRange: '4–8 GB',   storageRange: '50–100 GB',  monthlyPrice: 375  },
  { id: 'm',  label: 'M',  vcpuRange: '4–8',  ramRange: '8–16 GB',  storageRange: '100–200 GB', monthlyPrice: 560  },
  { id: 'l',  label: 'L',  vcpuRange: '8–16', ramRange: '16–32 GB', storageRange: '200–300 GB', monthlyPrice: 875  },
  { id: 'xl', label: 'XL', vcpuRange: '16–32',ramRange: '32–64 GB', storageRange: '300–500 GB', monthlyPrice: 1250 },
];