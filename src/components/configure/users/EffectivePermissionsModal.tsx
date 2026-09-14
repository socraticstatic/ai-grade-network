// src/components/configure/users/EffectivePermissionsModal.tsx
import { useMemo } from 'react';
import { Shield } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { permissionResolver } from '../../../utils/permissionResolver';
import { Permission, RoleAssignment, buildScopePath } from '../../../types/rbac';
import { ROLE_CATALOG } from '../../../data/roleCatalog';
import { UserType } from '../types';
import { OBJECT_LABELS } from '../../../utils/rbacLabels';

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


export function EffectivePermissionsModal({ isOpen, onClose, user }: EffectivePermissionsModalProps) {
  useStore(s => s.roleAssignments); // keep subscription for reactivity

  const { permissions, byObject, directAssignments, byGroup } = useMemo(() => {
    const scope = buildScopePath(user.scopePath ?? '/tenants/TNT-001');
    const perms = permissionResolver.getEffectivePermissions(user.id, scope, { currentTime: new Date() });

    const all = permissionResolver.getEffectiveAssignments(user.id);
    const active = all.filter(e =>
      e.assignment.status === 'active' && new Date(e.assignment.expiresAt) > new Date()
    );

    const direct = active
      .filter(e => e.source === 'direct')
      .map(e => e.assignment);

    const groupMap = new Map<string, { groupName: string; assignments: RoleAssignment[] }>();
    for (const e of active) {
      if (e.source !== 'group' || !e.groupId) continue;
      if (!groupMap.has(e.groupId)) {
        groupMap.set(e.groupId, { groupName: e.groupName ?? e.groupId, assignments: [] });
      }
      groupMap.get(e.groupId)!.assignments.push(e.assignment);
    }

    return {
      permissions: perms,
      byObject: groupPermissions(perms),
      directAssignments: direct,
      byGroup: groupMap,
    };
  }, [user]);

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
                from {directAssignments.length} direct + {byGroup.size} group source{byGroup.size !== 1 ? 's' : ''}
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

        {/* Source Assignments — direct + via groups */}
        {(directAssignments.length > 0 || byGroup.size > 0) && (
          <div>
            <h3 className="text-figma-sm font-semibold text-fw-heading mb-3">Source Assignments</h3>

            {directAssignments.length > 0 && (
              <div className="mb-4">
                <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide mb-2">
                  Direct ({directAssignments.length})
                </p>
                <div className="space-y-2">
                  {directAssignments.map(a => (
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

            {byGroup.size > 0 && (
              <div>
                <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide mb-2">
                  Via Groups ({[...byGroup.values()].reduce((n, g) => n + g.assignments.length, 0)})
                </p>
                <div className="space-y-3">
                  {[...byGroup.entries()].map(([groupId, { groupName, assignments }]) => (
                    <div key={groupId} className="border border-fw-secondary rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-fw-wash border-b border-fw-secondary">
                        <span className="text-figma-xs font-semibold text-fw-heading">{groupName}</span>
                        <span className="ml-2 text-figma-xs text-fw-bodyLight">({assignments.length} role{assignments.length !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="divide-y divide-fw-secondary">
                        {assignments.map(a => (
                          <div key={a.id} className="flex items-center justify-between px-3 py-2">
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
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SideDrawer>
  );
}
