// src/components/configure/users/GroupManagement.tsx
import { useState } from 'react';
import { Layers, Plus, Eye, Pencil, RefreshCw, Ban, Trash2 } from 'lucide-react';
import { BaseTable } from '../../common/BaseTable';
import { OverflowMenu } from '../../common/OverflowMenu';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { AccessGroup, AccessGroupPurpose, AccessGroupStatus } from '../../../types/rbac';
import { permissionResolver } from '../../../utils/permissionResolver';
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

const STATUS_LABELS: Record<AccessGroupStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  ownerless: 'Ownerless',
  'pending-review': 'Pending Review',
  closed: 'Closed',
};

const STATUS_COLORS: Record<AccessGroupStatus, string> = {
  active: 'bg-fw-successLight text-fw-success',
  suspended: 'bg-fw-errorLight text-fw-error',
  ownerless: 'bg-fw-warnLight text-fw-warn',
  'pending-review': 'bg-fw-warnLight text-fw-warn',
  closed: 'bg-fw-neutral text-fw-disabled',
};

export function GroupManagement() {
  const { accessGroups, updateAccessGroup, deleteAccessGroup, currentUserId, currentUserScope } = useStore(s => ({
    accessGroups: s.accessGroups,
    updateAccessGroup: s.updateAccessGroup,
    deleteAccessGroup: s.deleteAccessGroup,
    currentUserId: s.currentUserId,
    currentUserScope: s.currentUserScope,
  }));
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailGroup, setDetailGroup] = useState<{ group: AccessGroup; editing: boolean } | null>(null);

  const ctx = { request: { currentTime: new Date() } };
  const canCreateGroup  = permissionResolver.can(currentUserId, 'user:write',   currentUserScope, ctx).allowed;
  const canEditGroup    = permissionResolver.can(currentUserId, 'user:write',   currentUserScope, ctx).allowed;
  const canOperateGroup = permissionResolver.can(currentUserId, 'user:operate', currentUserScope, ctx).allowed;

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
          {g.scopeCeiling.path?.raw ?? "(uses creator's scope)"}
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
          {STATUS_LABELS[g.status] ?? g.status}
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
              canCreateGroup ? (
                <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>
                  Create Group
                </Button>
              ) : undefined
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
                onClick: () => setDetailGroup({ group: g, editing: false }),
              },
              ...(canEditGroup ? [{
                id: 'edit',
                label: 'Edit Group',
                icon: <Pencil className="h-4 w-4" />,
                onClick: () => setDetailGroup({ group: g, editing: true }),
              }] : []),
              ...(canOperateGroup ? [{
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
              }] : []),
              ...(canOperateGroup ? [{
                id: 'delete',
                label: 'Delete Group',
                icon: <Trash2 className="h-4 w-4" />,
                variant: 'danger' as const,
                onClick: () => {
                  deleteAccessGroup(g.id);
                  window.addToast({
                    type: 'info',
                    title: 'Group Deleted',
                    message: g.name,
                    duration: 3000,
                  });
                },
              }] : []),
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
          key={`${detailGroup.group.id}-${detailGroup.editing}`}
          isOpen={!!detailGroup}
          onClose={() => setDetailGroup(null)}
          group={detailGroup.group}
          initialEditing={detailGroup.editing}
          canEdit={canEditGroup}
        />
      )}
    </>
  );
}
