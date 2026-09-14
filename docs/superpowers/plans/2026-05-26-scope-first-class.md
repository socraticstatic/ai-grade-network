# Scope as First-Class RBAC Dimension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make scope a proper RBAC axis — unified type vocabulary, real `RoleAssignment` data in the store, consistent `ResourceFilterBadge` display everywhere scope appears, and the RBAC demo panel showcasing scope as a distinct dimension alongside role.

**Architecture:** `ResourceFilter` (from `src/types/scope.ts`) is the canonical UI vocabulary for scope breadth. `ScopePath` (hierarchical string like `/tenants/TNT-001/departments/dept-network`) is the canonical runtime value for permission checking. `ScopeBadge.tsx` is dead code — `ResourceFilterBadge.tsx` already exports a compat `ScopeBadge` wrapper. The store gets a `rbacSlice` that seeds `scopeAwarePermissionChecker` with real `RoleAssignment[]` at startup so `hasPermission` actually checks scope paths.

**Tech Stack:** TypeScript, React 19, Zustand, Vitest/jsdom

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types/user.ts` | Modify | Add `tenantId`, `departmentId?`, `scopePath` to `User`; export `UserType` as alias |
| `src/data/sampleData.ts` | Modify | Update `sampleUsers` with scope fields + add current-user (Emilio) |
| `src/data/sampleRoleAssignments.ts` | Create | `RoleAssignment[]` for all 7 demo users |
| `src/store/slices/rbacSlice.ts` | Create | Holds assignments, wires checker, exposes `currentUserId` |
| `src/store/useStore.ts` | Modify | Import + include `RbacSlice` |
| `src/components/common/ScopeBadge.tsx` | Delete | Dead code; `ResourceFilterBadge.tsx` has a compat `ScopeBadge` already |
| `src/components/configure/users/UserList.tsx` | Modify | Fix imports, scope column uses `ResourceFilterBadge`, stat strip uses badges |
| `src/components/configure/users/ConnectionAccessDrawer.tsx` | Modify | Fix import, derive scope from `user.scopePath` instead of role-string inference |
| `src/components/common/RBACDemoPanel.tsx` | Modify | Add scope hierarchy section (breadcrumb + explanation) |
| `src/utils/scopeUtils.ts` | Create | `scopePathToFilter(path): ResourceFilter` — used by multiple components |
| `src/utils/scopeUtils.test.ts` | Create | Unit tests for scopePathToFilter |
| `src/store/slices/rbacSlice.test.ts` | Create | Unit tests for slice init + assignment loading |

---

## Task 1: Add scope fields to `User` type

**Files:**
- Modify: `src/types/user.ts`

- [ ] **Step 1: Write the failing typecheck**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no current errors (baseline)

- [ ] **Step 2: Update `src/types/user.ts`**

Replace the entire file with:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastActive: string;
  avatar?: string;
  department?: string;
  tenantId: string;
  departmentId?: string;
  scopePath: string;
  connectionAccess: Array<{
    connectionId: string;
    name: string;
    permissions: string[];
  }>;
}

// UserType is identical to User — kept as alias for configure/users components
export type UserType = User;
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: errors only about missing `tenantId`/`scopePath` in sample data (not yet fixed) — no structural errors

- [ ] **Step 4: Commit**

```bash
git add src/types/user.ts
git commit -m "feat(scope): add tenantId, departmentId, scopePath to User type"
```

---

## Task 2: Update sample data with scope fields

**Files:**
- Modify: `src/data/sampleData.ts`

- [ ] **Step 1: Add the Emilio Estevez current-user and update all sampleUsers**

Find the `awsUsers`, `azureUsers`, `googleUsers` arrays (lines ~338–403) and the `sampleUsers` export (line ~404). Replace the user arrays and export with:

```typescript
const awsUsers: User[] = [
  {
    id: 'user-1',
    name: 'Sarah Patel',
    email: 'sarah.chen@example.com',
    role: 'Network Administrator',
    status: 'active',
    lastActive: new Date().toISOString(),
    department: 'Network Engineering',
    tenantId: 'TNT-001',
    departmentId: 'dept-network',
    scopePath: '/tenants/TNT-001/departments/dept-network',
    connectionAccess: [createConnectionAccess('conn-1', 'Internet to AWS Cloud', ['view', 'manage', 'monitor', 'configure'])],
  },
  {
    id: 'user-2',
    name: 'Michael Rodriguez',
    email: 'michael.r@example.com',
    role: 'Security Engineer',
    status: 'active',
    lastActive: new Date().toISOString(),
    department: 'Security Operations',
    tenantId: 'TNT-001',
    departmentId: 'dept-security',
    scopePath: '/tenants/TNT-001/departments/dept-security',
    connectionAccess: [createConnectionAccess('conn-1', 'Internet to AWS Cloud', ['view', 'monitor', 'configure'])],
  },
];

const azureUsers: User[] = [
  {
    id: 'user-3',
    name: 'David Kim',
    email: 'david.kim@example.com',
    role: 'Network Administrator',
    status: 'active',
    lastActive: new Date().toISOString(),
    department: 'Network Engineering',
    tenantId: 'TNT-001',
    departmentId: 'dept-network',
    scopePath: '/tenants/TNT-001/departments/dept-network',
    connectionAccess: [createConnectionAccess('conn-2', 'Internet to Azure Cloud', ['view', 'manage', 'monitor', 'configure'])],
  },
  {
    id: 'user-4',
    name: 'Lisa Martinez',
    email: 'lisa.m@example.com',
    role: 'Security Analyst',
    status: 'active',
    lastActive: new Date().toISOString(),
    department: 'Security Operations',
    tenantId: 'TNT-001',
    departmentId: 'dept-security',
    scopePath: '/tenants/TNT-001/departments/dept-security',
    connectionAccess: [createConnectionAccess('conn-2', 'Internet to Azure Cloud', ['view', 'monitor', 'configure'])],
  },
];

const googleUsers: User[] = [
  {
    id: 'user-5',
    name: 'Thomas Anderson',
    email: 'thomas.a@example.com',
    role: 'Network Administrator',
    status: 'active',
    lastActive: new Date().toISOString(),
    department: 'Network Engineering',
    tenantId: 'TNT-001',
    departmentId: 'dept-network',
    scopePath: '/tenants/TNT-001/departments/dept-network',
    connectionAccess: [createConnectionAccess('conn-3', 'Internet to Google Cloud', ['view', 'manage', 'monitor', 'configure'])],
  },
  {
    id: 'user-6',
    name: 'Sophia Lee',
    email: 'sophia.l@example.com',
    role: 'Security Engineer',
    status: 'active',
    lastActive: new Date().toISOString(),
    department: 'Security Operations',
    tenantId: 'TNT-001',
    departmentId: 'dept-security',
    scopePath: '/tenants/TNT-001/departments/dept-security',
    connectionAccess: [createConnectionAccess('conn-3', 'Internet to Google Cloud', ['view', 'monitor', 'configure'])],
  },
];

// The logged-in platform user — not in the users table but needs an assignment
export const currentUser: User = {
  id: 'emilio-estevez',
  name: 'Emilio Estevez',
  email: 'emilio.estevez@att.com',
  role: 'Network Administrator',
  status: 'active',
  lastActive: new Date().toISOString(),
  department: 'Platform',
  tenantId: 'TNT-001',
  scopePath: '/tenants/TNT-001',
  connectionAccess: [],
};

export const sampleUsers: User[] = [...awsUsers, ...azureUsers, ...googleUsers];
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: 0 errors (or only pre-existing unrelated errors)

- [ ] **Step 3: Commit**

```bash
git add src/data/sampleData.ts
git commit -m "feat(scope): add scope fields and Emilio currentUser to sample data"
```

---

## Task 3: Create `sampleRoleAssignments.ts`

**Files:**
- Create: `src/data/sampleRoleAssignments.ts`

- [ ] **Step 1: Create the file**

```typescript
import { RoleAssignment } from '../types/roleAssignment';
import { sampleUsers, currentUser } from './sampleData';

// Maps freeform user role strings to RBAC Role values
function inferRbacRole(userRole: string): 'user' | 'admin' | 'super-admin' {
  const lower = userRole.toLowerCase();
  if (lower.includes('admin') || lower.includes('administrator')) return 'admin';
  return 'user';
}

function makeAssignment(
  user: { id: string; role: string; scopePath: string },
  overrideRole?: 'user' | 'admin' | 'super-admin'
): RoleAssignment {
  return {
    id: `ra-${user.id}`,
    principalId: user.id,
    principalType: 'user',
    principalName: (user as any).name,
    role: overrideRole ?? inferRbacRole(user.role),
    scope: user.scopePath,
    assignedBy: 'emilio-estevez',
    assignedAt: new Date('2025-01-01'),
    status: 'active',
  };
}

// Build assignments for all sample users
const userAssignments: RoleAssignment[] = sampleUsers.map(u => makeAssignment(u));

// Emilio is tenant admin at the tenant scope
const currentUserAssignment: RoleAssignment = makeAssignment(currentUser, 'admin');

export const sampleRoleAssignments: RoleAssignment[] = [
  ...userAssignments,
  currentUserAssignment,
];

// Indexed by userId for O(1) lookup
export const roleAssignmentsByUserId: Record<string, RoleAssignment[]> = {};
for (const assignment of sampleRoleAssignments) {
  if (!roleAssignmentsByUserId[assignment.principalId]) {
    roleAssignmentsByUserId[assignment.principalId] = [];
  }
  roleAssignmentsByUserId[assignment.principalId].push(assignment);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/data/sampleRoleAssignments.ts
git commit -m "feat(scope): add sample RoleAssignment data for all demo users"
```

---

## Task 4: Create `scopeUtils.ts` + tests

**Files:**
- Create: `src/utils/scopeUtils.ts`
- Create: `src/utils/scopeUtils.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/utils/scopeUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scopePathToFilter, scopeDepthLabel } from './scopeUtils';

describe('scopePathToFilter', () => {
  it('returns all-tenants for platform scope', () => {
    expect(scopePathToFilter('/platform')).toBe('all-tenants');
  });

  it('returns my-tenant for tenant scope', () => {
    expect(scopePathToFilter('/tenants/TNT-001')).toBe('my-tenant');
  });

  it('returns my-department for department scope', () => {
    expect(scopePathToFilter('/tenants/TNT-001/departments/dept-network')).toBe('my-department');
  });

  it('returns my-pools for pool scope', () => {
    expect(scopePathToFilter('/tenants/TNT-001/departments/dept-network/pools/pool-1')).toBe('my-pools');
  });

  it('returns owned-by-me for empty/unknown scope', () => {
    expect(scopePathToFilter('')).toBe('owned-by-me');
    expect(scopePathToFilter('/unknown')).toBe('owned-by-me');
  });
});

describe('scopeDepthLabel', () => {
  it('returns breadcrumb segments for tenant scope', () => {
    expect(scopeDepthLabel('/tenants/TNT-001')).toEqual(['Platform', 'Tenant']);
  });

  it('returns breadcrumb segments for department scope', () => {
    expect(scopeDepthLabel('/tenants/TNT-001/departments/dept-network')).toEqual([
      'Platform', 'Tenant', 'Department'
    ]);
  });

  it('returns Platform only for platform scope', () => {
    expect(scopeDepthLabel('/platform')).toEqual(['Platform']);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/utils/scopeUtils.test.ts 2>&1 | tail -10`
Expected: FAIL — `scopeUtils` module not found

- [ ] **Step 3: Implement `src/utils/scopeUtils.ts`**

```typescript
import { ResourceFilter } from '../types/scope';
import { ScopePathBuilder } from '../types/scope';

/**
 * Converts a hierarchical scope path to the ResourceFilter that represents
 * the breadth of access at that scope level.
 */
export function scopePathToFilter(path: string): ResourceFilter {
  if (!path) return 'owned-by-me';
  const depth = ScopePathBuilder.getDepth(path);
  if (path === '/platform') return 'all-tenants';
  if (depth === 1) return 'my-tenant';
  if (depth === 2) return 'my-department';
  if (depth >= 3) return 'my-pools';
  return 'owned-by-me';
}

/**
 * Returns ordered breadcrumb labels for a scope path.
 * e.g. '/tenants/TNT-001/departments/dept-x' → ['Platform', 'Tenant', 'Department']
 */
export function scopeDepthLabel(path: string): string[] {
  if (!path || path === '/platform') return ['Platform'];
  const depth = ScopePathBuilder.getDepth(path);
  const labels = ['Platform'];
  if (depth >= 1) labels.push('Tenant');
  if (depth >= 2) labels.push('Department');
  if (depth >= 3) labels.push('Pool');
  return labels;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/utils/scopeUtils.test.ts 2>&1 | tail -10`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/scopeUtils.ts src/utils/scopeUtils.test.ts
git commit -m "feat(scope): add scopePathToFilter + scopeDepthLabel utils with tests"
```

---

## Task 5: Create `rbacSlice.ts`

**Files:**
- Create: `src/store/slices/rbacSlice.ts`
- Create: `src/store/slices/rbacSlice.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `src/store/slices/rbacSlice.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { scopeAwarePermissionChecker } from '../../utils/scopeAwarePermissionChecker';
import { sampleRoleAssignments, roleAssignmentsByUserId } from '../../data/sampleRoleAssignments';

describe('rbacSlice initialization', () => {
  beforeEach(() => {
    // Seed the checker directly (same logic the slice uses)
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
    // dept-network assignment does NOT cover dept-security
    expect(result.allowed).toBe(false);
    expect(result.limitedBy).toBe('scope');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/store/slices/rbacSlice.test.ts 2>&1 | tail -15`
Expected: FAIL — `sampleRoleAssignments` module resolves but checker has no assignments yet

- [ ] **Step 3: Create `src/store/slices/rbacSlice.ts`**

```typescript
import { StateCreator } from 'zustand';
import { RoleAssignment } from '../../types/roleAssignment';
import { scopeAwarePermissionChecker } from '../../utils/scopeAwarePermissionChecker';
import { sampleRoleAssignments, roleAssignmentsByUserId } from '../../data/sampleRoleAssignments';

export interface RbacSlice {
  currentUserId: string;
  roleAssignments: RoleAssignment[];
  loadAssignmentsForUser: (userId: string, assignments: RoleAssignment[]) => void;
}

export const createRbacSlice: StateCreator<RbacSlice> = (set) => {
  // Seed checker with sample data on store creation
  for (const [userId, assignments] of Object.entries(roleAssignmentsByUserId)) {
    scopeAwarePermissionChecker.loadUserAssignments(userId, assignments);
  }

  return {
    currentUserId: 'emilio-estevez',
    roleAssignments: sampleRoleAssignments,

    loadAssignmentsForUser: (userId, assignments) => {
      scopeAwarePermissionChecker.loadUserAssignments(userId, assignments);
      set((state) => ({
        roleAssignments: [
          ...state.roleAssignments.filter(a => a.principalId !== userId),
          ...assignments,
        ],
      }));
    },
  };
};
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store/slices/rbacSlice.test.ts 2>&1 | tail -15`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/rbacSlice.ts src/store/slices/rbacSlice.test.ts
git commit -m "feat(scope): rbacSlice seeds scopeAwarePermissionChecker at store init"
```

---

## Task 6: Wire `rbacSlice` into `useStore.ts`

**Files:**
- Modify: `src/store/useStore.ts`

- [ ] **Step 1: Add import and interface**

In `src/store/useStore.ts`, add to the imports block:
```typescript
import { createRbacSlice, RbacSlice } from './slices/rbacSlice';
```

Add `RbacSlice` to the `Store` interface (around line 53):
```typescript
interface Store extends
  ConnectionSlice,
  AlertSlice,
  UserSlice,
  UISlice,
  WidgetSlice,
  GroupSlice,
  RuleSlice,
  AgenticSlice,
  APIToolboxSlice,
  NotificationSlice,
  FontSizeSlice,
  ColumnVisibilitySlice,
  DetachedWindowSlice,
  KeyboardShortcutsSlice,
  RoleSlice,
  BillingSlice,
  TenantContextSlice,
  RbacSlice {}   // ← add this
```

- [ ] **Step 2: Add `createRbacSlice` to the store factory**

Find where other slices are spread in `create<Store>((set, get) => { ... })` (look for `...createRoleSlice(set, get, store)` or similar patterns). Add:

```typescript
...createRbacSlice(set, get, store),
```

alongside the other slice spreads.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 new errors

- [ ] **Step 4: Commit**

```bash
git add src/store/useStore.ts
git commit -m "feat(scope): wire rbacSlice into useStore"
```

---

## Task 7: Delete `ScopeBadge.tsx`, fix imports

> `ScopeBadge.tsx` is dead — no component outside the file itself imports `TenantBadge`, `AccessPath`, or `ScopeFilterPills`. `ResourceFilterBadge.tsx` already exports a compat `ScopeBadge` wrapper that handles both `ScopeLevel` and `ResourceFilter` input.

**Files:**
- Delete: `src/components/common/ScopeBadge.tsx`
- Modify: `src/components/configure/users/UserList.tsx`
- Modify: `src/components/configure/users/ConnectionAccessDrawer.tsx`

- [ ] **Step 1: Update UserList.tsx import**

Find: `import { ScopeBadge } from '../../common/ScopeBadge';`
Replace with: `import { ResourceFilterBadge } from '../../common/ResourceFilterBadge';`

- [ ] **Step 2: Update ConnectionAccessDrawer.tsx import**

Find: `import { ScopeBadge } from '../../common/ScopeBadge';`
Replace with: `import { ResourceFilterBadge } from '../../common/ResourceFilterBadge';`

- [ ] **Step 3: Delete the file**

```bash
rm src/components/common/ScopeBadge.tsx
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: errors about `ScopeBadge` being used in the two files — fix any remaining `<ScopeBadge ...>` JSX usages to `<ResourceFilterBadge filter={...} />` (the filter prop takes `ResourceFilter`). The compat `ScopeBadge` from `ResourceFilterBadge.tsx` is also importable if needed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(scope): delete ScopeBadge.tsx — replaced by ResourceFilterBadge"
```

---

## Task 8: Fix UserList scope column

**Files:**
- Modify: `src/components/configure/users/UserList.tsx`

- [ ] **Step 1: Remove `getScopeForUser` and the ad-hoc scope text**

Delete `getScopeForUser` (lines ~120–124).

Replace the `'scope'` column `render` function (currently around lines 187–200) with:

```typescript
{
  id: 'scope',
  label: 'Access Scope',
  render: (user: UserType) => {
    const defaultFilter = scopePathToFilter(user.scopePath);
    const mappedRole = mapUserRole(user.role);
    const maxFilter = permissionChecker.getMaxScope(mappedRole);
    return (
      <div className="flex flex-col gap-1.5">
        <ResourceFilterBadge filter={defaultFilter} variant="detailed" />
        <span className="text-figma-xs text-fw-bodyLight">
          Max: <ResourceFilterBadge filter={maxFilter} showIcon={false} />
        </span>
      </div>
    );
  }
},
```

- [ ] **Step 2: Add the import for `scopePathToFilter`**

```typescript
import { scopePathToFilter } from '../../../utils/scopeUtils';
```

- [ ] **Step 3: Fix the stat strip scope display (lines ~263–266)**

Replace the raw-text scope display:
```tsx
Your scope: <span className="font-semibold text-fw-heading capitalize">{permissionChecker.getDefaultScope(currentRole)}</span>
<span className="mx-1.5 text-fw-disabled">·</span>
Max: <span className="font-semibold text-fw-heading capitalize">{permissionChecker.getMaxScope(currentRole)}</span>
```

With:
```tsx
Your scope: <ResourceFilterBadge filter={permissionChecker.getDefaultScope(currentRole)} showIcon={false} />
<span className="mx-1.5 text-fw-disabled">·</span>
Max: <ResourceFilterBadge filter={permissionChecker.getMaxScope(currentRole)} showIcon={false} />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/configure/users/UserList.tsx
git commit -m "fix(scope): UserList scope column uses ResourceFilterBadge from actual scopePath"
```

---

## Task 9: Fix ConnectionAccessDrawer

**Files:**
- Modify: `src/components/configure/users/ConnectionAccessDrawer.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { ResourceFilterBadge } from '../../common/ResourceFilterBadge';
import { scopePathToFilter } from '../../../utils/scopeUtils';
```

Remove the old `ScopeBadge` import.

- [ ] **Step 2: Replace scope derivation (around lines 126–148)**

Find the user info banner's scope line:
```tsx
<ScopeBadge
  scope={permissionChecker.getDefaultScope(
    user.role.toLowerCase().includes('admin') ? 'admin' : 'user'
  )}
  showIcon={false}
/>
```

Replace with:
```tsx
<ResourceFilterBadge
  filter={scopePathToFilter(user.scopePath)}
  showIcon={false}
/>
```

Find the "Scope Limitations" text:
```tsx
User's role limits access to connections within their {permissionChecker.getDefaultScope(
  user.role.toLowerCase().includes('admin') ? 'admin' : 'user'
)} scope.
```

Replace with:
```tsx
User's role limits access to connections within their{' '}
<ResourceFilterBadge
  filter={scopePathToFilter(user.scopePath)}
  showIcon={false}
/>{' '}scope.
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/configure/users/ConnectionAccessDrawer.tsx
git commit -m "fix(scope): ConnectionAccessDrawer derives scope from user.scopePath"
```

---

## Task 10: Add scope hierarchy section to RBACDemoPanel

**Files:**
- Modify: `src/components/common/RBACDemoPanel.tsx`

The RBAC demo panel currently shows role → default filter + max filter but nothing about scope paths. Add a "Scope Hierarchy" section that shows the current user's scope as a breadcrumb and explains what it means.

- [ ] **Step 1: Add imports**

```typescript
import { scopeDepthLabel, scopePathToFilter } from '../../utils/scopeUtils';
import { ResourceFilterBadge } from './ResourceFilterBadge';
import { useStore } from '../../store/useStore';
// currentUser for the current scope path
import { currentUser } from '../../data/sampleData';
```

(Remove any duplicate `ResourceFilterBadge` import if already present.)

- [ ] **Step 2: Derive scope data from the current role**

Inside `RBACDemoPanel`, after the existing `const { currentRole, setRole } = useStore();` line, add:

```typescript
// Map currentRole to a scope path for demo purposes
const scopeByRole: Record<string, string> = {
  'user': '/tenants/TNT-001/departments/dept-network',
  'admin': '/tenants/TNT-001',
  'super-admin': '/platform',
};
const demoScopePath = scopeByRole[currentRole] ?? '/tenants/TNT-001';
const breadcrumb = scopeDepthLabel(demoScopePath);
const scopeFilter = scopePathToFilter(demoScopePath);
```

- [ ] **Step 3: Insert the Scope Hierarchy section**

Find the existing "Current Permissions" section in the render (where `ResourceFilterBadge` for default/max filter appears — around lines 190–210). Insert **before** that section:

```tsx
{/* Scope Hierarchy */}
<div className="mt-4 p-4 bg-fw-wash border border-fw-secondary rounded-xl">
  <div className="flex items-center gap-2 mb-3">
    <Layers className="h-4 w-4 text-fw-link" />
    <span className="text-figma-sm font-semibold text-fw-heading">Scope Hierarchy</span>
  </div>
  <p className="text-figma-xs text-fw-bodyLight mb-3">
    Scope defines WHERE permissions apply. The same role at a narrower scope cannot see resources outside it.
  </p>

  {/* Breadcrumb */}
  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
    {breadcrumb.map((label, i) => (
      <div key={label} className="flex items-center gap-1.5">
        <span className={`px-2 py-0.5 rounded text-figma-xs font-medium border ${
          i === breadcrumb.length - 1
            ? 'bg-fw-blue-light text-fw-link border-fw-active'
            : 'bg-fw-wash text-fw-bodyLight border-fw-secondary'
        }`}>
          {label}
        </span>
        {i < breadcrumb.length - 1 && (
          <ChevronRight className="h-3 w-3 text-fw-disabled" />
        )}
      </div>
    ))}
  </div>

  {/* Scope filter badge */}
  <div className="flex items-center gap-2">
    <span className="text-figma-xs text-fw-bodyLight">Effective access:</span>
    <ResourceFilterBadge filter={scopeFilter} variant="detailed" />
  </div>
</div>
```

Make sure `ChevronRight` is imported from `lucide-react` (it's likely already imported).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/common/RBACDemoPanel.tsx
git commit -m "feat(scope): add scope hierarchy breadcrumb to RBAC demo panel"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run 2>&1 | tail -20`
Expected: all tests PASS (including new scopeUtils and rbacSlice tests)

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit 2>&1`
Expected: 0 errors

- [ ] **Step 3: Start dev server and verify in browser**

Run: `npm run dev` and open the app.

Check these paths:
1. Configure → Users → "Access Scope" column shows colored `ResourceFilterBadge` pills (not raw text)
2. Click a user's "Manage Access" — drawer shows scope badge derived from user's `scopePath`, not role inference
3. RBAC Demo Panel (if accessible) — shows "Scope Hierarchy" breadcrumb that changes as you switch roles: user shows `Platform → Tenant → Department`, admin shows `Platform → Tenant`, super-admin shows `Platform`
4. `npm run typecheck` clean

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "fix(scope): post-verification cleanup"
```

---

## Self-Review

**Spec coverage:**
- [x] Unified type vocabulary (ResourceFilter everywhere, ScopeLevel killed)
- [x] User type has tenantId/departmentId/scopePath
- [x] Real RoleAssignment data for all demo users
- [x] scopeAwarePermissionChecker wired at store startup
- [x] ResourceFilterBadge used consistently in UserList + ConnectionAccessDrawer
- [x] RBAC demo panel shows scope as first-class dimension
- [x] scopePathToFilter tested

**Placeholder scan:** No TBDs, all code blocks are complete.

**Type consistency:**
- `scopePathToFilter` defined in Task 4, used in Tasks 8 + 9 — matches
- `scopeDepthLabel` defined in Task 4, used in Task 10 — matches
- `ResourceFilterBadge` imported from `ResourceFilterBadge.tsx` in all tasks — consistent
- `RoleAssignment.role` type is `'user' | 'admin' | 'super-admin'` (from `permissions.ts`) — `inferRbacRole` returns the same union — consistent
- `currentUser` exported from `sampleData.ts` in Task 2, imported in Task 10 — consistent
