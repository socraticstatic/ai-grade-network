import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatTile } from './StatTile';

describe('StatTile', () => {
  it('renders label, value, and a good delta', () => {
    render(<StatTile label="Savings identified" value="$4,700/mo" delta={{ text: '+$310 this session', tone: 'good' }} />);
    expect(screen.getByText('Savings identified')).toBeInTheDocument();
    expect(screen.getByText('$4,700/mo')).toBeInTheDocument();
    expect(screen.getByText('+$310 this session')).toHaveClass('text-fw-success');
  });

  it('renders a meter when provided', () => {
    render(<StatTile label="Commit draw" value="$27,400" meter={{ pct: 91, label: '91% of $30,000 commit' }} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '91');
  });

  it('clamps negative pct to 0 for both aria-valuenow and bar width', () => {
    render(<StatTile label="Commit draw" value="$0" meter={{ pct: -5, label: 'below floor' }} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '0');
    const bar = meter.firstElementChild as HTMLElement;
    expect(bar.style.width).toBe('0%');
  });

  it('clamps pct above 100 to 100 for aria-valuenow', () => {
    render(<StatTile label="Commit draw" value="$45,000" meter={{ pct: 150, label: 'over commit' }} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '100');
  });

  it('neutral delta renders slate, never amber', () => {
    render(<StatTile label="Egress spend" value="$9,100/mo" delta={{ text: '+$1,200 this month', tone: 'neutral' }} />);
    const delta = screen.getByText('+$1,200 this month');
    expect(delta).toHaveClass('text-fw-bodyLight');
    expect(delta.className).not.toMatch(/b45309|ea712f|amber|warn/);
  });

  it('critical delta renders red (reserved for true errors)', () => {
    render(<StatTile label="Path health" value="down" delta={{ text: 'circuit down', tone: 'critical' }} />);
    expect(screen.getByText('circuit down')).toHaveClass('text-fw-error');
  });
});
