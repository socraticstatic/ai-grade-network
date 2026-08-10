import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { TokenBudgetsWidget } from './TokenBudgetsWidget';
import { CC } from '../../../../engine';
import { fmtTokens } from '../../../ai-fabric/aiSpend';

/* Navigation is asserted by destination, not by router internals — same
   pattern IntentThreads.tsx's own tests use. */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

afterEach(() => { mockNavigate.mockClear(); });

const renderWidget = () => render(<MemoryRouter><TokenBudgetsWidget /></MemoryRouter>);

describe('TokenBudgetsWidget', () => {
  test('renders one row per token policy with its tag', () => {
    renderWidget();
    const policies = CC.tokenPolicyList();
    expect(policies.length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('token-policy-row')).toHaveLength(policies.length);
    expect(screen.getByText(policies[0].tag)).toBeInTheDocument();
  });

  /* Row 11 of the phase-0 metric audit: "0 of 2.40B" led with a raw token
     count nobody reads in two seconds, with the honest "0%" reading
     trailing after a " · ". Reorder, not a new derivation — the meter's own
     pct and budget, pct leading. */
  test('a metered row leads with the percentage of its daily budget', () => {
    renderWidget();
    const meters = CC.tokenMeterList() as { tag: string; pct: number }[];
    const policies = CC.tokenPolicyList() as { tag: string; budget: number }[];
    const metered = policies.find(p => meters.some(m => m.tag === p.tag));
    expect(metered, 'fixture must have at least one metered policy').toBeTruthy();
    const meter = meters.find(m => m.tag === metered!.tag)!;
    expect(
      screen.getByText(`${meter.pct}% of a ${fmtTokens(metered!.budget)}/day budget`),
    ).toBeInTheDocument();
  });

  test('Enforce stages the policy patch into the review tray, without mutating the estate', () => {
    const draft = CC.tokenPolicyList().find(p => !p.enforced);
    expect(draft).toBeTruthy();
    const tag = draft!.tag;

    renderWidget();
    const row = screen.getByText(tag).closest('li')!;
    const button = within(row).getByTestId('token-enforce');

    fireEvent.click(button);

    // Fails against a no-op onClick: an unwired handler never calls navigate.
    expect(mockNavigate).toHaveBeenCalledWith(`/discover?draft=policy-${tag}`);

    // Staging is not committing: the policy's enforced flag must be untouched.
    expect(CC.tokenPolicyList().find(p => p.tag === tag)?.enforced).toBe(false);
  });
});
