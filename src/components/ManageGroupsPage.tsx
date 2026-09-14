import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, Download, Plus, LayoutGrid, List, Minimize2, Maximize2, ShoppingBag, PlusCircle
} from 'lucide-react';
import { Group } from '../types/group';
import { Button } from './common/Button';
import { SearchFilterBar } from './common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from './common/TableFilterPanel';
import { useStore } from '../store/useStore';
import { AddGroupModal } from './configure/groups/AddGroupModal';
import { GroupCardView, GroupListView } from './group/views';
import { ConfirmDialog } from './common/ConfirmDialog';
import { ConnectionTabs } from './connection/ConnectionTabs';
import { ControlCenterManager } from './control-center/ControlCenterManager';

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'type',
    label: 'Pool Type',
    type: 'checkbox',
    options: [
      { value: 'business', label: 'Business' },
      { value: 'department', label: 'Department' },
      { value: 'project', label: 'Project' },
      { value: 'team', label: 'Team' },
      { value: 'custom', label: 'Custom' },
    ],
  },
  {
    id: 'status',
    label: 'Status',
    type: 'checkbox',
    options: [
      { value: 'active', label: 'Active', color: 'success' },
      { value: 'inactive', label: 'Inactive', color: 'default' },
      { value: 'suspended', label: 'Suspended', color: 'warning' },
    ],
  },
];

export function ManageGroupsPage() {
  const navigate = useNavigate();
  const groups = useStore(state => state.groups);
  const connections = useStore(state => state.connections);
  const removeGroup = useStore(state => state.removeGroup);
  const users = useStore(state => state.users);
  const addGroup = useStore(state => state.addGroup);

  const [activeTab, setActiveTab] = useState<'groups' | 'marketplace' | 'control-center'>('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [areAllMinimized, setAreAllMinimized] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({ groups: FILTER_GROUPS });

  // Filter groups based on search and filters
  const filteredGroups = groups.filter(group => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchLower ||
      group.name.toLowerCase().includes(searchLower) ||
      group.description.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    const typeFilters = filters['type'] || [];
    const matchesType = typeFilters.length === 0 || typeFilters.includes(group.type);

    const statusFilters = filters['status'] || [];
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(group.status);

    return matchesType && matchesStatus;
  });

  const handleDeleteGroup = (id: string) => {
    removeGroup(id);
    setShowConfirmDelete(null);

    window.addToast({
      type: 'success',
      title: 'Pool Deleted',
      message: 'Pool has been deleted successfully',
      duration: 3000
    });
  };

  const handleAddGroup = async (newGroup: Omit<Group, 'id' | 'createdAt'>) => {
    // Generate ID and createdAt
    const groupToAdd = {
      ...newGroup,
      id: `group-${Date.now()}`,
      createdAt: new Date().toISOString()
    } as Group;

    try {
      await addGroup(groupToAdd);
      setShowAddModal(false);

      window.addToast({
        type: 'success',
        title: 'Pool Created',
        message: 'Pool has been created successfully',
        duration: 3000
      });
    } catch (error) {
      console.error('Error creating pool:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create pool. Please try again.',
        duration: 3000
      });
    }
  };

  const exportGroups = () => {
    const csv = [
      ['Name', 'Type', 'Description', 'Status', 'Connections', 'Members'].join(','),
      ...filteredGroups.map(g => [
        g.name,
        g.type,
        g.description,
        g.status,
        g.connectionIds.length,
        g.userIds.length
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pools.csv';
    link.click();
    URL.revokeObjectURL(url);

    window.addToast({
      type: 'success',
      title: 'Export Complete',
      message: 'Pools exported successfully',
      duration: 3000
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'groups':
        return (
          <>
            {/* Search and Controls */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1">
                <SearchFilterBar
                  searchPlaceholder="Search pools ..."
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
                  onFilter={toggle}
                  activeFilterCount={activeCount}
                  isFilterOpen={isOpen}
                  showExport={false}
                  filterPanel={
                    <TableFilterPanel
                      groups={FILTER_GROUPS}
                      activeFilters={filters}
                      onFiltersChange={setFilters}
                      isOpen={isOpen}
                      onToggle={toggle}
                      searchQuery={searchQuery}
                      onClearSearch={() => setSearchQuery('')}
                    />
                  }
                />
              </div>

              {/* Minimize All - grid only */}
              {viewMode === 'grid' && (
                <Button
                  variant="ghost"
                  icon={areAllMinimized ? Maximize2 : Minimize2}
                  onClick={() => setAreAllMinimized(!areAllMinimized)}
                  size="md"
                >
                  {areAllMinimized ? 'Expand All' : 'Minimize All'}
                </Button>
              )}

              {/* Export */}
              <Button
                variant="ghost"
                icon={Download}
                onClick={exportGroups}
                size="md"
              >
                Export
              </Button>

              {/* Divider */}
              <div className="h-6 w-px bg-fw-secondary" />

              {/* View toggles */}
              <div className="flex items-center bg-fw-base rounded-lg border border-fw-secondary p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`quick-action-btn p-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'text-white bg-fw-primary'
                      : 'text-fw-disabled hover:text-fw-bodyLight'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`quick-action-btn p-2 transition-colors ${
                    viewMode === 'list'
                      ? 'text-white bg-fw-primary'
                      : 'text-fw-disabled hover:text-fw-bodyLight'
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-fw-secondary" />

              {/* Create Pool */}
              <Button
                variant="primary"
                icon={PlusCircle}
                onClick={() => setShowAddModal(true)}
                size="md"
                className="px-6"
              >
                Create Pool
              </Button>
            </div>

            <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
              {filteredGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 text-fw-bodyLight mx-auto mb-4" />
                  <p className="text-fw-bodyLight">No pools match your search criteria</p>
                </div>
              ) : viewMode === 'list' ? (
                <GroupListView
                  groups={filteredGroups}
                  onDelete={(id) => setShowConfirmDelete(id)}
                  onSelect={(id) => navigate(`/groups/${id}`)}
                />
              ) : (
                <GroupCardView
                  groups={filteredGroups}
                  onDelete={(id) => setShowConfirmDelete(id)}
                  isMinimized={areAllMinimized}
                />
              )}
            </div>
          </>
        );
      case 'marketplace':
        return (
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-fw-bodyLight mx-auto mb-4" />
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-2">Pool Templates Marketplace</h3>
              <p className="text-fw-bodyLight max-w-md mx-auto">
                Browse and select from pre-configured pool templates for different use cases and organizational structures.
              </p>
              <Button
                variant="primary"
                className="mt-6"
                onClick={() => setShowAddModal(true)}
              >
                Create Custom Pool
              </Button>
            </div>
          </div>
        );
      case 'control-center':
        return (
          <ControlCenterManager connections={connections} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">Manage Pools</h1>
          <p className="mt-1 text-figma-base font-medium text-fw-body">Create and manage your network pools</p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setShowAddModal(true)}
        >
          Create Pool
        </Button>
      </div>

      <div className="mb-8">
        <ConnectionTabs
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
          connectionCount={connections.length}
          groupCount={groups.length}
        />
      </div>

      <div className="space-y-6 min-h-[calc(100vh-16rem)] pb-12">
        {renderContent()}

        {/* Add Pool Modal */}
        <AddGroupModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddGroup}
          users={users}
          connections={connections}
        />

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          isOpen={!!showConfirmDelete}
          onClose={() => setShowConfirmDelete(null)}
          onConfirm={() => showConfirmDelete && handleDeleteGroup(showConfirmDelete)}
          title="Delete Pool"
          message="Are you sure you want to delete this pool? This action cannot be undone and will remove all pool associations."
          confirmText="Delete"
          confirmVariant="danger"
        />
      </div>
    </div>
  );
}
