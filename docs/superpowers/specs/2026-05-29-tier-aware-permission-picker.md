# Tier-Aware Permission Picker — Design Spec

**Status:** DRAFT — awaiting approval before any code is written

---

## Model

Each tier owns specific permissions. A role at tier X can hold permissions from X and all narrower tiers below it — never from tiers above.

| Role's max tier | Can hold permissions from |
|---|---|
| Platform | Platform + Reseller + Tenant + Business Unit |
| Reseller | Reseller + Tenant + Business Unit |
| Tenant | Tenant + Business Unit |
| Business Unit | Business Unit only |

A platform admin has the most permissions (all of them). A business unit user has the fewest.

---

## Part 1 — Permission Model Changes

### New permissions to add to `src/types/rbac.ts` `Permission` type

**Platform-exclusive** (AT&T internal only — not visible at reseller or below):
```
design-library:read       — view platform design libraries / templates
design-library:write      — create or edit design libraries
design-library:delete     — delete design libraries
design-library:clone      — clone a design library down to a reseller or tenant
instance:read             — view NetBond instances / regions
instance:add              — provision a new NetBond instance
instance:configure        — configure an instance
reseller:read             — view reseller / channel partner accounts
reseller:write            — create or edit reseller accounts
reseller:delete           — offboard a reseller
reseller:suspend          — suspend or unsuspend a reseller account
```

Keep existing platform permissions: `system:configure`, `system:administer`

**Reseller-exclusive** (visible to reseller and above — not tenant or below):
```
design-library:import     — import a JSON design library into their portfolio
tenant:provision          — add a new tenant account under this reseller
tenant:suspend            — suspend or unsuspend a tenant account
```

Keep existing reseller permission: `tenant:administer`

**Move from wrong tiers:**
- `partner:write`, `partner:delete` → move from reseller tier to **platform tier** (creating/offboarding channel partner accounts is AT&T's job, not a reseller's)
- `partner:read` → move from tenant tier to **reseller tier** (tenant customers should not see partner records)

**New tenant-exclusive permissions:**
```
client:read               — view business units (clients)
client:write              — add or edit a business unit
client:delete             — delete a business unit
```

Keep all existing tenant permissions: `tenant:read`, `tenant:write`, `billing:*`, `user:*`, `role:*`, `role-assignment:*`, `policy:*`, `audit:read`, `api:*`, `report:*`, `alert-rule:*`, `system:read`

Remove from tenant tier: `partner:read` (moved to reseller)

**Business Unit tier** — no changes. All `connection:*`, `link:*`, `subnet:*`, `cloud-router:*`, `vnf:*`, `pool:*`, `monitoring:*` stay as-is.

### Updated `TIER_PERMISSION_GROUPS` in `src/data/tierPermissions.ts`

```typescript
export const TIER_PERMISSION_GROUPS: TierPermissionGroup[] = [
  {
    tier: 'platform',
    label: 'Platform',
    description: 'AT&T-internal operations — instances, design libraries, reseller management',
    permissions: [
      'design-library:read', 'design-library:write', 'design-library:delete', 'design-library:clone',
      'instance:read', 'instance:add', 'instance:configure',
      'reseller:read', 'reseller:write', 'reseller:delete', 'reseller:suspend',
      'partner:write', 'partner:delete',   // moved up from reseller tier
      'system:configure', 'system:administer',
    ],
  },
  {
    tier: 'reseller',
    label: 'Reseller',
    description: 'Channel partner operations — tenant provisioning, design library imports',
    permissions: [
      'design-library:import',
      'tenant:provision', 'tenant:suspend', 'tenant:administer',
      'partner:read',   // moved up from tenant tier
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

`accessibleGroups()` and `TIER_RANK` are unchanged — they already work correctly.

---

## Part 2 — UI Changes

### The core problem in `RoleDrawer` (in `RoleCatalog.tsx`)

`PermissionsMatrixEditor` receives `grantablePerms` (filtered by what the caller holds) and `maxScopeTier` is set as a dropdown — but the two are not connected. When you select "Tenant" as the max tier, the permission list still shows platform and reseller permissions. This is wrong.

### New behavior: tabbed permission editor

When `maxScopeTier` changes, the permission picker shows only the tabs for accessible tiers. Each tab is one tier group.

```
maxScopeTier = 'platform'  →  4 tabs: [ Platform ] [ Reseller ] [ Tenant ] [ Business Unit ]
maxScopeTier = 'reseller'  →  3 tabs:             [ Reseller ] [ Tenant ] [ Business Unit ]
maxScopeTier = 'tenant'    →  2 tabs:                          [ Tenant ] [ Business Unit ]
maxScopeTier = 'client'    →  1 tab:                                      [ Business Unit ]
```

Each tab shows:
- Tab label with count of selected permissions in that group: "Tenant (8 of 34)"
- Permission checkboxes grouped by object (billing, user, role, etc.) — same layout as current `PermissionsMatrixEditor`
- A "Select all" link and "Clear" link per tab

**When max scope tier is lowered** (e.g., platform → tenant):
- Permissions that no longer belong to any accessible group are removed from `selectedPerms`
- A dismissible banner shows: "4 permissions removed — Platform and Reseller permissions are not available at Tenant tier."

**When max scope tier is raised** (e.g., tenant → reseller):
- No permissions are auto-added — the user picks what they want
- New tabs appear, empty by default

**For pool/connection/cloud-router max tiers** — these map to the Business Unit group (as `accessibleGroups()` already handles). Only the "Business Unit" tab appears. No special note needed — the tab label is self-explanatory.

### Component: `TieredPermissionsEditor`

New component, defined in `src/components/configure/users/RoleCatalog.tsx` (same file, above `RoleDrawer`).

```typescript
interface TieredPermissionsEditorProps {
  maxScopeTier: ScopeTier;
  callerPermissions: Permission[];   // what the caller holds — limits what can be granted
  selected: Set<Permission>;
  onSelected: (next: Set<Permission>) => void;
  isBCTemplate?: boolean;            // if true, no caller filter applies
}
```

Internal logic:
```typescript
// What's available given the selected tier (and caller's own permissions):
const groups = accessibleGroups(maxScopeTier);
const available = groups.flatMap(g => g.permissions).filter(p =>
  isBCTemplate || callerPermissions.includes(p)
);

// When maxScopeTier changes, remove out-of-scope selections:
// (handled via useEffect in parent RoleDrawer — see below)
```

### Change to `RoleDrawer`

Replace `PermissionsMatrixEditor` with `TieredPermissionsEditor`.

Add `useEffect` that fires when `maxScopeTier` changes:
```typescript
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
    setRemovedWarning(`${removed.length} permission${removed.length > 1 ? 's' : ''} removed — not available at ${maxScopeTier} tier`);
  }
}, [maxScopeTier]);
```

`removedWarning` state: string | null. Render as a dismissible yellow banner above the permission editor. Cleared on dismiss or next tier change.

### Component: `TierCascadePreview` (read-only, for Groups)

New file: `src/components/configure/users/TierCascadePreview.tsx`

Used in `CreateGroupDrawer` and `GroupDetailDrawer`. Shows the same tier structure but read-only, with expand/collapse per tier.

```typescript
export function TierCascadePreview({ maxScopeTier }: { maxScopeTier: ScopeTier })
```

Each tier row:
```
▶  Tenant (34 permissions) — Tenant-wide administration: business units, users, billing...
▶  Business Unit (27 permissions) — Network resource management: connections, routing...
```

Clicking a row expands to show permission list grouped by object (same read-only `PermissionsMatrix` format).

Collapsed by default. Only accessible tiers shown.

---

## Part 3 — Files Touched

| File | Change |
|---|---|
| `src/types/rbac.ts` | Add new `Permission` values: `design-library:*`, `instance:*`, `reseller:*`, `client:*`, `tenant:provision`, `tenant:suspend`, `design-library:import` |
| `src/data/tierPermissions.ts` | Rewrite `TIER_PERMISSION_GROUPS` with correct placements (above). No changes to `accessibleGroups()` or `TIER_RANK`. |
| `src/data/roleCatalog.ts` | Update `ALL_PERMISSIONS` array. Update `PlatformAdmin`, `ResellerAdmin`, `TenantAdmin`, `ClientAdmin` permission lists to include new permissions at correct tiers. Leave other roles unchanged. |
| `src/components/configure/users/RoleCatalog.tsx` | Replace `PermissionsMatrixEditor` in `RoleDrawer` with `TieredPermissionsEditor`. Add `useEffect` for auto-deselect. Add `removedWarning` state and banner. |
| `src/components/configure/users/CreateGroupDrawer.tsx` | Replace inline cascade preview block with `<TierCascadePreview />` |
| `src/components/configure/users/GroupDetailDrawer.tsx` | Add `<TierCascadePreview />` wherever scope ceiling is displayed |
| `src/components/configure/users/TierCascadePreview.tsx` | New file — read-only expandable tier preview |

---

## Part 4 — What Does Not Change

- `accessibleGroups()` — already correct
- `TIER_RANK` — already correct
- `ScopePicker.tsx` — scope selection is separate from permission selection
- `AssignRoleDrawer.tsx` — assigns roles to scopes, doesn't pick permissions
- `MultiScopePanel.tsx` — same
- Deny assignment flow
- SoD constraints

---

## Part 5 — Consistency Rule

After this change, every place permissions are shown or selected follows the same structure:
- **Editing a role**: tabbed by tier, only accessible tiers shown, auto-deselect on tier downgrade
- **Viewing a group ceiling**: same tier groups, read-only, expandable, permission counts visible

Platform admin in role editor sees 4 tabs. Tenant admin sees 2 tabs. The grouping is the same structure everywhere.
