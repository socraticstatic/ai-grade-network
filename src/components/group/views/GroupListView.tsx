import { useState } from 'react';
import { Settings, X, Users } from 'lucide-react';
import { TypeBadge, StatusBadge } from '../../common/Badge';
import { Group } from '../../../types/group';
import { BaseTable } from '../../common/BaseTable';
import { OverflowMenu } from '../../common/OverflowMenu';
import { ColumnDefinition } from '../../common/ColumnVisibilityPopover';
import { useColumnVisibility } from '../../../hooks/useColumnVisibility';

const TABLE_ID = 'groups-list';

const ALL_COLUMNS: ColumnDefinition[] = [
  { id: 'name', label: 'Name' },
  { id: 'description', label: 'Description' },
  { id: 'type', label: 'Type' },
  { id: 'connections', label: 'Connections' },
  { id: 'members', label: 'Members' },
  { id: 'status', label: 'Status' },
];

const SORTABLE_COLUMNS = ['name', 'description', 'type', 'connections', 'members', 'status'];

interface GroupListViewProps {
  groups: Group[];
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

export function GroupListView({ groups, onDelete, onSelect }: GroupListViewProps) {
  const { isVisible } = useColumnVisibility(TABLE_ID);
  const [sortField, setSortField] = useState<keyof Group>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof Group) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedGroups = [...groups].sort((a, b) => {
    let aValue, bValue;
    
    // Special handling for connection and member counts
    if (sortField === 'connections') {
      aValue = a.connectionIds.length;
      bValue = b.connectionIds.length;
    } else if (sortField === 'members') {
      aValue = a.userIds.length;
      bValue = b.userIds.length;
    } else if (sortField === 'billing') {
      aValue = a.billing?.monthlyRate || 0;
      bValue = b.billing?.monthlyRate || 0;
    } else {
      aValue = a[sortField as keyof Group];
      bValue = b[sortField as keyof Group];
    }
    
    const modifier = sortDirection === 'asc' ? 1 : -1;
    
    return aValue < bValue ? -1 * modifier : aValue > bValue ? 1 * modifier : 0;
  });

  // Badge colors now come from shared Badge component

  // Filter columns based on visibility
  const displayColumns = ALL_COLUMNS.filter(col => isVisible(col.id));

  const renderColumnContent = (group: Group, columnId: string) => {
    switch (columnId) {
      case 'name':
        return (
          <span className="text-figma-base font-medium text-fw-heading truncate">{group.name}</span>
        );
      case 'description':
        return (
          <span className="text-figma-base font-medium text-fw-bodyLight truncate">{group.description}</span>
        );
      case 'type':
        return <TypeBadge type={group.type} size="sm" />;
      case 'connections':
        return (
          <span className="text-figma-base font-medium text-fw-bodyLight">{group.connectionIds.length}</span>
        );
      case 'members':
        return (
          <span className="text-figma-base font-medium text-fw-bodyLight">{group.userIds.length}</span>
        );
      case 'status':
        return <StatusBadge status={group.status} uppercase size="sm" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Table */}
      <BaseTable
        columns={displayColumns.map(col => ({
          id: col.id,
          label: col.label,
          sortable: SORTABLE_COLUMNS.includes(col.id),
          sortKey: col.id as keyof Group,
          render: (group: Group) => renderColumnContent(group, col.id)
        }))}
        data={sortedGroups}
        keyField="id"
        tableId="groups-list"
        showColumnManager={true}
        sortField={sortField as string}
        sortDirection={sortDirection}
        onSort={(field) => handleSort(field as keyof Group)}
        onRowClick={(group) => onSelect(group.id)}
        actions={(group) => (
          <OverflowMenu
            items={[
              {
                id: 'view',
                label: 'View Details',
                icon: <Users className="h-4 w-4" />,
                onClick: () => onSelect(group.id)
              },
              {
                id: 'edit',
                label: 'Edit Pool',
                icon: <Settings className="h-4 w-4" />,
                onClick: () => onSelect(group.id)
              },
              {
                id: 'delete',
                label: 'Delete Pool',
                icon: <X className="h-4 w-4" />,
                onClick: () => onDelete(group.id),
                variant: 'danger'
              }
            ]}
          />
        )}
        emptyState={
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-fw-bodyLight mx-auto mb-4" />
            <p className="text-fw-bodyLight">No pools found</p>
          </div>
        }
      />
    </div>
  );
}