import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { CC } from '../../engine';
import { ArbitrageBreakdown } from './ArbitrageBreakdown';

/**
 * The breakdown is the live centerpiece. Attaching an opportunity bucket must
 * fire the mapped engine action, recompute arbitrage(), flip the row to
 * captured, and bank the bucket's saving into the session tally — all from the
 * one per-bucket model. Fresh window.CC per file; each attach pushes one undo
 * entry, reverted after the test so order doesn't matter.
 */
const attachedThisFile: number[] = [];
afterEach(() => {
  attachedThisFile.forEach(() => CC.undo());
  attachedThisFile.length = 0;
});

const fmt = (n: number) => `$${n.toLocaleString()}`;

describe('ArbitrageBreakdown', () => {
  it('renders every egress bucket ranked by saving, with public→AT&T figures', () => {
    const arb = CC.arbitrage();
    render(<ArbitrageBreakdown />);
    for (const b of arb.buckets) {
      expect(screen.getByText(b.label)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`save ${fmt(b.saving).replace(/\$/, '\\$')} \\(${b.savingPct}%\\)`))).toBeInTheDocument();
    }
    // Ranking: DOM order matches saving-desc order from the engine.
    const labels = screen.getAllByText(/./, { selector: 'span.truncate' }).map(n => n.textContent);
    const expected = [...arb.buckets].map(b => b.label);
    expect(labels).toEqual(expected);
  });

  it('base-private is an informational captured row with no Attach lever', () => {
    render(<ArbitrageBreakdown />);
    const row = screen.getByText('Committed base').closest('li')!;
    expect(within(row).queryByRole('button')).toBeNull();
    expect(within(row).getByText(/on the fabric/i)).toBeInTheDocument();
  });

  it('attaching an opportunity bucket fires the engine action, recomputes, flips the row, and banks the saving', async () => {
    const azure = CC.arbitrage().buckets.find(b => b.key === 'azure')!;
    expect(azure.attached).toBe(false); // seed: er1 inactive
    const savingsBefore = CC.arbitrage().savings;

    render(<ArbitrageBreakdown />);
    const btn = screen.getByRole('button', { name: new RegExp(`Attach ${azure.label}`, 'i') });
    attachedThisFile.push(1);
    fireEvent.click(btn);

    // Engine mutated: the on-ramp is active and arbitrage recomputed.
    await waitFor(() => expect(CC.arbitrage().buckets.find(b => b.key === 'azure')!.attached).toBe(true));
    expect(CC.arbitrage().savings).toBe(savingsBefore + azure.saving);

    // Row flipped to captured; the tally banked exactly this bucket's saving.
    const row = screen.getByText(azure.label).closest('li')!;
    expect(within(row).queryByRole('button')).toBeNull();
    expect(within(row).getByText(/on the fabric/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${fmt(azure.saving).replace(/\$/, '\\$')}/mo captured so far`))).toBeInTheDocument();
  });
});
