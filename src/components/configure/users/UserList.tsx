// src/components/configure/users/UserList.tsx
import { useState, useMemo } from 'react';
import { UserPlus, AlertTriangle, Clock, Shield, Eye, Ban } from 'lucide-react';
import { UserIcon } from '../../common/UserIcon';
import { InviteUserDrawer } from './InviteUserDrawer';
import { AssignRoleDrawer } from './AssignRoleDrawer';
import { DenyAssignmentDrawer } from './DenyAssignmentDrawer';
import { EffectivePermissionsModal } from './EffectivePermissionsModal';
import { BaseTable } from '../../common/BaseTable';
import { OverflowMenu } from '../../common/OverflowMenu';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { RoleAssignment } from '../../../types/rbac';
import { ROLE_CATALOG } from '../../../data/roleCatalog';
import { permissionResolver } from '../../../utils/permissionResolver';
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
      { value: 'ClientAdmin', label: 'Client Admin' },
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
  const { users, roleAssignments, currentUserId, currentUserScope } = useStore(s => ({
    users: s.users,
    roleAssignments: s.roleAssignments,
    currentUserId: s.currentUserId,
    currentUserScope: s.currentUserScope,
  }));
  const [searchQuery, setSearchQuery] = useState('');

  const ctx = { request: { currentTime: new Date() } };
  const canInviteUser   = permissionResolver.can(currentUserId, 'user:write',              currentUserScope, ctx).allowed;
  const canAssignRoles  = permissionResolver.can(currentUserId, 'role-assignment:assign',  currentUserScope, ctx).allowed;
  const canCreateDeny   = permissionResolver.can(currentUserId, 'role-assignment:assign',  currentUserScope, ctx).allowed;

  const [showInvite, setShowInvite] = useState(false);
  const [assignTarget, setAssignTarget] = useState<UserType | null>(null);
  const [denyTarget, setDenyTarget] = useState<UserType | null>(null);
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
        const violation = permissionResolver.getSodViolation(user.id);
        if (!violation) return null;
        return (
          <span
            title={`SoD conflict: ${violation}`}
            className="flex items-center gap-1 text-figma-xs text-fw-error font-medium cursor-help"
          >
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
              canInviteUser ? (
                <Button
                  variant="primary"
                  icon={UserPlus}
                  onClick={() => setShowInvite(true)}
                  data-testid="invite-user-button"
                >
                  Invite User
                </Button>
              ) : undefined
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
              ...(canAssignRoles ? [{
                id: 'assign',
                label: 'Assign Role',
                icon: <Shield className="h-4 w-4" />,
                onClick: () => setAssignTarget(user),
              }] : []),
              ...(canCreateDeny ? [{
                id: 'deny',
                label: 'Create Deny Assignment',
                icon: <Ban className="h-4 w-4 text-fw-error" />,
                onClick: () => setDenyTarget(user),
              }] : []),
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

      {denyTarget && (
        <DenyAssignmentDrawer
          isOpen={!!denyTarget}
          onClose={() => setDenyTarget(null)}
          prefillUserId={denyTarget.id}
          prefillUserName={denyTarget.name}
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
