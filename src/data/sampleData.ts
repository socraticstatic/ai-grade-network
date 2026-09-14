// Sample data for testing UI components
import { Connection, User } from '../types';
import { Group, GroupAddress, GroupContact } from '../types/group';

// Define reusable data fragments to avoid repetition
const defaultSecurity = {
  encryption: 'AES-256',
  firewall: true,
  ddosProtection: true,
  ipSecEnabled: true
};

const defaultFeatures = {
  dedicatedConnection: true,
  redundantPath: false,
  autoScaling: false,
  loadBalancing: false
};

// Performance data factory to create consistent performance metrics
const createPerformanceData = (
  latency: string,
  packetLoss: string,
  uptime: string,
  bandwidthUtil: number
) => ({
  latency,
  packetLoss,
  uptime: uptime,
  tunnels: bandwidthUtil > 0 ? 'Active' : 'Inactive',
  bandwidthUtilization: bandwidthUtil,
  currentUsage: `${bandwidthUtil / 10} Gbps`,
  utilizationTrend: Array(7).fill(0).map((_, i) => Math.max(0, Math.min(100, bandwidthUtil + (Math.random() * 4 - 2))))
});

// Billing data factory to create billing info with less duplication
const createBillingData = (
  baseFee: number,
  usage: number,
  lastBill?: string,
  nextBill?: string,
  additionalServices: {name: string, cost: number}[] = []
) => ({
  baseFee,
  usage,
  total: baseFee + usage + additionalServices.reduce((sum, service) => sum + service.cost, 0),
  currency: 'USD',
  lastBill: lastBill || '2024-02-01T00:00:00Z',
  nextBill: nextBill || '2024-04-01T00:00:00Z',
  additionalServices
});

// Sample connections with optimized structure
export const sampleConnections: Connection[] = [
  // ── Showcase Connection Hub (hub-showcase): one Hub holding connections of
  // DIFFERENT types — 3 VPN to Cloud + 2 Cloud to Cloud, mixed providers. This is
  // the heterogeneous Hub that the per-type grouped tables render.
  {
    id: 'conn-sc-vpn-aws',
    name: 'HQ VPN → AWS us-east-1',
    type: 'VPN to Cloud',
    status: 'Active',
    bandwidth: '1 Gbps',
    location: 'Ashburn, VA',
    provider: 'AWS',
    locations: ['Ashburn, VA'],
    hubIds: ['hub-showcase'],
    pool: 'group-1',
    poolName: 'Cloud Infrastructure',
    linkCount: 1,
    createdAt: '2026-05-02T10:00:00Z',
    configuration: { tunnelProtocol: 'ipsec', serviceAccessType: 'internet', peerIp: '203.0.113.10' },
    performance: { latency: '12ms', packetLoss: '0.02%', uptime: '99.9%', throughput: '62%', tunnels: '2/2 Active', bandwidthUtilization: 62, currentUsage: '0.62 Gbps', utilizationTrend: [55, 58, 60, 61, 62, 60, 62] },
    features: defaultFeatures,
    security: { encryption: 'AES-256', firewall: true, ddosProtection: false, ipSecEnabled: true },
    billing: createBillingData(1200, 0),
  },
  {
    id: 'conn-sc-vpn-azure',
    name: 'HQ VPN → Azure East US',
    type: 'VPN to Cloud',
    status: 'Active',
    bandwidth: '500 Mbps',
    location: 'Ashburn, VA',
    provider: 'Azure',
    locations: ['Ashburn, VA'],
    hubIds: ['hub-showcase'],
    linkCount: 1,
    createdAt: '2026-05-02T10:05:00Z',
    configuration: { tunnelProtocol: 'ikev2', serviceAccessType: 'internet', peerIp: '203.0.113.11' },
    performance: { latency: '15ms', packetLoss: '0.03%', uptime: '99.8%', throughput: '44%', tunnels: '1/1 Active', bandwidthUtilization: 44, currentUsage: '0.22 Gbps', utilizationTrend: [40, 42, 41, 44, 45, 43, 44] },
    features: defaultFeatures,
    security: { encryption: 'AES-256', firewall: true, ddosProtection: false, ipSecEnabled: true },
    billing: createBillingData(900, 0),
  },
  {
    id: 'conn-sc-vpn-gcp',
    name: 'Branch VPN → Google us-central1',
    type: 'VPN to Cloud',
    status: 'Provisioning',
    bandwidth: '1 Gbps',
    location: 'Ashburn, VA',
    provider: 'Google',
    locations: ['Ashburn, VA'],
    hubIds: ['hub-showcase'],
    linkCount: 0,
    createdAt: '2026-05-09T09:00:00Z',
    configuration: { tunnelProtocol: 'ipsec', serviceAccessType: 'internet', peerIp: '203.0.113.12' },
    performance: { latency: 'N/A', packetLoss: 'N/A', uptime: 'N/A', throughput: 'N/A', tunnels: '0/2 Active', bandwidthUtilization: 0, currentUsage: '0 Gbps', utilizationTrend: [0, 0, 0, 0, 0, 0, 0] },
    features: defaultFeatures,
    security: { encryption: 'AES-256', firewall: true, ddosProtection: false, ipSecEnabled: true },
    billing: createBillingData(1100, 0),
  },
  {
    id: 'conn-sc-c2c-aws-azure',
    name: 'AWS ⇄ Azure Backbone',
    type: 'Cloud to Cloud',
    status: 'Active',
    bandwidth: '10 Gbps',
    location: 'Ashburn, VA',
    pool: 'group-1',
    poolName: 'Cloud Infrastructure',
    providers: ['AWS', 'Azure'],
    locations: ['Ashburn, VA', 'Phoenix, AZ'],
    legs: [
      { provider: 'AWS', location: 'Ashburn, VA', bandwidth: '10 Gbps', status: 'Active' },
      { provider: 'Azure', location: 'Phoenix, AZ', bandwidth: '10 Gbps', status: 'Active' },
    ],
    hubIds: ['hub-showcase'],
    linkCount: 2,
    createdAt: '2026-04-20T10:00:00Z',
    configuration: { peeringType: 'private', encryptionMode: 'ipsec', routeExchange: 'full' },
    performance: { latency: '8ms', packetLoss: '0.01%', uptime: '99.95%', throughput: '71%', tunnels: '2/2 Active', bandwidthUtilization: 71, currentUsage: '7.1 Gbps', utilizationTrend: [65, 68, 70, 71, 72, 70, 71] },
    features: defaultFeatures,
    security: defaultSecurity,
    billing: createBillingData(5200, 0),
  },
  {
    id: 'conn-sc-c2c-aws-gcp',
    name: 'AWS ⇄ Google Backbone',
    type: 'Cloud to Cloud',
    status: 'Active',
    bandwidth: '5 Gbps',
    location: 'Ashburn, VA',
    providers: ['AWS', 'Google'],
    locations: ['Ashburn, VA', 'Council Bluffs, IA'],
    legs: [
      { provider: 'AWS', location: 'Ashburn, VA', bandwidth: '5 Gbps', status: 'Active' },
      { provider: 'Google', location: 'Council Bluffs, IA', bandwidth: '5 Gbps', status: 'Active' },
    ],
    hubIds: ['hub-showcase'],
    linkCount: 2,
    createdAt: '2026-04-22T10:00:00Z',
    configuration: { peeringType: 'exchange', encryptionMode: 'none', routeExchange: 'partial' },
    performance: { latency: '9ms', packetLoss: '0.02%', uptime: '99.9%', throughput: '58%', tunnels: '2/2 Active', bandwidthUtilization: 58, currentUsage: '2.9 Gbps', utilizationTrend: [52, 55, 57, 58, 59, 57, 58] },
    features: defaultFeatures,
    security: defaultSecurity,
    billing: createBillingData(3400, 0),
  },
  {
    id: 'conn-lmcc-1',
    name: 'AWS Max - San Jose Metro',
    type: 'AWS Last Mile',
    status: 'Active',
    bandwidth: '1 Gbps',
    location: 'San Jose, CA',
    provider: 'AWS',
    locations: ['San Jose, CA'],
    hubIds: ['router-west'],
    linkCount: 4,
    primaryIPE: 'MX304-SV1-A',
    secondaryIPE: 'MX304-SV5-A',
    ipeRedundancy: true,
    createdAt: '2026-07-01T14:00:00Z',
    configuration: {
      isLmcc: true,
      lmccContractTerm: 'fixed-12',
      lmccMetro: 'San Jose, CA',
      lmccDatacenters: ['Site A', 'Site B'],
      lmccPaths: 4,
      lmccActivePaths: 4,
      lmccContractType: 'monthly',
      lmccTransport: 'mpls',
      resiliencyLevel: 'maximum',
    },
    performance: {
      latency: '<2ms',
      packetLoss: '<0.01%',
      uptime: '99.99%',
      throughput: '85%',
      tunnels: '4/4 Active',
      bandwidthUtilization: 85,
      currentUsage: '0.85 Gbps',
      utilizationTrend: [72, 78, 80, 82, 85, 83, 85]
    },
    features: defaultFeatures,
    security: defaultSecurity,
    billing: createBillingData(4996, 0),
  },
  {
    id: 'conn-lmcc-pending',
    name: 'AWS Max - Ashburn (Awaiting Setup)',
    type: 'AWS Last Mile',
    status: 'Pending',
    bandwidth: '1 Gbps',
    location: 'Ashburn, VA',
    provider: 'AWS',
    locations: ['Ashburn, VA'],
    hubIds: ['router-east'],
    linkCount: 0,
    primaryIPE: 'Not provisioned',
    ipeRedundancy: false,
    createdAt: '2026-07-15T10:00:00Z',
    configuration: {
      isLmcc: true,
      lmccPending: true,
      // Key minted "two days ago" relative to load, so the 7-day countdown reads honestly.
      lmccKeyCreatedAt: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(),
      lmccMetro: 'Ashburn, VA',
      lmccDatacenters: ['Site A', 'Site B'],
      lmccPaths: 4,
      lmccActivePaths: 0,
      lmccContractType: 'monthly',
      lmccTransport: 'mpls',
      resiliencyLevel: 'maximum',
    },
    origin: {
      source: 'aws-marketplace',
      requestId: 'AWS-REQ-LMCC-002',
      externalAccountId: '987654321098',
      initiatedAt: '2026-07-15T10:00:00Z',
      metadata: {
        region: 'us-east-1',
        metro: 'Ashburn, VA',
        resiliency: 'maximum',
      }
    },
    performance: {
      latency: 'N/A',
      packetLoss: 'N/A',
      uptime: 'N/A',
      throughput: 'N/A',
      tunnels: 'Not configured',
      bandwidthUtilization: 0,
      currentUsage: '0 Gbps',
      utilizationTrend: [0, 0, 0, 0, 0, 0, 0]
    },
    features: defaultFeatures,
    security: defaultSecurity,
    billing: createBillingData(0, 0),
  },
  {
    id: 'conn-aws-pending-1',
    name: 'AWS Interconnect - Last Mile',
    type: 'Internet to Cloud',
    status: 'Pending',
    bandwidth: '1 Gbps',
    location: 'Ashburn, VA',
    provider: 'AWS',
    locations: ['Ashburn, VA'],
    hubIds: ['router-east'],
    linkCount: 0,
    primaryIPE: 'Not configured',
    ipeRedundancy: false,
    createdAt: new Date().toISOString(),
    origin: {
      source: 'aws-marketplace',
      requestId: 'AWS-REQ-789012',
      externalAccountId: '123456789012',
      initiatedAt: new Date().toISOString(),
      metadata: {
        region: 'us-east-1',
        awsConnectionId: 'dxcon-fgh5678',
        vlan: 1234
      }
    },
    performance: {
      latency: 'N/A',
      packetLoss: 'N/A',
      uptime: 'N/A',
      throughput: 'N/A',
      tunnels: 'Not configured',
      bandwidthUtilization: 0,
      currentUsage: '0 Gbps',
      utilizationTrend: [0, 0, 0, 0, 0, 0, 0]
    },
    features: defaultFeatures,
    security: defaultSecurity,
    billing: {
      baseFee: 1000,
      usage: 0,
      total: 1000,
      currency: 'USD',
      lastBill: undefined,
      nextBill: undefined
    },
  },
  {
    id: 'conn-1',
    name: 'Corporate Cloud Hub',
    type: 'Internet to Cloud',
    status: 'Active',
    bandwidth: '10 Gbps',
    location: 'Ashburn, VA',
    provider: 'AWS',
    locations: ['Ashburn, VA'],
    hubIds: ['router-east'],
    linkCount: 4,
    primaryIPE: 'NYC-2',
    secondaryIPE: 'Atlanta-1',
    ipeRedundancy: true,
    createdAt: '2024-01-15T00:00:00Z',
    alerts: [
      {
        id: 'alert-1',
        severity: 'critical',
        category: 'throughput',
        title: 'Bandwidth Utilization Critical',
        message: 'Connection bandwidth utilization has exceeded 90%. Current usage: 85%. Consider upgrading bandwidth or implementing traffic shaping policies.',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        acknowledged: false,
        affectedComponents: ['cr-1', 'link-1'],
        recommendedAction: 'Upgrade to 20 Gbps bandwidth or enable QoS policies to prioritize critical traffic.',
      },
      {
        id: 'alert-2',
        severity: 'warning',
        category: 'configuration',
        title: 'BGP Session Flapping',
        message: 'BGP session on Primary Hub has experienced 3 flaps in the last hour. This may indicate network instability.',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
        acknowledged: false,
        affectedComponents: ['cr-1'],
        recommendedAction: 'Review BGP configuration and check for network path issues. Consider increasing BGP timers.',
      },
      {
        id: 'alert-3',
        severity: 'info',
        category: 'maintenance',
        title: 'Scheduled Maintenance Window',
        message: 'A maintenance window is scheduled for March 25, 2024 from 2:00 AM to 4:00 AM EST. Services may experience brief interruptions.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        acknowledged: false,
        recommendedAction: 'Plan accordingly and notify affected teams of the maintenance window.',
      }
    ],
    health: {
      overall: 'degraded',
      throughputStatus: 'critical',
      configurationStatus: 'warning',
      lastChecked: new Date().toISOString(),
    },
    performance: createPerformanceData('4.2ms', '0.01%', '99.99%', 85),
    features: { ...defaultFeatures, redundantPath: true, loadBalancing: true },
    security: defaultSecurity,
    billing: createBillingData(999.99, 299.99, undefined, undefined, [
      { name: 'DDoS Protection', cost: 199.99 },
      { name: 'Advanced Monitoring', cost: 100.0 }
    ]),
  },
  {
    id: 'conn-2',
    name: 'Multi-Cloud Production',
    type: 'Cloud to Cloud',
    status: 'Active',
    bandwidth: '10 Gbps',
    location: 'Dallas, TX',
    provider: 'Azure',
    providers: ['Azure', 'AWS'],
    locations: ['Dallas, TX', 'San Jose, CA'],
    legs: [
      { provider: 'Azure', location: 'Dallas, TX', bandwidth: '10 Gbps', status: 'Active' },
      { provider: 'AWS', location: 'San Jose, CA', bandwidth: '5 Gbps', status: 'Active' },
    ],
    hubIds: ['router-hub'],
    linkCount: 6,
    primaryIPE: 'Dallas-1',
    secondaryIPE: 'SFO-1',
    ipeRedundancy: true,
    createdAt: '2024-02-01T00:00:00Z',
    alerts: [
      {
        id: 'alert-4',
        severity: 'warning',
        category: 'performance',
        title: 'Increased Latency Detected',
        message: 'Average latency has increased from 4.2ms to 5.8ms over the past 4 hours. This may impact real-time applications.',
        timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 minutes ago
        acknowledged: false,
        affectedComponents: ['link-3', 'link-4'],
        recommendedAction: 'Check for network congestion and consider rerouting traffic through alternate paths.',
      },
      {
        id: 'alert-5',
        severity: 'info',
        category: 'security',
        title: 'SSL Certificate Renewal Required',
        message: 'SSL certificate for the management interface expires in 30 days. Please renew to maintain secure access.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
        acknowledged: true,
        recommendedAction: 'Initiate certificate renewal process through the Certificate Manager.',
      }
    ],
    health: {
      overall: 'healthy',
      throughputStatus: 'optimal',
      configurationStatus: 'valid',
      lastChecked: new Date().toISOString(),
    },
    performance: createPerformanceData('4.8ms', '0.02%', '99.95%', 75),
    features: { ...defaultFeatures, autoScaling: true, loadBalancing: true },
    security: defaultSecurity,
    billing: createBillingData(999.99, 199.99, undefined, undefined, [
      { name: 'Advanced Monitoring', cost: 100.0 }
    ]),
  },
  {
    // Reference Cloud to Cloud example: one Hub hub privately links an AWS leg
    // and a Google leg. Healthy and fully wired (per-leg bandwidth/status, hub with
    // provider-tagged links) so it demonstrates how a C2C looks and behaves.
    id: 'conn-c2c-demo',
    name: 'Cloud-to-Cloud Demo (AWS · Google)',
    type: 'Cloud to Cloud',
    status: 'Active',
    bandwidth: '10 Gbps',
    location: 'Ashburn, VA',
    provider: 'AWS',
    providers: ['AWS', 'Google'],
    locations: ['Ashburn, VA', 'Council Bluffs, IA'],
    legs: [
      { provider: 'AWS', location: 'Ashburn, VA', bandwidth: '10 Gbps', status: 'Active' },
      { provider: 'Google', location: 'Council Bluffs, IA', bandwidth: '10 Gbps', status: 'Active' },
    ],
    hubIds: ['gw-c2c-demo'],
    linkCount: 4,
    primaryIPE: 'Ashburn-1',
    secondaryIPE: 'CouncilBluffs-1',
    ipeRedundancy: true,
    createdAt: '2024-03-01T00:00:00Z',
    health: {
      overall: 'healthy',
      throughputStatus: 'optimal',
      configurationStatus: 'valid',
      lastChecked: new Date().toISOString(),
    },
    performance: createPerformanceData('3.2ms', '0.01%', '99.99%', 52),
    features: { ...defaultFeatures, autoScaling: true, loadBalancing: true },
    security: defaultSecurity,
    billing: createBillingData(999.99, 149.99, undefined, undefined, [
      { name: 'Inter-Cloud Peering', cost: 150.0 }
    ]),
  },
  {
    id: 'conn-3',
    name: 'Global Enterprise Network',
    type: 'DataCenter/CoLocation to Cloud',
    status: 'Active',
    bandwidth: '10 Gbps',
    location: 'New York, NY',
    providers: ['AWS', 'Azure', 'Google'],
    locations: ['New York, NY', 'Chicago, IL', 'Los Angeles, CA', 'London, UK'],
    datacenters: ['Equinix NY5', 'CoreSite CH1', 'Digital Realty LAX1'],
    hubIds: ['router-hub'],
    linkCount: 12,
    primaryIPE: 'Chicago-1',
    ipeRedundancy: false,
    createdAt: '2024-02-15T00:00:00Z',
    performance: createPerformanceData('5.1ms', '0.015%', '99.98%', 65),
    features: { ...defaultFeatures, autoScaling: true },
    security: defaultSecurity,
    billing: createBillingData(999.99, 99.99, undefined, undefined, [
      { name: 'Basic Monitoring', cost: 50.0 }
    ]),
  },
  // ── Deleted state — AWS Max connections that have been torn down ──────────
  {
    id: 'conn-deleting-1',
    name: 'AWS Max - Chicago',
    type: 'Internet to Cloud',
    status: 'Deleted',
    bandwidth: '1 Gbps',
    location: 'Chicago, IL',
    provider: 'AWS',
    locations: ['Chicago, IL'],
    hubIds: [],
    linkCount: 0,
    primaryIPE: 'Not provisioned',
    ipeRedundancy: false,
    createdAt: '2026-05-01T10:00:00Z',
    configuration: {
      isLmcc: true,
      lmccMetro: 'Chicago, IL',
      lmccPaths: 4,
      lmccActivePaths: 0,
      lmccContractType: 'pay-as-you-go',
    },
    performance: {
      latency: 'N/A', packetLoss: 'N/A', uptime: 'N/A',
      throughput: 'N/A', tunnels: 'Terminating',
      bandwidthUtilization: 0, currentUsage: '0 Gbps',
      utilizationTrend: [0, 0, 0, 0, 0, 0, 0],
    },
    features: defaultFeatures,
    security: defaultSecurity,
    billing: createBillingData(0, 0),
  },
  {
    id: 'conn-deleting-2',
    name: 'AWS Max - Dallas',
    type: 'Internet to Cloud',
    status: 'Deleted',
    bandwidth: '1 Gbps',
    location: 'Dallas, TX',
    provider: 'AWS',
    locations: ['Dallas, TX'],
    hubIds: [],
    linkCount: 0,
    primaryIPE: 'Not provisioned',
    ipeRedundancy: false,
    createdAt: '2026-05-10T14:00:00Z',
    configuration: {
      isLmcc: true,
      lmccMetro: 'Dallas, TX',
      lmccPaths: 4,
      lmccActivePaths: 0,
      lmccContractType: 'pay-as-you-go',
    },
    performance: {
      latency: 'N/A', packetLoss: 'N/A', uptime: 'N/A',
      throughput: 'N/A', tunnels: 'Terminating',
      bandwidthUtilization: 0, currentUsage: '0 Gbps',
      utilizationTrend: [0, 0, 0, 0, 0, 0, 0],
    },
    features: defaultFeatures,
    security: defaultSecurity,
    billing: createBillingData(0, 0),
  },
];

// Factory function to create connection access objects consistently
const createConnectionAccess = (connectionId: string, name: string, permissions: string[]) => ({
  connectionId,
  name,
  permissions
});

// Sample users organized by connection
// AWS Interconnect – last mile users
const awsUsers: User[] = [
  {
    id: 'user-1',
    name: 'Sarah Patel',
    email: 'sarah.chen@example.com',
    role: 'Network Administrator',
    status: 'active',
    lastActive: new Date().toISOString(),
    tenantId: 'TNT-001',
    departmentId: 'dept-network',
    department: 'Network Engineering',
    scopePath: '/tenants/TNT-001/departments/dept-network',
    connectionAccess: [createConnectionAccess('conn-1', 'Internet to AWS Cloud', ['view', 'manage', 'monitor', 'configure'])],
  },
  {
    id: 'user-2',
    name: 'Michael Rodriguez',
    email: 'michael.r@example.com',
    role: 'Security Engineer',
    status: 'active',
    lastActive: new Date().toISOString(),
    tenantId: 'TNT-001',
    departmentId: 'dept-security',
    department: 'Security Operations',
    scopePath: '/tenants/TNT-001/departments/dept-security',
    connectionAccess: [createConnectionAccess('conn-1', 'Internet to AWS Cloud', ['view', 'monitor', 'configure'])],
  },
];

// Azure users
const azureUsers: User[] = [
  {
    id: 'user-3',
    name: 'David Kim',
    email: 'david.kim@example.com',
    role: 'Network Administrator',
    status: 'active',
    lastActive: new Date().toISOString(),
    tenantId: 'TNT-001',
    departmentId: 'dept-network',
    department: 'Network Engineering',
    scopePath: '/tenants/TNT-001/departments/dept-network',
    connectionAccess: [createConnectionAccess('conn-2', 'Internet to Azure Cloud', ['view', 'manage', 'monitor', 'configure'])],
  },
  {
    id: 'user-4',
    name: 'Lisa Martinez',
    email: 'lisa.m@example.com',
    role: 'Security Analyst',
    status: 'active',
    lastActive: new Date().toISOString(),
    tenantId: 'TNT-001',
    departmentId: 'dept-security',
    department: 'Security Operations',
    scopePath: '/tenants/TNT-001/departments/dept-security',
    connectionAccess: [createConnectionAccess('conn-2', 'Internet to Azure Cloud', ['view', 'monitor', 'configure'])],
  },
];

// Google Cloud users
const googleUsers: User[] = [
  {
    id: 'user-5',
    name: 'Thomas Anderson',
    email: 'thomas.a@example.com',
    role: 'Network Administrator',
    status: 'active',
    lastActive: new Date().toISOString(),
    tenantId: 'TNT-001',
    departmentId: 'dept-network',
    department: 'Network Engineering',
    scopePath: '/tenants/TNT-001/departments/dept-network',
    connectionAccess: [createConnectionAccess('conn-3', 'Internet to Google Cloud', ['view', 'manage', 'monitor', 'configure'])],
  },
  {
    id: 'user-6',
    name: 'Sophia Lee',
    email: 'sophia.l@example.com',
    role: 'Security Engineer',
    status: 'active',
    lastActive: new Date().toISOString(),
    tenantId: 'TNT-001',
    departmentId: 'dept-security',
    department: 'Security Operations',
    scopePath: '/tenants/TNT-001/departments/dept-security',
    connectionAccess: [createConnectionAccess('conn-3', 'Internet to Google Cloud', ['view', 'monitor', 'configure'])],
  },
];

// Combine all users with an efficient reference
export const sampleUsers: User[] = [...awsUsers, ...azureUsers, ...googleUsers];

// The logged-in platform user — not in the users table but needs an assignment
export const currentUser: User = {
  id: 'emilio-estevez',
  name: 'Emilio Estevez',
  email: 'emilio.estevez@att.com',
  role: 'Network Administrator',
  status: 'active',
  lastActive: new Date().toISOString(),
  department: 'Platform',
  tenantId: 'TNT-001',
  scopePath: '/tenants/TNT-001',
  connectionAccess: [],
};

// Reusable address and contact data
const sampleAddresses: GroupAddress[] = [
  {
    street: '208 S Akard St',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75202',
    country: 'United States',
    isPrimary: true
  },
  {
    street: '1 AT&T Way',
    city: 'Bedminster',
    state: 'NJ',
    zipCode: '07921',
    country: 'United States',
    isPrimary: false
  }
];

// Reusable contact information
const sampleContacts: GroupContact[] = [
  {
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '(214) 555-1234',
    role: 'IT Director',
    isPrimary: true
  },
  {
    name: 'Emily Johnson',
    email: 'emily.johnson@example.com',
    phone: '(214) 555-5678',
    role: 'Network Manager',
    isPrimary: false
  }
];

// Performance and billing data factories for groups
const createGroupPerformanceData = () => ({
  aggregatedMetrics: {
    averageLatency: '4.5ms',
    averagePacketLoss: '0.015%',
    averageUptime: '99.97%',
    totalBandwidth: '20 Gbps',
    bandwidthUtilization: 80,
    totalTraffic: '1.8 TB'
  },
  historicalData: [] // Would be filled with actual historical data
});

const createGroupBillingData = (rate: number) => ({
  billingId: `bill-${Date.now()}`,
  planName: rate > 2000 ? 'Enterprise Plus' : 'Enterprise Standard',
  monthlyRate: rate,
  annualDiscount: 10,
  currency: 'USD',
  billingCycle: 'monthly',
  paymentMethod: rate > 2000 ? 'credit_card' : 'invoice',
  lastInvoiceDate: '2024-03-01T00:00:00Z',
  nextInvoiceDate: '2024-04-01T00:00:00Z'
});

// Sample groups with optimized structure
export const sampleGroups: Group[] = [
  {
    id: 'group-1',
    name: 'Cloud Infrastructure',
    description: 'Core cloud infrastructure connections and resources',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-15T00:00:00Z',
    type: 'department',
    status: 'active',
    addresses: [sampleAddresses[0]],
    contacts: [sampleContacts[0]],
    connectionIds: ['conn-1', 'conn-2'],
    userIds: ['user-1', 'user-3'],
    ownerId: 'user-1',
    permissions: {
      read: ['user-1', 'user-2', 'user-3', 'user-4'],
      write: ['user-1', 'user-3'],
      admin: ['user-1']
    },
    billing: createGroupBillingData(2499.96),
    performance: createGroupPerformanceData()
  },
  {
    id: 'group-2',
    name: 'Network Operations',
    description: 'Core network infrastructure management team',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-03-10T00:00:00Z',
    type: 'team',
    status: 'active',
    addresses: [sampleAddresses[1]],
    contacts: [sampleContacts[1]],
    connectionIds: ['conn-3'],
    userIds: ['user-5', 'user-6'],
    ownerId: 'user-5',
    permissions: {
      read: ['user-5', 'user-6'],
      write: ['user-5'],
      admin: ['user-5']
    },
    billing: createGroupBillingData(1099.98),
    performance: {
      aggregatedMetrics: {
        averageLatency: '5.1ms',
        averagePacketLoss: '0.015%',
        averageUptime: '99.98%',
        totalBandwidth: '10 Gbps',
        bandwidthUtilization: 65,
        totalTraffic: '0.8 TB'
      },
      historicalData: [] // This would be filled with actual historical data
    }
  },
  {
    id: 'group-3',
    name: 'Research & Development',
    description: 'R&D projects and dev environments',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-03-05T00:00:00Z',
    type: 'project',
    status: 'active',
    parentGroupId: 'group-1',
    addresses: [],
    contacts: [],
    connectionIds: [],
    userIds: ['user-2', 'user-4', 'user-6'],
    ownerId: 'user-2',
    permissions: {
      read: ['user-1', 'user-2', 'user-4', 'user-6'],
      write: ['user-2', 'user-6'],
      admin: ['user-2']
    },
    tags: {
      'department': 'R&D',
      'environment': 'development',
      'costCenter': 'CC-RD-001'
    }
  }
];