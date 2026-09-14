# Proper RBAC Implementation with Hierarchical Scope

## Overview

This document describes the **correct** RBAC (Role-Based Access Control) implementation following industry standards from Azure RBAC, AWS IAM, and Kubernetes RBAC.

---

## Key Concepts

### 1. **Scope** (WHERE permissions apply)

**Scope is a hierarchical path in the resource tree**, not a permission level.

```
/platform
├── /tenants/acme-corp
│   ├── /tenants/acme-corp/departments/engineering
│   │   └── /tenants/acme-corp/departments/engineering/pools/production
│   └── /tenants/acme-corp/departments/sales
└── /tenants/other-corp
    └── /tenants/other-corp/departments/marketing
```

**Scope determines:** At what level in the hierarchy does a role assignment apply?

**Examples:**
- Assignment at `/tenants/acme-corp` → Applies to all resources under acme-corp
- Assignment at `/tenants/acme-corp/departments/engineering` → Only applies to engineering dept resources
- Assignment at `/tenants/acme-corp/departments/engineering/pools/production` → Only production pool

**Key Property:** Child scopes inherit permissions from parent scopes.

---

### 2. **Role** (WHAT permissions)

A role is a **collection of permissions**.

**Roles:**
- `user` - Basic read-only access
- `admin` - Full CRUD + manage users + manage billing
- `super-admin` - Platform-wide access including cross-tenant

**Permissions:**
- `view` - Read resources
- `create` - Create new resources
- `edit` - Modify existing resources
- `delete` - Remove resources
- `manage_users` - User management
- `manage_billing` - Billing operations
- `manage_system` - System configuration
- `manage_tenants` - Tenant management (super-admin only)
- `impersonate` - Impersonate users (super-admin only)
- `view_audit` - View audit logs
- `manage_security` - Security settings

---

### 3. **Resource Filter** (WHICH resources)

Resource filters **narrow down which resources** can be accessed **within a scope**.

**Not to be confused with scope!** This is what we incorrectly called "scope" before.

**Resource Filters:**
- `owned-by-me` - Only resources I own/created
- `my-department` - Resources in my department(s)
- `my-pools` - Resources in my assigned pool(s)
- `my-tenant` - All resources in my tenant
- `all-tenants` - Resources across all tenants (platform-wide)

**Filter Hierarchy:**
```
owned-by-me < my-department < my-pools < my-tenant < all-tenants
```

**Example:**
- Scope: `/tenants/acme-corp/departments/engineering`
- Role: `admin` (has view, create, edit, delete)
- Filter: `my-pools`
- Result: User can perform admin actions on engineering dept resources, but only those in pools they're assigned to

---

## Role Assignment Model

```typescript
{
  principal: "user-123",           // WHO
  role: "admin",                   // WHAT permissions
  scope: "/tenants/acme/depts/eng", // WHERE
  conditions: {
    resourceFilter: "my-pools"     // WHICH resources
  }
}
```

**This grants:**
- User `user-123`
- Admin permissions (`view`, `create`, `edit`, `delete`, `manage_users`, `manage_billing`)
- At engineering department scope and all child scopes
- But only for resources in pools they're assigned to

---

## Permission Checking Algorithm

```typescript
function hasPermission(userId, permission, targetScope):
  1. Get all active role assignments for user
  2. Filter to assignments whose scope covers targetScope
      - Assignment scope must be parent of or equal to targetScope
      - Example: Assignment at /tenants/acme covers /tenants/acme/depts/eng
  3. For each applicable assignment:
      a. Check if assignment's role has the required permission
      b. Apply resource filter (if any)
      c. Check additional conditions (MFA, approval, etc.)
  4. Return first matching assignment or deny
```

**Example Scenarios:**

### Scenario 1: Department Admin
```typescript
Assignment: {
  user: "jane@acme.com",
  role: "admin",
  scope: "/tenants/acme-corp/departments/engineering"
}

Query: Can jane@acme.com edit connection-123 at /tenants/acme-corp/departments/engineering/pools/prod/connections/connection-123?

Check:
1. Assignment scope /tenants/acme-corp/departments/engineering IS parent of target
2. Role 'admin' HAS permission 'edit'
3. No resource filter applied
Result: ✅ ALLOWED
```

### Scenario 2: User with Pool Filter
```typescript
Assignment: {
  user: "bob@acme.com",
  role: "user",
  scope: "/tenants/acme-corp",
  conditions: {
    resourceFilter: "my-pools",
    poolIds: ["pool-123"]
  }
}

Query: Can bob@acme.com view connection-456 in pool-789?

Check:
1. Assignment scope /tenants/acme-corp IS parent of target
2. Role 'user' HAS permission 'view'
3. Resource filter 'my-pools' limits to pool-123
4. Connection is in pool-789, not pool-123
Result: ❌ DENIED (resource filter)
```

### Scenario 3: Cross-Tenant Super Admin
```typescript
Assignment: {
  user: "admin@platform.com",
  role: "super-admin",
  scope: "/platform"
}

Query: Can admin@platform.com delete any resource anywhere?

Check:
1. Assignment scope /platform IS parent of ALL targets
2. Role 'super-admin' HAS ALL permissions
3. No filters
Result: ✅ ALLOWED (platform-wide access)
```

---

## Database Schema

### `scope_nodes` Table

Stores the resource hierarchy.

```sql
CREATE TABLE scope_nodes (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL, -- 'platform', 'tenant', 'department', 'pool', 'resource'
  path TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  parent_path TEXT REFERENCES scope_nodes(path),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example Data:**
```sql
INSERT INTO scope_nodes (type, path, name, parent_path) VALUES
('platform', '/platform', 'Platform', NULL),
('tenant', '/tenants/acme-corp', 'ACME Corp', '/platform'),
('department', '/tenants/acme-corp/departments/engineering', 'Engineering', '/tenants/acme-corp');
```

### `role_assignments` Table

Stores who has what role at which scope.

```sql
CREATE TABLE role_assignments (
  id UUID PRIMARY KEY,
  principal_id UUID NOT NULL,
  principal_type TEXT NOT NULL, -- 'user', 'group', 'service'
  role TEXT NOT NULL,
  scope_path TEXT NOT NULL REFERENCES scope_nodes(path),
  conditions JSONB DEFAULT '{}',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
);
```

**Example Data:**
```sql
INSERT INTO role_assignments (principal_id, principal_type, role, scope_path, conditions) VALUES
('user-123', 'user', 'admin', '/tenants/acme-corp/departments/engineering', '{}'),
('user-456', 'user', 'user', '/tenants/acme-corp', '{"resourceFilter": "my-pools", "poolIds": ["pool-123"]}');
```

### `resource_ownership` Table

Tracks which resources belong where and to whom.

```sql
CREATE TABLE resource_ownership (
  id UUID PRIMARY KEY,
  resource_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  owner_id UUID NOT NULL,
  scope_path TEXT NOT NULL REFERENCES scope_nodes(path),
  tenant_id UUID NOT NULL,
  department_id UUID,
  pool_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## TypeScript Implementation

### Types

```typescript
// Scope path in hierarchy
type ScopePath = string; // e.g., "/tenants/acme-corp/departments/eng"

// Resource filter (what we incorrectly called scope before)
type ResourceFilter =
  | 'owned-by-me'
  | 'my-department'
  | 'my-pools'
  | 'my-tenant'
  | 'all-tenants';

// Role assignment
interface RoleAssignment {
  id: string;
  principalId: string;
  principalType: 'user' | 'group' | 'service';
  role: Role;
  scope: ScopePath;
  conditions?: {
    resourceFilter?: ResourceFilter;
    requiresMFA?: boolean;
    poolIds?: string[];
    departmentIds?: string[];
  };
  status: 'active' | 'expired' | 'revoked';
}
```

### Permission Checker

```typescript
class ScopeAwarePermissionChecker {
  hasPermission(
    userId: string,
    requirement: {
      permission: Permission;
      atScope?: ScopePath;
      resourceFilter?: ResourceFilter;
    }
  ): PermissionCheck {
    // 1. Get user's role assignments
    const assignments = this.getUserAssignments(userId);

    // 2. Find assignments covering target scope
    const applicable = assignments.filter(a =>
      ScopePathBuilder.isParentOf(a.scope, requirement.atScope)
    );

    // 3. Check each assignment
    for (const assignment of applicable) {
      if (assignment.role.includes(requirement.permission)) {
        // Apply filters
        if (passesFilters(assignment, requirement)) {
          return { allowed: true };
        }
      }
    }

    return { allowed: false };
  }
}
```

---

## UI Components

### Display Scope Path

```tsx
// Show where a role assignment applies
<div>
  <label>Assignment Scope:</label>
  <ScopePathBreadcrumb path="/tenants/acme-corp/departments/engineering" />
</div>

// Renders: Platform → ACME Corp → Engineering
```

### Display Resource Filter

```tsx
// Show which resources are accessible
<ResourceFilterBadge filter="my-pools" showIcon variant="detailed" />

// Renders: 🗂️ Pool Resources
// Tooltip: "Can access resources in your assigned pool(s)"
```

### Role Assignment Summary

```tsx
<RoleAssignmentCard assignment={assignment}>
  <div>User: {assignment.principalName}</div>
  <div>Role: {assignment.role}</div>
  <div>Scope: {assignment.scope}</div>
  <div>Filter: {assignment.conditions?.resourceFilter || 'None'}</div>
  <div>Permissions: {getPermissions(assignment.role).join(', ')}</div>
</RoleAssignmentCard>
```

---

## Migration from Old "Scope" Concept

### What Changed

**Before (INCORRECT):**
- "Scope" meant: `own`, `department`, `pool`, `tenant`, `platform`
- This was actually a **resource filter**, not a scope
- No hierarchical structure
- Confused permission breadth with resource location

**After (CORRECT):**
- **Scope** = Hierarchical path (WHERE): `/tenants/acme/depts/eng`
- **Resource Filter** = Which resources (WHICH): `my-pools`, `owned-by-me`, etc.
- Clear separation of concerns
- Follows industry standards

### Mapping Old Values

```typescript
const OLD_TO_NEW = {
  // Old "scope" → New resource filter
  'own': 'owned-by-me',
  'department': 'my-department',
  'pool': 'my-pools',
  'tenant': 'my-tenant',
  'platform': 'all-tenants'
};
```

### Backward Compatibility

The old `permissionChecker` API still works for simple role-based checks:

```typescript
// Still works
permissionChecker.hasPermission('admin', { permission: 'view' });

// But new scope-aware API is preferred
scopeAwarePermissionChecker.hasPermission('user-123', {
  permission: 'view',
  atScope: '/tenants/acme-corp/departments/engineering'
});
```

---

## Best Practices

### 1. **Principle of Least Privilege**

Assign roles at the **narrowest scope** possible.

❌ Bad:
```typescript
{ role: 'admin', scope: '/platform' } // Too broad!
```

✅ Good:
```typescript
{ role: 'admin', scope: '/tenants/acme-corp/departments/engineering' }
```

### 2. **Use Resource Filters to Further Limit**

Even within a scope, apply filters when appropriate.

✅ Example:
```typescript
{
  role: 'user',
  scope: '/tenants/acme-corp',
  conditions: {
    resourceFilter: 'my-pools',
    poolIds: ['pool-123', 'pool-456']
  }
}
```

### 3. **Scope Inheritance**

Remember: Assignments at parent scopes apply to all children.

```typescript
// Assignment at /tenants/acme-corp
// ✅ Can access /tenants/acme-corp/departments/engineering/pools/prod/connections/conn-123
// ✅ Can access /tenants/acme-corp/departments/sales/connections/conn-456
// ❌ Cannot access /tenants/other-corp/... (different tenant)
```

### 4. **Separate Admin and User Roles**

Don't give everyone admin at `/platform`.

✅ Structure:
```
Super Admin     → /platform (rare, only platform team)
Tenant Admins   → /tenants/specific-tenant
Dept Admins     → /tenants/tenant/departments/specific-dept
Regular Users   → /tenants/tenant (with resourceFilter: 'owned-by-me')
```

### 5. **Time-Bound Assignments**

Use `expires_at` for temporary elevated access.

```typescript
{
  role: 'admin',
  scope: '/tenants/acme-corp/departments/ops',
  expiresAt: new Date('2024-12-31T23:59:59Z')
}
```

---

## Common Patterns

### Pattern 1: Department Admin

**Use Case:** User manages all resources in their department.

```typescript
{
  principalId: 'user-123',
  role: 'admin',
  scope: '/tenants/acme-corp/departments/engineering',
  conditions: {} // No filter, full department access
}
```

### Pattern 2: Pool Manager

**Use Case:** User manages specific pools only.

```typescript
{
  principalId: 'user-456',
  role: 'admin',
  scope: '/tenants/acme-corp/departments/ops/pools/production',
  conditions: {} // Scope limits to pool, no filter needed
}
```

### Pattern 3: Cross-Department Viewer

**Use Case:** User can view resources across entire tenant.

```typescript
{
  principalId: 'user-789',
  role: 'user',
  scope: '/tenants/acme-corp',
  conditions: {
    resourceFilter: 'my-tenant' // See all, but read-only
  }
}
```

### Pattern 4: Own Resources Only

**Use Case:** User only sees what they created.

```typescript
{
  principalId: 'user-999',
  role: 'user',
  scope: '/tenants/acme-corp',
  conditions: {
    resourceFilter: 'owned-by-me'
  }
}
```

---

## Testing Scope-Based Permissions

```typescript
describe('Scope-based permission checking', () => {
  it('allows access when assignment scope covers target', () => {
    const assignment = {
      principalId: 'user-123',
      role: 'admin',
      scope: '/tenants/acme-corp'
    };

    const check = permissionChecker.hasPermission('user-123', {
      permission: 'view',
      atScope: '/tenants/acme-corp/departments/engineering'
    });

    expect(check.allowed).toBe(true);
  });

  it('denies access when assignment scope does not cover target', () => {
    const assignment = {
      principalId: 'user-123',
      role: 'admin',
      scope: '/tenants/acme-corp/departments/engineering'
    };

    const check = permissionChecker.hasPermission('user-123', {
      permission: 'view',
      atScope: '/tenants/acme-corp/departments/sales' // Different dept
    });

    expect(check.allowed).toBe(false);
  });
});
```

---

## Glossary

| Term | Definition | Example |
|------|------------|---------|
| **Scope** | Hierarchical location in resource tree | `/tenants/acme-corp/departments/engineering` |
| **Scope Path** | String representation of scope | Same as above |
| **Role** | Collection of permissions | `admin`, `user`, `super-admin` |
| **Permission** | Specific action | `view`, `create`, `edit`, `delete` |
| **Principal** | Entity receiving permissions | User, group, or service account |
| **Role Assignment** | Grants role to principal at scope | `user-123` has `admin` at `/tenants/acme` |
| **Resource Filter** | Limits which resources in scope | `my-pools`, `owned-by-me` |
| **Scope Inheritance** | Children inherit parent permissions | Assignment at `/tenants/acme` applies to `/tenants/acme/depts/eng` |

---

## References

- [Azure RBAC Scope Overview](https://learn.microsoft.com/en-us/azure/role-based-access-control/scope-overview)
- [AWS IAM Policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

---

## Summary

**The correct RBAC model:**
```
Principal + Role → Assigned at Scope (hierarchical path) → Permissions apply to scope and children → Optional resource filters narrow access
```

**Key takeaway:** Scope is WHERE (hierarchical location), not WHICH (resource filtering). This distinction is fundamental to proper RBAC implementation.
