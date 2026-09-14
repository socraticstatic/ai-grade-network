import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerdictLine } from './VerdictLine';

describe('VerdictLine', () => {
  it('renders the verdict sentence as a paragraph with the verdict-line testid', () => {
    render(<VerdictLine>Traffic is flowing clean.</VerdictLine>);
    const p = screen.getByTestId('verdict-line');
    expect(p.tagName).toBe('P');
    expect(p).toHaveTextContent('Traffic is flowing clean.');
  });
});
