// src/data/scopeCatalog.ts
// Known scope entities for the current demo context.
// In production these would come from the API.

export interface ScopeEntity {
  id: string;
  displayName: string;
  description?: string;
}

export interface ResellerEntity extends ScopeEntity {
  region: string;
}

export interface PoolEntity extends ScopeEntity {
  clientId: string;
}

export interface ResourceEntity extends ScopeEntity {
  clientId: string;
  poolId: string;
}

export const SCOPE_CATALOG: {
  reseller: ResellerEntity[];
  tenant: ScopeEntity[];
  client: ScopeEntity[];
  pool: PoolEntity[];
  connection: ResourceEntity[];
  hub: ResourceEntity[];
} = {
  // Reseller entities — used by platform admins and PartnerManager / ResellerAdmin roles.
  // Not shown in the tenant-level AssignRoleDrawer (tenant admins cannot grant reseller scope).
  reseller: [
    { id: 'RSL-001', displayName: 'AT&T Channel Partners - West', description: 'Western US channel partner', region: 'US-West' },
    { id: 'RSL-002', displayName: 'AT&T Channel Partners - East', description: 'Eastern US channel partner', region: 'US-East' },
  ],

  tenant: [
    { id: 'TNT-001', displayName: 'AT&T Default', description: 'Primary tenant' },
  ],

  client: [
    { id: 'CLT-A', displayName: 'Client A', description: 'Enterprise networking division' },
    { id: 'CLT-B', displayName: 'Client B', description: 'Cloud connectivity division' },
    { id: 'CLT-C', displayName: 'Client C', description: 'Government & compliance division' },
  ],

  pool: [
    { id: 'POOL-NE', displayName: 'US-East Network Pool', description: 'NYC / Ashburn edge nodes', clientId: 'CLT-A' },
    { id: 'POOL-MW', displayName: 'Midwest Network Pool', description: 'Chicago / Dallas edge nodes', clientId: 'CLT-B' },
    { id: 'POOL-WC', displayName: 'US-West Network Pool', description: 'Seattle / LA edge nodes', clientId: 'CLT-C' },
  ],

  // Connections aligned to sampleData IDs
  connection: [
    { id: 'conn-lmcc-1', displayName: 'AWS Max - San Jose Metro', clientId: 'CLT-A', poolId: 'POOL-NE' },
    { id: 'conn-1',      displayName: 'Corporate Cloud Hub',   clientId: 'CLT-A', poolId: 'POOL-NE' },
    { id: 'conn-lmcc-pending', displayName: 'AWS Max - Los Angeles (Pending)', clientId: 'CLT-B', poolId: 'POOL-MW' },
    { id: 'conn-2',      displayName: 'Multi-Cloud Production',    clientId: 'CLT-B', poolId: 'POOL-MW' },
    { id: 'conn-aws-pending-1', displayName: 'AWS Interconnect - Last Mile (Pending)', clientId: 'CLT-C', poolId: 'POOL-WC' },
    { id: 'conn-3',      displayName: 'Global Enterprise Network', clientId: 'CLT-C', poolId: 'POOL-WC' },
  ],

  // Hubs aligned to sampleData hubIds
  hub: [
    { id: 'router-lmcc-1', displayName: 'EdgeRouter SJC-01', clientId: 'CLT-A', poolId: 'POOL-NE' },
    { id: 'router-lmcc-2', displayName: 'EdgeRouter SJC-02', clientId: 'CLT-A', poolId: 'POOL-NE' },
    { id: 'router-lmcc-3', displayName: 'EdgeRouter SJC-03', clientId: 'CLT-A', poolId: 'POOL-NE' },
    { id: 'router-lmcc-4', displayName: 'EdgeRouter SJC-04', clientId: 'CLT-A', poolId: 'POOL-NE' },
    { id: 'router-1',      displayName: 'EdgeRouter IAD-01',  clientId: 'CLT-A', poolId: 'POOL-NE' },
    { id: 'router-2',      displayName: 'EdgeRouter IAD-02',  clientId: 'CLT-A', poolId: 'POOL-NE' },
    { id: 'router-3',      displayName: 'EdgeRouter DFW-01',  clientId: 'CLT-B', poolId: 'POOL-MW' },
    { id: 'router-4',      displayName: 'EdgeRouter JFK-01',  clientId: 'CLT-C', poolId: 'POOL-WC' },
  ],
};
