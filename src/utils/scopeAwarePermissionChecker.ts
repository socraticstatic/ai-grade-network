/**
 * Scope-Aware Permission Checker
 *
 * Implements proper RBAC with hierarchical scope paths.
 * Follows industry standards (Azure RBAC, AWS IAM, Kubernetes RBAC).
 *
 * Key Concepts:
 * - Role: Collection of permissions (view, create, edit, delete, etc.)
 * - Scope: WHERE in the resource hierarchy the role applies
 * - ResourceFilter: WHICH resources at that scope level can be accessed
 * - Permission: WHAT actions can be performed
 */

import {
  Role,
  Permission,
  PermissionRequirement,
  PermissionCheck,
  ROLE_PERMISSIONS,
  ResourceFilter,
  ROLE_DEFAULT_FILTER,
  ROLE_MAX_FILTER,
  RESOURCE_FILTER_HIERARCHY
} from '../types/permissions';

import { ScopePath, ScopePathBuilder } from '../types/scope';
import { RoleAssignment, isAssignmentActive, getAssignmentPermissions, assignmentCoversScope, getEffectiveFilter } from '../types/roleAssignment';

export class ScopeAwarePermissionChecker {
  private static instance: ScopeAwarePermissionChecker;
  private userAssignments: Map<string, RoleAssignment[]> = new Map();

  private constructor() {}

  static getInstance(): ScopeAwarePermissionChecker {
    if (!ScopeAwarePermissionChecker.instance) {
      ScopeAwarePermissionChecker.instance = new ScopeAwarePermissionChecker();
    }
    return ScopeAwarePermissionChecker.instance;
  }

  /**
   * Load role assignments for a user
   * In production, this would fetch from the database
   */
  loadUserAssignments(userId: string, assignments: RoleAssignment[]): void {
    this.userAssignments.set(userId, assignments);
  }

  /**
   * Get all active role assignments for a user
   */
  getUserAssignments(userId: string): RoleAssignment[] {
    const assignments = this.userAssignments.get(userId) || [];
    return assignments.filter(isAssignmentActive);
  }

  /**
   * Check if a user has a specific permission at a target scope
   *
   * This is the core permission checking logic:
   * 1. Find all active role assignments for the user
   * 2. Filter to assignments whose scope covers the target
   * 3. Check if any assignment's role has the required permission
   * 4. Apply any additional conditions (filters, MFA, etc.)
   */
  hasPermission(
    userId: string,
    requirement: PermissionRequirement,
    context?: {
      targetScope?: ScopePath;
      userDepartments?: string[];
      userPools?: string[];
      userTenantId?: string;
    }
  ): PermissionCheck {
    const assignments = this.getUserAssignments(userId);

    if (assignments.length === 0) {
      return {
        allowed: false,
        reason: 'No role assignments found for user',
        requirement,
        canRequest: true
      };
    }

    // Determine the target scope to check
    const targetScope = requirement.atScope || context?.targetScope || '/platform';

    // Find assignments that cover the target scope
    const applicableAssignments = assignments.filter(assignment =>
      assignmentCoversScope(assignment, targetScope)
    );

    if (applicableAssignments.length === 0) {
      return {
        allowed: false,
        reason: `No role assignments cover scope: ${targetScope}`,
        requirement,
        canRequest: true,
        limitedBy: 'scope'
      };
    }

    // Check each applicable assignment
    for (const assignment of applicableAssignments) {
      const permissions = getAssignmentPermissions(assignment);

      // Does this assignment's role have the required permission?
      if (!permissions.includes(requirement.permission)) {
        continue;
      }

      // Check role-specific requirement
      if (requirement.role && assignment.role !== requirement.role && assignment.role !== 'super-admin') {
        continue;
      }

      // Check resource filter restrictions
      if (requirement.resourceFilter) {
        const assignmentFilter = getEffectiveFilter(assignment);
        if (!this.filterIncludes(assignmentFilter, requirement.resourceFilter)) {
          continue;
        }
      }

      // Check MFA requirement
      if (assignment.conditions?.requiresMFA || requirement.requiresMFA) {
        return {
          allowed: true,
          needsMFA: true,
          requirement,
          grantedAtScope: assignment.scope,
          appliedFilter: getEffectiveFilter(assignment)
        };
      }

      // Check approval requirement
      if (assignment.conditions?.requiresApproval || requirement.requiresApproval) {
        return {
          allowed: true,
          needsApproval: true,
          requirement,
          grantedAtScope: assignment.scope,
          appliedFilter: getEffectiveFilter(assignment)
        };
      }

      // Permission granted!
      return {
        allowed: true,
        requirement,
        grantedAtScope: assignment.scope,
        appliedFilter: getEffectiveFilter(assignment)
      };
    }

    // No applicable assignment had the required permission
    return {
      allowed: false,
      reason: `Permission '${requirement.permission}' not granted by any role assignment`,
      requirement,
      canRequest: true,
      limitedBy: 'role'
    };
  }

  /**
   * Check if one resource filter includes another
   * Example: 'my-tenant' includes 'my-department'
   */
  private filterIncludes(assignmentFilter: ResourceFilter, requiredFilter: ResourceFilter): boolean {
    const assignmentLevel = RESOURCE_FILTER_HIERARCHY.indexOf(assignmentFilter);
    const requiredLevel = RESOURCE_FILTER_HIERARCHY.indexOf(requiredFilter);
    return assignmentLevel >= requiredLevel;
  }

  /**
   * Get the default resource filter for a role
   */
  getDefaultFilter(role: Role): ResourceFilter {
    return ROLE_DEFAULT_FILTER[role];
  }

  /**
   * Get the maximum resource filter a role can use
   */
  getMaxFilter(role: Role): ResourceFilter {
    return ROLE_MAX_FILTER[role];
  }

  /**
   * Check if a role can use a specific resource filter
   */
  canUseFilter(role: Role, filter: ResourceFilter): boolean {
    const maxFilter = this.getMaxFilter(role);
    return this.filterIncludes(filter, maxFilter);
  }

  /**
   * Get the effective resource filter (limited by role)
   */
  getEffectiveFilter(role: Role, requestedFilter?: ResourceFilter): ResourceFilter {
    if (!requestedFilter) {
      return this.getDefaultFilter(role);
    }

    const maxFilter = this.getMaxFilter(role);
    const maxLevel = RESOURCE_FILTER_HIERARCHY.indexOf(maxFilter);
    const requestedLevel = RESOURCE_FILTER_HIERARCHY.indexOf(requestedFilter);

    // If requested filter is too broad, limit to max filter
    if (requestedLevel > maxLevel) {
      return maxFilter;
    }

    return requestedFilter;
  }

  /**
   * Check if user can view a specific resource
   */
  canViewResource(userId: string, resourceType: string, resourceScope: ScopePath): boolean {
    return this.hasPermission(userId, {
      permission: 'view',
      resource: resourceType as any,
      atScope: resourceScope
    }).allowed;
  }

  /**
   * Check if user can edit a specific resource
   */
  canEditResource(userId: string, resourceType: string, resourceScope: ScopePath): boolean {
    return this.hasPermission(userId, {
      permission: 'edit',
      resource: resourceType as any,
      atScope: resourceScope
    }).allowed;
  }

  /**
   * Check if user can delete a specific resource
   */
  canDeleteResource(userId: string, resourceType: string, resourceScope: ScopePath): boolean {
    return this.hasPermission(userId, {
      permission: 'delete',
      resource: resourceType as any,
      atScope: resourceScope
    }).allowed;
  }

  /**
   * Get all scopes where user has a specific permission
   */
  getScopesWithPermission(userId: string, permission: Permission): ScopePath[] {
    const assignments = this.getUserAssignments(userId);
    const scopes: ScopePath[] = [];

    for (const assignment of assignments) {
      const permissions = getAssignmentPermissions(assignment);
      if (permissions.includes(permission)) {
        scopes.push(assignment.scope);
      }
    }

    return scopes;
  }

  /**
   * Get the highest scope where user has a permission
   */
  getHighestScopeWithPermission(userId: string, permission: Permission): ScopePath | null {
    const scopes = this.getScopesWithPermission(userId, permission);
    if (scopes.length === 0) return null;

    // Find the scope with the least depth (highest in hierarchy)
    return scopes.reduce((highest, current) => {
      const highestDepth = ScopePathBuilder.getDepth(highest);
      const currentDepth = ScopePathBuilder.getDepth(current);
      return currentDepth < highestDepth ? current : highest;
    });
  }

  /**
   * Helper to get role display name
   */
  getRoleDisplayName(role: Role): string {
    const displayNames: Record<Role, string> = {
      'user': 'User',
      'admin': 'Administrator',
      'super-admin': 'Platform Administrator'
    };
    return displayNames[role];
  }

  /**
   * Helper to get permission color for UI
   */
  getPermissionColor(permission: Permission): string {
    const colors: Record<Permission, string> = {
      'view': 'blue',
      'create': 'green',
      'edit': 'yellow',
      'delete': 'red',
      'manage_users': 'purple',
      'manage_billing': 'orange',
      'manage_system': 'red',
      'manage_tenants': 'purple',
      'impersonate': 'pink',
      'view_audit': 'gray',
      'manage_security': 'red'
    };
    return colors[permission] || 'gray';
  }
}

// Export singleton instance
export const scopeAwarePermissionChecker = ScopeAwarePermissionChecker.getInstance();

// Backward compatibility: create a simple wrapper that mimics the old API
// This allows gradual migration
export const permissionChecker = {
  hasPermission: (role: Role, requirement: PermissionRequirement) => {
    // For backward compatibility, treat role as a permission source
    const permissions = ROLE_PERMISSIONS[role];
    const allowed = permissions.includes(requirement.permission);

    return {
      allowed,
      reason: allowed ? undefined : `Role '${role}' does not have permission '${requirement.permission}'`,
      requirement
    };
  },

  getDefaultScope: (role: Role) => {
    return scopeAwarePermissionChecker.getDefaultFilter(role);
  },

  getMaxScope: (role: Role) => {
    return scopeAwarePermissionChecker.getMaxFilter(role);
  },

  canAccessScope: (role: Role, filter: ResourceFilter) => {
    return scopeAwarePermissionChecker.canUseFilter(role, filter);
  },

  getEffectiveScope: (role: Role, requested?: ResourceFilter) => {
    return scopeAwarePermissionChecker.getEffectiveFilter(role, requested);
  },

  getRoleDisplayName: (role: Role) => {
    return scopeAwarePermissionChecker.getRoleDisplayName(role);
  },

  getPermissionColor: (permission: Permission) => {
    return scopeAwarePermissionChecker.getPermissionColor(permission);
  },

  canViewResource: (role: Role, _resourceType: string) => {
    return ROLE_PERMISSIONS[role].includes('view');
  },

  canEditResource: (role: Role, _resourceType: string) => {
    return ROLE_PERMISSIONS[role].includes('edit');
  },

  canDeleteResource: (role: Role, _resourceType: string) => {
    return ROLE_PERMISSIONS[role].includes('delete');
  }
};
