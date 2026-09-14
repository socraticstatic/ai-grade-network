import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { andiResolveCards } from './andiBrain';
import { ruleProposals } from '../govern/ruleProposals';
import { CC } from '../../engine';
import { MainNav } from '../../components/navigation/MainNav';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

describe('Andi proposals', () => {
  test('resolve cards include one proposal card per live proposal', () => {
    const cards = andiResolveCards(CC).filter(c => c.move === 'proposal');
    expect(cards).toHaveLength(ruleProposals(CC).length);
    expect(cards[0].title).toBe(ruleProposals(CC)[0].title);
  });

  test('the nav badge states the proposal count', () => {
    render(<MemoryRouter><MainNav /></MemoryRouter>);
    const badge = screen.getByTestId('andi-proposal-badge');
    expect(badge).toHaveTextContent(String(ruleProposals(CC).length));
  });

  test('the badge disappears when nothing needs a rule', () => {
    for (const p of ruleProposals(CC)) CC.enforceRule(p.ruleId);
    render(<MemoryRouter><MainNav /></MemoryRouter>);
    expect(screen.queryByTestId('andi-proposal-badge')).not.toBeInTheDocument();
  });

  test('the toggle announces the proposal count in its accessible name', () => {
    render(<MemoryRouter><MainNav /></MemoryRouter>);
    const count = ruleProposals(CC).length;
    expect(count).toBeGreaterThan(0);
    const label = count === 1 ? 'Ask Andi: 1 proposal waiting' : `Ask Andi: ${count} proposals waiting`;
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });

  test('the toggle reads plainly when there is nothing to review', () => {
    for (const p of ruleProposals(CC)) CC.enforceRule(p.ruleId);
    render(<MemoryRouter><MainNav /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Ask Andi' })).toBeInTheDocument();
  });
});
