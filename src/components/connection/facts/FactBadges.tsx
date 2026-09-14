/**
 * Small, reusable "fact" presentational atoms shared by cards, tables, topology and
 * detail pages so a given datum (BGP, SLA, resiliency, region, utilization, id) looks
 * and reads identically everywhere. Pure presentational — values come from
 * connectionFacts.ts accessors.
 */
import { Hash } from 'lucide-react';
import { CopyButton } from '../../common/CopyButton';
import {
  type BgpStatus,
  type Resiliency,
  utilizationColor,
} from '../../../utils/connectionFacts';

// ── BGP Up / Down ───────────────────────────────────────────────────────────────
export function BgpPill({ status, className = '' }: { status: BgpStatus; className?: string }) {
  const up = status === 'Up';
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0 ${
        up ? 'bg-fw-successLight text-fw-success' : 'bg-fw-errorLight text-fw-error'
      } ${className}`}
      title={`BGP ${status}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${up ? 'bg-fw-success' : 'bg-fw-error'}`} />
      BGP {status}
    </span>
  );
}

/** Bare dot variant for tight spots (cards, topology). */
export function BgpDot({ status, className = '' }: { status: BgpStatus; className?: string }) {
  const up = status === 'Up';
  return (
    <span
      className={`inline-flex h-1.5 w-1.5 rounded-full ${up ? 'bg-fw-success' : 'bg-fw-error'} ${className}`}
      title={`BGP ${status}`}
    />
  );
}

// ── Resiliency tier ───────────────────────────────────────────────────────────────
// Plain text, not a pill: "Maximum"/"Geodiversity" read in brand blue (enhanced tiers),
// "Standard" in body. No background — legible and quiet in dense tables.
export function ResiliencyBadge({ level, className = '' }: { level: Resiliency; className?: string }) {
  const enhanced = level === 'Maximum' || level === 'Geodiversity';
  return (
    <span
      className={`text-figma-xs font-medium truncate ${enhanced ? 'text-fw-link' : 'text-fw-body'} ${className}`}
      title={`${level} resiliency`}
    >
      {level}
    </span>
  );
}

// ── SLA this month ────────────────────────────────────────────────────────────────
export function SlaBadge({ value, className = '' }: { value: string; className?: string }) {
  const pct = parseFloat(value.replace('%', ''));
  const ok = Number.isNaN(pct) || pct >= 99.9;
  return (
    <span
      className={`inline-flex items-center gap-1 text-figma-xs font-semibold tabular-nums ${
        ok ? 'text-fw-success' : 'text-complementary-amber'
      } ${className}`}
      title="SLA this month"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-fw-success' : 'bg-complementary-amber'}`} />
      {value}
    </span>
  );
}

// ── Region · facility ─────────────────────────────────────────────────────────────
export function RegionMetro({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span className={`text-figma-xs text-fw-bodyLight truncate tabular-nums ${className}`} title={label}>
      {label}
    </span>
  );
}

// ── Utilization meter (compact bar + %) ─────────────────────────────────────────────
export function UtilizationMeter({
  pct,
  showLabel = true,
  className = '',
  title,
}: {
  pct: number;
  showLabel?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} title={title}>
      <span className="relative h-1.5 w-16 rounded-full bg-fw-wash overflow-hidden">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${utilizationColor(pct)}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </span>
      {showLabel && (
        <span className="text-figma-xs font-medium text-fw-body tabular-nums w-8 text-right">{pct}%</span>
      )}
    </span>
  );
}

// ── Copyable short connection / hub id ──────────────────────────────────────────
export function CopyableId({ id, className = '' }: { id: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-fw-wash border border-fw-secondary text-[11px] font-mono text-fw-body ${className}`}
    >
      <Hash className="h-3 w-3 text-fw-bodyLight shrink-0" />
      <span className="truncate max-w-[140px]" title={id}>{id}</span>
      <CopyButton value={id} />
    </span>
  );
}
