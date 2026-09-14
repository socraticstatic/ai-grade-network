import type { LucideIcon } from 'lucide-react';

// De-amber semantics: 'good' stays green, 'neutral' replaces the old warm
// 'bad' with slate-600 (no amber), and 'critical' is red — reserved for true
// errors only, never a routine "needs attention" state.
const DELTA_TONE = {
  good: 'text-fw-success',
  neutral: 'text-fw-bodyLight',
  critical: 'text-fw-error',
} as const;

export function StatTile({ label, value, delta, meter }: {
  label: string;
  value: string;
  // `icon` gives an otherwise-calm neutral delta a small leading glyph so an
  // attention-bearing figure (public exposure, a rising forecast) reads as
  // "attention" at a glance — meaning by icon, magnitude still by the number.
  // No warm color: neutral stays slate, never amber.
  delta?: { text: string; tone: keyof typeof DELTA_TONE; icon?: LucideIcon };
  meter?: { pct: number; label: string };
}) {
  const pct = meter ? Math.min(100, Math.max(0, meter.pct)) : 0;
  const DeltaIcon = delta?.icon;
  return (
    <div className="rounded-xl bg-white border border-fw-secondary p-4 min-w-[180px]">
      <div className="text-xs font-medium uppercase tracking-wide text-fw-bodyLight">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-fw-heading tabular-nums">{value}</div>
      {delta && (
        <div className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${DELTA_TONE[delta.tone]}`}>
          {DeltaIcon && <DeltaIcon size={13} className="shrink-0" aria-hidden="true" />}
          {delta.text}
        </div>
      )}
      {meter && (
        <div className="mt-2">
          <div role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
               aria-label={meter.label} className="h-1.5 rounded-full bg-fw-neutral overflow-hidden">
            <div className="h-full rounded-full bg-fw-ctaPrimary transition-[width] duration-200 ease-out"
                 style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-fw-bodyLight">{meter.label}</div>
        </div>
      )}
    </div>
  );
}
