// src/data/roleCatalog.ts
// BC hands us these empty bucket names. We own the permission mapping.
// These are the AT&T / NetBond default permission sets for each BC role.
// They are seeded into Zustand on init and are mutable by PlatformAdmin.
import { RoleDefinition, RoleName, Permission, SodConstraint } from '../types/rbac';

export const ALL_PERMISSIONS: Permission[] = [
  // Connections
  'connection:read', 'connection:write', 'connection:delete',
  'connection:operate', 'connection:bandwidth', 'connection:configure', 'connection:export',
  // Links (VLANs)
  'link:read', 'link:write', 'link:delete', 'link:configure',
  // IP subnets
  'subnet:read', 'subnet:write', 'subnet:delete',
  // Hubs
  'hub:read', 'hub:write', 'hub:delete', 'hub:configure',
  // VNFs
  'vnf:read', 'vnf:write', 'vnf:delete', 'vnf:operate',
  // Pools
  'pool:read', 'pool:write', 'pool:delete', 'pool:assign',
  // Monitoring
  'monitoring:read', 'monitoring:operate',
  // Alert rules
  'alert-rule:read', 'alert-rule:write', 'alert-rule:delete',
  // Reports
  'report:read', 'report:write', 'report:delete', 'report:export',
  // Users
  'user:read', 'user:write', 'user:delete', 'user:operate',
  // Roles
  'role:read', 'role:write', 'role:delete',
  // Role assignments
  'role-assignment:read', 'role-assignment:assign', 'role-assignment:revoke',
  // Billing
  'billing:read', 'billing:finance', 'billing:export',
  // Policies
  'policy:read', 'policy:write', 'policy:delete', 'policy:assign',
  // Partners
  'partner:read', 'partner:write', 'partner:delete',
  // API
  'api:read', 'api:write', 'api:delete', 'api:configure',
  // Tenant
  'tenant:read', 'tenant:write', 'tenant:administer',
  // System
  'system:read', 'system:configure', 'system:administer',
  // Audit
  'audit:read',
  // Design libraries (platform-exclusive)
  'design-library:read', 'design-library:write', 'design-library:delete', 'design-library:clone',
  'design-library:import',
  // NetBond instances (platform-exclusive)
  'instance:read', 'instance:add', 'instance:configure',
  // Reseller management (platform-exclusive)
  'reseller:read', 'reseller:write', 'reseller:delete', 'reseller:suspend',
  // Tenant provisioning (reseller-exclusive)
  'tenant:provision', 'tenant:suspend',
  // Business unit management (tenant-exclusive)
  'client:read', 'client:write', 'client:delete',
];

// Indexed by RoleName for fast static lookup. Seeded into store on init.
export const ROLE_CATALOG: Record<RoleName, RoleDefinition> = {
  NetworkEngineer: {
    id: 'NetworkEngineer',
    displayName: 'Network Engineer',
    description: 'Manages connections, links, hubs, VNFs, and subnets. Full lifecycle access to network resources.',
    maxScopeTier: 'tenant',
    source: 'bc-template',
    permissions: [
      'connection:read', 'connection:write', 'connection:delete',
      'connection:operate', 'connection:bandwidth', 'connection:configure', 'connection:export',
      'link:read', 'link:write', 'link:delete', 'link:configure',
      'subnet:read', 'subnet:write', 'subnet:delete',
      'hub:read', 'hub:write', 'hub:delete', 'hub:configure',
      'vnf:read', 'vnf:write', 'vnf:delete', 'vnf:operate',
      'pool:read',
      'monitoring:read', 'monitoring:operate',
    ],
  },
  SupportSpecialist: {
    id: 'SupportSpecialist',
    displayName: 'Support Specialist',
    description: 'Read and operate access for troubleshooting. No write or delete on network resources.',
    maxScopeTier: 'tenant',
    source: 'bc-template',
    permissions: [
      'connection:read', 'connection:operate', 'connection:export',
      'link:read',
      'subnet:read',
      'hub:read',
      'vnf:read',
      'pool:read',
      'monitoring:read', 'monitoring:operate',
      'alert-rule:read',
      'audit:read',
    ],
  },
  BillingAdmin: {
    id: 'BillingAdmin',
    displayName: 'Billing Admin',
    description: 'Full billing access: view, process, and export financial data and reports.',
    maxScopeTier: 'tenant',
    source: 'bc-template',
    permissions: [
      'billing:read', 'billing:finance', 'billing:export',
      'report:read', 'report:export',
    ],
  },
  SecurityAdmin: {
    id: 'SecurityAdmin',
    displayName: 'Security Admin',
    description: 'Manages security policy, audits, and has read access to users and roles.',
    maxScopeTier: 'tenant',
    source: 'bc-template',
    permissions: [
      'policy:read', 'policy:write', 'policy:delete', 'policy:assign',
      'audit:read',
      'user:read',
      'role:read',
      'role-assignment:read',
      'system:read',
    ],
  },
  OperationsManager: {
    id: 'OperationsManager',
    displayName: 'Operations Manager',
    description: 'Operational oversight: connection operation, pool assignment, monitoring, reporting, and user reads.',
    maxScopeTier: 'tenant',
    source: 'bc-template',
    permissions: [
      'connection:read', 'connection:operate',
      'pool:read', 'pool:assign',
      'user:read',
      'monitoring:read', 'monitoring:operate',
      'report:read', 'report:write',
      'alert-rule:read', 'alert-rule:write',
    ],
  },
  PartnerManager: {
    id: 'PartnerManager',
    displayName: 'Partner Manager',
    description: 'Full partner lifecycle management. AT&T platform-level role — manages reseller/partner accounts.',
    maxScopeTier: 'platform',   // changed from 'reseller' — partner:write/delete are platform-tier
    source: 'bc-template',
    permissions: [
      'partner:read', 'partner:write', 'partner:delete',
      'reseller:read',
    ],
  },

  ResellerAdmin: {
    id: 'ResellerAdmin',
    displayName: 'Reseller Admin',
    description: 'Manages tenants under a reseller: provisioning, design library imports, tenant administration, and reseller-level billing.',
    maxScopeTier: 'reseller',
    source: 'bc-template',
    permissions: [
      // Reseller-tier
      'design-library:import',
      'tenant:provision', 'tenant:suspend', 'tenant:administer',
      // Tenant-tier (accessible via cascade)
      'client:read', 'client:write', 'client:delete',
      'tenant:read', 'tenant:write',
      'user:read', 'user:write',
      'role-assignment:read', 'role-assignment:assign', 'role-assignment:revoke',
      'billing:read', 'billing:export',
      'audit:read',
      // Business Unit (accessible via cascade)
      'connection:read', 'connection:export',
      'pool:read',
      'monitoring:read',
    ],
  },
  ApiManager: {
    id: 'ApiManager',
    displayName: 'API Manager',
    description: 'Full API lifecycle management plus connection read for context.',
    maxScopeTier: 'tenant',
    source: 'bc-template',
    permissions: [
      'api:read', 'api:write', 'api:delete', 'api:configure',
      'connection:read',
    ],
  },
  ProvisioningManager: {
    id: 'ProvisioningManager',
    displayName: 'Provisioning Manager',
    description: 'Provisions connections, links, subnets, and routers. Assigns pools. No delete on connections.',
    maxScopeTier: 'tenant',
    source: 'bc-template',
    permissions: [
      'connection:read', 'connection:write', 'connection:operate', 'connection:bandwidth', 'connection:configure',
      'link:read', 'link:write', 'link:configure',
      'subnet:read', 'subnet:write',
      'hub:read', 'hub:write', 'hub:configure',
      'vnf:read', 'vnf:write',
      'pool:read', 'pool:assign',
      'monitoring:read',
    ],
  },
  Viewer: {
    id: 'Viewer',
    displayName: 'Viewer',
    description: 'Read-only access to tenant and client objects within assigned scope. Cannot see AT&T-internal or reseller records.',
    maxScopeTier: 'tenant',
    source: 'bc-template',
    permissions: [
      // Business Unit (client) tier — network resources
      'connection:read', 'link:read', 'subnet:read',
      'hub:read', 'vnf:read', 'pool:read', 'monitoring:read',
      // Tenant tier — admin objects
      'client:read', 'tenant:read',
      'billing:read',
      'user:read',
      'role:read', 'role-assignment:read',
      'policy:read',
      'audit:read',
      'api:read',
      'report:read',
      'alert-rule:read',
      'system:read',
    ],
  },
  PlatformViewer: {
    id: 'PlatformViewer',
    displayName: 'Platform Viewer',
    description: 'Read-only access across all platform objects including AT&T-internal records (instances, design libraries, reseller accounts). AT&T operations use only.',
    maxScopeTier: 'platform',
    source: 'bc-template',
    permissions: ALL_PERMISSIONS.filter(p => p.endsWith(':read')),
  },
  ClientAdmin: {
    id: 'ClientAdmin',
    displayName: 'Client Admin',
    description: 'Full administrative control within a single client. Cannot manage other clients, modify tenant-wide settings, or run platform/reseller operations.',
    maxScopeTier: 'tenant',
    source: 'bc-template',
    permissions: ALL_PERMISSIONS.filter(p => ![
      // Platform-exclusive
      'design-library:read', 'design-library:write', 'design-library:delete', 'design-library:clone',
      'design-library:import',
      'instance:read', 'instance:add', 'instance:configure',
      'reseller:read', 'reseller:write', 'reseller:delete', 'reseller:suspend',
      'partner:write', 'partner:delete',
      'system:configure', 'system:administer',
      // Reseller-exclusive
      'tenant:provision', 'tenant:suspend', 'tenant:administer',
      'partner:read',
      // Tenant-admin-only (client admins can't manage other clients or tenant settings)
      'client:write', 'client:delete',
      'tenant:write',
      'billing:finance',
      'user:delete', 'user:operate',
      'role:write', 'role:delete',
      'role-assignment:assign', 'role-assignment:revoke',
      'policy:write', 'policy:delete', 'policy:assign',
      'api:write', 'api:delete', 'api:configure',
      'report:write', 'report:delete',
      'alert-rule:write', 'alert-rule:delete',
    ].includes(p)),
  },
  TenantAdmin: {
    id: 'TenantAdmin',
    displayName: 'Tenant Admin',
    description: 'Full control within a tenant: clients, users, billing, policies, API, reports, network resources. Cannot access platform or reseller operations.',
    maxScopeTier: 'tenant',
    source: 'bc-template',
    permissions: ALL_PERMISSIONS.filter(p => ![
      // Platform-exclusive (blocked)
      'design-library:read', 'design-library:write', 'design-library:delete', 'design-library:clone',
      'design-library:import',
      'instance:read', 'instance:add', 'instance:configure',
      'reseller:read', 'reseller:write', 'reseller:delete', 'reseller:suspend',
      'partner:write', 'partner:delete',
      'system:configure', 'system:administer',
      // Reseller-exclusive (blocked)
      'tenant:provision', 'tenant:suspend', 'tenant:administer',
      'partner:read',
    ].includes(p)),
  },
  PlatformAdmin: {
    id: 'PlatformAdmin',
    displayName: 'Platform Admin',
    description: 'Unrestricted platform-wide access. AT&T operations only.',
    maxScopeTier: 'platform',
    source: 'bc-template',
    permissions: ALL_PERMISSIONS,
  },
};

export const SOD_CONSTRAINTS: SodConstraint[] = [
  {
    id: 'sod-1',
    name: 'Provisioner / Ops Auditor',
    mutuallyExclusiveRoles: ['ProvisioningManager', 'OperationsManager'],
    scopeContext: 'same-scope',
    checkOn: ['role-assignment', 'group-role-assignment', 'membership-assignment'],
    flagExistingViolations: true,
  },
  {
    id: 'sod-2',
    name: 'Billing / Security Auditor',
    mutuallyExclusiveRoles: ['BillingAdmin', 'SecurityAdmin'],
    scopeContext: 'same-scope',
    checkOn: ['role-assignment', 'group-role-assignment', 'membership-assignment'],
    flagExistingViolations: true,
  },
  {
    id: 'sod-3',
    name: 'Tenant / Platform Admin',
    mutuallyExclusiveRoles: ['TenantAdmin', 'PlatformAdmin'],
    scopeContext: 'any-scope',
    checkOn: ['role-assignment', 'group-role-assignment'],
    flagExistingViolations: true,
  },
  {
    id: 'sod-4',
    name: 'Network Engineer / Provisioning Manager',
    mutuallyExclusiveRoles: ['NetworkEngineer', 'ProvisioningManager'],
    scopeContext: 'same-scope',
    checkOn: ['role-assignment', 'group-role-assignment', 'membership-assignment'],
    flagExistingViolations: true,
  },
  {
    id: 'sod-5',
    name: 'Network Engineer / Security Admin',
    mutuallyExclusiveRoles: ['NetworkEngineer', 'SecurityAdmin'],
    scopeContext: 'same-scope',
    checkOn: ['role-assignment', 'group-role-assignment', 'membership-assignment'],
    flagExistingViolations: true,
  },
  {
    id: 'sod-6',
    name: 'Billing Admin / Tenant Admin',
    mutuallyExclusiveRoles: ['BillingAdmin', 'TenantAdmin'],
    scopeContext: 'same-scope',
    checkOn: ['role-assignment', 'group-role-assignment'],
    flagExistingViolations: true,
  },
  {
    id: 'sod-7',
    name: 'Partner Manager / Reseller Admin',
    mutuallyExclusiveRoles: ['PartnerManager', 'ResellerAdmin'],
    scopeContext: 'any-scope',
    checkOn: ['role-assignment', 'group-role-assignment'],
    flagExistingViolations: true,
  },
];
