import { useState, useMemo } from 'react';
import { Server, MapPin, Download, Plus } from 'lucide-react';
import { IPE } from '../../types/ipe';
import { IPECard } from './IPECard';
import { Button } from '../common/Button';
import { SearchFilterBar } from '../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../common/TableFilterPanel';

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'provider',
    label: 'Data Center Provider',
    type: 'select',
    placeholder: 'All Providers',
    options: [
      { value: 'Equinix', label: 'Equinix' },
      { value: 'Cisco Jasper', label: 'Cisco Jasper' },
      { value: 'Databank', label: 'Databank' },
      { value: 'CoreWeave', label: 'CoreWeave' },
    ],
  },
  {
    id: 'region',
    label: 'Region',
    type: 'select',
    placeholder: 'All Regions',
    options: [
      { value: 'US East', label: 'US East' },
      { value: 'US West', label: 'US West' },
      { value: 'Europe', label: 'Europe' },
      { value: 'Asia Pacific', label: 'Asia Pacific' },
      { value: 'Latin America', label: 'Latin America' },
      { value: 'Middle East', label: 'Middle East' },
    ],
  },
];

interface IPEListProps {
  ipes: IPE[];
  onIPEClick?: (ipe: IPE) => void;
  onAddIPE?: () => void;
}

export function IPEList({ ipes, onIPEClick, onAddIPE }: IPEListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({ groups: FILTER_GROUPS });

  const filteredIPEs = useMemo(() => {
    return ipes.filter(ipe => {
      const matchesSearch =
        ipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ipe.location.toLowerCase().includes(searchQuery.toLowerCase());

      const providerFilters = filters['provider'] || [];
      const matchesProvider = providerFilters.length === 0 || providerFilters.includes(ipe.dataCenterProvider);

      const regionFilters = filters['region'] || [];
      const matchesRegion = regionFilters.length === 0 || regionFilters.includes(ipe.region);

      return matchesSearch && matchesProvider && matchesRegion;
    });
  }, [ipes, searchQuery, filters]);

  const totalCapacity = ipes.reduce((sum, ipe) => {
    const capacity = parseFloat(ipe.installedCapacity.replace(/[^0-9.]/g, ''));
    return sum + (isNaN(capacity) ? 0 : capacity);
  }, 0);

  const avgUtilization = ipes.length > 0
    ? ipes.reduce((sum, ipe) => sum + ipe.utilization, 0) / ipes.length
    : 0;

  const criticalIPEs = ipes.filter(ipe => ipe.utilization >= 85).length;

  return (
    <div className="space-y-6">
      <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-fw-accent rounded-lg">
              <Server className="h-6 w-6 text-fw-link" />
            </div>
            <div>
              <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">Infrastructure Provider Edge Routers</h2>
              <p className="text-figma-base font-medium text-fw-body mt-0.5">Physical network infrastructure at data center locations</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={() => {
                window.addToast({
                  type: 'success',
                  title: 'Export Complete',
                  message: 'IPE data exported successfully',
                  duration: 3000
                });
              }}
            >
              Export
            </Button>
            {onAddIPE && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={onAddIPE}
              >
                Add IPE
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-fw-wash rounded-lg p-4">
            <div className="text-figma-base text-fw-bodyLight mb-1">Total IPEs</div>
            <div className="text-2xl font-bold text-fw-heading">{ipes.length}</div>
          </div>
          <div className="bg-fw-wash rounded-lg p-4">
            <div className="text-figma-base text-fw-bodyLight mb-1">Total Capacity</div>
            <div className="text-2xl font-bold text-fw-heading">{totalCapacity.toFixed(1)} Tbps</div>
          </div>
          <div className="bg-fw-wash rounded-lg p-4">
            <div className="text-figma-base text-fw-bodyLight mb-1">Avg Utilization</div>
            <div className="text-2xl font-bold text-fw-heading">{avgUtilization.toFixed(0)}%</div>
          </div>
          <div className="bg-fw-wash rounded-lg p-4">
            <div className="text-figma-base text-fw-bodyLight mb-1">At Capacity</div>
            <div className="text-2xl font-bold text-fw-error">{criticalIPEs}</div>
          </div>
        </div>

        <SearchFilterBar
          searchPlaceholder="Search IPEs by name or location..."
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

      {filteredIPEs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIPEs.map(ipe => (
            <IPECard
              key={ipe.id}
              ipe={ipe}
              onClick={() => onIPEClick?.(ipe)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-fw-base rounded-2xl border border-fw-secondary p-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-fw-bodyLight mb-4" />
          <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-1">No IPEs Found</h3>
          <p className="text-fw-bodyLight">
            {searchQuery || activeCount > 0
              ? 'Try adjusting your filters'
              : 'No infrastructure provider edge routers configured yet'}
          </p>
        </div>
      )}
    </div>
  );
}
