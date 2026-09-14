export interface TenantBrandingConfig {
  productName: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  logo?: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'trial' | 'suspended' | 'archived';
  plan: 'starter' | 'professional' | 'enterprise';
  adminName: string;
  adminEmail: string;
  userCount: number;
  connectionCount: number;
  createdAt: string;
  lastActivity: string;
  branding?: TenantBrandingConfig;
}

export const mockTenants: Tenant[] = [
  {
    id: 'TNT-001',
    name: 'AT&T Default',
    subdomain: 'att-main',
    status: 'active',
    plan: 'enterprise',
    adminName: 'Emilio Estevez',
    adminEmail: 'emilio.estevez@att.com',
    userCount: 24,
    connectionCount: 48,
    createdAt: '2023-01-15',
    lastActivity: '2025-11-12',
    branding: { productName: 'AI-grade network', primaryColor: '#0057B8', accentColor: '#009FDB', fontFamily: 'Inter' },
  },
  {
    id: 'TNT-002',
    name: 'Acme Corp',
    subdomain: 'acmecorp',
    status: 'active',
    plan: 'professional',
    adminName: 'Michael Thompson',
    adminEmail: 'm.thompson@acmecorp.com',
    userCount: 5,
    connectionCount: 3,
    createdAt: '2025-06-15',
    lastActivity: '2026-04-04',
    branding: { productName: 'AcmeCloud Connect', primaryColor: '#0F766E', accentColor: '#14B8A6', fontFamily: 'Inter' },
  },
  {
    id: 'TNT-003',
    name: 'AcmeCloud Networks',
    subdomain: 'acmecloud',
    status: 'trial',
    plan: 'starter',
    adminName: 'Michael Thompson',
    adminEmail: 'm.thompson@acmecloud.io',
    userCount: 5,
    connectionCount: 8,
    createdAt: '2025-10-28',
    lastActivity: '2025-11-10',
    branding: { productName: 'AcmeCloud Connect', primaryColor: '#0F766E', accentColor: '#14B8A6', fontFamily: 'Inter' },
  },
  {
    id: 'TNT-004',
    name: 'SecureNet Inc',
    subdomain: 'securenet',
    status: 'active',
    plan: 'enterprise',
    adminName: 'Jennifer Wu',
    adminEmail: 'jwu@securenet.com',
    userCount: 35,
    connectionCount: 67,
    createdAt: '2023-06-10',
    lastActivity: '2025-11-12',
    branding: { productName: 'GNS Cloud Bridge', primaryColor: '#1E3A8A', accentColor: '#F59E0B', fontFamily: 'Inter' },
  },
  {
    id: 'TNT-005',
    name: 'DataFlow Systems',
    subdomain: 'dataflow',
    status: 'suspended',
    plan: 'professional',
    adminName: 'Robert Martinez',
    adminEmail: 'r.martinez@dataflow.net',
    userCount: 8,
    connectionCount: 15,
    createdAt: '2024-02-18',
    lastActivity: '2025-09-14',
  },
  {
    id: 'TNT-006',
    name: 'CloudConnect Pro',
    subdomain: 'cloudconnect',
    status: 'active',
    plan: 'professional',
    adminName: 'Lisa Anderson',
    adminEmail: 'l.anderson@cloudconnect.io',
    userCount: 16,
    connectionCount: 31,
    createdAt: '2023-11-05',
    lastActivity: '2025-11-11',
  },
];
