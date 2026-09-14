import { PiggyBank } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WidgetFrame } from '../WidgetFrame';
import type { LayerWidgetProps } from '../registry';
import { useCloudControlLive } from '../../../../engine/react/useCloudControl';
import { moneyOnTheTable } from '../../../discover/stackFigures';
import { WhyFigure } from '../../../../components/viz/WhyFigure';

export function MoneyOnTheTableWidget(_props: LayerWidgetProps) {
  const navigate = useNavigate();
  /* Headline and move count come from ONE source (moneyOnTheTable). They
     used to be spliced: the money from arbitrage's attach-only ceiling, the
     count from the advisor's draft - so this tile read "$19,900/mo · Review
     10 moves" while Discover priced those same 10 moves at $52,961/mo. */
  const { available, buckets, moveCount, attachMoves, steerMoves } = useCloudControlLive(c => {
    const table = moneyOnTheTable(c);
    return {
      available: table.savingsMo,
      buckets: c.arbitrage().buckets.filter(b => !b.attached).slice(0, 3),
      moveCount: table.moves,
      attachMoves: table.attachMoves,
      steerMoves: table.steerMoves,
    };
  });

  // Review stages the advisor's own draft into the twin's tray (?draft=andi,
  // the same param StackPanel's advisor chip uses) — the machine stages,
  // never commits.
  const review = (
    <button
      data-testid="money-review"
      disabled={moveCount === 0}
      onClick={() => navigate('/discover?draft=andi')}
      className="rounded-full bg-fw-ctaPrimary px-3 py-1.5 text-figma-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
    >
      Review {moveCount} {moveCount === 1 ? 'move' : 'moves'}
    </button>
  );

  return (
    <WidgetFrame title="Money on the table" icon={PiggyBank} action={review}>
      {/* Value on top, evidence below - the deck's rule, as the shared
          WhyFigure affordance rather than a bare number. */}
      <div className="mb-3">
        <WhyFigure
          testid="money-figure"
          value={`$${Math.round(available).toLocaleString()}/mo`}
          label={`across ${moveCount} ${moveCount === 1 ? 'move' : 'moves'} the advisor can act on now`}
          evidence={[
            { label: 'Regions to attach', value: String(attachMoves) },
            { label: 'Flows to steer onto the fabric', value: String(steerMoves) },
          ]}
          source="Priced from this estate's own egress and path data - the same figures the advisor quotes on Discover."
        />
      </div>
      <ul className="flex flex-col divide-y divide-fw-secondary">
        {buckets.map(b => (
          <li key={b.key} data-testid="arb-bucket" className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <span className="text-figma-sm text-fw-body truncate">{b.label}</span>
            <span className="text-figma-sm font-semibold tabular-nums text-fw-success">
              {`$${Math.round(b.saving).toLocaleString()}/mo`}
            </span>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}
