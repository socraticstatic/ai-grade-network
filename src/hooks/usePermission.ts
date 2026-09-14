import { useStore } from '../store/useStore';
import { Permission, ROLE_PERMISSIONS } from '../types/permissions';
import { Permission as RbacPermission } from '../types/rbac';
import { ROLE_CATALOG } from '../data/roleCatalog';

/**
 * Returns true if the current role has the given permission.
 * Usage: const canCreate = usePermission('create');
 */
export function usePermission(permission: Permission): boolean {
  const currentRole = useStore(state => state.currentRole);
  const perms = ROLE_PERMISSIONS[currentRole] || [];
  return perms.includes(permission);
}

/**
 * Returns the active persona's real rbac permissions from ROLE_CATALOG.
 * Used by demo-facing components. Does NOT affect gate checks.
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

/**
 * Returns an object with all permission checks at once.
 * Usage: const { canCreate, canDelete, canManageTenants } = usePermissions();
 */
export function usePermissions() {
  const currentRole = useStore(state => state.currentRole);
  const perms = ROLE_PERMISSIONS[currentRole] || [];
  return {
    canView: perms.includes('view'),
    canCreate: perms.includes('create'),
    canEdit: perms.includes('edit'),
    canDelete: perms.includes('delete'),
    canManageUsers: perms.includes('manage_users'),
    canManageBilling: perms.includes('manage_billing'),
    canManageSystem: perms.includes('manage_system'),
    canManageTenants: perms.includes('manage_tenants'),
    canImpersonate: perms.includes('impersonate'),
    canViewAudit: perms.includes('view_audit'),
    canManageSecurity: perms.includes('manage_security'),
  };
}
