import { render, screen, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { FlowStepper } from './FlowStepper';
import { useFlowProgress, FLOW_STAGES } from './useFlowProgress';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FlowStepper />
    </MemoryRouter>,
  );
}

describe('FlowStepper', () => {
  it('renders the five flow stages left to right, in spine order', () => {
    renderAt('/naas/connect');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
    const labels = items.map(li => within(li).getByRole('link').textContent);
    expect(labels).toEqual(['Discover', 'Connect', 'Govern', 'Observe', 'Cost']);
  });

  it('marks the active route stage as current with aria-current="step"', () => {
    renderAt('/naas/govern');
    const current = screen.getByText('Govern').closest('li')!;
    expect(current).toHaveAttribute('aria-current', 'step');
  });

  it('shows a completion check on a done stage (Discover is always done)', () => {
    renderAt('/naas/connect');
    const discover = screen.getByText('Discover').closest('li')!;
    expect(discover.querySelector('svg.lucide-check')).toBeInTheDocument();
  });

  it('links each stage to its route', () => {
    renderAt('/discover');
    expect(screen.getByText('Cost').closest('a')).toHaveAttribute('href', '/naas/cost');
  });
});

describe('useFlowProgress', () => {
  it('lists all five stages in spine order regardless of route', () => {
    expect(FLOW_STAGES.map(s => s.stage)).toEqual(['discover', 'connect', 'govern', 'observe', 'cost']);
  });

  it('marks Govern done once a rule is enforced', () => {
    function Probe() {
      const stages = useFlowProgress();
      const govern = stages.find(s => s.stage === 'govern')!;
      return <span data-testid="govern-status">{govern.status}</span>;
    }
    render(<MemoryRouter initialEntries={['/discover']}><Probe /></MemoryRouter>);
    // Route is discover, so govern is not current; no rule enforced yet.
    expect(screen.getByTestId('govern-status').textContent).toBe('upcoming');
    // Enforcing the finance-isolation rule flips Govern to done. Non-silent so
    // the engine emits and the subscribed hook re-renders.
    act(() => { CC.applyFix('isolateFinance'); });
    expect(screen.getByTestId('govern-status').textContent).toBe('done');
  });
});
