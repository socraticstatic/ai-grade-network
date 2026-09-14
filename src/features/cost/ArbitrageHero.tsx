import { useEffect, useRef, useState } from 'react';
import { ArrowRight, TrendingDown } from 'lucide-react';
import { useCloudControl } from '../../engine/react/useCloudControl';

function prefersReducedMotion(): boolean {
  return !!(typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Smoothly animates a number toward `target` (~450ms ease-out cubic). Snaps
 * instantly when the user prefers reduced motion or when rAF is unavailable
 * (SSR / jsdom), so the wow never comes at accessibility's expense and the
 * number always ends exactly on the engine-derived figure.
 */
function useAnimatedNumber(target: number): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  useEffect(() => { valueRef.current = value; });
  useEffect(() => {
    if (prefersReducedMotion() || typeof requestAnimationFrame === 'undefined') {
      setValue(target);
      return;
    }
    const from = valueRef.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const dur = 450;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

/** Compact money: $48.2k for thousands, full dollars below 1k. */
const k = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n).toLocaleString()}`);

/**
 * The money band. Two bills side by side — all-hyperscaler egress (neutral) vs
 * the AI-grade network (cobalt) — with the realized savings called out in green, the
 * still-available savings as a forward call-to-action, and an honest, muted
 * disclosure of the AT&T fabric port fees. Every figure is a `arbitrage()`
 * derivation; the numbers animate when a path is attached and the gap widens.
 */
export function ArbitrageHero() {
  const arb = useCloudControl(cc => cc.arbitrage());
  const hyper = useAnimatedNumber(arb.hyperscalerBill);
  const cloudConnect = useAnimatedNumber(arb.cloudConnectBill);
  const savings = useAnimatedNumber(arb.savings);
  const avail = useAnimatedNumber(arb.availableSavings);

  return (
    <section
      aria-label="AT&T fabric arbitrage summary"
      data-tour="cost-hero"
      className="rounded-2xl border border-fw-secondary bg-gradient-to-br from-white via-white to-fw-ctaPrimary/[0.04] p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-fw-bodyLight">
            All-hyperscaler egress
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-fw-bodyLight line-through decoration-fw-secondary decoration-1">
            {k(hyper)}<span className="text-base font-normal no-underline">/mo</span>
          </div>
        </div>

        <ArrowRight size={26} className="mb-1 shrink-0 text-fw-disabled" aria-hidden="true" />

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-fw-link">
            On the AT&amp;T fabric
          </div>
          <div data-testid="hero-cc-bill" className="mt-1 text-4xl font-bold tabular-nums text-fw-link">
            {k(cloudConnect)}<span className="text-lg font-medium text-fw-bodyLight">/mo</span>
          </div>
        </div>

        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-fw-success/10 px-3 py-1.5 text-fw-success"
             role="status" aria-label={`Saving ${k(savings)} per month, ${arb.savingsPct} percent`}>
          <TrendingDown size={16} className="shrink-0" aria-hidden="true" />
          <span data-testid="hero-savings" className="text-sm font-semibold tabular-nums">
            save {k(savings)} <span className="font-medium opacity-80">({arb.savingsPct}%)</span>
          </span>
        </div>
      </div>

      {/* Deliberately NOT "on the table" - that sentence belongs to
          moneyOnTheTable(), the advisor-actionable figure the exec board
          and Discover both quote. This is the bill floor: what the egress
          invoice reads if every bucket attaches. Two true numbers, two
          different claims, no longer wearing the same words. */}
      {avail > 0 && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-fw-link">
          <span className="font-semibold tabular-nums">{k(avail)}/mo</span>
          <span className="text-fw-body">off this bill once every path attaches.</span>
        </p>
      )}

      <p className="mt-2 text-xs text-fw-bodyLight">
        + ${arb.portFeesMo.toLocaleString()}/mo AT&amp;T fabric ports (access, billed separately)
      </p>
    </section>
  );
}
