import { useState, useEffect, useCallback, useMemo } from 'react';
import { PlusCircle, X, Search, Eye, Trash2 } from 'lucide-react';
import { Connection, Group } from '../../../../types';
import { Button } from '../../../common/Button';
import { useStore } from '../../../../store/useStore';
import { BaseTable } from '../../../common/BaseTable';
import { SearchFilterBar } from '../../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../../common/TableFilterPanel';
import { OverflowMenu } from '../../../common/OverflowMenu';
import { ConfirmDialog } from '../../../common/ConfirmDialog';

const CONN_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'toggle',
    options: [
      { value: 'Active', label: 'Active', color: 'success' },
      { value: 'Inactive', label: 'Inactive', color: 'warning' },
    ],
  },
];

interface GroupConnectionsProps {
  group: Group;
  connections: Connection[];
  allConnections: Connection[];
}

export function GroupConnections({ group, connections, allConnections }: GroupConnectionsProps) {
  const addConnectionToGroup = useStore(state => state.addConnectionToGroup);
  const removeConnectionFromGroup = useStore(state => state.removeConnectionFromGroup);

  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Connection>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { filters: connFilters, setFilters: setConnFilters, isOpen: connFilterOpen, toggle: toggleConnFilter, activeCount: connFilterCount } = useTableFilters({
    groups: CONN_FILTER_GROUPS,
  });

  const availableConnections = allConnections.filter(
    conn => !group.connectionIds.includes(conn.id.toString())
  );

  const filteredConnections = useMemo(() => {
    const statusFilters = connFilters.status || [];
    return connections
      .filter(conn => {
        if (statusFilters.length > 0 && !statusFilters.includes(conn.status)) return false;
        if (!searchQuery) return true;
        return (
          conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conn.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conn.location.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => {
        const aVal = String(a[sortField]);
        const bVal = String(b[sortField]);
        return aVal.localeCompare(bVal) * (sortDirection === 'asc' ? 1 : -1);
      });
  }, [connections, searchQuery, connFilters, sortField, sortDirection]);

  const handleSort = useCallback((field: keyof Connection) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleAddConnections = async () => {
    try {
      for (const connectionId of selectedConnectionIds) {
        await addConnectionToGroup(group.id, connectionId);
      }
      setSelectedConnectionIds([]);
      setShowAddModal(false);
      window.addToast({
        type: 'success',
        title: 'Connections Added',
        message: `${selectedConnectionIds.length} connection${selectedConnectionIds.length !== 1 ? 's' : ''} added to group`,
        duration: 3000
      });
    } catch (error) {
      console.error('Error adding connections to group:', error);
      window.addToast({ type: 'error', title: 'Error', message: 'Failed to add connections to group', duration: 3000 });
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    try {
      await removeConnectionFromGroup(group.id, connectionId);
      setShowRemoveConfirm(null);
    } catch (error) {
      console.error('Error removing connection from group:', error);
      window.addToast({ type: 'error', title: 'Error', message: 'Failed to remove connection from group', duration: 3000 });
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusColor = status === 'Active'
      ? 'bg-fw-successLight text-fw-success'
      : 'bg-fw-neutral text-fw-body';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${statusColor}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <BaseTable<Connection>
        tableId="group-connections"
        columns={[
          {
            id: 'name',
            label: 'Name',
            sortable: true,
            sortKey: 'name' as keyof Connection,
            render: (item: Connection) => (
              <div>
                <div className="text-fw-heading font-medium">{item.name}</div>
                <div className="text-[12px] text-fw-bodyLight">{item.type}</div>
              </div>
            )
          },
          {
            id: 'status',
            label: 'Status',
            sortable: true,
            sortKey: 'status' as keyof Connection,
            render: (item: Connection) => getStatusDisplay(item.status)
          },
          {
            id: 'bandwidth',
            label: 'Bandwidth',
            sortable: true,
            sortKey: 'bandwidth' as keyof Connection,
            render: (item: Connection) => <span>{item.bandwidth}</span>
          },
          {
            id: 'location',
            label: 'Location',
            sortable: true,
            sortKey: 'location' as keyof Connection,
            render: (item: Connection) => <span>{item.location}</span>
          }
        ]}
        data={filteredConnections}
        keyField="id"
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        showColumnManager={true}
        onRowClick={(item) => window.location.href = `/connections/${item.id}`}
        toolbar={
          <SearchFilterBar
            searchPlaceholder="Search connections..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilter={toggleConnFilter}
            activeFilterCount={connFilterCount}
            isFilterOpen={connFilterOpen}
            filterPanel={
              <TableFilterPanel
                groups={CONN_FILTER_GROUPS}
                activeFilters={connFilters}
                onFiltersChange={setConnFilters}
                isOpen={connFilterOpen}
                onToggle={toggleConnFilter}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            }
            onExport={() => {
              const csv = [
                ['Name', 'Type', 'Status', 'Bandwidth', 'Location'].join(','),
                ...filteredConnections.map(conn =>
                  [conn.name, conn.type, conn.status, conn.bandwidth, conn.location].join(',')
                )
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${group.name}_connections.csv`;
              link.click();
              URL.revokeObjectURL(url);
              window.addToast({ type: 'success', title: 'Exported', message: 'Connections exported', duration: 3000 });
            }}
            actions={
              <Button variant="primary" icon={PlusCircle} onClick={() => setShowAddModal(true)}>
                Add Connection
              </Button>
            }
          />
        }
        actions={(item: Connection) => (
          <OverflowMenu items={[
            { id: 'view', label: 'View Connection', icon: <Eye className="h-4 w-4" />, onClick: () => { window.location.href = `/connections/${item.id}`; } },
            { id: 'remove', label: 'Remove from Pool', icon: <Trash2 className="h-4 w-4" />, onClick: () => setShowRemoveConfirm(item.id.toString()), variant: 'danger' as const },
          ]} />
        )}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-[14px] text-fw-bodyLight">No connections in this pool yet</p>
            <Button variant="primary" icon={PlusCircle} onClick={() => setShowAddModal(true)}>
              Add Connection
            </Button>
          </div>
        }
      />

      {/* Add Connections Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-fw-neutral bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-fw-base rounded-lg max-w-2xl w-full mx-4 sm:mx-auto shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-fw-secondary flex justify-between items-center">
              <h3 className="text-lg font-medium text-fw-heading">Add Connections to Pool</h3>
              <button onClick={() => setShowAddModal(false)} className="text-fw-bodyLight hover:text-fw-body">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fw-bodyLight h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search available connections..."
                  className="pl-10 pr-4 h-9 w-full border border-fw-secondary rounded-lg text-[14px] focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div className="max-h-80 overflow-y-auto">
                {availableConnections.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-fw-bodyLight">No available connections to add</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableConnections.map(conn => (
                      <div
                        key={conn.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          selectedConnectionIds.includes(conn.id.toString())
                            ? 'border-fw-active bg-fw-accent'
                            : 'border-fw-secondary hover:bg-fw-wash'
                        }`}
                      >
                        <label className="flex items-center w-full cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedConnectionIds.includes(conn.id.toString())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedConnectionIds([...selectedConnectionIds, conn.id.toString()]);
                              } else {
                                setSelectedConnectionIds(selectedConnectionIds.filter(id => id !== conn.id.toString()));
                              }
                            }}
                            className="rounded border-fw-secondary text-fw-cobalt-600 focus:ring-fw-active h-4 w-4"
                          />
                          <div className="ml-3">
                            <div className="text-[14px] font-medium text-fw-heading">{conn.name}</div>
                            <div className="text-[12px] text-fw-bodyLight">
                              {conn.type} - {conn.location} - {conn.bandwidth}
                            </div>
                          </div>
                        </label>
                        <div>{getStatusDisplay(conn.status)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleAddConnections} disabled={selectedConnectionIds.length === 0}>
                  Add Selected Connections
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(null)}
        onConfirm={() => { if (showRemoveConfirm) handleRemoveConnection(showRemoveConfirm); }}
        title="Remove Connection"
        message="Are you sure you want to remove this connection from the pool? This won't delete the connection itself."
        confirmText="Remove"
        confirmVariant="danger"
      />
    </div>
  );
}
