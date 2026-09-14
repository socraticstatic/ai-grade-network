import { Edit2, Trash2 } from 'lucide-react';
import { Link } from '../../../types/connection';
import { EnhancedTable, TableColumn } from '../../common/EnhancedTable';
import { OverflowMenu } from '../../common/OverflowMenu';

interface VLANTableProps {
  vlans: Link[];
  cloudRouterName?: string;
  onEdit: (vlan: Link) => void;
  onDelete: (vlan: Link) => void;
  searchQuery?: string;
}

export function VLANTable({
  vlans,
  cloudRouterName = '',
  onEdit,
  onDelete,
  searchQuery = ''
}: VLANTableProps) {

  // Filter VLANs based on search
  const filteredVLANs = vlans.filter(vlan => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      vlan.vlanId?.toString().includes(searchLower) ||
      vlan.name?.toLowerCase().includes(searchLower) ||
      vlan.description?.toLowerCase().includes(searchLower)
    );
  });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || 'unknown';
    const colorMap: Record<string, string> = {
      active: 'bg-fw-successLight text-fw-success',
      inactive: 'bg-fw-neutral text-fw-heading',
      provisioning: 'bg-fw-accent text-fw-linkHover',
      error: 'bg-fw-errorLight text-fw-error',
      pending: 'bg-fw-warn/10 text-fw-warn'
    };
    return colorMap[statusLower] || 'bg-fw-neutral text-fw-heading';
  };

  const columns: TableColumn<Link>[] = [
    {
      id: 'vlanId',
      label: 'VLAN ID',
      sortable: true,
      sortKey: 'vlanId',
      width: 'w-24',
      render: (vlan) => (
        <div className="text-figma-base font-mono font-medium text-fw-heading">
          {vlan.vlanId || '—'}
        </div>
      ),
      csvRender: (vlan) => vlan.vlanId?.toString() || ''
    },
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      sortKey: 'name',
      render: (vlan) => (
        <div>
          <div className="text-figma-base font-medium text-fw-heading">{vlan.name}</div>
          {vlan.description && (
            <div className="text-figma-sm text-fw-bodyLight mt-0.5">{vlan.description}</div>
          )}
        </div>
      ),
      csvRender: (vlan) => vlan.name || ''
    },
    {
      id: 'hub',
      label: 'Hub',
      sortable: false,
      render: () => (
        <div className="text-figma-base text-fw-body">
          {cloudRouterName || '—'}
        </div>
      ),
      csvRender: () => cloudRouterName || ''
    },
    {
      id: 'bandwidth',
      label: 'Bandwidth',
      sortable: true,
      sortKey: 'bandwidth',
      width: 'w-28',
      render: (vlan) => (
        <div className="text-figma-base text-fw-body">
          {vlan.bandwidth || '1 Gbps'}
        </div>
      ),
      csvRender: (vlan) => vlan.bandwidth || '1 Gbps'
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      sortKey: 'status',
      width: 'w-28',
      render: (vlan) => (
        <span className={`inline-flex px-2 py-1 text-figma-sm font-medium rounded-lg ${getStatusBadge(vlan.status || 'active')}`}>
          {(vlan.status || 'Active').charAt(0).toUpperCase() + (vlan.status || 'Active').slice(1)}
        </span>
      ),
      csvRender: (vlan) => (vlan.status || 'active').charAt(0).toUpperCase() + (vlan.status || 'active').slice(1)
    }
  ];

  return (
    <EnhancedTable
      data={filteredVLANs}
      columns={columns}
      keyExtractor={(vlan) => vlan.id}
      emptyMessage={searchQuery ? 'No VLANs match your search criteria' : 'No VLANs configured'}
      pageSize={50}
      showPagination={filteredVLANs.length > 50}
      stickyHeader={false}
      showExport={false}
      exportFilename="vlans-export.csv"
      tableId="vlans"
      showColumnManager={true}
      rowActions={(vlan) => (
        <OverflowMenu
          items={[
            {
              id: 'edit',
              label: 'Edit VLAN',
              icon: <Edit2 className="h-4 w-4" />,
              onClick: () => onEdit(vlan)
            },
            {
              id: 'delete',
              label: 'Delete VLAN',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => onDelete(vlan),
              variant: 'danger'
            }
          ]}
        />
      )}
    />
  );
}
