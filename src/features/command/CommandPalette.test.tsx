import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { CommandPalette } from './CommandPalette';
import { CC } from '../../engine';
import { fmtTokens } from '../ai-fabric/aiSpend';

const renderPalette = () =>
  render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  );

const open = () => fireEvent.keyDown(window, { key: 'k', metaKey: true });

describe('CommandPalette — typed intents lead the list', () => {
  afterEach(() => {
    // Close if a test left it open; the listener lives on window.
    fireEvent.keyDown(window, { key: 'Escape' });
  });

  it('a cap query surfaces the parsed intent first, and Enter runs it through the engine', () => {
    const prior = CC.tokenBudgetOf('shared-services');
    try {
      renderPalette();
      open();

      const input = screen.getByPlaceholderText(/jump to a section/i);
      fireEvent.change(input, { target: { value: 'cap shared-services 1m' } });

      const dialog = screen.getByRole('dialog', { name: /command palette/i });
      const rows = within(dialog).getAllByRole('button');
      expect(rows[0].textContent).toContain(
        `Cap shared-services at ${fmtTokens(1_000_000)} tokens/day · token policy`,
      );

      fireEvent.keyDown(input, { key: 'Enter' });
      expect(CC.tokenBudgetOf('shared-services')).toBe(1_000_000);
      // Run closes the palette, same as every other command.
      expect(screen.queryByRole('dialog')).toBeNull();
    } finally {
      CC.setTokenPolicy('shared-services', { budget: prior });
    }
  });

  it('free text yields no intent and the fuzzy list behaves as before', () => {
    renderPalette();
    open();

    const input = screen.getByPlaceholderText(/jump to a section/i);
    fireEvent.change(input, { target: { value: 'discover' } });

    const dialog = screen.getByRole('dialog', { name: /command palette/i });
    const rows = within(dialog).getAllByRole('button');
    expect(rows.some(r => /Go to Discover/.test(r.textContent ?? ''))).toBe(true);
    expect(rows.some(r => r.textContent?.includes('token policy'))).toBe(false);
  });
});
