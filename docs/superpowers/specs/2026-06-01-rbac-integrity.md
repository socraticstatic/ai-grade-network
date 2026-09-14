# RBAC Integrity — Design Spec

**Status:** DRAFT

**Addresses:**
- Use case 29: `window.__setRole` bypasses all UI gates
- Use case 31: group membership grants invisible admin access with no audit trail
- Use case 23: `role:write` self-escalation bypasses caller permission check in store

---

## Background

Three structural gaps were identified through analysis of AWS, GCP, and Azure IAM failures:

1. **`window.__setRole` exposed without dev guard.** Any browser console call or E2E script can set `currentRole = 'super-admin'` and open every UI gate, regardless of what RBAC assignments the user holds. The UI gates (ConfigureHub Platform Admin tab, BillingConfiguration controls, SystemSettings lock overlay) all check `currentRole` via the old permission system. They read correctly under normal demo use — but the bypass exists unconditionally in all builds.

2. **SoD badge and Effective Permissions modal miss group-sourced access.** `permissionResolver.checkSoD` uses `collectAssignments` which traverses group membership. It correctly detects cross-group SoD violations. But the UI SoD badges in `UserList` and `AssignmentManagement` compute SoD independently from the store's `roleAssignments` array — they never call the resolver and miss group-sourced roles entirely. Additionally, `EffectivePermissionsModal` only reads `roleAssignments.filter(a => a.principal.id === user.id)` for its "Source Assignments" panel — direct assignments only. Group-sourced permissions appear in the permission list (because `getEffectivePermissions` is correct) but their source is invisible. A compliance auditor sees the permissions but cannot trace them.

3. **`updateRoleDefinition` store action has no caller permission check.** The UI's `PermissionsMatrixEditor` only shows permissions the caller holds, preventing accidental self-escalation through the UI. But the Zustand store action itself accepts any `updates.permissions` payload with no validation. Any developer console call (`useStore.getState().updateRoleDefinition('NetworkEngineer', { permissions: ['system:administer'] })`) bypasses the UI filter entirely. For a demo, this undermines the "role:write" permission's stated purpose.

---

## What Is Not In Scope

- **Making `currentRole` a derived/computed value.** The two-plane architecture is intentional for the demo. DemoBar SCENARIOS, UserProfile role cards, and impersonation all call `setRole(tier)` independently of persona selection. These are legitimate coarse role switches for demo storytelling. Removing independent role setting breaks them.

- **`system:read` and `api:write` data contracts.** These permissions have no backend enforcement surface in a SPA. Defining their contract here would be aspirational, not implementable.

- **Emergency time window override.** Out of scope for this spec — deserves its own design.

---

## Part 1 — Seal `window.__setRole`

### Problem

```typescript
// App.tsx line 336 — unconditional exposure
useEffect(() => { (window as any).__setRole = setRole; }, [setRole]);
```

This exists to support E2E Playwright tests that call `window.__setRole('super-admin')` to set up ConfigureHub tab state before assertions. It is exposed in all builds.

### Fix

Gate behind `import.meta.env.DEV`:

```typescript
// App.tsx — only expose in development/test builds
useEffect(() => {
  if (import.meta.env.DEV) {
    (window as any).__setRole = setRole;
    (window as any).__setActivePersona = setActivePersona;
  }
}, [setRole, setActivePersona]);
```

`__setActivePersona` is added alongside it. The E2E `switchRole` helper in `tests/e2e/helpers.ts` continues to work because Playwright runs against the Vite dev server (`import.meta.env.DEV = true`).

In a production build (`npm run build`), neither function is exposed. The ConfigureHub bypass described in use case 29 is eliminated.

### E2E impact

The existing `switchRole(page, 'super-admin')` calls in `role-enforcement.spec.ts` continue to work in dev mode. No test changes required.

---

## Part 2 — Path-to-Privilege Visibility

Three changes. All read from `permissionResolver`, not from the raw store.

### 2a — Refactor `permissionResolver`: new public methods + internal dedup

**`getEffectiveAssignments` (new public method)** replaces `collectAssignments` as the internal implementation. `collectAssignments` becomes a thin wrapper:

```typescript
// NEW public method — source of truth for all assignment traversal
getEffectiveAssignments(
  userId: string,
  now = new Date()
): Array<{
  assignment: RoleAssignment;
  source: 'direct' | 'group';
  groupId?: string;
  groupName?: string;
}> {
  const result: Array<{assignment: RoleAssignment; source: 'direct'|'group'; groupId?: string; groupName?: string}> = [];

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

// UPDATED private method — now delegates to getEffectiveAssignments
private collectAssignments(userId: string, now: Date): RoleAssignment[] {
  return this.getEffectiveAssignments(userId, now).map(e => e.assignment);
}
```

**`getSodViolation` (new public method)** exposes the private `checkSoD`:

```typescript
getSodViolation(userId: string): string | null {
  return this.checkSoD(userId, new Date());
}
```

No existing behavior changes — `collectAssignments` returns the same values as before, just delegating internally.

### 2b — Fix UI SoD badges

**UserList.tsx** — replace manual SoD computation:

```typescript
// Before: manual store lookup
const hasViolation = SOD_CONSTRAINTS.some(c => {
  const [a, b] = c.mutuallyExclusiveRoles;
  return roles.includes(a) && roles.includes(b);
});

// After: resolver-based (includes group-sourced roles)
const violation = permissionResolver.getSodViolation(user.id);
const conflictTitle = violation ?? '';
```

**AssignmentManagement.tsx** — replace `sodViolationTitles` computation with:

```typescript
// Deduplicate by principal — getSodViolation is O(groups × members), call once per user not once per assignment
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

This correctly flags assignments even when the SoD pair comes from one direct + one group-sourced assignment. Deduplication avoids calling `getSodViolation` N times for a user with N assignments.

### 2c — Source attribution in EffectivePermissionsModal

Replace the "Source Assignments" section with a grouped view that distinguishes direct from group-sourced access:

**New "Source Assignments" section structure:**

```
Source Assignments (3)

Direct (2)
  ▸ Network Engineer  /tenants/TNT-001/clients/CLT-A  exp. Mar 15
  ▸ Viewer            /tenants/TNT-001                exp. Dec 31

Via Groups (1)
  ▸ Network Operations Cluster
      ▸ Billing Admin  /tenants/TNT-001  exp. Jun 30
```

The "Via Groups" section makes use case 31 visible: an auditor checking User A now sees that their billing:finance access comes from group membership, not a direct assignment.

Implementation: `getEffectiveAssignments(user.id)` replaces the current `roleAssignments.filter(...)` call. Results are partitioned into `direct[]` and `byGroup: Map<groupId, {groupName, assignments[]}>`.

### 2d — Group membership audit entries

When `addAccessGroupMember` is called in the store and the group has active role assignments, emit one `AuditLogEntry` per inherited assignment:

```typescript
// In addAccessGroupMember, after updating state:
const group = get().accessGroups.find(g => g.id === groupId);
const groupAssignments = get().roleAssignments.filter(
  a => a.principal.id === groupId && a.status === 'active'
);
const roleDef = (roleId: string) =>
  get().roleDefinitions.find(r => r.id === roleId)?.displayName ?? roleId;

for (const ga of groupAssignments) {
  get().appendAuditEntry({
    id: `al-group-add-${Date.now()}-${ga.id}`,
    timestamp: new Date().toISOString(),
    principalId: member.userId,
    principalName: member.displayName,
    action: 'group-membership:add',
    objectType: 'group',
    objectId: groupId,
    objectName: `${group?.name ?? groupId} → ${roleDef(ga.role)}`,
    scope: ga.scope,
    result: 'ALLOW',
  });
}
```

`objectId` carries the groupId. `objectName` encodes both group name and inherited role (`"Network Operations Cluster → Network Engineer"`). No new fields on `AuditLogEntry` required — the type already has `objectId?: string` and `objectName?: string`.

Add `'group-membership:add'` to `ACTION_LABELS` in `rbacLabels.ts`:
```typescript
'group-membership:add': 'Added to group (role inherited)',
```

---

## Part 3 — Store-Level `role:write` Caller Check

### Problem

`updateRoleDefinition` in `rbacSlice.ts` accepts any `updates.permissions` without checking whether the caller holds those permissions.

### Fix

Add a caller check to the store action. The check uses `permissionResolver.getEffectivePermissions` against the caller's current scope:

```typescript
updateRoleDefinition: (id, updates) => {
  if (updates.permissions) {
    // currentUserScope is already ScopePath — no buildScopePath needed
    const callerScope = get().currentUserScope;
    const callerPerms = new Set(
      permissionResolver.getEffectivePermissions(
        get().currentUserId,
        callerScope,
        { request: { currentTime: new Date() } }
      )
    );

    const isBCTemplate = ROLE_CATALOG[id as RoleName] !== undefined;
    if (!isBCTemplate) {
      // Custom roles: caller can only grant what they hold
      const unauthorized = updates.permissions.filter(p => !callerPerms.has(p));
      if (unauthorized.length > 0) {
        console.warn(
          `[RBAC] updateRoleDefinition blocked: caller does not hold ${unauthorized.join(', ')}`
        );
        // Strip unauthorized permissions silently to avoid hard crash
        updates = {
          ...updates,
          permissions: updates.permissions.filter(p => callerPerms.has(p)),
        };
      }
    }
    // BC templates: only PlatformAdmin can edit; handled by UI gate
    // No store-level block for BC templates — the UI gate is authoritative
  }

  set(s => ({
    roleDefinitions: s.roleDefinitions.map(r =>
      r.id === id ? { ...r, ...updates } : r
    ),
  }));
  syncRoleDefs();
},
```

**Design note:** The store silently strips unauthorized permissions rather than throwing. This is appropriate for a demo SPA — hard throws in store actions cause React error boundaries to fire and white-screen the app. The `console.warn` provides a visible signal in dev tools.

---

## Files Touched

| File | Change |
|---|---|
| `src/App.tsx` | Gate `__setRole` + add `__setActivePersona` behind `import.meta.env.DEV` |
| `src/utils/permissionResolver.ts` | Add `getEffectiveAssignments()` and `getSodViolation()` public methods |
| `src/components/configure/users/EffectivePermissionsModal.tsx` | Replace direct-only source panel with direct + group breakdown |
| `src/components/configure/users/UserList.tsx` | SoD badge uses `permissionResolver.getSodViolation()` |
| `src/components/configure/users/AssignmentManagement.tsx` | SoD badge uses `permissionResolver.getSodViolation()` |
| `src/store/slices/rbacSlice.ts` | Add `updateRoleDefinition` caller permission check; add group membership audit entries to `addAccessGroupMember` |
| `src/utils/rbacLabels.ts` | Add `group-membership:add` to `ACTION_LABELS` |

No new files required. No existing public interfaces broken.

---

## Test Coverage

**Unit tests** (vitest):
- `permissionResolver.test.ts`: add test — user with group-sourced role shows SoD violation via `getSodViolation()`
- `permissionResolver.test.ts`: add test — `getEffectiveAssignments()` annotates group-sourced assignments with `source: 'group'`
- `rbacSlice.test.ts`: add test — `updateRoleDefinition` silently strips permissions the caller doesn't hold

**E2E tests** (Playwright):
- `role-enforcement.spec.ts`: confirm `window.__setRole` is still callable in dev mode (no regression)
- New test: `window.__setRole` is undefined in a production-mode build (requires a build step — can be a separate test task)
- New test: Effective Permissions modal for a user with group-sourced access shows "Via Groups" section
- New test: Adding a user to a group with active assignments emits audit entries for each inherited assignment

---

## Spec Self-Review

**Placeholder scan:** No TBDs. `getEffectiveAssignments` return shape is fully specified. Audit entry shape matches existing `AuditLogEntry` type.

**Internal consistency:** Part 2b (SoD badge fix) and Part 2c (modal fix) both depend on Part 2a (`getEffectiveAssignments` / `getSodViolation`). Part 2d (audit entries) is independent of 2a-2c. Part 3 (store caller check) is independent of Parts 1 and 2.

**Scope check:** Five independent changes, all additive. None requires architectural restructuring. Appropriate for a single plan → implementation cycle.

**Ambiguity check:**
- "silently strip unauthorized permissions" vs "throw" — resolved above: strip + warn. Reason: demo SPA, no backend, throws white-screen.
- BC template role editing (PlatformAdmin only) — explicitly out of scope for the store check. UI gate is authoritative. Documented.
- `__setRole` in production builds — explicitly removed. E2E tests continue to work in dev mode. Documented.
