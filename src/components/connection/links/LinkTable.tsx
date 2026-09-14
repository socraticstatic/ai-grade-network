import React, { useState } from 'react';
import { Edit2, Trash2, Eye } from 'lucide-react';
import { VLAN } from '../modals/VLANModal';
import { OverflowMenu } from '../../common/OverflowMenu';
import { EnhancedTable, TableColumn } from '../../common/EnhancedTable';

interface LinkTableProps {
  links: Array<VLAN & { cloudRouterName?: string; hubId?: string }>;
  sortField: keyof VLAN;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof VLAN) => void;
  onEdit: (link: any) => void;
  onDelete: (link: any) => void;
  searchQuery: string;
  showHub?: boolean;
  toolbar?: React.ReactNode;
}

export function LinkTable({
  links,
  onEdit,
  onDelete,
  searchQuery,
  showHub = false,
  toolbar,
}: LinkTableProps) {
  const [activeOverflow, setActiveOverflow] = useState<string | null>(null);

  type LinkType = VLAN & { cloudRouterName?: string; hubId?: string };

  const baseColumns: TableColumn<LinkType>[] = [
    {
      id: 'vlanId',
      label: 'VLAN ID',
      sortable: true,
      sortKey: 'vlanId',
      render: (link) => (
        <div className="text-figma-base font-medium text-fw-heading">{link.vlanId}</div>
      ),
      csvRender: (link) => String(link.vlanId)
    },
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      sortKey: 'name',
      render: (link) => (
        <div>
          <div className="text-figma-base font-medium text-fw-heading truncate">{link.name}</div>
          {link.description && (
            <div className="text-figma-sm text-fw-bodyLight truncate mt-0.5">{link.description}</div>
          )}
        </div>
      ),
      csvRender: (link) => link.name
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      sortKey: 'status',
      render: (link) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-figma-sm font-medium ${
          link.status === 'active' ? 'bg-fw-successLight text-fw-success' : 'bg-fw-neutral text-fw-heading'
        }`}>
          {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
        </span>
      ),
      csvRender: (link) => link.status.charAt(0).toUpperCase() + link.status.slice(1)
    }
  ];

  const hubColumn: TableColumn<LinkType> = {
    id: 'hub',
    label: 'Hub',
    sortable: true,
    sortKey: 'hubId',
    render: (link) => (
      <div className="text-figma-base font-medium text-fw-heading truncate">{link.cloudRouterName || '—'}</div>
    ),
    csvRender: (link) => link.cloudRouterName || 'Not assigned'
  };

  const columns = showHub
    ? [baseColumns[0], baseColumns[1], hubColumn, baseColumns[2]]
    : baseColumns;

  return (
    <EnhancedTable
      data={links}
      columns={columns}
      keyExtractor={(link) => link.id}
      emptyMessage={searchQuery ? 'No links match your search criteria' : 'No links configured for this connection'}
      pageSize={100}
      showPagination={links.length > 100}
      stickyHeader={true}
      showExport={false}
      tableId="links"
      showColumnManager={true}
      toolbar={toolbar}
      rowActions={(link) => (
        <OverflowMenu
          items={[
            {
              id: 'view',
              label: 'View Details',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => onEdit(link)
            },
            {
              id: 'edit',
              label: 'Edit Link',
              icon: <Edit2 className="h-4 w-4" />,
              onClick: () => onEdit(link)
            },
            {
              id: 'delete',
              label: 'Delete Link',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => onDelete(link),
              variant: 'danger'
            }
          ]}
          isOpen={activeOverflow === link.id}
          onOpenChange={(isOpen) => {
            setActiveOverflow(isOpen ? link.id : null);
          }}
        />
      )}
    />
  );
}