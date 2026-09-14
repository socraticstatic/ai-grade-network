import { useState } from 'react';
import { ChevronDown, ExternalLink, Info } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { buildAccountLedger, formatUsd, volumeDiscountRate } from '../../../utils/lmccBilling';

const TERM_LABEL: Record<string, string> = {
  monthly: 'Month-to-month',
  trial: 'Trial',
  'fixed-12': '12-month',
  'fixed-24': '24-month',
  'fixed-36': '36-month',
};

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Account-level billing overview. The total leads — one number, understood in a
 * glance — with the facts that explain it beside it. The full ledger opens on
 * demand. The portal displays amounts from the billing system of record; it
 * never calculates penalties or fees.
 */
export function AccountBillingOverview() {
  const connections = useStore((s) => s.connections);
  const [showDetails, setShowDetails] = useState(false);
  const ledger = buildAccountLedger(connections);
  const committedGbps = Math.round(ledger.committedMbps / 1000);
  const volumeRate = volumeDiscountRate(ledger.committedMbps);
  const totalSaved = ledger.termDiscount + ledger.volumeDiscount;
  const nextRenewal = ledger.lines
    .map((l) => l.renewsAt)
    .filter(Boolean)
    .sort()[0];

  return (
    <div className="space-y-5">
      {/* ── The total bar: one number, then the facts that explain it ── */}
      <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
        <div className="px-6 pt-6 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-widest mb-1.5">
                Monthly network total
              </p>
              <p className="text-[40px] leading-none font-bold text-fw-heading tracking-[-0.03em] tabular-nums">
                {formatUsd(ledger.total)}
                <span className="text-figma-base font-medium text-fw-bodyLight tracking-normal ml-1.5">/mo</span>
              </p>
              {totalSaved > 0 && (
                <p className="text-figma-sm text-fw-success mt-2">
                  You're saving {formatUsd(totalSaved)}/mo in commitment and volume discounts.
                </p>
              )}
            </div>

            {/* Key facts — each one answers the CFO's next question */}
            <div className="flex items-stretch divide-x divide-fw-secondary/70 text-right">
              {[
                { label: 'Billing connections', value: String(ledger.lines.length) },
                { label: 'Committed bandwidth', value: `${committedGbps} Gbps` },
                { label: 'Next renewal', value: nextRenewal ? fmtDate(nextRenewal) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="px-5 first:pl-0 last:pr-0">
                  <p className="text-figma-lg font-bold text-fw-heading tabular-nums">{value}</p>
                  <p className="text-figma-xs text-fw-bodyLight mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar footer: details disclosure + system-of-record link-out */}
        <div className="px-6 py-3 bg-fw-wash/60 border-t border-fw-secondary/70 flex items-center justify-between">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="inline-flex items-center gap-1.5 text-figma-sm font-medium text-fw-link hover:underline no-rounded"
            aria-expanded={showDetails}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            {showDetails ? 'Hide details' : 'See all details'}
          </button>
          <a
            href="https://www.business.att.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-figma-sm font-medium text-fw-link hover:underline"
          >
            Invoices in AT&T Business Center
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* ── The full ledger, on demand ── */}
      {showDetails && (
        ledger.lines.length === 0 ? (
          <p className="text-figma-sm text-fw-bodyLight">
            No live connections are billing yet. Charges begin when a connection reaches Live.
          </p>
        ) : (
          <div className="space-y-4">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-fw-secondary">
                  <th className="w-[26%] text-left py-2 pr-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">Connection</th>
                  <th className="w-[18%] text-left py-2 pr-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">Plan</th>
                  <th className="w-[15%] text-left py-2 pr-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">Term</th>
                  <th className="w-[14%] text-left py-2 pr-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">Started</th>
                  <th className="w-[14%] text-left py-2 pr-3 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">Renews</th>
                  <th className="w-[13%] text-right py-2 text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {ledger.lines.map((l) => (
                  <tr key={l.id} className="border-b border-fw-secondary/50">
                    <td className="py-2.5 pr-3 text-figma-sm font-medium text-fw-heading truncate" title={l.name}>{l.name}</td>
                    <td className="py-2.5 pr-3 text-figma-sm text-fw-body truncate">{l.type}</td>
                    <td className="py-2.5 pr-3 text-figma-sm text-fw-body truncate">{TERM_LABEL[l.term] ?? l.term}</td>
                    <td className="py-2.5 pr-3 text-figma-sm text-fw-body truncate">{fmtDate(l.startedAt)}</td>
                    <td className="py-2.5 pr-3 text-figma-sm text-fw-body truncate">{l.renewsAt ? fmtDate(l.renewsAt) : '—'}</td>
                    <td className="py-2.5 text-figma-sm font-medium text-fw-body text-right tabular-nums">{formatUsd(l.monthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Ledger footer — discounts subtract from the total, line by line */}
            <div className="ml-auto max-w-sm space-y-1.5">
              <div className="flex justify-between text-figma-sm text-fw-body">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatUsd(ledger.subtotal)}</span>
              </div>
              <div className="flex justify-between text-figma-sm text-fw-body">
                <span>Term commitment discount</span>
                <span className="tabular-nums text-fw-success">−{formatUsd(ledger.termDiscount)}</span>
              </div>
              <div className="flex justify-between text-figma-sm text-fw-body">
                <span>
                  Volume discount
                  {volumeRate > 0 && (
                    <span className="text-fw-bodyLight"> · {committedGbps} Gbps committed</span>
                  )}
                </span>
                <span className="tabular-nums text-fw-success">−{formatUsd(ledger.volumeDiscount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-fw-secondary text-figma-base font-bold text-fw-heading">
                <span>Monthly total</span>
                <span className="tabular-nums">{formatUsd(ledger.total)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <Info className="h-3.5 w-3.5 text-fw-bodyLight shrink-0 mt-0.5" />
              <p className="text-figma-xs text-fw-bodyLight">
                Amounts come from the billing system of record — billing starts when a connection
                goes Live. Pending and expired connections carry no charges. Early termination and
                downgrade change fees are shown at the moment you make those changes.
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
