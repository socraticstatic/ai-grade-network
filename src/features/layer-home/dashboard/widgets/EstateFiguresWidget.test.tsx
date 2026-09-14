import { render, screen, act } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { LayerContext } from '../registry';
import { EstateFiguresWidget } from './EstateFiguresWidget';
import { CC } from '../../../../engine';
import { naasStratum, aiStratum, attachOpportunities } from '../../../discover/stackFigures';
import { fmtUsd, fmtTokens } from '../../../ai-fabric/aiSpend';

const renderIn = (surface: 'naas' | 'ai') =>
  render(<LayerContext.Provider value={surface}><EstateFiguresWidget /></LayerContext.Provider>);

/* Rows 15+16 of the phase-0 metric audit: one merged sentence replaces the
   "Tokens today" / "On the public internet" tile pair. Computed the same
   way the widget computes it, so this test tracks the live figure rather
   than a value that ticks. */
const exposureFigure = (f: ReturnType<typeof aiStratum>) =>
  f.ungovernedTokensToday === f.tokensToday
    ? `All ${fmtTokens(f.tokensToday)}`
    : `${fmtTokens(f.ungovernedTokensToday)} of ${fmtTokens(f.tokensToday)}`;

describe('EstateFiguresWidget', () => {
  test('NaaS shows the egress figure', () => {
    renderIn('naas');
    const f = naasStratum(CC);
    expect(screen.getByText(`$${Math.round(f.egressPubMo).toLocaleString()}/mo`)).toBeInTheDocument();
    expect(screen.getByText('Egress on public transit')).toBeInTheDocument();
  });

  /* Fix-wave review finding 2: with a single figure (NaaS always has
     exactly one post-audit), the figures grid must not force a second,
     empty column. */
  test('NaaS single figure does not force a two-column grid', () => {
    renderIn('naas');
    const figures = screen.getAllByTestId('estate-figure');
    expect(figures).toHaveLength(1);
    expect(figures[0].parentElement?.className).not.toMatch(/grid-cols-2\b/);
  });

  /* Row 4: "Regions on the fabric" demoted — Connect's own verdict line
     already states it. Row 5: "Sites" cut (wrong count, duplicated on
     Discover). Row 7: "Still on the table" cut (a third rendering of the
     board's hero figure, row 1). */
  test('NaaS drops the regions, sites and still-on-the-table tiles', () => {
    renderIn('naas');
    expect(screen.queryByText('Regions on the fabric')).not.toBeInTheDocument();
    expect(screen.queryByText('Sites')).not.toBeInTheDocument();
    expect(screen.queryByText('Still on the table')).not.toBeInTheDocument();
  });

  test('AI shows the spend figure and, when exposed, the merged tokens sentence', () => {
    renderIn('ai');
    const f = aiStratum(CC);
    expect(screen.getByText(fmtUsd(f.spendToday))).toBeInTheDocument();
    if (f.ungovernedTokensToday > 0) {
      expect(screen.getByText(exposureFigure(f))).toBeInTheDocument();
      expect(screen.getByText('tokens today rode the public internet')).toBeInTheDocument();
      const figures = screen.getAllByTestId('estate-figure');
      expect(figures).toHaveLength(2);
      // Two figures still sit two-up.
      expect(figures[0].parentElement?.className).toMatch(/grid-cols-2\b/);
    } else {
      expect(screen.getAllByTestId('estate-figure')).toHaveLength(1);
    }
  });

  /* Row 14: "Model endpoints ready" cut — it contradicted every other
     figure on the board (0/3 "ready" while the board metered live tokens,
     spend and answered requests through those same endpoints). */
  test('AI drops the model-endpoints tile', () => {
    renderIn('ai');
    expect(screen.queryByText('Model endpoints ready')).not.toBeInTheDocument();
  });

  test('follows the layer switch immediately, with no engine event in between', () => {
    const { rerender } = render(
      <LayerContext.Provider value="naas"><EstateFiguresWidget /></LayerContext.Provider>
    );
    expect(screen.getByText('Egress on public transit')).toBeInTheDocument();
    expect(screen.queryByText('Spend today')).not.toBeInTheDocument();

    rerender(
      <LayerContext.Provider value="ai"><EstateFiguresWidget /></LayerContext.Provider>
    );

    expect(screen.queryByText('Egress on public transit')).not.toBeInTheDocument();
    expect(screen.getByText('Spend today')).toBeInTheDocument();
  });

  test('tracks a telemetry-driven engine mutation with no surface change', () => {
    // provisionRegion attaches a region and moves its arbitrage bucket off
    // the public egress total (state-billing.ts's rawBuckets/captured) — a
    // genuine, synchronous engine mutation that moves naasStratum's
    // egressPubMo figure without any React prop change.
    const before = naasStratum(CC);
    const opp = attachOpportunities(CC)[0];
    expect(opp, 'fixture must have an unattached region for this test to mean anything').toBeDefined();

    render(<LayerContext.Provider value="naas"><EstateFiguresWidget /></LayerContext.Provider>);
    expect(screen.getByText(`$${Math.round(before.egressPubMo).toLocaleString()}/mo`)).toBeInTheDocument();

    try {
      act(() => {
        CC.provisionRegion(opp.regionId);
      });

      const after = naasStratum(CC);
      expect(after.egressPubMo, 'fixture must actually move this figure').toBeLessThan(before.egressPubMo);

      expect(screen.queryByText(`$${Math.round(before.egressPubMo).toLocaleString()}/mo`)).not.toBeInTheDocument();
      expect(screen.getByText(`$${Math.round(after.egressPubMo).toLocaleString()}/mo`)).toBeInTheDocument();
    } finally {
      // Leave the shared CC singleton exactly as this test found it.
      act(() => {
        CC.undo();
      });
    }
  });
});
