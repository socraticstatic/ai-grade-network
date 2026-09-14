// src/components/connection/views/ConnectionFlatListView.tsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Settings, Trash2, ExternalLink, AlertTriangle, X, Copy } from 'lucide-react';
import { OverflowMenu } from '../../common/OverflowMenu';
import { ColumnVisibilityPopover, ColumnDefinition } from '../../common/ColumnVisibilityPopover';
import { useColumnVisibility } from '../../../hooks/useColumnVisibility';
import { useStore } from '../../../store/useStore';
import { CloudLegs } from '../CloudLegs';
import { ConnectionTypeIcon } from '../icons/ConnectionTypeIcon';
import { isC2C } from '../../../utils/connectionLegs';
import {
  getResiliency, getBgpStatus, getSlaThisMonth, getUtilization,
  getConnectionRegions, getParentHubs,
} from '../../../utils/connectionFacts';
import { BgpPill, ResiliencyBadge, SlaBadge, UtilizationMeter } from '../facts/FactBadges';
import type { Connection } from '../../../types';
import { isLmccConnection, lmccStatusLabel } from '../../../utils/lmccDisplay';
import { getMonthlyCost, formatUsd } from '../../../utils/lmccBilling';

interface ConnectionFlatListViewProps {
  connections: Connection[];
  highlightedConnectionId?: string;
}

const TABLE_ID = 'connections-list-flat';

const ALL_COLUMNS: ColumnDefinition[] = [
  { id: 'name',        label: 'Connection' },
  { id: 'provider',    label: 'Provider' },
  { id: 'type',        label: 'Type' },
  { id: 'region',      label: 'Region / Metro' },
  { id: 'hub',     label: 'Hub' },
  { id: 'bandwidth',   label: 'Bandwidth' },
  { id: 'utilization', label: 'Utilization' },
  { id: 'bgp',         label: 'BGP' },
  { id: 'sla',         label: 'SLA (mo)' },
  { id: 'resiliency',  label: 'Resiliency' },
  { id: 'cost',        label: 'Cost (mo)' },
  { id: 'status',      label: 'Status' },
  { id: 'health',      label: 'Health' },
];

const SORTABLE_COLUMNS = ['name', 'provider', 'type', 'status', 'bandwidth'];

// Fixed column widths so the table fills its container with no horizontal scroll.
const COL_WIDTH: Record<string, string> = {
  name: '15%',
  provider: '9%',
  type: '10%',
  region: '13%',
  hub: '10%',
  bandwidth: '8%',
  utilization: '10%',
  bgp: '9%',
  sla: '7%',
  resiliency: '8%',
  cost: '7%',
  status: '8%',
  health: '8%',
};

export function ConnectionFlatListView({ connections, highlightedConnectionId }: ConnectionFlatListViewProps) {
  const navigate = useNavigate();
  const { isVisible } = useColumnVisibility(TABLE_ID);
  const [sortField, setSortField] = useState<keyof Connection>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const columnButtonRef = useRef<HTMLButtonElement>(null);
  const removeConnection = useStore(state => state.removeConnection);
  const hubs = useStore(state => state.hubs);
  const [pendingDelete, setPendingDelete] = useState<Connection | null>(null);

  const displayColumns = ALL_COLUMNS.filter(col => isVisible(col.id));
  const colSpanTotal = displayColumns.length + 1;

  const handleSort = (field: keyof Connection) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedConnections = [...connections].sort((a, b) => {
    if (highlightedConnectionId) {
      if (String(a.id) === highlightedConnectionId) return -1;
      if (String(b.id) === highlightedConnectionId) return 1;
    }
    const aVal = a[sortField] ?? '';
    const bVal = b[sortField] ?? '';
    const mod = sortDirection === 'asc' ? 1 : -1;
    return aVal < bVal ? -1 * mod : aVal > bVal ? 1 * mod : 0;
  });

  const renderColumnHeader = (col: ColumnDefinition) => {
    if (!SORTABLE_COLUMNS.includes(col.id)) return <span>{col.label}</span>;
    const isSorted = sortField === col.id;
    return (
      <button
        onClick={() => handleSort(col.id as keyof Connection)}
        className="group inline-flex items-center gap-1 text-left uppercase tracking-[0.06em]"
        aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{col.label}</span>
        <span className="flex flex-col">
          <ChevronUp className={`h-3 w-3 ${isSorted && sortDirection === 'asc' ? 'text-fw-body' : 'text-fw-disabled group-hover:text-fw-bodyLight'}`} />
          <ChevronDown className={`h-3 w-3 -mt-1 ${isSorted && sortDirection === 'desc' ? 'text-fw-body' : 'text-fw-disabled group-hover:text-fw-bodyLight'}`} />
        </span>
      </button>
    );
  };

  const renderCell = (connection: Connection, columnId: string) => {
    switch (columnId) {
      case 'name':
        return (
          <div className="min-w-0">
            <div className="text-figma-sm font-semibold text-fw-heading truncate">{connection.name}</div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(String(connection.id)); window.addToast?.({ type: 'success', title: 'Copied', message: `${connection.id} copied`, duration: 2000 }); }}
              className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-mono text-fw-bodyLight hover:text-fw-link transition-colors"
              title="Copy connection ID"
            >
              {String(connection.id)}
              <Copy className="h-3 w-3" />
            </button>
          </div>
        );

      case 'provider':
        return <CloudLegs connection={connection} withLogos logoSize={18} />;

      case 'region': {
        const regions = getConnectionRegions(connection);
        const label = regions.join(' · ') || '—';
        return <span className="text-figma-xs text-fw-bodyLight tabular-nums truncate" title={label}>{label}</span>;
      }

      case 'hub': {
        const parents = getParentHubs(String(connection.id), hubs);
        if (parents.length === 0) return <span className="text-figma-xs text-fw-disabled">—</span>;
        const g = parents[0];
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/hubs/${g.id}`); }}
            className="text-figma-xs font-medium text-fw-link hover:underline truncate text-left"
            title={`Rolls up to ${g.name}`}
          >
            {g.name}{parents.length > 1 ? ` +${parents.length - 1}` : ''}
          </button>
        );
      }

      case 'utilization':
        return <UtilizationMeter pct={getUtilization(connection)} />;

      case 'bgp':
        return <BgpPill status={getBgpStatus(connection)} />;

      case 'sla':
        return <SlaBadge value={getSlaThisMonth(connection)} />;

      case 'cost': {
        const cost = getMonthlyCost(connection as any);
        return cost == null
          ? <span className="text-figma-xs text-fw-disabled">—</span>
          : <span className="text-figma-xs font-medium text-fw-body tabular-nums">{formatUsd(cost)}</span>;
      }

      case 'type':
        return (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <span className="text-fw-link shrink-0">
              <ConnectionTypeIcon type={isC2C(connection) ? 'Cloud to Cloud' : connection.type} size={16} />
            </span>
            {isC2C(connection) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-lightBlue text-fw-link shrink-0">
                C2C
              </span>
            )}
            <span className="text-figma-sm text-fw-heading truncate">{connection.type}</span>
          </span>
        );

      case 'status': {
        const s = connection.status;
        const isAws = connection.provider === 'AWS' && !isC2C(connection);
        const isDeleted = s === 'Deleted';
        const isPending = s === 'Provisioning' || s === 'Pending';
        const isActive = isAws ? (!isPending && !isDeleted) : s === 'Active';
        if (isDeleted) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-figma-xs font-medium bg-fw-secondary text-fw-disabled">
              <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-fw-disabled" />
              Deleted
            </span>
          );
        }
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-figma-xs font-medium ${
            isActive  ? 'bg-fw-successLight text-fw-success' :
            isPending ? 'bg-brand-lightBlue text-fw-link' :
                        'bg-fw-secondary text-fw-disabled'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              isActive  ? 'bg-fw-success' :
              isPending ? 'bg-fw-active animate-pulse' :
                          'bg-fw-disabled'
            }`} />
            {isLmccConnection(connection)
              ? (isActive ? 'Live' : isPending ? lmccStatusLabel(s) : 'Needs attention')
              : (isActive ? 'Active' : isPending ? 'Pending' : 'Inactive')}
          </span>
        );
      }

      // Health posture beside status for LMCC rows (tier vs health: two truths, both visible)
      case 'health': {
        if (!isLmccConnection(connection) || connection.status !== 'Active') return <span className="text-figma-xs text-fw-bodyLight">—</span>;
        const up = Number(connection.configuration?.lmccActivePaths ?? 4);
        const posture = up >= 4 ? ['bg-fw-success', 'Full'] : up === 3 ? ['bg-fw-warn', 'Reduced — healing'] : ['bg-fw-error', 'Degraded'];
        return (
          <span className="inline-flex items-center gap-1.5 text-figma-xs text-fw-body">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${posture[0]}`} />
            {posture[1]}
          </span>
        );
      }

      case 'bandwidth': {
        const bw = String(connection.bandwidth || '').split('×')[0].trim();
        return <span className="text-figma-sm font-medium text-fw-heading tabular-nums">{bw}</span>;
      }

      case 'resiliency':
        return <ResiliencyBadge level={getResiliency(connection)} />;

      default:
        return null;
    }
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    removeConnection(pendingDelete.id.toString());
    window.addToast({ type: 'success', title: 'Connection deleted', message: `${pendingDelete.name} has been removed.`, duration: 3000 });
    setPendingDelete(null);
  };

  return (
    <>
      <div className="rounded-lg border border-fw-secondary overflow-hidden">
          <table className="w-full table-fixed">
        <caption className="sr-only">Network connections</caption>
        <colgroup>
          {displayColumns.map(col => (
            <col key={col.id} style={{ width: COL_WIDTH[col.id] ?? '12%' }} />
          ))}
          <col style={{ width: '52px' }} />
        </colgroup>
        <thead className="bg-fw-wash border-b border-fw-secondary">
          <tr>
            {displayColumns.map(col => (
              <th
                key={col.id}
                scope="col"
                className="px-3 h-10 text-left text-[11px] font-semibold text-fw-bodyLight uppercase tracking-[0.06em] whitespace-nowrap align-middle"
              >
                {renderColumnHeader(col)}
              </th>
            ))}
            <th scope="col" className="relative px-5 h-10 w-14 align-middle">
              <div className="flex justify-end">
                <button
                  ref={columnButtonRef}
                  onClick={() => setShowColumnPopover(true)}
                  className="p-2 text-fw-disabled hover:text-fw-bodyLight rounded-full hover:bg-fw-wash transition-colors"
                  title="Manage columns"
                  aria-label="Manage table columns"
                >
                  <Settings className="h-5 w-5" />
                </button>
                {showColumnPopover && (
                  <ColumnVisibilityPopover
                    tableId={TABLE_ID}
                    allColumns={ALL_COLUMNS}
                    onClose={() => setShowColumnPopover(false)}
                    anchorEl={columnButtonRef.current}
                  />
                )}
              </div>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-fw-base divide-y divide-fw-secondary">
          {sortedConnections.length === 0 ? (
            <tr>
              <td colSpan={colSpanTotal} className="px-5 py-12 text-center text-figma-sm text-fw-disabled">
                No connections match your search criteria
              </td>
            </tr>
          ) : sortedConnections.map((connection, rowIndex) => (
            <tr
              key={connection.id}
              onClick={() => navigate(`/connections/${connection.id}`)}
              className={`hover:bg-fw-wash transition-colors duration-100 cursor-pointer ${
                String(connection.id) === highlightedConnectionId ? 'row-highlight' : ''
              } ${connection.status === 'Deleted' ? 'opacity-60' : ''}`}
              aria-rowindex={rowIndex + 1}
            >
              {displayColumns.map(col => (
                <td
                  key={col.id}
                  className="px-3 py-3.5 align-middle"
                >
                  <div className="min-w-0 flex items-center">{renderCell(connection, col.id)}</div>
                </td>
              ))}
              <td className="px-5 py-3.5 whitespace-nowrap w-14 align-middle">
                <div onClick={e => e.stopPropagation()} className="flex justify-end">
                  <OverflowMenu
                    items={[
                      {
                        id: 'details',
                        label: 'Details',
                        icon: <ExternalLink className="h-4 w-4" />,
                        onClick: () => navigate(`/connections/${connection.id}`),
                      },
                      {
                        id: 'copy-id',
                        label: 'Copy ID',
                        icon: <Copy className="h-4 w-4" />,
                        onClick: () => { navigator.clipboard?.writeText(String(connection.id)); window.addToast?.({ type: 'success', title: 'Copied', message: `${connection.id} copied`, duration: 2000 }); },
                      },
                      {
                        id: 'delete',
                        label: 'Delete',
                        icon: <Trash2 className="h-4 w-4" />,
                        onClick: () => setPendingDelete(connection),
                        variant: 'danger',
                      },
                    ]}
                    className="z-30 rounded-full"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
          </table>
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="bg-fw-base rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-connection-title"
          >
            <div className="px-6 pt-6 pb-5 flex items-start gap-4">
              <div className="shrink-0 h-11 w-11 rounded-full bg-fw-errorLight flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-fw-error" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="delete-connection-title" className="text-figma-lg font-bold text-fw-heading tracking-[-0.02em] leading-tight">
                  Delete this connection?
                </h2>
                <p className="text-figma-sm text-fw-body mt-2 leading-relaxed">
                  <span className="font-semibold text-fw-heading">{pendingDelete.name}</span> will be permanently removed.
                </p>
              </div>
              <button onClick={() => setPendingDelete(null)} aria-label="Dismiss" className="shrink-0 p-1.5 -mt-1 -mr-1 rounded-full text-fw-bodyLight hover:text-fw-heading hover:bg-fw-neutral transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4 bg-fw-wash border-t border-fw-secondary flex items-center justify-end gap-3">
              <button onClick={() => setPendingDelete(null)} className="h-9 px-4 rounded-full border border-fw-secondary bg-fw-base text-figma-sm font-semibold text-fw-body hover:border-fw-bodyLight hover:text-fw-heading transition-colors">Cancel</button>
              <button onClick={handleConfirmDelete} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-fw-error text-white text-figma-sm font-semibold hover:brightness-90 transition-all">
                <Trash2 className="h-3.5 w-3.5" />
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
