import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { AssessmentPage } from './AssessmentPage';
import { CC } from '../../engine';
import { fmtUsd } from '../ai-fabric/aiSpend';

/**
 * The assessment funnel page, one describe per stage, in stage order.
 * Each stage is reached by driving the REAL engine (start / advance /
 * close between renders); the describes are ordered so each one inherits
 * the stage the previous one left behind, exactly like the engine's own
 * state-assessment.test.ts walks the machine.
 */

// Freeze the agents at module scope, like state-assessment.test.ts does,
// so telemetry ticks cannot move a figure between a read and its assertion.
(CC.agentList!() as { id: string; enabled: boolean }[])
  .filter(a => a.enabled)
  .forEach(a => CC.toggleAgent!(a.id));

const wrap = () =>
  render(
    <MemoryRouter>
      <AssessmentPage />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('Setup (not-started)', () => {
  it('renders the setup stage with the entry headline', () => {
    wrap();
    const page = screen.getByTestId('assessment-page');
    expect(page).toHaveAttribute('data-stage', 'not-started');
    expect(
      screen.getByText(
        /In 14 days, find out what your AI traffic is costing and risking, before you commit to anything\./,
      ),
    ).toBeInTheDocument();
    // Back to portal on every state.
    expect(screen.getByTestId('assessment-back')).toBeInTheDocument();
  });

  it('the three value props show live engine figures', () => {
    wrap();
    const r = CC.assessmentReport();
    expect(screen.getByTestId('prop-security').textContent).toContain(String(r.securityEvents));
    expect(screen.getByTestId('prop-latency').textContent).toContain(`${r.msWasted}ms`);
    const recoverable = screen.getByTestId('prop-recoverable');
    if (fmtUsd(r.recoverableMo) !== fmtUsd(0) && !fmtUsd(r.recoverableMo).startsWith('<')) {
      expect(recoverable.textContent).toContain(`${fmtUsd(r.recoverableMo)}/mo`);
    } else {
      // The money gate: below a cent the claim is a sentence, never $0.00.
      expect(recoverable.textContent).not.toContain('$0.00');
    }
  });

  it('lists every cloud as an included connector with its region count', () => {
    wrap();
    const list = screen.getByTestId('connectors-list');
    const clouds = CC.clouds as { id: string; name: string }[];
    expect(clouds.length).toBeGreaterThan(0);
    for (const c of clouds) {
      const n = ((CC.regions as Record<string, unknown[]>)[c.id] ?? []).length;
      expect(list.textContent).toContain(c.name);
      expect(list.textContent).toContain(`${n} region${n === 1 ? '' : 's'}`);
    }
    expect(list.textContent?.match(/Included/g)?.length).toBe(clouds.length);
  });

  it('Start assessment drives the real engine into measuring', () => {
    wrap();
    fireEvent.click(screen.getByTestId('assessment-start'));
    expect(CC.assessment()).toMatchObject({ stage: 'measuring', day: 1 });
    // The page followed the engine without a remount.
    expect(screen.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'measuring');
  });
});

describe('Measuring (day N)', () => {
  it('shows the read-only badge and the day', () => {
    wrap();
    expect(screen.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'measuring');
    expect(screen.getByText(/Measuring\. Nothing is blocked or routed\./)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: `Day ${CC.assessment().day} of 14` }),
    ).toBeInTheDocument();
  });

  it('the five counters equal assessmentReport().counters', () => {
    wrap();
    const counters = CC.assessmentReport().counters;
    for (const [key, value] of Object.entries(counters)) {
      expect(screen.getByTestId(`counter-${key}`).textContent).toBe(String(value));
    }
  });

  it('the four detection rows state their live figures', () => {
    wrap();
    const r = CC.assessmentReport();
    expect(screen.getByTestId('detect-invisible').textContent).toContain(
      `${r.invisibleSharePct}%`,
    );
    expect(screen.getByTestId('detect-invisible').textContent).toContain(r.invisibleBasis);
    expect(screen.getByTestId('detect-security').textContent).toContain(
      String(r.securityBreakdown.denials),
    );
    expect(screen.getByTestId('detect-security').textContent).toContain(
      String(r.securityBreakdown.violations),
    );
    expect(screen.getByTestId('detect-spend')).toBeInTheDocument();
    expect(screen.getByTestId('detect-latency').textContent).toContain(`${r.msWasted}ms`);
  });

  it('the demo control advances the day', () => {
    wrap();
    const before = CC.assessment().day;
    fireEvent.click(screen.getByTestId('assessment-advance'));
    expect(CC.assessment().day).toBe(before + 1);
    expect(screen.getByRole('heading', { name: `Day ${before + 1} of 14` })).toBeInTheDocument();
    CC.undo(); // unwind: the next test owns the skip to day 14
    expect(CC.assessment().day).toBe(before);
  });

  it('Skip to day 14 lands on the report stage', () => {
    wrap();
    fireEvent.click(screen.getByTestId('assessment-skip'));
    expect(CC.assessment()).toMatchObject({ stage: 'report', day: 14 });
    expect(screen.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'report');
  });
});

describe('Report (day 14)', () => {
  it('the headline recoverable figure equals fmtUsd(assessmentReport().recoverableMo)', () => {
    wrap();
    const r = CC.assessmentReport();
    expect(screen.getByTestId('report-recoverable').textContent).toBe(
      `${fmtUsd(r.recoverableMo)}/mo`,
    );
    expect(screen.getByTestId('report-security').textContent).toBe(String(r.securityEvents));
    expect(screen.getByTestId('report-latency').textContent).toBe(`${r.msWasted}ms`);
  });

  it('three findings, each linking into the portal screen that states the figure', () => {
    wrap();
    const invisible = screen.getByTestId('finding-invisible');
    expect(invisible.querySelector('a')).toHaveAttribute('href', '/ai/observe');
    const spendFinding = screen.getByTestId('finding-spend');
    expect(spendFinding.querySelector('a')).toHaveAttribute('href', '/ai/observe?tab=savings');
    const security = screen.getByTestId('finding-security');
    expect(security.querySelector('a')).toHaveAttribute('href', '/naas/observe');
    expect(security.textContent).toContain(
      `${CC.assessmentReport().securityEvents} security events happened. Zero were stopped.`,
    );
  });

  it('Start the trial closes the assessment through the engine', () => {
    wrap();
    fireEvent.click(screen.getByTestId('assessment-close'));
    expect(CC.assessment().stage).toBe('closed');
  });
});

describe('Closed (day 15)', () => {
  it('states the completion date from startedAt + 14 days, not the live clock', () => {
    wrap();
    expect(screen.getByTestId('assessment-page')).toHaveAttribute('data-stage', 'closed');
    const { startedAt } = CC.assessment();
    expect(startedAt).not.toBeNull();
    const expected = new Date(startedAt! + 14 * 86_400_000).toLocaleDateString();
    expect(screen.getByTestId('assessment-completed').textContent).toBe(
      `Completed on ${expected}`,
    );
  });

  it('restates the headline figures as the estate stands today, with a portal link', () => {
    wrap();
    const r = CC.assessmentReport();
    expect(screen.getByText(/as the estate stands today/)).toBeInTheDocument();
    expect(screen.getByTestId('report-security').textContent).toBe(String(r.securityEvents));
    expect(screen.getByTestId('report-latency').textContent).toBe(`${r.msWasted}ms`);
    expect(screen.getByRole('link', { name: 'Open the portal' })).toHaveAttribute(
      'href',
      '/discover',
    );
  });

  it('undo unwinds the whole walk back to not-started', () => {
    CC.undo(); // close
    expect(CC.assessment().stage).toBe('report');
    CC.undo(); // skip to 14
    expect(CC.assessment()).toMatchObject({ stage: 'measuring', day: 1 });
    CC.undo(); // start
    expect(CC.assessment().stage).toBe('not-started');
  });
});

describe('the report bridges into standing intents', () => {
  it('a finding declares its intent in watch mode, and reads as declared after', async () => {
    const { fireEvent, within } = await import('@testing-library/react');
    // Reach the report stage on a clean machine.
    while (CC.assessment().stage !== 'not-started') { if (!CC.undo()) break; }
    CC.intentList().forEach(i => CC.removeIntent(i.id));
    CC.startAssessment();
    CC.advanceAssessment(14);

    const view = render(<MemoryRouter><AssessmentPage /></MemoryRouter>);
    const finding = view.getByTestId('finding-invisible');
    fireEvent.click(within(finding).getByTestId('bridge-declare-private-inference'));

    const declared = CC.intentList().find(i => i.key === 'private-inference');
    expect(declared).toBeTruthy();
    expect(declared!.mode).toBe('watch');
    expect(within(finding).getByTestId('bridge-declared-private-inference'))
      .toHaveTextContent(/watch mode/);

    // Unwind: the declaration, the advance, the start.
    CC.removeIntent(declared!.id);
    while (CC.assessment().stage !== 'not-started') { if (!CC.undo()) break; }
    view.unmount();
  });
});
