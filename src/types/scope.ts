/**
 * Scope Types - Resource Hierarchy Implementation
 *
 * Scope in RBAC represents WHERE in the resource hierarchy a role assignment applies.
 * This follows industry standards (Azure RBAC, AWS IAM, Kubernetes RBAC).
 */

// Scope path - hierarchical location in resource tree
// Examples:
// - "/platform" - entire platform
// - "/tenants/acme-corp" - specific tenant
// - "/tenants/acme-corp/departments/engineering" - specific department
// - "/tenants/acme-corp/departments/engineering/pools/production" - specific pool
export type ScopePath = string;

// Types of nodes in the scope hierarchy
export type ScopeNodeType = 'platform' | 'tenant' | 'department' | 'pool' | 'resource';

// A node in the resource hierarchy
export interface ScopeNode {
  id: string;
  type: ScopeNodeType;
  path: ScopePath;
  name: string;
  parentPath?: ScopePath;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

// Resource filter - determines WHICH resources a user can see at a given scope
// This is what we incorrectly called "scope" before
export type ResourceFilter =
  | 'owned-by-me'      // Only resources the user owns/created
  | 'my-department'    // Resources in user's department
  | 'my-pools'         // Resources in user's assigned pools
  | 'my-tenant'        // All resources in user's tenant
  | 'all-tenants';     // All resources across all tenants (platform admin)

// Resource filter configuration
export interface ResourceFilterConfig {
  filter: ResourceFilter;
  departmentIds?: string[];
  poolIds?: string[];
  tenantIds?: string[];
  ownerId?: string;
}

// Labels for UI display
export const SCOPE_NODE_TYPE_LABELS: Record<ScopeNodeType, string> = {
  'platform': 'Platform',
  'tenant': 'Tenant',
  'department': 'Department',
  'pool': 'Pool',
  'resource': 'Resource'
};

export const RESOURCE_FILTER_LABELS: Record<ResourceFilter, string> = {
  'owned-by-me': 'My Resources Only',
  'my-department': 'Department Resources',
  'my-pools': 'Pool Resources',
  'my-tenant': 'Tenant Resources',
  'all-tenants': 'All Platform Resources'
};

export const RESOURCE_FILTER_DESCRIPTIONS: Record<ResourceFilter, string> = {
  'owned-by-me': 'Can only access resources you own or created',
  'my-department': 'Can access resources within your department(s)',
  'my-pools': 'Can access resources in your assigned pool(s)',
  'my-tenant': 'Can access all resources in your tenant/organization',
  'all-tenants': 'Can access resources across all tenants (platform-wide)'
};

// Helper to build scope paths
export class ScopePathBuilder {
  static platform(): ScopePath {
    return '/platform';
  }

  static tenant(tenantId: string): ScopePath {
    return `/tenants/${tenantId}`;
  }

  static department(tenantId: string, departmentId: string): ScopePath {
    return `/tenants/${tenantId}/departments/${departmentId}`;
  }

  static pool(tenantId: string, departmentId: string, poolId: string): ScopePath {
    return `/tenants/${tenantId}/departments/${departmentId}/pools/${poolId}`;
  }

  static resource(
    tenantId: string,
    departmentId: string,
    resourceType: string,
    resourceId: string
  ): ScopePath {
    return `/tenants/${tenantId}/departments/${departmentId}/${resourceType}/${resourceId}`;
  }

  // Parse a scope path into components
  static parse(path: ScopePath): {
    type: ScopeNodeType;
    tenantId?: string;
    departmentId?: string;
    poolId?: string;
    resourceType?: string;
    resourceId?: string;
  } {
    const parts = path.split('/').filter(p => p);

    if (parts.length === 0 || parts[0] === 'platform') {
      return { type: 'platform' };
    }

    if (parts[0] === 'tenants' && parts.length >= 2) {
      const result: any = { type: 'tenant', tenantId: parts[1] };

      if (parts.length >= 4 && parts[2] === 'departments') {
        result.type = 'department';
        result.departmentId = parts[3];

        if (parts.length >= 6 && parts[4] === 'pools') {
          result.type = 'pool';
          result.poolId = parts[5];
        } else if (parts.length >= 6) {
          result.type = 'resource';
          result.resourceType = parts[4];
          result.resourceId = parts[5];
        }
      }

      return result;
    }

    return { type: 'platform' };
  }

  // Check if a scope is a parent of another scope
  static isParentOf(parentPath: ScopePath, childPath: ScopePath): boolean {
    if (parentPath === '/platform') return true;
    return childPath.startsWith(parentPath + '/') || childPath === parentPath;
  }

  // Check if a scope is a child of another scope
  static isChildOf(childPath: ScopePath, parentPath: ScopePath): boolean {
    return this.isParentOf(parentPath, childPath);
  }

  // Get the parent scope path
  static getParent(path: ScopePath): ScopePath | null {
    if (path === '/platform') return null;

    const parts = path.split('/').filter(p => p);
    if (parts.length <= 2) return '/platform';

    return '/' + parts.slice(0, -2).join('/');
  }

  // Get the depth of a scope (platform = 0, tenant = 1, etc.)
  static getDepth(path: ScopePath): number {
    if (path === '/platform') return 0;
    return path.split('/').filter(p => p).length / 2;
  }
}

// Scope validation utilities
export class ScopeValidator {
  static isValid(path: ScopePath): boolean {
    if (path === '/platform') return true;

    const pattern = /^\/tenants\/[^\/]+(\/departments\/[^\/]+(\/pools\/[^\/]+)?)?$/;
    return pattern.test(path);
  }

  static validateNode(node: ScopeNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!node.id) errors.push('Node ID is required');
    if (!node.type) errors.push('Node type is required');
    if (!node.path) errors.push('Node path is required');
    if (!node.name) errors.push('Node name is required');

    if (node.path && !this.isValid(node.path)) {
      errors.push('Invalid scope path format');
    }

    if (node.parentPath && !this.isValid(node.parentPath)) {
      errors.push('Invalid parent path format');
    }

    if (node.parentPath && !ScopePathBuilder.isParentOf(node.parentPath, node.path)) {
      errors.push('Parent path is not a valid parent of node path');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
