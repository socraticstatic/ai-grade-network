import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine/index';
import { applyEstateProfile } from '../../engine/estateProfile';
import { advisorFindings, advisorHeadline, headStart } from './advisorModel';
import { advisorDone, advisorDoneKey } from './advisorPhase';
import { ladderFor } from './offerCatalog';
import AdvisorPage from './AdvisorPage';

/* AdvisorCanvas's own standalone-rendering test lives in
 * AdvisorCanvas.test.tsx, deliberately WITHOUT the react-router-dom mock
 * below — that file is the guard against AdvisorCanvas ever reaching for
 * useNavigate() itself (this file's module-scoped mock would silently
 * swallow that regression otherwise, since every test here shares it). */

/* Navigation is asserted by destination, not by router internals — same
 * pattern MoneyOnTheTableWidget.test.tsx and IntentThreads.tsx use. */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

const nf = new Intl.NumberFormat('en-US');

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  mockNavigate.mockClear();
});

afterEach(() => {
  applyEstateProfile(CC as never, 'acme');
  localStorage.clear();
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/discover/advisor']}>
      <AdvisorPage />
    </MemoryRouter>,
  );

/** Drives the page from observe through the scan theater to ready, under
 *  whatever estate profile is already active. Meridian only models aws +
 *  azure, so AWS is always a shape-valid pick here. */
function driveToReady() {
  fireEvent.click(screen.getByTestId('advisor-observe-cta'));
  fireEvent.click(screen.getByText('AWS'));
  fireEvent.change(screen.getByLabelText(/IAM role ARN/i), {
    target: { value: 'arn:aws:iam::123456789012:role/CloudConnectDiscovery' },
  });
  fireEvent.click(screen.getByTestId('advisor-intake-submit'));
  act(() => {
    vi.advanceTimersByTime(620 * 20); // well past meridian's aws region count
  });
}

describe('AdvisorPage', () => {
  it('observe: states the engine head-start numbers and a single CTA, no status chip yet', () => {
    applyEstateProfile(CC as never, 'meridian');
    renderPage();
    const hs = headStart(CC as never);
    expect(screen.getByText(new RegExp(nf.format(hs.total)))).toBeInTheDocument();
    expect(screen.getByTestId('advisor-observe-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('advisor-status-chip')).not.toBeInTheDocument();
  });

  it('walks observe -> intake -> scanning -> ready: the header chip flips, and the ready canvas states the headline + one card per finding under meridian', () => {
    vi.useFakeTimers();
    applyEstateProfile(CC as never, 'meridian');
    try {
      renderPage();
      fireEvent.click(screen.getByTestId('advisor-observe-cta'));

      fireEvent.click(screen.getByText('AWS'));
      // intake: trust copy is present at the moment of ask
      expect(screen.getByText(/stay in your browser/i)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/IAM role ARN/i), {
        target: { value: 'arn:aws:iam::123456789012:role/CloudConnectDiscovery' },
      });
      fireEvent.click(screen.getByTestId('advisor-intake-submit'));

      expect(screen.getByTestId('advisor-status-chip')).toHaveTextContent(/Analyzing your estate/i);

      act(() => {
        vi.advanceTimersByTime(620 * 20);
      });

      expect(screen.getByTestId('advisor-status-chip')).toHaveTextContent(/Recommendations ready/i);

      const findings = advisorFindings(CC as never);
      const headline = advisorHeadline(CC as never);
      expect(findings.length).toBe(4); // meridian: all four kinds present
      expect(headline.findings).toBe(4);
      expect(screen.getByTestId('advisor-headline')).toHaveTextContent(String(headline.findings));
      for (const f of findings) {
        expect(screen.getByTestId(`finding-card-${f.kind}`)).toBeInTheDocument();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('the rail states a disabled placeholder before ready, then an enabled prompt with seeded questions once ready', () => {
    vi.useFakeTimers();
    applyEstateProfile(CC as never, 'meridian');
    try {
      renderPage();
      const inputBefore = screen.getByPlaceholderText(/Building your recommendation/i);
      expect(inputBefore).toBeDisabled();
      for (const btn of screen.getAllByTestId('advisor-seeded-question')) {
        expect(btn).toBeDisabled();
      }

      driveToReady();

      const inputAfter = screen.getByPlaceholderText(/Ask about your recommendation/i);
      expect(inputAfter).not.toBeDisabled();
      for (const q of ['Why this finding?', 'How much do I save?', 'What is NetBond Adv?']) {
        expect(screen.getByText(q)).toBeInTheDocument();
      }
      // "disabled-until-ready": gated on phase the same as the input above,
      // enabled once ready — Task 6 wires their click behavior, not their
      // enabled state.
      expect(screen.getAllByTestId('advisor-seeded-question')).toHaveLength(3);
      for (const btn of screen.getAllByTestId('advisor-seeded-question')) {
        expect(btn).not.toBeDisabled();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('"Skip to the estate" is present at every phase (observe, intake, scanning, ready) and marks the profile done on click', () => {
    vi.useFakeTimers();
    applyEstateProfile(CC as never, 'meridian');
    try {
      renderPage();
      expect(screen.getByTestId('advisor-skip')).toBeInTheDocument(); // observe

      fireEvent.click(screen.getByTestId('advisor-observe-cta'));
      expect(screen.getByTestId('advisor-skip')).toBeInTheDocument(); // intake

      fireEvent.click(screen.getByText('AWS'));
      fireEvent.change(screen.getByLabelText(/IAM role ARN/i), {
        target: { value: 'arn:aws:iam::123456789012:role/CloudConnectDiscovery' },
      });
      fireEvent.click(screen.getByTestId('advisor-intake-submit'));
      expect(screen.getByTestId('advisor-skip')).toBeInTheDocument(); // scanning

      act(() => {
        vi.advanceTimersByTime(620 * 20);
      });
      expect(screen.getByTestId('advisor-skip')).toBeInTheDocument(); // ready

      fireEvent.click(screen.getByTestId('advisor-skip'));
      expect(advisorDone('acme')).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('/discover');
    } finally {
      vi.useRealTimers();
    }
  });

  it('accepting a tier marks the profile done under the ACTIVE profile and navigates to that tier\'s route', () => {
    vi.useFakeTimers();
    applyEstateProfile(CC as never, 'meridian');
    localStorage.setItem('estateProfile', 'meridian'); // resolveProfile reads this, not applyEstateProfile's CC swap
    try {
      renderPage();
      driveToReady();

      const findings = advisorFindings(CC as never);
      const first = findings[0];
      const card = screen.getByTestId(`finding-card-${first.kind}`);
      fireEvent.click(within(card).getByTestId(`finding-ladder-toggle-${first.kind}`));
      const tier = ladderFor(first.kind)[0];
      fireEvent.click(within(card).getByTestId(`finding-tier-${tier.key}`));

      expect(mockNavigate).toHaveBeenCalledWith(tier.route);
      expect(advisorDone('meridian')).toBe(true);
      expect(advisorDone('acme')).toBe(false);
      expect(localStorage.getItem(advisorDoneKey('meridian'))).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('each ready-phase card carries a "why we recommend this" popover with the finding\'s why text', () => {
    vi.useFakeTimers();
    applyEstateProfile(CC as never, 'meridian');
    try {
      renderPage();
      driveToReady();
      const findings = advisorFindings(CC as never);
      const f = findings[0];
      const card = screen.getByTestId(`finding-card-${f.kind}`);
      expect(within(card).queryByText(f.why)).not.toBeInTheDocument();
      fireEvent.click(within(card).getByRole('button', { name: /why we recommend this/i }));
      expect(within(card).getByText(f.why)).toBeInTheDocument();

      // aria wiring: the toggle controls the id the revealed text carries.
      const toggle = within(card).getByRole('button', { name: /why we recommend this/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const controlsId = toggle.getAttribute('aria-controls');
      expect(controlsId).toBeTruthy();
      expect(document.getElementById(controlsId!)).toHaveTextContent(f.why);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rail evidence chips are short labels — one number, never the full title/evidence sentence', () => {
    vi.useFakeTimers();
    applyEstateProfile(CC as never, 'meridian');
    try {
      renderPage();
      driveToReady();
      const findings = advisorFindings(CC as never);
      const chips = screen.getByTestId('advisor-evidence-chips');
      for (const f of findings) {
        // The chip never repeats the card's full sentence...
        expect(within(chips).queryByText(f.title)).not.toBeInTheDocument();
        expect(within(chips).queryByText(f.evidence)).not.toBeInTheDocument();
      }
      // ...and a priced finding's chip states money, not a bare count.
      const priced = findings.find(f => f.savingsMo !== null && f.savingsMo > 0);
      if (priced) {
        expect(within(chips).getByText(new RegExp(`\\$${Math.round(priced.savingsMo!).toLocaleString()}/mo`))).toBeInTheDocument();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('an invalid credential shows the inline expected-format error, wired via aria-describedby', () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      renderPage();
      fireEvent.click(screen.getByTestId('advisor-observe-cta'));
      fireEvent.click(screen.getByText('AWS'));

      const input = screen.getByLabelText(/IAM role ARN/i);
      fireEvent.change(input, { target: { value: 'not-an-arn' } });

      expect(screen.getByText(/Expected an IAM role ARN/i)).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy!)).toHaveTextContent(/Expected an IAM role ARN/i);
      expect(screen.getByTestId('advisor-intake-submit')).toBeDisabled();
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });
});
