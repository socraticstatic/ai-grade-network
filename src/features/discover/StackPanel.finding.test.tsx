import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { StackPanel } from './StackPanel';
import { ruleProposals } from '../govern/ruleProposals';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

describe('?draft=finding-<id>', () => {
  test('stages the proposal\'s rule as an enforce move and names the finding', async () => {
    const p = ruleProposals(CC)[0];
    render(
      <MemoryRouter initialEntries={[`/discover?draft=${p.id}`]}>
        <StackPanel />
      </MemoryRouter>,
    );
    // The tray names the finding it came from, and the rule it would enforce.
    // The tray's 'enforce' move (stackFigures.moveLabel) states the rule by
    // its name, not its id, so that's what the assertion checks for here.
    expect(await screen.findByText(new RegExp(p.title.slice(0, 20), 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Enforce ${p.ruleName}`, 'i'))).toBeInTheDocument();
  });

  test('an unknown finding token stages nothing', () => {
    render(
      <MemoryRouter initialEntries={['/discover?draft=finding-no-such']}>
        <StackPanel />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Proposed by Andi/i)).not.toBeInTheDocument();
  });
});
