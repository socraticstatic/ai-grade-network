import { useCloudControl } from '../../engine/react/useCloudControl';
import { StatTile } from '../../components/viz';
import { FlowBar } from '../../components/flow/FlowBar';
import { ArbitrageHero } from './ArbitrageHero';
import { ArbitrageBreakdown } from './ArbitrageBreakdown';
import { EgressTrend } from './EgressTrend';
import { InvoiceTable } from './InvoiceTable';
import { SteerToSave } from './SteerToSave';

export function CostPage() {
  const billing = useCloudControl(cc => cc.billing());
  const arb = useCloudControl(cc => cc.arbitrage());
  // telemetry(n).egress is a per-tick { pub, priv } $ split (state-telemetry.ts
  // egressSeries); sum the two into a single $/day actual-spend line.
  const actual = useCloudControl(cc => cc.telemetry(60).egress.map(e => e.pub + e.priv));
  // The hyperscaler-rate line prices the same daily volume up by the current
  // arbitrage ratio (hyperscaler ÷ AI-grade network). As paths attach, the ratio
  // grows and the actual spend drops, so the band between the two lines widens —
  // exactly the accumulating saving. Both endpoints are CC derivations.
  const ratio = arb.cloudConnectBill > 0 ? arb.hyperscalerBill / arb.cloudConnectBill : 1;
  const hyper = actual.map(v => Math.round(v * ratio));

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-4">
        <h1 className="text-figma-lg font-bold text-fw-heading">Cost</h1>
        <p className="text-sm text-fw-body">
          What the fabric costs, what it saves, and what is still on the table.
        </p>
      </header>

      <FlowBar cta={{ label: 'Review the estate', to: '/discover' }} />

      <ArbitrageHero />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section aria-labelledby="breakdown-h" className="rounded-xl border border-fw-secondary bg-white p-4">
            <h2 id="breakdown-h" className="sr-only">Egress arbitrage breakdown</h2>
            <ArbitrageBreakdown />
          </section>

          <section aria-labelledby="trend-h" className="rounded-xl border border-fw-secondary bg-white p-4">
            <h2 id="trend-h" className="mb-1 text-sm font-semibold text-fw-heading">
              The widening gap, trailing 60 days
            </h2>
            <p className="mb-3 text-xs text-fw-bodyLight">
              <span className="font-medium text-fw-link">At hyperscaler rates</span> vs{' '}
              <span className="font-medium text-fw-success">on the fabric</span> — the band between is your saving.
            </p>
            <EgressTrend actual={actual} hyper={hyper} />
          </section>

          <section aria-labelledby="inv-h" className="rounded-xl border border-fw-secondary bg-white p-4">
            <h2 id="inv-h" className="mb-3 text-sm font-semibold text-fw-heading">Consumption invoice</h2>
            <InvoiceTable lines={billing.lines} total={billing.total} />
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-fw-secondary bg-white p-4">
            <SteerToSave />
          </div>
          {/* Row 73 of the phase-0 metric audit: "Commit draw" is carrier
              billing vocabulary. Every number the new sentence needs was
              already on the tile — copy only. */}
          <StatTile
            label="Commitment"
            value={`$${billing.commitDraw.toLocaleString()}`}
            meter={{
              pct: billing.commitPct,
              label: `$${billing.commitDraw.toLocaleString()} of your $${billing.commit.toLocaleString()} commitment used (${billing.commitPct}%)`,
            }}
          />
        </aside>
      </div>
    </main>
  );
}
