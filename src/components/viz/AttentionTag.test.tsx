import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AttentionTag } from './AttentionTag';

describe('AttentionTag', () => {
  it('renders its label with the neutral slate treatment (no amber)', () => {
    render(<AttentionTag>public</AttentionTag>);
    const tag = screen.getByText('public');
    // Neutral: slate-600 text, slate-300 border, slate-50 fill.
    expect(tag).toHaveClass('text-fw-bodyLight');
    expect(tag).toHaveClass('border-fw-secondary');
    expect(tag.className).not.toMatch(/b45309|ea712f|amber|warn/);
  });

  it('renders a leading globe icon for internet-exposed states', () => {
    const { container } = render(<AttentionTag icon="globe">exposed</AttentionTag>);
    expect(container.querySelector('svg.lucide-globe')).toBeInTheDocument();
  });

  it('renders a leading clock icon for pending states', () => {
    const { container } = render(<AttentionTag icon="clock">pending</AttentionTag>);
    expect(container.querySelector('svg.lucide-clock')).toBeInTheDocument();
  });

  it('renders no icon when none is requested', () => {
    const { container } = render(<AttentionTag>plain</AttentionTag>);
    expect(container.querySelector('svg')).toBeNull();
  });
});
