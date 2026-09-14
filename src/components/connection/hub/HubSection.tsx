import { useState, useMemo } from 'react';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { Button } from '../../common/Button';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { Hub } from '../../../types/hub';
import { HubCard } from './HubCard';
import { HubTable } from './HubTable';
import { VNF } from '../../../types/vnf';
import { Connection } from '../../../types';

const CR_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'toggle',
    options: [
      { value: 'active', label: 'Active', color: 'success' },
      { value: 'inactive', label: 'Inactive', color: 'warning' },
      { value: 'provisioning', label: 'Provisioning', color: 'info' },
      { value: 'error', label: 'Error', color: 'error' },
    ],
  },
];

interface HubSectionProps {
  hubs: Hub[];
  vnfs?: VNF[];
  onAdd: () => void;
  onEdit: (hub: Hub) => void;
  onDelete: (hub: Hub) => void;
  connectionId: string;
  connection?: Connection;
}

export function HubSection({
  hubs,
  vnfs = [],
  onAdd,
  onEdit,
  onDelete,
  connection
}: HubSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(hubs.map(r => r.id)));

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({
    groups: CR_FILTER_GROUPS,
  });

  // Calculate bandwidth usage
  const calculateTotalUsedBandwidth = () => {
    let totalUsed = 0;
    hubs.forEach(router => {
      if (router.links && router.links.length > 0) {
        router.links.forEach(link => {
          if (link.bandwidth) {
            const bandwidthMatch = link.bandwidth.match(/(\d+(\.\d+)?)/);
            if (bandwidthMatch) {
              totalUsed += parseFloat(bandwidthMatch[0]);
            }
          }
        });
      }
    });
    return totalUsed;
  };

  const getConnectionBandwidth = (): string => {
    return connection?.bandwidth || '10 Gbps';
  };

  const totalUsedBandwidth = calculateTotalUsedBandwidth();
  const connectionBandwidthValue = parseFloat(getConnectionBandwidth().replace(/[^\d.]/g, ''));
  const availableBandwidth = connectionBandwidthValue - totalUsedBandwidth;

  // Filter hubs
  const filteredHubs = useMemo(() => {
    const statusFilters = filters.status || [];
    return hubs.filter(router => {
      if (statusFilters.length > 0 && !statusFilters.includes(router.status)) return false;
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        router.name.toLowerCase().includes(searchLower) ||
        router.description?.toLowerCase().includes(searchLower) ||
        router.location?.toLowerCase().includes(searchLower)
      );
    });
  }, [hubs, searchQuery, filters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">Connection Hubs</h2>
          <p className="text-figma-base text-fw-bodyLight mt-1">
            Manage hubs and their network configurations
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={onAdd}>
          Add Connection Hub
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-fw-accent rounded-lg p-4 border border-fw-active">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-base font-medium text-fw-linkHover">Active Connection Hubs</p>
              <p className="text-figma-xl font-bold text-fw-linkHover mt-1">
                {hubs.filter(r => r.status === 'active').length}
              </p>
            </div>
            <AttIcon name="hub" className="h-8 w-8 text-fw-link opacity-50" />
          </div>
        </div>

        <div className="bg-fw-successLight rounded-lg p-4 border border-fw-success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-sm font-medium text-fw-heading">Total Links</p>
              <p className="text-figma-xl font-bold text-fw-success mt-1">
                {hubs.reduce((sum, r) => sum + (r.links?.length || 0), 0)}
              </p>
            </div>
            <AttIcon name="hub" className="h-8 w-8 text-fw-success opacity-50" />
          </div>
        </div>

        <div className="bg-fw-wash rounded-lg p-4 border border-fw-secondary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-base font-medium text-fw-heading">Bandwidth</p>
              <p className="text-figma-xl font-bold text-fw-body mt-1">
                {availableBandwidth.toFixed(1)} <span className="text-figma-base font-normal">Gbps free</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-figma-sm text-fw-bodyLight">{totalUsedBandwidth.toFixed(1)} used</p>
              <p className="text-figma-sm text-fw-bodyLight">{getConnectionBandwidth()} total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-lg border border-fw-secondary overflow-hidden">
        <div className="px-6 py-4 border-b border-fw-secondary flex items-center gap-3">
          <div className="flex-1">
          <SearchFilterBar
            searchPlaceholder="Search routers ..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilter={toggle}
            activeFilterCount={activeCount}
            isFilterOpen={isOpen}
            filterPanel={
              <TableFilterPanel
                groups={CR_FILTER_GROUPS}
                activeFilters={filters}
                onFiltersChange={setFilters}
                isOpen={isOpen}
                onToggle={toggle}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            }
            onExport={() => window.addToast?.({ type: 'success', title: 'Exported', message: 'Hubs exported', duration: 3000 })}
          />
          </div>
          <div className="flex items-center gap-1 shrink-0 border border-fw-secondary rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'card' ? 'bg-fw-wash text-fw-heading' : 'text-fw-disabled hover:text-fw-bodyLight'}`}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-fw-wash text-fw-heading' : 'text-fw-disabled hover:text-fw-bodyLight'}`}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filteredHubs.length === 0 ? (
          <div className="text-center py-16">
            <AttIcon name="hub" className="h-12 w-12 mx-auto text-fw-bodyLight mb-4" />
            <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] mb-2">
              {searchQuery ? 'No connection hubs found' : 'No connection hubs'}
            </h3>
            <p className="text-fw-bodyLight mb-6">
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first hub'}
            </p>
            {!searchQuery && (
              <Button variant="primary" icon={Plus} onClick={onAdd}>
                Add Connection Hub
              </Button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <HubTable
            hubs={filteredHubs}
            vnfs={vnfs}
            onEdit={onEdit}
            onDelete={onDelete}
            connectionBandwidth={getConnectionBandwidth()}
            usedBandwidth={totalUsedBandwidth}
          />
        ) : (
          <div className="divide-y divide-fw-secondary">
            {filteredHubs.map(router => (
              <div key={router.id} className="p-4">
                <HubCard
                  hub={router}
                  vnfs={vnfs}
                  onEdit={() => onEdit(router)}
                  onDelete={() => onDelete(router)}
                  isExpanded={expandedIds.has(router.id)}
                  onToggleExpand={() => toggleExpand(router.id)}
                  connectionBandwidth={getConnectionBandwidth()}
                  usedBandwidth={totalUsedBandwidth}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
