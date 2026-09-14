import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { ArbitrageHero } from './ArbitrageHero';

/**
 * The hero renders straight from arbitrage() — two bills, the realized saving,
 * and the honest ports disclosure. Numbers initialize to the engine figure on
 * mount (the count-up animates only on later changes), so the seed values are
 * asserted synchronously.
 */
describe('ArbitrageHero', () => {
  const k = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n).toLocaleString()}`);

  it('renders both bills, the savings pill, and the ports disclosure from arbitrage()', () => {
    const arb = CC.arbitrage();
    render(<ArbitrageHero />);

    // AI-grade network (current) bill, compact.
    expect(screen.getByTestId('hero-cc-bill')).toHaveTextContent(k(arb.cloudConnectBill));
    // Realized saving + percent.
    const saveNode = screen.getByTestId('hero-savings');
    expect(saveNode).toHaveTextContent(k(arb.savings));
    expect(saveNode).toHaveTextContent(`(${arb.savingsPct}%)`);
    // Honest ports line — full precision.
    expect(screen.getByText(new RegExp(`\\$${arb.portFeesMo.toLocaleString()}/mo AT&T fabric ports`))).toBeInTheDocument();
  });

  /* The figure is the BILL FLOOR (what egress costs once every bucket
     attaches), not the advisor-actionable "money on the table" the exec
     board and Discover quote from moneyOnTheTable(). Two true numbers that
     used to wear the same words and disagreed on screen; this one now names
     the bill it belongs to. */
  it('shows the bill floor as a forward call-to-action, in its own words', () => {
    const arb = CC.arbitrage();
    render(<ArbitrageHero />);
    if (arb.availableSavings > 0) {
      expect(screen.getByText(`${k(arb.availableSavings)}/mo`)).toBeInTheDocument();
      expect(screen.getByText(/off this bill once every path attaches/i)).toBeInTheDocument();
      expect(screen.queryByText(/more on the table/i)).not.toBeInTheDocument();
    }
  });

  it('the hyperscaler ceiling is the largest bill and the save equals the gap', () => {
    const arb = CC.arbitrage();
    expect(arb.hyperscalerBill).toBeGreaterThanOrEqual(arb.cloudConnectBill);
    expect(arb.savings).toBe(arb.hyperscalerBill - arb.cloudConnectBill);
  });
});
