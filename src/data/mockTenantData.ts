/**
 * Tenant-specific mock data for multitenancy demo.
 * Each tenant has its own connections, users, and groups.
 * When switching tenants, these replace the main store arrays.
 */
import { Connection, User } from '../types';
import { Group } from '../types/group';
import { TenantBranding } from '../store/slices/tenantContextSlice';

export interface TenantDataSet {
  connections: Connection[];
  users: User[];
  groups: Group[];
  branding: TenantBranding;
}

// AT&T Platform data comes from sampleData.ts (the default)
// These are the customer-specific datasets.

export const tenantData: Record<string, TenantDataSet> = {
  'TNT-002': {
    // Acme Corp
    branding: {
      productName: 'AcmeCloud Connect',
      primaryColor: '#0F766E',
      accentColor: '#14B8A6',
      fontFamily: 'Inter',
    },
    connections: [
      {
        id: 'acme-conn-1',
        name: 'Acme US-East Production',
        type: 'Internet to Cloud',
        status: 'Active',
        bandwidth: '10 Gbps',
        location: 'US East',
        provider: 'AWS',
        performance: {
          latency: '3.2ms',
          packetLoss: '0.01%',
          uptime: '99.99%',
          throughput: '10 Gbps',
          tunnels: 'Active',
          bandwidthUtilization: 72,
          currentUsage: '7.2 Gbps',
          utilizationTrend: [65, 68, 70, 71, 74, 72, 72],
        },
        features: { dedicatedConnection: true, redundantPath: true, autoScaling: false, loadBalancing: true },
        security: { encryption: 'AES-256', firewall: true, ddosProtection: true, ipSecEnabled: true },
        billing: { planId: '36-months', term: '36 Months', addons: [], baseFee: 4999.99, usage: 0, total: 4999.99, currency: 'USD' },
      },
      {
        id: 'acme-conn-2',
        name: 'Acme Azure ExpressRoute',
        type: 'Internet to Cloud',
        status: 'Active',
        bandwidth: '1 Gbps',
        location: 'EU West',
        provider: 'Azure',
        performance: {
          latency: '8.1ms',
          packetLoss: '0.03%',
          uptime: '99.95%',
          throughput: '1 Gbps',
          tunnels: 'Active',
          bandwidthUtilization: 45,
          currentUsage: '450 Mbps',
          utilizationTrend: [40, 42, 44, 43, 46, 45, 45],
        },
        features: { dedicatedConnection: true, redundantPath: false, autoScaling: false, loadBalancing: false },
        security: { encryption: 'AES-256', firewall: true, ddosProtection: true, ipSecEnabled: true },
        billing: { planId: '12-months', term: '12 Months', addons: [], baseFee: 999.99, usage: 0, total: 999.99, currency: 'USD' },
      },
      {
        id: 'acme-conn-3',
        name: 'Acme DR Backup Link',
        type: 'Internet to Cloud',
        status: 'Inactive',
        bandwidth: '500 Mbps',
        location: 'US West',
        provider: 'AWS',
        performance: {
          latency: '<10ms',
          packetLoss: '<0.1%',
          uptime: '99.9%',
          throughput: '0%',
          tunnels: 'Inactive',
          bandwidthUtilization: 0,
          currentUsage: '0 Gbps',
          utilizationTrend: [0, 0, 0, 0, 0, 0, 0],
        },
        features: { dedicatedConnection: true, redundantPath: false, autoScaling: false, loadBalancing: false },
        security: { encryption: 'AES-256', firewall: true, ddosProtection: true, ipSecEnabled: true },
        billing: { planId: 'pay-as-you-go', term: 'Monthly', addons: [], baseFee: 499.99, usage: 0, total: 499.99, currency: 'USD' },
      },
    ],
    users: [
      { id: 'acme-u1', name: 'Michael Thompson', email: 'm.thompson@acmecloud.io', role: 'Admin', department: 'Engineering', status: 'active', lastLogin: '2026-04-04' },
      { id: 'acme-u2', name: 'Rachel Kim', email: 'r.kim@acmecloud.io', role: 'Admin', department: 'Infrastructure', status: 'active', lastLogin: '2026-04-03' },
      { id: 'acme-u3', name: 'David Park', email: 'd.park@acmecloud.io', role: 'User', department: 'Engineering', status: 'active', lastLogin: '2026-04-02' },
      { id: 'acme-u4', name: 'Sarah Lin', email: 's.lin@acmecloud.io', role: 'User', department: 'DevOps', status: 'active', lastLogin: '2026-03-28' },
      { id: 'acme-u5', name: 'James Patel', email: 'j.patel@acmecloud.io', role: 'User', department: 'Engineering', status: 'inactive', lastLogin: '2026-02-15' },
    ] as User[],
    groups: [
      {
        id: 'acme-g1',
        name: 'Production',
        description: 'Production cloud connections',
        status: 'active',
        members: ['acme-u1', 'acme-u2'],
        connections: ['acme-conn-1', 'acme-conn-2'],
        createdAt: '2025-06-15',
      } as Group,
    ],
  },

  'TNT-003': {
    // TechFlow Solutions
    branding: {
      productName: 'TechFlow Network Hub',
      primaryColor: '#7C3AED',
      accentColor: '#A78BFA',
      fontFamily: 'Inter',
    },
    connections: [
      {
        id: 'tf-conn-1',
        name: 'TechFlow GCP Primary',
        type: 'Internet to Cloud',
        status: 'Active',
        bandwidth: '1 Gbps',
        location: 'US East',
        provider: 'Google',
        performance: {
          latency: '2.8ms',
          packetLoss: '0.01%',
          uptime: '99.99%',
          throughput: '1 Gbps',
          tunnels: 'Active',
          bandwidthUtilization: 58,
          currentUsage: '580 Mbps',
          utilizationTrend: [50, 52, 55, 56, 58, 57, 58],
        },
        features: { dedicatedConnection: true, redundantPath: true, autoScaling: false, loadBalancing: false },
        security: { encryption: 'AES-256', firewall: true, ddosProtection: true, ipSecEnabled: true },
        billing: { planId: '24-months', term: '24 Months', addons: [], baseFee: 1499.99, usage: 0, total: 1499.99, currency: 'USD' },
      },
      {
        id: 'tf-conn-2',
        name: 'TechFlow GCP Staging',
        type: 'Internet to Cloud',
        status: 'Active',
        bandwidth: '500 Mbps',
        location: 'US West',
        provider: 'Google',
        performance: {
          latency: '5.2ms',
          packetLoss: '0.02%',
          uptime: '99.95%',
          throughput: '500 Mbps',
          tunnels: 'Active',
          bandwidthUtilization: 22,
          currentUsage: '110 Mbps',
          utilizationTrend: [18, 20, 22, 21, 23, 22, 22],
        },
        features: { dedicatedConnection: true, redundantPath: false, autoScaling: false, loadBalancing: false },
        security: { encryption: 'AES-256', firewall: true, ddosProtection: true, ipSecEnabled: true },
        billing: { planId: 'pay-as-you-go', term: 'Monthly', addons: [], baseFee: 599.99, usage: 0, total: 599.99, currency: 'USD' },
      },
    ],
    users: [
      { id: 'tf-u1', name: 'Alex Rivera', email: 'a.rivera@techflow.dev', role: 'Admin', department: 'Platform', status: 'active', lastLogin: '2026-04-05' },
      { id: 'tf-u2', name: 'Priya Sharma', email: 'p.sharma@techflow.dev', role: 'Admin', department: 'SRE', status: 'active', lastLogin: '2026-04-04' },
      { id: 'tf-u3', name: 'Tom Walsh', email: 't.walsh@techflow.dev', role: 'User', department: 'Engineering', status: 'active', lastLogin: '2026-04-01' },
    ] as User[],
    groups: [
      {
        id: 'tf-g1',
        name: 'GCP Interconnects',
        description: 'All Google Cloud connections',
        status: 'active',
        members: ['tf-u1', 'tf-u2'],
        connections: ['tf-conn-1', 'tf-conn-2'],
        createdAt: '2025-09-10',
      } as Group,
    ],
  },

  'TNT-004': {
    // Global Network Services (reseller)
    branding: {
      productName: 'GNS Cloud Bridge',
      primaryColor: '#1E3A8A',
      accentColor: '#F59E0B',
      fontFamily: 'Inter',
    },
    connections: [
      {
        id: 'gns-conn-1',
        name: 'GNS Core Backbone East',
        type: 'Internet to Cloud',
        status: 'Active',
        bandwidth: '100 Gbps',
        location: 'US East',
        provider: 'AWS',
        performance: {
          latency: '1.2ms',
          packetLoss: '0.001%',
          uptime: '99.999%',
          throughput: '100 Gbps',
          tunnels: 'Active',
          bandwidthUtilization: 34,
          currentUsage: '34 Gbps',
          utilizationTrend: [30, 31, 33, 32, 34, 35, 34],
        },
        features: { dedicatedConnection: true, redundantPath: true, autoScaling: true, loadBalancing: true },
        security: { encryption: 'AES-256', firewall: true, ddosProtection: true, ipSecEnabled: true },
        billing: { planId: '36-months', term: '36 Months', addons: [], baseFee: 24999.99, usage: 0, total: 24999.99, currency: 'USD' },
      },
    ],
    users: [
      { id: 'gns-u1', name: 'Jennifer Wu', email: 'jwu@securenet.com', role: 'Admin', department: 'Operations', status: 'active', lastLogin: '2026-04-05' },
      { id: 'gns-u2', name: 'Marcus Reed', email: 'm.reed@securenet.com', role: 'Admin', department: 'Network Ops', status: 'active', lastLogin: '2026-04-04' },
    ] as User[],
    groups: [],
  },
};
