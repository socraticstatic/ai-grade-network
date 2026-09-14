// src/utils/permissionResolver.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionResolver } from './permissionResolver';
import {
  RoleAssignment,
  DenyAssignment,
  AccessGroup,
  TENANT_SCOPE,
  CLIENT_SCOPE,
} from '../types/rbac';
import { ROLE_CATALOG } from '../data/roleCatalog';

const NOW = new Date('2026-06-01T12:00:00Z');
const FUTURE = '2027-01-01T00:00:00Z';
const PAST = '2025-01-01T00:00:00Z';

const baseTenantAssignment: RoleAssignment = {
  id: 'ra-1',
  principal: { id: 'user-1', type: 'user', displayName: 'Alice' },
  role: 'NetworkEngineer',
  scope: TENANT_SCOPE('TNT-001'),
  justification: 'test',
  grantedBy: 'admin-1',
  grantedAt: '2026-01-01T00:00:00Z',
  expiresAt: FUTURE,
  reviewCycle: 'quarterly',
  status: 'active',
};

describe('PermissionResolver.can', () => {
  let resolver: PermissionResolver;

  beforeEach(() => {
    resolver = new PermissionResolver();
  });

  it('allows a permission the role grants within scope', () => {
    resolver.loadAssignments('user-1', [baseTenantAssignment], []);
    const result = resolver.can(
      'user-1',
      'connection:read',
      TENANT_SCOPE('TNT-001'),
      { currentTime: NOW }
    );
    expect(result.allowed).toBe(true);
  });

  it('denies a permission the role does not grant', () => {
    resolver.loadAssignments('user-1', [baseTenantAssignment], []);
    const result = resolver.can(
      'user-1',
      'billing:finance',
      TENANT_SCOPE('TNT-001'),
      { currentTime: NOW }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('no role in the matching assignments grants');
  });

  it('denies when assignment is expired', () => {
    const expired: RoleAssignment = { ...baseTenantAssignment, expiresAt: PAST, status: 'expired' };
    resolver.loadAssignments('user-1', [expired], []);
    const result = resolver.can('user-1', 'connection:read', TENANT_SCOPE('TNT-001'), { currentTime: NOW });
    expect(result.allowed).toBe(false);
  });

  it('deny assignment wins over role grant', () => {
    const deny: DenyAssignment = {
      id: 'da-1',
      principal: { id: 'user-1', type: 'user', displayName: 'Alice' },
      permissions: ['connection:read'],
      scope: TENANT_SCOPE('TNT-001'),
      justification: 'security hold',
      grantedBy: 'admin-1',
      grantedAt: '2026-01-01T00:00:00Z',
      approvedBy: 'cso-1',
      expiresAt: FUTURE,
      status: 'active',
    };
    resolver.loadAssignments('user-1', [baseTenantAssignment], [deny]);
    const result = resolver.can('user-1', 'connection:read', TENANT_SCOPE('TNT-001'), { currentTime: NOW });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('deny');
  });

  it('tenant scope assignment grants access to client within that tenant', () => {
    resolver.loadAssignments('user-1', [baseTenantAssignment], []);
    const result = resolver.can(
      'user-1',
      'connection:read',
      CLIENT_SCOPE('TNT-001', 'CLT-A'),
      { currentTime: NOW }
    );
    expect(result.allowed).toBe(true);
  });

  it('denies when target scope is outside assignment scope', () => {
    resolver.loadAssignments('user-1', [baseTenantAssignment], []);
    const result = resolver.can(
      'user-1',
      'connection:read',
      TENANT_SCOPE('TNT-002'),
      { currentTime: NOW }
    );
    expect(result.allowed).toBe(false);
  });
});

const NOW_DATE = new Date('2026-06-01T12:00:00Z');

function makeGroup(id: string, userId: string): AccessGroup {
  return {
    id,
    name: `Group ${id}`,
    description: 'test group',
    purpose: 'organizational',
    owner: 'admin',
    ownerlessPolicy: 'suspend',
    scopeCeiling: { path: TENANT_SCOPE('TNT-001') },
    members: [{
      userId,
      displayName: 'Test User',
      membershipScope: null,
      justification: 'test',
      addedBy: 'admin',
      addedAt: '2026-01-01T00:00:00Z',
      expiresAt: FUTURE,
    }],
    createdBy: 'admin',
    createdAt: '2026-01-01T00:00:00Z',
    reviewCycle: 'quarterly',
    status: 'active',
  };
}

describe('PermissionResolver.getEffectiveAssignments', () => {
  let resolver: PermissionResolver;

  beforeEach(() => {
    resolver = new PermissionResolver();
    resolver.setRoleDefinitions(Object.values(ROLE_CATALOG));
  });

  it('annotates direct assignments with source: direct', () => {
    resolver.loadAssignments('user-1', [baseTenantAssignment], []);
    const results = resolver.getEffectiveAssignments('user-1', NOW_DATE);
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('direct');
    expect(results[0].groupId).toBeUndefined();
  });

  it('annotates group-sourced assignments with source: group and group metadata', () => {
    const group = makeGroup('grp-1', 'user-1');
    const groupAssignment: RoleAssignment = {
      ...baseTenantAssignment,
      id: 'ra-group-1',
      principal: { id: 'grp-1', type: 'group', displayName: 'Group grp-1' },
      role: 'BillingAdmin',
    };
    resolver.loadAssignments('grp-1', [groupAssignment], []);
    resolver.loadGroup(group);

    const results = resolver.getEffectiveAssignments('user-1', NOW_DATE);
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('group');
    expect(results[0].groupId).toBe('grp-1');
    expect(results[0].groupName).toBe('Group grp-1');
  });

  it('returns both direct and group-sourced assignments', () => {
    const group = makeGroup('grp-1', 'user-1');
    const groupAssignment: RoleAssignment = {
      ...baseTenantAssignment,
      id: 'ra-group-1',
      principal: { id: 'grp-1', type: 'group', displayName: 'Group grp-1' },
      role: 'BillingAdmin',
    };
    resolver.loadAssignments('user-1', [baseTenantAssignment], []);
    resolver.loadAssignments('grp-1', [groupAssignment], []);
    resolver.loadGroup(group);

    const results = resolver.getEffectiveAssignments('user-1', NOW_DATE);
    expect(results).toHaveLength(2);
    expect(results.filter(r => r.source === 'direct')).toHaveLength(1);
    expect(results.filter(r => r.source === 'group')).toHaveLength(1);
  });

  it('excludes assignments from expired group memberships', () => {
    const expiredGroup = makeGroup('grp-expired', 'user-1');
    expiredGroup.members[0].expiresAt = PAST; // membership expired

    const groupAssignment: RoleAssignment = {
      ...baseTenantAssignment,
      id: 'ra-group-expired',
      principal: { id: 'grp-expired', type: 'group', displayName: 'Expired group' },
      role: 'BillingAdmin',
    };
    resolver.loadAssignments('grp-expired', [groupAssignment], []);
    resolver.loadGroup(expiredGroup);

    const results = resolver.getEffectiveAssignments('user-1', NOW_DATE);
    // Membership is expired — group assignments should not appear
    expect(results).toHaveLength(0);
  });
});

describe('PermissionResolver.getSodViolation', () => {
  let resolver: PermissionResolver;

  beforeEach(() => {
    resolver = new PermissionResolver();
    resolver.setRoleDefinitions(Object.values(ROLE_CATALOG));
  });

  it('returns null when user has no SoD conflict', () => {
    resolver.loadAssignments('user-1', [baseTenantAssignment], []);
    expect(resolver.getSodViolation('user-1')).toBeNull();
  });

  it('detects SoD conflict from two direct assignments', () => {
    const billingAssignment: RoleAssignment = {
      ...baseTenantAssignment,
      id: 'ra-billing',
      role: 'BillingAdmin',
    };
    const securityAssignment: RoleAssignment = {
      ...baseTenantAssignment,
      id: 'ra-security',
      role: 'SecurityAdmin',
    };
    resolver.loadAssignments('user-1', [billingAssignment, securityAssignment], []);
    expect(resolver.getSodViolation('user-1')).not.toBeNull();
  });

  it('detects SoD conflict when one role is direct and other is via group', () => {
    const billingDirect: RoleAssignment = {
      ...baseTenantAssignment,
      id: 'ra-billing-direct',
      role: 'BillingAdmin',
    };
    const group = makeGroup('grp-sod', 'user-1');
    const securityViaGroup: RoleAssignment = {
      ...baseTenantAssignment,
      id: 'ra-security-group',
      principal: { id: 'grp-sod', type: 'group', displayName: 'SoD group' },
      role: 'SecurityAdmin',
    };
    resolver.loadAssignments('user-1', [billingDirect], []);
    resolver.loadAssignments('grp-sod', [securityViaGroup], []);
    resolver.loadGroup(group);

    expect(resolver.getSodViolation('user-1')).not.toBeNull();
    expect(resolver.getSodViolation('user-1')).toContain('BillingAdmin');
  });
});
