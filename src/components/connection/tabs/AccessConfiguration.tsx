// src/components/connection/tabs/AccessConfiguration.tsx
// Shows which principals have access to this connection and WHY —
// demonstrating the scope cascade: a tenant-wide assignment grants
// access here just as much as a connection-specific one.

import { useMemo } from 'react';
import { Shield, Users, ArrowRight } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { ROLE_CATALOG } from '../../../data/roleCatalog';
import { SCOPE_CATALOG } from '../../../data/scopeCatalog';
import {
  scopeContains,
  CONNECTION_SCOPE,
  buildScopePath,
  Permission,
} from '../../../types/rbac';

interface AccessConfigurationProps {
  connectionId?: string;
}

// Permissions relevant at connection scope — what a demo viewer cares about
const CONNECTION_PERMS: Permission[] = [
  'connection:read', 'connection:write', 'connection:delete',
  'connection:operate', 'connection:bandwidth', 'connection:configure', 'connection:export',
];

// Human label for a scope path (for the "granted via" column)
function scopeLabel(raw: string): string {
  if (raw === '/') return 'Platform-wide';
  if (/\/tenants\/[^/]+$/.test(raw)) return 'Tenant-wide';
  if (/\/clients\/[^/]+$/.test(raw)) {
    const clientId = raw.split('/clients/')[1]?.split('/')[0];
    const client = SCOPE_CATALOG.client.find(c => c.id === clientId);
    return client ? `Client — ${client.displayName}` : 'Client-wide';
  }
  if (/\/pools\/[^/]+$/.test(raw)) {
    const poolId = raw.split('/pools/')[1]?.split('/')[0];
    const pool = SCOPE_CATALOG.pool.find(p => p.id === poolId);
    return pool ? `Pool — ${pool.displayName}` : 'Pool-wide';
  }
  if (/\/connections\/[^/]+$/.test(raw)) return 'This connection';
  return raw;
}

// Badge color by how broad the grant is
function scopeBadgeClass(raw: string): string {
  if (/\/tenants\/[^/]+$/.test(raw) || raw === '/')
    return 'bg-fw-warningLight text-fw-warning border-fw-warning/30';
  if (/\/clients\/[^/]+$/.test(raw))
    return 'bg-fw-accent text-fw-cobalt-700 border-fw-cobalt-200';
  if (/\/pools\/[^/]+$/.test(raw))
    return 'bg-fw-successLight text-fw-success border-fw-success/30';
  return 'bg-fw-neutral text-fw-heading border-fw-secondary';
}

// Short action label for a permission
function permLabel(p: Permission): string {
  return p.split(':')[1] ?? p;
}

export function AccessConfiguration({ connectionId }: AccessConfigurationProps) {
  const roleAssignments = useStore(s => s.roleAssignments);
  const roleDefinitions = useStore(s => s.roleDefinitions);

  // Resolve the scope path for this connection
  const connectionScope = useMemo(() => {
    if (!connectionId) return null;
    const conn = SCOPE_CATALOG.connection.find(c => c.id === connectionId);
    if (!conn) return null;
    return CONNECTION_SCOPE('TNT-001', conn.clientId, conn.poolId, conn.id);
  }, [connectionId]);

  // All active assignments whose scope contains (or equals) this connection's scope
  const effectiveAssignments = useMemo(() => {
    if (!connectionScope) return [];

    return roleAssignments
      .filter(a => {
        if (a.status !== 'active') return false;
        const assignmentScope = buildScopePath(a.scope.raw);
        return scopeContains(assignmentScope, connectionScope);
      })
      .map(a => {
        // Prefer store role definition (may have been edited) over catalog
        const roleDef =
          roleDefinitions.find(r => r.id === a.role) ??
          ROLE_CATALOG[a.role as keyof typeof ROLE_CATALOG];

        const connectionPerms = (roleDef?.permissions ?? []).filter(
          p => CONNECTION_PERMS.includes(p),
        );

        return {
          assignment: a,
          roleDef,
          connectionPerms,
          isDirectScope: a.scope.raw === connectionScope.raw,
        };
      })
      // Only show principals that actually have at least one connection permission
      .filter(r => r.connectionPerms.length > 0)
      // Sort: broader scopes first, then by principal name
      .sort((a, b) => {
        const depthA = a.assignment.scope.segments.length;
        const depthB = b.assignment.scope.segments.length;
        if (depthA !== depthB) return depthA - depthB;
        return (a.assignment.principal.displayName ?? '').localeCompare(
          b.assignment.principal.displayName ?? '',
        );
      });
  }, [connectionScope, roleAssignments, roleDefinitions]);

  if (!connectionId || !connectionScope) {
    return (
      <div className="p-8 text-center text-fw-bodyLight text-figma-sm">
        No connection selected.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header explainer */}
      <div className="bg-fw-wash border border-fw-secondary rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-4 w-4 text-fw-cobalt-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-figma-sm font-semibold text-fw-heading mb-0.5">
              Effective access — scope cascade
            </p>
            <p className="text-figma-xs text-fw-bodyLight">
              Assignments at broader scopes (tenant, client, pool) cascade down and grant
              access here. "Granted via" shows where the assignment actually lives.
            </p>
          </div>
        </div>
      </div>

      {/* Access table */}
      {effectiveAssignments.length === 0 ? (
        <div className="p-8 text-center">
          <Users className="h-8 w-8 text-fw-disabled mx-auto mb-2" />
          <p className="text-figma-sm text-fw-bodyLight">No active access to this connection.</p>
        </div>
      ) : (
        <div className="bg-fw-base border border-fw-secondary rounded-xl overflow-hidden">
          <table className="w-full text-figma-sm">
            <thead>
              <tr className="border-b border-fw-secondary bg-fw-wash">
                <th className="text-left px-4 py-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
                  Principal
                </th>
                <th className="text-left px-4 py-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
                  Granted via
                </th>
                <th className="text-left px-4 py-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
                  Connection permissions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fw-secondary">
              {effectiveAssignments.map(({ assignment, roleDef, connectionPerms, isDirectScope }) => (
                <tr
                  key={assignment.id}
                  className="hover:bg-fw-wash transition-colors"
                >
                  {/* Principal */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-fw-accent border border-fw-secondary flex items-center justify-center shrink-0">
                        <span className="text-figma-xs font-semibold text-fw-cobalt-700">
                          {(assignment.principal.displayName ?? assignment.principal.id)
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-fw-heading leading-tight">
                          {assignment.principal.displayName ?? assignment.principal.id}
                        </p>
                        <p className="text-figma-xs text-fw-disabled capitalize">
                          {assignment.principal.type}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-fw-heading">
                      {roleDef?.displayName ?? assignment.roleId}
                    </span>
                  </td>

                  {/* Granted via — the cascade origin */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-figma-xs font-medium border ${scopeBadgeClass(assignment.scope.raw)}`}
                      >
                        {scopeLabel(assignment.scope.raw)}
                      </span>
                      {!isDirectScope && (
                        <span className="flex items-center gap-0.5 text-figma-xs text-fw-bodyLight">
                          <ArrowRight className="h-3 w-3" />
                          cascades
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Connection permissions */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {connectionPerms.map(p => (
                        <span
                          key={p}
                          className="px-1.5 py-0.5 text-figma-xs rounded bg-fw-neutral text-fw-heading font-mono"
                        >
                          {permLabel(p)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary count */}
      {effectiveAssignments.length > 0 && (
        <p className="text-figma-xs text-fw-bodyLight px-1">
          {effectiveAssignments.length} principal{effectiveAssignments.length !== 1 ? 's' : ''} have
          effective access —{' '}
          {effectiveAssignments.filter(r => !r.isDirectScope).length} via cascaded scope,{' '}
          {effectiveAssignments.filter(r => r.isDirectScope).length} direct.
        </p>
      )}
    </div>
  );
}
