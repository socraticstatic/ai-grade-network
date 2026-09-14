// src/components/configure/users/AssignmentManagement.tsx
import { useState } from 'react';
import { Plus, Shield, Trash2, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { TerminologyTooltip } from '../../common/TerminologyTooltip';
import { BaseTable } from '../../common/BaseTable';
import { OverflowMenu } from '../../common/OverflowMenu';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { Button } from '../../common/Button';
import { SideDrawer } from '../../common/SideDrawer';
import { useStore } from '../../../store/useStore';
import { RoleAssignment, DenyAssignment, AssignmentConditions } from '../../../types/rbac';
import { ROLE_CATALOG } from '../../../data/roleCatalog';
import { permissionResolver } from '../../../utils/permissionResolver';
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

// Renders compact chips for non-empty scope dimensions on an assignment row
function ScopeDimensionChips({ conditions }: { conditions?: AssignmentConditions }) {
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
  if (q?.allowedIPs?.length) chips.push(`IP restricted (${q.allowedIPs.length})`);
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

function groupPermissionsByObject(perms: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const [obj, action] = p.split(':');
    if (!groups[obj]) groups[obj] = [];
    groups[obj].push(action);
  }
  return groups;
}

export function AssignmentManagement() {
  const { roleAssignments, denyAssignments, revokeRoleAssignment, liftDenyAssignment, currentUserId, currentUserScope, users } = useStore(s => ({
    roleAssignments: s.roleAssignments,
    denyAssignments: s.denyAssignments,
    revokeRoleAssignment: s.revokeRoleAssignment,
    liftDenyAssignment: s.liftDenyAssignment,
    currentUserId: s.currentUserId,
    currentUserScope: s.currentUserScope,
    users: s.users,
  }));

  const ctx = { request: { currentTime: new Date() } };
  const canAssign = permissionResolver.can(currentUserId, 'role-assignment:assign', currentUserScope, ctx).allowed;
  const canRevoke = permissionResolver.can(currentUserId, 'role-assignment:revoke', currentUserScope, ctx).allowed;

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

  // Deduplicate by principal — getSodViolation is O(groups × members), call once per user not once per assignment
  const violationByPrincipal = new Map<string, string>();
  const uniquePrincipalIds = new Set(roleAssignments.map(a => a.principal.id));
  for (const principalId of uniquePrincipalIds) {
    const violation = permissionResolver.getSodViolation(principalId);
    if (violation) violationByPrincipal.set(principalId, violation);
  }
  const sodViolatingIds = new Set<string>();
  const sodViolationTitles = new Map<string, string>();
  for (const a of roleAssignments) {
    const violation = violationByPrincipal.get(a.principal.id);
    if (violation) {
      sodViolatingIds.add(a.id);
      sodViolationTitles.set(a.id, `SoD: ${violation}`);
    }
  }

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
      render: (a: RoleAssignment) => {
        const tier = a.scope.tier;
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
            <span className="text-figma-xs text-fw-bodyLight font-mono">{a.scope.raw}</span>
            <ScopeDimensionChips conditions={a.conditions} />
          </div>
        );
      },
    },
    {
      id: 'expiry',
      label: 'Expires',
      render: (a: RoleAssignment) => {
        const days = Math.ceil((new Date(a.expiresAt).getTime() - Date.now()) / 86400000);
        return (
          <div>
            <span className={`text-figma-xs font-medium ${days < 0 ? 'text-fw-error' : days <= 14 ? 'text-fw-warn' : 'text-fw-bodyLight'}`}>
              {days < 0 ? 'Expired' : `${days}d`}
            </span>
            {a.conditions?.request?.timeWindow && (
              <div className="text-figma-xs text-fw-bodyLight mt-0.5">
                {a.conditions.request.timeWindow.startHour}h–{a.conditions.request.timeWindow.endHour}h
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      render: (a: RoleAssignment) => <StatusBadge status={a.status} />,
    },
    {
      id: 'sod',
      label: 'SoD',
      render: (a: RoleAssignment) =>
        sodViolatingIds.has(a.id) ? (
          <span
            title={sodViolationTitles.get(a.id) ?? 'SoD conflict'}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded border bg-fw-errorLight text-fw-error border-fw-error cursor-help"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            SoD
          </span>
        ) : null,
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
              {t === 'allow' ? (
              <TerminologyTooltip termId="role-assignment" placement="bottom" showIcon>
                Allow ({roleAssignments.length})
              </TerminologyTooltip>
            ) : (
              <TerminologyTooltip termId="deny-assignment" placement="bottom" showIcon>
                Deny ({denyAssignments.length})
              </TerminologyTooltip>
            )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {canAssign && (
            <Button variant="outline" icon={Shield} onClick={() => setShowDeny(true)}>
              Add Deny
            </Button>
          )}
          {canAssign && (
            <Button variant="primary" icon={Plus} onClick={handleAssignRoleClick}>
              Assign Role
            </Button>
          )}
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
                ...(canRevoke ? [{
                  id: 'revoke',
                  label: 'Revoke',
                  icon: <Trash2 className="h-4 w-4" />,
                  variant: 'danger' as const,
                  disabled: a.status !== 'active',
                  onClick: () => {
                    revokeRoleAssignment(a.id, currentUserId, 'Manually revoked via admin UI');
                    window.addToast({ type: 'info', title: 'Assignment Revoked', message: `${a.principal.displayName} — ${a.role}`, duration: 3000 });
                  },
                }] : []),
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
                ...(canRevoke ? [{
                  id: 'lift',
                  label: 'Lift Deny',
                  icon: <ArrowUpRight className="h-4 w-4" />,
                  disabled: d.status !== 'active',
                  onClick: () => {
                    liftDenyAssignment(d.id, currentUserId, 'Manually lifted via admin UI');
                    window.addToast({ type: 'success', title: 'Deny Lifted', message: d.principal.displayName, duration: 3000 });
                  },
                }] : []),
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
