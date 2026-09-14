// @deprecated — this file predates the Action+Object+Scope RBAC system. New code uses src/types/rbac.ts. Migrate consumers before deleting.
import { ScopePath, ResourceFilter } from './scope';

export type Role = 'user' | 'admin' | 'super-admin';

export type Permission =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'manage_users'
  | 'manage_billing'
  | 'manage_system'
  | 'manage_tenants'
  | 'impersonate'
  | 'view_audit'
  | 'manage_security';

export type ResourceType =
  | 'connection'
  | 'pool'
  | 'user'
  | 'billing'
  | 'system'
  | 'tenant'
  | 'security';

export interface PermissionRequirement {
  permission: Permission;
  role?: Role;
  resource?: ResourceType;
  requiresMFA?: boolean;
  requiresApproval?: boolean;
  // Optional: require permission to be checked at a specific scope level
  atScope?: ScopePath;
  // Optional: apply additional resource filtering
  resourceFilter?: ResourceFilter;
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requirement?: PermissionRequirement;
  needsMFA?: boolean;
  needsApproval?: boolean;
  canRequest?: boolean;
  // The scope path where the permission was granted
  grantedAtScope?: ScopePath;
  // The resource filter applied
  appliedFilter?: ResourceFilter;
  limitedBy?: 'role' | 'scope' | 'filter' | 'membership';
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'user': ['view'],
  'admin': ['view', 'create', 'edit', 'delete', 'manage_users', 'manage_billing', 'view_audit'],
  'super-admin': ['view', 'create', 'edit', 'delete', 'manage_users', 'manage_billing', 'manage_system', 'manage_tenants', 'impersonate', 'view_audit', 'manage_security']
};

// Default resource filter for each role
export const ROLE_DEFAULT_FILTER: Record<Role, ResourceFilter> = {
  'user': 'owned-by-me',
  'admin': 'my-tenant',
  'super-admin': 'all-tenants'
};

// Maximum resource filter each role can use
export const ROLE_MAX_FILTER: Record<Role, ResourceFilter> = {
  'user': 'my-department',
  'admin': 'my-tenant',
  'super-admin': 'all-tenants'
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'view': 'View',
  'create': 'Create',
  'edit': 'Edit',
  'delete': 'Delete',
  'manage_users': 'Manage Users',
  'manage_billing': 'Manage Billing',
  'manage_system': 'Manage System',
  'manage_tenants': 'Manage Tenants',
  'impersonate': 'Impersonate Users',
  'view_audit': 'View Audit Logs',
  'manage_security': 'Manage Security'
};

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  'connection': 'Connections',
  'pool': 'Pools',
  'user': 'Users',
  'billing': 'Billing',
  'system': 'System Settings',
  'tenant': 'Tenants',
  'security': 'Security Settings'
};

// Resource filter hierarchy (higher index = broader access)
export const RESOURCE_FILTER_HIERARCHY: ResourceFilter[] = [
  'owned-by-me',
  'my-department',
  'my-pools',
  'my-tenant',
  'all-tenants'
];
