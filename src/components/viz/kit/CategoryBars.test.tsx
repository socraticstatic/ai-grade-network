import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryBars } from './CategoryBars';

const items = [
  { label: 'Allowed', value: 8, color: '#2d7e24' },
  { label: 'Guardrail', value: 2, color: '#0057b8' },
  { label: 'Denied', value: 0, color: '#94a3b8' },
];

describe('CategoryBars', () => {
  it('renders one row per category with label, count, and a bar scaled to the max', () => {
    render(<CategoryBars items={items} ariaLabel="Decision outcomes" />);
    const list = screen.getByRole('list', { name: 'Decision outcomes' });
    expect(list.children).toHaveLength(3);
    const allowedBar = screen.getByTestId('category-bar-Allowed');
    expect(allowedBar.style.width).toBe('100%');
    expect(screen.getByTestId('category-bar-Guardrail').style.width).toBe('25%');
    expect(screen.getByTestId('category-bar-Denied').style.width).toBe('0%');
  });
  it('shows the value beside every label', () => {
    render(<CategoryBars items={items} ariaLabel="Decision outcomes" />);
    expect(screen.getByText('Allowed · 8')).toBeInTheDocument();
    expect(screen.getByText('Denied · 0')).toBeInTheDocument();
  });
});
