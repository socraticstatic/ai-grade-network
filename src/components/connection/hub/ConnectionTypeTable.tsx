import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { CloudLegs } from '../CloudLegs';
import { OverflowMenu, type OverflowMenuItem } from '../../common/OverflowMenu';
import { useStore } from '../../../store/useStore';
import { useColumnVisibility } from '../../../hooks/useColumnVisibility';
import { isC2C, getConnectionLegs } from '../../../utils/connectionLegs';
import {
  getResiliency, getSlaThisMonth, getUtilization, getFacility, getParentHubs,
  getConnectionRegions, getBgpStatus,
} from '../../../utils/connectionFacts';
import { BgpPill, ResiliencyBadge, SlaBadge, UtilizationMeter } from '../facts/FactBadges';
import { CONN_CARD_FIELDS } from '../facts/cardFields';
import { getMonthlyCost, formatUsd } from '../../../utils/lmccBilling';
import { displayStatus } from '../../../utils/lmccDisplay';
import type { Connection } from '../../../types';

/**
 * A table whose columns are tuned to ONE connection type. Different types carry
 * disparate attributes (a C2C row shows source⇄dest endpoints; a VPN row shows tunnel
 * + peer IP; a DC row shows the cross-connect facility), so each type keeps its own
 * signature columns. The SHARED data columns (provider, bandwidth, utilization, SLA,
 * region, …) are driven by the same 'conn-card' visibility scope as the connection
 * cards' Fields gear — one control, one mental model across cards and tables. Provider-
 * specific credentials (OCID, service key, …) live in the per-connection detail pane.
 */

type ColId =
  | 'name' | 'hub' | 'providers' | 'legs' | 'vif' | 'encryption' | 'tunnel' | 'peer'
  | 'facility' | 'sdwan' | 'region' | 'bandwidth' | 'cost' | 'util' | 'sla' | 'resiliency'
  | 'bgp' | 'id' | 'pool' | 'status' | 'health';

const LABELS: Record<ColId, string> = {
  name: 'Connection', hub: 'Hub', providers: 'Provider(s)', legs: 'Endpoints', vif: 'VIF / Access',
  encryption: 'Encryption', tunnel: 'Tunnel', peer: 'Peer IP', facility: 'Facility',
  sdwan: 'SD-WAN', region: 'Region / Metro', bandwidth: 'Bandwidth', util: 'Utilization',
  sla: 'SLA (mo)', resiliency: 'Resiliency', bgp: 'BGP', id: 'Connection ID', pool: 'Pool',
  status: 'Status', cost: 'Cost (mo)', health: 'Health',
};

// Type-defining columns that always render for a type. `name` and `status` are universal
// (added separately); everything else is a shared data column driven by the Fields gear.
const SIGNATURE_BY_TYPE: Record<string, ColId[]> = {
  'Internet to Cloud': ['vif'],
  // Two truths, both visible: tier is the promise, health is how well it's kept right now.
  'AWS Last Mile': ['health'],
  'Cloud to Cloud': ['legs', 'encryption'],
  'VPN to Cloud': ['tunnel', 'peer'],
  'DataCenter/CoLocation to Cloud': ['facility'],
  'Site to Cloud': ['sdwan'],
};

// Maps a 'conn-card' Fields id to the table column it controls. 'hub' is positioned
// separately (right after the name), so it's handled outside this map.
const FIELD_TO_COL: Record<string, ColId> = {
  provider: 'providers', id: 'id', region: 'region', bandwidth: 'bandwidth',
  utilization: 'util', bgp: 'bgp', sla: 'sla', resiliency: 'resiliency', pool: 'pool',
  cost: 'cost',
};

// Canonical left-to-right column order, independent of the gear's toggle order.
const CANONICAL_ORDER: ColId[] = [
  'name', 'hub', 'providers', 'legs', 'vif', 'tunnel', 'peer', 'encryption', 'facility',
  'sdwan', 'region', 'bandwidth', 'cost', 'util', 'sla', 'resiliency', 'bgp', 'id', 'pool', 'status', 'health',
];

function cfg(c: Connection, key: string): string {
  const v = c.configuration?.[key];
  return v == null || v === '' ? '—' : String(v);
}

function StatusCell({ connection }: { connection: Connection }) {
  const s = connection.status;
  const isLmcc = connection.configuration?.isLmcc === true;
  if (isLmcc && displayStatus(connection) === 'Expired') {
    return (
      <span className="inline-flex items-center gap-1.5 text-figma-xs font-medium truncate text-fw-disabled">
        <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-fw-disabled" />
        Expired
      </span>
    );
  }
  const isAws = connection.provider === 'AWS' && !isC2C(connection);
  const isPending = s === 'Provisioning' || s === 'Pending';
  const isDeleting = s === 'Deleting' || s === 'Deleted';
  const isActive = !isDeleting && (isAws ? !isPending : s === 'Active');
  const label = isDeleting ? (s === 'Deleting' ? 'Deleting…' : 'Deleted')
    : isActive ? (isLmcc ? 'Live' : 'Active')
    : isPending ? (isLmcc ? 'Provisioning' : 'Pending')
    : isLmcc ? 'Needs attention' : 'Inactive';
  return (
    <span className={`inline-flex items-center gap-1.5 text-figma-xs font-medium truncate ${
      isActive ? 'text-fw-success' : isPending ? 'text-fw-link' : 'text-fw-disabled'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? 'bg-fw-success' : isPending ? 'bg-fw-active animate-pulse' : 'bg-fw-disabled'}`} />
      {label}
    </span>
  );
}

function LegsCell({ connection }: { connection: Connection }) {
  const legs = getConnectionLegs(connection);
  if (legs.length < 2) return <CloudLegs connection={connection} withLogos logoSize={18} />;
  return (
    <span className="inline-flex items-center gap-1.5 text-figma-sm text-fw-heading">
      <span className="font-medium">{legs[0].provider}</span>
      <span className="text-fw-bodyLight">⇄</span>
      <span className="font-medium">{legs.slice(1).map((l) => l.provider).join(', ')}</span>
    </span>
  );
}

interface ConnectionTypeTableProps {
  typeKey: string;
  connections: Connection[];
  /** Row click handler. When provided (e.g. to open a drawer), used instead of navigating. */
  onRowClick?: (connection: Connection) => void;
  /** Show a "Hub" column — used when grouping spans multiple hubs (Connections tab, pools, groups). */
  showHub?: boolean;
  /** Highlight the row for this connection id. */
  highlightedConnectionId?: string;
  /** Enable a leading selection checkbox column (bulk actions). */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  /** Select/clear every row in this group; receives the group's ids. */
  onToggleGroup?: (ids: string[], select: boolean) => void;
  /** Per-row overflow actions. When provided, renders a trailing actions column. */
  rowActions?: (connection: Connection) => OverflowMenuItem[];
}

function parseBandwidth(s?: string): number {
  const m = String(s ?? '').match(/([\d.]+)\s*(tbps|gbps|mbps)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  return u === 'tbps' ? n * 1e6 : u === 'gbps' ? n * 1000 : n;
}

export function ConnectionTypeTable({
  typeKey, connections, onRowClick, showHub = false, highlightedConnectionId,
  selectable = false, selectedIds, onToggleRow, onToggleGroup, rowActions,
}: ConnectionTypeTableProps) {
  const navigate = useNavigate();
  const hubs = useStore((s) => s.hubs);
  const { visibleColumns: fields } = useColumnVisibility('conn-card');
  const groupIds = connections.map((c) => String(c.id));
  const allSelected = selectable && groupIds.length > 0 && groupIds.every((id) => selectedIds?.has(id));
  const someSelected = selectable && groupIds.some((id) => selectedIds?.has(id)) && !allSelected;
  const [sortCol, setSortCol] = useState<ColId | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Compose columns: name + type signature + status are structural; the shared data
  // columns come from the 'conn-card' Fields gear, so cards and tables move together.
  const columns: ColId[] = useMemo(() => {
    const on = (id: string) => fields.length === 0 || fields.includes(id);
    const isC2CType = typeKey === 'Cloud to Cloud';
    const set = new Set<ColId>(['name', 'status']);
    if (showHub && on('hub')) set.add('hub');
    (SIGNATURE_BY_TYPE[typeKey] ?? []).forEach((c) => set.add(c));
    CONN_CARD_FIELDS.forEach((f) => {
      if (f.id === 'hub' || !on(f.id)) return;
      const col = FIELD_TO_COL[f.id];
      // C2C shows its clouds through the structural 'legs' column, so skip 'providers'.
      if (!col || (isC2CType && col === 'providers')) return;
      set.add(col);
    });
    return CANONICAL_ORDER.filter((c) => set.has(c));
  }, [fields, showHub, typeKey]);

  const sortValue = (c: Connection, col: ColId): string | number => {
    switch (col) {
      case 'bandwidth': return parseBandwidth(c.bandwidth);
      case 'util': return getUtilization(c);
      case 'sla': return parseFloat(String(getSlaThisMonth(c)).replace(/[^\d.]/g, '')) || 0;
      case 'name': return c.name.toLowerCase();
      case 'hub': return (getParentHubs(String(c.id), hubs)[0]?.name ?? '').toLowerCase();
      case 'providers': case 'legs': return (c.providers?.join(',') ?? c.provider ?? getConnectionLegs(c).map((l) => l.provider).join(',')).toLowerCase();
      case 'resiliency': return String(getResiliency(c)).toLowerCase();
      case 'status': return String(c.status).toLowerCase();
      case 'facility': return String(getFacility(c.location) ?? '').toLowerCase();
      case 'region': return getConnectionRegions(c).join(',').toLowerCase();
      case 'bgp': return getBgpStatus(c) === 'Up' ? 0 : 1;
      case 'id': return String(c.id).toLowerCase();
      case 'pool': return String(c.poolName ?? c.pool ?? '').toLowerCase();
      default: return String(cfg(c, col === 'vif' ? 'vifType' : col === 'tunnel' ? 'tunnelProtocol' : col === 'peer' ? 'peerIp' : col === 'encryption' ? 'encryptionMode' : col === 'sdwan' ? 'sdwanRole' : col)).toLowerCase();
    }
  };

  const sorted = useMemo(() => {
    if (!sortCol) return connections;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...connections].sort((a, b) => {
      const av = sortValue(a, sortCol), bv = sortValue(b, sortCol);
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, sortCol, sortDir]);

  const onSort = (col: ColId) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const renderCell = (c: Connection, col: ColId) => {
    switch (col) {
      case 'name':
        return <span className="text-figma-sm font-semibold text-fw-heading truncate">{c.name}</span>;
      case 'hub': {
        const parents = getParentHubs(String(c.id), hubs);
        if (parents.length === 0) return <span className="text-figma-xs text-fw-disabled">—</span>;
        const h = parents[0];
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/hubs/${h.id}`); }}
            className="text-figma-xs font-medium text-fw-link hover:underline truncate text-left"
            title={`Rolls up to ${h.name}`}
          >
            {h.name}{parents.length > 1 ? ` +${parents.length - 1}` : ''}
          </button>
        );
      }
      case 'providers':
        return <CloudLegs connection={c} withLogos logoSize={18} />;
      case 'legs':
        return <LegsCell connection={c} />;
      case 'vif':
        return <span className="text-figma-xs text-fw-bodyLight">{cfg(c, 'vifType') !== '—' ? cfg(c, 'vifType') : cfg(c, 'serviceAccessType')}</span>;
      case 'encryption': {
        const m = cfg(c, 'encryptionMode');
        return <span className="text-figma-xs font-medium text-fw-body uppercase">{m}</span>;
      }
      case 'tunnel':
        return <span className="text-figma-xs font-medium text-fw-body uppercase">{cfg(c, 'tunnelProtocol')}</span>;
      case 'peer':
        return <span className="text-figma-xs font-mono text-fw-bodyLight">{cfg(c, 'peerIp')}</span>;
      case 'facility':
        return <span className="text-figma-xs text-fw-bodyLight truncate">{getFacility(c.location) ?? '—'}</span>;
      case 'sdwan':
        return <span className="text-figma-xs text-fw-bodyLight">{cfg(c, 'sdwanRole')}</span>;
      case 'bandwidth':
        return <span className="text-figma-sm font-medium text-fw-heading tabular-nums">{String(c.bandwidth || '').split('×')[0].trim()}</span>;
      case 'util':
        return <UtilizationMeter pct={getUtilization(c)} />;
      case 'sla':
        return <SlaBadge value={getSlaThisMonth(c)} />;
      case 'resiliency':
        return <ResiliencyBadge level={getResiliency(c)} />;
      case 'cost': {
        const cost = getMonthlyCost(c as any);
        return cost == null
          ? <span className="text-figma-xs text-fw-disabled">—</span>
          : <span className="text-figma-xs font-medium text-fw-body tabular-nums">{formatUsd(cost)}</span>;
      }
      case 'health': {
        if (c.configuration?.isLmcc !== true || c.status !== 'Active') return <span className="text-figma-xs text-fw-disabled">—</span>;
        const up = Number(c.configuration?.lmccActivePaths ?? 4);
        const [dot, label] = up >= 4 ? ['bg-fw-success', 'Full'] : up === 3 ? ['bg-fw-warn', 'Reduced — healing'] : ['bg-fw-error', 'Degraded'];
        return (
          <span className="inline-flex items-center gap-1.5 text-figma-xs text-fw-body">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
            {label}
          </span>
        );
      }
      case 'bgp':
        return <BgpPill status={getBgpStatus(c)} />;
      case 'region': {
        const rs = getConnectionRegions(c);
        if (rs.length === 0) return <span className="text-figma-xs text-fw-disabled">—</span>;
        const text = rs.length === 1 ? rs[0] : `${rs[0]} +${rs.length - 1}`;
        return <span className="text-figma-xs text-fw-bodyLight tabular-nums truncate" title={rs.join(' · ')}>{text}</span>;
      }
      case 'id':
        return <span className="text-figma-xs font-mono text-fw-bodyLight truncate">{String(c.id)}</span>;
      case 'pool':
        return <span className="text-figma-xs text-fw-bodyLight truncate">{c.poolName || c.pool || '—'}</span>;
      case 'status':
        return <StatusCell connection={c} />;
      default:
        return null;
    }
  };

  // Fixed layout so the columns always fit the available width and truncate — never a
  // horizontal scrollbar, never a boxed/clipped container. Just a header rule + row dividers.
  const colWidth = (col: ColId): string =>
    col === 'name' ? 'w-[24%]' : col === 'legs' ? 'w-[20%]' : col === 'hub' ? 'w-[13%]' : '';

  return (
    <table className="w-full table-fixed">
      <thead className="border-b border-fw-secondary">
        <tr>
          {selectable && (
            <th scope="col" className="w-8 px-2 h-10 align-middle">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={(e) => onToggleGroup?.(groupIds, e.target.checked)}
                className="h-3.5 w-3.5 rounded border-fw-secondary text-fw-primary focus:ring-fw-active cursor-pointer"
                aria-label="Select all in group"
              />
            </th>
          )}
          {columns.map((col) => {
            const active = sortCol === col;
            return (
              <th key={col} scope="col" className={`px-3 h-10 text-left text-[11px] font-semibold text-fw-bodyLight uppercase tracking-[0.06em] ${colWidth(col)}`}>
                <button
                  type="button"
                  onClick={() => onSort(col)}
                  className="group inline-flex items-center gap-1 hover:text-fw-body max-w-full"
                  aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <span className="truncate">{LABELS[col]}</span>
                  <span className="flex flex-col -space-y-1 shrink-0">
                    <ChevronUp className={`h-2.5 w-2.5 ${active && sortDir === 'asc' ? 'text-fw-link' : 'text-fw-disabled group-hover:text-fw-bodyLight'}`} />
                    <ChevronDown className={`h-2.5 w-2.5 ${active && sortDir === 'desc' ? 'text-fw-link' : 'text-fw-disabled group-hover:text-fw-bodyLight'}`} />
                  </span>
                </button>
              </th>
            );
          })}
          {rowActions && <th scope="col" className="w-10 px-2 h-10" aria-label="Actions" />}
        </tr>
      </thead>
      <tbody className="divide-y divide-fw-secondary">
        {sorted.map((c) => {
          const isSel = selectedIds?.has(String(c.id));
          return (
            <tr
              key={c.id}
              onClick={() => (onRowClick ? onRowClick(c) : navigate(`/connections/${c.id}`))}
              className={`hover:bg-fw-wash transition-colors duration-100 cursor-pointer ${
                isSel ? 'bg-fw-accent/40' : ''
              } ${String(c.id) === highlightedConnectionId ? 'row-highlight' : ''}`}
            >
              {selectable && (
                <td className="w-8 px-2 py-3.5 align-middle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!isSel}
                    onChange={() => onToggleRow?.(String(c.id))}
                    className="h-3.5 w-3.5 rounded border-fw-secondary text-fw-primary focus:ring-fw-active cursor-pointer"
                    aria-label={`Select ${c.name}`}
                  />
                </td>
              )}
              {columns.map((col) => (
                <td key={col} className="px-3 py-3.5 align-middle overflow-hidden">
                  <div className="min-w-0 flex items-center">{renderCell(c, col)}</div>
                </td>
              ))}
              {rowActions && (
                <td className="w-10 px-2 py-3.5 align-middle" onClick={(e) => e.stopPropagation()}>
                  <OverflowMenu items={rowActions(c)} className="rounded-full" />
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
