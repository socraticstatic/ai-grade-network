# RBAC Tier + Scope Dimension Consistency — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the tier-aware permission model and 5 W's scope dimension structure consistently across all five RBAC tabs: Users, Groups, Roles, Assignments, and Activity.

**Architecture:** Three layers — (1) data model correctness (permissions at right tiers, scope dimensions defined), (2) shared components (TieredPermissionsEditor, TierCascadePreview, ScopeDimensionsPanel), (3) per-tab UI consistency. Each layer depends on the previous. Tests run after each layer.

**Tech Stack:** React 19, TypeScript strict, Zustand, Vite, Tailwind, Playwright (e2e)

---

## Mental Model (read before touching any code)

A permission is: **action + object** (e.g., `connection:write` = edit a connection).

A permission's full meaning requires **scope** — the 5 W's:
- **WHO**: the principal (already on the assignment)
- **WHAT**: the action + object (the permission)
- **WHERE**: the scope path (platform / reseller / tenant / client / connection / cloud-router)
- **WHEN**: time window, expiry, MFA required, approval required, IP allowlist
- **WHICH**: cloud provider, environment, geography, asset ownership, data class, object filter

**Tier cascade rule:**
- Platform role → can hold permissions from ALL 4 tier groups
- Reseller role → Reseller + Tenant + Business Unit groups (not Platform)
- Tenant role → Tenant + Business Unit groups (not Platform, not Reseller)
- Business Unit role → Business Unit group only

**Scope dimensions are tier-sensitive.** A platform permission doesn't need a "cloud provider" filter — platform operations are provider-agnostic. A connection-level permission absolutely does. Show only the dimensions that are meaningful at the tier being assigned.

| Dimension | Applies at |
|---|---|
| Time window, MFA, IP allowlist, Approval, Expiry | ALL tiers |
| Geography, Environment | Tenant and below |
| Cloud provider, Asset ownership, Data class | Client (Business Unit) and below |
| Object filter (specific resource IDs) | Connection, Cloud Router |

---

## Current State Gaps (the inconsistency we're fixing)

### Data model gaps
- `partner:read` is at tenant tier → tenants should not see partner records (move to reseller)
- `partner:write`, `partner:delete` at reseller tier → creating/offboarding partners is AT&T's job (move to platform)
- `client:*` permissions don't exist → tenants cannot add or delete business units (missing)
- `design-library:*` permissions don't exist → platform-exclusive design library management (missing)
- `instance:*` permissions don't exist → platform-exclusive instance management (missing)
- `tenant:provision`, `tenant:suspend` don't exist → reseller-exclusive tenant management (missing)
- `design-library:import` doesn't exist → reseller-exclusive design library import (missing)

### RoleCatalog (Roles tab) gaps
- `PermissionsMatrixEditor` shows a flat list of ALL permissions regardless of `maxScopeTier`
- Selecting "tenant" maxScopeTier still shows platform and reseller permissions in the picker
- No tier section headers — impossible to understand what tier a permission belongs to

### ConditionsPanel (used in AssignRoleDrawer + MultiScopePanel) gaps
- Split into "Resource Filters" + "Access Conditions" — developer-side naming, not user-facing
- No tier-awareness — shows cloud provider and time window equally to platform and client users
- Does not communicate the 5 W's framing

### GroupDetailDrawer / CreateGroupDrawer gaps
- `PermissionCascadePanel` shows tier names + descriptions but NOT permission counts or actual permission names
- Cannot expand a tier to see what permissions it contains
- This component is duplicated logic from what the role editor should share

### AssignmentManagement (Assignments tab) gaps
- Assignment rows show: principal, role, scope, status — but NOT scope dimensions
- If an assignment has time window or cloud provider constraints, they are invisible in the list
- Deny assignments show even less — no "WHICH" or "WHEN" is surfaced

### AuditLog (Activity tab) gaps
- Each entry shows: principal, action, object, result (ALLOW/DENY)
- Missing: WHEN the action occurred (timestamp exists but formatting is flat), WHICH resources, WHERE (scope is stored but not displayed in the row)

---

## File Structure

### Files to create
```
src/components/configure/users/TierCascadePreview.tsx    — read-only expandable tier+permission preview
src/components/configure/users/ScopeDimensionsPanel.tsx  — 5 W's scope conditions, tier-aware
src/utils/validatePermissionModel.ts                     — runtime consistency checker
tests/e2e/rbac-tier-consistency.spec.ts                  — cross-tab consistency Playwright tests
```

### Files to modify
```
src/types/rbac.ts                                         — add new Permission values
src/data/tierPermissions.ts                              — rewrite TIER_PERMISSION_GROUPS
src/data/roleCatalog.ts                                  — update ALL_PERMISSIONS + role definitions
src/components/configure/users/RoleCatalog.tsx           — replace flat picker with TieredPermissionsEditor
src/components/configure/users/ConditionsPanel.tsx       — restructure as ScopeDimensionsPanel wrapper
src/components/configure/users/CreateGroupDrawer.tsx     — use TierCascadePreview
src/components/configure/users/GroupDetailDrawer.tsx     — use TierCascadePreview
src/components/configure/users/AssignmentManagement.tsx  — surface 5 W's in assignment rows
src/components/configure/users/AuditLog.tsx              — surface 5 W's in audit rows
src/components/configure/users/AssignRoleDrawer.tsx      — connect scope tier to scope dimensions
src/components/configure/users/MultiScopePanel.tsx       — same ScopeDimensionsPanel connection
```

---

## Task 1: Permission Type — Add Missing Permissions

**Files:**
- Modify: `src/types/rbac.ts` — `Permission` type (lines 124-227)

- [ ] **Step 1: Add new permission values to the `Permission` union type**

Add after existing `system:*` permissions, before closing semicolon:

```typescript
  // Design libraries (platform-exclusive)
  | 'design-library:read'      // view platform design libraries / templates
  | 'design-library:write'     // create or edit design libraries
  | 'design-library:delete'    // delete design libraries
  | 'design-library:clone'     // clone a design library down to a reseller or tenant
  | 'design-library:import'    // import a JSON design library (reseller action)

  // NetBond instances (platform-exclusive)
  | 'instance:read'            // view NetBond instances / regions
  | 'instance:add'             // provision a new NetBond instance
  | 'instance:configure'       // configure an instance

  // Reseller accounts (platform-exclusive)
  | 'reseller:read'            // view reseller / channel partner accounts
  | 'reseller:write'           // create or edit reseller accounts
  | 'reseller:delete'          // offboard a reseller
  | 'reseller:suspend'         // suspend or unsuspend a reseller account

  // Tenant provisioning (reseller-exclusive)
  | 'tenant:provision'         // add a new tenant account under this reseller
  | 'tenant:suspend'           // suspend or unsuspend a tenant account

  // Business unit management (tenant-exclusive)
  | 'client:read'              // view business units
  | 'client:write'             // add or edit a business unit
  | 'client:delete'            // delete a business unit
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output (clean compile).

- [ ] **Step 3: Commit**

```bash
git add src/types/rbac.ts
git commit -m "feat(rbac): add platform/reseller/tenant/client tier-specific permissions"
```

---

## Task 2: Rewrite TIER_PERMISSION_GROUPS

**Files:**
- Modify: `src/data/tierPermissions.ts`

- [ ] **Step 1: Replace `TIER_PERMISSION_GROUPS` array**

```typescript
export const TIER_PERMISSION_GROUPS: TierPermissionGroup[] = [
  {
    tier: 'platform',
    label: 'Platform',
    description: 'AT&T-internal: instances, design libraries, reseller management, system administration',
    permissions: [
      // Design library management
      'design-library:read', 'design-library:write', 'design-library:delete', 'design-library:clone',
      // Instance management
      'instance:read', 'instance:add', 'instance:configure',
      // Reseller account management (creating/offboarding partners is AT&T's job)
      'reseller:read', 'reseller:write', 'reseller:delete', 'reseller:suspend',
      'partner:write', 'partner:delete',
      // System
      'system:configure', 'system:administer',
    ],
  },
  {
    tier: 'reseller',
    label: 'Reseller',
    description: 'Channel partner operations: tenant provisioning, design library imports, partner visibility',
    permissions: [
      'design-library:import',
      'tenant:provision', 'tenant:suspend', 'tenant:administer',
      'partner:read',
    ],
  },
  {
    tier: 'tenant',
    label: 'Tenant',
    description: 'Tenant-wide administration: business units, users, billing, policies, audit, APIs, reports',
    permissions: [
      'client:read', 'client:write', 'client:delete',
      'tenant:read', 'tenant:write',
      'billing:read', 'billing:finance', 'billing:export',
      'user:read', 'user:write', 'user:delete', 'user:operate',
      'role:read', 'role:write', 'role:delete',
      'role-assignment:read', 'role-assignment:assign', 'role-assignment:revoke',
      'policy:read', 'policy:write', 'policy:delete', 'policy:assign',
      'audit:read',
      'api:read', 'api:write', 'api:delete', 'api:configure',
      'report:read', 'report:write', 'report:delete', 'report:export',
      'alert-rule:read', 'alert-rule:write', 'alert-rule:delete',
      'system:read',
    ],
  },
  {
    tier: 'client',
    label: 'Business Unit',
    description: 'Network resource management: connections, routing, pools, VNFs, monitoring',
    permissions: [
      'connection:read', 'connection:write', 'connection:delete',
      'connection:operate', 'connection:bandwidth', 'connection:configure', 'connection:export',
      'link:read', 'link:write', 'link:delete', 'link:configure',
      'subnet:read', 'subnet:write', 'subnet:delete',
      'cloud-router:read', 'cloud-router:write', 'cloud-router:delete', 'cloud-router:configure',
      'vnf:read', 'vnf:write', 'vnf:delete', 'vnf:operate',
      'pool:read', 'pool:write', 'pool:delete', 'pool:assign',
      'monitoring:read', 'monitoring:operate',
    ],
  },
];
```

`TIER_RANK`, `accessibleGroups()`, `bucketPermissions()`, `permissionTierSummary()` — leave unchanged.

- [ ] **Step 2: Write validation test**

Create `src/utils/validatePermissionModel.ts`:

```typescript
// Runtime consistency checker — used in tests and can be run in dev.
import { Permission } from '../types/rbac';
import { TIER_PERMISSION_GROUPS } from '../data/tierPermissions';
import { ROLE_CATALOG, ALL_PERMISSIONS } from '../data/roleCatalog';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePermissionModel(): ValidationResult {
  const errors: string[] = [];

  // 1. Every permission in ALL_PERMISSIONS must be in exactly one tier group.
  const tieredPerms = new Set(TIER_PERMISSION_GROUPS.flatMap(g => g.permissions));
  for (const p of ALL_PERMISSIONS) {
    if (!tieredPerms.has(p)) {
      errors.push(`Permission '${p}' in ALL_PERMISSIONS is not in any TIER_PERMISSION_GROUP`);
    }
  }

  // 2. No permission should appear in more than one tier group.
  const seen = new Map<Permission, string>();
  for (const group of TIER_PERMISSION_GROUPS) {
    for (const p of group.permissions) {
      if (seen.has(p)) {
        errors.push(`Permission '${p}' appears in both '${seen.get(p)}' and '${group.tier}' groups`);
      }
      seen.set(p, group.tier);
    }
  }

  // 3. Every role's permissions must be accessible at its maxScopeTier.
  const TIER_RANK: Record<string, number> = {
    platform: 0, reseller: 1, tenant: 2, client: 3, pool: 3, connection: 3, 'cloud-router': 3,
  };
  const permTier = new Map<Permission, string>();
  for (const group of TIER_PERMISSION_GROUPS) {
    for (const p of group.permissions) {
      permTier.set(p, group.tier);
    }
  }

  for (const [roleName, role] of Object.entries(ROLE_CATALOG)) {
    for (const p of role.permissions) {
      const pt = permTier.get(p);
      if (!pt) continue; // new permission not yet in groups — caught by check 1
      if (TIER_RANK[pt] < TIER_RANK[role.maxScopeTier]) {
        errors.push(
          `Role '${roleName}' (maxScopeTier: ${role.maxScopeTier}) has permission '${p}' which belongs to broader tier '${pt}'`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 3: Run compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/data/tierPermissions.ts src/utils/validatePermissionModel.ts
git commit -m "feat(rbac): rewrite tier permission groups with correct placements + validation util"
```

---

## Task 3: Update Role Catalog

**Files:**
- Modify: `src/data/roleCatalog.ts`

- [ ] **Step 1: Add new permissions to `ALL_PERMISSIONS`**

After `'audit:read'` line, add:

```typescript
  // Design libraries
  'design-library:read', 'design-library:write', 'design-library:delete',
  'design-library:clone', 'design-library:import',
  // Instances
  'instance:read', 'instance:add', 'instance:configure',
  // Resellers
  'reseller:read', 'reseller:write', 'reseller:delete', 'reseller:suspend',
  // Tenant provisioning
  'tenant:provision', 'tenant:suspend',
  // Business unit management
  'client:read', 'client:write', 'client:delete',
```

- [ ] **Step 2: Update PlatformAdmin — add new platform permissions**

```typescript
PlatformAdmin: {
  // ...existing fields...
  permissions: ALL_PERMISSIONS,  // already correct — gets everything
},
```

No change needed — `ALL_PERMISSIONS` now includes the new permissions.

- [ ] **Step 3: Update ResellerAdmin — add reseller-tier permissions**

```typescript
ResellerAdmin: {
  // ...existing fields...
  permissions: [
    // Reseller-specific (new)
    'design-library:import',
    'tenant:provision', 'tenant:suspend', 'tenant:administer',
    'partner:read',
    // Tenant-tier (inherited by cascade)
    'client:read', 'client:write', 'client:delete',
    'tenant:read', 'tenant:write',
    'user:read', 'user:write',
    'role-assignment:read', 'role-assignment:assign', 'role-assignment:revoke',
    'billing:read', 'billing:export',
    'audit:read',
    // Business Unit (inherited by cascade)
    'connection:read', 'connection:export',
    'pool:read',
    'monitoring:read',
  ],
},
```

- [ ] **Step 4: Update TenantAdmin — add client:* permissions**

Add to existing `permissions` filter exclusion list, also add new tenant-tier permissions:

```typescript
TenantAdmin: {
  // ...existing fields...
  permissions: ALL_PERMISSIONS.filter(p => ![
    // Platform-exclusive (blocked)
    'design-library:read', 'design-library:write', 'design-library:delete',
    'design-library:clone', 'design-library:import',
    'instance:read', 'instance:add', 'instance:configure',
    'reseller:read', 'reseller:write', 'reseller:delete', 'reseller:suspend',
    'partner:write', 'partner:delete',
    'system:configure', 'system:administer',
    // Reseller-exclusive (blocked)
    'tenant:provision', 'tenant:suspend', 'tenant:administer',
    'partner:read',
  ].includes(p)),
},
```

- [ ] **Step 5: Update ClientAdmin similarly (excludes tenant-tier-admin + above)**

```typescript
ClientAdmin: {
  // ...existing fields...
  permissions: ALL_PERMISSIONS.filter(p => ![
    // Platform-exclusive
    'design-library:read', 'design-library:write', 'design-library:delete',
    'design-library:clone', 'design-library:import',
    'instance:read', 'instance:add', 'instance:configure',
    'reseller:read', 'reseller:write', 'reseller:delete', 'reseller:suspend',
    'partner:write', 'partner:delete',
    'system:configure', 'system:administer',
    // Reseller-exclusive
    'tenant:provision', 'tenant:suspend', 'tenant:administer',
    'partner:read',
    // Tenant-admin-only
    'client:write', 'client:delete',
    'tenant:write',
    'billing:finance',
    'user:delete', 'user:operate',
    'role:write', 'role:delete',
    'role-assignment:assign', 'role-assignment:revoke',
    'policy:write', 'policy:delete', 'policy:assign',
    'api:write', 'api:delete', 'api:configure',
    'report:write', 'report:delete',
    'alert-rule:write', 'alert-rule:delete',
  ].includes(p)),
},
```

- [ ] **Step 6: Run validatePermissionModel() — must return valid: true**

Temporarily add to a test file or run in node:

```bash
node -e "
const { validatePermissionModel } = require('./src/utils/validatePermissionModel');
const result = validatePermissionModel();
console.log(result.valid ? 'VALID' : 'INVALID');
result.errors.forEach(e => console.log('ERROR:', e));
"
```

Expected: `VALID` with no errors.

- [ ] **Step 7: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 8: Commit**

```bash
git add src/data/roleCatalog.ts
git commit -m "feat(rbac): update role catalog with tier-correct permissions"
```

---

## Task 4: TieredPermissionsEditor Component (Roles Tab)

**Files:**
- Modify: `src/components/configure/users/RoleCatalog.tsx`

The `RoleDrawer` currently passes all `grantablePerms` to `PermissionsMatrixEditor` as a flat list. Replace with tabbed editor that shows only accessible tier groups.

- [ ] **Step 1: Add `TieredPermissionsEditor` above `RoleDrawer` in RoleCatalog.tsx**

```typescript
// ── Tiered permissions editor ─────────────────────────────────────────────────
// Replaces flat PermissionsMatrixEditor in RoleDrawer.
// Shows permissions in tabs by tier — only accessible tiers appear.
// Each tab label shows count of selected permissions.

interface TieredPermissionsEditorProps {
  maxScopeTier: ScopeTier;
  callerPermissions: Permission[];
  isBCTemplate: boolean;
  selected: Set<Permission>;
  onChange: (next: Set<Permission>) => void;
}

function TieredPermissionsEditor({
  maxScopeTier, callerPermissions, isBCTemplate, selected, onChange,
}: TieredPermissionsEditorProps) {
  const groups = accessibleGroups(maxScopeTier);
  const [activeTab, setActiveTab] = useState<ScopeTier>(groups[0]?.tier ?? 'client');

  // Ensure activeTab is always valid when tier changes
  useEffect(() => {
    const validTiers = new Set(groups.map(g => g.tier));
    if (!validTiers.has(activeTab)) {
      setActiveTab(groups[0]?.tier ?? 'client');
    }
  }, [maxScopeTier]);

  const toggle = (p: Permission) => {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p); else next.add(p);
    onChange(next);
  };

  const selectAll = (group: TierPermissionGroup) => {
    const next = new Set(selected);
    group.permissions.forEach(p => {
      if (isBCTemplate || callerPermissions.includes(p)) next.add(p);
    });
    onChange(next);
  };

  const clearAll = (group: TierPermissionGroup) => {
    const next = new Set(selected);
    group.permissions.forEach(p => next.delete(p));
    onChange(next);
  };

  const activeGroup = groups.find(g => g.tier === activeTab);

  // Hint per tier: where assignments for this tier's permissions are made
  const TIER_SCOPE_HINT: Record<string, string> = {
    platform:  'Applies once at platform scope',
    reseller:  'Assign per reseller — multi-select supported',
    tenant:    'Assign per tenant — multi-select supported',
    client:    'Assign per business unit — multi-select supported',
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-fw-secondary mb-0">
        {groups.map(g => {
          const count = g.permissions.filter(p => selected.has(p)).length;
          const isActive = g.tier === activeTab;
          return (
            <button
              key={g.tier}
              onClick={() => setActiveTab(g.tier)}
              className={`px-4 py-2 text-figma-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-fw-active text-fw-cobalt-700 bg-fw-accent'
                  : 'border-transparent text-fw-bodyLight hover:text-fw-heading'
              }`}
            >
              {g.label}
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                  isActive ? 'bg-fw-cobalt-700 text-white' : 'bg-fw-secondary text-fw-body'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab body */}
      {activeGroup && (
        <div className="pt-3">
          {/* Scope hint + select/clear controls */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-figma-xs text-fw-bodyLight italic">
              {TIER_SCOPE_HINT[activeGroup.tier] ?? ''}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => selectAll(activeGroup)}
                className="text-figma-xs text-fw-cobalt-700 hover:underline"
              >
                Select all
              </button>
              <button
                onClick={() => clearAll(activeGroup)}
                className="text-figma-xs text-fw-bodyLight hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <PermissionsMatrixEditor
            available={activeGroup.permissions.filter(p =>
              isBCTemplate || callerPermissions.includes(p)
            )}
            selected={selected}
            onToggle={toggle}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `RoleDrawer` — add auto-deselect + warning state**

Add inside `RoleDrawer` after existing state declarations:

```typescript
const [removedWarning, setRemovedWarning] = useState<string | null>(null);

// Auto-deselect permissions outside the new tier when maxScopeTier changes
useEffect(() => {
  const groups = accessibleGroups(maxScopeTier);
  const accessible = new Set(groups.flatMap(g => g.permissions));
  const removed = [...selectedPerms].filter(p => !accessible.has(p));
  if (removed.length > 0) {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      removed.forEach(p => next.delete(p));
      return next;
    });
    setRemovedWarning(
      `${removed.length} permission${removed.length !== 1 ? 's' : ''} removed — not available at ${maxScopeTier} tier`
    );
  } else {
    setRemovedWarning(null);
  }
}, [maxScopeTier]);
```

- [ ] **Step 3: Replace `PermissionsMatrixEditor` usage in `RoleDrawer` render**

Replace the permissions section:

```typescript
<div>
  <div className="flex items-center justify-between mb-3">
    <label className="text-figma-sm font-medium text-fw-heading">
      Permissions <span className="text-fw-error">*</span>
      {selectedPerms.size > 0 && (
        <span className="ml-2 text-fw-bodyLight font-normal">({selectedPerms.size} selected)</span>
      )}
    </label>
  </div>

  {/* Removed permissions warning */}
  {removedWarning && (
    <div className="flex items-center justify-between mb-3 px-3 py-2 bg-fw-warnLight border border-fw-warn rounded-lg">
      <p className="text-figma-xs text-fw-warn">{removedWarning}</p>
      <button
        onClick={() => setRemovedWarning(null)}
        className="text-figma-xs text-fw-warn hover:underline ml-3 shrink-0"
      >
        Dismiss
      </button>
    </div>
  )}

  <TieredPermissionsEditor
    maxScopeTier={maxScopeTier}
    callerPermissions={callerPerms}
    isBCTemplate={isBCTemplate}
    selected={selectedPerms}
    onChange={setSelectedPerms}
  />
  {errors.perms && <p className="mt-1 text-figma-xs text-fw-error">{errors.perms}</p>}
</div>
```

- [ ] **Step 4: Add missing import for `accessibleGroups` and `TierPermissionGroup`**

```typescript
import { accessibleGroups, TierPermissionGroup } from '../../../data/tierPermissions';
```

- [ ] **Step 5: Compile and verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Manual verification in browser**

Start dev server. Navigate to Configure > Users > Roles. Select "Network Engineer" (maxScopeTier: tenant). Should show 2 tabs: Tenant | Business Unit. Select "Platform Admin" — should show 4 tabs. Lower a Platform Admin tier to "tenant" — should see warning about removed permissions.

- [ ] **Step 7: Commit**

```bash
git add src/components/configure/users/RoleCatalog.tsx
git commit -m "feat(rbac): tiered permission editor with tabs per accessible tier"
```

---

## Task 5: TierCascadePreview Component (Groups Tab)

**Files:**
- Create: `src/components/configure/users/TierCascadePreview.tsx`
- Modify: `src/components/configure/users/CreateGroupDrawer.tsx`
- Modify: `src/components/configure/users/GroupDetailDrawer.tsx`

- [ ] **Step 1: Create `TierCascadePreview.tsx`**

```typescript
// src/components/configure/users/TierCascadePreview.tsx
// Read-only expandable tier cascade preview.
// Shows permission count per accessible tier, expandable to full permission list.
// Used in CreateGroupDrawer and GroupDetailDrawer.

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ScopeTier } from '../../../types/rbac';
import { accessibleGroups, TierPermissionGroup } from '../../../data/tierPermissions';

function groupByObject(perms: string[]): Record<string, string[]> {
  const g: Record<string, string[]> = {};
  for (const p of perms) {
    const [obj, action] = p.split(':');
    if (!g[obj]) g[obj] = [];
    g[obj].push(action);
  }
  return g;
}

interface TierCascadePreviewProps {
  maxScopeTier: ScopeTier;
}

export function TierCascadePreview({ maxScopeTier }: TierCascadePreviewProps) {
  const groups = accessibleGroups(maxScopeTier);
  const [expanded, setExpanded] = useState<Set<ScopeTier>>(new Set());

  const toggle = (tier: ScopeTier) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  };

  return (
    <div className="bg-fw-wash border border-fw-secondary rounded-lg p-3 space-y-1.5">
      <p className="text-figma-xs font-semibold text-fw-heading mb-2">
        At this ceiling, members can hold roles with access to:
      </p>
      {groups.map(g => {
        const isOpen = expanded.has(g.tier);
        const byObj = groupByObject(g.permissions);
        return (
          <div key={g.tier} className="rounded-lg border border-fw-secondary bg-fw-base overflow-hidden">
            <button
              onClick={() => toggle(g.tier)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-fw-wash transition-colors"
            >
              {isOpen
                ? <ChevronDown className="h-3 w-3 text-fw-bodyLight shrink-0" />
                : <ChevronRight className="h-3 w-3 text-fw-bodyLight shrink-0" />
              }
              <span className="text-figma-xs text-fw-success">✓</span>
              <span className="text-figma-xs font-semibold text-fw-heading">{g.label}</span>
              <span className="text-figma-xs text-fw-disabled ml-1">({g.permissions.length})</span>
              <span className="text-figma-xs text-fw-bodyLight ml-1.5 flex-1 truncate">
                — {g.description}
              </span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-fw-secondary space-y-1.5">
                {Object.entries(byObj).sort().map(([obj, actions]) => (
                  <div key={obj} className="flex items-start gap-3">
                    <span className="text-figma-xs font-semibold text-fw-bodyLight w-24 shrink-0 pt-0.5 capitalize">
                      {obj.replace(/-/g, ' ')}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {actions.sort().map(action => (
                        <span key={action} className="px-1.5 py-0.5 text-figma-xs bg-fw-wash border border-fw-secondary rounded text-fw-body">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Replace inline cascade preview in `CreateGroupDrawer.tsx`**

Remove lines 167-188 (the `(() => { const tier = ...; const groups = ...; return (...) })()` block).

Replace with:

```typescript
import { TierCascadePreview } from './TierCascadePreview';

// In the JSX, after the ScopePicker:
{scopeCeiling.tier && (
  <TierCascadePreview maxScopeTier={scopeCeiling.tier as ScopeTier} />
)}
```

Remove unused `accessibleGroups` import from CreateGroupDrawer if no longer used.

- [ ] **Step 3: Replace `PermissionCascadePanel` in `GroupDetailDrawer.tsx`**

Remove the `PermissionCascadePanel` component (lines 27-77). Replace its usage with:

```typescript
import { TierCascadePreview } from './TierCascadePreview';

// Where PermissionCascadePanel was used:
<TierCascadePreview maxScopeTier={ceilingTier(group)} />
```

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Browser verify — Groups tab**

Open Create Group. Set scope ceiling to Reseller — cascade shows 3 expandable rows (Reseller, Tenant, Business Unit). Click Tenant row — expands to show permission list grouped by object. Set to Business Unit — only 1 row (Business Unit). Platform never appears.

Open an existing group's detail drawer — same expandable cascade view.

- [ ] **Step 6: Commit**

```bash
git add src/components/configure/users/TierCascadePreview.tsx \
        src/components/configure/users/CreateGroupDrawer.tsx \
        src/components/configure/users/GroupDetailDrawer.tsx
git commit -m "feat(rbac): TierCascadePreview with expandable per-tier permission list"
```

---

## Task 6: ScopeDimensionsPanel — 5 W's, Tier-Aware

**Files:**
- Create: `src/components/configure/users/ScopeDimensionsPanel.tsx`
- Modify: `src/components/configure/users/ConditionsPanel.tsx` (becomes a thin wrapper)
- Modify: `src/components/configure/users/AssignRoleDrawer.tsx`
- Modify: `src/components/configure/users/MultiScopePanel.tsx`

The current `ConditionsPanel` splits conditions into "Resource Filters" and "Access Conditions" — a developer-side separation. Replace with 5 W's framing, tier-aware field visibility.

- [ ] **Step 1: Create `ScopeDimensionsPanel.tsx`**

```typescript
// src/components/configure/users/ScopeDimensionsPanel.tsx
// Scope dimensions for an assignment: WHEN + WHICH + HOW constraints.
// Fields shown depend on the scope tier — cloud provider is irrelevant at platform tier.
// Data model maps 1:1 to ConditionsState from ConditionsPanel.tsx.

import { ScopeTier } from '../../../types/rbac';
import { ConditionsState } from './ConditionsPanel';

// Which dimensions are relevant at a given tier
function relevantDimensions(tier: ScopeTier) {
  const isClientOrBelow = tier === 'client' || tier === 'pool' || tier === 'connection' || tier === 'cloud-router';
  const isTenantOrBelow = isClientOrBelow || tier === 'tenant';
  return {
    timeWindow: true,           // all tiers
    mfa: true,                  // all tiers
    ipAllowlist: true,          // all tiers
    geography: isTenantOrBelow, // tenant and below
    environment: isTenantOrBelow,
    cloudProvider: isClientOrBelow,
    assetOwnership: isClientOrBelow,
    dataClass: isClientOrBelow,
  };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CLOUD_PROVIDERS = ['aws', 'azure', 'gcp', 'oracle'] as const;
const LOCATIONS = ['US-East', 'US-West', 'EU-West', 'Asia-Pacific'] as const;
const ENVIRONMENTS = ['prod', 'staging', 'dev'] as const;
const OWNERSHIPS = ['att-owned', 'provider-owned', 'tenant-owned', 'reseller-owned'] as const;
const DATA_CLASSES = ['unclassified', 'cui', 'sensitive'] as const;

interface ScopeDimensionsPanelProps {
  scopeTier: ScopeTier;
  state: ConditionsState;
  onChange: (next: ConditionsState) => void;
}

export function ScopeDimensionsPanel({ scopeTier, state, onChange }: ScopeDimensionsPanelProps) {
  const dims = relevantDimensions(scopeTier);
  const set = (patch: Partial<ConditionsState>) => onChange({ ...state, ...patch });

  const toggleArr = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const sectionClass = 'border-t border-fw-secondary pt-3 mt-3';
  const labelClass = 'text-figma-xs font-semibold text-fw-heading mb-1.5 block';
  const chipClass = (active: boolean) =>
    `px-2 py-1 text-figma-xs border rounded-lg cursor-pointer transition-colors select-none ${
      active ? 'bg-fw-accent border-fw-active text-fw-cobalt-700 font-medium' : 'border-fw-secondary text-fw-body hover:border-fw-active'
    }`;

  return (
    <div className="space-y-0">
      {/* WHEN — time window */}
      {dims.timeWindow && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={state.useTimeWindow}
              onChange={e => set({ useTimeWindow: e.target.checked })}
              className="rounded border-fw-secondary text-fw-active focus:ring-fw-active" />
            <span className="text-figma-sm font-medium text-fw-heading">When — Time Window</span>
          </label>
          {state.useTimeWindow && (
            <div className="mt-2 pl-6 space-y-2">
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => set({ daysOfWeek: toggleArr(state.daysOfWeek, i) })}
                    className={chipClass(state.daysOfWeek.includes(i))}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={23} value={state.startHour}
                  onChange={e => set({ startHour: Number(e.target.value) })}
                  className="w-16 px-2 py-1 text-figma-xs border border-fw-secondary rounded bg-fw-base" />
                <span className="text-figma-xs text-fw-bodyLight">to</span>
                <input type="number" min={0} max={23} value={state.endHour}
                  onChange={e => set({ endHour: Number(e.target.value) })}
                  className="w-16 px-2 py-1 text-figma-xs border border-fw-secondary rounded bg-fw-base" />
                <input type="text" value={state.timezone}
                  onChange={e => set({ timezone: e.target.value })}
                  className="flex-1 px-2 py-1 text-figma-xs border border-fw-secondary rounded bg-fw-base"
                  placeholder="America/Chicago" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* HOW — MFA */}
      {dims.mfa && (
        <div className={sectionClass}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={state.requiresMFA}
              onChange={e => set({ requiresMFA: e.target.checked })}
              className="rounded border-fw-secondary text-fw-active focus:ring-fw-active" />
            <span className="text-figma-sm font-medium text-fw-heading">How — Require MFA</span>
          </label>
        </div>
      )}

      {/* HOW — IP allowlist */}
      {dims.ipAllowlist && (
        <div className={sectionClass}>
          <label className={labelClass}>How — IP Allowlist <span className="font-normal text-fw-bodyLight">(one per line, empty = any)</span></label>
          <textarea value={state.allowedIPs} rows={2}
            onChange={e => set({ allowedIPs: e.target.value })}
            className="w-full px-2 py-1.5 text-figma-xs border border-fw-secondary rounded bg-fw-base font-mono resize-none"
            placeholder="192.168.1.0/24&#10;10.0.0.0/8" />
        </div>
      )}

      {/* WHICH — Geography */}
      {dims.geography && (
        <div className={sectionClass}>
          <label className={labelClass}>Which — Geography <span className="font-normal text-fw-bodyLight">(empty = any)</span></label>
          <div className="flex flex-wrap gap-1">
            {LOCATIONS.map(l => (
              <button key={l} onClick={() => set({ locations: toggleArr(state.locations, l) })}
                className={chipClass(state.locations.includes(l))}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WHICH — Environment */}
      {dims.environment && (
        <div className={sectionClass}>
          <label className={labelClass}>Which — Environment</label>
          <div className="flex flex-wrap gap-1">
            {ENVIRONMENTS.map(e => (
              <button key={e} onClick={() => set({ environments: toggleArr(state.environments, e) })}
                className={chipClass(state.environments.includes(e))}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WHICH — Cloud Provider */}
      {dims.cloudProvider && (
        <div className={sectionClass}>
          <label className={labelClass}>Which — Cloud Provider</label>
          <div className="flex flex-wrap gap-1">
            {CLOUD_PROVIDERS.map(cp => (
              <button key={cp} onClick={() => set({ cloudProviders: toggleArr(state.cloudProviders, cp) })}
                className={chipClass(state.cloudProviders.includes(cp))}>
                {cp.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WHICH — Asset Ownership */}
      {dims.assetOwnership && (
        <div className={sectionClass}>
          <label className={labelClass}>Which — Asset Ownership</label>
          <div className="flex flex-wrap gap-1">
            {OWNERSHIPS.map(o => (
              <button key={o} onClick={() => set({ assetOwnership: toggleArr(state.assetOwnership, o) })}
                className={chipClass(state.assetOwnership.includes(o))}>
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WHICH — Data Classification */}
      {dims.dataClass && (
        <div className={sectionClass}>
          <label className={labelClass}>Which — Data Classification (max)</label>
          <div className="flex flex-wrap gap-1">
            {(['', ...DATA_CLASSES] as const).map(dc => (
              <button key={dc || 'any'} onClick={() => set({ classification: dc })}
                className={chipClass(state.classification === dc)}>
                {dc || 'any'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `AssignRoleDrawer.tsx` — pass scope tier to ScopeDimensionsPanel**

In `AssignRoleDrawer`, the `ScopePicker` already tracks the selected scope tier. Pass that tier through to the conditions panel.

Find where `ResourceFiltersPanel` and `AccessConditionsPanel` are rendered and replace with:

```typescript
import { ScopeDimensionsPanel } from './ScopeDimensionsPanel';

// Replace ResourceFiltersPanel + AccessConditionsPanel with:
<ScopeDimensionsPanel
  scopeTier={scopePath.tier}
  state={conditions}
  onChange={setConditions}
/>
```

- [ ] **Step 3: Update `MultiScopePanel.tsx` — same replacement in per-entity tabs**

In the active tab body, replace:

```typescript
<ResourceFiltersPanel
  state={activeTab.conditions}
  onChange={c => updateConditions(activeTab.id, c)}
/>
<AccessConditionsPanel
  state={activeTab.conditions}
  onChange={c => updateConditions(activeTab.id, c)}
/>
```

With:

```typescript
import { ScopeDimensionsPanel } from './ScopeDimensionsPanel';

<ScopeDimensionsPanel
  scopeTier={activeTab.scope.tier}
  state={activeTab.conditions}
  onChange={c => updateConditions(activeTab.id, c)}
/>
```

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Browser verify — Assign Role flow**

Open Assign Role. Set scope to Reseller — scope dimensions show Time, MFA, IP Allowlist only. Geography and Cloud Provider are absent. Set scope to Business Unit — Geography, Environment, Cloud Provider, Asset Ownership, Data Classification now appear.

- [ ] **Step 6: Commit**

```bash
git add src/components/configure/users/ScopeDimensionsPanel.tsx \
        src/components/configure/users/AssignRoleDrawer.tsx \
        src/components/configure/users/MultiScopePanel.tsx
git commit -m "feat(rbac): ScopeDimensionsPanel with 5 W's framing and tier-aware field visibility"
```

---

## Task 7: Assignments Tab — Surface the 5 W's

**Files:**
- Modify: `src/components/configure/users/AssignmentManagement.tsx`

Assignment rows currently show: principal, role, scope, status. Scope dimensions are invisible. Fix this.

- [ ] **Step 1: Add `ScopeDimensionChips` helper component**

Add above `AssignmentManagement` in the file:

```typescript
// Renders a compact summary of non-empty scope dimensions as chips
function ScopeDimensionChips({ conditions }: { conditions?: import('../../../types/rbac').AssignmentConditions }) {
  if (!conditions) return null;
  const chips: string[] = [];
  const r = conditions.resource;
  const q = conditions.request;
  if (r?.cloudProviders?.length) chips.push(r.cloudProviders.map(c => c.toUpperCase()).join('/'));
  if (r?.environments?.length) chips.push(r.environments.join('/'));
  if (r?.locations?.length) chips.push(r.locations.join('/'));
  if (r?.assetOwnership?.length) chips.push(r.assetOwnership.map(o => o.replace('-owned', '')).join('/'));
  if (r?.classification) chips.push(r.classification);
  if (q?.requiresMFA) chips.push('MFA');
  if (q?.timeWindow) chips.push(`${q.timeWindow.startHour}h–${q.timeWindow.endHour}h`);
  if (q?.allowedIPs?.length) chips.push('IP restricted');
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map(c => (
        <span key={c} className="px-1.5 py-0.5 text-[9px] font-medium bg-fw-wash border border-fw-secondary rounded text-fw-bodyLight">
          {c}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add scope dimension chips to assignment rows**

In the `allowColumns` array, find the scope column and extend it:

```typescript
{
  id: 'scope',
  label: 'Where / Which',
  render: (a: RoleAssignment) => (
    <div>
      <span className="font-mono text-figma-xs text-fw-body">{a.scope.raw}</span>
      <ScopeDimensionChips conditions={a.conditions} />
    </div>
  ),
},
```

- [ ] **Step 3: Add expiry chip to show WHEN**

Add a "When" column or augment the existing expiry column to show time window if set:

```typescript
{
  id: 'when',
  label: 'When',
  render: (a: RoleAssignment) => (
    <div>
      <span className="text-figma-xs text-fw-body">
        {new Date(a.expiresAt) < new Date() ? (
          <span className="text-fw-error">Expired</span>
        ) : (
          new Date(a.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        )}
      </span>
      {a.conditions?.request?.timeWindow && (
        <div className="text-figma-xs text-fw-bodyLight">
          {a.conditions.request.timeWindow.startHour}h–{a.conditions.request.timeWindow.endHour}h
        </div>
      )}
    </div>
  ),
},
```

- [ ] **Step 4: Apply same treatment to deny assignment rows**

In `denyColumns`, add `ScopeDimensionChips` to the scope column. Deny assignments show: WHO, WHAT (permissions denied), WHERE (scope), WHICH (conditions), WHEN (expiry + status).

- [ ] **Step 5: Compile + browser verify**

Open Assignments tab. Assignments with `cloudProviders: ['aws']` show an "AWS" chip under the scope. Assignments with MFA show "MFA" chip. Assignments with time windows show hour range. Assignments with no conditions show nothing extra.

- [ ] **Step 6: Commit**

```bash
git add src/components/configure/users/AssignmentManagement.tsx
git commit -m "feat(rbac): surface scope dimensions (WHICH/WHEN) on assignment rows"
```

---

## Task 8: Activity Tab — 5 W's in Audit Log

**Files:**
- Modify: `src/components/configure/users/AuditLog.tsx`

Current audit rows show: principal, action, object, result. Missing: WHERE (scope), WHEN (timestamp improved).

- [ ] **Step 1: Add scope column to audit log table**

In `AuditLog.tsx`, the current rendering maps entries to rows. Add scope display:

```typescript
// In the row render, after objectType/objectName:
<div className="text-figma-xs text-fw-disabled font-mono truncate max-w-[200px]" title={entry.scope.raw}>
  {entry.scope.raw}
</div>
```

- [ ] **Step 2: Improve WHEN display**

Format timestamp to show relative time + absolute:

```typescript
function formatTimestamp(iso: string): { relative: string; absolute: string } {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const relative = diffDay > 0 ? `${diffDay}d ago`
    : diffHr > 0 ? `${diffHr}h ago`
    : diffMin > 0 ? `${diffMin}m ago`
    : 'just now';
  const absolute = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return { relative, absolute };
}
```

Render as: `<span title={absolute}>{relative}</span>`

- [ ] **Step 3: Show deny reason as "Why DENIED"**

For DENY entries, show denyReason inline:

```typescript
{entry.result === 'DENY' && entry.denyReason && (
  <div className="text-figma-xs text-fw-error mt-0.5">{entry.denyReason}</div>
)}
```

- [ ] **Step 4: Compile + browser verify**

Activity tab rows now show WHO (principal), WHAT (action + object), WHERE (scope), WHEN (relative timestamp), result (ALLOW/DENY), and WHY for denies.

- [ ] **Step 5: Commit**

```bash
git add src/components/configure/users/AuditLog.tsx
git commit -m "feat(rbac): audit log shows full 5 W's per entry"
```

---

## Task 9: Programmatic Consistency Tests

**Files:**
- Create: `tests/e2e/rbac-tier-consistency.spec.ts`

- [ ] **Step 1: Write unit tests for permission model**

```typescript
// In a vitest test file: src/utils/validatePermissionModel.test.ts
import { validatePermissionModel } from './validatePermissionModel';
import { accessibleGroups } from '../data/tierPermissions';
import { ROLE_CATALOG } from '../data/roleCatalog';

describe('Permission model consistency', () => {
  test('validatePermissionModel returns valid: true', () => {
    const result = validatePermissionModel();
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  test('platform role gets all 4 tier groups', () => {
    const groups = accessibleGroups('platform');
    const tiers = groups.map(g => g.tier);
    expect(tiers).toContain('platform');
    expect(tiers).toContain('reseller');
    expect(tiers).toContain('tenant');
    expect(tiers).toContain('client');
  });

  test('tenant role gets no platform or reseller permissions', () => {
    const groups = accessibleGroups('tenant');
    const tiers = groups.map(g => g.tier);
    expect(tiers).not.toContain('platform');
    expect(tiers).not.toContain('reseller');
  });

  test('client role gets only Business Unit permissions', () => {
    const groups = accessibleGroups('client');
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe('client');
  });

  test('partner:read is NOT in tenant tier', () => {
    const groups = accessibleGroups('tenant');
    const tenantGroup = groups.find(g => g.tier === 'tenant');
    expect(tenantGroup?.permissions).not.toContain('partner:read');
  });

  test('TenantAdmin has no platform permissions', () => {
    const role = ROLE_CATALOG.TenantAdmin;
    const platformPerms = ['system:configure', 'system:administer', 'reseller:write', 'design-library:clone'];
    for (const p of platformPerms) {
      expect(role.permissions).not.toContain(p);
    }
  });

  test('client:write exists and is at tenant tier', () => {
    const groups = accessibleGroups('tenant');
    const tenantGroup = groups.find(g => g.tier === 'tenant');
    expect(tenantGroup?.permissions).toContain('client:write');
  });
});
```

- [ ] **Step 2: Run unit tests**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci
npx vitest run src/utils/validatePermissionModel.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Write Playwright consistency spec**

```typescript
// tests/e2e/rbac-tier-consistency.spec.ts
import { test, expect } from '@playwright/test';
import { skipOnboarding, navigateTo } from './helpers';

test.describe('Tier permission consistency across tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await skipOnboarding(page);
    await navigateTo(page, 'configure', 'users');
  });

  test('Roles tab: Platform Admin shows 4 permission tabs', async ({ page }) => {
    await page.click('text=Roles');
    await page.click('text=Platform Admin');
    await page.click('text=Edit Permissions');
    await expect(page.locator('text=Platform')).toBeVisible();
    await expect(page.locator('text=Reseller')).toBeVisible();
    await expect(page.locator('text=Tenant')).toBeVisible();
    await expect(page.locator('text=Business Unit')).toBeVisible();
  });

  test('Roles tab: Tenant Admin shows 2 permission tabs only', async ({ page }) => {
    await page.click('text=Roles');
    await page.click('text=Tenant Admin');
    await page.click('text=Edit Permissions');
    await expect(page.locator('[role="tab"]', { hasText: 'Tenant' })).toBeVisible();
    await expect(page.locator('[role="tab"]', { hasText: 'Business Unit' })).toBeVisible();
    await expect(page.locator('[role="tab"]', { hasText: 'Platform' })).not.toBeVisible();
    await expect(page.locator('[role="tab"]', { hasText: 'Reseller' })).not.toBeVisible();
  });

  test('Groups: Reseller ceiling shows Reseller + Tenant + Business Unit tiers, not Platform', async ({ page }) => {
    await page.click('text=Groups');
    await page.click('text=Create Group');
    await page.click('input[value="reseller"], label:has-text("Reseller") input');
    await expect(page.locator('text=✓').first()).toBeVisible();
    // Platform must NOT appear as a checkmark
    await expect(page.locator('text=Platform').filter({ hasText: '✓' })).not.toBeVisible();
    await expect(page.getByText('Reseller').filter({ hasText: '✓' })).toBeVisible();
    await expect(page.getByText('Business Unit').filter({ hasText: '✓' })).toBeVisible();
  });

  test('Assign Role: Reseller scope shows no cloud provider dimension', async ({ page }) => {
    await page.click('button:has-text("⋮")').first();
    await page.click('text=Assign Role');
    // Select Reseller tier
    await page.click('label:has-text("Reseller") input[type="radio"]');
    // Cloud provider section must be absent
    await expect(page.locator('text=Cloud Provider')).not.toBeVisible();
    // Time window must be present
    await expect(page.locator('text=Time Window')).toBeVisible();
  });

  test('Assign Role: Business Unit scope shows cloud provider dimension', async ({ page }) => {
    await page.click('button:has-text("⋮")').first();
    await page.click('text=Assign Role');
    await page.click('label:has-text("Business unit") input[type="radio"]');
    await expect(page.locator('text=Cloud Provider')).toBeVisible();
  });

  test('Assignments tab: dimensions chips visible on conditioned assignments', async ({ page }) => {
    await page.click('text=Assignments');
    // Sophia's MFA-conditioned assignment should show MFA chip
    await expect(page.locator('text=MFA').first()).toBeVisible();
  });

  test('Activity tab: scope path visible in audit rows', async ({ page }) => {
    await page.click('text=Activity');
    await expect(page.locator('text=/tenants/').first()).toBeVisible();
  });
});
```

- [ ] **Step 4: Run Playwright tests**

```bash
npx playwright test tests/e2e/rbac-tier-consistency.spec.ts --reporter=line
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/validatePermissionModel.test.ts tests/e2e/rbac-tier-consistency.spec.ts
git commit -m "test(rbac): programmatic model validation + cross-tab Playwright consistency suite"
```

---

## UX Assessment Checklist

After all tasks complete, walk each flow manually and confirm:

### Users tab
- [ ] Assign Role drawer: scope dimensions section is labeled clearly (not "Resource Filters")
- [ ] Cloud provider field is absent when scope is Reseller or above
- [ ] Multi mode: each entity tab has its own scope dimensions, correctly filtered by tier
- [ ] Deny assignment drawer: same 5 W's structure as allow

### Groups tab
- [ ] Create Group: cascade preview shows permission counts per tier, expandable
- [ ] Group detail: same expandable preview, consistent with Create Group view
- [ ] Group with client ceiling: shows Business Unit only — no tenant, reseller, platform rows

### Roles tab
- [ ] Platform Admin role: 4 tabs with correct permissions in each
- [ ] Reseller Admin role: 3 tabs, no Platform tab
- [ ] Tenant Admin role: 2 tabs, no Platform or Reseller tab
- [ ] Lowering maxScopeTier triggers removed-permissions warning
- [ ] "Assign per tenant — multi-select supported" hint appears on Tenant tab

### Assignments tab
- [ ] Each row shows scope dimensions as chips (MFA, AWS, prod, etc.)
- [ ] Deny rows show which permissions are denied + scope dimensions
- [ ] SoD violations still flagged

### Activity tab
- [ ] Each row shows: WHO, WHAT (action + object), WHERE (scope path), WHEN (relative time), result
- [ ] DENY rows show deny reason
- [ ] Scope path is truncated but visible via tooltip/title

---

## Self-Review

**Spec coverage:** All 5 tabs covered. Data model covered. Shared components defined. Tests written.

**No placeholders:** Every task has exact file paths and complete code.

**Type consistency:** `ConditionsState` is used throughout — not renamed. `ScopeTier` is the same type everywhere. `accessibleGroups()` is called consistently, never reimplemented inline.

**The one thing that could still break:** `AssignRoleDrawer.tsx` was not fully read during planning — Step 2 of Task 6 references "where `ResourceFiltersPanel` and `AccessConditionsPanel` are rendered." Before executing Task 6, read that file fully to find the exact insertion point.
