import { useRef, useState } from 'react';
import { Check, Globe, Layers, ShieldCheck } from 'lucide-react';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import type { CloudControl } from '../../engine/types';

type Bucket = ReturnType<CloudControl['arbitrage']>['buckets'][number];

const CATEGORY: Record<Bucket['category'], { label: string; Icon: typeof Globe }> = {
  internet: { label: 'internet', Icon: Globe },
  'cross-cloud': { label: 'cross-cloud', Icon: Layers },
  committed: { label: 'committed', Icon: ShieldCheck },
};

const fmt = (n: number) => `$${n.toLocaleString()}`;

/** A bucket has a capture lever iff attaching it fires an engine action. */
function hasAction(b: Bucket): boolean {
  return !!b.onrampId || b.key === 'misc';
}

/**
 * The arbitrage breakdown — the live centerpiece. Every egress source ranked by
 * opportunity, each with a public→AT&T cost bar. Captured rows read green ("on
 * the fabric"); opportunity rows carry a cobalt Attach lever that fires the
 * mapped capture action (activateOnramp / applyFix) so the engine recomputes and
 * hero, invoice, gauge, and this list all move at once. A running "captured this
 * session" tally sits in the header and grows by each captured bucket's saving.
 */
export function ArbitrageBreakdown() {
  const arb = useCloudControl(cc => cc.arbitrage());
  const actions = useCloudControlActions();
  const [captured, setCaptured] = useState(0);
  // A bucket's saving is banked at most once per session, even if a stale row
  // is clicked twice before the recompute flips it to captured.
  const capturedKeys = useRef(new Set<string>());

  // Scale every bar to the largest public cost so widths compare across rows.
  const maxPublic = Math.max(...arb.buckets.map(b => b.publicCost), 1);

  const attach = (b: Bucket) => {
    if (capturedKeys.current.has(b.key)) return;
    let fired = false;
    if (b.onrampId) fired = actions.activateOnramp(b.onrampId);
    else if (b.key === 'misc') fired = actions.applyFix('shiftAws');
    if (fired) {
      capturedKeys.current.add(b.key);
      setCaptured(c => c + b.saving);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-fw-heading">Egress by source</h2>
        {captured > 0 && (
          // Row 72 of the phase-0 metric audit: "this session" is demo
          // vocabulary a customer has no model for.
          <span role="status" className="text-xs font-semibold tabular-nums text-fw-success">
            {fmt(captured)}/mo captured so far
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {arb.buckets.map(b => {
          const cat = CATEGORY[b.category];
          const attWidth = (b.attCost / maxPublic) * 100;
          const saveWidth = ((b.publicCost - b.attCost) / maxPublic) * 100;
          const actionable = !b.attached && hasAction(b);

          return (
            <li
              key={b.key}
              className={`rounded-lg border p-3 transition-colors ${
                b.attached ? 'border-fw-success/30 bg-fw-success/[0.04]' : 'border-fw-secondary bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {b.attached ? (
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fw-success text-white">
                      <Check size={13} strokeWidth={3} aria-hidden="true" />
                    </span>
                  ) : (
                    <cat.Icon size={16} className="shrink-0 text-fw-disabled" aria-hidden="true" />
                  )}
                  <span className="truncate text-sm font-medium text-fw-heading">{b.label}</span>
                  <span className="shrink-0 rounded-full border border-fw-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fw-bodyLight">
                    {cat.label}
                  </span>
                </div>

                {b.attached ? (
                  <span className="shrink-0 text-xs font-semibold text-fw-success">on the fabric</span>
                ) : actionable ? (
                  <button
                    onClick={() => attach(b)}
                    className="shrink-0 rounded-md bg-fw-ctaPrimary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-fw-ctaPrimaryHover focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link/40 focus-visible:ring-offset-2"
                    aria-label={`Attach ${b.label} to the fabric to save ${fmt(b.saving)} per month`}
                  >
                    Attach
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-fw-bodyLight">baseline</span>
                )}
              </div>

              {/* Public→AT&T cost bar: green = what you pay on the fabric, slate = the saving. */}
              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-fw-neutral"
                   role="img"
                   aria-label={`${b.label}: ${fmt(b.publicCost)} public, ${fmt(b.attCost)} on AT&T`}>
                <div className="h-full rounded-l-full bg-fw-success" style={{ width: `${attWidth}%` }} />
                <div className={`h-full ${b.attached ? 'bg-fw-success/25' : 'bg-fw-disabled'}`}
                     style={{ width: `${saveWidth}%` }} />
              </div>

              <div className="mt-1.5 text-xs tabular-nums text-fw-body">
                <span className="text-fw-bodyLight line-through">{fmt(b.publicCost)}</span>
                {' → '}
                <span className="font-medium text-fw-heading">{fmt(b.attCost)}</span>
                {' · '}
                <span className="font-semibold text-fw-success">save {fmt(b.saving)} ({b.savingPct}%)</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
