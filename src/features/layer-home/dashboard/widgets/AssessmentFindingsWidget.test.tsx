import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { AssessmentFindingsWidget } from './AssessmentFindingsWidget';
import { CC } from '../../../../engine';
import { MemoryRouter } from 'react-router-dom';

describe('AssessmentFindingsWidget', () => {
  test('states the security event count', () => {
    render(<MemoryRouter><AssessmentFindingsWidget /></MemoryRouter>);
    const r = CC.assessmentReport();
    expect(screen.getByText(String(r.securityEvents))).toBeInTheDocument();
  });

  /* Row 8 of the phase-0 metric audit: "Recoverable" was a third noun for
     the same $19,900/mo the layer home already leads with under "Money on
     the table" (MoneyOnTheTableWidget, row 1) — cut, not relabelled. */
  test('drops the Recoverable tile — the board already leads with this figure', () => {
    render(<MemoryRouter><AssessmentFindingsWidget /></MemoryRouter>);
    expect(screen.queryByText('Recoverable')).not.toBeInTheDocument();
  });

  /* Row 10 of the phase-0 metric audit: "Invisible share" named nothing —
     invisible share OF WHAT. Same figure, no new derivation; the label now
     completes the sentence the big number starts. */
  test('names what the invisible-share figure measures', () => {
    render(<MemoryRouter><AssessmentFindingsWidget /></MemoryRouter>);
    expect(screen.getByText('of traffic you cannot see')).toBeInTheDocument();
  });
});

/* Row 9 of the metric audit: the security-findings count passed every test
   but T2 - it named a real number and led nowhere. Govern lists the same
   violations, so the tile is now the door to them. */
it('routes the security-findings count to Govern, where those findings live', () => {
  render(<MemoryRouter><AssessmentFindingsWidget /></MemoryRouter>);
  const link = screen.getByRole('link', { name: /open security findings/i });
  expect(link).toHaveAttribute('href', '/naas/govern');
});
