/**
 * Mock reseller data for the reseller portal demo.
 * A reseller is a partner that sells AT&T NetBond under their own brand
 * to their own customers (tenants).
 */

export interface ResellerCustomer {
  id: string;
  name: string;
  status: 'active' | 'trial' | 'suspended';
  connectionCount: number;
  userCount: number;
  monthlySpend: number;
  since: string;
}

export interface Reseller {
  id: string;
  name: string;
  logo?: string;
  brandColors: {
    primary: string;
    accent: string;
  };
  contactEmail: string;
  tier: 'silver' | 'gold' | 'platinum';
  commission: number; // percentage
  mrr: number;
  totalConnections: number;
  customers: ResellerCustomer[];
}

export const mockResellers: Reseller[] = [
  {
    id: 'reseller-gns',
    name: 'Global Network Services',
    brandColors: { primary: '#1E3A8A', accent: '#F59E0B' },
    contactEmail: 'partners@gns-networks.com',
    tier: 'platinum',
    commission: 18,
    mrr: 187500,
    totalConnections: 42,
    customers: [
      {
        id: 'gns-cust-1',
        name: 'Meridian Healthcare',
        status: 'active',
        connectionCount: 12,
        userCount: 8,
        monthlySpend: 48000,
        since: '2025-03-15',
      },
      {
        id: 'gns-cust-2',
        name: 'Apex Financial Group',
        status: 'active',
        connectionCount: 18,
        userCount: 15,
        monthlySpend: 92000,
        since: '2024-11-01',
      },
      {
        id: 'gns-cust-3',
        name: 'Coastal Logistics',
        status: 'trial',
        connectionCount: 4,
        userCount: 3,
        monthlySpend: 12500,
        since: '2026-02-20',
      },
      {
        id: 'gns-cust-4',
        name: 'Summit Education',
        status: 'active',
        connectionCount: 8,
        userCount: 6,
        monthlySpend: 35000,
        since: '2025-08-10',
      },
    ],
  },
];

export function getReseller(id: string): Reseller | undefined {
  return mockResellers.find(r => r.id === id);
}
