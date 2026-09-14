import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WizardCanvas } from './WizardCanvas';
import type { WizardCanvasSpec } from './wizardCanvasModel';

const base: WizardCanvasSpec = {
  left: { label: 'Equinix DC2', sub: 'Direct Connect' },
  right: { label: 'us-west-2', sub: 'AWS' },
  edgeLabel: 'Dedicated',
  thickness: 'medium',
  dual: false,
  edgeAnswered: false,
  leftAnswered: true,
  rightAnswered: false,
};

describe('WizardCanvas', () => {
  it('renders answered elements solid and unanswered as ghosts', () => {
    render(<WizardCanvas spec={base} />);
    expect(screen.getByTestId('wc-left')).toHaveAttribute('data-answered', 'true');
    expect(screen.getByTestId('wc-right')).toHaveAttribute('data-answered', 'false');
    // both edges track edgeAnswered - the connection question, not the stations
    expect(screen.getByTestId('wc-edge-left')).toHaveAttribute('data-answered', 'false');
    expect(screen.getByTestId('wc-edge-right')).toHaveAttribute('data-answered', 'false');
  });
  it('a null station renders its ghost placeholder text', () => {
    render(<WizardCanvas spec={{ ...base, right: null }} />);
    expect(screen.getByTestId('wc-right').textContent).toContain('Not chosen yet');
  });
  it('dual renders the double-line edge', () => {
    render(<WizardCanvas spec={{ ...base, dual: true }} />);
    expect(screen.getByTestId('wc-edge-right')).toHaveAttribute('data-dual', 'true');
  });
  it('shows the edge label and the station labels', () => {
    render(<WizardCanvas spec={base} />);
    expect(screen.getByText('Dedicated')).toBeInTheDocument();
    expect(screen.getByText('Equinix DC2')).toBeInTheDocument();
    expect(screen.getByText('us-west-2')).toBeInTheDocument();
  });
});
