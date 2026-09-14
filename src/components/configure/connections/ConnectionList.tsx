import { useState } from 'react';
import { Edit2, Trash2, Play, Pause, Download, ChevronRight, Activity } from 'lucide-react';
import { Connection } from '../../../types';
import { BaseTable } from '../../common/BaseTable';
import { OverflowMenu } from '../../common/OverflowMenu';
import { Button } from '../../common/Button';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { useStore } from '../../../store/useStore';

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'toggle',
    options: [
      { value: 'Active', label: 'Active', color: 'success' },
      { value: 'Inactive', label: 'Inactive', color: 'default' },
    ],
  },
];

interface ConnectionListProps {
  searchQuery: string;
  onSelect: (id: string, name: string) => void;
  selectedConnection: string | null;
  onUpdateConnection?: (id: string, updates: Partial<Connection>) => void;
}

export function ConnectionList({
  searchQuery,
  onSelect,
  selectedConnection,
  onUpdateConnection,
}: ConnectionListProps) {
  const connections = useStore(state => state.connections);
  const updateConnection = useStore(state => state.updateConnection);
  const removeConnection = useStore(state => state.removeConnection);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [nameError, setNameError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || '');

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({ groups: FILTER_GROUPS });

  const filteredConnections = connections.filter(conn => {
    const matchesSearch =
      (conn.name ?? '').toLowerCase().includes((localSearchQuery || '').toLowerCase()) ||
      (conn.type ?? '').toLowerCase().includes((localSearchQuery || '').toLowerCase());

    const statusFilters = filters['status'] || [];
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(conn.status);

    return matchesSearch && matchesStatus;
  });

  const handleStartEdit = (connection: Connection) => {
    setEditingId(connection.id.toString());
    setEditName(connection.name);
    setNameError('');
  };

  const handleSaveEdit = (connection: Connection) => {
    if (!editName.trim()) {
      setNameError('Connection name cannot be empty');
      return;
    }

    const nameExists = connections.some(
      conn => conn.id !== connection.id && conn.name.toLowerCase() === editName.toLowerCase()
    );
    if (nameExists) {
      setNameError('Connection name must be unique');
      return;
    }

    updateConnection(connection.id.toString(), { name: editName.trim() });
    onUpdateConnection?.(connection.id.toString(), { name: editName.trim() });
    setEditingId(null);
    setNameError('');

    window.addToast({
      type: 'success',
      title: 'Connection Updated',
      message: 'Connection name has been updated successfully.',
      duration: 3000
    });
  };

  const handleToggleStatus = (connection: Connection) => {
    const newStatus = connection.status === 'Active' ? 'Inactive' : 'Active';
    updateConnection(connection.id.toString(), { status: newStatus });

    window.addToast({
      type: 'success',
      title: 'Status Updated',
      message: `Connection is now ${newStatus}`,
      duration: 3000
    });
  };

  const handleDelete = (id: string) => {
    removeConnection(id);
    setShowDeleteConfirm(null);

    window.addToast({
      type: 'success',
      title: 'Connection Deleted',
      message: 'Connection has been removed successfully.',
      duration: 3000
    });
  };

  const columns = [
    {
      id: 'select',
      label: '',
      render: (connection: Connection) => (
        <div className="flex items-center justify-center">
          {selectedConnection === connection.id.toString() ? (
            <div className="h-2 w-2 rounded-full bg-fw-success" />
          ) : (
            <ChevronRight className="h-5 w-5 text-fw-bodyLight" />
          )}
        </div>
      )
    },
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      render: (connection: Connection) => (
        editingId === connection.id.toString() ? (
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={`px-3 h-9 border rounded-lg text-figma-base font-medium tracking-[-0.03em] text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active ${
                  nameError ? 'border-fw-error' : 'border-fw-secondary'
                }`}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit(connection);
                }}
                className="p-2 text-fw-success hover:text-fw-success rounded-full hover:bg-fw-successLight"
              >
                <Edit2 className="h-5 w-5" />
              </button>
            </div>
            {nameError && (
              <span className="text-figma-sm text-fw-error mt-1">{nameError}</span>
            )}
          </div>
        ) : (
          <div className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{connection.name || 'Unnamed Connection'}</div>
        )
      )
    },
    {
      id: 'type',
      label: 'Type',
      sortable: true,
      render: (connection: Connection) => (
        <div className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">{connection.type || 'Unknown'}</div>
      )
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      render: (connection: Connection) => (
        <span className={`inline-flex items-center gap-1.5 text-figma-base font-medium ${
          connection.status === 'Active' ? 'text-fw-success' : 'text-fw-disabled'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            connection.status === 'Active' ? 'bg-fw-success' : 'bg-fw-disabled'
          }`} />
          {connection.status}
        </span>
      )
    },
    {
      id: 'bandwidth',
      label: 'Bandwidth',
      sortable: true,
      render: (connection: Connection) => (
        <div className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">{connection.bandwidth}</div>
      )
    },
    {
      id: 'location',
      label: 'Location',
      sortable: true,
      render: (connection: Connection) => (
        <div className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">{connection.location}</div>
      )
    }
  ];

  return (
    <>
      {/* Help Banner */}
      <div className="mb-4 bg-gradient-to-r from-fw-wash to-fw-base border border-fw-secondary rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Activity className="h-6 w-6 text-fw-link" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">Connection Management</h3>
            <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">
              Click on any connection row to select it, then use the <strong>Logs</strong> or <strong>Test</strong> tabs to view detailed information.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="bg-fw-base p-4 rounded-lg border border-fw-secondary mb-6">
        <SearchFilterBar
          searchPlaceholder="Search connections..."
          searchValue={localSearchQuery}
          onSearchChange={setLocalSearchQuery}
          onFilter={toggle}
          activeFilterCount={activeCount}
          isFilterOpen={isOpen}
          onExport={() => {
            window.addToast({
              type: 'success',
              title: 'Export Complete',
              message: 'Connections exported successfully',
              duration: 3000
            });
          }}
          filterPanel={
            <TableFilterPanel
              groups={FILTER_GROUPS}
              activeFilters={filters}
              onFiltersChange={setFilters}
              isOpen={isOpen}
              onToggle={toggle}
              searchQuery={localSearchQuery}
              onClearSearch={() => setLocalSearchQuery('')}
            />
          }
        />
      </div>

      <div className="overflow-x-auto">
        <BaseTable
          columns={columns}
          data={filteredConnections}
          keyField="id"
          tableId="configure-connections"
          showColumnManager={true}
          onRowClick={(connection) => onSelect(connection.id.toString(), connection.name)}
          rowClassName={(connection) =>
            selectedConnection === connection.id.toString()
              ? 'bg-fw-wash border-l-4 border-fw-link hover:bg-fw-wash cursor-pointer'
              : 'hover:bg-fw-wash cursor-pointer transition-colors'
          }
          actions={(connection) => (
            <OverflowMenu
              items={[
                {
                  id: 'status',
                  label: connection.status === 'Active' ? 'Deactivate' : 'Activate',
                  icon: connection.status === 'Active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />,
                  onClick: () => handleToggleStatus(connection)
                },
                {
                  id: 'edit',
                  label: 'Edit Name',
                  icon: <Edit2 className="h-4 w-4" />,
                  onClick: () => handleStartEdit(connection)
                },
                {
                  id: 'delete',
                  label: 'Delete Connection',
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: () => setShowDeleteConfirm(connection.id.toString()),
                  variant: 'danger'
                }
              ]}
            />
          )}
          emptyState="No connections found"
        />
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 transition-opacity bg-fw-neutral bg-opacity-75" onClick={() => setShowDeleteConfirm(null)} />
            <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-fw-base rounded-2xl shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-fw-errorLight rounded-full sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="w-6 h-6 text-fw-error" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-figma-lg font-bold leading-6 text-fw-heading tracking-[-0.03em]">
                    Delete Connection
                  </h3>
                  <div className="mt-2">
                    <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em]">
                      Are you sure you want to delete this connection? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <Button
                  variant="primary"
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="bg-fw-error hover:bg-fw-error focus:ring-red-500 sm:ml-3"
                >
                  Delete
                </Button>
                <div className="mt-3 sm:mt-0 sm:mr-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
