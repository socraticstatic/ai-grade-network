# RBAC Demo Unification & UX Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bridge the two RBAC systems so the demo panel, role switcher, permission matrix, and profile page display real named-persona data from `rbac.ts` and `ROLE_CATALOG`; fix the one data model bug; and clean up 10 UX issues in the RBAC admin tabs.

**Architecture:** Three layers of change. (1) Add `activePersona: RoleName | null` to roleSlice alongside the existing `currentRole` — existing app gates keep reading `currentRole`, the demo surfaces read `activePersona`. (2) Swap RBACDemoPanel and RoleCapabilityMatrix off the deprecated 3-role system onto ROLE_CATALOG. (3) Targeted fixes in the admin tabs: SoD badge context, deny assignment grouping, audit log action labels.

**Tech Stack:** React 19, TypeScript strict, Zustand, Vite, Tailwind, Vitest

---

## Mental Model (read before touching any code)

Two systems coexist:

**Old system** (`src/types/permissions.ts`, marked `@deprecated`):
- `Role = 'user' | 'admin' | 'super-admin'`
- `ROLE_PERMISSIONS` — flat permission arrays using abstract names (`view`, `manage_billing`, etc.)
- Used by: `roleSlice.currentRole`, `usePermission.ts`, `BillingConfiguration`, `SystemSettings`, `UserProfile`, `ConfigureHub`, `PermissionBadge`

**New system** (`src/types/rbac.ts`):
- `RoleName` — 14 named roles (`NetworkEngineer`, `BillingAdmin`, etc.)
- `RoleDefinition` with real `permissions`, `maxScopeTier`, SoD constraints
- Used by: 5 RBAC admin tabs, `permissionResolver`, `rbacSlice`

**The rule for this plan:** Do NOT change the gates. `BillingConfiguration`, `SystemSettings`, `ConfigureHub` all check `currentRole` — they stay unchanged. `UserProfile` is an exception: its *display labels* update to show the active persona name, but its 3 coarse role-switcher cards keep calling `setRole()` as-is (they intentionally clear persona context). `ConnectionGrid`, `ConnectionDetails`, `MainNav` gates are unchanged.

**Persona-to-tier mapping** (how persona selection maps to `currentRole` for gates):

| Persona | currentRole |
|---|---|
| Viewer | 'user' |
| NetworkEngineer | 'admin' |
| BillingAdmin | 'admin' |
| SecurityAdmin | 'admin' |
| TenantAdmin | 'admin' |
| PlatformAdmin | 'super-admin' |

---

## File Map

### Files to modify
```
src/store/slices/roleSlice.ts            — add activePersona field + setActivePersona action
src/components/common/RBACDemoPanel.tsx  — persona-driven scope, scenarios, switcher
src/components/common/RoleCapabilityMatrix.tsx  — switch off deprecated types/permissions
src/components/common/DemoBar.tsx        — expand from 3 tiers to 6 named personas
src/hooks/usePermission.ts              — thin bridge: when activePersona set, use ROLE_CATALOG
src/data/tierPermissions.ts             — add partner:read to platform tier group
src/components/configure/users/UserList.tsx             — SoD badge: add conflicting roles to title
src/components/configure/users/AssignmentManagement.tsx — SoD popover, deny permission grouping, deny tier badge
src/components/configure/users/AuditLog.tsx             — action labels, scope tier badge, deny reason layout
src/components/configure/users/ConditionsPanel.tsx      — copy fixes (Geographic zone → Region, data classification copy)
src/components/configure/users/AssignRoleDrawer.tsx     — label: "Scope dimensions" → "Additional Constraints"
src/components/configure/users/GroupManagement.tsx      — copy fixes (inherits creator scope, status labels)
```

### Files to delete
```
src/components/common/DemoRoleSwitcher.tsx  — never imported anywhere, dead code
src/components/common/DemoScenarioBar.tsx   — never imported anywhere, dead code (duplicate of DemoBar scenarios)
```

### Files to create
```
src/utils/rbacLabels.ts  — shared OBJECT_LABELS map, ACTION_LABELS map, formatTimestamp util
```

---

## Task 1: roleSlice — Add activePersona Field

**Files:**
- Modify: `src/store/slices/roleSlice.ts`

**Context:** `roleSlice` drives the entire demo system. Currently only has `currentRole: UserRole`. We add `activePersona: RoleName | null` alongside it. When a persona is selected, both fields update: `activePersona` gets the named role, `currentRole` gets the mapped tier for gate compatibility.

- [ ] **Step 1: Add RoleName import and PERSONA_TIER_MAP constant**

In `src/store/slices/roleSlice.ts`, add after the existing imports:

```typescript
import { RoleName } from '../../types/rbac';
import { ROLE_CATALOG } from '../../data/roleCatalog';

const PERSONA_TIER_MAP: Record<string, UserRole> = {
  Viewer: 'user',
  NetworkEngineer: 'admin',
  BillingAdmin: 'admin',
  SecurityAdmin: 'admin',
  OperationsManager: 'admin',
  TenantAdmin: 'admin',
  ResellerAdmin: 'admin',
  PlatformAdmin: 'super-admin',
  PlatformViewer: 'user',
  ClientAdmin: 'admin',
  PartnerManager: 'super-admin',
  ProvisioningManager: 'admin',
  ApiManager: 'admin',
  SupportSpecialist: 'user',
};
```

- [ ] **Step 2: Add activePersona to RoleSlice interface**

In `src/store/slices/roleSlice.ts`, update the `RoleSlice` interface:

```typescript
export interface RoleSlice {
  currentRole: UserRole;
  activePersona: RoleName | null;
  impersonation: ImpersonationState;
  setRole: (role: UserRole) => void;
  setActivePersona: (persona: RoleName) => void;
  startImpersonation: (targetUser: { id: string; name: string; email: string; role: UserRole }) => void;
  exitImpersonation: () => void;
}
```

- [ ] **Step 3: Add activePersona initial state, setActivePersona action, and fix impersonation actions**

In `createRoleSlice`, update the returned object:

```typescript
export const createRoleSlice: StateCreator<RoleSlice> = (set, get) => ({
  currentRole: 'admin',
  activePersona: 'NetworkEngineer',   // sensible default for demo
  impersonation: {
    isImpersonating: false,
    targetUser: null,
    originalUser: null,
    startTime: null,
  },

  setRole: (role) => {
    set({ currentRole: role, activePersona: null });
    window.addToast?.({
      type: 'info',
      title: 'Role Changed',
      message: `Now viewing as ${role === 'super-admin' ? 'Super Admin' : role === 'admin' ? 'Tenant Admin' : 'Standard User'}`,
      duration: 3000,
    });
  },

  setActivePersona: (persona) => {
    const tier = PERSONA_TIER_MAP[persona] ?? 'admin';
    const displayName = ROLE_CATALOG[persona]?.displayName ?? persona;
    set({ activePersona: persona, currentRole: tier });
    window.addToast?.({
      type: 'info',
      title: 'Persona Changed',
      message: `Now viewing as ${displayName}`,
      duration: 3000,
    });
  },

  startImpersonation: (targetUser) => {
    const currentState = get();
    set({
      activePersona: null,                  // clear persona — impersonation is not a persona demo
      impersonation: {
        isImpersonating: true,
        targetUser,
        originalUser: {
          name: 'Emilio Estevez',
          email: 'emilio.estevez@att.com',
          role: currentState.currentRole,
        },
        startTime: new Date().toISOString(),
      },
      currentRole: targetUser.role,
    });
    window.addToast?.({
      type: 'info',
      title: 'Impersonation Started',
      message: `Now viewing as ${targetUser.name}`,
      duration: 4000,
    });
  },

  exitImpersonation: () => {
    const currentState = get();
    const originalRole = currentState.impersonation.originalUser?.role || 'admin';
    set({
      activePersona: null,                  // return to tier-only state after impersonation
      impersonation: {
        isImpersonating: false,
        targetUser: null,
        originalUser: null,
        startTime: null,
      },
      currentRole: originalRole,
    });
    window.addToast?.({
      type: 'success',
      title: 'Impersonation Ended',
      message: 'Returned to your account',
      duration: 3000,
    });
  },
});
```

**Why:** `startImpersonation` and `exitImpersonation` call `set({...})` directly (not through `setRole`), so they bypass the `activePersona: null` clearing. Without this fix, starting impersonation while `activePersona = 'NetworkEngineer'` would show the demo panel still claiming "Network Engineer" while `currentRole` has switched to the impersonated user's tier.

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/roleSlice.ts
git commit -m "feat(rbac): add activePersona to roleSlice with persona-to-tier mapping"
```

---

## Task 2: RBACDemoPanel — Persona-Driven Content

**Files:**
- Modify: `src/components/common/RBACDemoPanel.tsx`

**Context:** Panel currently reads `currentRole` (3 abstract tiers) everywhere. Change it to read `activePersona` + `setActivePersona` for the demo scenarios and role switcher. The scope breadcrumb can derive from the persona's `maxScopeTier`.

- [ ] **Step 1: Update store imports and destructuring**

In `RBACDemoPanel.tsx`, replace the store destructuring:

```typescript
import { useStore } from '../../store/useStore';
import { RoleName } from '../../types/rbac';
import { ROLE_CATALOG } from '../../data/roleCatalog';
// Remove: import { Role } from '../../types/permissions';

// Inside component:
const { currentRole, activePersona, setRole, setActivePersona } = useStore(s => ({
  currentRole: s.currentRole,
  activePersona: s.activePersona,
  setRole: s.setRole,
  setActivePersona: s.setActivePersona,
}));

const persona = activePersona ? ROLE_CATALOG[activePersona] : null;
const personaDisplayName = persona?.displayName ?? currentRole.replace('-', ' ');
```

- [ ] **Step 2: Replace scopeByRole with persona-tier scope derivation**

Replace lines 25-31 (the `scopeByRole` block and `demoScopePath`):

```typescript
// Derive scope path from persona's maxScopeTier (or currentRole as fallback)
const tierToScopePath: Record<string, string> = {
  platform: '/platform',
  reseller: '/resellers/RSL-001',
  tenant: '/tenants/TNT-001',
  client: '/tenants/TNT-001/clients/CLT-001',
  pool: '/tenants/TNT-001/clients/CLT-001/pools/POOL-001',
};
const effectiveTier = persona?.maxScopeTier ?? (currentRole === 'super-admin' ? 'platform' : currentRole === 'admin' ? 'tenant' : 'client');
const demoScopePath = tierToScopePath[effectiveTier] ?? '/tenants/TNT-001';
const breadcrumb = scopeDepthLabel(demoScopePath);
const scopeFilter = scopePathToFilter(demoScopePath);
```

- [ ] **Step 3: Replace 4 hardcoded demo scenarios with 6 persona scenarios**

Replace the `demoScenarios` array (lines 36-93):

```typescript
const KEY_PERSONAS: RoleName[] = [
  'NetworkEngineer', 'BillingAdmin', 'SecurityAdmin', 'TenantAdmin', 'Viewer', 'PlatformAdmin'
];

const demoScenarios = KEY_PERSONAS.map(personaId => {
  const def = ROLE_CATALOG[personaId];
  return {
    id: personaId,
    title: def.displayName,
    persona: personaId,
    description: def.description,
    tier: def.maxScopeTier,
    steps: [
      `Switch to ${def.displayName}`,
      `Scope: ${tierToScopePath[def.maxScopeTier] ?? '/tenants/TNT-001'}`,
      `${def.permissions.length} permissions active`,
      'View Permission Matrix to compare',
    ],
    icon: personaId === 'PlatformAdmin' ? Shield
      : personaId === 'BillingAdmin' ? DollarSign
      : personaId === 'SecurityAdmin' ? Lock
      : personaId === 'TenantAdmin' ? Users
      : personaId === 'Viewer' ? Eye
      : Settings,
    color: personaId === 'PlatformAdmin' ? 'purple'
      : personaId === 'SecurityAdmin' ? 'red'
      : personaId === 'BillingAdmin' ? 'blue'
      : 'green',
  };
});
```

- [ ] **Step 4: Update current role status display (line 190)**

Replace `{currentRole.replace('-', ' ')}` with `{personaDisplayName}`.

Add persona's permission count below:

```tsx
<p className="text-lg font-bold text-fw-heading tracking-[-0.03em]">{personaDisplayName}</p>
{persona && (
  <p className="text-figma-xs text-fw-bodyLight">{persona.permissions.length} permissions · {persona.maxScopeTier} tier</p>
)}
```

- [ ] **Step 5: Replace 3-role manual switcher (lines 355-379) with 6-persona switcher**

```tsx
{/* Role Switcher */}
<div className="mt-6 p-4 bg-fw-wash rounded-lg border border-fw-secondary">
  <h4 className="text-figma-base font-semibold text-fw-heading mb-3 tracking-[-0.03em]">Switch Persona</h4>
  <div className="grid grid-cols-3 gap-2">
    {KEY_PERSONAS.map((personaId) => {
      const def = ROLE_CATALOG[personaId];
      const isActive = activePersona === personaId;
      return (
        <button
          key={personaId}
          data-testid={`rbac-persona-${personaId}`}
          onClick={() => setActivePersona(personaId)}
          className={`p-3 rounded-lg border-2 transition-all ${
            isActive
              ? 'border-fw-active bg-fw-accent shadow-sm'
              : 'border-fw-secondary bg-fw-base hover:border-fw-active'
          }`}
        >
          <p className={`text-figma-xs font-semibold ${isActive ? 'text-fw-heading' : 'text-fw-body'}`}>
            {def.displayName}
          </p>
          <p className="text-[10px] text-fw-bodyLight mt-0.5 capitalize">{def.maxScopeTier}</p>
        </button>
      );
    })}
  </div>
</div>
```

- [ ] **Step 6: Update handleRunDemo to call setActivePersona**

```typescript
const handleRunDemo = (scenario: typeof demoScenarios[0]) => {
  setActivePersona(scenario.persona);
  setSelectedDemo(scenario.id);
  // navigation logic unchanged
};
```

- [ ] **Step 7: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/common/RBACDemoPanel.tsx
git commit -m "feat(rbac): RBACDemoPanel uses named personas from ROLE_CATALOG"
```

---

## Task 3: RoleCapabilityMatrix — Switch Off Deprecated Types

**Files:**
- Modify: `src/components/common/RoleCapabilityMatrix.tsx`

**Context:** The matrix currently imports `Role, ROLE_PERMISSIONS, PERMISSION_LABELS` from the deprecated `types/permissions.ts`. It shows a 3-column matrix of abstract permissions. Replace with 6 named personas and rbac permission categories.

- [ ] **Step 1: Replace imports**

Remove the deprecated import block (line 4):

```typescript
// Remove:
// import { Role, ROLE_PERMISSIONS, PERMISSION_LABELS, ... } from '../../types/permissions';

// Add:
import { RoleName, RoleDefinition } from '../../types/rbac';
import { ROLE_CATALOG } from '../../data/roleCatalog';
import { useStore } from '../../store/useStore';
```

- [ ] **Step 2: Update component props and roles array**

```typescript
interface RoleCapabilityMatrixProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: string;        // kept for backward compat but unused
  highlightRole?: string;
}

const KEY_PERSONAS: RoleName[] = [
  'Viewer', 'NetworkEngineer', 'BillingAdmin', 'SecurityAdmin', 'TenantAdmin', 'PlatformAdmin'
];
```

- [ ] **Step 3: Replace getRoleIcon and getRoleColor with persona-based versions**

```typescript
const getPersonaIcon = (personaId: RoleName) => {
  switch (personaId) {
    case 'PlatformAdmin': return <Crown className="h-4 w-4" />;
    case 'TenantAdmin': return <Shield className="h-4 w-4" />;
    case 'SecurityAdmin': return <Lock className="h-4 w-4" />;
    case 'BillingAdmin': return <DollarSign className="h-4 w-4" />;
    case 'Viewer': return <Eye className="h-4 w-4" />;
    default: return <Settings className="h-4 w-4" />;
  }
};
```

- [ ] **Step 4: Replace permissionsByCategory with rbac-mapped categories**

The old matrix used abstract permission names. Replace with object-grouped rbac permissions, using the top 4 most demo-relevant permission objects:

```typescript
const permissionCategories = [
  {
    key: 'network',
    label: 'Network Resources',
    description: 'Connections, links, subnets, cloud routers',
    permissions: ['connection:read', 'connection:write', 'connection:delete', 'connection:operate'] as const,
  },
  {
    key: 'users',
    label: 'User Management',
    description: 'Invite, manage, and delete users',
    permissions: ['user:read', 'user:write', 'user:delete'] as const,
  },
  {
    key: 'billing',
    label: 'Billing',
    description: 'View and manage billing, export data',
    permissions: ['billing:read', 'billing:finance', 'billing:export'] as const,
  },
  {
    key: 'system',
    label: 'System & Platform',
    description: 'System configuration, instance management, reseller ops',
    permissions: ['system:configure', 'system:administer', 'instance:add', 'reseller:write'] as const,
  },
] as const;

type DemoPermission = typeof permissionCategories[number]['permissions'][number];
```

- [ ] **Step 5: Replace the grid render (columns are now 7: label + 6 personas)**

Update `grid-cols-4` to `grid-cols-7` throughout. Replace `roles.map(...)` with `KEY_PERSONAS.map(personaId => ...)`. For each cell, check `ROLE_CATALOG[personaId].permissions.includes(permission)`.

```tsx
{KEY_PERSONAS.map((personaId) => {
  const def = ROLE_CATALOG[personaId];
  const activePersona = useStore(s => s.activePersona);
  const isCurrentPersona = activePersona === personaId;
  return (
    <div key={personaId} className={`text-center rounded-lg p-2 ${isCurrentPersona ? 'bg-fw-wash border border-fw-secondary' : ''}`}>
      <div className={`inline-flex items-center gap-1.5 text-[12px] font-medium tracking-[-0.03em] ${isCurrentPersona ? 'text-fw-link' : 'text-fw-heading'}`}>
        {getPersonaIcon(personaId)}
        <span>{def.displayName}</span>
      </div>
      <div className="text-[11px] text-fw-bodyLight mt-0.5">{def.maxScopeTier}</div>
      {isCurrentPersona && <div className="text-[11px] text-fw-link font-medium mt-0.5">Active</div>}
    </div>
  );
})}
```

- [ ] **Step 6: Update permission rows**

```tsx
{permissionCategories.map(cat => (
  // expandable section per category
  // each permission row: 7 cells (label + 6 persona checks)
  // hasPermission = ROLE_CATALOG[personaId].permissions.includes(perm)
))}
```

- [ ] **Step 7: Update the inheritance visualization and resource filter section**

The old visualization showed User → Admin → Super Admin with hardcoded counts. Replace with a tier cascade diagram:

```tsx
<div className="bg-fw-wash border border-fw-secondary rounded-lg p-4">
  <h4 className="text-figma-base font-semibold text-fw-heading mb-3 tracking-[-0.03em]">Permission Tier Cascade</h4>
  <div className="flex items-center justify-center gap-2 flex-wrap">
    {(['client', 'tenant', 'reseller', 'platform'] as const).map((tier, i, arr) => (
      <div key={tier} className="flex items-center gap-2">
        <div className="flex flex-col items-center">
          <div className="text-figma-xs font-semibold text-fw-heading capitalize">{tier}</div>
          <div className="text-[11px] text-fw-bodyLight">includes {tier} scope</div>
        </div>
        {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-fw-disabled" />}
      </div>
    ))}
  </div>
  <p className="text-figma-xs text-fw-bodyLight text-center mt-3">Broader tiers include all narrower-tier permissions via cascade.</p>
</div>
```

The resource filter section (ROLE_DEFAULT_FILTER / ROLE_MAX_FILTER) uses the old `types/permissions.ts`. Remove this section entirely — it's not relevant to the new rbac model. The scope section below it can stay.

- [ ] **Step 8: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add src/components/common/RoleCapabilityMatrix.tsx
git commit -m "feat(rbac): RoleCapabilityMatrix uses named personas and rbac permission categories"
```

---

## Task 4: DemoBar — 6 Named Personas + Delete Dead Demo Components

**Files:**
- Modify: `src/components/common/DemoBar.tsx`
- Delete: `src/components/common/DemoRoleSwitcher.tsx`
- Delete: `src/components/common/DemoScenarioBar.tsx`

**Context:** DemoBar currently has 3 roles (user/admin/super-admin). Replace with 6 key named personas. Use `setActivePersona` instead of `setRole`. Both DemoRoleSwitcher and DemoScenarioBar are never imported anywhere — safe to delete.

- [ ] **Step 1: Verify both files are truly unreferenced**

```bash
grep -r "DemoRoleSwitcher\|DemoScenarioBar" /Users/micahbos/Developer/att-netbond-sdci/src --include="*.tsx" --include="*.ts"
```

Expected: only the definition files themselves (no imports).

- [ ] **Step 2: Delete DemoRoleSwitcher.tsx**

```bash
rm /Users/micahbos/Developer/att-netbond-sdci/src/components/common/DemoRoleSwitcher.tsx
```

- [ ] **Step 3: Update DemoBar imports and ROLES constant**

In `src/components/common/DemoBar.tsx`:

```typescript
import { RoleName } from '../../types/rbac';
import { ROLE_CATALOG } from '../../data/roleCatalog';

// Replace:
// const ROLES: { id: UserRole; label: string }[] = [...]

const PERSONAS: { id: RoleName; short: string }[] = [
  { id: 'Viewer',          short: 'Viewer' },
  { id: 'NetworkEngineer', short: 'Net Eng' },
  { id: 'BillingAdmin',    short: 'Billing' },
  { id: 'SecurityAdmin',   short: 'Security' },
  { id: 'TenantAdmin',     short: 'Tenant' },
  { id: 'PlatformAdmin',   short: 'Platform' },
];
```

- [ ] **Step 4: Update store destructuring**

```typescript
const currentRole = useStore(s => s.currentRole);
const activePersona = useStore(s => s.activePersona);
const setRole = useStore(s => s.setRole);
const setActivePersona = useStore(s => s.setActivePersona);
```

- [ ] **Step 5: Replace role pill buttons with persona pill buttons**

```tsx
{PERSONAS.map(p => (
  <button
    key={p.id}
    onClick={() => setActivePersona(p.id)}
    className={pill(activePersona === p.id)}
  >
    {p.short}
  </button>
))}
```

Remove the old `{ROLES.map(...)}` block.

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/common/DemoBar.tsx
git rm src/components/common/DemoRoleSwitcher.tsx src/components/common/DemoScenarioBar.tsx
git commit -m "feat(rbac): DemoBar uses 6 named personas; delete dead DemoRoleSwitcher + DemoScenarioBar"
```

---

## Task 4b: UserProfile — Show Persona Display Name

**Files:**
- Modify: `src/components/profile/UserProfile.tsx`

**Context:** The profile page `/profile` shows a "Current Role" section that reads `currentRole` directly (line 909: `currentRole.replace('-', ' ')`, lines 915-917: hardcoded "Platform Administrator / Tenant Administrator / Standard User"). When `activePersona = 'NetworkEngineer'` and `currentRole = 'admin'`, the profile page shows "admin / Tenant Administrator" — wrong. Fix: derive the display name from `activePersona` when set, fall back to tier label when not.

The 3 coarse role-switcher cards (Super Admin, Tenant Admin, Standard User) at lines ~1003-1055 keep calling `setRole(...)` — that's intentional, they're demo tier controls. Do NOT change them. Only the display labels update.

- [ ] **Step 1: Add activePersona and ROLE_CATALOG to UserProfile's store destructuring and imports**

In `src/components/profile/UserProfile.tsx`, add:

```typescript
import { ROLE_CATALOG } from '../../data/roleCatalog';

// In component, update store destructure to add:
const activePersona = useStore(s => s.activePersona);
```

- [ ] **Step 2: Derive persona-aware display values**

Add after the store destructuring:

```typescript
const personaDisplayName = activePersona
  ? (ROLE_CATALOG[activePersona]?.displayName ?? currentRole.replace(/-/g, ' '))
  : currentRole === 'super-admin' ? 'Super Admin'
  : currentRole === 'admin' ? 'Tenant Admin'
  : 'Standard User';

const personaRoleLabel = activePersona
  ? (ROLE_CATALOG[activePersona]?.description?.split('.')[0] ?? '')
  : currentRole === 'super-admin' ? 'Platform Administrator'
  : currentRole === 'admin' ? 'Tenant Administrator'
  : 'Standard User';
```

- [ ] **Step 3: Replace role display label (line 909)**

```tsx
// Before:
<p className="text-base font-semibold text-fw-heading capitalize mt-0.5">
  {currentRole.replace('-', ' ')}
</p>

// After:
<p className="text-base font-semibold text-fw-heading mt-0.5">
  {personaDisplayName}
</p>
```

- [ ] **Step 4: Replace hardcoded role sublabel (lines 915-917)**

```tsx
// Before:
<p className="text-figma-sm text-fw-bodyLight">
  {currentRole === 'super-admin' && 'Platform Administrator'}
  {currentRole === 'admin' && 'Tenant Administrator'}
  {currentRole === 'user' && 'Standard User'}
</p>

// After:
<p className="text-figma-sm text-fw-bodyLight">
  {personaRoleLabel}
</p>
```

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/profile/UserProfile.tsx
git commit -m "fix(rbac): UserProfile role display shows active persona name"
```

---

## Task 5: usePermission Bridge

**Files:**
- Modify: `src/hooks/usePermission.ts`

**Context:** `usePermission` currently looks up the old abstract `ROLE_PERMISSIONS[currentRole]`. The gates in `ConfigureHub`, `SystemSettings` etc. use it with old permission names (`manage_billing`, `manage_system`) — those MUST keep working unchanged. Add a second hook `usePersonaPermission` that reads from the active persona's real rbac permissions. The existing `usePermission` and `usePermissions` are not modified.

- [ ] **Step 1: Add usePersonaPermissions hook**

In `src/hooks/usePermission.ts`, add after the existing exports:

```typescript
import { Permission as RbacPermission } from '../types/rbac';
import { ROLE_CATALOG } from '../data/roleCatalog';

/**
 * Returns the active persona's real rbac permissions (from ROLE_CATALOG).
 * Used by demo-facing components (RBACDemoPanel, RoleCapabilityMatrix).
 * Does NOT affect gate checks — those still use usePermission/usePermissions.
 */
export function usePersonaPermissions(): RbacPermission[] {
  const activePersona = useStore(state => state.activePersona);
  if (!activePersona) return [];
  return ROLE_CATALOG[activePersona]?.permissions ?? [];
}

/**
 * Returns true if the active persona has the given rbac permission.
 * Usage: const canEdit = usePersonaPermission('connection:write');
 */
export function usePersonaPermission(permission: RbacPermission): boolean {
  const perms = usePersonaPermissions();
  return perms.includes(permission);
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePermission.ts
git commit -m "feat(rbac): add usePersonaPermissions hook for demo-facing rbac permission reads"
```

---

## Task 6: Data Bug — partner:read in Platform Tier

**Files:**
- Modify: `src/data/tierPermissions.ts` (line 37)

**Context:** Platform tier lists `partner:write` and `partner:delete` at line 37, but not `partner:read`. Platform manages partner accounts — they need to read them too. `partner:read` exists in the reseller tier (accessible to platform via cascade), but the explicit omission from the platform group is semantically wrong: write/delete without read is incoherent.

- [ ] **Step 1: Add partner:read to platform tier permissions**

In `src/data/tierPermissions.ts`, find the platform group at line 37. Change:

```typescript
// Before:
'partner:write', 'partner:delete',

// After:
'partner:read', 'partner:write', 'partner:delete',
```

- [ ] **Step 2: Run existing validation test to confirm no new errors**

```bash
npx vitest run src/utils/validatePermissionModel.test.ts 2>&1 | tail -20
```

Expected: all tests pass. No new "permission appears in multiple groups" errors — `partner:read` is now in BOTH platform and reseller groups, which is intentional (both tiers can read partners for their own reasons). The validator checks that every permission in `ALL_PERMISSIONS` appears in at least one group — this fixes a gap, it doesn't create a conflict because the validator's dedup check fires on the same tier, not across tiers.

Wait — check the validator's dedup logic:

```typescript
// In validatePermissionModel.ts:
const seen = new Map<Permission, string>();
for (const group of TIER_PERMISSION_GROUPS) {
  for (const p of group.permissions) {
    if (seen.has(p)) {
      errors.push(`Permission '${p}' appears in both '${seen.get(p)}' and '${group.tier}' groups`);
    }
    seen.set(p, group.tier);
  }
}
```

This WILL flag `partner:read` as a duplicate. To fix, either: (a) remove `partner:read` from reseller and only keep it in platform (platform cascade already gives resellers access to it), or (b) accept that platform and reseller both explicitly list it.

**Decision:** Remove `partner:read` from reseller tier — platform tier is where it belongs. Resellers inherit it via cascade from platform.

In the reseller group, change:

```typescript
// Before:
permissions: [
  'design-library:import',
  'tenant:provision', 'tenant:suspend', 'tenant:administer',
  'partner:read',
],

// After:
permissions: [
  'design-library:import',
  'tenant:provision', 'tenant:suspend', 'tenant:administer',
],
```

- [ ] **Step 3: Re-run validation test**

```bash
npx vitest run src/utils/validatePermissionModel.test.ts 2>&1 | tail -20
```

Expected: all tests pass with no errors.

- [ ] **Step 4: Check existing tests that may reference partner:read at reseller tier**

```bash
grep -r "partner:read" /Users/micahbos/Developer/att-netbond-sdci/src /Users/micahbos/Developer/att-netbond-sdci/tests --include="*.ts" --include="*.tsx" --include="*.spec.ts"
```

If any test explicitly asserts `partner:read` in reseller group, update it to assert platform group.

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/data/tierPermissions.ts
git commit -m "fix(rbac): move partner:read from reseller to platform tier — platform manages partner accounts"
```

---

## Task 7: SoD Badge Context — Users Tab + Assignments Tab

**Files:**
- Modify: `src/components/configure/users/UserList.tsx` (lines 202-218)
- Modify: `src/components/configure/users/AssignmentManagement.tsx` (lines 184-193)

**Context:** SoD badges currently show generic text. Users tab: no title at all. Assignments tab: has a generic title but doesn't name the constraint or the conflicting role. Both should show which roles are in conflict.

- [ ] **Step 1: Create a getSodContext helper**

Add this helper near the top of each file (or extract to a shared location — see Task 11 for shared util):

In `UserList.tsx`, add after the imports:

```typescript
function getSodConflictTitle(roles: string[]): string {
  const conflictingPairs = SOD_CONSTRAINTS
    .filter(c => {
      const [a, b] = c.mutuallyExclusiveRoles;
      return roles.includes(a) && roles.includes(b);
    })
    .map(c => {
      const [a, b] = c.mutuallyExclusiveRoles;
      const nameA = ROLE_CATALOG[a]?.displayName ?? a;
      const nameB = ROLE_CATALOG[b]?.displayName ?? b;
      return `${nameA} + ${nameB} (${c.name})`;
    });
  return conflictingPairs.length
    ? `SoD conflict: ${conflictingPairs.join('; ')}`
    : 'SoD conflict';
}
```

- [ ] **Step 2: Update UserList SoD badge (lines 212-216)**

```tsx
// Before:
return (
  <span className="flex items-center gap-1 text-figma-xs text-fw-error font-medium">
    <AlertTriangle className="h-3 w-3" />
    SoD conflict
  </span>
);

// After:
const conflictTitle = getSodConflictTitle(roles);
return (
  <span
    title={conflictTitle}
    className="flex items-center gap-1 text-figma-xs text-fw-error font-medium cursor-help"
  >
    <AlertTriangle className="h-3 w-3" />
    SoD conflict
  </span>
);
```

- [ ] **Step 3: Add getSodContext helper to AssignmentManagement.tsx**

In `AssignmentManagement.tsx`, add after imports:

```typescript
function getSodConstraintForAssignment(assignmentId: string, allAssignments: RoleAssignment[]): string {
  const assignment = allAssignments.find(a => a.id === assignmentId);
  if (!assignment) return 'SoD conflict';
  const principalAssignments = allAssignments.filter(a => a.principal.id === assignment.principal.id && a.status === 'active');
  const roles = principalAssignments.map(a => a.role);
  const conflictingConstraints = SOD_CONSTRAINTS
    .filter(c => {
      const [r1, r2] = c.mutuallyExclusiveRoles;
      return roles.includes(r1) && roles.includes(r2);
    })
    .map(c => {
      const [r1, r2] = c.mutuallyExclusiveRoles;
      const n1 = ROLE_CATALOG[r1]?.displayName ?? r1;
      const n2 = ROLE_CATALOG[r2]?.displayName ?? r2;
      return `${n1} conflicts with ${n2}`;
    });
  return conflictingConstraints.length
    ? `SoD: ${conflictingConstraints.join(' · ')}`
    : 'SoD conflict';
}
```

- [ ] **Step 4: Update AssignmentManagement SoD column render (lines 186-193)**

```tsx
// Before:
sodViolatingIds.has(a.id) ? (
  <span
    title="Separation of Duties conflict — this assignment creates a mutually exclusive role pair."
    className="..."
  >
    ⚠ SoD
  </span>
) : null,

// After:
sodViolatingIds.has(a.id) ? (
  <span
    title={getSodConstraintForAssignment(a.id, roleAssignments)}
    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded border bg-fw-errorLight text-fw-error border-fw-error cursor-help"
  >
    ⚠ SoD
  </span>
) : null,
```

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add src/components/configure/users/UserList.tsx \
        src/components/configure/users/AssignmentManagement.tsx
git commit -m "fix(rbac): SoD badge shows conflicting role names in tooltip"
```

---

## Task 8: Deny Assignment — Group Permissions + Tier Badge

**Files:**
- Modify: `src/components/configure/users/AssignmentManagement.tsx` (lines 217-233)

**Context:** The deny tab has two issues. (1) Permissions column renders flat raw strings like `connection:read`, `connection:write` — should be grouped by object. (2) Scope column has no tier badge — the allow tab has one, deny tab doesn't.

- [ ] **Step 1: Add groupPermissionsByObject helper**

Add above `AssignmentManagement` function in the file:

```typescript
function groupPermissionsByObject(perms: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const [obj, action] = p.split(':');
    if (!groups[obj]) groups[obj] = [];
    groups[obj].push(action);
  }
  return groups;
}
```

- [ ] **Step 2: Update the deny Permissions column render (lines 217-223)**

```tsx
// Before:
{
  id: 'permissions',
  label: 'Denied Permissions',
  render: (d: DenyAssignment) => (
    <div className="flex flex-wrap gap-1">
      {d.permissions.map(p => (
        <span key={p} className="px-1.5 py-0.5 text-figma-xs bg-fw-errorLight text-fw-error rounded">{p}</span>
      ))}
    </div>
  ),
},

// After:
{
  id: 'permissions',
  label: 'Denied Permissions',
  render: (d: DenyAssignment) => {
    const grouped = groupPermissionsByObject(d.permissions);
    return (
      <div className="space-y-1">
        {Object.entries(grouped).sort().map(([obj, actions]) => (
          <div key={obj} className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-fw-bodyLight capitalize w-20 shrink-0">
              {obj.replace(/-/g, ' ')}:
            </span>
            <div className="flex flex-wrap gap-1">
              {actions.sort().map(a => (
                <span key={a} className="px-1.5 py-0.5 text-[9px] bg-fw-errorLight text-fw-error rounded font-medium">
                  {a}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  },
},
```

- [ ] **Step 3: Update deny Scope column (lines 228-232) to add tier badge**

```tsx
// Before:
{
  id: 'scope',
  label: 'Scope',
  render: (d: DenyAssignment) => (
    <div>
      <span className="text-figma-xs text-fw-bodyLight font-mono">{d.scope.raw}</span>
      <ScopeDimensionChips conditions={d.conditions} />
    </div>
  ),
},

// After:
{
  id: 'scope',
  label: 'Scope',
  render: (d: DenyAssignment) => {
    const tier = d.scope.tier;
    const breadthBadge = tier === 'tenant'
      ? 'bg-fw-warnLight text-fw-warn border-fw-warn'
      : tier === 'client'
      ? 'bg-fw-successLight text-fw-success border-fw-success'
      : 'bg-fw-neutral text-fw-disabled border-fw-secondary';
    return (
      <div className="flex flex-col gap-0.5">
        <span className={`self-start px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide rounded border ${breadthBadge}`}>
          {tier}
        </span>
        <span className="text-figma-xs text-fw-bodyLight font-mono">{d.scope.raw}</span>
        <ScopeDimensionChips conditions={d.conditions} />
      </div>
    );
  },
},
```

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/components/configure/users/AssignmentManagement.tsx
git commit -m "fix(rbac): deny tab groups permissions by object and adds tier badge to scope"
```

---

## Task 9: AuditLog — Action Labels + Scope Tier Badge

**Files:**
- Modify: `src/components/configure/users/AuditLog.tsx`

**Context:** Action column shows raw enum strings like `role-assignment:assign`. Scope column has no tier badge. DENY reason is rendered inside the Result cell, cramped.

- [ ] **Step 1: Add ACTION_LABELS map**

Add after the `formatTimestamp` function:

```typescript
const ACTION_LABELS: Record<string, string> = {
  // Role assignments
  'role-assignment:assign':  'Assigned role',
  'role-assignment:revoke':  'Revoked role',
  'role-assignment:read':    'Viewed assignments',
  // Users
  'user:read':    'Viewed user',
  'user:write':   'Updated user',
  'user:delete':  'Deleted user',
  'user:operate': 'Operated as user',
  // Roles
  'role:read':    'Viewed role',
  'role:write':   'Updated role',
  'role:delete':  'Deleted role',
  // Policies
  'policy:assign':  'Assigned policy',
  'policy:write':   'Updated policy',
  'policy:delete':  'Deleted policy',
  // Connections
  'connection:write':   'Modified connection',
  'connection:delete':  'Deleted connection',
  'connection:operate': 'Operated connection',
  // System
  'system:configure':  'Changed system config',
  'system:administer': 'Admin system operation',
  // Billing
  'billing:finance': 'Billing finance operation',
  'billing:export':  'Exported billing data',
  // Audit
  'audit:read': 'Viewed audit log',
  // Deny assignments
  'deny-assignment:create': 'Created deny assignment',
  'deny-assignment:lift':   'Lifted deny assignment',
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(':', ': ').replace(/-/g, ' ');
}
```

- [ ] **Step 2: Add scope tier badge helper**

```typescript
function scopeTierBadge(tier: string): string {
  if (tier === 'tenant') return 'bg-fw-warnLight text-fw-warn border-fw-warn';
  if (tier === 'client') return 'bg-fw-successLight text-fw-success border-fw-success';
  if (tier === 'platform') return 'bg-fw-purpleLight text-fw-purple border-fw-purple';
  return 'bg-fw-neutral text-fw-disabled border-fw-secondary';
}
```

- [ ] **Step 3: Update Action column (line 115)**

```tsx
// Before:
<td className="px-4 py-3 text-fw-body font-mono text-figma-xs">{e.action}</td>

// After:
<td className="px-4 py-3">
  <div className="text-fw-body text-figma-xs">{formatAction(e.action)}</div>
  <div className="text-[10px] text-fw-disabled font-mono mt-0.5">{e.action}</div>
</td>
```

- [ ] **Step 4: Update Scope column (line 120)**

```tsx
// Before:
<td className="px-4 py-3 text-figma-xs text-fw-bodyLight font-mono">{e.scope.raw}</td>

// After:
<td className="px-4 py-3">
  <span className={`inline-block mb-1 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide rounded border ${scopeTierBadge(e.scope.tier)}`}>
    {e.scope.tier}
  </span>
  <div className="text-figma-xs text-fw-bodyLight font-mono truncate max-w-[180px]" title={e.scope.raw}>
    {e.scope.raw}
  </div>
</td>
```

- [ ] **Step 5: Update Result column — move deny reason out of result cell**

Add a new column after Result:

```tsx
// In the column headers array, add:
['Timestamp', 'Principal', 'Action', 'Object', 'Scope', 'Result', 'Note']
//                                                                         ^^^^

// Add a Note column after Result:
<td className="px-4 py-3">
  {e.result === 'DENY' && e.denyReason && (
    <span className="text-figma-xs text-fw-error">{e.denyReason}</span>
  )}
</td>

// In the Result cell, REMOVE the deny reason:
<td className="px-4 py-3">
  <ResultBadge result={e.result} />
</td>
```

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 7: Commit**

```bash
git add src/components/configure/users/AuditLog.tsx
git commit -m "fix(rbac): audit log shows human-readable action labels, scope tier badge, deny reason in separate column"
```

---

## Task 10: Labels and Copy Fixes (Bucket 4)

**Files:**
- Modify: `src/components/configure/users/ConditionsPanel.tsx`
- Modify: `src/components/configure/users/AssignRoleDrawer.tsx`
- Modify: `src/components/configure/users/GroupManagement.tsx`

**Context:** Several label/copy strings are either technically worded, inconsistent, or use raw enum values.

- [ ] **Step 1: ConditionsPanel.tsx — fix "Geographic zone" label (line 162)**

```tsx
// Before:
<p className="text-figma-xs font-medium text-fw-body mb-1.5">Geographic zone</p>

// After:
<p className="text-figma-xs font-medium text-fw-body mb-1.5">Region</p>
```

- [ ] **Step 2: ConditionsPanel.tsx — fix "Max data classification" label and help text (line 211)**

```tsx
// Before:
<label className="block text-figma-xs font-medium text-fw-body mb-1.5">Max data classification</label>

// After:
<label className="block text-figma-xs font-medium text-fw-body mb-1.5">Max Data Classification</label>
```

Change the help text below it (the `<p>` after the `<select>`):

```tsx
// Before:
<p className="mt-1 text-figma-xs text-fw-bodyLight">
  Resources classified above this level will be denied.
</p>

// After:
<p className="mt-1 text-figma-xs text-fw-bodyLight">
  Resources above this classification level are denied — regardless of other permissions.
</p>
```

- [ ] **Step 3: AssignRoleDrawer.tsx — fix "Scope dimensions" label (line 424)**

```tsx
// Before:
<span className="text-figma-sm font-medium text-fw-heading">Scope dimensions</span>

// After:
<span className="text-figma-sm font-medium text-fw-heading">Additional Constraints</span>
```

- [ ] **Step 4: GroupManagement.tsx — fix "(inherits creator scope)" text (line 90)**

```tsx
// Before:
{g.scopeCeiling.path?.raw ?? '(inherits creator scope)'}

// After:
{g.scopeCeiling.path?.raw ?? '(uses creator\'s scope)'}
```

- [ ] **Step 5: GroupManagement.tsx — add STATUS_LABELS for raw enum values (line 105)**

Add a constant near the top of the file:

```typescript
const STATUS_LABELS: Record<AccessGroupStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  ownerless: 'Ownerless',
  'pending-review': 'Pending Review',
  closed: 'Closed',
};
```

Update the status cell (line 105):

```tsx
// Before:
{g.status}

// After:
{STATUS_LABELS[g.status] ?? g.status}
```

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 7: Commit**

```bash
git add src/components/configure/users/ConditionsPanel.tsx \
        src/components/configure/users/AssignRoleDrawer.tsx \
        src/components/configure/users/GroupManagement.tsx
git commit -m "fix(rbac): label and copy polish — Region, Additional Constraints, status labels, scope ceiling copy"
```

---

## Task 11: Count and Context Improvements

**Files:**
- Modify: `src/components/configure/users/AssignmentManagement.tsx`
- Modify: `src/components/configure/users/GroupManagement.tsx`
- Modify: `src/components/configure/users/RoleCatalog.tsx`

- [ ] **Step 1: AssignmentManagement — IP chip shows count (ScopeDimensionChips, line 50)**

```typescript
// Before:
if (q?.allowedIPs?.length) chips.push('IP restricted');

// After:
if (q?.allowedIPs?.length) chips.push(`IP restricted (${q.allowedIPs.length})`);
```

- [ ] **Step 2: GroupManagement — Members column shows count + first 2 names**

First, check how members are stored. The `g.members` array contains member IDs or member objects. Read the `AccessGroup` type to confirm the member shape.

```bash
grep -n "members\|AccessGroup" /Users/micahbos/Developer/att-netbond-sdci/src/types/rbac.ts | head -20
```

If `g.members` is `string[]` (IDs), update the members column render:

```tsx
{
  id: 'members',
  label: 'Members',
  render: (g: AccessGroup) => {
    const count = g.members.length;
    if (count === 0) return <span className="text-figma-xs text-fw-disabled">None</span>;
    // members is an array of user IDs — just show count for now
    // (full name lookup would require joining with users store)
    return (
      <span className="text-figma-sm text-fw-heading font-medium">{count}</span>
    );
  },
},
```

If the `AccessGroup` type has member display names available, show `first 2 names + N more`. Read the type first before implementing.

- [ ] **Step 3: RoleCatalog — PermissionsMatrix adds per-object count badge**

In `RoleCatalog.tsx`, update `PermissionsMatrix` component (lines 28-52):

```tsx
function PermissionsMatrix({ permissions }: { permissions: Permission[] }) {
  const grouped = groupByObject(permissions);
  const objects = Object.keys(grouped).sort();
  return (
    <div className="space-y-0">
      {objects.map(obj => (
        <div key={obj} className="flex items-start gap-4 py-2 border-b border-fw-secondary last:border-0">
          <div className="flex items-center gap-1.5 w-28 shrink-0">
            <span className="text-figma-xs font-semibold text-fw-heading capitalize">
              {obj.replace(/-/g, ' ')}
            </span>
            <span className="text-[9px] text-fw-disabled font-medium px-1 py-0.5 bg-fw-wash border border-fw-secondary rounded">
              {grouped[obj].length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {grouped[obj].sort().map(action => (
              <span
                key={action}
                className="px-2 py-0.5 text-figma-xs text-fw-body bg-fw-wash border border-fw-secondary rounded"
              >
                {action}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/components/configure/users/AssignmentManagement.tsx \
        src/components/configure/users/GroupManagement.tsx \
        src/components/configure/users/RoleCatalog.tsx
git commit -m "fix(rbac): IP chip shows count, permissions matrix shows per-object count"
```

---

## Task 12: Shared Utility Extraction

**Files:**
- Create: `src/utils/rbacLabels.ts`
- Modify: `src/components/configure/users/AuditLog.tsx`
- Modify: `src/components/configure/users/EffectivePermissionsModal.tsx`

**Context:** `OBJECT_LABELS` (mapping raw permission object names to display names) exists in `EffectivePermissionsModal.tsx` and is partially duplicated via `obj.replace(/-/g, ' ')` in `RoleCatalog.tsx`, `TierCascadePreview.tsx`, and `AuditLog.tsx`. `formatTimestamp` exists locally in `AuditLog.tsx`. Extract both to a shared util.

- [ ] **Step 1: Check current OBJECT_LABELS in EffectivePermissionsModal**

```bash
sed -n '25,60p' /Users/micahbos/Developer/att-netbond-sdci/src/components/configure/users/EffectivePermissionsModal.tsx
```

- [ ] **Step 2: Create src/utils/rbacLabels.ts**

```typescript
// src/utils/rbacLabels.ts
// Shared display labels for RBAC objects, actions, and formatting utilities.

export const OBJECT_LABELS: Record<string, string> = {
  connection: 'Connections',
  link: 'Links (VLANs)',
  subnet: 'Subnets',
  'cloud-router': 'Cloud Routers',
  vnf: 'VNFs',
  pool: 'Pools',
  monitoring: 'Monitoring',
  'alert-rule': 'Alert Rules',
  report: 'Reports',
  user: 'Users',
  role: 'Roles',
  'role-assignment': 'Role Assignments',
  billing: 'Billing',
  policy: 'Policies',
  partner: 'Partners',
  api: 'API Keys',
  tenant: 'Tenants',
  client: 'Clients',
  system: 'System',
  audit: 'Audit',
  'design-library': 'Design Libraries',
  instance: 'Instances',
  reseller: 'Resellers',
};

export const ACTION_LABELS: Record<string, string> = {
  'role-assignment:assign':  'Assigned role',
  'role-assignment:revoke':  'Revoked role',
  'role-assignment:read':    'Viewed assignments',
  'user:read':    'Viewed user',
  'user:write':   'Updated user',
  'user:delete':  'Deleted user',
  'user:operate': 'Operated as user',
  'role:read':    'Viewed role',
  'role:write':   'Updated role',
  'role:delete':  'Deleted role',
  'policy:assign':  'Assigned policy',
  'policy:write':   'Updated policy',
  'policy:delete':  'Deleted policy',
  'connection:write':   'Modified connection',
  'connection:delete':  'Deleted connection',
  'connection:operate': 'Operated connection',
  'system:configure':  'Changed system config',
  'system:administer': 'Admin system operation',
  'billing:finance': 'Billing finance operation',
  'billing:export':  'Exported billing data',
  'audit:read': 'Viewed audit log',
  'deny-assignment:create': 'Created deny assignment',
  'deny-assignment:lift':   'Lifted deny assignment',
};

export function formatObjectName(obj: string): string {
  return OBJECT_LABELS[obj] ?? obj.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(':', ': ').replace(/-/g, ' ');
}

export function formatTimestamp(iso: string): { relative: string; absolute: string } {
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

- [ ] **Step 3: Update AuditLog.tsx to import from rbacLabels**

Remove the local `formatTimestamp` and `ACTION_LABELS` functions from `AuditLog.tsx`. Replace with imports:

```typescript
import { formatTimestamp, formatAction, formatObjectName } from '../../../utils/rbacLabels';
```

Update object type display in the Object column (line 117) to use `formatObjectName(e.objectType)`.

- [ ] **Step 4: Update EffectivePermissionsModal.tsx**

Replace local `OBJECT_LABELS` (lines 28-50 approximately) with import:

```typescript
import { OBJECT_LABELS, formatObjectName } from '../../../utils/rbacLabels';
```

Remove the local definition. Update usages from `OBJECT_LABELS[obj]` to `formatObjectName(obj)`.

- [ ] **Step 5: Compile check — full codebase**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/utils/rbacLabels.ts \
        src/components/configure/users/AuditLog.tsx \
        src/components/configure/users/EffectivePermissionsModal.tsx
git commit -m "refactor(rbac): extract OBJECT_LABELS, ACTION_LABELS, formatTimestamp to shared rbacLabels util"
```

---

## UX Verification Checklist

After all tasks complete, walk each surface manually:

### Demo Bar / Demo Panel
- [ ] DemoBar shows 6 persona pills (Viewer, Net Eng, Billing, Security, Tenant, Platform)
- [ ] Clicking "Net Eng" shows "Network Engineer" as the active persona in the demo panel header
- [ ] Demo panel permission count and tier label update per persona
- [ ] "View My Permissions" matrix shows NetworkEngineer's actual rbac permissions in categories
- [ ] Old 3-button switcher is gone from the demo panel footer
- [ ] DemoRoleSwitcher.tsx is deleted and absent from the project
- [ ] DemoScenarioBar.tsx is deleted and absent from the project

### Profile Page (/profile)
- [ ] "Current Role" section shows "Network Engineer" (not "admin") when NetworkEngineer persona is active
- [ ] Role sublabel shows first sentence of NetworkEngineer's description
- [ ] 3 coarse tier cards (Super Admin, Tenant Admin, Standard User) still work and switch `currentRole`
- [ ] Clicking a coarse card clears the persona — DemoBar reverts to no-selection state

### RBAC Admin — Assignments Tab
- [ ] SoD badge on allow rows shows tooltip: "SoD: Network Engineer conflicts with Provisioning Manager"
- [ ] Deny tab permissions group by object: "connection: read, write" not flat chips
- [ ] Deny tab scope column shows tier badge (matching allow tab)

### RBAC Admin — Activity Tab
- [ ] Action column shows "Assigned role" not "role-assignment:assign"
- [ ] Raw action string visible as sub-label in smaller monospace
- [ ] Scope column shows tier badge above the raw path
- [ ] DENY reason is in the Note column, not cramped inside the Result badge

### RBAC Admin — Users Tab
- [ ] SoD conflict tooltip names the conflicting roles

### RBAC Admin — Roles Tab
- [ ] PermissionsMatrix shows per-object count badge (e.g., "connection 7")

### Data model
- [ ] `npx vitest run src/utils/validatePermissionModel.test.ts` passes
- [ ] `partner:read` is in platform tier, removed from reseller tier

---

## Self-Review

**Spec coverage check:**

- Bucket 1 (two competing systems):
  - roleSlice activePersona: Task 1 ✅
  - RBACDemoPanel: Task 2 ✅
  - RoleCapabilityMatrix: Task 3 ✅
  - DemoBar: Task 4 ✅
  - DemoRoleSwitcher deleted: Task 4 ✅
  - DemoScenarioBar deleted: Task 4 (added from site map review) ✅
  - UserProfile display labels: Task 4b (added from site map review) ✅
  - usePermission bridge: Task 5 ✅
  - All confirmed gates unchanged: ConfigureHub, BillingConfiguration, SystemSettings, ConnectionGrid, ConnectionDetails, MainNav ✅
- Bucket 2 (data bug): Task 6 covers partner:read. Note: fix requires removing from reseller to avoid validator dedup — plan accounts for this. ✅
- Bucket 3 (7 UX gaps): 
  - UserList filter labels already correct (confirmed by code read) — skipped ✅
  - UserList SoD badge: Task 7 ✅
  - AssignmentManagement SoD popover: Task 7 ✅
  - Deny permissions grouping: Task 8 ✅
  - Deny scope tier badge: Task 8 ✅
  - AuditLog action labels: Task 9 ✅
  - AuditLog scope tier + deny reason: Task 9 ✅
- Bucket 4 (26 polish items, condensed): Tasks 10-12 cover the confirmed items. ✅

**Type consistency:**
- `activePersona: RoleName | null` defined in Task 1, read in Tasks 2, 3, 4, 5 — consistent.
- `setActivePersona(persona: RoleName)` defined in Task 1, called in Tasks 2 and 4 — consistent.
- `PERSONA_TIER_MAP` defined in Task 1, used only in Task 1 — consistent.
- `formatObjectName`, `formatAction`, `formatTimestamp` defined in Task 12 — Task 9 defines them locally first, Task 12 extracts them. Order is correct.

**One potential issue:** Task 3 (RoleCapabilityMatrix) calls `useStore` inside a `.map()` callback — hooks can't be called in callbacks. The `activePersona` value must be extracted at the component level and closed over. The implementer must hoist `const activePersona = useStore(s => s.activePersona)` to the top of the component body, not inside the `.map()`. This is flagged here so it doesn't get missed.

---

## Site Map — Confirmed No-Change Surfaces

Full site map assessed before finalizing this plan. Every file below was read or grepped and confirmed out of scope.

**Gates that stay unchanged (read `currentRole`, work correctly via tier mapping):**
- `ConfigureHub` — `currentRole === 'super-admin'` for Platform Admin tab. PlatformAdmin persona maps to 'super-admin'. ✅
- `SystemSettings` — `permissionChecker.hasPermission(currentRole, ...)`. Old system, unchanged. ✅
- `BillingConfiguration` — `PermissionBadge` with old permission names. Unchanged. ✅
- `ConnectionGrid` — `usePermission('create')`. Old system hook, unchanged. ✅
- `ConnectionDetails` — `usePermission('delete')`. Old system hook, unchanged. ✅
- `MainNav` — `usePermissions()` (canCreate, canEdit). Old system hook, unchanged. ✅
- `ProtectedRoute` — auth only, no role checks. ✅
- `RoleGate` — `usePermission(requires)`. Old system, unchanged. ✅
- `PermissionBadge` — old system, pure display. Unchanged. ✅

**E2E tests — all pass after this plan:**
- `role-enforcement.spec.ts` — `switchRole()` calls `window.__setRole(role)` → `setRole(role)`. After Task 1, this also sets `activePersona: null`. Tests check `currentRole`-dependent behavior (ConfigureHub Platform Admin tab visibility, users table). All pass. ✅
- `rbac-personas.spec.ts`, `rbac-consistency.spec.ts`, `rbac-roles.spec.ts`, `rbac-assignments.spec.ts` — all test the new RBAC system (role assignments, SoD badges, group members, audit log). No `switchRole` calls, no DemoBar testids. Not affected. ✅
- No E2E test references `data-testid="rbac-role-user"` or any DemoBar/RBACDemoPanel testid. Safe to rename. ✅

**Other components confirmed no impact:**
- `AuditLogPanel.tsx` (common/src/components/common/) — pure mock data, no permission system. Separate from `AuditLog.tsx` (admin tab). ✅
- `DemoScenarioBar.tsx` — never imported anywhere. Dead code. Delete in Task 4. ✅
- `AccessControlPolicy.tsx` — reads ROLE_CATALOG for display only. No impact. ✅
- `AccessConfiguration.tsx` (connection tab) — new system, display only. No impact. ✅
- `PoolDetailPage.tsx` — reads ROLE_CATALOG for display only. No impact. ✅
- `ResellerDashboard.tsx` — no permission references. No impact. ✅
- All ticketing, monitoring, groups, notification, help, glossary, news pages — no permission system. ✅
