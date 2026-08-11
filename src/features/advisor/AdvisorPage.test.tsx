import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine/index';
import { applyEstateProfile } from '../../engine/estateProfile';
import { advisorFindings, advisorHeadline, headStart } from './advisorModel';
import { advisorDone, advisorDoneKey } from './advisorPhase';
import { ladderFor } from './offerCatalog';
import AdvisorPage from './AdvisorPage';
import { AdvisorCanvas } from './AdvisorCanvas';

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

  it('"Skip to the estate" is present at every phase and marks the profile done on click', () => {
    renderPage();
    expect(screen.getByTestId('advisor-skip')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('advisor-observe-cta'));
    expect(screen.getByTestId('advisor-skip')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('advisor-skip'));
    expect(advisorDone('acme')).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/discover');
  });

  it('accepting a tier marks the profile done and navigates to that tier\'s route', () => {
    vi.useFakeTimers();
    applyEstateProfile(CC as never, 'meridian');
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
      expect(advisorDone('acme')).toBe(true);
      expect(localStorage.getItem(advisorDoneKey('acme'))).toBe('1');
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
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('AdvisorCanvas standalone', () => {
  const noop = () => {};

  it('canvas-stands-alone: with no rail, the ready phase renders the headline, one card per finding, and each card\'s complete 3-tier ladder', () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      const findings = advisorFindings(CC as never);
      const headline = advisorHeadline(CC as never);
      const hs = headStart(CC as never);
      const onAcceptTier = vi.fn();

      render(
        <AdvisorCanvas
          phase="ready"
          headStart={hs}
          onStartIntake={noop}
          providers={[]}
          providerId=""
          onSelectProvider={noop}
          provider={undefined}
          credential=""
          onCredentialChange={noop}
          credValid={false}
          onSubmitCredential={noop}
          steps={[]}
          scanIdx={0}
          headline={headline}
          findings={findings}
          onAcceptTier={onAcceptTier}
        />,
      );

      expect(screen.getByTestId('advisor-headline')).toBeInTheDocument();
      expect(findings.length).toBe(4);
      for (const f of findings) {
        const card = screen.getByTestId(`finding-card-${f.kind}`);
        fireEvent.click(within(card).getByTestId(`finding-ladder-toggle-${f.kind}`));
        for (const tier of ladderFor(f.kind)) {
          const btn = within(card).getByTestId(`finding-tier-${tier.key}`);
          expect(btn).toBeInTheDocument();
          fireEvent.click(btn);
          expect(onAcceptTier).toHaveBeenCalledWith(tier.route);
        }
      }
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });
});
