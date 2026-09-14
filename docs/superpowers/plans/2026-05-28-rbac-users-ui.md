# RBAC Users UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Configure > Users from the current flat role model into a full Action+Object+Scope RBAC system with RoleAssignments, DenyAssignments, Groups, SoD constraints, and a read-only Business Center role catalog.

**Architecture:** New type system in `src/types/rbac.ts` defines Permission as `{object}:{action-group}` strings, RoleAssignment as the atomic unit of access, and AccessGroup as a scope-ceilinged principal collection. A deny-first 5-step permission resolver replaces the old permissionChecker. The UI is rebuilt as 5 tabs: Users, Groups, Roles, Assignments, Activity.

**Tech Stack:** React 19, TypeScript strict, Vite, Zustand slices, Vitest + React Testing Library, Tailwind CSS, existing component library (BaseTable, SideDrawer, Button, OverflowMenu, SearchFilterBar).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/types/rbac.ts` | All RBAC types: Permission, RoleName, RoleAssignment, DenyAssignment, AccessGroup, SodConstraint, AuditLogEntry |
| Delete | `src/types/permissions.ts` | Old flat model (replaced by rbac.ts) |
| Delete | `src/types/roleAssignment.ts` | Old RoleAssignment (replaced by rbac.ts) |
| Create | `src/utils/permissionResolver.ts` | 5-step deny-first permission evaluation |
| Create | `src/utils/permissionResolver.test.ts` | Tests for resolver |
| Create | `src/data/mockRbac.ts` | Mock RoleAssignments, Groups, DenyAssignments, AuditLog entries |
| Modify | `src/store/slices/rbacSlice.ts` | Rebuild slice with new types + mock data |
| Modify | `src/components/configure/UserManagement.tsx` | VerticalTabGroup (People/Access/Audit), useSearchParams URL sync |
| Modify | `src/components/configure/users/UserList.tsx` | Rebuild: effective roles, expiry warnings, SoD indicators |
| Create | `src/components/configure/users/InviteUserDrawer.tsx` | Identity-only invite (replaces AddUserDrawer) |
| Delete | `src/components/configure/users/AddUserDrawer.tsx` | Replaced by InviteUserDrawer |
| Create | `src/components/configure/users/AssignRoleDrawer.tsx` | RoleAssignment creation: role, scope, dimensions, justification, expiry |
| Create | `src/components/configure/users/EffectivePermissionsModal.tsx` | Computed permission viewer per user |
| Create | `src/components/configure/users/GroupManagement.tsx` | Groups tab |
| Create | `src/components/configure/users/CreateGroupDrawer.tsx` | Group creation: purpose, owner, ceiling |
| Create | `src/components/configure/users/GroupDetailDrawer.tsx` | Group members + group-level role assignments |
| Modify | `src/components/configure/users/RoleManagement.tsx` | Replaced entirely by RoleCatalog (read-only) |
| Create | `src/components/configure/users/RoleCatalog.tsx` | Read-only BC role catalog |
| Create | `src/components/configure/users/AssignmentManagement.tsx` | RoleAssignment + DenyAssignment table |
| Create | `src/components/configure/users/DenyAssignmentDrawer.tsx` | Deny creation (always requires approver) |
| Modify | `src/components/configure/users/UserActivity.tsx` | Replaced by AuditLog |
| Create | `src/components/configure/users/AuditLog.tsx` | Real audit log with filter + pagination |
| Delete | `src/components/configure/users/ConnectionAccessDrawer.tsx` | Replaced by AssignRoleDrawer |

---

## Task 1: New Type System

**Files:**
- Create: `src/types/rbac.ts`
- Create: `src/types/rbac.test.ts`

- [ ] **Step 1: Create the type file**

```typescript
// src/types/rbac.ts

// ── Scope ──────────────────────────────────────────────────────────────────
export type ScopeTier =
  | 'platform'
  | 'reseller'
  | 'tenant'
  | 'client'
  | 'pool'
  | 'resource';

export interface ScopePath {
  tier: ScopeTier;
  segments: string[]; // e.g. ['resellers','RSL-001','tenants','TNT-001']
  raw: string;        // e.g. '/resellers/RSL-001/tenants/TNT-001'
}

export type GeographicZone = 'US-East' | 'US-West' | 'EU-West' | 'Asia-Pacific';
export type Environment = 'prod' | 'staging' | 'dev';
export type DataClass = 'unclassified' | 'cui' | 'sensitive';

export interface RecurringWindow {
  daysOfWeek: number[];   // 0=Sun … 6=Sat
  startHour: number;      // 0–23 UTC
  endHour: number;        // 0–23 UTC
}

export interface ScopeDimensions {
  location?: GeographicZone[];     // null/absent = all locations
  environment?: Environment[];     // null/absent = all environments
  classification?: DataClass;      // null/absent = 'unclassified' (most restrictive)
  timeWindow?: RecurringWindow;
}

// ── Permissions ─────────────────────────────────────────────────────────────
export type Permission =
  | 'connection:read' | 'connection:write' | 'connection:delete'
  | 'connection:operate' | 'connection:configure'
  | 'link:read' | 'link:write' | 'link:delete' | 'link:configure'
  | 'cloud-router:read' | 'cloud-router:write' | 'cloud-router:configure'
  | 'vnf:read' | 'vnf:write' | 'vnf:operate'
  | 'pool:read' | 'pool:write' | 'pool:delete' | 'pool:assign'
  | 'monitoring:read' | 'monitoring:operate'
  | 'alert-rule:read' | 'alert-rule:write' | 'alert-rule:delete'
  | 'report:read' | 'report:write' | 'report:delete' | 'report:export'
  | 'user:read' | 'user:write' | 'user:delete' | 'user:operate'
  | 'role:read' | 'role:write' | 'role:delete'
  | 'role-assignment:read' | 'role-assignment:assign' | 'role-assignment:revoke'
  | 'billing:read' | 'billing:finance' | 'billing:export'
  | 'policy:read' | 'policy:write' | 'policy:delete' | 'policy:assign'
  | 'partner:read' | 'partner:write' | 'partner:delete'
  | 'api:read' | 'api:write' | 'api:delete' | 'api:configure'
  | 'tenant:read' | 'tenant:write' | 'tenant:administer'
  | 'system:read' | 'system:configure' | 'system:administer'
  | 'audit:read';

// ── Roles ────────────────────────────────────────────────────────────────────
export type RoleName =
  | 'NetworkEngineer'
  | 'SupportSpecialist'
  | 'BillingAdmin'
  | 'SecurityAdmin'
  | 'OperationsManager'
  | 'PartnerManager'
  | 'ApiManager'
  | 'ProvisioningManager'
  | 'Viewer'
  | 'TenantAdmin'
  | 'PlatformAdmin';

export interface RoleDefinition {
  name: RoleName;
  displayName: string;
  description: string;
  permissions: Permission[];
  maxScopeTier: ScopeTier;
}

// ── Conditions ───────────────────────────────────────────────────────────────
export interface AssignmentConditions {
  requiresMFA?: boolean;
  requiresApproval?: boolean;
  allowedIPs?: string[];
}

// ── RoleAssignment ───────────────────────────────────────────────────────────
export type AssignmentStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'pending-approval'
  | 'exceeds-ceiling';

export interface RoleAssignment {
  id: string;
  principal: {
    id: string;
    type: 'user' | 'group';
    displayName: string;
  };
  role: RoleName;
  scope: ScopePath;
  scopeDimensions?: ScopeDimensions;
  objectFilter?: string[];          // specific resource IDs, empty = all in scope
  conditions?: AssignmentConditions;
  justification: string;            // mandatory
  grantedBy: string;
  grantedAt: string;                // ISO 8601
  approvedBy?: string;
  expiresAt: string;                // ISO 8601, mandatory
  reviewCycle: 'quarterly' | 'annual' | 'audit-close';
  status: AssignmentStatus;
  revokedBy?: string;
  revokedAt?: string;
  revokeReason?: string;
}

// ── DenyAssignment ───────────────────────────────────────────────────────────
export type DenyStatus = 'active' | 'expired' | 'lifted';

export interface DenyAssignment {
  id: string;
  principal: {
    id: string;
    type: 'user' | 'group';
    displayName: string;
  };
  permissions: Permission[];
  scope: ScopePath;
  scopeDimensions?: ScopeDimensions;
  justification: string;
  grantedBy: string;
  grantedAt: string;
  approvedBy: string;               // always required for deny
  expiresAt: string;                // emergency lockouts default to +48h
  status: DenyStatus;
  liftedBy?: string;
  liftedAt?: string;
  liftReason?: string;
}

// ── Access Groups (RBAC principals) ─────────────────────────────────────────
// Named AccessGroup (not Group) to avoid collision with src/types/group.ts
// which defines connection/pool Groups used by the existing GroupSlice.
export type AccessGroupPurpose =
  | 'organizational'
  | 'resource-cluster'
  | 'project'
  | 'audit-engagement';

export type AccessGroupStatus =
  | 'active'
  | 'suspended'
  | 'ownerless'
  | 'pending-review'
  | 'closed';

export type OwnerlessPolicy = 'suspend' | 'inherit-tenant-admin' | 'freeze';

export interface AccessGroupMember {
  userId: string;
  displayName: string;
  membershipScope: { path?: ScopePath; dimensions?: ScopeDimensions } | null;
  justification: string;
  addedBy: string;
  addedAt: string;
  expiresAt: string;
}

export interface AccessGroupCeiling {
  path?: ScopePath;             // null = inherits creator's effective scope at creation time
  dimensions?: ScopeDimensions;
  conditions?: AssignmentConditions;
}

export interface AccessGroup {
  id: string;
  name: string;
  description: string;
  purpose: AccessGroupPurpose;
  owner: string;
  ownerSuccessor?: string;
  ownerlessPolicy: OwnerlessPolicy;
  scopeCeiling: AccessGroupCeiling;
  members: AccessGroupMember[];
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  reviewCycle: 'quarterly' | 'annual';
  status: AccessGroupStatus;
  engagementMetadata?: {
    subject: string;
    auditingBody: string;
    closedAt?: string;
    closedBy?: string;
  };
}

// ── SoD Constraints ──────────────────────────────────────────────────────────
export interface SodConstraint {
  id: string;
  name: string;
  mutuallyExclusiveRoles: [RoleName, RoleName];
  scopeContext: 'same-scope' | 'any-scope';
  checkOn: Array<'role-assignment' | 'group-role-assignment' | 'membership-assignment'>;
  flagExistingViolations: boolean;
}

// ── Audit Log ────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  principalId: string;
  principalName: string;
  action: string;
  objectType: string;
  objectId?: string;
  objectName?: string;
  scope: ScopePath;
  result: 'ALLOW' | 'DENY';
  denyReason?: string;
  ipAddress?: string;
}

// ── Request Context ──────────────────────────────────────────────────────────
export interface RequestContext {
  location?: GeographicZone;
  environment?: Environment;
  classification?: DataClass;
  currentTime?: Date;
  ipAddress?: string;
  mfaVerified?: boolean;
}

// ── Scope helpers ────────────────────────────────────────────────────────────
export function buildScopePath(raw: string): ScopePath {
  const segments = raw.replace(/^\//, '').split('/');
  const tier = inferTier(segments);
  return { tier, segments, raw };
}

function inferTier(segments: string[]): ScopeTier {
  if (segments.length === 0 || segments[0] === '') return 'platform';
  const last = segments[segments.length - 2]; // key before ID
  const map: Record<string, ScopeTier> = {
    resellers: 'reseller',
    tenants: 'tenant',
    clients: 'client',
    pools: 'pool',
    resources: 'resource',
  };
  return map[last] ?? 'platform';
}

export const PLATFORM_SCOPE: ScopePath = buildScopePath('/');
export const TENANT_SCOPE = (tenantId: string): ScopePath =>
  buildScopePath(`/tenants/${tenantId}`);
export const CLIENT_SCOPE = (tenantId: string, clientId: string): ScopePath =>
  buildScopePath(`/tenants/${tenantId}/clients/${clientId}`);
export const POOL_SCOPE = (tenantId: string, poolId: string): ScopePath =>
  buildScopePath(`/tenants/${tenantId}/pools/${poolId}`);

export function scopeContains(parent: ScopePath, child: ScopePath): boolean {
  if (parent.raw === '/') return true;
  return child.raw === parent.raw || child.raw.startsWith(parent.raw + '/');
}
```

- [ ] **Step 2: Write the type smoke test**

```typescript
// src/types/rbac.test.ts
import { describe, it, expect } from 'vitest';
import {
  buildScopePath,
  scopeContains,
  PLATFORM_SCOPE,
  TENANT_SCOPE,
  CLIENT_SCOPE,
} from './rbac';

describe('buildScopePath', () => {
  it('infers platform tier for root path', () => {
    const s = buildScopePath('/');
    expect(s.tier).toBe('platform');
  });

  it('infers tenant tier', () => {
    const s = buildScopePath('/tenants/TNT-001');
    expect(s.tier).toBe('tenant');
    expect(s.raw).toBe('/tenants/TNT-001');
  });

  it('infers client tier', () => {
    const s = buildScopePath('/tenants/TNT-001/clients/CLT-A');
    expect(s.tier).toBe('client');
  });
});

describe('scopeContains', () => {
  it('platform contains everything', () => {
    expect(scopeContains(PLATFORM_SCOPE, TENANT_SCOPE('TNT-001'))).toBe(true);
  });

  it('tenant contains its clients', () => {
    expect(scopeContains(TENANT_SCOPE('TNT-001'), CLIENT_SCOPE('TNT-001', 'CLT-A'))).toBe(true);
  });

  it('tenant does not contain sibling tenant', () => {
    expect(scopeContains(TENANT_SCOPE('TNT-001'), TENANT_SCOPE('TNT-002'))).toBe(false);
  });

  it('client does not contain its tenant', () => {
    expect(scopeContains(CLIENT_SCOPE('TNT-001', 'CLT-A'), TENANT_SCOPE('TNT-001'))).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci
npx vitest run src/types/rbac.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/types/rbac.ts src/types/rbac.test.ts
git commit -m "feat(rbac): add Action+Object+Scope type system"
```

---

## Task 2: Business Center Role Catalog Data

**Files:**
- Create: `src/data/roleCatalog.ts`

No test needed — this is pure data. Verified by TypeScript compiler.

- [ ] **Step 1: Create the catalog**

```typescript
// src/data/roleCatalog.ts
import { RoleDefinition, RoleName, Permission, SodConstraint } from '../types/rbac';

const ALL_PERMISSIONS: Permission[] = [
  'connection:read', 'connection:write', 'connection:delete', 'connection:operate', 'connection:configure',
  'link:read', 'link:write', 'link:delete', 'link:configure',
  'cloud-router:read', 'cloud-router:write', 'cloud-router:configure',
  'vnf:read', 'vnf:write', 'vnf:operate',
  'pool:read', 'pool:write', 'pool:delete', 'pool:assign',
  'monitoring:read', 'monitoring:operate',
  'alert-rule:read', 'alert-rule:write', 'alert-rule:delete',
  'report:read', 'report:write', 'report:delete', 'report:export',
  'user:read', 'user:write', 'user:delete', 'user:operate',
  'role:read', 'role:write', 'role:delete',
  'role-assignment:read', 'role-assignment:assign', 'role-assignment:revoke',
  'billing:read', 'billing:finance', 'billing:export',
  'policy:read', 'policy:write', 'policy:delete', 'policy:assign',
  'partner:read', 'partner:write', 'partner:delete',
  'api:read', 'api:write', 'api:delete', 'api:configure',
  'tenant:read', 'tenant:write', 'tenant:administer',
  'system:read', 'system:configure', 'system:administer',
  'audit:read',
];

export const ROLE_CATALOG: Record<RoleName, RoleDefinition> = {
  NetworkEngineer: {
    name: 'NetworkEngineer',
    displayName: 'Network Engineer',
    description: 'Manages connections, links, cloud routers, and VNFs. Full lifecycle access to network resources.',
    maxScopeTier: 'tenant',
    permissions: [
      'connection:read', 'connection:write', 'connection:delete', 'connection:operate', 'connection:configure',
      'link:read', 'link:write', 'link:delete', 'link:configure',
      'cloud-router:read', 'cloud-router:write', 'cloud-router:configure',
      'vnf:read', 'vnf:write', 'vnf:operate',
      'pool:read',
      'monitoring:read', 'monitoring:operate',
    ],
  },
  SupportSpecialist: {
    name: 'SupportSpecialist',
    displayName: 'Support Specialist',
    description: 'Read and operate access for troubleshooting. No write or delete on network resources.',
    maxScopeTier: 'client',
    permissions: [
      'connection:read', 'connection:operate',
      'link:read',
      'monitoring:read', 'monitoring:operate',
      'alert-rule:read',
      'audit:read',
    ],
  },
  BillingAdmin: {
    name: 'BillingAdmin',
    displayName: 'Billing Admin',
    description: 'Full billing access: view, process, and export financial data and reports.',
    maxScopeTier: 'tenant',
    permissions: [
      'billing:read', 'billing:finance', 'billing:export',
      'report:read', 'report:export',
    ],
  },
  SecurityAdmin: {
    name: 'SecurityAdmin',
    displayName: 'Security Admin',
    description: 'Manages security policy, audits, and has read access to users and roles.',
    maxScopeTier: 'tenant',
    permissions: [
      'policy:read', 'policy:write', 'policy:delete', 'policy:assign',
      'audit:read',
      'user:read',
      'role:read',
      'role-assignment:read',
      'system:read',
    ],
  },
  OperationsManager: {
    name: 'OperationsManager',
    displayName: 'Operations Manager',
    description: 'Operational oversight: connection operation, pool assignment, monitoring, reporting, and user reads.',
    maxScopeTier: 'tenant',
    permissions: [
      'connection:read', 'connection:operate',
      'pool:read', 'pool:assign',
      'user:read',
      'monitoring:read', 'monitoring:operate',
      'report:read', 'report:write',
      'alert-rule:read', 'alert-rule:write',
    ],
  },
  PartnerManager: {
    name: 'PartnerManager',
    displayName: 'Partner Manager',
    description: 'Full partner lifecycle management.',
    maxScopeTier: 'tenant',
    permissions: [
      'partner:read', 'partner:write', 'partner:delete',
    ],
  },
  ApiManager: {
    name: 'ApiManager',
    displayName: 'API Manager',
    description: 'Full API lifecycle management plus connection read for context.',
    maxScopeTier: 'tenant',
    permissions: [
      'api:read', 'api:write', 'api:delete', 'api:configure',
      'connection:read',
    ],
  },
  ProvisioningManager: {
    name: 'ProvisioningManager',
    displayName: 'Provisioning Manager',
    description: 'Provisions connections and links, assigns pools. No delete on connections.',
    maxScopeTier: 'tenant',
    permissions: [
      'connection:read', 'connection:write', 'connection:operate',
      'link:read', 'link:write', 'link:configure',
      'pool:read', 'pool:assign',
      'monitoring:read',
    ],
  },
  Viewer: {
    name: 'Viewer',
    displayName: 'Viewer',
    description: 'Read-only access across all objects within assigned scope.',
    maxScopeTier: 'pool',
    permissions: ALL_PERMISSIONS.filter(p => p.endsWith(':read')),
  },
  TenantAdmin: {
    name: 'TenantAdmin',
    displayName: 'Tenant Admin',
    description: 'Full tenant administration. Cannot administer system-level settings.',
    maxScopeTier: 'tenant',
    permissions: ALL_PERMISSIONS.filter(p => !p.startsWith('system:administer')),
  },
  PlatformAdmin: {
    name: 'PlatformAdmin',
    displayName: 'Platform Admin',
    description: 'Unrestricted platform-wide access. AT&T operations only.',
    maxScopeTier: 'platform',
    permissions: ALL_PERMISSIONS,
  },
};

// Typed as SodConstraint[] so TypeScript validates all fields match the interface.
export const SOD_CONSTRAINTS: SodConstraint[] = [
  {
    id: 'sod-1',
    name: 'Provisioner / Ops Auditor',
    mutuallyExclusiveRoles: ['ProvisioningManager', 'OperationsManager'],
    scopeContext: 'same-scope',
    checkOn: ['role-assignment', 'group-role-assignment', 'membership-assignment'],
    flagExistingViolations: true,
  },
  {
    id: 'sod-2',
    name: 'Billing / Security Auditor',
    mutuallyExclusiveRoles: ['BillingAdmin', 'SecurityAdmin'],
    scopeContext: 'same-scope',
    checkOn: ['role-assignment', 'group-role-assignment', 'membership-assignment'],
    flagExistingViolations: true,
  },
  {
    id: 'sod-3',
    name: 'Tenant / Platform Admin',
    mutuallyExclusiveRoles: ['TenantAdmin', 'PlatformAdmin'],
    scopeContext: 'any-scope',
    checkOn: ['role-assignment', 'group-role-assignment'],
    flagExistingViolations: true,
  },
  {
    id: 'sod-4',
    name: 'Network Engineer / Provisioning Manager',
    mutuallyExclusiveRoles: ['NetworkEngineer', 'ProvisioningManager'],
    scopeContext: 'same-scope',
    checkOn: ['role-assignment', 'group-role-assignment', 'membership-assignment'],
    flagExistingViolations: true,
  },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -v "lazyComponents"
```

Expected: No output from your new files. The project has a pre-existing parse error in `src/utils/lazyComponents.ts` (JSX in a `.ts` file) — that is filtered out above and is not your concern.

- [ ] **Step 3: Commit**

```bash
git add src/data/roleCatalog.ts
git commit -m "feat(rbac): add Business Center role catalog and SoD constraints"
```

---

## Task 3: Permission Resolver

**Files:**
- Create: `src/utils/permissionResolver.ts`
- Create: `src/utils/permissionResolver.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/utils/permissionResolver.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionResolver } from './permissionResolver';
import {
  RoleAssignment,
  DenyAssignment,
  TENANT_SCOPE,
  CLIENT_SCOPE,
} from '../types/rbac';

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
    expect(result.reason).toContain('no assignment grants');
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
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/utils/permissionResolver.test.ts
```

Expected: FAIL — `permissionResolver` not found.

- [ ] **Step 3: Write the resolver**

```typescript
// src/utils/permissionResolver.ts
import {
  Permission,
  RoleAssignment,
  DenyAssignment,
  AccessGroup,
  ScopePath,
  ScopeDimensions,
  RequestContext,
  scopeContains,
} from '../types/rbac';
import { ROLE_CATALOG } from '../data/roleCatalog';

export interface PermissionResult {
  allowed: boolean;
  reason: string;
  matchedAssignment?: RoleAssignment;
  matchedDeny?: DenyAssignment;
}

interface UserData {
  assignments: RoleAssignment[];
  denies: DenyAssignment[];
}

export class PermissionResolver {
  private store = new Map<string, UserData>();
  private accessGroups = new Map<string, AccessGroup>();

  loadAssignments(userId: string, assignments: RoleAssignment[], denies: DenyAssignment[]): void {
    this.store.set(userId, { assignments, denies });
  }

  loadGroup(group: AccessGroup): void {
    this.accessGroups.set(group.id, group);
  }

  can(
    userId: string,
    permission: Permission,
    targetScope: ScopePath,
    ctx: RequestContext = {}
  ): PermissionResult {
    const now = ctx.currentTime ?? new Date();

    // STEP 0: validate context
    // (future: require MFA for privileged ops — currently permissive)

    // STEP 1: collect and evaluate deny assignments (direct + via groups)
    const allDenies = this.collectDenies(userId, now);
    for (const deny of allDenies) {
      if (
        deny.permissions.includes(permission) &&
        scopeContains(deny.scope, targetScope) &&
        this.dimensionsMatch(deny.scopeDimensions, ctx)
      ) {
        return {
          allowed: false,
          reason: `deny assignment '${deny.id}' blocks ${permission}: ${deny.justification}`,
          matchedDeny: deny,
        };
      }
    }

    // STEP 2 + 3: collect active, in-scope, dimension-matching assignments
    const validAssignments = this.collectAssignments(userId, now).filter(a =>
      a.status === 'active' &&
      new Date(a.expiresAt) > now &&
      scopeContains(a.scope, targetScope) &&
      this.dimensionsMatch(a.scopeDimensions, ctx)
    );

    // STEP 4 + 5: check if any valid assignment's role grants the permission
    for (const assignment of validAssignments) {
      const roleDef = ROLE_CATALOG[assignment.role];
      if (roleDef?.permissions.includes(permission)) {
        return {
          allowed: true,
          reason: `role '${assignment.role}' grants '${permission}' via assignment '${assignment.id}'`,
          matchedAssignment: assignment,
        };
      }
    }

    return {
      allowed: false,
      reason: `no assignment grants '${permission}' at scope '${targetScope.raw}'`,
    };
  }

  getEffectivePermissions(userId: string, targetScope: ScopePath, ctx: RequestContext = {}): Permission[] {
    const now = ctx.currentTime ?? new Date();
    const deniedSet = new Set<Permission>();

    for (const deny of this.collectDenies(userId, now)) {
      if (scopeContains(deny.scope, targetScope) && this.dimensionsMatch(deny.scopeDimensions, ctx)) {
        deny.permissions.forEach(p => deniedSet.add(p));
      }
    }

    const grantedSet = new Set<Permission>();
    const validAssignments = this.collectAssignments(userId, now).filter(a =>
      a.status === 'active' &&
      new Date(a.expiresAt) > now &&
      scopeContains(a.scope, targetScope) &&
      this.dimensionsMatch(a.scopeDimensions, ctx)
    );

    for (const assignment of validAssignments) {
      const roleDef = ROLE_CATALOG[assignment.role];
      roleDef?.permissions.forEach(p => {
        if (!deniedSet.has(p)) grantedSet.add(p);
      });
    }

    return Array.from(grantedSet).sort();
  }

  private collectDenies(userId: string, now: Date): DenyAssignment[] {
    const direct = this.store.get(userId)?.denies ?? [];
    const active = direct.filter(d => d.status === 'active' && new Date(d.expiresAt) > now);

    // Group-sourced denies (groups that have the user as a member)
    const groupDenies: DenyAssignment[] = [];
    for (const group of this.accessGroups.values()) {
      if (group.members.some(m => m.userId === userId && new Date(m.expiresAt) > now)) {
        const userData = this.store.get(group.id);
        if (userData) {
          groupDenies.push(
            ...userData.denies.filter(d => d.status === 'active' && new Date(d.expiresAt) > now)
          );
        }
      }
    }

    return [...active, ...groupDenies];
  }

  private collectAssignments(userId: string, now: Date): RoleAssignment[] {
    const direct = this.store.get(userId)?.assignments ?? [];

    // Group-sourced assignments
    const groupAssignments: RoleAssignment[] = [];
    for (const group of this.accessGroups.values()) {
      const membership = group.members.find(
        m => m.userId === userId && new Date(m.expiresAt) > now
      );
      if (!membership) continue;

      const groupData = this.store.get(group.id);
      if (!groupData) continue;

      for (const ga of groupData.assignments) {
        if (ga.status !== 'active' || new Date(ga.expiresAt) <= now) continue;
        // Effective scope = intersection of ceiling, membership scope, assignment scope
        const effectiveScope = this.intersectScopes(
          group.scopeCeiling.path,
          membership.membershipScope?.path,
          ga.scope
        );
        if (!effectiveScope) continue;
        groupAssignments.push({ ...ga, scope: effectiveScope });
      }
    }

    return [...direct, ...groupAssignments];
  }

  private intersectScopes(
    ceiling: ScopePath | undefined,
    membershipScope: ScopePath | undefined,
    assignmentScope: ScopePath
  ): ScopePath | null {
    // The most restrictive scope wins (deepest path that is within all constraints)
    const constraints = [ceiling, membershipScope].filter(Boolean) as ScopePath[];
    for (const constraint of constraints) {
      if (!scopeContains(constraint, assignmentScope)) {
        // assignment scope exceeds ceiling or membership scope
        // use the constraint as the cap
        if (!scopeContains(assignmentScope, constraint)) {
          // no overlap — no access
          return null;
        }
        return constraint;
      }
    }
    return assignmentScope;
  }

  private dimensionsMatch(dims: ScopeDimensions | undefined, ctx: RequestContext): boolean {
    if (!dims) return true;

    if (dims.location && ctx.location && !dims.location.includes(ctx.location)) return false;
    if (dims.environment && ctx.environment && !dims.environment.includes(ctx.environment)) return false;
    if (dims.classification) {
      const ctxClass = ctx.classification ?? 'unclassified';
      const classOrder = ['unclassified', 'cui', 'sensitive'];
      if (classOrder.indexOf(ctxClass) > classOrder.indexOf(dims.classification)) return false;
    }
    if (dims.timeWindow && ctx.currentTime) {
      const day = ctx.currentTime.getUTCDay();
      const hour = ctx.currentTime.getUTCHours();
      const { daysOfWeek, startHour, endHour } = dims.timeWindow;
      if (!daysOfWeek.includes(day)) return false;
      if (hour < startHour || hour >= endHour) return false;
    }

    return true;
  }
}

// Singleton for app use
export const permissionResolver = new PermissionResolver();
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/utils/permissionResolver.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/permissionResolver.ts src/utils/permissionResolver.test.ts
git commit -m "feat(rbac): add deny-first permission resolver with group + dimension support"
```

---

## Task 4: Mock Data + Zustand Slice

**Files:**
- Create: `src/data/mockRbac.ts`
- Modify: `src/store/slices/rbacSlice.ts`

- [ ] **Step 1: Create mock data**

```typescript
// src/data/mockRbac.ts
import {
  RoleAssignment,
  DenyAssignment,
  AccessGroup,
  AuditLogEntry,
  TENANT_SCOPE,
  CLIENT_SCOPE,
  buildScopePath,
} from '../types/rbac';

export const MOCK_ROLE_ASSIGNMENTS: RoleAssignment[] = [
  {
    id: 'ra-alice-ne',
    principal: { id: 'user-alice', type: 'user', displayName: 'Alice Chen' },
    role: 'NetworkEngineer',
    scope: TENANT_SCOPE('TNT-001'),
    justification: 'Primary network engineer for Acme Corp tenant.',
    grantedBy: 'user-admin',
    grantedAt: '2026-01-15T09:00:00Z',
    approvedBy: 'user-cto',
    expiresAt: '2026-12-31T23:59:59Z',
    reviewCycle: 'quarterly',
    status: 'active',
  },
  {
    id: 'ra-bob-viewer',
    principal: { id: 'user-bob', type: 'user', displayName: 'Bob Martinez' },
    role: 'Viewer',
    scope: CLIENT_SCOPE('TNT-001', 'CLT-A'),
    justification: 'Read-only access for Business Unit A reporting.',
    grantedBy: 'user-alice',
    grantedAt: '2026-02-01T10:00:00Z',
    expiresAt: '2026-06-30T23:59:59Z',
    reviewCycle: 'quarterly',
    status: 'active',
  },
  {
    id: 'ra-carol-billing',
    principal: { id: 'user-carol', type: 'user', displayName: 'Carol Williams' },
    role: 'BillingAdmin',
    scope: TENANT_SCOPE('TNT-001'),
    justification: 'Finance department billing management.',
    grantedBy: 'user-admin',
    grantedAt: '2026-01-20T11:00:00Z',
    approvedBy: 'user-cfo',
    expiresAt: '2026-09-30T23:59:59Z',
    reviewCycle: 'quarterly',
    status: 'active',
  },
  {
    id: 'ra-dave-expired',
    principal: { id: 'user-dave', type: 'user', displayName: 'Dave Kim' },
    role: 'SupportSpecialist',
    scope: CLIENT_SCOPE('TNT-001', 'CLT-B'),
    justification: 'Temporary support access for incident.',
    grantedBy: 'user-alice',
    grantedAt: '2026-03-01T08:00:00Z',
    expiresAt: '2026-04-01T08:00:00Z',
    reviewCycle: 'quarterly',
    status: 'expired',
  },
  {
    id: 'ra-group-ops',
    principal: { id: 'group-ops-team', type: 'group', displayName: 'Operations Team' },
    role: 'OperationsManager',
    scope: TENANT_SCOPE('TNT-001'),
    justification: 'Ops team group assignment for TNT-001.',
    grantedBy: 'user-admin',
    grantedAt: '2026-01-10T09:00:00Z',
    approvedBy: 'user-cto',
    expiresAt: '2026-12-31T23:59:59Z',
    reviewCycle: 'annual',
    status: 'active',
  },
];

export const MOCK_DENY_ASSIGNMENTS: DenyAssignment[] = [
  {
    id: 'da-dave-hold',
    principal: { id: 'user-dave', type: 'user', displayName: 'Dave Kim' },
    permissions: ['connection:write', 'connection:delete', 'connection:configure'],
    scope: TENANT_SCOPE('TNT-001'),
    justification: 'Security incident hold pending investigation.',
    grantedBy: 'user-security',
    grantedAt: '2026-04-05T14:00:00Z',
    approvedBy: 'user-cso',
    expiresAt: '2026-04-07T14:00:00Z',
    status: 'expired',
  },
];

export const MOCK_ACCESS_GROUPS: AccessGroup[] = [
  {
    id: 'group-ops-team',
    name: 'Operations Team',
    description: 'Core operations team for TNT-001 tenant management.',
    purpose: 'organizational',
    owner: 'user-alice',
    ownerSuccessor: 'user-admin',
    ownerlessPolicy: 'suspend',
    scopeCeiling: {
      path: TENANT_SCOPE('TNT-001'),
    },
    members: [
      {
        userId: 'user-bob',
        displayName: 'Bob Martinez',
        membershipScope: null,
        justification: 'Ops team member',
        addedBy: 'user-alice',
        addedAt: '2026-01-15T10:00:00Z',
        expiresAt: '2026-12-31T23:59:59Z',
      },
      {
        userId: 'user-eve',
        displayName: 'Eve Nakamura',
        membershipScope: null,
        justification: 'Ops team member',
        addedBy: 'user-alice',
        addedAt: '2026-02-01T10:00:00Z',
        expiresAt: '2026-12-31T23:59:59Z',
      },
    ],
    createdBy: 'user-admin',
    createdAt: '2026-01-10T09:00:00Z',
    reviewCycle: 'annual',
    status: 'active',
  },
  {
    id: 'group-q1-audit',
    name: 'Q1 2026 Compliance Audit',
    description: 'External auditors for Q1 compliance review.',
    purpose: 'audit-engagement',
    owner: 'user-security',
    ownerlessPolicy: 'freeze',
    scopeCeiling: {
      path: TENANT_SCOPE('TNT-001'),
      dimensions: { environment: ['prod'] },
    },
    members: [
      {
        userId: 'user-auditor-1',
        displayName: 'Frank Audit',
        membershipScope: null,
        justification: 'Q1 audit engagement',
        addedBy: 'user-security',
        addedAt: '2026-03-01T09:00:00Z',
        expiresAt: '2026-03-31T23:59:59Z',
      },
    ],
    createdBy: 'user-security',
    createdAt: '2026-02-28T09:00:00Z',
    expiresAt: '2026-03-31T23:59:59Z',
    reviewCycle: 'quarterly',
    status: 'closed',
    engagementMetadata: {
      subject: 'SOC 2 Type II Q1 Review',
      auditingBody: 'KPMG',
      closedAt: '2026-04-01T00:00:00Z',
      closedBy: 'user-security',
    },
  },
];

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: 'al-1',
    timestamp: '2026-05-28T10:30:00Z',
    principalId: 'user-alice',
    principalName: 'Alice Chen',
    action: 'role-assignment:assign',
    objectType: 'RoleAssignment',
    objectId: 'ra-bob-viewer',
    objectName: 'Viewer → Bob Martinez',
    scope: CLIENT_SCOPE('TNT-001', 'CLT-A'),
    result: 'ALLOW',
  },
  {
    id: 'al-2',
    timestamp: '2026-05-27T14:15:00Z',
    principalId: 'user-dave',
    principalName: 'Dave Kim',
    action: 'connection:write',
    objectType: 'Connection',
    objectId: 'conn-aws-001',
    objectName: 'AWS Interconnect Primary',
    scope: TENANT_SCOPE('TNT-001'),
    result: 'DENY',
    denyReason: 'Assignment expired',
    ipAddress: '192.168.1.42',
  },
  {
    id: 'al-3',
    timestamp: '2026-05-27T09:00:00Z',
    principalId: 'user-admin',
    principalName: 'Admin User',
    action: 'deny-assignment:create',
    objectType: 'DenyAssignment',
    objectId: 'da-dave-hold',
    objectName: 'Security Hold → Dave Kim',
    scope: TENANT_SCOPE('TNT-001'),
    result: 'ALLOW',
  },
];
```

- [ ] **Step 2: Rebuild the RBAC slice**

```typescript
// src/store/slices/rbacSlice.ts
import { StateCreator } from 'zustand';
import {
  RoleAssignment,
  DenyAssignment,
  AccessGroup,
  AccessGroupMember,
  AuditLogEntry,
  ScopePath,
  TENANT_SCOPE,
} from '../../types/rbac';
import { permissionResolver } from '../../utils/permissionResolver';
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

  // Data
  roleAssignments: RoleAssignment[];
  denyAssignments: DenyAssignment[];
  accessGroups: AccessGroup[];        // RBAC principal groups — NOT the same as GroupSlice.groups
  auditLog: AuditLogEntry[];

  // Actions
  addRoleAssignment: (assignment: RoleAssignment) => void;
  revokeRoleAssignment: (id: string, revokedBy: string, reason: string) => void;
  addDenyAssignment: (deny: DenyAssignment) => void;
  liftDenyAssignment: (id: string, liftedBy: string, reason: string) => void;
  addAccessGroup: (group: AccessGroup) => void;
  updateAccessGroup: (id: string, updates: Partial<AccessGroup>) => void;
  addAccessGroupMember: (groupId: string, member: AccessGroupMember) => void;
  removeAccessGroupMember: (groupId: string, userId: string) => void;
  appendAuditEntry: (entry: AuditLogEntry) => void;

  // Computed helpers
  getAssignmentsForUser: (userId: string) => RoleAssignment[];
  getAccessGroupsForUser: (userId: string) => AccessGroup[];
}

export const createRbacSlice: StateCreator<RbacSlice> = (set, get) => {
  // Seed the resolver with mock data
  const byUser = new Map<string, { assignments: RoleAssignment[]; denies: DenyAssignment[] }>();

  for (const a of MOCK_ROLE_ASSIGNMENTS) {
    if (a.principal.type === 'user') {
      const entry = byUser.get(a.principal.id) ?? { assignments: [], denies: [] };
      entry.assignments.push(a);
      byUser.set(a.principal.id, entry);
    }
  }
  for (const d of MOCK_DENY_ASSIGNMENTS) {
    if (d.principal.type === 'user') {
      const entry = byUser.get(d.principal.id) ?? { assignments: [], denies: [] };
      entry.denies.push(d);
      byUser.set(d.principal.id, entry);
    }
  }
  for (const [userId, data] of byUser) {
    permissionResolver.loadAssignments(userId, data.assignments, data.denies);
  }
  for (const g of MOCK_ACCESS_GROUPS) {
    permissionResolver.loadGroup(g);
  }

  return {
    currentUserId: 'user-alice',
    currentUserScope: TENANT_SCOPE('TNT-001'),

    roleAssignments: MOCK_ROLE_ASSIGNMENTS,
    denyAssignments: MOCK_DENY_ASSIGNMENTS,
    accessGroups: MOCK_ACCESS_GROUPS,
    auditLog: MOCK_AUDIT_LOG,

    addRoleAssignment: (assignment) => {
      set(s => ({ roleAssignments: [...s.roleAssignments, assignment] }));
      const current = get().getAssignmentsForUser(assignment.principal.id);
      const currentDenies = get().denyAssignments.filter(
        d => d.principal.id === assignment.principal.id
      );
      permissionResolver.loadAssignments(assignment.principal.id, current, currentDenies);
    },

    revokeRoleAssignment: (id, revokedBy, reason) => {
      set(s => ({
        roleAssignments: s.roleAssignments.map(a =>
          a.id === id
            ? { ...a, status: 'revoked', revokedBy, revokedAt: new Date().toISOString(), revokeReason: reason }
            : a
        ),
      }));
      // Re-sync resolver so revocation is immediately reflected in permission checks
      const targetAssignment = get().roleAssignments.find(a => a.id === id);
      if (targetAssignment) {
        const userId = targetAssignment.principal.id;
        const updated = get().getAssignmentsForUser(userId);
        const denies = get().denyAssignments.filter(d => d.principal.id === userId);
        permissionResolver.loadAssignments(userId, updated, denies);
      }
    },

    addDenyAssignment: (deny) => {
      set(s => ({ denyAssignments: [...s.denyAssignments, deny] }));
      // Re-sync resolver so new deny is immediately active
      const userId = deny.principal.id;
      const assignments = get().getAssignmentsForUser(userId);
      const denies = get().denyAssignments.filter(d => d.principal.id === userId);
      permissionResolver.loadAssignments(userId, assignments, denies);
    },

    liftDenyAssignment: (id, liftedBy, reason) => {
      set(s => ({
        denyAssignments: s.denyAssignments.map(d =>
          d.id === id
            ? { ...d, status: 'lifted', liftedBy, liftedAt: new Date().toISOString(), liftReason: reason }
            : d
        ),
      }));
      // Re-sync resolver so lifted deny is immediately removed from checks
      const targetDeny = get().denyAssignments.find(d => d.id === id);
      if (targetDeny) {
        const userId = targetDeny.principal.id;
        const assignments = get().getAssignmentsForUser(userId);
        const denies = get().denyAssignments.filter(d => d.principal.id === userId);
        permissionResolver.loadAssignments(userId, assignments, denies);
      }
    },

    addAccessGroup: (group) => {
      set(s => ({ accessGroups: [...s.accessGroups, group] }));
      permissionResolver.loadGroup(group);
    },

    updateAccessGroup: (id, updates) => {
      set(s => ({
        accessGroups: s.accessGroups.map(g => (g.id === id ? { ...g, ...updates } : g)),
      }));
      // Re-sync resolver with the updated group (ceiling, status, etc. may have changed)
      const updated = get().accessGroups.find(g => g.id === id);
      if (updated) permissionResolver.loadGroup(updated);
    },

    addAccessGroupMember: (groupId, member) => {
      set(s => ({
        accessGroups: s.accessGroups.map(g =>
          g.id === groupId ? { ...g, members: [...g.members, member] } : g
        ),
      }));
      // Re-sync resolver with updated group membership
      const updated = get().accessGroups.find(g => g.id === groupId);
      if (updated) permissionResolver.loadGroup(updated);
    },

    removeAccessGroupMember: (groupId, userId) => {
      set(s => ({
        accessGroups: s.accessGroups.map(g =>
          g.id === groupId
            ? { ...g, members: g.members.filter(m => m.userId !== userId) }
            : g
        ),
      }));
      // Re-sync resolver — removed member loses group-sourced permissions immediately
      const updated = get().accessGroups.find(g => g.id === groupId);
      if (updated) permissionResolver.loadGroup(updated);
    },

    appendAuditEntry: (entry) => {
      set(s => ({ auditLog: [entry, ...s.auditLog] }));
    },

    getAssignmentsForUser: (userId) => {
      return get().roleAssignments.filter(a => a.principal.id === userId);
    },

    getAccessGroupsForUser: (userId) => {
      return get().accessGroups.filter(g => g.members.some(m => m.userId === userId));
    },
  };
};
```

- [ ] **Step 3: Wire slice into store**

`useStore.ts` already imports `createRbacSlice` at line 22 and spreads it at line 138.
The existing call is `...createRbacSlice(set)` but the new slice uses `get` — fix to `(set, get)`.

Open `src/store/useStore.ts`. The only two changes needed:

**Change 1 — line 138:** `...createRbacSlice(set),` → `...createRbacSlice(set, get),`

**Change 2 — the `Store` interface** already extends `RbacSlice` (line 74). No change needed there.

Run:
```bash
grep -n "createRbacSlice" /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/store/useStore.ts
```

Expected output: `138:    ...createRbacSlice(set),`

Then edit line 138:
```bash
# Verify first:
sed -n '136,140p' /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/store/useStore.ts
```

Make the edit using the Edit tool on `useStore.ts`:
- old: `...createRbacSlice(set),`
- new: `...createRbacSlice(set, get),`

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -v "lazyComponents"
```

Expected: No output from your new files (pre-existing `lazyComponents.ts` error filtered out).

- [ ] **Step 5: Commit**

```bash
git add src/data/mockRbac.ts src/store/slices/rbacSlice.ts
git commit -m "feat(rbac): add mock data and rebuild Zustand RBAC slice"
```

---

## Task 5: UserManagement.tsx - 5 Tabs with URL Sync

**Files:**
- Modify: `src/components/configure/UserManagement.tsx`

The current file hard-codes 3 tabs, resets to 'users' on every render via a broken `useEffect`, and uses a custom horizontal tab bar that doesn't match the Flywheel Configure pattern.

**Pattern used by every other Configure section** (Policies, Connections, Groups): `VerticalTabGroup` in a `flex gap-0` layout with `flex-1 pl-6` content area. Users must match this — not invent a new tab pattern.

**URL sync**: The rest of the app uses React Router (`useNavigate`/`useSearchParams`). Sub-tab state goes in `?tab=users` via `useSearchParams`, not `window.location.hash`.

- [ ] **Step 1: Read the current file**

```bash
cat /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/components/configure/UserManagement.tsx
```

- [ ] **Step 2: Rewrite UserManagement.tsx**

```tsx
// src/components/configure/UserManagement.tsx
import { useSearchParams } from 'react-router-dom';
import { Users, Shield, Activity, Layers, ClipboardList } from 'lucide-react';
import { VerticalTabGroup } from '../navigation/VerticalTabGroup';
import { TabItem } from '../../types/navigation';
import { UserList } from './users/UserList';
import { GroupManagement } from './users/GroupManagement';
import { RoleCatalog } from './users/RoleCatalog';
import { AssignmentManagement } from './users/AssignmentManagement';
import { AuditLog } from './users/AuditLog';

type Tab = 'users' | 'groups' | 'roles' | 'assignments' | 'activity';

const VALID_TABS: Tab[] = ['users', 'groups', 'roles', 'assignments', 'activity'];

const tabs: TabItem[] = [
  { id: 'users',       label: 'Users',       icon: <Users className="h-5 w-5 mr-2" />,       category: 'People' },
  { id: 'groups',      label: 'Groups',      icon: <Layers className="h-5 w-5 mr-2" />,      category: 'People' },
  { id: 'roles',       label: 'Roles',       icon: <Shield className="h-5 w-5 mr-2" />,      category: 'Access' },
  { id: 'assignments', label: 'Assignments', icon: <ClipboardList className="h-5 w-5 mr-2" />, category: 'Access' },
  { id: 'activity',    label: 'Activity',    icon: <Activity className="h-5 w-5 mr-2" />,    category: 'Audit' },
];

export function UserManagement() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as Tab | null;
  const activeTab: Tab = raw && VALID_TABS.includes(raw) ? raw : 'users';

  const handleTabChange = (tab: string) => {
    setParams({ tab });
  };

  return (
    <div className="p-6">
      <div className="flex gap-0">
        <VerticalTabGroup
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        <div className="flex-1 pl-6">
          {activeTab === 'users'       && <UserList />}
          {activeTab === 'groups'      && <GroupManagement />}
          {activeTab === 'roles'       && <RoleCatalog />}
          {activeTab === 'assignments' && <AssignmentManagement />}
          {activeTab === 'activity'    && <AuditLog />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript (the imported components don't exist yet — expect import errors only)**

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "UserManagement"
```

Expected: errors referencing missing imports (`UserList`, `GroupManagement`, etc.) from `UserManagement.tsx` — and nothing else from that file. If you see type errors on the component itself (not import-not-found), fix those before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src/components/configure/UserManagement.tsx
git commit -m "feat(rbac): rebuild UserManagement with 5-tab URL-synced layout"
```

---

## Task 6: UserList.tsx - Rebuilt

**Files:**
- Modify: `src/components/configure/users/UserList.tsx`

Problems with current: hardcoded role filter values that match nothing, mapUserRole string hack, permissions column uses old model, no expiry display, no SoD indicators, Edit User and View Permissions are stubs.

- [ ] **Step 1: Read current columns definition**

```bash
sed -n '130,232p' /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/components/configure/users/UserList.tsx
```

- [ ] **Step 2: Rewrite UserList.tsx**

```tsx
// src/components/configure/users/UserList.tsx
import { useState, useMemo } from 'react';
import { UserPlus, AlertTriangle, Clock, Shield, Eye } from 'lucide-react';
import { UserIcon } from '../../common/UserIcon';
import { InviteUserDrawer } from './InviteUserDrawer';
import { AssignRoleDrawer } from './AssignRoleDrawer';
import { EffectivePermissionsModal } from './EffectivePermissionsModal';
import { BaseTable } from '../../common/BaseTable';
import { OverflowMenu } from '../../common/OverflowMenu';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { RoleAssignment } from '../../../types/rbac';
import { ROLE_CATALOG } from '../../../data/roleCatalog';
import { UserType } from '../types';

const USER_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'assignmentStatus',
    label: 'Assignment Status',
    type: 'checkbox',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'expired', label: 'Expired' },
      { value: 'pending-approval', label: 'Pending Approval' },
    ],
  },
  {
    id: 'role',
    label: 'Role',
    type: 'checkbox',
    options: [
      { value: 'NetworkEngineer', label: 'Network Engineer' },
      { value: 'SupportSpecialist', label: 'Support Specialist' },
      { value: 'BillingAdmin', label: 'Billing Admin' },
      { value: 'SecurityAdmin', label: 'Security Admin' },
      { value: 'OperationsManager', label: 'Operations Manager' },
      { value: 'PartnerManager', label: 'Partner Manager' },
      { value: 'ApiManager', label: 'API Manager' },
      { value: 'ProvisioningManager', label: 'Provisioning Manager' },
      { value: 'Viewer', label: 'Viewer' },
      { value: 'TenantAdmin', label: 'Tenant Admin' },
      { value: 'PlatformAdmin', label: 'Platform Admin' },
    ],
  },
];

function daysUntilExpiry(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const days = daysUntilExpiry(expiresAt);
  if (days < 0) return <span className="text-figma-xs text-fw-error font-medium">Expired</span>;
  if (days <= 14) return (
    <span className="flex items-center gap-1 text-figma-xs text-fw-warn font-medium">
      <Clock className="h-3 w-3" />
      {days}d left
    </span>
  );
  return <span className="text-figma-xs text-fw-bodyLight">{new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>;
}

export function UserList() {
  const users = useStore(s => s.users);
  const roleAssignments = useStore(s => s.roleAssignments);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [assignTarget, setAssignTarget] = useState<UserType | null>(null);
  const [permTarget, setPermTarget] = useState<UserType | null>(null);

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({
    groups: USER_FILTER_GROUPS,
  });

  // Build a map: userId -> active assignments
  const assignmentsByUser = useMemo(() => {
    const map = new Map<string, RoleAssignment[]>();
    for (const a of roleAssignments) {
      if (a.principal.type !== 'user') continue;
      const list = map.get(a.principal.id) ?? [];
      list.push(a);
      map.set(a.principal.id, list);
    }
    return map;
  }, [roleAssignments]);

  const filteredUsers = useMemo(() => {
    const roleFilters = (filters.role ?? []) as string[];
    const statusFilters = (filters.assignmentStatus ?? []) as string[];
    const q = searchQuery.toLowerCase();

    return users.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      const userAssignments = assignmentsByUser.get(user.id) ?? [];

      if (roleFilters.length > 0) {
        const hasRole = userAssignments.some(a => roleFilters.includes(a.role));
        if (!hasRole) return false;
      }

      if (statusFilters.length > 0) {
        const hasStatus = userAssignments.some(a => statusFilters.includes(a.status));
        if (!hasStatus) return false;
      }

      return true;
    });
  }, [users, assignmentsByUser, searchQuery, filters]);

  const columns = [
    {
      id: 'user',
      label: 'User',
      sortable: true,
      sortKey: 'name' as keyof UserType,
      render: (user: UserType) => (
        <div className="min-w-[200px]">
          <div className="text-figma-sm font-semibold text-fw-heading">{user.name}</div>
          <div className="text-figma-xs text-fw-bodyLight">{user.email}</div>
        </div>
      ),
    },
    {
      id: 'roles',
      label: 'Roles',
      render: (user: UserType) => {
        const assignments = (assignmentsByUser.get(user.id) ?? []).filter(
          a => a.status === 'active'
        );
        if (assignments.length === 0) {
          return <span className="text-figma-sm text-fw-disabled italic">No active roles</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {assignments.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-figma-xs font-medium bg-fw-accent text-fw-cobalt-700 rounded-md border border-fw-active">
                  {ROLE_CATALOG[a.role]?.displayName ?? a.role}
                </span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: 'scope',
      label: 'Scope',
      render: (user: UserType) => {
        const assignments = (assignmentsByUser.get(user.id) ?? []).filter(
          a => a.status === 'active'
        );
        if (assignments.length === 0) return null;
        return (
          <div className="flex flex-col gap-1">
            {assignments.map(a => (
              <span key={a.id} className="text-figma-xs text-fw-bodyLight font-mono">
                {a.scope.raw}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: 'expiry',
      label: 'Expiry',
      render: (user: UserType) => {
        const assignments = (assignmentsByUser.get(user.id) ?? []).filter(
          a => a.status === 'active'
        );
        if (assignments.length === 0) return null;
        // Show the soonest expiry
        const soonest = assignments.reduce((min, a) =>
          new Date(a.expiresAt) < new Date(min.expiresAt) ? a : min
        );
        return <ExpiryBadge expiresAt={soonest.expiresAt} />;
      },
    },
    {
      id: 'sod',
      label: 'SoD',
      render: (user: UserType) => {
        // Basic SoD indicator: NetworkEngineer + ProvisioningManager same scope = violation
        const assignments = (assignmentsByUser.get(user.id) ?? []).filter(a => a.status === 'active');
        const roles = assignments.map(a => a.role);
        const hasViolation =
          (roles.includes('NetworkEngineer') && roles.includes('ProvisioningManager')) ||
          (roles.includes('BillingAdmin') && roles.includes('SecurityAdmin')) ||
          (roles.includes('TenantAdmin') && roles.includes('PlatformAdmin'));
        if (!hasViolation) return null;
        return (
          <span className="flex items-center gap-1 text-figma-xs text-fw-error font-medium">
            <AlertTriangle className="h-3 w-3" />
            SoD conflict
          </span>
        );
      },
    },
  ];

  return (
    <>
      <BaseTable
        toolbar={
          <SearchFilterBar
            searchPlaceholder="Search by name or email..."
            searchValue={searchQuery}
            onSearchChange={v => setSearchQuery(v ?? '')}
            onFilter={toggle}
            activeFilterCount={activeCount}
            isFilterOpen={isOpen}
            filterPanel={
              <TableFilterPanel
                groups={USER_FILTER_GROUPS}
                activeFilters={filters}
                onFiltersChange={setFilters}
                isOpen={isOpen}
                onToggle={toggle}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            }
            actions={
              <Button
                variant="primary"
                icon={UserPlus}
                onClick={() => setShowInvite(true)}
                data-testid="invite-user-button"
              >
                Invite User
              </Button>
            }
          />
        }
        columns={columns}
        data={filteredUsers}
        keyField="id"
        tableId="users"
        showColumnManager
        actions={(user: UserType) => (
          <OverflowMenu
            items={[
              {
                id: 'assign',
                label: 'Assign Role',
                icon: <Shield className="h-4 w-4" />,
                onClick: () => setAssignTarget(user),
              },
              {
                id: 'permissions',
                label: 'View Effective Permissions',
                icon: <Eye className="h-4 w-4" />,
                onClick: () => setPermTarget(user),
              },
            ]}
          />
        )}
        emptyState={
          <div className="text-center py-12">
            <UserIcon size="xl" variant="muted" className="mx-auto mb-3" />
            <h3 className="text-figma-base font-medium text-fw-heading mb-1">No users found</h3>
            <p className="text-figma-sm text-fw-bodyLight">
              {searchQuery ? 'Try adjusting your search' : 'Invite your first user to get started'}
            </p>
          </div>
        }
      />

      <InviteUserDrawer isOpen={showInvite} onClose={() => setShowInvite(false)} />

      {assignTarget && (
        <AssignRoleDrawer
          isOpen={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          targetUser={assignTarget}
        />
      )}

      {permTarget && (
        <EffectivePermissionsModal
          isOpen={!!permTarget}
          onClose={() => setPermTarget(null)}
          user={permTarget}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/configure/users/UserList.tsx
git commit -m "feat(rbac): rebuild UserList with live role assignments, expiry warnings, SoD indicators"
```

---

## Task 7: InviteUserDrawer

**Files:**
- Create: `src/components/configure/users/InviteUserDrawer.tsx`

Identity only. No role selection. Roles are assigned separately via AssignRoleDrawer.

- [ ] **Step 1: Create the file**

```tsx
// src/components/configure/users/InviteUserDrawer.tsx
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { UserType } from '../types';

interface InviteUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteUserDrawer({ isOpen, onClose }: InviteUserDrawerProps) {
  const addUser = useStore(s => s.addUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const newUser: UserType = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: 'Viewer', // placeholder — real role assigned via AssignRoleDrawer
      department: department.trim() || undefined,
      status: 'active',
      lastActive: new Date().toISOString(),
      tenantId: 'TNT-001',
      scopePath: `/tenants/TNT-001`,
      connectionAccess: [],
    };

    addUser(newUser);
    window.addToast({ type: 'success', title: 'User Invited', message: `${name} has been invited. Assign a role to grant access.`, duration: 4000 });
    handleClose();
  };

  const handleClose = () => {
    setName(''); setEmail(''); setDepartment(''); setErrors({});
    onClose();
  };

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite User"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" icon={UserPlus} onClick={handleSave}>Invite</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-figma-sm text-fw-body">
          Invite a user by identity only. Assign roles separately from the Assignments tab or from the user's overflow menu.
        </p>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Full Name <span className="text-fw-error">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.name ? 'border-fw-error' : 'border-fw-secondary'}`}
          />
          {errors.name && <p className="mt-1 text-figma-xs text-fw-error">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Email Address <span className="text-fw-error">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@company.com"
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.email ? 'border-fw-error' : 'border-fw-secondary'}`}
          />
          {errors.email && <p className="mt-1 text-figma-xs text-fw-error">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Department</label>
          <input
            type="text"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            placeholder="Engineering"
            className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled focus:outline-none focus:ring-2 focus:ring-fw-active"
          />
        </div>

        <div className="bg-fw-accent border border-fw-active rounded-lg p-3 text-figma-sm text-fw-body">
          <strong className="text-fw-heading">Next step:</strong> After inviting, go to the Assignments tab or use "Assign Role" from this user's menu to grant permissions.
        </div>
      </div>
    </SideDrawer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/configure/users/InviteUserDrawer.tsx
git commit -m "feat(rbac): add InviteUserDrawer — identity only, no role selection"
```

---

## Task 8: AssignRoleDrawer

**Files:**
- Create: `src/components/configure/users/AssignRoleDrawer.tsx`

Creates a RoleAssignment. Validates SoD before saving. Requires justification and expiry.

- [ ] **Step 1: Create the file**

```tsx
// src/components/configure/users/AssignRoleDrawer.tsx
import { useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { RoleAssignment, RoleName, buildScopePath } from '../../../types/rbac';
import { ROLE_CATALOG, SOD_CONSTRAINTS } from '../../../data/roleCatalog';
import { UserType } from '../types';

interface AssignRoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserType;
}

const ROLE_OPTIONS = Object.values(ROLE_CATALOG).map(r => ({
  value: r.name,
  label: r.displayName,
  description: r.description,
  maxScope: r.maxScopeTier,
}));

const REVIEW_CYCLES = [
  { value: 'quarterly', label: 'Quarterly (90 days)' },
  { value: 'annual', label: 'Annual (365 days)' },
] as const;

// Default expiry date: 90 days from now
function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

export function AssignRoleDrawer({ isOpen, onClose, targetUser }: AssignRoleDrawerProps) {
  const { addRoleAssignment, roleAssignments, currentUserId } = useStore(s => ({
    addRoleAssignment: s.addRoleAssignment,
    roleAssignments: s.roleAssignments,
    currentUserId: s.currentUserId,
  }));

  const [role, setRole] = useState<RoleName | ''>('');
  const [scopeRaw, setScopeRaw] = useState(`/tenants/TNT-001`);
  const [justification, setJustification] = useState('');
  const [expiresAt, setExpiresAt] = useState(defaultExpiry());
  const [reviewCycle, setReviewCycle] = useState<'quarterly' | 'annual'>('quarterly');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sodWarning, setSodWarning] = useState<string | null>(null);

  const checkSoD = (selectedRole: RoleName) => {
    const existingRoles = roleAssignments
      .filter(a => a.principal.id === targetUser.id && a.status === 'active')
      .map(a => a.role);

    for (const constraint of SOD_CONSTRAINTS) {
      const [roleA, roleB] = constraint.mutuallyExclusiveRoles;
      const conflicts =
        (selectedRole === roleA && existingRoles.includes(roleB)) ||
        (selectedRole === roleB && existingRoles.includes(roleA));
      if (conflicts) {
        setSodWarning(`SoD conflict: "${constraint.name}" — ${roleA} and ${roleB} cannot be held simultaneously.`);
        return;
      }
    }
    setSodWarning(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!role) e.role = 'Select a role';
    if (!justification.trim()) e.justification = 'Justification is required';
    if (justification.trim().length < 20) e.justification = 'Provide at least 20 characters';
    if (!expiresAt) e.expiresAt = 'Expiry date is required';
    else if (new Date(expiresAt) <= new Date()) e.expiresAt = 'Expiry must be in the future';
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (sodWarning) {
      // Block on hard SoD violations
      return;
    }

    const assignment: RoleAssignment = {
      id: `ra-${Date.now()}`,
      principal: { id: targetUser.id, type: 'user', displayName: targetUser.name },
      role: role as RoleName,
      scope: buildScopePath(scopeRaw),
      justification: justification.trim(),
      grantedBy: currentUserId,
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      reviewCycle,
      status: 'active',
    };

    addRoleAssignment(assignment);
    window.addToast({
      type: 'success',
      title: 'Role Assigned',
      message: `${ROLE_CATALOG[role as RoleName]?.displayName} assigned to ${targetUser.name}.`,
      duration: 3000,
    });
    handleClose();
  };

  const handleClose = () => {
    setRole(''); setScopeRaw('/tenants/TNT-001'); setJustification('');
    setExpiresAt(defaultExpiry()); setReviewCycle('quarterly');
    setErrors({}); setSodWarning(null);
    onClose();
  };

  const selectedRoleDef = role ? ROLE_CATALOG[role as RoleName] : null;

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title={`Assign Role — ${targetUser.name}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" icon={Shield} onClick={handleSave} disabled={!!sodWarning}>
            Assign Role
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Role picker */}
        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Role <span className="text-fw-error">*</span>
          </label>
          <select
            value={role}
            onChange={e => { setRole(e.target.value as RoleName); checkSoD(e.target.value as RoleName); }}
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.role ? 'border-fw-error' : 'border-fw-secondary'}`}
          >
            <option value="">Select a role…</option>
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-figma-xs text-fw-error">{errors.role}</p>}
          {selectedRoleDef && (
            <p className="mt-1.5 text-figma-xs text-fw-bodyLight">{selectedRoleDef.description}</p>
          )}
        </div>

        {/* SoD warning */}
        {sodWarning && (
          <div className="flex items-start gap-2 bg-fw-errorLight border border-fw-error rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-fw-error mt-0.5 flex-shrink-0" />
            <p className="text-figma-sm text-fw-error">{sodWarning}</p>
          </div>
        )}

        {/* Scope */}
        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Scope Path
          </label>
          <input
            type="text"
            value={scopeRaw}
            onChange={e => setScopeRaw(e.target.value)}
            placeholder="/tenants/TNT-001"
            className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-heading font-mono focus:outline-none focus:ring-2 focus:ring-fw-active"
          />
          {selectedRoleDef && (
            <p className="mt-1 text-figma-xs text-fw-bodyLight">
              Max scope for {selectedRoleDef.displayName}: <strong>{selectedRoleDef.maxScopeTier}</strong>
            </p>
          )}
        </div>

        {/* Justification */}
        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Justification <span className="text-fw-error">*</span>
          </label>
          <textarea
            value={justification}
            onChange={e => setJustification(e.target.value)}
            rows={3}
            placeholder="Why does this user need this role? Reference ticket or business need."
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled resize-none focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.justification ? 'border-fw-error' : 'border-fw-secondary'}`}
          />
          {errors.justification && <p className="mt-1 text-figma-xs text-fw-error">{errors.justification}</p>}
          <p className="mt-1 text-figma-xs text-fw-bodyLight">{justification.trim().length} / 20 chars minimum</p>
        </div>

        {/* Expiry */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
              Expires On <span className="text-fw-error">*</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.expiresAt ? 'border-fw-error' : 'border-fw-secondary'}`}
            />
            {errors.expiresAt && <p className="mt-1 text-figma-xs text-fw-error">{errors.expiresAt}</p>}
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Review Cycle</label>
            <select
              value={reviewCycle}
              onChange={e => setReviewCycle(e.target.value as 'quarterly' | 'annual')}
              className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active"
            >
              {REVIEW_CYCLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/configure/users/AssignRoleDrawer.tsx
git commit -m "feat(rbac): add AssignRoleDrawer with SoD check, justification, expiry"
```

---

## Task 9: EffectivePermissionsModal

**Files:**
- Create: `src/components/configure/users/EffectivePermissionsModal.tsx`

Shows every permission the user currently has, grouped by object, with the source assignment listed.

- [ ] **Step 1: Create the file**

```tsx
// src/components/configure/users/EffectivePermissionsModal.tsx
import { useMemo } from 'react';
import { Shield } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { permissionResolver } from '../../../utils/permissionResolver';
import { Permission, buildScopePath } from '../../../types/rbac';
import { ROLE_CATALOG } from '../../../data/roleCatalog';
import { UserType } from '../types';

interface EffectivePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
}

function groupPermissions(perms: Permission[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const [obj, action] = p.split(':');
    if (!groups[obj]) groups[obj] = [];
    groups[obj].push(action);
  }
  return groups;
}

const OBJECT_LABELS: Record<string, string> = {
  connection: 'Connections',
  link: 'Links',
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
  api: 'APIs',
  tenant: 'Tenant',
  system: 'System',
  audit: 'Audit',
};

export function EffectivePermissionsModal({ isOpen, onClose, user }: EffectivePermissionsModalProps) {
  const roleAssignments = useStore(s => s.roleAssignments);

  const { permissions, byObject } = useMemo(() => {
    const scope = buildScopePath(user.scopePath ?? '/tenants/TNT-001');
    const perms = permissionResolver.getEffectivePermissions(user.id, scope, { currentTime: new Date() });
    return { permissions: perms, byObject: groupPermissions(perms) };
  }, [user, roleAssignments]);

  const activeAssignments = roleAssignments.filter(
    a => a.principal.id === user.id && a.status === 'active'
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Effective Permissions — ${user.name}`}
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-fw-accent border border-fw-active rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-fw-link flex-shrink-0" />
            <div>
              <p className="text-figma-sm font-semibold text-fw-heading">
                {permissions.length} effective permissions
              </p>
              <p className="text-figma-xs text-fw-bodyLight">
                from {activeAssignments.length} active assignment{activeAssignments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {permissions.length === 0 && (
          <div className="text-center py-8">
            <Shield className="h-8 w-8 text-fw-disabled mx-auto mb-2" />
            <p className="text-figma-sm text-fw-bodyLight">No active permissions. Assign a role to grant access.</p>
          </div>
        )}

        {/* Grouped by object */}
        {Object.entries(byObject).sort().map(([obj, actions]) => (
          <div key={obj}>
            <h3 className="text-figma-sm font-semibold text-fw-heading mb-2">
              {OBJECT_LABELS[obj] ?? obj}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {actions.sort().map(action => (
                <span
                  key={action}
                  className="px-2 py-0.5 text-figma-xs font-medium bg-fw-successLight text-fw-success rounded-md"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Source assignments */}
        {activeAssignments.length > 0 && (
          <div>
            <h3 className="text-figma-sm font-semibold text-fw-heading mb-2">Source Assignments</h3>
            <div className="space-y-2">
              {activeAssignments.map(a => (
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
      </div>
    </SideDrawer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/configure/users/EffectivePermissionsModal.tsx
git commit -m "feat(rbac): add EffectivePermissionsModal — computed permissions grouped by object"
```

---

## Task 10: GroupManagement.tsx

**Files:**
- Create: `src/components/configure/users/GroupManagement.tsx`

Groups tab. Shows all groups with purpose badge, member count, ceiling, and status. Overflow menu: View Details, Suspend.

- [ ] **Step 1: Create the file**

```tsx
// src/components/configure/users/GroupManagement.tsx
import { useState } from 'react';
import { Layers, Plus, Eye, RefreshCw, Ban } from 'lucide-react';
import { BaseTable } from '../../common/BaseTable';
import { OverflowMenu } from '../../common/OverflowMenu';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { AccessGroup, AccessGroupPurpose, AccessGroupStatus } from '../../../types/rbac';
import { CreateGroupDrawer } from './CreateGroupDrawer';
import { GroupDetailDrawer } from './GroupDetailDrawer';

const PURPOSE_LABELS: Record<AccessGroupPurpose, string> = {
  organizational: 'Organizational',
  'resource-cluster': 'Resource Cluster',
  project: 'Project',
  'audit-engagement': 'Audit Engagement',
};

const PURPOSE_COLORS: Record<AccessGroupPurpose, string> = {
  organizational: 'bg-fw-accent text-fw-cobalt-700 border-fw-active',
  'resource-cluster': 'bg-fw-warnLight text-fw-warn border-fw-warn',
  project: 'bg-fw-successLight text-fw-success border-fw-success',
  'audit-engagement': 'bg-fw-neutral text-fw-disabled border-fw-secondary',
};

const STATUS_COLORS: Record<AccessGroupStatus, string> = {
  active: 'bg-fw-successLight text-fw-success',
  suspended: 'bg-fw-errorLight text-fw-error',
  ownerless: 'bg-fw-warnLight text-fw-warn',
  'pending-review': 'bg-fw-warnLight text-fw-warn',
  closed: 'bg-fw-neutral text-fw-disabled',
};

export function GroupManagement() {
  const accessGroups = useStore(s => s.accessGroups);
  const updateAccessGroup = useStore(s => s.updateAccessGroup);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailGroup, setDetailGroup] = useState<AccessGroup | null>(null);

  const filtered = accessGroups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      id: 'name',
      label: 'Group',
      sortable: true,
      sortKey: 'name' as keyof AccessGroup,
      render: (g: AccessGroup) => (
        <div>
          <div className="text-figma-sm font-semibold text-fw-heading">{g.name}</div>
          <div className="text-figma-xs text-fw-bodyLight">{g.description}</div>
        </div>
      ),
    },
    {
      id: 'purpose',
      label: 'Purpose',
      render: (g: AccessGroup) => (
        <span className={`px-2 py-0.5 text-figma-xs font-medium rounded-md border ${PURPOSE_COLORS[g.purpose]}`}>
          {PURPOSE_LABELS[g.purpose]}
        </span>
      ),
    },
    {
      id: 'members',
      label: 'Members',
      render: (g: AccessGroup) => (
        <span className="text-figma-sm text-fw-heading font-medium">{g.members.length}</span>
      ),
    },
    {
      id: 'ceiling',
      label: 'Scope Ceiling',
      render: (g: AccessGroup) => (
        <span className="text-figma-xs text-fw-bodyLight font-mono">
          {g.scopeCeiling.path?.raw ?? '(inherits creator scope)'}
        </span>
      ),
    },
    {
      id: 'owner',
      label: 'Owner',
      render: (g: AccessGroup) => (
        <span className="text-figma-sm text-fw-body">{g.owner}</span>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (g: AccessGroup) => (
        <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-lg ${STATUS_COLORS[g.status]}`}>
          {g.status}
        </span>
      ),
    },
  ];

  return (
    <>
      <BaseTable
        toolbar={
          <SearchFilterBar
            searchPlaceholder="Search groups..."
            searchValue={search}
            onSearchChange={v => setSearch(v ?? '')}
            actions={
              <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>
                Create Group
              </Button>
            }
          />
        }
        columns={columns}
        data={filtered}
        keyField="id"
        tableId="groups"
        actions={(g: AccessGroup) => (
          <OverflowMenu
            items={[
              {
                id: 'detail',
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: () => setDetailGroup(g),
              },
              {
                id: 'suspend',
                label: g.status === 'suspended' ? 'Reactivate' : 'Suspend',
                icon: g.status === 'suspended'
                  ? <RefreshCw className="h-4 w-4" />
                  : <Ban className="h-4 w-4" />,
                onClick: () => {
                  updateAccessGroup(g.id, {
                    status: g.status === 'suspended' ? 'active' : 'suspended',
                  });
                  window.addToast({
                    type: 'info',
                    title: g.status === 'suspended' ? 'Group Reactivated' : 'Group Suspended',
                    message: g.name,
                    duration: 3000,
                  });
                },
              },
            ]}
          />
        )}
        emptyState={
          <div className="text-center py-12">
            <Layers className="h-10 w-10 text-fw-disabled mx-auto mb-3" />
            <h3 className="text-figma-base font-medium text-fw-heading mb-1">No groups yet</h3>
            <p className="text-figma-sm text-fw-bodyLight">Create a group to assign roles to multiple users with a shared scope ceiling.</p>
          </div>
        }
      />

      <CreateGroupDrawer isOpen={showCreate} onClose={() => setShowCreate(false)} />

      {detailGroup && (
        <GroupDetailDrawer
          isOpen={!!detailGroup}
          onClose={() => setDetailGroup(null)}
          group={detailGroup}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/configure/users/GroupManagement.tsx
git commit -m "feat(rbac): add GroupManagement tab with purpose badges, ceiling, status"
```

---

## Task 11: CreateGroupDrawer

**Files:**
- Create: `src/components/configure/users/CreateGroupDrawer.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/configure/users/CreateGroupDrawer.tsx
import { useState } from 'react';
import { Layers } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { AccessGroup, AccessGroupPurpose, OwnerlessPolicy, buildScopePath } from '../../../types/rbac';

interface CreateGroupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PURPOSE_OPTIONS: { value: AccessGroupPurpose; label: string; description: string }[] = [
  { value: 'organizational', label: 'Organizational', description: 'Maps to org structure (department, business unit).' },
  { value: 'resource-cluster', label: 'Resource Cluster', description: 'Groups users by the resources they manage.' },
  { value: 'project', label: 'Project', description: 'Temporary group for a project with a defined end date.' },
  { value: 'audit-engagement', label: 'Audit Engagement', description: 'External auditors. Closes when engagement ends.' },
];

const OWNERLESS_POLICIES: { value: OwnerlessPolicy; label: string }[] = [
  { value: 'suspend', label: 'Suspend group if owner leaves' },
  { value: 'inherit-tenant-admin', label: 'Transfer to Tenant Admin' },
  { value: 'freeze', label: 'Freeze (read-only, no changes)' },
];

export function CreateGroupDrawer({ isOpen, onClose }: CreateGroupDrawerProps) {
  const { addAccessGroup, currentUserId } = useStore(s => ({
    addAccessGroup: s.addAccessGroup,
    currentUserId: s.currentUserId,
  }));

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState<AccessGroupPurpose>('organizational');
  const [scopeCeilingRaw, setScopeCeilingRaw] = useState('/tenants/TNT-001');
  const [ownerlessPolicy, setOwnerlessPolicy] = useState<OwnerlessPolicy>('suspend');
  const [reviewCycle, setReviewCycle] = useState<'quarterly' | 'annual'>('quarterly');
  const [auditSubject, setAuditSubject] = useState('');
  const [auditingBody, setAuditingBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!scopeCeilingRaw.trim()) e.scopeCeiling = 'Scope ceiling is required';
    if (purpose === 'audit-engagement') {
      if (!auditSubject.trim()) e.auditSubject = 'Audit subject is required';
      if (!auditingBody.trim()) e.auditingBody = 'Auditing body is required';
    }
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const group: AccessGroup = {
      id: `group-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      purpose,
      owner: currentUserId,
      ownerlessPolicy,
      scopeCeiling: { path: buildScopePath(scopeCeilingRaw.trim()) },
      members: [],
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      reviewCycle,
      status: 'active',
      ...(purpose === 'audit-engagement' ? {
        engagementMetadata: { subject: auditSubject.trim(), auditingBody: auditingBody.trim() },
      } : {}),
    };

    addAccessGroup(group);
    window.addToast({ type: 'success', title: 'Group Created', message: group.name, duration: 3000 });
    handleClose();
  };

  const handleClose = () => {
    setName(''); setDescription(''); setPurpose('organizational');
    setScopeCeilingRaw('/tenants/TNT-001'); setOwnerlessPolicy('suspend');
    setReviewCycle('quarterly'); setAuditSubject(''); setAuditingBody('');
    setErrors({});
    onClose();
  };

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Group"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" icon={Layers} onClick={handleSave}>Create Group</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Name <span className="text-fw-error">*</span></label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Operations Team"
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.name ? 'border-fw-error' : 'border-fw-secondary'}`} />
          {errors.name && <p className="mt-1 text-figma-xs text-fw-error">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Description <span className="text-fw-error">*</span></label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="What does this group do?"
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading resize-none focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.description ? 'border-fw-error' : 'border-fw-secondary'}`} />
          {errors.description && <p className="mt-1 text-figma-xs text-fw-error">{errors.description}</p>}
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-2">Purpose <span className="text-fw-error">*</span></label>
          <div className="space-y-2">
            {PURPOSE_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${purpose === opt.value ? 'border-fw-active bg-fw-accent' : 'border-fw-secondary hover:border-fw-active'}`}>
                <input type="radio" name="purpose" value={opt.value} checked={purpose === opt.value}
                  onChange={() => setPurpose(opt.value)} className="mt-0.5" />
                <div>
                  <div className="text-figma-sm font-medium text-fw-heading">{opt.label}</div>
                  <div className="text-figma-xs text-fw-bodyLight">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {purpose === 'audit-engagement' && (
          <div className="space-y-4 p-4 bg-fw-wash border border-fw-secondary rounded-lg">
            <h4 className="text-figma-sm font-semibold text-fw-heading">Audit Engagement Details</h4>
            <div>
              <label className="block text-figma-xs font-medium text-fw-heading mb-1">Subject <span className="text-fw-error">*</span></label>
              <input type="text" value={auditSubject} onChange={e => setAuditSubject(e.target.value)}
                placeholder="SOC 2 Type II Q2 Review"
                className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.auditSubject ? 'border-fw-error' : 'border-fw-secondary'}`} />
              {errors.auditSubject && <p className="mt-1 text-figma-xs text-fw-error">{errors.auditSubject}</p>}
            </div>
            <div>
              <label className="block text-figma-xs font-medium text-fw-heading mb-1">Auditing Body <span className="text-fw-error">*</span></label>
              <input type="text" value={auditingBody} onChange={e => setAuditingBody(e.target.value)}
                placeholder="KPMG"
                className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.auditingBody ? 'border-fw-error' : 'border-fw-secondary'}`} />
              {errors.auditingBody && <p className="mt-1 text-figma-xs text-fw-error">{errors.auditingBody}</p>}
            </div>
          </div>
        )}

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Scope Ceiling <span className="text-fw-error">*</span></label>
          <input type="text" value={scopeCeilingRaw} onChange={e => setScopeCeilingRaw(e.target.value)}
            placeholder="/tenants/TNT-001"
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading font-mono focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.scopeCeiling ? 'border-fw-error' : 'border-fw-secondary'}`} />
          <p className="mt-1 text-figma-xs text-fw-bodyLight">Members cannot be granted access beyond this scope via this group.</p>
          {errors.scopeCeiling && <p className="mt-1 text-figma-xs text-fw-error">{errors.scopeCeiling}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Review Cycle</label>
            <select value={reviewCycle} onChange={e => setReviewCycle(e.target.value as 'quarterly' | 'annual')}
              className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active">
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">If Owner Leaves</label>
            <select value={ownerlessPolicy} onChange={e => setOwnerlessPolicy(e.target.value as OwnerlessPolicy)}
              className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active">
              {OWNERLESS_POLICIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/configure/users/CreateGroupDrawer.tsx
git commit -m "feat(rbac): add CreateGroupDrawer with purpose, ceiling, ownerless policy"
```

---

## Task 12: GroupDetailDrawer

**Files:**
- Create: `src/components/configure/users/GroupDetailDrawer.tsx`

Shows group members with their expiry, and lists role assignments on the group principal.

- [ ] **Step 1: Create the file**

```tsx
// src/components/configure/users/GroupDetailDrawer.tsx
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { AccessGroup } from '../../../types/rbac';
import { ROLE_CATALOG } from '../../../data/roleCatalog';

interface GroupDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  group: AccessGroup;
}

function daysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function GroupDetailDrawer({ isOpen, onClose, group }: GroupDetailDrawerProps) {
  const removeAccessGroupMember = useStore(s => s.removeAccessGroupMember);
  const roleAssignments = useStore(s => s.roleAssignments);

  const groupAssignments = roleAssignments.filter(
    a => a.principal.id === group.id && a.status === 'active'
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={group.name}
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Meta */}
        <div className="bg-fw-wash border border-fw-secondary rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-figma-sm">
            <span className="text-fw-bodyLight">Purpose</span>
            <span className="font-medium text-fw-heading capitalize">{group.purpose.replace('-', ' ')}</span>
          </div>
          <div className="flex justify-between text-figma-sm">
            <span className="text-fw-bodyLight">Owner</span>
            <span className="font-medium text-fw-heading">{group.owner}</span>
          </div>
          <div className="flex justify-between text-figma-sm">
            <span className="text-fw-bodyLight">Scope Ceiling</span>
            <span className="font-mono text-figma-xs text-fw-body">{group.scopeCeiling.path?.raw ?? 'Inherits creator scope'}</span>
          </div>
          <div className="flex justify-between text-figma-sm">
            <span className="text-fw-bodyLight">Review Cycle</span>
            <span className="font-medium text-fw-heading capitalize">{group.reviewCycle}</span>
          </div>
          <div className="flex justify-between text-figma-sm">
            <span className="text-fw-bodyLight">Status</span>
            <span className={`font-medium ${group.status === 'active' ? 'text-fw-success' : 'text-fw-warn'}`}>
              {group.status}
            </span>
          </div>
        </div>

        {/* Audit engagement metadata */}
        {group.engagementMetadata && (
          <div className="bg-fw-neutral border border-fw-secondary rounded-lg p-4 space-y-1">
            <p className="text-figma-xs font-semibold text-fw-heading uppercase tracking-wide">Audit Engagement</p>
            <p className="text-figma-sm text-fw-body">{group.engagementMetadata.subject}</p>
            <p className="text-figma-xs text-fw-bodyLight">Audited by {group.engagementMetadata.auditingBody}</p>
            {group.engagementMetadata.closedAt && (
              <p className="text-figma-xs text-fw-disabled">Closed {new Date(group.engagementMetadata.closedAt).toLocaleDateString()}</p>
            )}
          </div>
        )}

        {/* Role assignments on the group */}
        <div>
          <h3 className="text-figma-sm font-semibold text-fw-heading mb-2">
            Group Role Assignments ({groupAssignments.length})
          </h3>
          {groupAssignments.length === 0 ? (
            <p className="text-figma-sm text-fw-bodyLight">No roles assigned to this group. Use Assignments tab to add.</p>
          ) : (
            <div className="space-y-2">
              {groupAssignments.map(a => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-fw-wash border border-fw-secondary rounded-lg">
                  <div>
                    <span className="text-figma-sm font-medium text-fw-heading">{ROLE_CATALOG[a.role]?.displayName ?? a.role}</span>
                    <span className="ml-2 text-figma-xs text-fw-bodyLight font-mono">{a.scope.raw}</span>
                  </div>
                  <span className="text-figma-xs text-fw-bodyLight">exp. {new Date(a.expiresAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-figma-sm font-semibold text-fw-heading">
              Members ({group.members.length})
            </h3>
          </div>
          {group.members.length === 0 ? (
            <p className="text-figma-sm text-fw-bodyLight">No members. Add users from the Users tab.</p>
          ) : (
            <div className="space-y-2">
              {group.members.map(m => {
                const days = daysLeft(m.expiresAt);
                return (
                  <div key={m.userId} className="flex items-center justify-between px-3 py-2 bg-fw-wash border border-fw-secondary rounded-lg">
                    <div>
                      <span className="text-figma-sm font-medium text-fw-heading">{m.displayName}</span>
                      <span className="ml-2 text-figma-xs text-fw-bodyLight">Added by {m.addedBy}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-figma-xs font-medium ${days <= 14 ? 'text-fw-warn' : 'text-fw-bodyLight'}`}>
                        {days < 0 ? 'Expired' : `${days}d left`}
                      </span>
                      <button
                        onClick={() => {
                          removeAccessGroupMember(group.id, m.userId);
                          window.addToast({ type: 'info', title: 'Member Removed', message: m.displayName, duration: 2000 });
                        }}
                        className="p-1 text-fw-bodyLight hover:text-fw-error transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SideDrawer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/configure/users/GroupDetailDrawer.tsx
git commit -m "feat(rbac): add GroupDetailDrawer with members, group assignments, engagement metadata"
```

---

## Task 13: RoleCatalog (replaces RoleManagement)

**Files:**
- Create: `src/components/configure/users/RoleCatalog.tsx`

Read-only. AT&T owns the role→permission mapping. No create/edit/delete of roles. Shows each BC role with its permissions grouped by object.

- [ ] **Step 1: Create the file**

```tsx
// src/components/configure/users/RoleCatalog.tsx
import { useState } from 'react';
import { Shield } from 'lucide-react';
import { ROLE_CATALOG, SOD_CONSTRAINTS } from '../../../data/roleCatalog';
import { RoleName, Permission } from '../../../types/rbac';

function groupPermissions(perms: Permission[]): Record<string, string[]> {
  const g: Record<string, string[]> = {};
  for (const p of perms) {
    const [obj, action] = p.split(':');
    if (!g[obj]) g[obj] = [];
    g[obj].push(action);
  }
  return g;
}

const SCOPE_TIER_ORDER = ['platform', 'reseller', 'tenant', 'client', 'pool', 'resource'];

function ScopeTierBadge({ tier }: { tier: string }) {
  const idx = SCOPE_TIER_ORDER.indexOf(tier);
  const colors = [
    'bg-fw-errorLight text-fw-error border-fw-error',
    'bg-fw-warnLight text-fw-warn border-fw-warn',
    'bg-fw-accent text-fw-cobalt-700 border-fw-active',
    'bg-fw-successLight text-fw-success border-fw-success',
    'bg-fw-neutral text-fw-body border-fw-secondary',
    'bg-fw-neutral text-fw-disabled border-fw-secondary',
  ];
  return (
    <span className={`px-2 py-0.5 text-figma-xs font-medium rounded-md border capitalize ${colors[idx] ?? colors[2]}`}>
      Max: {tier}
    </span>
  );
}

export function RoleCatalog() {
  const [selected, setSelected] = useState<RoleName>('NetworkEngineer');
  const role = ROLE_CATALOG[selected];
  const grouped = groupPermissions(role.permissions);

  return (
    <div className="flex gap-6 h-full">
      {/* Role list */}
      <div className="w-56 flex-shrink-0 space-y-1">
        <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide mb-3 px-2">
          Business Center Roles
        </p>
        {Object.values(ROLE_CATALOG).map(r => (
          <button
            key={r.name}
            onClick={() => setSelected(r.name)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-figma-sm transition-colors ${
              selected === r.name
                ? 'bg-fw-accent text-fw-cobalt-700 font-semibold'
                : 'text-fw-body hover:bg-fw-wash'
            }`}
          >
            {r.displayName}
          </button>
        ))}
      </div>

      {/* Role detail */}
      <div className="flex-1 min-w-0 space-y-5 overflow-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-figma-lg font-semibold text-fw-heading">{role.displayName}</h2>
            <p className="text-figma-sm text-fw-bodyLight mt-1">{role.description}</p>
          </div>
          <ScopeTierBadge tier={role.maxScopeTier} />
        </div>

        <div className="bg-fw-warnLight border border-fw-warn rounded-lg p-3">
          <p className="text-figma-xs text-fw-warn font-medium">
            This catalog is managed by AT&T Business Center. Role permissions cannot be modified here.
          </p>
        </div>

        <div>
          <h3 className="text-figma-sm font-semibold text-fw-heading mb-3">
            Permissions ({role.permissions.length})
          </h3>
          <div className="space-y-3">
            {Object.entries(grouped).sort().map(([obj, actions]) => (
              <div key={obj}>
                <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide mb-1.5">
                  {obj}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {actions.sort().map(action => (
                    <span
                      key={action}
                      className="px-2 py-0.5 text-figma-xs font-medium bg-fw-successLight text-fw-success rounded-md"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SoD constraints that involve this role */}
        {(() => {
          const relevant = SOD_CONSTRAINTS.filter(c =>
            c.mutuallyExclusiveRoles.includes(selected)
          );
          if (relevant.length === 0) return null;
          return (
            <div>
              <h3 className="text-figma-sm font-semibold text-fw-heading mb-2">SoD Constraints</h3>
              <div className="space-y-2">
                {relevant.map(c => {
                  const other = c.mutuallyExclusiveRoles.find(r => r !== selected)!;
                  return (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-fw-errorLight border border-fw-error rounded-lg">
                      <Shield className="h-4 w-4 text-fw-error flex-shrink-0" />
                      <p className="text-figma-xs text-fw-error">
                        Cannot be held with <strong>{ROLE_CATALOG[other]?.displayName ?? other}</strong> — {c.name} ({c.scopeContext})
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/configure/users/RoleCatalog.tsx
git commit -m "feat(rbac): add read-only RoleCatalog with permissions grouped by object and SoD callouts"
```

---

## Task 14: AssignmentManagement

**Files:**
- Create: `src/components/configure/users/AssignmentManagement.tsx`

Shows all RoleAssignments and DenyAssignments in one view. Tabs within the tab for Allow vs Deny. Actions: Revoke (allow), Lift (deny), Create New.

- [ ] **Step 1: Create the file**

```tsx
// src/components/configure/users/AssignmentManagement.tsx
import { useState } from 'react';
import { Plus, Shield, Trash2, ArrowUpRight } from 'lucide-react';
import { BaseTable } from '../../common/BaseTable';
import { OverflowMenu } from '../../common/OverflowMenu';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { Button } from '../../common/Button';
import { SideDrawer } from '../../common/SideDrawer';
import { useStore } from '../../../store/useStore';
import { RoleAssignment, DenyAssignment } from '../../../types/rbac';
import { ROLE_CATALOG } from '../../../data/roleCatalog';
import { AssignRoleDrawer } from './AssignRoleDrawer';
import { DenyAssignmentDrawer } from './DenyAssignmentDrawer';
import { UserType } from '../types';

type SubTab = 'allow' | 'deny';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-fw-successLight text-fw-success',
    expired: 'bg-fw-neutral text-fw-disabled',
    revoked: 'bg-fw-errorLight text-fw-error',
    'pending-approval': 'bg-fw-warnLight text-fw-warn',
    'exceeds-ceiling': 'bg-fw-errorLight text-fw-error',
    lifted: 'bg-fw-neutral text-fw-disabled',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-lg ${colors[status] ?? 'bg-fw-neutral text-fw-disabled'}`}>
      {status}
    </span>
  );
}

export function AssignmentManagement() {
  const { roleAssignments, denyAssignments, revokeRoleAssignment, liftDenyAssignment, currentUserId, users } = useStore(s => ({
    roleAssignments: s.roleAssignments,
    denyAssignments: s.denyAssignments,
    revokeRoleAssignment: s.revokeRoleAssignment,
    liftDenyAssignment: s.liftDenyAssignment,
    currentUserId: s.currentUserId,
    users: s.users,
  }));

  const [subTab, setSubTab] = useState<SubTab>('allow');
  const [search, setSearch] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [showDeny, setShowDeny] = useState(false);

  const filteredAllows = roleAssignments.filter(a =>
    a.principal.displayName.toLowerCase().includes(search.toLowerCase()) ||
    a.role.toLowerCase().includes(search.toLowerCase()) ||
    a.scope.raw.includes(search)
  );

  const filteredDenies = denyAssignments.filter(d =>
    d.principal.displayName.toLowerCase().includes(search.toLowerCase()) ||
    d.scope.raw.includes(search)
  );

  const allowColumns = [
    {
      id: 'principal',
      label: 'Principal',
      render: (a: RoleAssignment) => (
        <div>
          <div className="text-figma-sm font-semibold text-fw-heading">{a.principal.displayName}</div>
          <div className="text-figma-xs text-fw-bodyLight capitalize">{a.principal.type}</div>
        </div>
      ),
    },
    {
      id: 'role',
      label: 'Role',
      render: (a: RoleAssignment) => (
        <span className="text-figma-sm font-medium text-fw-heading">
          {ROLE_CATALOG[a.role]?.displayName ?? a.role}
        </span>
      ),
    },
    {
      id: 'scope',
      label: 'Scope',
      render: (a: RoleAssignment) => (
        <span className="text-figma-xs text-fw-bodyLight font-mono">{a.scope.raw}</span>
      ),
    },
    {
      id: 'expiry',
      label: 'Expires',
      render: (a: RoleAssignment) => {
        const days = Math.ceil((new Date(a.expiresAt).getTime() - Date.now()) / 86400000);
        return (
          <span className={`text-figma-xs font-medium ${days < 0 ? 'text-fw-error' : days <= 14 ? 'text-fw-warn' : 'text-fw-bodyLight'}`}>
            {days < 0 ? 'Expired' : `${days}d`}
          </span>
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      render: (a: RoleAssignment) => <StatusBadge status={a.status} />,
    },
    {
      id: 'justification',
      label: 'Justification',
      render: (a: RoleAssignment) => (
        <span className="text-figma-xs text-fw-bodyLight line-clamp-2">{a.justification}</span>
      ),
    },
  ];

  const denyColumns = [
    {
      id: 'principal',
      label: 'Principal',
      render: (d: DenyAssignment) => (
        <div>
          <div className="text-figma-sm font-semibold text-fw-heading">{d.principal.displayName}</div>
          <div className="text-figma-xs text-fw-bodyLight capitalize">{d.principal.type}</div>
        </div>
      ),
    },
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
    {
      id: 'scope',
      label: 'Scope',
      render: (d: DenyAssignment) => (
        <span className="text-figma-xs text-fw-bodyLight font-mono">{d.scope.raw}</span>
      ),
    },
    {
      id: 'approvedBy',
      label: 'Approved By',
      render: (d: DenyAssignment) => (
        <span className="text-figma-sm text-fw-body">{d.approvedBy}</span>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (d: DenyAssignment) => <StatusBadge status={d.status} />,
    },
  ];

  // User picker: shown before AssignRoleDrawer when launching from Assignments tab.
  // Users can be assigned from UserList (targetUser known) or here (pick first).
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [pickedUser, setPickedUser] = useState<UserType | null>(null);

  const handleAssignRoleClick = () => setShowUserPicker(true);
  const handleUserPicked = (u: UserType) => {
    setPickedUser(u);
    setShowUserPicker(false);
    setShowAssign(true);
  };

  return (
    <>
      {/* User picker modal */}
      <SideDrawer
        isOpen={showUserPicker}
        onClose={() => setShowUserPicker(false)}
        title="Select User to Assign Role"
        size="sm"
        footer={
          <Button variant="outline" onClick={() => setShowUserPicker(false)}>Cancel</Button>
        }
      >
        <div className="space-y-2">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => handleUserPicked(u)}
              className="w-full text-left px-4 py-3 border border-fw-secondary rounded-lg hover:bg-fw-accent hover:border-fw-active transition-colors"
            >
              <div className="text-figma-sm font-semibold text-fw-heading">{u.name}</div>
              <div className="text-figma-xs text-fw-bodyLight">{u.email}</div>
            </button>
          ))}
        </div>
      </SideDrawer>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['allow', 'deny'] as SubTab[]).map(t => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={`px-4 py-2 text-figma-sm font-medium rounded-lg transition-colors capitalize ${
                subTab === t
                  ? 'bg-fw-accent text-fw-cobalt-700'
                  : 'text-fw-bodyLight hover:bg-fw-wash'
              }`}
            >
              {t === 'allow' ? `Allow (${roleAssignments.length})` : `Deny (${denyAssignments.length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Shield} onClick={() => setShowDeny(true)}>
            Add Deny
          </Button>
          <Button variant="primary" icon={Plus} onClick={handleAssignRoleClick}>
            Assign Role
          </Button>
        </div>
      </div>

      {subTab === 'allow' ? (
        <BaseTable
          toolbar={
            <SearchFilterBar
              searchPlaceholder="Search by principal, role, or scope..."
              searchValue={search}
              onSearchChange={v => setSearch(v ?? '')}
            />
          }
          columns={allowColumns}
          data={filteredAllows}
          keyField="id"
          tableId="role-assignments"
          actions={(a: RoleAssignment) => (
            <OverflowMenu
              items={[
                {
                  id: 'revoke',
                  label: 'Revoke',
                  icon: <Trash2 className="h-4 w-4" />,
                  variant: 'danger' as const,
                  disabled: a.status !== 'active',
                  onClick: () => {
                    revokeRoleAssignment(a.id, currentUserId, 'Manually revoked via admin UI');
                    window.addToast({ type: 'info', title: 'Assignment Revoked', message: `${a.principal.displayName} — ${a.role}`, duration: 3000 });
                  },
                },
              ]}
            />
          )}
          emptyState={<div className="text-center py-8 text-figma-sm text-fw-bodyLight">No role assignments found</div>}
        />
      ) : (
        <BaseTable
          toolbar={
            <SearchFilterBar
              searchPlaceholder="Search by principal or scope..."
              searchValue={search}
              onSearchChange={v => setSearch(v ?? '')}
            />
          }
          columns={denyColumns}
          data={filteredDenies}
          keyField="id"
          tableId="deny-assignments"
          actions={(d: DenyAssignment) => (
            <OverflowMenu
              items={[
                {
                  id: 'lift',
                  label: 'Lift Deny',
                  icon: <ArrowUpRight className="h-4 w-4" />,
                  disabled: d.status !== 'active',
                  onClick: () => {
                    liftDenyAssignment(d.id, currentUserId, 'Manually lifted via admin UI');
                    window.addToast({ type: 'success', title: 'Deny Lifted', message: d.principal.displayName, duration: 3000 });
                  },
                },
              ]}
            />
          )}
          emptyState={<div className="text-center py-8 text-figma-sm text-fw-bodyLight">No deny assignments</div>}
        />
      )}

      {pickedUser && (
        <AssignRoleDrawer
          isOpen={showAssign}
          onClose={() => { setShowAssign(false); setPickedUser(null); }}
          targetUser={pickedUser}
        />
      )}
      <DenyAssignmentDrawer isOpen={showDeny} onClose={() => setShowDeny(false)} />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/configure/users/AssignmentManagement.tsx
git commit -m "feat(rbac): add AssignmentManagement with allow/deny sub-tabs, revoke, lift"
```

---

## Task 15: DenyAssignmentDrawer

**Files:**
- Create: `src/components/configure/users/DenyAssignmentDrawer.tsx`

Elevated action — always requires approver. Default expiry 48 hours for emergency lockouts.

- [ ] **Step 1: Create the file**

```tsx
// src/components/configure/users/DenyAssignmentDrawer.tsx
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { DenyAssignment, Permission, buildScopePath } from '../../../types/rbac';
import { ROLE_CATALOG } from '../../../data/roleCatalog';

interface DenyAssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  prefillUserId?: string;
  prefillUserName?: string;
}

// Default: +48 hours
function default48h(): string {
  const d = new Date();
  d.setHours(d.getHours() + 48);
  return d.toISOString().slice(0, 16);
}

// All available permissions for checkbox list
const ALL_PERMISSIONS: Permission[] = Object.values(ROLE_CATALOG).flatMap(r => r.permissions)
  .filter((p, i, arr) => arr.indexOf(p) === i)
  .sort();

export function DenyAssignmentDrawer({ isOpen, onClose, prefillUserId = '', prefillUserName = '' }: DenyAssignmentDrawerProps) {
  const { addDenyAssignment, currentUserId } = useStore(s => ({
    addDenyAssignment: s.addDenyAssignment,
    currentUserId: s.currentUserId,
  }));

  const [principalId, setPrincipalId] = useState(prefillUserId);
  const [principalName, setPrincipalName] = useState(prefillUserName);
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>([]);
  const [scopeRaw, setScopeRaw] = useState('/tenants/TNT-001');
  const [justification, setJustification] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [expiresAt, setExpiresAt] = useState(default48h());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [permFilter, setPermFilter] = useState('');

  const togglePerm = (p: Permission) => {
    setSelectedPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!principalId.trim()) e.principal = 'Principal ID is required';
    if (!principalName.trim()) e.principalName = 'Principal name is required';
    if (selectedPerms.length === 0) e.perms = 'Select at least one permission to deny';
    if (!justification.trim()) e.justification = 'Justification is required';
    if (justification.trim().length < 20) e.justification = 'At least 20 characters required';
    if (!approvedBy.trim()) e.approvedBy = 'Approver is required for deny assignments';
    if (!expiresAt) e.expiresAt = 'Expiry is required';
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const deny: DenyAssignment = {
      id: `da-${Date.now()}`,
      principal: { id: principalId.trim(), type: 'user', displayName: principalName.trim() },
      permissions: selectedPerms,
      scope: buildScopePath(scopeRaw),
      justification: justification.trim(),
      grantedBy: currentUserId,
      grantedAt: new Date().toISOString(),
      approvedBy: approvedBy.trim(),
      expiresAt: new Date(expiresAt).toISOString(),
      status: 'active',
    };

    addDenyAssignment(deny);
    window.addToast({ type: 'warning', title: 'Deny Assignment Created', message: `${selectedPerms.length} permission(s) denied for ${principalName}`, duration: 4000 });
    handleClose();
  };

  const handleClose = () => {
    setPrincipalId(prefillUserId); setPrincipalName(prefillUserName);
    setSelectedPerms([]); setScopeRaw('/tenants/TNT-001');
    setJustification(''); setApprovedBy(''); setExpiresAt(default48h());
    setErrors({}); setPermFilter('');
    onClose();
  };

  const filteredPerms = ALL_PERMISSIONS.filter(p => p.includes(permFilter.toLowerCase()));

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Deny Assignment"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            icon={AlertTriangle}
            onClick={handleSave}
            className="bg-fw-error hover:bg-fw-error/90 border-fw-error"
          >
            Create Deny
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="bg-fw-errorLight border border-fw-error rounded-lg p-3">
          <p className="text-figma-sm text-fw-error font-medium">
            Deny assignments override all role grants. This action requires an approver and will be logged to audit.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Principal ID <span className="text-fw-error">*</span></label>
            <input type="text" value={principalId} onChange={e => setPrincipalId(e.target.value)} placeholder="user-alice"
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base font-mono focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.principal ? 'border-fw-error' : 'border-fw-secondary'}`} />
            {errors.principal && <p className="mt-1 text-figma-xs text-fw-error">{errors.principal}</p>}
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Display Name <span className="text-fw-error">*</span></label>
            <input type="text" value={principalName} onChange={e => setPrincipalName(e.target.value)} placeholder="Alice Chen"
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.principalName ? 'border-fw-error' : 'border-fw-secondary'}`} />
            {errors.principalName && <p className="mt-1 text-figma-xs text-fw-error">{errors.principalName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Permissions to Deny <span className="text-fw-error">*</span>
            {selectedPerms.length > 0 && <span className="ml-2 text-fw-bodyLight font-normal">({selectedPerms.length} selected)</span>}
          </label>
          <input type="text" value={permFilter} onChange={e => setPermFilter(e.target.value)}
            placeholder="Filter permissions..."
            className="w-full mb-2 px-3 py-1.5 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active" />
          <div className="max-h-48 overflow-y-auto border border-fw-secondary rounded-lg divide-y divide-fw-secondary">
            {filteredPerms.map(p => (
              <label key={p} className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${selectedPerms.includes(p) ? 'bg-fw-errorLight' : 'hover:bg-fw-wash'}`}>
                <input type="checkbox" checked={selectedPerms.includes(p)} onChange={() => togglePerm(p)} className="text-fw-error" />
                <span className="text-figma-xs font-mono text-fw-body">{p}</span>
              </label>
            ))}
          </div>
          {errors.perms && <p className="mt-1 text-figma-xs text-fw-error">{errors.perms}</p>}
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Scope</label>
          <input type="text" value={scopeRaw} onChange={e => setScopeRaw(e.target.value)}
            className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base font-mono focus:outline-none focus:ring-2 focus:ring-fw-active" />
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Justification <span className="text-fw-error">*</span></label>
          <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3}
            placeholder="Security incident reference, ticket number, or business reason..."
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base resize-none focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.justification ? 'border-fw-error' : 'border-fw-secondary'}`} />
          {errors.justification && <p className="mt-1 text-figma-xs text-fw-error">{errors.justification}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Approved By <span className="text-fw-error">*</span></label>
            <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} placeholder="CSO or Security Admin user ID"
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.approvedBy ? 'border-fw-error' : 'border-fw-secondary'}`} />
            {errors.approvedBy && <p className="mt-1 text-figma-xs text-fw-error">{errors.approvedBy}</p>}
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Expires At <span className="text-fw-error">*</span></label>
            <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.expiresAt ? 'border-fw-error' : 'border-fw-secondary'}`} />
            <p className="mt-1 text-figma-xs text-fw-bodyLight">Default: 48h. Emergency lockouts should be short-lived.</p>
            {errors.expiresAt && <p className="mt-1 text-figma-xs text-fw-error">{errors.expiresAt}</p>}
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/configure/users/DenyAssignmentDrawer.tsx
git commit -m "feat(rbac): add DenyAssignmentDrawer — deny-first, required approver, 48h default"
```

---

## Task 16: AuditLog

**Files:**
- Create: `src/components/configure/users/AuditLog.tsx`

Real audit log from Zustand store. Filter by result (ALLOW/DENY), principal, action. Paginated (20 per page).

- [ ] **Step 1: Create the file**

```tsx
// src/components/configure/users/AuditLog.tsx
import { useState, useMemo } from 'react';
import { Activity } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { AuditLogEntry } from '../../../types/rbac';
import { SearchFilterBar } from '../../common/SearchFilterBar';

const PAGE_SIZE = 20;

function ResultBadge({ result }: { result: 'ALLOW' | 'DENY' }) {
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-lg ${
      result === 'ALLOW' ? 'bg-fw-successLight text-fw-success' : 'bg-fw-errorLight text-fw-error'
    }`}>
      {result}
    </span>
  );
}

export function AuditLog() {
  const auditLog = useStore(s => s.auditLog);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'ALLOW' | 'DENY'>('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return auditLog.filter(e => {
      const matchesSearch =
        e.principalName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.objectType.toLowerCase().includes(q) ||
        (e.objectName ?? '').toLowerCase().includes(q);
      const matchesResult = resultFilter === 'all' || e.result === resultFilter;
      return matchesSearch && matchesResult;
    });
  }, [auditLog, search, resultFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSearch = (v: string | undefined) => {
    setSearch(v ?? '');
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchFilterBar
          searchPlaceholder="Search by principal, action, or object..."
          searchValue={search}
          onSearchChange={handleSearch}
        />
        <div className="flex gap-1 ml-4">
          {(['all', 'ALLOW', 'DENY'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setResultFilter(f); setPage(0); }}
              className={`px-3 py-1.5 text-figma-xs font-medium rounded-lg transition-colors ${
                resultFilter === f
                  ? f === 'ALLOW' ? 'bg-fw-successLight text-fw-success'
                  : f === 'DENY' ? 'bg-fw-errorLight text-fw-error'
                  : 'bg-fw-accent text-fw-cobalt-700'
                  : 'text-fw-bodyLight hover:bg-fw-wash'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {paged.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="h-10 w-10 text-fw-disabled mx-auto mb-3" />
          <p className="text-figma-sm text-fw-bodyLight">No audit log entries found</p>
        </div>
      ) : (
        <div className="border border-fw-secondary rounded-xl overflow-hidden">
          <table className="w-full text-figma-sm">
            <thead className="bg-fw-wash border-b border-fw-secondary">
              <tr>
                {['Timestamp', 'Principal', 'Action', 'Object', 'Scope', 'Result'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-fw-secondary">
              {paged.map((e: AuditLogEntry) => (
                <tr key={e.id} className="hover:bg-fw-wash transition-colors">
                  <td className="px-4 py-3 text-figma-xs text-fw-bodyLight whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 font-medium text-fw-heading">{e.principalName}</td>
                  <td className="px-4 py-3 text-fw-body font-mono text-figma-xs">{e.action}</td>
                  <td className="px-4 py-3 text-fw-body">
                    <div>{e.objectType}</div>
                    {e.objectName && <div className="text-figma-xs text-fw-bodyLight">{e.objectName}</div>}
                  </td>
                  <td className="px-4 py-3 text-figma-xs text-fw-bodyLight font-mono">{e.scope.raw}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <ResultBadge result={e.result} />
                      {e.denyReason && <span className="text-figma-xs text-fw-bodyLight">{e.denyReason}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-figma-xs text-fw-bodyLight">
            {filtered.length} entries — page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-figma-xs border border-fw-secondary rounded-lg disabled:opacity-40 hover:bg-fw-wash">
              Previous
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-figma-xs border border-fw-secondary rounded-lg disabled:opacity-40 hover:bg-fw-wash">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/configure/users/AuditLog.tsx
git commit -m "feat(rbac): add AuditLog with ALLOW/DENY filter, search, pagination"
```

---

## Task 17: Wiring and Cleanup

**Files:**
- Modify: `src/store/useStore.ts`
- Delete: `src/components/configure/users/ConnectionAccessDrawer.tsx`
- Delete: `src/components/configure/users/ConnectionAccessModal.tsx`
- Delete: `src/components/configure/users/AddUserDrawer.tsx`
- Delete: `src/components/configure/users/AddUserModal.tsx`
- Delete: `src/components/configure/users/RoleManagement.tsx` (replaced by RoleCatalog.tsx)
- Delete: `src/components/configure/users/UserActivity.tsx` (replaced by AuditLog.tsx)
- Modify: `src/types/permissions.ts` → add deprecation comment only (keep all exports)
- Modify: `src/types/roleAssignment.ts` → stub to re-export from rbac.ts

- [ ] **Step 1: Check for remaining imports of deleted files**

```bash
grep -rn "ConnectionAccessDrawer\|ConnectionAccessModal\|AddUserDrawer\|AddUserModal\|UserActivity\|RoleManagement" \
  /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src \
  --include="*.tsx" --include="*.ts"
```

Expected output after Tasks 5 and 6 complete:
- No hits — Task 5 rewrites `UserManagement.tsx` (removes `RoleManagement`, `UserActivity` imports), Task 6 rewrites `UserList.tsx` (removes `ConnectionAccessDrawer`, `AddUserDrawer` imports).

If you see any hits, update those files to use the new components before proceeding.

- [ ] **Step 2: Audit permissionChecker consumers — DO NOT TOUCH these in this plan**

Run the grep to confirm these files exist as expected:

```bash
grep -rln "permissionChecker\|from.*types/permissions\|from.*types/roleAssignment\|ROLE_PERMISSIONS\|PERMISSION_LABELS" \
  /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src \
  --include="*.tsx" --include="*.ts"
```

Expected output includes these files. They use the OLD `permissionChecker` API (`hasPermission`, `getDefaultScope`, `getMaxScope`, `getPermissionColor`, `getRoleDisplayName`) which has a completely different signature from `permissionResolver.can()`. Replacing them is a separate migration outside this plan's scope.

**Leave these files untouched:**
- `src/components/configure/BillingConfiguration.tsx`
- `src/components/configure/system/SystemSettings.tsx`
- `src/components/common/RBACDemoPanel.tsx`
- `src/components/common/PermissionBadge.tsx`
- `src/components/common/PermissionRequestModal.tsx`
- `src/components/common/RoleCapabilityMatrix.tsx`
- `src/components/common/RoleGate.tsx`
- `src/components/profile/UserProfile.tsx`
- `src/hooks/usePermission.ts`
- `src/utils/permissionChecker.ts` (keep — consumers depend on it)
- `src/utils/scopeAwarePermissionChecker.ts` (keep — permissionChecker.ts re-exports from here)

`src/components/configure/users/UserList.tsx` is rebuilt in Task 6 and removes the permissionChecker import there — that's the only Users-section file that needs it removed.

`src/components/configure/users/RoleManagement.tsx` is replaced by `RoleCatalog.tsx` in Task 13, so its imports are deleted with it.

- [ ] **Step 3: Stub `types/roleAssignment.ts` only — leave `types/permissions.ts` intact**

`src/types/permissions.ts` exports `PermissionRequirement`, `ResourceType`, `RESOURCE_LABELS`, `ROLE_DEFAULT_FILTER`, `ROLE_MAX_FILTER` which are still used by the untouched consumers above. Do NOT simplify it — add only a deprecation comment at the top.

```bash
# Add deprecation comment to permissions.ts (don't touch anything else)
head -1 /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/types/permissions.ts
```

If line 1 is already the ScopePath import (not a deprecation comment), insert the comment:

Open `src/types/permissions.ts` and add this as the very first line:
```typescript
// @deprecated — this file predates the Action+Object+Scope RBAC system. New code uses src/types/rbac.ts. Migrate consumers before deleting.
```

Then stub `types/roleAssignment.ts` — it only exported a `RoleAssignment` type that is now defined in `types/rbac.ts`:

```typescript
// src/types/roleAssignment.ts
// @deprecated — replaced by src/types/rbac.ts
// This file is kept only to avoid breaking imports during migration.
// Replace all `from '../types/roleAssignment'` with `from '../types/rbac'` then delete.
export type { RoleAssignment } from './rbac';
```

- [ ] **Step 4: Delete files no longer needed**

Files confirmed safe to delete (nothing imports them after Tasks 5 and 6 rewrite `UserManagement.tsx` and `UserList.tsx`):

```bash
rm /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/components/configure/users/ConnectionAccessDrawer.tsx
rm /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/components/configure/users/ConnectionAccessModal.tsx
rm /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/components/configure/users/AddUserDrawer.tsx
rm /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/components/configure/users/AddUserModal.tsx
```

`RoleManagement.tsx` is replaced by `RoleCatalog.tsx` (Task 13). It was imported only by `UserManagement.tsx` which Task 5 rewrites. Delete it:
```bash
rm /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/components/configure/users/RoleManagement.tsx
```

`UserActivity.tsx` is replaced by `AuditLog.tsx` (Task 16). Verify nothing else imports it, then delete:
```bash
grep -rn "import.*UserActivity" /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src
# Expected: no output (only UserManagement.tsx imported it, and Task 5 removes that)
rm /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci/src/components/configure/users/UserActivity.tsx
```

- [ ] **Step 5: Full TypeScript check**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -v "lazyComponents"
```

Expected: No output. The only pre-existing error (`lazyComponents.ts`) is filtered. If you see any other file listed, fix it before proceeding.

- [ ] **Step 6: Run all RBAC tests**

```bash
npx vitest run src/types/rbac.test.ts src/utils/permissionResolver.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Run dev server and verify**

```bash
npm run dev
```

Open `http://localhost:5173`. Navigate to Configure > Users. Verify:
1. VerticalTabGroup renders on the left with People (Users, Groups), Access (Roles, Assignments), Audit (Activity) category headings
2. Clicking a tab updates the URL to `?tab=<id>` — reloading the page restores the same tab
3. Users tab shows users with role badges pulled from Zustand assignments
3. Roles tab shows read-only catalog, clicking a role shows its permissions
4. Assignments tab shows allow/deny sub-tabs with mock data
5. Activity tab shows the 3 mock audit entries
6. "Invite User" opens drawer — no role field
7. Overflow menu → "Assign Role" opens AssignRoleDrawer with role picker, justification, expiry
8. "Add Deny" in Assignments tab opens DenyAssignmentDrawer — approver field is required
9. Groups tab shows 2 mock groups; clicking detail opens GroupDetailDrawer

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(rbac): wire all RBAC components, remove deprecated files, full TypeScript clean"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Action+Object+Scope permission type — Task 1
- [x] 11 BC roles with permission mappings — Task 2
- [x] Deny-first 5-step resolver with group + dimension support — Task 3
- [x] Mock data seeding Zustand — Task 4
- [x] 5-tab UserManagement with VerticalTabGroup + useSearchParams URL sync — Task 5
- [x] UserList with live assignments, expiry warnings, SoD indicators — Task 6
- [x] InviteUserDrawer (identity only) — Task 7
- [x] AssignRoleDrawer with SoD check, justification, expiry — Task 8
- [x] EffectivePermissionsModal — Task 9
- [x] GroupManagement tab — Task 10
- [x] CreateGroupDrawer with purpose, ceiling, ownerless policy — Task 11
- [x] GroupDetailDrawer with members and group assignments — Task 12
- [x] RoleCatalog (read-only) — Task 13
- [x] AssignmentManagement with allow/deny sub-tabs — Task 14
- [x] DenyAssignmentDrawer with required approver — Task 15
- [x] AuditLog with filter and pagination — Task 16
- [x] Wiring, cleanup, TypeScript clean, browser verification — Task 17

**Gaps confirmed absent:**
- Reseller scope tier: present in `buildScopePath` and `ScopePath` type. No UI for reseller management — correct, not in scope for this release.
- FedGov: no runtime flag added — correct design decision (separate deployment).
- Dimension-based filtering UI (timeWindow, classification): resolver supports it; UI does not expose it yet — acceptable v1 scope.
