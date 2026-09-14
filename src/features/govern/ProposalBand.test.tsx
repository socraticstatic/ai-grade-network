import { render, screen, within, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { ProposalBand } from './ProposalBand';
import { ruleProposals } from './ruleProposals';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

const renderBand = () => render(<MemoryRouter><ProposalBand /></MemoryRouter>);

describe('ProposalBand', () => {
  test('renders one row per proposal, stating the engine\'s own evidence and impact', () => {
    renderBand();
    const proposals = ruleProposals(CC);
    const rows = screen.getAllByTestId('proposal-row');
    expect(rows).toHaveLength(proposals.length);
    const first = proposals[0];
    const row = rows[0];
    expect(within(row).getByText(first.title)).toBeInTheDocument();
    expect(within(row).getByText(new RegExp(String(first.impact.gbps)))).toBeInTheDocument();
  });

  /* This used to assert the opposite — "the primary action stages rather than
     enforcing", with Enforce it as a <Link> to /discover?draft=. That made the
     button a no-op on this surface: you pressed Enforce it and the advice you
     had just acted on was still sitting there, unchanged, because the actual
     enforcement happened only after a separate Commit on another page. The row
     already prints its own dryRun price, so the detour added a step and no
     information. Enforce it now enforces. */
  test('the primary action enforces, and the row retires itself', () => {
    renderBand();
    const before = ruleProposals(CC);
    const first = before[0];
    expect(CC.ruleEnforced(CC.ruleList().find((r: { id: string }) => r.id === first.ruleId))).toBe(false);

    fireEvent.click(screen.getAllByTestId('proposal-enforce')[0]);

    // The engine actually moved...
    expect(CC.ruleEnforced(CC.ruleList().find((r: { id: string }) => r.id === first.ruleId))).toBe(true);
    // ...and the advice is gone from the band, in place, with no navigation.
    const rows = screen.queryAllByTestId('proposal-row');
    expect(rows).toHaveLength(before.length - 1);
    expect(screen.queryByText(first.title)).not.toBeInTheDocument();
  });

  /* Enforce it acts, so it is a button; Tighten it still navigates to the
     pre-filled builder, so it stays a link. Both must name their proposal. */
  test('each row action states which proposal it belongs to', () => {
    renderBand();
    const first = ruleProposals(CC)[0];
    expect(screen.getByRole('button', { name: `Enforce it: ${first.title}` })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: `Tighten it: ${first.title}` })).toBeInTheDocument();
  });

  test('renders nothing when every finding is resolved', () => {
    for (const p of ruleProposals(CC)) CC.enforceRule(p.ruleId);
    renderBand();
    expect(screen.queryByTestId('proposal-row')).not.toBeInTheDocument();
    expect(screen.getByTestId('proposal-band-empty')).toBeInTheDocument();
  });

  // ProposalBand reads through useCloudControl (not useCloudControlLive) -
  // it must NOT need the 3s telemetry tick to notice an enforcement. Mount
  // once, enforce every proposal against the SAME live instance (no
  // re-render in between), and confirm it updates on its own from the
  // engine's real mutation event alone.
  test('an already-mounted band updates on its own once every proposal is enforced', () => {
    renderBand();
    const before = ruleProposals(CC);
    expect(before.length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('proposal-row')).toHaveLength(before.length);

    act(() => {
      for (const p of before) CC.enforceRule(p.ruleId);
    });

    expect(screen.queryByTestId('proposal-row')).not.toBeInTheDocument();
    expect(screen.getByTestId('proposal-band-empty')).toBeInTheDocument();
  });
});
