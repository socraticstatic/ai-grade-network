import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { MoneyOnTheTableWidget } from './MoneyOnTheTableWidget';
import { CC } from '../../../../engine';
import { advisorDraft, moneyOnTheTable } from '../../../discover/stackFigures';

/* Navigation is asserted by destination, not by router internals — same
   pattern IntentThreads.tsx's own tests use. */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

afterEach(() => { mockNavigate.mockClear(); });

const renderWidget = () => render(<MemoryRouter><MoneyOnTheTableWidget /></MemoryRouter>);

describe('MoneyOnTheTableWidget', () => {
  test('states available savings and lists the top unattached bucket', () => {
    renderWidget();
    const arb = CC.arbitrage();
    // One source for headline and count - see moneyOnTheTable's doc comment.
    expect(screen.getByText(`$${Math.round(moneyOnTheTable(CC).savingsMo).toLocaleString()}/mo`)).toBeInTheDocument();
    const topUnattached = arb.buckets.find(b => !b.attached);
    if (topUnattached) expect(screen.getByText(topUnattached.label)).toBeInTheDocument();
  });

  test('Review stages the advisor draft into the review tray, without touching the estate', () => {
    const before = advisorDraft(CC).moves;
    const attachedBefore = CC.fabricModel().regions.filter(r => r.attached).length;

    renderWidget();
    const button = screen.getByTestId('money-review');

    if (before.length === 0) {
      // Nothing for the advisor to recommend against this seed: the button
      // must be disabled rather than the test asserting nothing real.
      expect(button).toBeDisabled();
      return;
    }
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    // Fails against a no-op onClick: an unwired handler never calls navigate.
    expect(mockNavigate).toHaveBeenCalledWith('/discover?draft=andi');

    // Staging is not committing: the estate and the advisor's draft must be
    // exactly as they were before the click.
    expect(advisorDraft(CC).moves).toEqual(before);
    expect(CC.fabricModel().regions.filter(r => r.attached).length).toBe(attachedBefore);
  });
});
