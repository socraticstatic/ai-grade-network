import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Eye, Play, Pause, FolderPlus, Download, Trash2, X } from 'lucide-react';
import { ConnectionTypeIcon } from '../icons/ConnectionTypeIcon';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, type FilterGroup } from '../../common/TableFilterPanel';
import { type OverflowMenuItem } from '../../common/OverflowMenu';
import { ConnectionTypeTable } from './ConnectionTypeTable';
import { ConnectionDetailDrawer } from './ConnectionDetailDrawer';
import { composeByType, HubCompositionChips, normalizeHubGroupType } from './HubCompositionChips';
import { useStore } from '../../../store/useStore';
import { getConnectionLegs } from '../../../utils/connectionLegs';
import { connectionsToCSV, exportFilename } from '../../../utils/connectionExport';
import { downloadCSV } from '../../../utils/downloadCSV';
import type { Connection } from '../../../types';

/**
 * Renders a set of connections as a SEPARATE table per connection type, each with its
 * own type-tuned columns. Provides one consistent action surface across every place
 * connections are listed (hub detail, hub list, Connections tab, pools):
 *   - robust filter toolbar (search + status/provider/type) + per-table sorting
 *   - row checkboxes → bulk actions (activate / deactivate / add to pool / export / delete)
 *   - per-group and whole-context CSV export
 *   - per-row overflow actions
 *   - row click opens an insight-rich drawer; shared peers pivot the drawer
 */

interface HubConnectionGroupsProps {
  connections: Connection[];
  showSummary?: boolean;
  showHub?: boolean;
  highlightedConnectionId?: string;
  /** Render the filter toolbar (search + status/provider/type). */
  filterable?: boolean;
  /** Enable selection checkboxes + bulk actions + row action menus. Default on. */
  actionable?: boolean;
  /**
   * Wrap each per-type group in the approved bordered card (header on top, table on a
   * subtle wash panel below a divider) — the same framing the hubs list view gives each
   * hub. Off by default so places already inside a card (the hub list) don't double-frame.
   */
  framedGroups?: boolean;
}

const STATUS_OF = (c: Connection) => (c.status === 'Provisioning' ? 'Pending' : c.status);
const PROVIDERS_OF = (c: Connection): string[] =>
  c.providers?.length ? c.providers : c.provider ? [c.provider] : getConnectionLegs(c).map((l) => l.provider);

export function HubConnectionGroups({
  connections,
  showSummary = true,
  showHub = false,
  highlightedConnectionId,
  filterable = false,
  actionable = true,
  framedGroups = false,
}: HubConnectionGroupsProps) {
  const navigate = useNavigate();
  const hubs = useStore((s) => s.hubs);
  const groupsCatalog = useStore((s) => s.groups);
  const updateConnection = useStore((s) => s.updateConnection);
  const removeConnection = useStore((s) => s.removeConnection);
  const addConnectionToGroup = useStore((s) => s.addConnectionToGroup);

  const [selected, setSelected] = useState<Connection | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const filterGroups = useMemo<FilterGroup[]>(() => {
    const statuses = [...new Set(connections.map(STATUS_OF))];
    const providers = [...new Set(connections.flatMap(PROVIDERS_OF))].sort();
    const types = [...new Set(connections.map(normalizeHubGroupType))];
    const statusColor: Record<string, 'success' | 'info' | 'default'> = { Active: 'success', Pending: 'info', Inactive: 'default' };
    return [
      { id: 'status', label: 'Status', type: 'toggle', options: statuses.map((s) => ({ value: s, label: s, color: statusColor[s] ?? 'default' })) },
      { id: 'provider', label: 'Provider', type: 'toggle', options: providers.map((p) => ({ value: p, label: p })) },
      { id: 'type', label: 'Type', type: 'toggle', options: types.map((t) => ({ value: t, label: t })) },
    ].filter((g) => g.options.length > 1);
  }, [connections]);

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({ groups: filterGroups });

  const filtered = useMemo(() => {
    const sf = filters.status ?? [], pf = filters.provider ?? [], tf = filters.type ?? [];
    const q = searchQuery.trim().toLowerCase();
    return connections.filter((c) => {
      if (sf.length && !sf.includes(STATUS_OF(c))) return false;
      if (pf.length && !PROVIDERS_OF(c).some((p) => pf.includes(p))) return false;
      if (tf.length && !tf.includes(normalizeHubGroupType(c))) return false;
      if (q) {
        const hay = `${c.name} ${c.location ?? ''} ${PROVIDERS_OF(c).join(' ')} ${c.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [connections, filters, searchQuery]);

  const groups = useMemo(() => {
    const order = composeByType(filtered).map((g) => g.type);
    return order.map((type) => ({ type, rows: filtered.filter((c) => normalizeHubGroupType(c) === type) }));
  }, [filtered]);

  // --- selection ---
  const toggleRow = (id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleGroupSel = (ids: string[], select: boolean) => setSelectedIds((prev) => {
    const n = new Set(prev); ids.forEach((id) => (select ? n.add(id) : n.delete(id))); return n;
  });
  const clearSel = () => setSelectedIds(new Set());
  const selectedConnections = filtered.filter((c) => selectedIds.has(String(c.id)));

  const toast = (title: string, message: string) =>
    (window as any).addToast?.({ type: 'success', title, message, duration: 2500 });

  // --- bulk actions ---
  const bulkStatus = async (status: Connection['status']) => {
    await Promise.all(selectedConnections.map((c) => updateConnection(String(c.id), { status })));
    toast(status === 'Active' ? 'Activated' : 'Deactivated', `${selectedConnections.length} connection${selectedConnections.length !== 1 ? 's' : ''}.`);
    clearSel();
  };
  const bulkAddToPool = async (groupId: string) => {
    if (!groupId) return;
    await Promise.all(selectedConnections.map((c) => addConnectionToGroup(groupId, String(c.id))));
    toast('Added to pool', `${selectedConnections.length} connection${selectedConnections.length !== 1 ? 's' : ''}.`);
    clearSel();
  };
  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedConnections.length} connection${selectedConnections.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    await Promise.all(selectedConnections.map((c) => removeConnection(String(c.id))));
    toast('Deleted', `${selectedConnections.length} removed.`);
    clearSel();
  };

  // --- export ---
  const exportRows = (rows: Connection[], label: string) => downloadCSV(connectionsToCSV(rows, hubs), exportFilename(label));

  // --- per-row actions ---
  const rowActions = (c: Connection): OverflowMenuItem[] => {
    const isActive = c.status === 'Active';
    const isLmcc = c.configuration?.isLmcc === true;
    return [
      { id: 'view', label: 'View details', icon: <Eye className="h-4 w-4" />, onClick: () => setSelected(c) },
      { id: 'full', label: 'Open full page', icon: <ExternalLink className="h-4 w-4" />, onClick: () => navigate(`/connections/${c.id}`) },
      // LMCC has no pause/disable at GA, and delete is a commercial event with its own
      // consequence dialog on the detail page — never a bare confirm.
      ...(isLmcc ? [] : [
        isActive
          ? { id: 'deact', label: 'Deactivate', icon: <Pause className="h-4 w-4" />, onClick: () => updateConnection(String(c.id), { status: 'Inactive' }) }
          : { id: 'act', label: 'Activate', icon: <Play className="h-4 w-4" />, onClick: () => updateConnection(String(c.id), { status: 'Active' }) },
      ]),
      { id: 'export', label: 'Export row', icon: <Download className="h-4 w-4" />, onClick: () => exportRows([c], c.name) },
      isLmcc
        ? { id: 'delete', label: 'Delete…', icon: <Trash2 className="h-4 w-4" />, variant: 'danger' as const, onClick: () => navigate(`/connections/${c.id}`) }
        : { id: 'delete', label: 'Delete', icon: <Trash2 className="h-4 w-4" />, variant: 'danger' as const, onClick: async () => { if (window.confirm(`Delete "${c.name}"?`)) { await removeConnection(String(c.id)); toast('Deleted', c.name); } } },
    ];
  };

  if (connections.length === 0) {
    return (
      <div className="rounded-lg border border-fw-secondary px-5 py-12 text-center text-figma-sm text-fw-disabled">
        No connections yet.
      </div>
    );
  }

  const selCount = selectedIds.size;

  return (
    <div className="space-y-5">
      {filterable && (
        <SearchFilterBar
          searchPlaceholder="Search connections, providers, metros…"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onFilter={toggle}
          isFilterOpen={isOpen}
          activeFilterCount={activeCount}
          onExport={() => exportRows(filtered, 'all')}
          filterPanel={
            <TableFilterPanel
              groups={filterGroups}
              activeFilters={filters}
              onFiltersChange={setFilters}
              isOpen={isOpen}
              onToggle={toggle}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
            />
          }
        />
      )}

      {showSummary && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <HubCompositionChips connections={filtered} />
          <span className="text-figma-xs text-fw-bodyLight tabular-nums">
            {filtered.length} connection{filtered.length !== 1 ? 's' : ''} across {groups.length} type{groups.length !== 1 ? 's' : ''}
            {filtered.length !== connections.length && ` (of ${connections.length})`}
          </span>
        </div>
      )}

      {/* Bulk action bar */}
      {actionable && selCount > 0 && (
        <div className="sticky top-2 z-20 flex items-center gap-2 flex-wrap rounded-xl border border-fw-active/30 bg-fw-accent px-3 py-2 shadow-sm">
          <span className="text-figma-sm font-semibold text-fw-link">{selCount} selected</span>
          <span className="h-4 w-px bg-fw-active/20" />
          <button onClick={() => bulkStatus('Active')} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-figma-xs font-medium text-fw-body hover:bg-fw-base transition-colors"><Play className="h-3.5 w-3.5" /> Activate</button>
          <button onClick={() => bulkStatus('Inactive')} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-figma-xs font-medium text-fw-body hover:bg-fw-base transition-colors"><Pause className="h-3.5 w-3.5" /> Deactivate</button>
          <label className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-figma-xs font-medium text-fw-body hover:bg-fw-base transition-colors cursor-pointer">
            <FolderPlus className="h-3.5 w-3.5" />
            <select onChange={(e) => { bulkAddToPool(e.target.value); e.target.value = ''; }} defaultValue="" className="bg-transparent text-figma-xs focus:outline-none cursor-pointer">
              <option value="" disabled>Add to pool…</option>
              {groupsCatalog.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <button onClick={() => exportRows(selectedConnections, 'selected')} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-figma-xs font-medium text-fw-body hover:bg-fw-base transition-colors"><Download className="h-3.5 w-3.5" /> Export</button>
          <button onClick={bulkDelete} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-figma-xs font-medium text-fw-error hover:bg-fw-errorLight transition-colors"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          <button onClick={clearSel} className="ml-auto inline-flex items-center gap-1 h-7 px-2 rounded-full text-figma-xs text-fw-bodyLight hover:text-fw-heading transition-colors"><X className="h-3.5 w-3.5" /> Clear</button>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-lg border border-fw-secondary px-5 py-10 text-center text-figma-sm text-fw-disabled">
          No connections match your filters.
        </div>
      ) : (
        groups.map(({ type, rows }) => {
          const header = (
            <>
              <span className="text-fw-link shrink-0">
                <ConnectionTypeIcon type={type as Connection['type']} size={16} />
              </span>
              <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.02em]">{type}</h4>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-fw-secondary text-fw-bodyLight text-[11px] font-semibold tabular-nums">
                {rows.length}
              </span>
              <button
                onClick={() => exportRows(rows, type)}
                className="ml-auto inline-flex items-center gap-1 text-figma-xs font-medium text-fw-bodyLight hover:text-fw-link transition-colors"
                title={`Export ${type}`}
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </>
          );
          const table = (
            <ConnectionTypeTable
              typeKey={type}
              connections={rows}
              onRowClick={setSelected}
              showHub={showHub}
              highlightedConnectionId={highlightedConnectionId}
              selectable={actionable}
              selectedIds={selectedIds}
              onToggleRow={toggleRow}
              onToggleGroup={toggleGroupSel}
              rowActions={actionable ? rowActions : undefined}
            />
          );

          // Framed = the approved hubs-list card: header on top, table on a wash panel
          // below a divider. Unframed = header rule + bare table sitting on the page.
          return framedGroups ? (
            <section
              key={type}
              aria-label={type}
              className="bg-fw-base rounded-2xl border border-fw-secondary shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-2 px-5 py-4">{header}</div>
              <div className="px-5 pb-5 pt-4 border-t border-fw-secondary bg-fw-wash/30">{table}</div>
            </section>
          ) : (
            <section key={type} aria-label={type}>
              <div className="flex items-center gap-2 mb-2.5">{header}</div>
              {table}
            </section>
          );
        })
      )}

      <ConnectionDetailDrawer connection={selected} onClose={() => setSelected(null)} onSelectPeer={setSelected} />
    </div>
  );
}
