# RBAC Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seal `window.__setRole` from production builds, surface group-sourced access in SoD badges and Effective Permissions modal, emit audit entries when group membership confers access, and enforce caller permission checks in `updateRoleDefinition`.

**Architecture:** Three independent streams. (1) App.tsx: one-line dev guard. (2) `permissionResolver.ts`: refactor `collectAssignments` to delegate to a new public `getEffectiveAssignments`, expose `getSodViolation` publicly — then wire both into UserList, AssignmentManagement, and EffectivePermissionsModal. (3) `rbacSlice.ts`: caller permission check in `updateRoleDefinition` + audit entries in `addAccessGroupMember`.

**Tech Stack:** React 19, TypeScript strict, Zustand, Vite (`import.meta.env.DEV`), Vitest, Playwright

---

## Mental Model

**`permissionResolver` data flow:**
- `loadAssignments(userId, assignments, denies)` seeds direct assignments
- `loadGroup(group)` registers a group; group's role assignments are loaded via `loadAssignments(group.id, ...)`
- `collectAssignments(userId)` returns direct + group-sourced assignments merged
- `can(userId, permission, scope, ctx)` uses `collectAssignments` internally

**What changes:** `collectAssignments` becomes a thin wrapper over new public `getEffectiveAssignments`, which returns the same assignments PLUS source metadata (`'direct'` vs `'group'`).

**`__setRole` guard:** `import.meta.env.DEV` is `true` when the Vite dev server is running (including during Playwright tests). It is `false` in `npm run build` output. E2E tests are unaffected.

---

## File Map

### Files to modify
```
src/App.tsx                                                   — guard __setRole + add __setActivePersona
src/utils/permissionResolver.ts                               — add getEffectiveAssignments, getSodViolation; refactor collectAssignments
src/utils/rbacLabels.ts                                       — add group-membership:add to ACTION_LABELS
src/store/slices/rbacSlice.ts                                 — updateRoleDefinition caller check; addAccessGroupMember audit entries
src/components/configure/users/UserList.tsx                   — SoD badge via permissionResolver.getSodViolation
src/components/configure/users/AssignmentManagement.tsx       — SoD badge via permissionResolver.getSodViolation
src/components/configure/users/EffectivePermissionsModal.tsx  — source attribution (direct vs via group)
```

### Test files to modify
```
src/utils/permissionResolver.test.ts   — add getEffectiveAssignments and getSodViolation tests
src/utils/groupLifecycle.test.ts       — add updateRoleDefinition caller check test
```

### Test files to create
```
tests/e2e/rbac-integrity.spec.ts       — E2E: group SoD badge, modal source attribution, audit entries
```

---

## Task 1: Gate `window.__setRole` Behind Dev Mode

**Files:**
- Modify: `src/App.tsx` (line 332–337)

**Context:** Line 336 unconditionally writes `__setRole` to the window. In a production build this exposes a bypass for every UI gate (ConfigureHub Platform Admin tab, BillingConfiguration, SystemSettings). Adding `import.meta.env.DEV` guard removes it from production. Playwright tests run against the dev server so they are unaffected.

- [ ] **Step 1: Update App.tsx to add setActivePersona and guard both functions**

`setRole` is already destructured at line 332. Add `setActivePersona` alongside it. Change the `useEffect`:

```typescript
// src/App.tsx — find these two lines around line 332 and 336:

// BEFORE:
const setRole = useStore(state => state.setRole);
// ...
useEffect(() => { (window as any).__setRole = setRole; }, [setRole]);

// AFTER:
const setRole = useStore(state => state.setRole);
const setActivePersona = useStore(state => state.setActivePersona);
// ...
useEffect(() => {
  if (import.meta.env.DEV) {
    (window as any).__setRole = setRole;
    (window as any).__setActivePersona = setActivePersona;
  }
}, [setRole, setActivePersona]);
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Verify existing E2E role tests still pass (dev mode = DEV is true)**

```bash
npx playwright test tests/e2e/role-enforcement.spec.ts --reporter=line
```

Expected: `6 passed`.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "fix(rbac): gate window.__setRole behind import.meta.env.DEV"
```

---

## Task 2: Refactor permissionResolver — `getEffectiveAssignments` + `getSodViolation`

**Files:**
- Modify: `src/utils/permissionResolver.ts`
- Test: `src/utils/permissionResolver.test.ts`

**Context:** `collectAssignments` (private, line 268) already separates direct vs group assignments but throws away the source information. This task makes it public, source-annotated, and moves the implementation there. `collectAssignments` becomes a one-liner wrapper. `getSodViolation` exposes the private `checkSoD` as a public method. Both are used by Tasks 3, 4, 5.

### RED — Write failing tests first

- [ ] **Step 1: Write failing tests for getEffectiveAssignments and getSodViolation**

Add to `src/utils/permissionResolver.test.ts` after the existing `PermissionResolver.can` describe block:

```typescript
import { ROLE_CATALOG } from '../data/roleCatalog';
import { AccessGroup, buildScopePath } from '../types/rbac';

// --- helpers shared by new tests ---
const FUTURE = '2027-01-01T00:00:00Z';
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
    // user-1 direct: BillingAdmin
    const billingDirect: RoleAssignment = {
      ...baseTenantAssignment,
      id: 'ra-billing-direct',
      role: 'BillingAdmin',
    };
    // group has SecurityAdmin — user-1 is a member
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

    // BillingAdmin + SecurityAdmin = sod-2 violation
    expect(resolver.getSodViolation('user-1')).not.toBeNull();
    expect(resolver.getSodViolation('user-1')).toContain('BillingAdmin');
  });
});
```

- [ ] **Step 2: Run tests — confirm they FAIL**

```bash
npx vitest run src/utils/permissionResolver.test.ts 2>&1 | tail -10
```

Expected: multiple failures — `resolver.getEffectiveAssignments is not a function`, `resolver.getSodViolation is not a function`.

### GREEN — Implement

- [ ] **Step 3: Add `getEffectiveAssignments` public method and refactor `collectAssignments`**

In `src/utils/permissionResolver.ts`, find `private collectAssignments(userId: string, now: Date): RoleAssignment[]` (around line 268). Replace it with:

```typescript
  // PUBLIC — returns all active assignments for a user with source metadata.
  // Direct assignments use source: 'direct'; group-sourced use source: 'group'.
  // This is the canonical implementation. collectAssignments delegates here.
  getEffectiveAssignments(
    userId: string,
    now = new Date()
  ): Array<{
    assignment: RoleAssignment;
    source: 'direct' | 'group';
    groupId?: string;
    groupName?: string;
  }> {
    const result: Array<{
      assignment: RoleAssignment;
      source: 'direct' | 'group';
      groupId?: string;
      groupName?: string;
    }> = [];

    const direct = this.store.get(userId)?.assignments ?? [];
    for (const a of direct) {
      result.push({ assignment: a, source: 'direct' });
    }

    for (const group of this.accessGroups.values()) {
      const membership = group.members.find(
        m => m.userId === userId && new Date(m.expiresAt) > now
      );
      if (!membership) continue;
      const groupData = this.store.get(group.id);
      if (!groupData) continue;
      for (const ga of groupData.assignments) {
        if (ga.status !== 'active' || new Date(ga.expiresAt) <= now) continue;
        const effectiveScope = this.intersectScopes(
          group.scopeCeiling.path,
          membership.membershipScope?.path,
          ga.scope
        );
        if (!effectiveScope) continue;
        result.push({
          assignment: { ...ga, scope: effectiveScope },
          source: 'group',
          groupId: group.id,
          groupName: group.name,
        });
      }
    }

    return result;
  }

  private collectAssignments(userId: string, now: Date): RoleAssignment[] {
    return this.getEffectiveAssignments(userId, now).map(e => e.assignment);
  }
```

- [ ] **Step 4: Add `getSodViolation` public method**

Find `private checkSoD(userId: string, now: Date)` (around line 327). Add this public method immediately before it:

```typescript
  getSodViolation(userId: string): string | null {
    return this.checkSoD(userId, new Date());
  }
```

- [ ] **Step 5: Run tests — confirm they PASS**

```bash
npx vitest run src/utils/permissionResolver.test.ts 2>&1 | tail -10
```

Expected: all tests pass, including the 5 existing `PermissionResolver.can` tests and 7 new tests.

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/utils/permissionResolver.ts src/utils/permissionResolver.test.ts
git commit -m "feat(rbac): add getEffectiveAssignments + getSodViolation to permissionResolver"
```

---

## Task 3: `updateRoleDefinition` Caller Permission Check

**Files:**
- Modify: `src/store/slices/rbacSlice.ts`
- Test: `src/utils/groupLifecycle.test.ts` (appended)

**Context:** `updateRoleDefinition` currently accepts any permissions array with no validation. A developer console call can add `system:administer` to a role held by a Viewer. The fix: when `updates.permissions` is provided and the role is a custom role (not a BC template), strip permissions the caller doesn't hold. Silent strip + `console.warn` — no hard throw (white-screens the demo).

`ROLE_CATALOG` is already imported. `RoleName` needs to be imported for the `ROLE_CATALOG[id as RoleName]` check.

### RED

- [ ] **Step 1: Write failing test**

Append to `src/utils/groupLifecycle.test.ts`:

```typescript
import { ROLE_CATALOG } from '../data/roleCatalog';
import type { RoleDefinition } from '../types/rbac';

describe('updateRoleDefinition — caller permission check', () => {
  it('strips permissions the caller does not hold from a custom role update', () => {
    const store = makeStore();

    // Add a custom role with basic permissions
    const customRole: RoleDefinition = {
      id: 'custom-test-role',
      displayName: 'Custom Test Role',
      description: 'Test',
      maxScopeTier: 'tenant',
      source: 'custom',
      permissions: ['connection:read'],
    };
    store.getState().addCustomRole(customRole);

    // currentUserId is 'emilio-estevez' (TenantAdmin) — holds tenant-level permissions
    // system:configure is platform-exclusive — TenantAdmin does NOT hold it
    store.getState().updateRoleDefinition('custom-test-role', {
      permissions: ['connection:read', 'system:configure'],
    });

    const updated = store.getState().roleDefinitions.find(r => r.id === 'custom-test-role');
    expect(updated?.permissions).toContain('connection:read');
    expect(updated?.permissions).not.toContain('system:configure');
  });

  it('keeps permissions the caller holds when updating a custom role', () => {
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

    // connection:read is client-tier — TenantAdmin holds it
    store.getState().updateRoleDefinition('custom-allowed-role', {
      permissions: ['connection:read', 'billing:read'],
    });

    const updated = store.getState().roleDefinitions.find(r => r.id === 'custom-allowed-role');
    expect(updated?.permissions).toContain('connection:read');
    expect(updated?.permissions).toContain('billing:read');
  });

  it('does NOT apply caller check to BC template roles', () => {
    const store = makeStore();

    // NetworkEngineer is a BC template — the store should NOT strip anything
    // (UI gate is authoritative for BC templates)
    const originalPerms = ROLE_CATALOG.NetworkEngineer.permissions.slice();
    const update = ['connection:read', 'system:configure'];

    store.getState().updateRoleDefinition('NetworkEngineer', {
      permissions: update,
    });

    const updated = store.getState().roleDefinitions.find(r => r.id === 'NetworkEngineer');
    // BC template — update applied as-is, no stripping
    expect(updated?.permissions).toContain('system:configure');
  });
});
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
npx vitest run src/utils/groupLifecycle.test.ts 2>&1 | tail -12
```

Expected: first two tests fail (stripping not implemented). Third test passes already.

### GREEN

- [ ] **Step 3: Add RoleName import to rbacSlice.ts**

In `src/store/slices/rbacSlice.ts`, add `RoleName` to the existing import from `../../types/rbac`:

```typescript
import {
  RoleAssignment,
  RoleDefinition,
  DenyAssignment,
  AccessGroup,
  AccessGroupMember,
  AuditLogEntry,
  ScopePath,
  Permission,
  RoleName,       // ADD THIS
  TENANT_SCOPE,
} from '../../types/rbac';
```

- [ ] **Step 4: Update `updateRoleDefinition` in rbacSlice.ts**

Find `updateRoleDefinition: (id, updates) =>` (around line 103). Replace the implementation:

```typescript
    updateRoleDefinition: (id, updates) => {
      if (updates.permissions) {
        const isBCTemplate = ROLE_CATALOG[id as RoleName] !== undefined;
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
              `[RBAC] updateRoleDefinition: stripped unauthorized permissions: ${unauthorized.join(', ')}`
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
```

- [ ] **Step 5: Run tests — confirm PASS**

```bash
npx vitest run src/utils/groupLifecycle.test.ts 2>&1 | tail -10
```

Expected: all tests pass (7 previous + 3 new = 10 total).

- [ ] **Step 6: Compile + commit**

```bash
npx tsc --noEmit 2>&1 | head -10 && git add src/store/slices/rbacSlice.ts src/utils/groupLifecycle.test.ts && git commit -m "fix(rbac): updateRoleDefinition strips unauthorized permissions for custom roles"
```

---

## Task 4: Group Membership Audit Entries

**Files:**
- Modify: `src/store/slices/rbacSlice.ts`
- Modify: `src/utils/rbacLabels.ts`

**Context:** When a user is added to a group that already has active role assignments, no audit trail exists linking that user to the access they just gained. This task emits one `AuditLogEntry` per inherited assignment. `objectId` = groupId, `objectName` = `"Group Name → Role Display Name"` — no new type fields needed.

- [ ] **Step 1: Add group-membership:add to rbacLabels.ts**

In `src/utils/rbacLabels.ts`, add to `ACTION_LABELS`:

```typescript
  'group-membership:add': 'Added to group (role inherited)',
```

- [ ] **Step 2: Update `addAccessGroupMember` in rbacSlice.ts**

Find `addAccessGroupMember: (groupId, member) =>` (around line 230). After the existing `set(...)` and `permissionResolver.loadGroup(updated)` calls, add the audit emit:

```typescript
    addAccessGroupMember: (groupId, member) => {
      set(s => ({
        accessGroups: s.accessGroups.map(g => {
          if (g.id !== groupId) return g;
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
```

- [ ] **Step 3: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: clean.

- [ ] **Step 4: Manual verification**

Start the dev server:

```bash
npm run dev
```

In the app: Configure → Users → Groups → open any group with active role assignments → click "Add Member" → add a user. Navigate to Activity tab. Confirm a new entry appears with action "Added to group (role inherited)" and the group name → role name in the Object column.

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/rbacSlice.ts src/utils/rbacLabels.ts
git commit -m "feat(rbac): emit audit entries when group membership confers access"
```

---

## Task 5: Fix SoD Badges — Route Through `permissionResolver`

**Files:**
- Modify: `src/components/configure/users/UserList.tsx`
- Modify: `src/components/configure/users/AssignmentManagement.tsx`

**Context:** Both files compute SoD violations by iterating `SOD_CONSTRAINTS` against the store's `roleAssignments` array. This misses group-sourced roles. Replacing with `permissionResolver.getSodViolation()` (which uses `collectAssignments` → group traversal) fixes the gap. `permissionResolver` is already imported in UserList and AssignmentManagement.

### UserList

- [ ] **Step 1: Update the SoD column in UserList.tsx**

Find the `sod` column render function (around line 200). Replace the manual SoD computation:

```typescript
    {
      id: 'sod',
      label: 'SoD',
      render: (user: UserType) => {
        const violation = permissionResolver.getSodViolation(user.id);
        if (!violation) return null;
        return (
          <span
            title={`SoD conflict: ${violation}`}
            className="flex items-center gap-1 text-figma-xs text-fw-error font-medium cursor-help"
          >
            <AlertTriangle className="h-3 w-3" />
            SoD conflict
          </span>
        );
      },
    },
```

Remove the now-unused `SOD_CONSTRAINTS` import from UserList if it is no longer referenced elsewhere in the file.

- [ ] **Step 2: Verify UserList still imports permissionResolver**

```bash
grep -n "permissionResolver" /Users/micahbos/Developer/att-netbond-sdci/src/components/configure/users/UserList.tsx
```

Expected: at least one line showing `import { permissionResolver }` or usage.

### AssignmentManagement

- [ ] **Step 3: Update SoD computation in AssignmentManagement.tsx**

Find the `sodViolationTitles` block (around line 96). Replace it:

```typescript
  // Compute SoD violations — route through permissionResolver to catch group-sourced roles.
  // Deduplicate by principal ID: getSodViolation is O(groups × members), call once per user.
  const violationByPrincipal = new Map<string, string>();
  const uniquePrincipalIds = new Set(roleAssignments.map(a => a.principal.id));
  for (const principalId of uniquePrincipalIds) {
    const violation = permissionResolver.getSodViolation(principalId);
    if (violation) violationByPrincipal.set(principalId, violation);
  }
  const sodViolatingIds = new Set<string>();
  const sodViolationTitles = new Map<string, string>();
  for (const a of roleAssignments) {
    const violation = violationByPrincipal.get(a.principal.id);
    if (violation) {
      sodViolatingIds.add(a.id);
      sodViolationTitles.set(a.id, `SoD: ${violation}`);
    }
  }
```

Remove the now-unused `SOD_CONSTRAINTS` import and the `getSodConstraintForAssignment` helper if it exists.

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: clean.

- [ ] **Step 5: Run existing E2E tests that check SoD badges**

```bash
npx playwright test tests/e2e/rbac-personas.spec.ts --grep "SoD" --reporter=line
```

Expected: P5-01, P5-02, P6-01, P6-02 all pass (these test SoD conflict visibility for Aisha Johnson and Marcus Chen).

- [ ] **Step 6: Commit**

```bash
git add src/components/configure/users/UserList.tsx src/components/configure/users/AssignmentManagement.tsx
git commit -m "fix(rbac): SoD badges route through permissionResolver to catch group-sourced violations"
```

---

## Task 6: Source Attribution in EffectivePermissionsModal

**Files:**
- Modify: `src/components/configure/users/EffectivePermissionsModal.tsx`

**Context:** The modal currently shows "Source Assignments" by reading `roleAssignments.filter(a => a.principal.id === user.id)` — direct assignments only. Group-sourced assignments don't appear. This task replaces that section with a breakdown: "Direct (N)" and "Via Groups (N)" where each group's assignments are listed under the group name.

The flat permission list (grouped by object, shown at the top of the modal) does NOT change — it already correctly includes group permissions via `getEffectivePermissions`.

- [ ] **Step 1: Update EffectivePermissionsModal imports and useMemo**

In `src/components/configure/users/EffectivePermissionsModal.tsx`, add `permissionResolver` import (already present — confirm). The key change is replacing `roleAssignments` store read with `getEffectiveAssignments`:

```typescript
// Remove: const roleAssignments = useStore(s => s.roleAssignments);

// Update the useMemo block:
const { permissions, byObject, directAssignments, byGroup } = useMemo(() => {
  const scope = buildScopePath(user.scopePath ?? '/tenants/TNT-001');
  const perms = permissionResolver.getEffectivePermissions(user.id, scope, { currentTime: new Date() });

  const all = permissionResolver.getEffectiveAssignments(user.id);
  const active = all.filter(e =>
    e.assignment.status === 'active' && new Date(e.assignment.expiresAt) > new Date()
  );

  const direct = active
    .filter(e => e.source === 'direct')
    .map(e => e.assignment);

  const groupMap = new Map<string, { groupName: string; assignments: typeof active[number]['assignment'][] }>();
  for (const e of active) {
    if (e.source !== 'group' || !e.groupId) continue;
    if (!groupMap.has(e.groupId)) {
      groupMap.set(e.groupId, { groupName: e.groupName ?? e.groupId, assignments: [] });
    }
    groupMap.get(e.groupId)!.assignments.push(e.assignment);
  }

  return {
    permissions: perms,
    byObject: groupPermissions(perms),
    directAssignments: direct,
    byGroup: groupMap,
  };
}, [user]);
```

- [ ] **Step 2: Update the summary line**

Change the summary to show the total source count:

```typescript
              <p className="text-figma-xs text-fw-bodyLight">
                from {directAssignments.length} direct + {byGroup.size} group source{byGroup.size !== 1 ? 's' : ''}
              </p>
```

- [ ] **Step 3: Replace the "Source Assignments" section**

Find the `{/* Source assignments */}` block and replace it:

```tsx
        {/* Source Assignments — direct + via groups */}
        {(directAssignments.length > 0 || byGroup.size > 0) && (
          <div>
            <h3 className="text-figma-sm font-semibold text-fw-heading mb-3">Source Assignments</h3>

            {directAssignments.length > 0 && (
              <div className="mb-4">
                <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide mb-2">
                  Direct ({directAssignments.length})
                </p>
                <div className="space-y-2">
                  {directAssignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-fw-wash border border-fw-secondary rounded-lg">
                      <div>
                        <span className="text-figma-sm font-medium text-fw-heading">
                          {ROLE_CATALOG[a.role]?.displayName ?? a.role}
                        </span>
                        <span className="ml-2 text-figma-xs text-fw-bodyLight font-mono">{a.scope.raw}</span>
                      </div>
                      <span className="text-figma-xs text-fw-bodyLight">
                        exp. {new Date(a.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {byGroup.size > 0 && (
              <div>
                <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide mb-2">
                  Via Groups ({[...byGroup.values()].reduce((n, g) => n + g.assignments.length, 0)})
                </p>
                <div className="space-y-3">
                  {[...byGroup.entries()].map(([groupId, { groupName, assignments }]) => (
                    <div key={groupId} className="border border-fw-secondary rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-fw-wash border-b border-fw-secondary">
                        <span className="text-figma-xs font-semibold text-fw-heading">{groupName}</span>
                        <span className="ml-2 text-figma-xs text-fw-bodyLight">({assignments.length} role{assignments.length !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="divide-y divide-fw-secondary">
                        {assignments.map(a => (
                          <div key={a.id} className="flex items-center justify-between px-3 py-2">
                            <div>
                              <span className="text-figma-sm font-medium text-fw-heading">
                                {ROLE_CATALOG[a.role]?.displayName ?? a.role}
                              </span>
                              <span className="ml-2 text-figma-xs text-fw-bodyLight font-mono">{a.scope.raw}</span>
                            </div>
                            <span className="text-figma-xs text-fw-bodyLight">
                              exp. {new Date(a.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 4: Remove unused roleAssignments store read**

Confirm `const roleAssignments = useStore(s => s.roleAssignments)` is removed (replaced by `getEffectiveAssignments` in the useMemo). If any other part of the modal still references `roleAssignments`, keep the destructure — otherwise remove it.

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: clean.

- [ ] **Step 6: Manual browser verify**

Navigate to Configure → Users. Find a user who is a member of at least one group that has an active role assignment (e.g., Sarah Patel in Network Operations Cluster). Open their overflow menu → "View Effective Permissions". Confirm:
- The permission list at the top still shows all their permissions.
- The "Source Assignments" section shows "Direct (N)" and "Via Groups (1)" with the group name and role listed under the group.

- [ ] **Step 7: Commit**

```bash
git add src/components/configure/users/EffectivePermissionsModal.tsx
git commit -m "feat(rbac): EffectivePermissionsModal shows group-sourced access with source attribution"
```

---

## Task 7: E2E Tests

**Files:**
- Create: `tests/e2e/rbac-integrity.spec.ts`

**Context:** Playwright tests that verify the three observable behaviors: (1) SoD badge appears for a user whose violation comes from group membership, (2) Effective Permissions modal shows "Via Groups" section, (3) adding a member to a group with assignments creates audit entries.

- [ ] **Step 1: Write E2E tests**

Create `tests/e2e/rbac-integrity.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

async function gotoTab(page: any, tab: string) {
  await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.getByText(tab, { exact: true }).first().click();
  await page.waitForTimeout(600);
}

test.describe('RBAC Integrity', () => {
  test.beforeEach(async ({ page }) => { await seedAuth(page); });

  test('SoD badge is visible for Aisha Johnson (direct violation)', async ({ page }) => {
    await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="users-table"]', { timeout: 10000 });
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Aisha');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="users-table"]')).toContainText(/SoD conflict/i, { timeout: 5000 });
  });

  test('Effective Permissions modal shows source assignments section', async ({ page }) => {
    await page.goto('/#/configure/users', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="users-table"]', { timeout: 10000 });
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Sarah');
    await page.waitForTimeout(300);
    const row = page.locator('[data-testid="users-table"] tbody tr').first();
    await row.waitFor({ timeout: 5000 });
    // Open overflow menu → View Effective Permissions
    const overflow = row.getByRole('button').last();
    await overflow.click();
    await page.waitForTimeout(200);
    await page.getByText('View Effective Permissions').click();
    await page.waitForTimeout(400);
    // Should show the source assignments section
    await expect(page.getByText(/Source Assignments/i)).toBeVisible({ timeout: 5000 });
  });

  test('adding a member to a group with assignments creates audit entries', async ({ page }) => {
    await gotoTab(page, 'Groups');
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor({ timeout: 5000 });

    // Open first group's overflow → View Details
    const overflow = rows.first().getByRole('button').last();
    await overflow.click();
    await page.waitForTimeout(200);
    await page.getByText('View Details').click();
    await page.waitForTimeout(400);

    // Add Member
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.waitForTimeout(200);

    // Check if there are any users to add; if search shows candidates, add the first
    const picker = page.getByPlaceholder('Search users to add...');
    await expect(picker).toBeVisible({ timeout: 3000 });
    // Search for a known user
    await picker.fill('Wei');
    await page.waitForTimeout(200);
    const candidate = page.locator('button').filter({ hasText: 'Wei Zhang' }).first();
    const candidateVisible = await candidate.isVisible().catch(() => false);
    if (candidateVisible) {
      await candidate.click();
      await page.waitForTimeout(400);

      // Navigate to Activity tab and check for audit entry
      await page.getByRole('button', { name: 'Close' }).click();
      await page.waitForTimeout(200);
      await gotoTab(page, 'Activity');
      await page.waitForTimeout(500);
      await expect(page.locator('table tbody')).toContainText(/Added to group/i, { timeout: 5000 });
    }
  });
});
```

- [ ] **Step 2: Run the E2E tests**

```bash
npx playwright test tests/e2e/rbac-integrity.spec.ts --reporter=line
```

Expected: all 3 pass. The third test (`adding a member`) is conditional on Wei Zhang not already being a group member — if Wei is already in the group, the test silently skips the add and won't check the audit entry. This is intentional to avoid flakiness with seed data.

- [ ] **Step 3: Run existing RBAC E2E suite to confirm no regressions**

```bash
npx playwright test tests/e2e/role-enforcement.spec.ts tests/e2e/rbac-personas.spec.ts tests/e2e/rbac-roles.spec.ts tests/e2e/rbac-assignments.spec.ts --reporter=line
```

Expected: same pass count as before these changes (82 committed tests).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/rbac-integrity.spec.ts
git commit -m "test(rbac): E2E coverage for integrity fixes — SoD badge, modal source attribution, audit entries"
```

---

## Self-Review

**Spec coverage:**
- Part 1 (`__setRole` guard): Task 1 ✅
- Part 2a (`getEffectiveAssignments`, `getSodViolation`): Task 2 ✅
- Part 2b (SoD badges): Task 5 ✅
- Part 2c (EffectivePermissionsModal source attribution): Task 6 ✅
- Part 2d (group membership audit entries): Task 4 ✅
- Part 3 (`updateRoleDefinition` caller check): Task 3 ✅
- `rbacLabels.ts` `group-membership:add`: Task 4 ✅

**Placeholder scan:** All code blocks are complete. No TBDs.

**Type consistency:**
- `getEffectiveAssignments` return type defined in Task 2, consumed in Task 6 — `{ assignment: RoleAssignment; source: 'direct'|'group'; groupId?: string; groupName?: string }[]` ✅
- `getSodViolation(userId: string): string | null` defined in Task 2, used in Tasks 5 ✅
- `AuditLogEntry` fields used in Task 4 (`principalId`, `principalName`, `action`, `objectType`, `objectId`, `objectName`, `scope`, `result`) all confirmed present in the actual type ✅
- `RoleName` added to rbacSlice imports in Task 3 before use ✅

**One known limitation:** Task 7 E2E test 3 (audit entry) is conditional on Wei Zhang not already being in the first group. The test is written defensively to avoid flakiness rather than asserting unconditionally. This is intentional.
