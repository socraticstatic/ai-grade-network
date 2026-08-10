import { Gauge } from 'lucide-react';
import { WidgetFrame } from '../WidgetFrame';
import { useLayer, type LayerWidgetProps } from '../registry';
import { useCloudControlLive } from '../../../../engine/react/useCloudControl';
import { aiStratum, naasStratum } from '../../../discover/stackFigures';
import { fmtTokens, fmtUsd } from '../../../ai-fabric/aiSpend';
import type { CloudControl } from '../../../../engine/types';

interface Figure { label: string; value: string; warn?: boolean }

function estateFigures(cc: CloudControl, surface: 'naas' | 'ai'): Figure[] {
  if (surface === 'ai') {
    const f = aiStratum(cc);
    const figures: Figure[] = [];
    // Rows 15+16 of the phase-0 metric audit: "Tokens today" (row 15,
    // demote — the AI Insights KPI strip already states this figure with
    // the governed/public split) and "On the public internet" (row 16,
    // relabel) were two tiles restating one number under two nouns. Row
    // 15's fix is to drop this tile; row 16's copy merges what survives
    // into the one sentence that names the exposure — so the two rows
    // land together, one tile becomes one line, and it only appears when
    // there is exposure to name (the pre-existing StackPanel version of
    // this figure was conditional the same way).
    if (f.ungovernedTokensToday > 0) {
      figures.push(
        f.ungovernedTokensToday === f.tokensToday
          ? { label: 'tokens today rode the public internet', value: `All ${fmtTokens(f.tokensToday)}`, warn: true }
          : {
              label: 'tokens today rode the public internet',
              value: `${fmtTokens(f.ungovernedTokensToday)} of ${fmtTokens(f.tokensToday)}`,
              warn: true,
            },
      );
    }
    figures.push({ label: 'Spend today', value: fmtUsd(f.spendToday) });
    return figures;
  }
  const f = naasStratum(cc);
  const money = (n: number) => `$${Math.round(n).toLocaleString()}/mo`;
  // Row 4 of the phase-0 metric audit: "Regions on the fabric" demoted —
  // Connect's own verdict line (`connectVerdict`) already states this
  // fraction in prose one click away. Row 5: "Sites" cut, wrong (it counts
  // the fabric model's 4 real sites plus an "Internet" pseudo-node) and
  // duplicated by Discover's honest 6-premises count. Row 7: "Still on the
  // table" cut as a third rendering of the board's own hero figure (row 1).
  return [
    { label: 'Egress on public transit', value: money(f.egressPubMo), warn: f.egressPubMo > 0 },
  ];
}

export function EstateFiguresWidget(_props: LayerWidgetProps) {
  const surface = useLayer();
  const cc = useCloudControlLive(c => c);
  const figures = estateFigures(cc, surface);

  return (
    <WidgetFrame title="Estate at a glance" icon={Gauge}>
      {/* Two-up, not a single stacked column: the widget is w:2, and four
          figures in one narrow column read as a ribbon rather than a glance. */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {figures.map(f => (
          <div key={f.label} data-testid="estate-figure" className="min-w-0">
            <div className={`text-figma-xl font-bold tabular-nums tracking-[-0.02em] ${f.warn ? 'text-fw-warn' : 'text-fw-heading'}`}>
              {f.value}
            </div>
            <div className="text-figma-sm text-fw-bodyLight mt-0.5">{f.label}</div>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
