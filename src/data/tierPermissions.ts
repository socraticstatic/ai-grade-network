// src/data/tierPermissions.ts
// Defines which permissions "live" at which scope tier.
//
// Cascade rule: a role with maxScopeTier X can hold permissions from
// X and all NARROWER tiers, but not from broader tiers.
//
//   platform  → platform + reseller + tenant + client
//   reseller  → reseller + tenant + client
//   tenant    → tenant + client
//   client    → client only
//
// Pool / connection / hub are resource sub-tiers covered by the
// client group — they are the operational leaf permissions.

import { Permission, ScopeTier } from '../types/rbac';

export interface TierPermissionGroup {
  tier: ScopeTier;
  label: string;
  description: string;
  permissions: Permission[];
}

// Ordered broadest → narrowest.
export const TIER_PERMISSION_GROUPS: TierPermissionGroup[] = [
  {
    tier: 'platform',
    label: 'Platform',
    description: 'AT&T-internal: instances, design libraries, reseller management, system administration',
    permissions: [
      // Design library management
      'design-library:read', 'design-library:write', 'design-library:delete', 'design-library:clone',
      // Instance management
      'instance:read', 'instance:add', 'instance:configure',
      // Reseller account management (creating/offboarding partners is AT&T's job)
      'reseller:read', 'reseller:write', 'reseller:delete', 'reseller:suspend',
      'partner:read', 'partner:write', 'partner:delete',
      // System
      'system:configure', 'system:administer',
    ],
  },
  {
    tier: 'reseller',
    label: 'Reseller',
    description: 'Channel partner operations: tenant provisioning, design library imports, partner visibility',
    permissions: [
      'design-library:import',
      'tenant:provision', 'tenant:suspend', 'tenant:administer',
    ],
  },
  {
    tier: 'tenant',
    label: 'Tenant',
    description: 'Tenant-wide administration: clients, users, billing, policies, audit, APIs, reports',
    permissions: [
      'client:read', 'client:write', 'client:delete',
      'tenant:read', 'tenant:write',
      'billing:read', 'billing:finance', 'billing:export',
      'user:read', 'user:write', 'user:delete', 'user:operate',
      'role:read', 'role:write', 'role:delete',
      'role-assignment:read', 'role-assignment:assign', 'role-assignment:revoke',
      'policy:read', 'policy:write', 'policy:delete', 'policy:assign',
      'audit:read',
      'api:read', 'api:write', 'api:delete', 'api:configure',
      'report:read', 'report:write', 'report:delete', 'report:export',
      'alert-rule:read', 'alert-rule:write', 'alert-rule:delete',
      'system:read',
    ],
  },
  {
    tier: 'client',
    label: 'Client',
    description: 'Network resource management: connections, routing, pools, VNFs, monitoring',
    permissions: [
      'connection:read', 'connection:write', 'connection:delete',
      'connection:operate', 'connection:bandwidth', 'connection:configure', 'connection:export',
      'link:read', 'link:write', 'link:delete', 'link:configure',
      'subnet:read', 'subnet:write', 'subnet:delete',
      'hub:read', 'hub:write', 'hub:delete', 'hub:configure',
      'vnf:read', 'vnf:write', 'vnf:delete', 'vnf:operate',
      'pool:read', 'pool:write', 'pool:delete', 'pool:assign',
      'monitoring:read', 'monitoring:operate',
    ],
  },
];

export const TIER_RANK: Record<ScopeTier, number> = {
  platform: 0, reseller: 1, tenant: 2, client: 3, pool: 4, connection: 5, 'hub': 5,
};

/**
 * Returns the tier permission groups accessible to a role with the given maxScopeTier.
 * e.g. maxScopeTier='tenant' → [tenant-group, client-group]
 *
 * Pool, connection, and hub are operational sub-tiers of 'client' — their
 * permissions are entirely covered by the client group. We map them up so a pool-scoped
 * group ceiling still shows the "Business Unit" permission group rather than returning empty.
 */
export function accessibleGroups(maxScopeTier: ScopeTier): TierPermissionGroup[] {
  const effectiveTier: ScopeTier =
    maxScopeTier === 'pool' || maxScopeTier === 'connection' || maxScopeTier === 'hub'
      ? 'client'
      : maxScopeTier;
  const maxRank = TIER_RANK[effectiveTier];
  return TIER_PERMISSION_GROUPS.filter(g => TIER_RANK[g.tier] >= maxRank);
}

/**
 * Bucket a flat permission list by tier group.
 * Returns only groups with at least one granted permission.
 */
export function bucketPermissions(
  permissions: Permission[],
  maxScopeTier: ScopeTier,
): Array<{ group: TierPermissionGroup; granted: Permission[] }> {
  const permSet = new Set(permissions);
  return accessibleGroups(maxScopeTier)
    .map(group => ({
      group,
      granted: group.permissions.filter(p => permSet.has(p)),
    }))
    .filter(b => b.granted.length > 0);
}

/**
 * Short human-readable summary: "5 tenant, 20 business unit"
 */
export function permissionTierSummary(
  permissions: Permission[],
  maxScopeTier: ScopeTier,
): string {
  const buckets = bucketPermissions(permissions, maxScopeTier);
  if (buckets.length === 0) return `${permissions.length} permissions`;
  return buckets.map(b => `${b.granted.length} ${b.group.label.toLowerCase()}`).join(', ');
}
