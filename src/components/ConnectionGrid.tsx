// src/components/ConnectionGrid.tsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GridView } from './connection/views/GridView';
import { ListView } from './connection/views/ListView';
import { TopologyView } from './connection/views/TopologyView';
import { ConnectionFlatGridView } from './connection/views/ConnectionFlatGridView';
import { HubConnectionGroups } from './connection/hub/HubConnectionGroups';
import { ConnectionFlatTopologyView } from './connection/views/ConnectionFlatTopologyView';
import { MobileConnectionGrid } from './connection/MobileConnectionGrid';
import { useRef } from 'react';
import { LayoutGrid, List, Network, Minimize2, Maximize2, PlusCircle, SlidersHorizontal } from 'lucide-react';
import { ColumnVisibilityPopover } from './common/ColumnVisibilityPopover';
import { CONN_CARD_FIELDS } from './connection/facts/cardFields';
import { GW_CARD_FIELDS } from './connection/facts/hubCardFields';
import { ViewMode } from '../types';
import { Button } from './common/Button';
import { SearchFilterBar } from './common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from './common/TableFilterPanel';
import { useStore } from '../store/useStore';
import { getConnectionLegs } from '../utils/connectionLegs';
import { useIsMobile } from '../hooks/useMobileDetection';
import { usePermission } from '../hooks/usePermission';
import { CreateConnectionMenu } from './connection/CreateConnectionMenu';
import type { Hub } from '../types/hub';

interface ConnectionGridProps {
  routers: Hub[];
  viewEntity: 'routers' | 'connections';
}

function EmptyFilterState({
  entity,
  hasCriteria,
  onClear,
}: {
  entity: 'connections' | 'hubs';
  hasCriteria: boolean;
  onClear: () => void;
}) {
  return (
    <div className="text-center py-12">
      <p className="text-fw-disabled">
        {hasCriteria ? `No ${entity} match your filters` : `No ${entity} yet`}
      </p>
      {hasCriteria && (
        <button
          onClick={onClear}
          className="mt-2 text-figma-sm font-medium text-fw-link hover:underline"
        >
          Clear search and filters
        </button>
      )}
    </div>
  );
}

export function ConnectionGrid({ routers, viewEntity }: ConnectionGridProps) {
  const connections = useStore(state => state.connections);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const highlightedConnectionId = (location.state as any)?.highlightedConnectionId as string | undefined;
  // Default to small (minimized) cards unless a caller explicitly requests a view
  // (e.g. the create flow navigates with viewMode: 'list' to highlight the new row).
  const initialViewMode = ((location.state as any)?.viewMode as ViewMode | undefined) ?? 'grid';
  const canCreate = usePermission('create');

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  // Cards start compact (mini cards); "Expand All" opens them to full cards.
  const [areAllMinimized, setAreAllMinimized] = useState(true);
  const [showCardFields, setShowCardFields] = useState(false);
  const cardFieldsBtnRef = useRef<HTMLButtonElement>(null);

  const routerFilterGroups = useMemo<FilterGroup[]>(() => [
    {
      id: 'status',
      label: 'Status',
      type: 'checkbox' as const,
      options: [
        { value: 'active',       label: 'Active',       color: 'success' as const },
        { value: 'inactive',     label: 'Inactive',     color: 'warning' as const },
        { value: 'provisioning', label: 'Provisioning' },
        { value: 'error',        label: 'Error'         },
      ],
    },
    {
      id: 'location',
      label: 'Location',
      type: 'checkbox' as const,
      options: Array.from(new Set(routers.map(r => r.location))).map(l => ({ value: l, label: l })),
    },
  ], [routers]);

  const connectionFilterGroups = useMemo<FilterGroup[]>(() => [
    {
      id: 'status',
      label: 'Status',
      type: 'checkbox' as const,
      options: [
        { value: 'Active',       label: 'Active / Live',       color: 'success' as const },
        { value: 'Inactive',     label: 'Inactive / Needs attention',     color: 'warning' as const },
        { value: 'Pending',      label: 'Pending' },
        { value: 'Provisioning', label: 'Provisioning' },
      ],
    },
    {
      id: 'type',
      label: 'Connection Type',
      type: 'checkbox' as const,
      options: Array.from(new Set(connections.map(c => c.type))).map(t => ({ value: t, label: t })),
    },
    {
      id: 'provider',
      label: 'Cloud Provider',
      type: 'checkbox' as const,
      // Every distinct cloud across all legs — so a C2C connection surfaces under each of its clouds.
      options: Array.from(new Set(connections.flatMap(c => getConnectionLegs(c).map(l => l.provider))))
        .filter(Boolean)
        .map(p => ({ value: p, label: p })),
    },
    {
      id: 'location',
      label: 'Location',
      type: 'checkbox' as const,
      // Every distinct metro across all legs — multi-location connections appear under each metro.
      options: Array.from(new Set(connections.flatMap(c => {
        const legLocs = getConnectionLegs(c).map(l => l.location).filter(Boolean) as string[];
        return legLocs.length ? legLocs : (c.locations?.length ? c.locations : [c.location]);
      }))).map(l => ({ value: l, label: l })),
    },
  ], [connections]);

  const activeFilterGroups = viewEntity === 'routers' ? routerFilterGroups : connectionFilterGroups;

  const { filters, setFilters, isOpen, toggle, activeCount, resetFilters } = useTableFilters({
    groups: activeFilterGroups,
  });

  // Hubs and Connections share this grid but use different filter vocabularies
  // (e.g. hub status 'active' vs connection status 'Active'). A filter carried
  // across the switch matches nothing and can't be seen — clear on entity change.
  useEffect(() => {
    resetFilters();
  }, [viewEntity, resetFilters]);

  const filteredConnections = useMemo(() => {
    return connections.filter(c => {
      const legs = getConnectionLegs(c);
      const statusFilters = filters.status || [];
      if (statusFilters.length > 0 && !statusFilters.includes(c.status)) return false;
      const typeFilters = filters.type || [];
      if (typeFilters.length > 0 && !typeFilters.includes(c.type)) return false;
      const providerFilters = filters.provider || [];
      if (providerFilters.length > 0 && !legs.some(l => providerFilters.includes(l.provider))) return false;
      const locationFilters = filters.location || [];
      if (locationFilters.length > 0) {
        const locs = legs.map(l => l.location).filter(Boolean) as string[];
        const allLocs = locs.length ? locs : (c.locations?.length ? c.locations : [c.location]);
        if (!allLocs.some(l => locationFilters.includes(l))) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = c.name.toLowerCase().includes(q) ||
          legs.some(l => l.provider.toLowerCase().includes(q)) ||
          c.type.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [connections, searchQuery, filters]);

  const filteredRouters = useMemo(() => {
    return routers.filter(router => {
      const statusFilters = filters.status || [];
      if (statusFilters.length > 0 && !statusFilters.includes(router.status)) return false;

      const locationFilters = filters.location || [];
      if (locationFilters.length > 0 && !locationFilters.includes(router.location)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const routerMatch =
          router.name.toLowerCase().includes(q) ||
          router.location.toLowerCase().includes(q);

        const childMatch = connections
          .filter(c => router.connectionIds.includes(c.id))
          .some(c =>
            c.name.toLowerCase().includes(q) ||
            (c.provider ?? '').toLowerCase().includes(q) ||
            c.type.toLowerCase().includes(q)
          );

        if (!routerMatch && !childMatch) return false;
      }

      return true;
    });
  }, [routers, connections, searchQuery, filters]);

  if (isMobile) {
    return <MobileConnectionGrid connections={connections} />;
  }

  return (
    <div className="space-y-6 min-h-[calc(100vh-16rem)] pb-12">
      <div>
      <div className="flex items-center space-x-4 max-w-full">
        <div className="flex-1">
          <SearchFilterBar
            searchPlaceholder={viewEntity === 'routers' ? 'Search hubs and connections...' : 'Search connections...'}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilter={toggle}
            activeFilterCount={activeCount}
            isFilterOpen={isOpen}
            onExport={() => {
              let rows: string[][];
              let filename: string;
              if (viewEntity === 'connections') {
                rows = [['Connection', 'Provider', 'Type', 'Status', 'Bandwidth', 'Location']];
                filteredConnections.forEach(c => {
                  rows.push([c.name, c.provider ?? '', c.type, c.status, c.bandwidth, c.location]);
                });
                filename = 'connections.csv';
              } else {
                rows = [['Hub', 'Location', 'Status', 'Connection', 'Provider', 'Type', 'Bandwidth']];
                filteredRouters.forEach(router => {
                  const routerConns = connections.filter(c => router.connectionIds.includes(c.id));
                  routerConns.forEach(c => {
                    rows.push([router.name, router.location, router.status, c.name, c.provider ?? '', c.type, c.bandwidth]);
                  });
                });
                filename = 'hubs.csv';
              }
              const esc = (v: string) => /[,"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
              const csv = rows.map(r => r.map(esc).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = filename;
              link.click();
              URL.revokeObjectURL(url);
              window.addToast({ type: 'success', title: 'Export Complete', message: 'Exported successfully', duration: 3000 });
            }}
            actions={
              viewMode === 'grid' ? (
                <Button
                  variant="ghost"
                  icon={areAllMinimized ? Maximize2 : Minimize2}
                  onClick={() => setAreAllMinimized(!areAllMinimized)}
                  size="md"
                >
                  {areAllMinimized ? 'Expand All' : 'Minimize All'}
                </Button>
              ) : null
            }
          />
        </div>

        <div className="h-6 w-px bg-fw-secondary" />

        {/* View mode toggle */}
        <div className="flex items-center bg-fw-base rounded-lg border border-fw-secondary p-1">
          {(['grid', 'list', 'topology'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`quick-action-btn p-2 transition-colors ${viewMode === mode ? 'text-white bg-fw-primary' : 'text-fw-disabled hover:text-fw-bodyLight'}`}
              title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`}
            >
              {mode === 'grid'     && <LayoutGrid className="h-4 w-4" />}
              {mode === 'list'     && <List className="h-4 w-4" />}
              {mode === 'topology' && <Network className="h-4 w-4" />}
            </button>
          ))}
        </div>

        {/* The Fields gear ('conn-card' scope) is one control across connection cards AND
            the list-view per-type tables. Show it:
              - in grid, except when connection cards are minimized (mini is a locked layout)
              - in list, for connections, where it drives the table columns
            Hub grid keeps its own ('gw-card') gear; the hubs list uses the connection tables. */}
        {((viewMode === 'grid' && (viewEntity === 'routers' || !areAllMinimized)) ||
          (viewMode === 'list' && viewEntity === 'connections')) && (
          <>
            <div className="relative">
              <button
                ref={cardFieldsBtnRef}
                onClick={() => setShowCardFields(v => !v)}
                className="flex items-center gap-2 h-9 px-3 rounded-lg border border-fw-secondary text-figma-sm font-medium text-fw-body hover:bg-fw-wash transition-colors"
                title="Choose which fields show on cards"
                aria-haspopup="dialog"
                aria-expanded={showCardFields}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Fields
              </button>
              {showCardFields && (
                <ColumnVisibilityPopover
                  tableId={viewEntity === 'routers' ? 'gw-card' : 'conn-card'}
                  allColumns={viewEntity === 'routers' ? GW_CARD_FIELDS : CONN_CARD_FIELDS}
                  onClose={() => setShowCardFields(false)}
                  anchorEl={cardFieldsBtnRef.current}
                />
              )}
            </div>
            <div className="h-6 w-px bg-fw-secondary" />
          </>
        )}

        {canCreate && <CreateConnectionMenu />}
      </div>

      {/* Filter panel spans the full toolbar width so opening it never displaces the view controls */}
      <TableFilterPanel
        groups={activeFilterGroups}
        activeFilters={filters}
        onFiltersChange={setFilters}
        isOpen={isOpen}
        onToggle={toggle}
        searchQuery={searchQuery}
        onClearSearch={() => setSearchQuery('')}
        resultCount={viewEntity === 'connections' ? filteredConnections.length : filteredRouters.length}
        totalCount={viewEntity === 'connections' ? connections.length : routers.length}
      />
      </div>

      <div>
        {viewEntity === 'connections' ? (
          filteredConnections.length === 0 ? (
            <EmptyFilterState
              entity="connections"
              hasCriteria={activeCount > 0 || !!searchQuery.trim()}
              onClear={() => { resetFilters(); setSearchQuery(''); }}
            />
          ) : viewMode === 'topology' ? (
            <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
              <ConnectionFlatTopologyView connections={filteredConnections} />
            </div>
          ) : viewMode === 'list' ? (
            // LIST = per-type grouped tables (type-specific columns) with a Hub column,
            // opening the right-hand drawer on row click — the analog of the hubs list view.
            <HubConnectionGroups connections={filteredConnections} showHub framedGroups highlightedConnectionId={highlightedConnectionId} />
          ) : (
            // GRID = connection cards; "Minimize/Expand All" toggles mini vs full, and the
            // Fields gear drives which facts show — same card model as the hubs grid view.
            <ConnectionFlatGridView connections={filteredConnections} isMinimized={areAllMinimized} />
          )
        ) : (
          filteredRouters.length === 0 ? (
            <EmptyFilterState
              entity="hubs"
              hasCriteria={activeCount > 0 || !!searchQuery.trim()}
              onClear={() => { resetFilters(); setSearchQuery(''); }}
            />
          ) : viewMode === 'list' ? (
            <ListView routers={filteredRouters} highlightedConnectionId={highlightedConnectionId} />
          ) : viewMode === 'topology' ? (
            <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
              <TopologyView routers={filteredRouters} />
            </div>
          ) : (
            <GridView routers={filteredRouters} isMinimized={areAllMinimized} />
          )
        )}
      </div>
    </div>
  );
}
