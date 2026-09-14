import { Connection, User } from './index';

export interface GroupAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isPrimary: boolean;
}

export interface GroupContact {
  name: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
}

interface GroupBilling {
  billingId: string;
  planName: string;
  monthlyRate: number;
  annualDiscount?: number;
  currency: string;
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  paymentMethod: 'credit_card' | 'bank_transfer' | 'invoice';
  lastInvoiceDate?: string;
  nextInvoiceDate?: string;
  billingAddress?: GroupAddress;
  billingContact?: GroupContact;
  invoiceHistory?: GroupInvoice[];
  spendingLimit?: number;
  costAllocation?: Record<string, number>; // Tags to cost allocation
}

interface GroupInvoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue' | 'processing';
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
}

interface GroupPerformance {
  aggregatedMetrics: {
    averageLatency: string;
    averagePacketLoss: string;
    averageUptime: string;
    totalBandwidth: string;
    bandwidthUtilization: number;
    totalTraffic: string;
  };
  historicalData: {
    timestamp: string;
    metrics: {
      latency: number;
      packetLoss: number;
      uptime: number;
      bandwidthUtilization: number;
    };
  }[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  type: 'business' | 'department' | 'project' | 'team' | 'custom';
  status: 'active' | 'inactive' | 'suspended';
  
  // Enhanced properties
  addresses?: GroupAddress[];
  contacts?: GroupContact[];
  connectionIds: string[]; // IDs of connections in this group
  connections?: Connection[]; // Optional loaded connections
  userIds: string[]; // IDs of users in this group
  users?: User[]; // Optional loaded users
  parentGroupId?: string; // For hierarchical groups
  childGroupIds?: string[]; // For hierarchical groups
  tags?: Record<string, string>; // Metadata tags
  
  // Access control
  ownerId: string; // User ID of the group owner
  permissions: {
    read: string[]; // User IDs with read permission
    write: string[]; // User IDs with write permission
    admin: string[]; // User IDs with admin permission
  };
  
  // Policy and compliance
  policies?: {
    id: string;
    name: string;
    description: string;
    rules: any[]; // Complex rules that would need their own type
  }[];
  
  // Metrics
  billing?: GroupBilling;
  performance?: GroupPerformance;
  
  // Custom attributes
  attributes?: Record<string, any>;
}

interface GroupFilter {
  search?: string;
  type?: Group['type'][];
  status?: Group['status'][];
  tags?: Record<string, string>;
  hasUsers?: boolean;
  hasConnections?: boolean;
}