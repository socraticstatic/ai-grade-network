import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { AssessmentFindingsWidget } from './AssessmentFindingsWidget';
import { CC } from '../../../../engine';

describe('AssessmentFindingsWidget', () => {
  test('states the recoverable-per-month figure and the security event count', () => {
    render(<AssessmentFindingsWidget />);
    const r = CC.assessmentReport();
    expect(screen.getByText(`$${Math.round(r.recoverableMo).toLocaleString()}/mo`)).toBeInTheDocument();
    expect(screen.getByText(String(r.securityEvents))).toBeInTheDocument();
  });

  /* Row 10 of the phase-0 metric audit: "Invisible share" named nothing —
     invisible share OF WHAT. Same figure, no new derivation; the label now
     completes the sentence the big number starts. */
  test('names what the invisible-share figure measures', () => {
    render(<AssessmentFindingsWidget />);
    expect(screen.getByText('of traffic you cannot see')).toBeInTheDocument();
  });
});
