/**
 * Card field registry + guardrailed renderer. The same id-keyed visibility store
 * that drives table columns (columnVisibilitySlice) also drives which "fact" elements
 * appear on connection cards — so the gear control is one mental model everywhere.
 *
 * Guardrails so toggling can't break a card:
 *  - name + status are structural (never in this toggle list).
 *  - mini cards cap visible chips (MINI_CAP) and overflow into a "+N" token.
 *  - large cards wrap freely.
 */
import type { ReactNode } from 'react';
import { Hash, Copy } from 'lucide-react';
import type { Connection } from '../../../types';
import type { Hub } from '../../../types/hub';
import type { ColumnDefinition } from '../../common/ColumnVisibilityPopover';
import { CloudLegs } from '../CloudLegs';
import { ProviderLogo } from '../ProviderLogo';
import { getMonthlyCost, formatUsd } from '../../../utils/lmccBilling';
import { getConnectionLegs } from '../../../utils/connectionLegs';
import {
  getResiliency, getBgpStatus, getSlaThisMonth, getUtilization,
  getConnectionRegions, getParentHubs, utilizationColor,
} from '../../../utils/connectionFacts';
import { BgpPill, ResiliencyBadge, SlaBadge, UtilizationMeter } from './FactBadges';

export const MINI_CAP = 3;

/** Toggleable card fields (order = display order). Scope id 'conn-card'. */
export const CONN_CARD_FIELDS: ColumnDefinition[] = [
  { id: 'provider',    label: 'Provider logos' },
  { id: 'id',          label: 'Connection ID' },
  { id: 'region',      label: 'Region / Metro' },
  { id: 'hub',     label: 'Parent Hub' },
  { id: 'bandwidth',   label: 'Bandwidth' },
  { id: 'cost',        label: 'Monthly cost' },
  { id: 'last-change', label: 'Last change' },
  { id: 'utilization', label: 'Utilization' },
  { id: 'bgp',         label: 'BGP status' },
  { id: 'sla',         label: 'SLA (this month)' },
  { id: 'resiliency',  label: 'Resiliency' },
  { id: 'pool',        label: 'Pool' },
];

interface FieldCtx {
  connection: Connection;
  hubs: Hub[];
  variant: 'mini' | 'large';
  navigate?: (path: string) => void;
}

/** Render a single card field's chip, or null if it has no value to show. */
export function renderCardField(id: string, ctx: FieldCtx): ReactNode {
  const { connection: c, hubs, variant, navigate } = ctx;
  const large = variant === 'large';
  const logoSize = large ? 24 : 20;

  switch (id) {
    case 'provider':
      // Mini: logos only (compact, single-line). Large: logos + names.
      if (!large) {
        const legs = getConnectionLegs(c);
        if (legs.length === 0) return null;
        return (
          <span className="inline-flex items-center gap-0.5 shrink-0">
            {legs.map((leg, i) => <ProviderLogo key={i} provider={leg.provider} size={20} />)}
          </span>
        );
      }
      return <CloudLegs connection={c} withLogos logoSize={logoSize} className="text-figma-xs" />;

    case 'id':
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(String(c.id)); window.addToast?.({ type: 'success', title: 'Copied', message: `${c.id} copied`, duration: 2000 }); }}
          className="inline-flex items-center gap-0.5 font-mono text-[10px] text-fw-bodyLight hover:text-fw-link transition-colors"
          title="Copy connection ID"
        >
          <Hash className="h-2.5 w-2.5" />{String(c.id)}<Copy className="h-2.5 w-2.5" />
        </button>
      );

    case 'region': {
      const regions = getConnectionRegions(c);
      if (regions.length === 0) return null;
      const full = regions.join(' · ');
      // Mini: show the first + "+N" so multi-cloud regions aren't hidden but stay compact.
      const text = large || regions.length === 1 ? full : `${regions[0]} +${regions.length - 1}`;
      return <span className="text-[10px] text-fw-bodyLight tabular-nums truncate max-w-[200px]" title={full}>{text}</span>;
    }

    case 'hub': {
      const parents = getParentHubs(String(c.id), hubs);
      if (parents.length === 0) return null;
      const g = parents[0];
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate?.(`/hubs/${g.id}`); }}
          className="text-[10px] font-medium text-fw-link hover:underline truncate max-w-[140px]"
          title={`Rolls up to ${g.name}`}
        >
          {g.name}{parents.length > 1 ? ` +${parents.length - 1}` : ''}
        </button>
      );
    }

    case 'bandwidth':
      return <span className="text-figma-xs font-medium text-fw-body tabular-nums">{c.bandwidth}</span>;

    case 'cost': {
      const cost = getMonthlyCost(c as any);
      if (cost == null) return null;
      return <span className="text-figma-xs font-medium text-fw-body tabular-nums">{formatUsd(cost)}/mo</span>;
    }

    case 'last-change': {
      const at = (c as any).updatedAt ?? (c as any).createdAt;
      if (!at) return null;
      const days = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
      const label = days <= 0 ? 'today' : days === 1 ? '1d ago' : days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
      return <span className="text-[10px] text-fw-bodyLight tabular-nums">{label}</span>;
    }

    case 'utilization':
      return large
        ? <UtilizationMeter pct={getUtilization(c)} />
        : (
          <span className="inline-flex items-center gap-1 text-figma-xs font-medium text-fw-body tabular-nums">
            <span className={`h-1.5 w-1.5 rounded-full ${utilizationColor(getUtilization(c))}`} />{getUtilization(c)}%
          </span>
        );

    case 'bgp':
      return <BgpPill status={getBgpStatus(c)} />;

    case 'sla':
      return <SlaBadge value={getSlaThisMonth(c)} />;

    case 'resiliency':
      return <ResiliencyBadge level={getResiliency(c)} />;

    case 'pool':
      return <span className="text-figma-xs text-fw-bodyLight truncate max-w-[120px]">{c.poolName || c.pool || 'No pool'}</span>;

    default:
      return null;
  }
}

interface CardMetaChipsProps {
  connection: Connection;
  hubs: Hub[];
  /** Ordered list of field ids currently visible (from the visibility store). */
  visibleIds: string[];
  variant: 'mini' | 'large';
  navigate?: (path: string) => void;
  className?: string;
}

/**
 * Lay out the visible card fields as separated chips. Mini caps at MINI_CAP with a
 * "+N" overflow token; large wraps freely.
 */
export function CardMetaChips({ connection, hubs, visibleIds, variant, navigate, className = '' }: CardMetaChipsProps) {
  const ordered = CONN_CARD_FIELDS.map((f) => f.id).filter((id) => visibleIds.includes(id));
  const rendered = ordered
    .map((id) => ({ id, node: renderCardField(id, { connection, hubs, variant, navigate }) }))
    .filter((r) => r.node !== null);

  if (variant === 'mini') {
    const shown = rendered.slice(0, MINI_CAP);
    const overflow = rendered.length - shown.length;
    return (
      <span className={`inline-flex items-center gap-1.5 min-w-0 flex-nowrap overflow-hidden whitespace-nowrap ${className}`}>
        {shown.map((r, i) => (
          <span key={r.id} className="inline-flex items-center gap-1.5 min-w-0 shrink-0">
            {i > 0 && <span className="text-fw-secondary shrink-0" aria-hidden>·</span>}
            {r.node}
          </span>
        ))}
        {overflow > 0 && (
          <span
            className="text-[10px] font-medium text-fw-bodyLight shrink-0"
            title={`${overflow} more field${overflow > 1 ? 's' : ''} hidden on compact cards`}
          >
            +{overflow}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      {rendered.map((r) => (
        <span key={r.id} className="inline-flex items-center">{r.node}</span>
      ))}
    </div>
  );
}
