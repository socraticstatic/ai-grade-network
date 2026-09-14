import { describe, it, expect, beforeEach } from 'vitest';
import { scopeAwarePermissionChecker } from '../../utils/scopeAwarePermissionChecker';
import { roleAssignmentsByUserId } from '../../data/sampleRoleAssignments';

describe('rbacSlice initialization', () => {
  beforeEach(() => {
    for (const [userId, assignments] of Object.entries(roleAssignmentsByUserId)) {
      scopeAwarePermissionChecker.loadUserAssignments(userId, assignments);
    }
  });

  it('emilio can view at tenant scope', () => {
    const result = scopeAwarePermissionChecker.hasPermission(
      'emilio-estevez',
      { permission: 'view', resource: 'connection' },
      { targetScope: '/tenants/TNT-001' }
    );
    expect(result.allowed).toBe(true);
  });

  it('emilio can manage_users at tenant scope', () => {
    const result = scopeAwarePermissionChecker.hasPermission(
      'emilio-estevez',
      { permission: 'manage_users', resource: 'user' },
      { targetScope: '/tenants/TNT-001' }
    );
    expect(result.allowed).toBe(true);
  });

  it('user-1 (admin at dept-network) can view at their department scope', () => {
    const result = scopeAwarePermissionChecker.hasPermission(
      'user-1',
      { permission: 'view', resource: 'connection' },
      { targetScope: '/tenants/TNT-001/departments/dept-network' }
    );
    expect(result.allowed).toBe(true);
  });

  it('user-2 (user at dept-security) cannot manage_users', () => {
    const result = scopeAwarePermissionChecker.hasPermission(
      'user-2',
      { permission: 'manage_users', resource: 'user' },
      { targetScope: '/tenants/TNT-001/departments/dept-security' }
    );
    expect(result.allowed).toBe(false);
  });

  it('user-1 cannot access dept-security scope', () => {
    const result = scopeAwarePermissionChecker.hasPermission(
      'user-1',
      { permission: 'view', resource: 'connection' },
      { targetScope: '/tenants/TNT-001/departments/dept-security' }
    );
    expect(result.allowed).toBe(false);
    expect(result.limitedBy).toBe('scope');
  });
});
