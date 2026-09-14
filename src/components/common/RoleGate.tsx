import { ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';
import { Permission } from '../../types/permissions';

interface RoleGateProps {
  /** Permission required to show children */
  requires: Permission;
  /** Content shown when permission is granted */
  children: ReactNode;
  /** Optional fallback when permission is denied */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the current role's permissions.
 * Usage: <RoleGate requires="manage_tenants">...</RoleGate>
 */
export function RoleGate({ requires, children, fallback = null }: RoleGateProps) {
  const hasPermission = usePermission(requires);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
