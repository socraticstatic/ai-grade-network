// Runtime consistency checker — used in tests and can be run in dev.
import { Permission } from '../types/rbac';
import { TIER_PERMISSION_GROUPS, TIER_RANK } from '../data/tierPermissions';
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

  // 1b. Every permission in any tier group must also be in ALL_PERMISSIONS.
  const allPermsSet = new Set(ALL_PERMISSIONS);
  for (const p of tieredPerms) {
    if (!allPermsSet.has(p)) {
      errors.push(`Permission '${p}' in TIER_PERMISSION_GROUPS is not in ALL_PERMISSIONS`);
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
