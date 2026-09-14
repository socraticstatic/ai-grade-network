import { StateCreator } from 'zustand';
import {
  RoleAssignment,
  RoleDefinition,
  DenyAssignment,
  AccessGroup,
  AccessGroupMember,
  AuditLogEntry,
  ScopePath,
  Permission,
  RoleName,
  TENANT_SCOPE,
} from '../../types/rbac';
import { permissionResolver } from '../../utils/permissionResolver';
import { detectCeilingConflicts } from '../../utils/groupEdit';
import { ROLE_CATALOG } from '../../data/roleCatalog';
import {
  MOCK_ROLE_ASSIGNMENTS,
  MOCK_DENY_ASSIGNMENTS,
  MOCK_ACCESS_GROUPS,
  MOCK_AUDIT_LOG,
} from '../../data/mockRbac';

export interface RbacSlice {
  // Current user
  currentUserId: string;
  currentUserScope: ScopePath;

  // Role definitions — BC templates seeded here, mutable by PlatformAdmin.
  // Custom roles created by TenantAdmin+ are appended here.
  roleDefinitions: RoleDefinition[];

  // Assignment data
  roleAssignments: RoleAssignment[];
  denyAssignments: DenyAssignment[];
  accessGroups: AccessGroup[];   // RBAC principal groups — NOT the same as GroupSlice.groups
  auditLog: AuditLogEntry[];

  // Role definition actions
  updateRoleDefinition: (id: string, updates: Partial<Pick<RoleDefinition, 'displayName' | 'description' | 'permissions' | 'maxScopeTier'>>) => void;
  addCustomRole: (role: RoleDefinition) => void;
  deleteCustomRole: (id: string) => void;  // bc-template roles cannot be deleted

  // Assignment actions
  addRoleAssignment: (assignment: RoleAssignment) => void;
  revokeRoleAssignment: (id: string, revokedBy: string, reason: string) => void;
  addDenyAssignment: (deny: DenyAssignment) => void;
  liftDenyAssignment: (id: string, liftedBy: string, reason: string) => void;
  addAccessGroup: (group: AccessGroup) => void;
  updateAccessGroup: (id: string, updates: Partial<AccessGroup>) => void;
  deleteAccessGroup: (id: string) => void;
  addAccessGroupMember: (groupId: string, member: AccessGroupMember) => void;
  removeAccessGroupMember: (groupId: string, userId: string) => void;
  appendAuditEntry: (entry: AuditLogEntry) => void;

  // Helpers
  getAssignmentsForUser: (userId: string) => RoleAssignment[];
  getAccessGroupsForUser: (userId: string) => AccessGroup[];
  // Returns permissions held by a given user at a given scope's assigned role
  getPermissionsForRole: (roleId: string) => Permission[];
}

export const createRbacSlice: StateCreator<RbacSlice> = (set, get) => {
  // Seed resolver with mock assignment data.
  // Both 'user' and 'group' principal types are keyed by principal.id so that
  // collectAssignments/collectDenies can find group-level assignments via store.get(group.id).
  const byUser = new Map<string, { assignments: RoleAssignment[]; denies: DenyAssignment[] }>();
  for (const a of MOCK_ROLE_ASSIGNMENTS) {
    const entry = byUser.get(a.principal.id) ?? { assignments: [], denies: [] };
    entry.assignments.push(a);
    byUser.set(a.principal.id, entry);
  }
  for (const d of MOCK_DENY_ASSIGNMENTS) {
    const entry = byUser.get(d.principal.id) ?? { assignments: [], denies: [] };
    entry.denies.push(d);
    byUser.set(d.principal.id, entry);
  }
  for (const [userId, data] of byUser) {
    permissionResolver.loadAssignments(userId, data.assignments, data.denies);
  }
  for (const g of MOCK_ACCESS_GROUPS) {
    permissionResolver.loadGroup(g);
  }

  // Seed resolver with BC template role definitions
  const initialRoleDefs = Object.values(ROLE_CATALOG);
  permissionResolver.setRoleDefinitions(initialRoleDefs);

  const syncRoleDefs = () => {
    permissionResolver.setRoleDefinitions(get().roleDefinitions);
  };

  return {
    currentUserId: 'emilio-estevez',
    currentUserScope: TENANT_SCOPE('TNT-001'),

    roleDefinitions: initialRoleDefs,

    roleAssignments: MOCK_ROLE_ASSIGNMENTS,
    denyAssignments: MOCK_DENY_ASSIGNMENTS,
    accessGroups: MOCK_ACCESS_GROUPS,
    auditLog: MOCK_AUDIT_LOG,

    // ── Role definition mutations ──────────────────────────────────────────
    updateRoleDefinition: (id, updates) => {
      if (updates.permissions) {
        const isBCTemplate = get().roleDefinitions.find(r => r.id === id)?.source === 'bc-template';
        if (!isBCTemplate) {
          const callerPerms = new Set(
            permissionResolver.getEffectivePermissions(
              get().currentUserId,
              get().currentUserScope,
              { request: { currentTime: new Date() } }
            )
          );
          const unauthorized = updates.permissions.filter(p => !callerPerms.has(p));
          if (unauthorized.length > 0) {
            console.warn(
              `[RBAC] updateRoleDefinition: caller '${get().currentUserId}' on role '${id}' stripped unauthorized: ${unauthorized.join(', ')}`
            );
            updates = {
              ...updates,
              permissions: updates.permissions.filter(p => callerPerms.has(p)),
            };
          }
        }
      }
      set(s => ({
        roleDefinitions: s.roleDefinitions.map(r =>
          r.id === id ? { ...r, ...updates } : r
        ),
      }));
      syncRoleDefs();
    },

    addCustomRole: (role) => {
      set(s => ({ roleDefinitions: [...s.roleDefinitions, role] }));
      syncRoleDefs();
    },

    deleteCustomRole: (id) => {
      set(s => ({
        // Guard: cannot delete bc-template roles
        roleDefinitions: s.roleDefinitions.filter(
          r => !(r.id === id && r.source === 'custom')
        ),
      }));
      syncRoleDefs();
    },

    // ── Assignment mutations ───────────────────────────────────────────────
    addRoleAssignment: (assignment) => {
      set(s => ({ roleAssignments: [...s.roleAssignments, assignment] }));
      const current = get().getAssignmentsForUser(assignment.principal.id);
      const currentDenies = get().denyAssignments.filter(
        d => d.principal.id === assignment.principal.id
      );
      permissionResolver.loadAssignments(assignment.principal.id, current, currentDenies);
    },

    revokeRoleAssignment: (id, revokedBy, reason) => {
      const target = get().roleAssignments.find(a => a.id === id);
      set(s => ({
        roleAssignments: s.roleAssignments.map(a =>
          a.id === id
            ? { ...a, status: 'revoked', revokedBy, revokedAt: new Date().toISOString(), revokeReason: reason }
            : a
        ),
      }));
      if (target) {
        const userId = target.principal.id;
        permissionResolver.loadAssignments(
          userId,
          get().getAssignmentsForUser(userId),
          get().denyAssignments.filter(d => d.principal.id === userId)
        );
        get().appendAuditEntry({
          id: `al-${Date.now()}`,
          timestamp: new Date().toISOString(),
          principalId: revokedBy,
          principalName: revokedBy,
          action: 'role-assignment:revoke',
          objectType: 'RoleAssignment',
          objectId: id,
          objectName: `${target.role} → ${target.principal.displayName}`,
          scope: target.scope,
          result: 'ALLOW',
        });
      }
    },

    addDenyAssignment: (deny) => {
      set(s => ({ denyAssignments: [...s.denyAssignments, deny] }));
      const userId = deny.principal.id;
      permissionResolver.loadAssignments(
        userId,
        get().getAssignmentsForUser(userId),
        get().denyAssignments.filter(d => d.principal.id === userId)
      );
    },

    liftDenyAssignment: (id, liftedBy, reason) => {
      const target = get().denyAssignments.find(d => d.id === id);
      set(s => ({
        denyAssignments: s.denyAssignments.map(d =>
          d.id === id
            ? { ...d, status: 'lifted', liftedBy, liftedAt: new Date().toISOString(), liftReason: reason }
            : d
        ),
      }));
      if (target) {
        const userId = target.principal.id;
        permissionResolver.loadAssignments(
          userId,
          get().getAssignmentsForUser(userId),
          get().denyAssignments.filter(d => d.principal.id === userId)
        );
        get().appendAuditEntry({
          id: `al-${Date.now()}`,
          timestamp: new Date().toISOString(),
          principalId: liftedBy,
          principalName: liftedBy,
          action: 'deny-assignment:lift',
          objectType: 'DenyAssignment',
          objectId: id,
          objectName: `Deny lifted → ${target.principal.displayName}`,
          scope: target.scope,
          result: 'ALLOW',
        });
      }
    },

    addAccessGroup: (group) => {
      set(s => ({ accessGroups: [...s.accessGroups, group] }));
      permissionResolver.loadGroup(group);
    },

    updateAccessGroup: (id, updates) => {
      // Snapshot before update for diff and audit
      const before = get().accessGroups.find(g => g.id === id);

      set(s => ({
        accessGroups: s.accessGroups.map(g => (g.id === id ? { ...g, ...updates } : g)),
      }));

      const updated = get().accessGroups.find(g => g.id === id);
      if (updated) permissionResolver.loadGroup(updated);

      // Emit audit entry — only when at least one field actually changed
      const changedFields = before
        ? (Object.keys(updates) as (keyof typeof updates)[]).filter(
            k => JSON.stringify((updates as any)[k]) !== JSON.stringify((before as any)[k])
          )
        : Object.keys(updates);

      if (before && changedFields.length > 0) {
        const actor = get().currentUserId;
        get().appendAuditEntry({
          id: `al-grpedit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          principalId: actor,
          principalName: actor,
          action: 'group:update',
          objectType: 'group',
          objectId: id,
          objectName: `${before.name}: ${changedFields.join(', ')}`,
          scope: get().currentUserScope,
          result: 'ALLOW',
        });
      }

      // Ceiling-tightening cascade: detect over-ceiling role assignments
      if (before && updates.scopeCeiling?.path) {
        const oldCeiling = before.scopeCeiling?.path;
        const newCeiling = updates.scopeCeiling.path;

        // "Tighter" = new ceiling path is longer (more specific) than old one
        const isTighter =
          !oldCeiling ||
          newCeiling.raw.length > (oldCeiling.raw ?? '/').length;

        if (isTighter) {
          const groupAssignments = get().roleAssignments.filter(
            a => a.principal.id === id && a.status === 'active'
          );
          const conflicts = detectCeilingConflicts(newCeiling, groupAssignments);

          if (conflicts.length > 0) {
            const now = Date.now();
            const actor = get().currentUserId;
            const groupName = before.name;

            for (const conflict of conflicts) {
              const roleName =
                get().roleDefinitions.find(r => r.id === conflict.role)?.displayName ?? conflict.role;
              get().appendAuditEntry({
                id: `al-ceilconflict-${now}-${conflict.id}`,
                timestamp: new Date(now).toISOString(),
                principalId: actor,
                principalName: actor,
                action: 'group:ceiling-conflict',
                objectType: 'group',
                objectId: id,
                objectName: `${groupName}: ${roleName} at ${conflict.scope.raw} exceeds new ceiling`,
                scope: newCeiling,
                result: 'DENY',
                denyReason: `Assignment scope ${conflict.scope.raw} is broader than new ceiling ${newCeiling.raw}`,
              });
            }

            // Surface warning to the user (optional chain: not available in test env)
            (window as any).addToast?.({
              type: 'warning',
              title: 'Scope Ceiling Tightened',
              message: `${conflicts.length} role assignment${conflicts.length !== 1 ? 's' : ''} now exceed${conflicts.length === 1 ? 's' : ''} the new ceiling. Review the Activity log.`,
              duration: 6000,
            });
          }
        }
      }
    },

    deleteAccessGroup: (id) => {
      set(s => ({ accessGroups: s.accessGroups.filter(g => g.id !== id) }));
    },

    addAccessGroupMember: (groupId, member) => {
      set(s => ({
        accessGroups: s.accessGroups.map(g => {
          if (g.id !== groupId) return g;
          // Idempotent — skip if already a member
          if (g.members.some(m => m.userId === member.userId)) return g;
          return { ...g, members: [...g.members, member] };
        }),
      }));
      const updated = get().accessGroups.find(g => g.id === groupId);
      if (updated) permissionResolver.loadGroup(updated);

      // Emit one audit entry per role assignment the group holds
      const groupAssignments = get().roleAssignments.filter(
        a => a.principal.id === groupId && a.status === 'active'
      );
      const now = Date.now();
      for (const ga of groupAssignments) {
        const roleName =
          get().roleDefinitions.find(r => r.id === ga.role)?.displayName ?? ga.role;
        const groupName = updated?.name ?? groupId;
        get().appendAuditEntry({
          id: `al-grpadd-${now}-${ga.id}`,
          timestamp: new Date(now).toISOString(),
          principalId: member.userId,
          principalName: member.displayName,
          action: 'group-membership:add',
          objectType: 'group',
          objectId: groupId,
          objectName: `${groupName} → ${roleName}`,
          scope: ga.scope,
          result: 'ALLOW',
        });
      }
    },

    removeAccessGroupMember: (groupId, userId) => {
      set(s => ({
        accessGroups: s.accessGroups.map(g =>
          g.id === groupId
            ? { ...g, members: g.members.filter(m => m.userId !== userId) }
            : g
        ),
      }));
      const updated = get().accessGroups.find(g => g.id === groupId);
      if (updated) permissionResolver.loadGroup(updated);
    },

    appendAuditEntry: (entry) => {
      set(s => ({ auditLog: [entry, ...s.auditLog] }));
    },

    getAssignmentsForUser: (userId) =>
      get().roleAssignments.filter(a => a.principal.id === userId),

    getAccessGroupsForUser: (userId) =>
      get().accessGroups.filter(g => g.members.some(m => m.userId === userId)),

    getPermissionsForRole: (roleId) =>
      get().roleDefinitions.find(r => r.id === roleId)?.permissions ?? [],
  };
};
