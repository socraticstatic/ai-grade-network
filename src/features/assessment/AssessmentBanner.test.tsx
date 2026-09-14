import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine';
import { AssessmentBanner } from './AssessmentBanner';

/* Engine singleton: every stage mutation unwinds through Undo. */
afterEach(() => {
  while (CC.assessment().stage !== 'not-started') {
    if (!CC.undo()) break;
  }
});

const at = () => render(<MemoryRouter><AssessmentBanner /></MemoryRouter>);

describe('AssessmentBanner', () => {
  it('invites before the assessment starts, and the CTA points at the funnel', () => {
    at();
    expect(screen.getByTestId('assessment-banner')).toHaveTextContent(/Measure for 14 days/);
    expect(screen.getByTestId('assessment-banner-cta')).toHaveAttribute('href', '/assessment');
  });

  it('states the day while measuring', () => {
    CC.startAssessment();
    CC.advanceAssessment(4);
    at();
    expect(screen.getByTestId('assessment-banner')).toHaveTextContent('day 5 of 14');
  });

  it('points at the report when it is ready, and disappears once closed', () => {
    CC.startAssessment();
    CC.advanceAssessment(14);
    const first = at();
    expect(screen.getByTestId('assessment-banner')).toHaveTextContent(/report is ready/);
    first.unmount();

    CC.closeAssessment();
    at();
    expect(screen.queryByTestId('assessment-banner')).toBeNull();
  });

  it('dismissal hides it without touching the engine', () => {
    at();
    fireEvent.click(screen.getByLabelText('Dismiss the assessment banner'));
    expect(screen.queryByTestId('assessment-banner')).toBeNull();
    expect(CC.assessment().stage).toBe('not-started');
  });
});
