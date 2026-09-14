import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { FlowBar } from './FlowBar';

function renderAt(path: string, ui: React.ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

describe('FlowBar', () => {
  it('renders the flow stepper (five stages) inside the band', () => {
    renderAt('/discover', <FlowBar />);
    expect(screen.getByRole('navigation', { name: /flow progress/i })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('renders the CTA as a link to the given route with the label + arrow', () => {
    renderAt('/discover', <FlowBar cta={{ label: 'Attach 142 public workloads', to: '/naas/connect' }} />);
    const link = screen.getByRole('link', { name: /attach 142 public workloads/i });
    expect(link).toHaveAttribute('href', '/naas/connect');
    expect(within(link).getByText('Attach 142 public workloads')).toBeInTheDocument();
  });

  it('renders the CTA as a button and fires onClick when no route is given', () => {
    const onClick = vi.fn();
    renderAt('/naas/cost', <FlowBar cta={{ label: 'Steer to save', onClick }} />);
    const btn = screen.getByRole('button', { name: /steer to save/i });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders no CTA control when cta is omitted', () => {
    renderAt('/discover', <FlowBar />);
    // stepper links exist, but no dedicated CTA link/button beyond the stepper stages
    expect(screen.queryByRole('button')).toBeNull();
  });
});
