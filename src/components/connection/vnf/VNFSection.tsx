import { useState, useMemo } from 'react';
import { Plus, Shield, LayoutGrid, List, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../common/Button';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { VNF, VNFType } from '../../../types/vnf';
import { VNFTable } from './VNFTable';
import { Hub } from '../../../types/hub';
import { AttIcon } from '../../icons/AttIcon';
import { useStore } from '../../../store/useStore';

const VNF_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'type',
    label: 'Type',
    type: 'toggle',
    options: [
      { value: 'firewall', label: 'Firewall', color: 'error' },
      { value: 'sdwan', label: 'SD-WAN', color: 'info' },
      { value: 'router', label: 'Router' },
      { value: 'vnat', label: 'NAT', color: 'warning' },
      { value: 'custom', label: 'Custom' },
    ],
  },
];

interface VNFSectionProps {
  vnfs: VNF[];
  hubs: Hub[];
  onAdd: () => void;
  onEdit: (vnf: VNF) => void;
  onDelete: (vnf: VNF) => void;
  connectionId: string;
}

export function VNFSection({
  vnfs,
  hubs,
  onAdd,
  onEdit,
  onDelete,
  connectionId
}: VNFSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [collapsedRouters, setCollapsedRouters] = useState<Set<string>>(new Set());
  const openWindow = useStore(state => state.openWindow);

  const toggleRouter = (id: string) => {
    setCollapsedRouters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const isWindowOpen = useStore(state => state.isWindowOpen);

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({
    groups: VNF_FILTER_GROUPS,
  });

  // Filter VNFs
  const filteredVNFs = useMemo(() => {
    const typeFilters = filters.type || [];
    return vnfs.filter(vnf => {
      if (typeFilters.length > 0 && !typeFilters.includes(vnf.type)) return false;
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        vnf.name.toLowerCase().includes(searchLower) ||
        vnf.vendor?.toLowerCase().includes(searchLower) ||
        vnf.type.toLowerCase().includes(searchLower)
      );
    });
  }, [vnfs, searchQuery, filters]);

  // Count VNFs by type
  const vnfsByType = {
    firewall: vnfs.filter(v => v.type === 'firewall').length,
    sdwan: vnfs.filter(v => v.type === 'sdwan').length,
    router: vnfs.filter(v => v.type === 'router').length,
    vnat: vnfs.filter(v => v.type === 'vnat').length,
    other: vnfs.filter(v => !['firewall', 'sdwan', 'router', 'vnat'].includes(v.type)).length
  };

  const activeVNFs = vnfs.filter(v => v.status === 'active').length;

  const handleDetach = () => {
    const tableId = `vnf-${connectionId}`;
    openWindow(tableId, {
      position: { x: 100, y: 100 },
      size: { width: 1200, height: 800 }
    });
  };

  const isDetached = isWindowOpen(`vnf-${connectionId}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">VNFs</h2>
          <p className="text-figma-base text-fw-bodyLight mt-1">
            Manage Virtual Network Function instances and their configurations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={onAdd}
          >
            Add VNF
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-fw-accent rounded-lg p-4 border border-fw-active">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-sm font-medium text-fw-heading">Active VNFs</p>
              <p className="text-figma-xl font-bold text-fw-link mt-1">{activeVNFs}</p>
            </div>
            <Shield className="h-8 w-8 text-fw-link opacity-50" />
          </div>
        </div>

        <div className="bg-fw-errorLight rounded-lg p-4 border border-fw-error">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-sm font-medium text-fw-heading">Firewalls</p>
              <p className="text-figma-xl font-bold text-fw-error mt-1">{vnfsByType.firewall}</p>
            </div>
            <Shield className="h-8 w-8 text-fw-error opacity-50" />
          </div>
        </div>

        <div className="bg-fw-successLight rounded-lg p-4 border border-fw-success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-sm font-medium text-fw-heading">SD-WAN</p>
              <p className="text-figma-xl font-bold text-fw-success mt-1">{vnfsByType.sdwan}</p>
            </div>
            <Shield className="h-8 w-8 text-fw-success opacity-50" />
          </div>
        </div>

        <div className="bg-fw-wash rounded-lg p-4 border border-fw-secondary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-base font-medium text-fw-heading">Routers</p>
              <p className="text-figma-xl font-bold text-fw-body mt-1">{vnfsByType.router}</p>
            </div>
            <Shield className="h-8 w-8 text-fw-bodyLight opacity-50" />
          </div>
        </div>
      </div>

      {/* Toolbar + view toggle */}
      <div className="rounded-lg border border-fw-secondary overflow-hidden">
        <div className="px-6 py-4 border-b border-fw-secondary flex items-center gap-3">
          <div className="flex-1">
            <SearchFilterBar
              searchPlaceholder="Search VNFs ..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onFilter={toggle}
              activeFilterCount={activeCount}
              isFilterOpen={isOpen}
              filterPanel={
                <TableFilterPanel
                  groups={VNF_FILTER_GROUPS}
                  activeFilters={filters}
                  onFiltersChange={setFilters}
                  isOpen={isOpen}
                  onToggle={toggle}
                  searchQuery={searchQuery}
                  onClearSearch={() => setSearchQuery('')}
                />
              }
              onExport={() => {
                const getTypeName = (type: VNFType) => {
                  switch(type) {
                    case 'firewall': return 'Firewall';
                    case 'sdwan': return 'SD-WAN';
                    case 'router': return 'Router';
                    case 'vnat': return 'NAT';
                    case 'custom': return 'Custom';
                    default: return type.toUpperCase();
                  }
                };
                const headers = ['Name', 'Type', 'Status'].join(',');
                const rows = filteredVNFs.map(vnf =>
                  `"${vnf.name}","${getTypeName(vnf.type)}","${vnf.status.charAt(0).toUpperCase() + vnf.status.slice(1)}"`
                );
                const csv = [headers, ...rows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'network-functions.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
            />
          </div>
          <div className="flex items-center gap-1 shrink-0 border border-fw-secondary rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grouped' ? 'bg-fw-wash text-fw-heading' : 'text-fw-disabled hover:text-fw-bodyLight'}`}
              title="Group by hub"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'flat' ? 'bg-fw-wash text-fw-heading' : 'text-fw-disabled hover:text-fw-bodyLight'}`}
              title="Flat table"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {viewMode === 'flat' ? (
          <VNFTable
            vnfs={filteredVNFs}
            hubs={hubs}
            onEdit={onEdit}
            onDelete={onDelete}
            connectionId={connectionId}
            onDetach={handleDetach}
            isDetached={isDetached}
          />
        ) : hubs.length === 0 ? (
          <VNFTable
            vnfs={filteredVNFs}
            hubs={hubs}
            onEdit={onEdit}
            onDelete={onDelete}
            connectionId={connectionId}
            onDetach={handleDetach}
            isDetached={isDetached}
          />
        ) : (
          <div className="divide-y divide-fw-secondary">
            {hubs.map(router => {
              const routerVNFs = filteredVNFs.filter(v => v.hubIds?.includes(router.id));
              const isCollapsed = collapsedRouters.has(router.id);
              return (
                <div key={router.id}>
                  <button
                    onClick={() => toggleRouter(router.id)}
                    className="w-full flex items-center gap-3 px-5 py-3 bg-fw-wash hover:bg-fw-neutral transition-colors text-left"
                  >
                    <AttIcon name="hub" className="h-4 w-4 text-fw-bodyLight shrink-0" />
                    <span className="text-figma-sm font-semibold text-fw-heading flex-1">{router.name}</span>
                    <span className={`text-figma-xs px-2 py-0.5 rounded-full font-medium ${
                      router.status === 'active' ? 'bg-fw-successLight text-fw-success' : 'bg-fw-secondary text-fw-disabled'
                    }`}>
                      {router.status}
                    </span>
                    <span className="text-figma-xs text-fw-bodyLight">{routerVNFs.length} VNF{routerVNFs.length !== 1 ? 's' : ''}</span>
                    {isCollapsed ? <ChevronDown className="h-4 w-4 text-fw-bodyLight" /> : <ChevronUp className="h-4 w-4 text-fw-bodyLight" />}
                  </button>
                  {!isCollapsed && (
                    routerVNFs.length === 0 ? (
                      <div className="px-5 py-4 text-figma-sm text-fw-disabled italic">No VNFs attached to this router</div>
                    ) : (
                      <VNFTable
                        vnfs={routerVNFs}
                        hubs={hubs}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        connectionId={connectionId}
                      />
                    )
                  )}
                </div>
              );
            })}
            {/* Unassigned VNFs */}
            {(() => {
              const unassigned = filteredVNFs.filter(v => !v.hubIds?.length || !v.hubIds.some(id => hubs.find(r => r.id === id)));
              if (unassigned.length === 0) return null;
              const isCollapsed = collapsedRouters.has('__unassigned__');
              return (
                <div>
                  <button
                    onClick={() => toggleRouter('__unassigned__')}
                    className="w-full flex items-center gap-3 px-5 py-3 bg-fw-wash hover:bg-fw-neutral transition-colors text-left"
                  >
                    <Shield className="h-4 w-4 text-fw-bodyLight shrink-0" />
                    <span className="text-figma-sm font-semibold text-fw-heading flex-1">Unassigned</span>
                    <span className="text-figma-xs text-fw-bodyLight">{unassigned.length} VNF{unassigned.length !== 1 ? 's' : ''}</span>
                    {isCollapsed ? <ChevronDown className="h-4 w-4 text-fw-bodyLight" /> : <ChevronUp className="h-4 w-4 text-fw-bodyLight" />}
                  </button>
                  {!isCollapsed && (
                    <VNFTable
                      vnfs={unassigned}
                      hubs={hubs}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      connectionId={connectionId}
                    />
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
