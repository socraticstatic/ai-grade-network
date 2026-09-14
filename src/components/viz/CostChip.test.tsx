import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CostChip } from './CostChip';

describe('CostChip', () => {
  it('formats per-GB cost and applies tone', () => {
    render(<CostChip perGb={0.02} tone="controlled" />);
    const chip = screen.getByText('$0.02/GB');
    expect(chip).toHaveClass('text-fw-link');
  });

  it('public tone renders the neutral slate treatment with a globe icon (no amber)', () => {
    const { container } = render(<CostChip perGb={0.09} tone="public" />);
    const chip = screen.getByText(/\$0\.09\/GB/);
    expect(chip).toHaveClass('text-fw-bodyLight');
    expect(chip.className).not.toMatch(/b45309|ea712f|amber|warn/);
    expect(container.querySelector('svg.lucide-globe')).toBeInTheDocument();
  });

  it('saving tone renders green', () => {
    render(<CostChip perGb={0.01} tone="saving" />);
    expect(screen.getByText('$0.01/GB')).toHaveClass('text-fw-success');
  });
});
