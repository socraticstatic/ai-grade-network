import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StackDeckPage } from './StackDeckPage';

/**
 * /stack renders as a standalone document: no router hooks, plain hash
 * anchors into the app. Rendered bare, no providers needed.
 */

const LIVE_ROUTES = [
  '#/ai/connect', '#/ai/govern', '#/ai/observe', '#/ai/cost',
  '#/naas/connect', '#/naas/govern', '#/naas/observe', '#/naas/cost',
];

describe('StackDeckPage', () => {
  it('renders all nine section headlines', () => {
    render(<StackDeckPage />);
    expect(screen.getByRole('heading', { name: /A verb is not a destination/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Four verbs across\. Four layers down/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /One experience over everything AT&T runs/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Design on it\. Share it\. A human commits/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Declare the outcome\. Watch it hold/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Eight rules route every label/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Eight links\. Four words/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sticky is three columns riding a fourth/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /The table was always there/ })).toBeInTheDocument();
  });

  it('the twin section walks the five-step loop and cites both companions', () => {
    render(<StackDeckPage />);
    for (const step of ['Design', 'Simulate', 'Share', 'Approve', 'The advisor drafts']) {
      expect(screen.getByText(step, { exact: true })).toBeInTheDocument();
    }
    expect(screen.getByText(/The time machine\./)).toBeInTheDocument();
    expect(screen.getByText(/⌘K intents\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open the twin/ })).toHaveAttribute('href', '#/discover');
    expect(screen.getByRole('link', { name: /Scrub the window/ })).toHaveAttribute('href', '#/naas/observe');
  });

  it('the ⌘K intents card says the grammar also declares standing intents', () => {
    render(<StackDeckPage />);
    expect(screen.getByText(/The same grammar now declares standing intents/)).toBeInTheDocument();
    // the example phrase appears in the ⌘K card and again in the Declare beat
    expect(screen.getAllByText(/keep ai private/).length).toBeGreaterThanOrEqual(2);
  });

  it('the standing-intents section walks the five-beat lifecycle', () => {
    render(<StackDeckPage />);
    for (const beat of ['Declare', 'Watch', 'Enforce', 'Drift', 'Synchronize']) {
      expect(screen.getByText(beat, { exact: true })).toBeInTheDocument();
    }
    // the vocabulary is the shipped one: derived status, three-valued
    expect(screen.getByText(/aligned, drifting, or violated/)).toBeInTheDocument();
    expect(screen.getByText(/The machine stages, never commits/)).toBeInTheDocument();
    // the section links into the live threads, like every other live claim
    expect(screen.getByRole('link', { name: /Watch the promises hold/ })).toHaveAttribute('href', '#/discover');
  });

  it('the 14-day assessment beat is the front door and links the live route', () => {
    render(<StackDeckPage />);
    expect(screen.getByText(/The 14-day assessment\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start the assessment/ })).toHaveAttribute('href', '#/assessment');
  });

  it('the rules include the intent corollary: status derived, never stored', () => {
    render(<StackDeckPage />);
    expect(screen.getByText('A promise has a status')).toBeInTheDocument();
    expect(screen.getByText(/derived on every read, never stored/)).toBeInTheDocument();
  });

  it('draws the full matrix: 16 body cells', () => {
    render(<StackDeckPage />);
    expect(screen.getAllByTestId('matrix-cell')).toHaveLength(16);
  });

  it('live rows link only at the eight real hash routes', () => {
    render(<StackDeckPage />);
    const matrix = screen.getByTestId('matrix');
    const links = within(matrix).getAllByRole('link');
    expect(links).toHaveLength(8);
    const hrefs = links.map(a => a.getAttribute('href'));
    for (const href of hrefs) {
      expect(LIVE_ROUTES).toContain(href);
    }
    // every one of the eight routes is present exactly once
    expect(new Set(hrefs).size).toBe(8);
  });

  it('vision rows carry zero links', () => {
    render(<StackDeckPage />);
    for (const key of ['cloud', 'transport']) {
      const row = screen.getByTestId(`matrix-row-${key}`);
      expect(within(row).queryAllByRole('link')).toHaveLength(0);
      expect(row.querySelectorAll('a')).toHaveLength(0);
    }
  });

  it('has the Export PDF button in the header', () => {
    render(<StackDeckPage />);
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
  });
});

describe('StackDeckPage — the Personas tab', () => {
  it('defaults to the concept; the tab swaps to nine persona cards and back', () => {
    render(<StackDeckPage />);
    expect(screen.getByTestId('deck-tab-concept')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('deck-tab-personas'));
    expect(screen.getByRole('heading', { name: /Nine roles/ })).toBeInTheDocument();
    const cards = screen.getAllByTestId(
      /^persona-(architect|planner|netops|cloudeng|platformeng|aianalyst|finops|seclead|sponsor)$/,
    );
    expect(cards).toHaveLength(9);
    for (const name of [
      'Network Architect', 'Network Planner', 'NetOps Engineer',
      'Cloud Network Engineer', 'Platform Engineer', 'AI Platform Analyst',
      'FinOps Analyst', 'Security & Compliance Lead', 'Executive Sponsor',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    // Every card carries its footprint on the deck's own table.
    expect(screen.getAllByTestId('persona-footprint')).toHaveLength(9);
    fireEvent.click(screen.getByTestId('deck-tab-concept'));
    expect(screen.getByRole('heading', { name: /A verb is not a destination/ })).toBeInTheDocument();
  });

  it('every persona cites its research source', () => {
    render(<StackDeckPage />);
    fireEvent.click(screen.getByTestId('deck-tab-personas'));
    for (const cite of [/TM Forum NaaS/, /GRC three-lines/, /2026 hiring research/, /NOC function research/]) {
      expect(screen.getByText(cite)).toBeInTheDocument();
    }
  });

  it('the coverage table tiles all nine shapes onto one table', () => {
    render(<StackDeckPage />);
    fireEvent.click(screen.getByTestId('deck-tab-personas'));
    const coverage = screen.getByTestId('persona-coverage');
    // Every persona's monogram appears somewhere on the tiled table.
    for (const mono of ['NA', 'NP', 'NO', 'CN', 'PE', 'AI', 'FO', 'SC', 'ES']) {
      expect(within(coverage).getAllByText(mono).length).toBeGreaterThan(0);
    }
  });

  it('every persona declares 1-3 intents, drawn only from the shipped six-entry catalog', () => {
    render(<StackDeckPage />);
    fireEvent.click(screen.getByTestId('deck-tab-personas'));
    const CATALOG_LABELS = [
      'Minimize latency',
      'Keep this flow diverse',
      'Route by cost',
      'Route by data sensitivity',
      'Keep AI inference off the public internet',
      'Cap token spend',
    ];
    const rows = screen.getAllByTestId('persona-intents');
    expect(rows).toHaveLength(9);
    for (const row of rows) {
      const labels = (row.textContent ?? '')
        .replace('Intents they declare', '')
        .split('·')
        .map(s => s.trim())
        .filter(Boolean);
      expect(labels.length).toBeGreaterThanOrEqual(1);
      expect(labels.length).toBeLessThanOrEqual(3);
      for (const label of labels) {
        expect(CATALOG_LABELS).toContain(label);
      }
    }
  });

  it('persona links stay inside the live app', () => {
    render(<StackDeckPage />);
    fireEvent.click(screen.getByTestId('deck-tab-personas'));
    const links = screen.getAllByRole('link').map(a => a.getAttribute('href'));
    for (const href of links) {
      expect(href).toBe('#/discover');
    }
  });
});
