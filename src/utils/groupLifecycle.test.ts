import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createRbacSlice, RbacSlice } from '../store/slices/rbacSlice';
import type { AccessGroup, RoleDefinition } from '../types/rbac';
import { buildScopePath } from '../types/rbac';
import type { RoleAssignment } from '../types/rbac';

// Minimal store wrapping just the rbac slice for isolated testing
const makeStore = () => create<RbacSlice>()((...a) => ({ ...createRbacSlice(...a) }));

const MOCK_GROUP: AccessGroup = {
  id: 'group-test-1',
  name: 'Test Group',
  description: 'A group for testing',
  purpose: 'organizational',
  owner: 'user-1',
  ownerlessPolicy: 'suspend',
  scopeCeiling: {},
  members: [],
  createdBy: 'user-1',
  createdAt: new Date().toISOString(),
  reviewCycle: 'quarterly',
  status: 'active',
};

describe('deleteAccessGroup', () => {
  it('removes the group from accessGroups', () => {
    const store = makeStore();
    store.getState().addAccessGroup(MOCK_GROUP);
    expect(store.getState().accessGroups.some(g => g.id === 'group-test-1')).toBe(true);

    store.getState().deleteAccessGroup('group-test-1');
    expect(store.getState().accessGroups.some(g => g.id === 'group-test-1')).toBe(false);
  });

  it('does not remove other groups when deleting one', () => {
    const store = makeStore();
    const groupA = { ...MOCK_GROUP, id: 'group-a', name: 'Group A' };
    const groupB = { ...MOCK_GROUP, id: 'group-b', name: 'Group B' };
    store.getState().addAccessGroup(groupA);
    store.getState().addAccessGroup(groupB);

    store.getState().deleteAccessGroup('group-a');
    expect(store.getState().accessGroups.some(g => g.id === 'group-b')).toBe(true);
    expect(store.getState().accessGroups.some(g => g.id === 'group-a')).toBe(false);
  });
});

describe('addAccessGroupMember', () => {
  it('adds a member to the group', () => {
    const store = makeStore();
    store.getState().addAccessGroup(MOCK_GROUP);

    const member = {
      userId: 'user-42',
      displayName: 'Test User',
      membershipScope: null,
      justification: 'test',
      addedBy: 'admin',
      addedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 90).toISOString(),
    };

    store.getState().addAccessGroupMember('group-test-1', member);

    const group = store.getState().accessGroups.find(g => g.id === 'group-test-1');
    expect(group?.members).toHaveLength(1);
    expect(group?.members[0].userId).toBe('user-42');
  });

  it('does not duplicate a member added twice', () => {
    const store = makeStore();
    store.getState().addAccessGroup(MOCK_GROUP);
    const member = {
      userId: 'user-42',
      displayName: 'Test User',
      membershipScope: null,
      justification: 'test',
      addedBy: 'admin',
      addedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 90).toISOString(),
    };
    store.getState().addAccessGroupMember('group-test-1', member);
    store.getState().addAccessGroupMember('group-test-1', member);
    const group = store.getState().accessGroups.find(g => g.id === 'group-test-1');
    // Adding same user twice should not create duplicate — expect idempotent
    expect(group?.members.filter(m => m.userId === 'user-42')).toHaveLength(1);
  });
});

describe('updateRoleDefinition — caller permission check', () => {
  it('strips permissions the caller does not hold from a custom role update', () => {
    const store = makeStore();

    const customRole: RoleDefinition = {
      id: 'custom-test-role',
      displayName: 'Custom Test Role',
      description: 'Test',
      maxScopeTier: 'tenant',
      source: 'custom',
      permissions: ['connection:read'],
    };
    store.getState().addCustomRole(customRole);

    // currentUserId is 'emilio-estevez' (TenantAdmin)
    // system:configure is platform-exclusive — TenantAdmin does NOT hold it
    store.getState().updateRoleDefinition('custom-test-role', {
      permissions: ['connection:read', 'system:configure'],
    });

    const updated = store.getState().roleDefinitions.find(r => r.id === 'custom-test-role');
    expect(updated?.permissions).toContain('connection:read');
    expect(updated?.permissions).not.toContain('system:configure');
  });

  it('keeps all permissions the caller holds when updating a custom role', () => {
    const store = makeStore();

    const customRole: RoleDefinition = {
      id: 'custom-allowed-role',
      displayName: 'Allowed Role',
      description: 'Test',
      maxScopeTier: 'tenant',
      source: 'custom',
      permissions: [],
    };
    store.getState().addCustomRole(customRole);

    // connection:read and billing:read are both held by TenantAdmin
    store.getState().updateRoleDefinition('custom-allowed-role', {
      permissions: ['connection:read', 'billing:read'],
    });

    const updated = store.getState().roleDefinitions.find(r => r.id === 'custom-allowed-role');
    expect(updated?.permissions).toContain('connection:read');
    expect(updated?.permissions).toContain('billing:read');
  });

  it('does NOT apply caller check to BC template roles', () => {
    const store = makeStore();

    // BC template — update applied as-is, no stripping
    store.getState().updateRoleDefinition('NetworkEngineer', {
      permissions: ['connection:read', 'system:configure'],
    });

    const updated = store.getState().roleDefinitions.find(r => r.id === 'NetworkEngineer');
    // system:configure is NOT stripped for BC templates
    expect(updated?.permissions).toContain('system:configure');
  });
});

describe('updateAccessGroup — audit entry', () => {
  it('emits a group:update audit entry when a group is edited', () => {
    const store = makeStore();
    store.getState().addAccessGroup(MOCK_GROUP);
    store.getState().updateAccessGroup('group-test-1', { name: 'Renamed Group' });

    const log = store.getState().auditLog;
    const entry = log.find(e => e.action === 'group:update');
    expect(entry).toBeDefined();
    expect(entry?.objectId).toBe('group-test-1');
    expect(entry?.objectName).toContain('name');
    expect(entry?.result).toBe('ALLOW');
  });

  it('does not emit an audit entry when updates object is empty', () => {
    const store = makeStore();
    store.getState().addAccessGroup(MOCK_GROUP);
    const logBefore = store.getState().auditLog.length;
    store.getState().updateAccessGroup('group-test-1', {});
    expect(store.getState().auditLog.length).toBe(logBefore);
  });
});

describe('updateAccessGroup — ceiling cascade', () => {
  it('emits ceiling-conflict audit entries for over-ceiling assignments when ceiling is tightened', () => {
    const store = makeStore();

    // Group starts with a platform-level scope ceiling
    const group: AccessGroup = {
      ...MOCK_GROUP,
      id: 'group-ceiling-test',
      scopeCeiling: { path: buildScopePath('/') },
    };
    store.getState().addAccessGroup(group);

    // Group holds a role assignment at platform scope
    const platformAssignment: RoleAssignment = {
      id: 'ra-platform-1',
      principal: { id: 'group-ceiling-test', type: 'group', displayName: 'Test Group' },
      role: 'NetworkEngineer' as any,
      scope: buildScopePath('/'),
      status: 'active',
      justification: 'test',
      grantedBy: 'user-1',
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      approvedBy: 'user-1',
    };
    store.getState().addRoleAssignment(platformAssignment);

    // Tighten ceiling to tenant scope
    const tenantCeiling = buildScopePath('/tenants/TNT-001');
    store.getState().updateAccessGroup('group-ceiling-test', {
      scopeCeiling: { path: tenantCeiling },
    });

    const conflictEntries = store.getState().auditLog.filter(e => e.action === 'group:ceiling-conflict');
    expect(conflictEntries.length).toBe(1);
    expect(conflictEntries[0].objectId).toBe('group-ceiling-test');
    expect(conflictEntries[0].result).toBe('DENY');
  });

  it('does not emit ceiling-conflict entries when ceiling is widened', () => {
    const store = makeStore();
    const group: AccessGroup = {
      ...MOCK_GROUP,
      id: 'group-widen-test',
      scopeCeiling: { path: buildScopePath('/tenants/TNT-001') },
    };
    store.getState().addAccessGroup(group);

    store.getState().updateAccessGroup('group-widen-test', {
      scopeCeiling: { path: buildScopePath('/') },
    });

    const conflictEntries = store.getState().auditLog.filter(
      e => e.action === 'group:ceiling-conflict'
    );
    expect(conflictEntries.length).toBe(0);
  });
});
