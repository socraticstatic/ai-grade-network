import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach } from 'vitest';
import { AndiPanel, toggleAndi } from './AndiPanel';
import { CC } from '../../engine';
import { andiResolveCards } from './andiBrain';
import { ruleProposals } from '../govern/ruleProposals';

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><AndiPanel /></MemoryRouter>);

describe('AndiPanel', () => {
  beforeEach(() => localStorage.clear());

  test('closed by default; the toggle event opens and persists', () => {
    renderAt('/ai/home');
    expect(screen.queryByTestId('andi-panel')).toBeNull();
    fireEvent(window, new CustomEvent('cc-andi-toggle'));
    expect(screen.getByTestId('andi-panel')).toBeInTheDocument();
    expect(localStorage.getItem('cc-andi-open')).toBe('1');
  });

  test('empty state: Resolve cards from the advisor draft, Ask prompts for the layer', () => {
    localStorage.setItem('cc-andi-open', '1');
    renderAt('/ai/observe');
    // Proposal cards (findings joined to their preventive rule) now lead and
    // render in their own always-visible section - see
    // 'proposal cards persist even once the thread is non-empty' below.
    // This section covers the remaining families (intent/draft), which are
    // still gated to the empty-thread state.
    const resolve = screen.getByTestId('andi-resolve');
    const cards = andiResolveCards(CC).filter(c => c.move !== 'proposal');
    expect(within(resolve).getByText(cards[0].title)).toBeInTheDocument();
    const ask = screen.getByTestId('andi-ask');
    expect(within(ask).getByText('Which team is driving most spend?')).toBeInTheDocument();
    // Context chip names the layer and section.
    expect(screen.getByTestId('andi-context').textContent).toBe('AI Fabric · Insights');
  });

  test('proposal cards persist even once the thread is non-empty', () => {
    localStorage.setItem('cc-andi-open', '1');
    renderAt('/ai/home');
    const proposals = ruleProposals(CC);
    expect(proposals.length).toBeGreaterThan(0);
    expect(screen.getByTestId('andi-resolve-proposals')).toBeInTheDocument();
    expect(screen.getByText(proposals[0].title)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Which team is driving most spend?'));

    // The thread is non-empty now: the intent/draft section and Ask prompts
    // are gone (their existing gated behavior, unchanged)...
    expect(screen.queryByTestId('andi-ask')).not.toBeInTheDocument();
    // ...but the proposal cards are still here. Advice that vanishes the
    // moment you ask a question is not advice.
    expect(screen.getByTestId('andi-resolve-proposals')).toBeInTheDocument();
    expect(screen.getByText(proposals[0].title)).toBeInTheDocument();
  });

  test('asking a suggestion renders a grounded answer in the thread', () => {
    localStorage.setItem('cc-andi-open', '1');
    renderAt('/ai/home');
    fireEvent.click(screen.getByText('Which team is driving most spend?'));
    const panel = screen.getByTestId('andi-panel');
    // The user bubble and an answer that names a real destination.
    expect(within(panel).getAllByText('Which team is driving most spend?').length).toBeGreaterThan(0);
    expect(within(panel).getByRole('button', { name: 'Open Teams & limits' })).toBeInTheDocument();
  });

  test('a typed cap intent requires confirm, then applies through the engine', () => {
    localStorage.setItem('cc-andi-open', '1');
    renderAt('/ai/govern');
    const before = CC.tokenBudgetOf('shared-services');
    fireEvent.change(screen.getByTestId('andi-input'), { target: { value: 'cap shared-services 3m' } });
    fireEvent.submit(screen.getByTestId('andi-input').closest('form')!);
    const confirm = screen.getByRole('button', { name: /Cap shared-services at 3.00M tokens\/day/ });
    expect(CC.tokenBudgetOf('shared-services')).toBe(before);
    fireEvent.click(confirm);
    expect(CC.tokenBudgetOf('shared-services')).toBe(3_000_000);
    expect(screen.getByText(/Applied\. Undo/)).toBeInTheDocument();
    CC.setTokenPolicy('shared-services', { budget: before });
  });

  test('the context chip tracks the estate on non-layer routes', () => {
    localStorage.setItem('cc-andi-open', '1');
    renderAt('/discover');
    expect(screen.getByTestId('andi-context').textContent).toBe('Discover · Estate');
  });

  test('only one Resolve heading renders, even when proposal and intent/draft cards both exist', () => {
    localStorage.setItem('cc-andi-open', '1');
    renderAt('/ai/home');
    const proposalCards = andiResolveCards(CC).filter(c => c.move === 'proposal');
    const otherCards = andiResolveCards(CC).filter(c => c.move !== 'proposal');
    expect(proposalCards.length).toBeGreaterThan(0);
    expect(otherCards.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { name: /^Resolve$/i })).toHaveLength(1);
  });
});
