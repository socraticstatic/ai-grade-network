import { Sparkles, Check } from 'lucide-react';
import type { CloudControl } from '../../engine/types';
import { siteClassNoun } from '../discover/discoveryModel';
import { advisorHeadline, headStart } from './advisorModel';
import { FindingCard } from './FindingCard';
import type { CanvasItem } from './advisorScript';

/* The canvas - the artifact side of the conversation. The thread narrates
 * on the left; whatever it just said materializes here: the head-start
 * figures, the scan checklist, each finding's card with its offer ladder,
 * and finally the savings hero. Everything renders from the engine at
 * paint time; the conversation only decides WHEN each artifact appears. */

const nf = new Intl.NumberFormat('en-US');
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const SCAN_LINES = [
  'Crawling cloud accounts',
  'Mapping regions, VPCs and subnets',
  'Joining cloud estate to AT&T circuits',
  'Pricing every path both ways',
];

export function AdvisorCanvas({
  cc,
  items,
  onAcceptTier,
}: {
  cc: CloudControl;
  items: CanvasItem[];
  onAcceptTier: (route: string) => void;
}) {
  const hs = headStart(cc);
  const head = advisorHeadline(cc);
  const maxOn = Math.max(...hs.byClass.map(r => r.count), 1);

  return (
    <div className="space-y-4" data-testid="advisor-canvas">
      {items.map((item, i) => {
        if (item.kind === 'headstart') {
          return (
            <section key={i} data-testid="advisor-headstart" className="rounded-2xl border border-fw-secondary bg-fw-base p-6">
              <p className="text-figma-xs font-semibold uppercase tracking-[0.06em] text-fw-bodyLight">
                Already on the AT&T network
              </p>
              <p className="mt-1 text-[40px] font-semibold leading-tight text-fw-heading">
                {nf.format(hs.total)} <span className="text-[20px] font-medium text-fw-body">sites</span>
              </p>
              <div className="mt-4 space-y-2">
                {hs.byClass.map(row => (
                  <div key={row.siteClass} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-figma-xs text-fw-bodyLight">
                      {siteClassNoun(row.siteClass, row.count)}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-fw-neutral">
                      <div
                        className="h-full rounded-full bg-fw-cobalt-600"
                        style={{ width: `${Math.max(4, (row.count / maxOn) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-figma-xs font-medium text-fw-body">
                      {nf.format(row.count)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        }
        if (item.kind === 'scan') {
          return (
            <section key={i} data-testid="advisor-scan" className="rounded-2xl border border-fw-secondary bg-fw-base p-6">
              <ul className="space-y-2.5">
                {SCAN_LINES.map(line => (
                  <li key={line} className="flex items-center gap-2.5 text-figma-sm text-fw-body">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fw-cobalt-600">
                      <Check className="h-3 w-3 text-white" aria-hidden="true" />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          );
        }
        if (item.kind === 'finding') {
          return <FindingCard key={i} finding={item.finding} onAcceptTier={onAcceptTier} />;
        }
        return (
          <section
            key={i}
            data-testid="advisor-hero"
            className="rounded-2xl bg-gradient-to-br from-fw-cobalt-700 via-fw-cobalt-600 to-fw-att-blue p-8 text-white"
          >
            <p className="flex items-center gap-2 text-figma-xs font-semibold uppercase tracking-[0.08em] text-white/80">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Your estate, priced
            </p>
            <p className="mt-2 text-[44px] font-semibold leading-tight">
              {head.savingsMo > 0 ? `You could save ${money(head.savingsMo)}/mo` : 'Measured, mapped, and ready'}
            </p>
            <p className="mt-2 max-w-md text-figma-sm text-white/85">
              {head.findings} findings, every figure priced from your own traffic on paths AT&T already runs. Change
              anything and I re-check the number.
            </p>
          </section>
        );
      })}
    </div>
  );
}
