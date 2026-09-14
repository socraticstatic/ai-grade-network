import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../../engine';
import { SavingsTab } from './SavingsTab';
import { teamCards } from './costFigures';

/* Shared engine singleton: the flag tests mutate and undo restores. */
beforeAll(() => {
  CC.promptTrace!('rd-helion', 'helion-70b', 'savings tab test drive');
});

afterEach(() => {
  while (CC.gatewayFlags().routing || CC.gatewayFlags().caching) CC.undo();
});

const renderTab = () =>
  render(<MemoryRouter><SavingsTab /></MemoryRouter>);

describe('SavingsTab', () => {
  it('flags off: both warning footers with their levers', () => {
    renderTab();
    expect(screen.getByTestId('cost-footer-routing')).toHaveTextContent('Routing policy not configured');
    expect(screen.getByTestId('cost-footer-caching')).toHaveTextContent('Caching disabled');
    expect(screen.getByTestId('cost-flag-routing')).toHaveTextContent('Set policy');
    expect(screen.getByTestId('cost-flag-caching')).toHaveTextContent('Enable caching');
  });

  it('the lever flips the ENGINE flag and the footer goes achieved', () => {
    renderTab();
    fireEvent.click(screen.getByTestId('cost-flag-routing'));
    expect(CC.gatewayFlags().routing).toBe(true);
    expect(screen.getByTestId('cost-footer-routing')).toHaveTextContent(/routing is on/i);
    // the other card is untouched
    expect(screen.getByTestId('cost-footer-caching')).toHaveTextContent('Caching disabled');
  });

  it('budget card draws the cumulative line; team cards render sorted with drivers', () => {
    renderTab();
    const budget = screen.getByTestId('cost-budget');
    expect(budget.querySelector('polyline')).not.toBeNull();

    const cards = teamCards(CC);
    expect(cards.length).toBeGreaterThanOrEqual(3);
    cards.forEach(c => {
      const el = screen.getByTestId(`cost-team-${c.tag}`);
      expect(within(el).getByText(c.driver)).toBeInTheDocument();
    });
  });

  it('never states a saving that formats to $0.00, in any state', () => {
    /* aiSpend's law, applied here: a money claim must survive formatting.
       Both card states are checked - the warning state's green line and the
       achieved footers swap to non-money sentences below a cent. */
    renderTab();
    expect(screen.queryByText(/\$0\.00\/mo/)).toBeNull();
    CC.setGatewayFlag('routing', true);
    CC.setGatewayFlag('caching', true);
    renderTab();
    expect(screen.queryByText(/\$0\.00\/mo/)).toBeNull();
  });

  it('provider share names its basis honestly', () => {
    renderTab();
    const share = screen.getByTestId('provider-share');
    expect(share.textContent).toMatch(/metered spend|budget ceilings/);
  });
});
