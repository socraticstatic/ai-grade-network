# Group Edit — Three Strategic Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close three strategic gaps in the Edit Group feature: wrong permission gate, missing audit trail, and no downstream warning when scope ceiling is lowered.

**Architecture:** Three independent fixes applied in order. (1) Permission gate: split `canEditGroup` (user:write) from `canOperateGroup` (user:operate) in GroupManagement, propagate as `canEdit` prop to GroupDetailDrawer. (2) Audit trail: emit `AuditLogEntry` from `updateAccessGroup` in rbacSlice, capturing actor, changed fields, and new ceiling. (3) Cascade warning: after a ceiling-lowering save, detect over-ceiling role assignments via `detectCeilingConflicts`, emit one audit entry per conflict with action `group:ceiling-conflict`, show a warning toast.

**Tech Stack:** React 19, TypeScript strict, Zustand, Vitest, Playwright (E2E), Tailwind

---

## Mental Model

### Two Permission Levels
- `user:write` — create or edit a group definition (name, purpose, scope ceiling, owner). TenantAdmin has this.
- `user:operate` — change a group's operational state (suspend/reactivate). TenantAdmin also has this, but lower-tier roles may have operate without write.

The current code gates ALL three actions (Edit, Suspend, Delete) on `user:operate`. Edit must gate on `user:write`.

### Audit Entry Shape
```typescript
interface AuditLogEntry {
  id: string;           // 'al-grpedit-${Date.now()}'
  timestamp: string;    // new Date().toISOString()
  principalId: string;  // currentUserId — WHO did it
  principalName: string;
  action: string;       // 'group:update' | 'group:ceiling-conflict'
  objectType: string;   // 'group'
  objectId?: string;    // group.id
  objectName?: string;  // human description of the change
  scope: ScopePath;     // currentUserScope
  result: 'ALLOW' | 'DENY';
}
```

### Ceiling Conflict Detection
`detectCeilingConflicts(newCeiling, assignments)` in `src/utils/groupEdit.ts` returns assignments whose scope is BROADER than the new ceiling — i.e., they are now out-of-range. Pass the group's active role assignments (where `a.principal.id === group.id && a.status === 'active'`).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/components/configure/users/GroupManagement.tsx` | Add `canEditGroup` check; gate Edit item on it; pass `canEdit` to GroupDetailDrawer |
| Modify | `src/components/configure/users/GroupDetailDrawer.tsx` | Accept `canEdit?: boolean` prop; hide Edit button in footer when false |
| Modify | `src/store/slices/rbacSlice.ts` | Emit audit entry in `updateAccessGroup`; detect + warn on ceiling-lowering |
| Modify | `src/utils/groupLifecycle.test.ts` | Tests for audit emission and cascade detection |
| Modify | `tests/e2e/group-lifecycle.spec.ts` | E2E: Edit Group visible with write perm; hidden without |

---

## Task 1 — Permission Gate

**Files:**
- Modify: `src/components/configure/users/GroupManagement.tsx`
- Modify: `src/components/configure/users/GroupDetailDrawer.tsx`

- [ ] **Step 1: Add `canEditGroup` to GroupManagement**

In `src/components/configure/users/GroupManagement.tsx`, replace the two existing `can` calls with three:

```tsx
// Replace lines ~57–58 with:
const canCreateGroup  = permissionResolver.can(currentUserId, 'user:write',   currentUserScope, ctx).allowed;
const canEditGroup    = permissionResolver.can(currentUserId, 'user:write',   currentUserScope, ctx).allowed;
const canOperateGroup = permissionResolver.can(currentUserId, 'user:operate', currentUserScope, ctx).allowed;
```

> `canEditGroup` and `canCreateGroup` share the same gate now; keeping them separate makes future divergence explicit (e.g. if a scoped `group:write` permission is introduced later).

- [ ] **Step 2: Gate "Edit Group" overflow item on `canEditGroup`**

In the same file, the Edit Group overflow item currently uses `canOperateGroup`. Change it:

```tsx
// In the actions overflow, replace:
...(canOperateGroup ? [{
  id: 'edit',
  label: 'Edit Group',
  icon: <Pencil className="h-4 w-4" />,
  onClick: () => setDetailGroup({ group: g, editing: true }),
}] : []),

// With:
...(canEditGroup ? [{
  id: 'edit',
  label: 'Edit Group',
  icon: <Pencil className="h-4 w-4" />,
  onClick: () => setDetailGroup({ group: g, editing: true }),
}] : []),
```

- [ ] **Step 3: Pass `canEdit` to GroupDetailDrawer**

In the same file, update the GroupDetailDrawer render:

```tsx
{detailGroup && (
  <GroupDetailDrawer
    key={`${detailGroup.group.id}-${detailGroup.editing}`}
    isOpen={!!detailGroup}
    onClose={() => setDetailGroup(null)}
    group={detailGroup.group}
    initialEditing={detailGroup.editing}
    canEdit={canEditGroup}
  />
)}
```

- [ ] **Step 4: Add `canEdit` prop to GroupDetailDrawer**

In `src/components/configure/users/GroupDetailDrawer.tsx`, update the props interface:

```tsx
interface GroupDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  group: AccessGroup;
  initialEditing?: boolean;
  canEdit?: boolean;   // ← add this
}

export function GroupDetailDrawer({
  isOpen, onClose, group, initialEditing = false, canEdit = true
}: GroupDetailDrawerProps) {
```

- [ ] **Step 5: Gate the Edit button in the drawer footer**

In `GroupDetailDrawer.tsx`, find the footer's view-mode section (the `else` branch when `!editing`). The Edit button currently always renders:

```tsx
// Replace:
<Button variant="outline" icon={Pencil} onClick={enterEdit}>Edit</Button>

// With:
{canEdit && (
  <Button variant="outline" icon={Pencil} onClick={enterEdit}>Edit</Button>
)}
```

- [ ] **Step 6: Write E2E test for permission gate**

Add to `tests/e2e/group-lifecycle.spec.ts`:

```typescript
test('Edit Group appears in overflow for user with user:write', async ({ page }) => {
  await gotoGroups(page);
  const rows = page.locator('table tbody tr');
  await rows.first().waitFor({ timeout: 5000 });
  await rows.first().getByRole('button', { name: 'More options' }).click();
  await page.waitForTimeout(200);
  await expect(page.getByText('Edit Group')).toBeVisible({ timeout: 3000 });
});

test('Edit Group opens drawer in edit mode', async ({ page }) => {
  await gotoGroups(page);
  const rows = page.locator('table tbody tr');
  await rows.first().waitFor({ timeout: 5000 });
  await rows.first().getByRole('button', { name: 'More options' }).click();
  await page.waitForTimeout(200);
  await page.getByText('Edit Group').click();
  await page.waitForTimeout(400);
  // Drawer opens directly in edit mode — Save Changes button visible immediately
  await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible({ timeout: 5000 });
});
```

- [ ] **Step 7: Run E2E tests to verify**

```bash
npx playwright test tests/e2e/group-lifecycle.spec.ts --reporter=line
```

Expected: all tests pass.

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add src/components/configure/users/GroupManagement.tsx \
        src/components/configure/users/GroupDetailDrawer.tsx \
        tests/e2e/group-lifecycle.spec.ts
git commit -m "fix(groups): gate Edit Group on user:write; propagate canEdit to drawer footer"
```

---

## Task 2 — Audit Trail for Group Edits

**Files:**
- Modify: `src/store/slices/rbacSlice.ts`
- Modify: `src/utils/groupLifecycle.test.ts`

- [ ] **Step 1: Write the failing unit test**

Add to `src/utils/groupLifecycle.test.ts`:

```typescript
import { TENANT_SCOPE } from '../types/rbac';

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
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/utils/groupLifecycle.test.ts
```

Expected: FAIL — "entry is undefined" on the first test.

- [ ] **Step 3: Implement audit emission in `updateAccessGroup`**

In `src/store/slices/rbacSlice.ts`, replace the current `updateAccessGroup` implementation:

```typescript
updateAccessGroup: (id, updates) => {
  // Snapshot before
  const before = get().accessGroups.find(g => g.id === id);

  set(s => ({
    accessGroups: s.accessGroups.map(g => (g.id === id ? { ...g, ...updates } : g)),
  }));

  const updated = get().accessGroups.find(g => g.id === id);
  if (updated) permissionResolver.loadGroup(updated);

  // Emit audit entry — only when at least one field changed
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
},
```

- [ ] **Step 4: Run unit tests to verify they pass**

```bash
npx vitest run src/utils/groupLifecycle.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/store/slices/rbacSlice.ts src/utils/groupLifecycle.test.ts
git commit -m "feat(groups): emit group:update audit entry on group edit"
```

---

## Task 3 — Scope Ceiling Cascade Warning

**Files:**
- Modify: `src/store/slices/rbacSlice.ts`
- Modify: `src/utils/groupLifecycle.test.ts`

### Context

When a group's `scopeCeiling` is lowered, any role assignments the group holds at a broader scope are now outside the new ceiling. These assignments won't be automatically removed (that would require admin review), but they must be:
1. Flagged in the audit log with action `group:ceiling-conflict` (one entry per affected assignment)
2. Surfaced to the user immediately via a warning toast

`detectCeilingConflicts(newCeiling, assignments)` from `src/utils/groupEdit.ts` returns the conflicting assignments. It expects a `ScopePath` for the ceiling and an array of `RoleAssignment[]`.

**Important:** only check for conflicts when `updates.scopeCeiling` is present AND the new ceiling is narrower than the old one. "Narrower" means the new `path.raw` is longer than the old one (deeper scope path = more restrictive).

- [ ] **Step 1: Write the failing unit test**

Add these two imports to the **top** of `src/utils/groupLifecycle.test.ts` (alongside the existing imports):

```typescript
import { detectCeilingConflicts } from './groupEdit';
import { buildScopePath } from '../types/rbac';
```

Then add the following test suite to the bottom of that file:

describe('updateAccessGroup — ceiling cascade', () => {
  it('emits ceiling-conflict audit entries for over-ceiling assignments when ceiling is tightened', () => {
    const store = makeStore();

    // Group has a platform-level scope ceiling
    const group: AccessGroup = {
      ...MOCK_GROUP,
      id: 'group-ceiling-test',
      scopeCeiling: { path: buildScopePath('/') },
    };
    store.getState().addAccessGroup(group);

    // Group holds a role assignment at platform scope
    const platformAssignment = {
      id: 'ra-platform-1',
      principal: { id: 'group-ceiling-test', type: 'group' as const, displayName: 'Test Group' },
      role: 'NetworkEngineer' as any,
      scope: buildScopePath('/'),
      status: 'active' as const,
      justification: 'test',
      grantedBy: 'user-1',
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      approvedBy: 'user-1',
    };
    // Inject into roleAssignments directly via the store's addRoleAssignment
    store.getState().addRoleAssignment(platformAssignment as any);

    // Now tighten ceiling to tenant scope
    const tenantCeiling = buildScopePath('/tenants/TNT-001');
    store.getState().updateAccessGroup('group-ceiling-test', {
      scopeCeiling: { path: tenantCeiling },
    });

    const log = store.getState().auditLog;
    const conflictEntries = log.filter(e => e.action === 'group:ceiling-conflict');
    expect(conflictEntries.length).toBe(1);
    expect(conflictEntries[0].objectId).toBe('group-ceiling-test');
  });

  it('does not emit ceiling-conflict entries when ceiling is widened', () => {
    const store = makeStore();
    const group: AccessGroup = {
      ...MOCK_GROUP,
      id: 'group-widen-test',
      scopeCeiling: { path: buildScopePath('/tenants/TNT-001') },
    };
    store.getState().addAccessGroup(group);

    const logBefore = store.getState().auditLog.length;
    store.getState().updateAccessGroup('group-widen-test', {
      scopeCeiling: { path: buildScopePath('/') },
    });

    const conflictEntries = store.getState().auditLog.filter(
      e => e.action === 'group:ceiling-conflict'
    );
    expect(conflictEntries.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/utils/groupLifecycle.test.ts
```

Expected: FAIL — `conflictEntries.length` is 0 on the tightening test.

- [ ] **Step 3: Implement cascade detection in `updateAccessGroup`**

`detectCeilingConflicts` is already imported in `rbacSlice.ts` (check; if not, add `import { detectCeilingConflicts } from '../../utils/groupEdit';` near the top of the slice file).

Add the following block INSIDE `updateAccessGroup`, immediately after the `group:update` audit entry block:

```typescript
// Ceiling-tightening cascade: detect over-ceiling role assignments
if (before && updates.scopeCeiling?.path) {
  const oldCeiling = before.scopeCeiling?.path;
  const newCeiling = updates.scopeCeiling.path;

  // "Tighter" = new ceiling path is longer (more specific) than old one
  const isTighter =
    !oldCeiling ||
    newCeiling.raw.length > (oldCeiling?.raw ?? '/').length;

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

      // Surface warning to the user
      window.addToast?.({
        type: 'warning',
        title: 'Scope Ceiling Tightened',
        message: `${conflicts.length} role assignment${conflicts.length !== 1 ? 's' : ''} now exceed${conflicts.length === 1 ? 's' : ''} the new ceiling. Review the Activity log.`,
        duration: 6000,
      });
    }
  }
}
```

> Note: `window.addToast?.` uses optional chaining because `window.addToast` isn't set in the Vitest environment.

- [ ] **Step 4: Verify `detectCeilingConflicts` is imported in rbacSlice.ts**

```bash
grep "detectCeilingConflicts" src/store/slices/rbacSlice.ts
```

If no output, add to the imports at the top of the file:

```typescript
import { detectCeilingConflicts } from '../../utils/groupEdit';
```

- [ ] **Step 5: Run unit tests to verify they pass**

```bash
npx vitest run src/utils/groupLifecycle.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/store/slices/rbacSlice.ts src/utils/groupLifecycle.test.ts
git commit -m "feat(groups): emit ceiling-conflict audit entries and warning toast when scope ceiling is tightened"
```

---

## Final Verification

- [ ] **Run the full group lifecycle test suite**

```bash
npx playwright test tests/e2e/group-lifecycle.spec.ts --reporter=line
```

Expected: all tests pass.

- [ ] **Run the full unit test suite**

```bash
npx vitest run
```

Expected: no failures.

- [ ] **Build check**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.Xs`

- [ ] **Commit all remaining staged files and push**

```bash
git push origin main
```
