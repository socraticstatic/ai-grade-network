/**
 * Hub card field registry + guardrailed renderer — the hub counterpart to
 * cardFields.tsx. Hubs aggregate connections, so the toggleable facts differ
 * (no per-hub provider/region; instead utilization/SLA rollups, ASN, vendor,
 * connection count, BGP sessions). Driven by the same id-keyed visibility store
 * (scope 'gw-card') and the shared ColumnVisibilityPopover.
 */
import type { ReactNode } from 'react';
import { Hash, Copy } from 'lucide-react';
import type { Connection } from '../../../types';
import type { Hub } from '../../../types/hub';
import type { ColumnDefinition } from '../../common/ColumnVisibilityPopover';
import {
  getHubUtilization, getHubPeakUtilization, getHubSla,
  getHubProviders, getHubRegionCount,
} from '../../../utils/connectionFacts';
import { ProviderLogo } from '../ProviderLogo';
import { HubCompositionChips } from '../hub/HubCompositionChips';
import { BgpPill, BgpDot, SlaBadge, UtilizationMeter } from './FactBadges';

// Mini cards lead with one field (composition / connections-by-type); the rest collapse
// to "+N" so nothing clips. The full set shows on the expanded card.
export const GW_MINI_CAP = 1;

export const GW_CARD_FIELDS: ColumnDefinition[] = [
  { id: 'composition', label: 'Connections by type' },
  { id: 'connections', label: 'Connection count' },
  { id: 'utilization', label: 'Peak utilization' },
  { id: 'providers',   label: 'Providers (across connections)' },
  { id: 'sla',         label: 'SLA (worst-case)' },
  { id: 'regions',     label: 'Regions (count)' },
  { id: 'asn',         label: 'ASN' },
  { id: 'location',    label: 'Location' },
  { id: 'vendor',      label: 'Vendor' },
  { id: 'bgp',         label: 'BGP sessions' },
  { id: 'id',          label: 'Hub ID' },
];

interface GwCtx {
  hub: Hub;
  connections: Connection[];
  variant: 'mini' | 'large';
}

export function renderHubField(id: string, ctx: GwCtx): ReactNode {
  const { hub: g, connections, variant } = ctx;
  const large = variant === 'large';

  switch (id) {
    case 'composition':
      return connections.length > 0 ? <HubCompositionChips connections={connections} size={large ? 'md' : 'sm'} /> : null;

    case 'connections':
      return <span className="text-figma-xs font-medium text-fw-body tabular-nums">{connections.length} conn</span>;

    case 'providers': {
      const provs = getHubProviders(connections);
      if (provs.length === 0) return null;
      return (
        <span className="inline-flex items-center gap-0.5 shrink-0" title={`Providers: ${provs.join(', ')}`}>
          {provs.map((p, i) => <ProviderLogo key={i} provider={p} size={large ? 24 : 20} />)}
        </span>
      );
    }

    case 'regions': {
      const n = getHubRegionCount(connections);
      if (n === 0) return null;
      return <span className="text-figma-xs text-fw-bodyLight tabular-nums">{n} region{n !== 1 ? 's' : ''}</span>;
    }

    case 'utilization': {
      const peak = getHubPeakUtilization(connections);
      const avg = getHubUtilization(connections);
      const tip = `Peak ${peak}% · avg ${avg}% across ${connections.length} connection${connections.length !== 1 ? 's' : ''}`;
      return large
        ? <UtilizationMeter pct={peak} title={tip} />
        : <span className="text-figma-xs font-medium text-fw-body tabular-nums" title={tip}>{peak}%<span className="text-fw-bodyLight"> peak</span></span>;
    }

    case 'sla':
      return <SlaBadge value={getHubSla(connections)} className="shrink-0" />;

    case 'asn':
      return g.configuration?.asn != null
        ? <span className="text-figma-xs text-fw-bodyLight tabular-nums">AS{g.configuration.asn}</span>
        : null;

    case 'location':
      return <span className="text-figma-xs text-fw-bodyLight truncate max-w-[140px]">{g.location}</span>;

    case 'vendor':
      return g.vendor ? <span className="text-figma-xs text-fw-bodyLight truncate max-w-[100px]">{g.vendor}</span> : null;

    case 'bgp': {
      const s = g.performance?.bgpSessions;
      if (!s) return <BgpPill status={g.status === 'active' ? 'Up' : 'Down'} />;
      const allUp = s.active === s.total && s.total > 0;
      return (
        <span className="inline-flex items-center gap-1 text-figma-xs font-medium text-fw-body tabular-nums" title="BGP sessions active/total">
          <BgpDot status={allUp ? 'Up' : 'Down'} />BGP {s.active}/{s.total}
        </span>
      );
    }

    case 'id':
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(String(g.id)); window.addToast?.({ type: 'success', title: 'Copied', message: `${g.id} copied`, duration: 2000 }); }}
          className="inline-flex items-center gap-0.5 font-mono text-[10px] text-fw-bodyLight hover:text-fw-link transition-colors"
          title="Copy hub ID"
        >
          <Hash className="h-2.5 w-2.5" />{String(g.id)}<Copy className="h-2.5 w-2.5" />
        </button>
      );

    default:
      return null;
  }
}

interface HubMetaChipsProps {
  hub: Hub;
  connections: Connection[];
  visibleIds: string[];
  variant: 'mini' | 'large';
  className?: string;
}

export function HubMetaChips({ hub, connections, visibleIds, variant, className = '' }: HubMetaChipsProps) {
  const ordered = GW_CARD_FIELDS.map((f) => f.id).filter((id) => visibleIds.includes(id));
  const rendered = ordered
    .map((id) => ({ id, node: renderHubField(id, { hub, connections, variant }) }))
    .filter((r) => r.node !== null);

  if (variant === 'mini') {
    const shown = rendered.slice(0, GW_MINI_CAP);
    const overflow = rendered.length - shown.length;
    return (
      <span className={`inline-flex items-center gap-1.5 min-w-0 flex-nowrap overflow-hidden whitespace-nowrap ${className}`}>
        {shown.map((r, i) => (
          <span key={r.id} className="inline-flex items-center gap-1.5 shrink-0">
            {i > 0 && <span className="text-fw-secondary shrink-0" aria-hidden>·</span>}
            {r.node}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-[10px] font-medium text-fw-bodyLight shrink-0" title={`${overflow} more hidden on compact cards`}>+{overflow}</span>
        )}
      </span>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      {rendered.map((r) => <span key={r.id} className="inline-flex items-center">{r.node}</span>)}
    </div>
  );
}
