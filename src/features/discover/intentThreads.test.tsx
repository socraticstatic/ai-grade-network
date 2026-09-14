import { useRef } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine';
import { IntentThreads, IntentThreadOverlay, THREADS } from './IntentThreads';

/* Navigation is asserted by destination, not by router internals. */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

(CC.agentList() as { id: string; enabled: boolean }[])
  .filter(a => a.enabled)
  .forEach(a => CC.toggleAgent(a.id));

afterEach(() => {
  CC.intentList().forEach(i => CC.removeIntent(i.id));
  mockNavigate.mockClear();
});

const at = () => render(<MemoryRouter><IntentThreads /></MemoryRouter>);

describe('IntentThreads', () => {
  it('the empty state invites the first declaration through Andi', () => {
    at();
    expect(screen.getByText(/Nothing declared yet/)).toBeInTheDocument();
    expect(screen.getByTestId('intent-empty-andi')).toBeInTheDocument();
  });

  it('a declared intent renders with its DERIVED badge and evidence', () => {
    const declared = CC.declareIntent(
      'private-inference',
      { kind: 'estate', id: 'ai', label: 'The token layer' },
      'watch',
    )!;
    at();
    const row = screen.getByTestId(`intent-row-${declared.id}`);
    const badge = within(row).getByTestId(`intent-badge-${declared.id}`);
    // The badge states what the engine derives right now - the seeded
    // estate routes identities publicly, so this is violated.
    expect(badge).toHaveAttribute('data-status', CC.intentList()[0].reading.status);
    expect(badge).toHaveAttribute('data-status', 'violated');
    expect(row).toHaveTextContent(CC.intentList()[0].reading.evidence);
  });

  it('Synchronize hands the repair to the twin via the draft param', () => {
    const declared = CC.declareIntent(
      'private-inference',
      { kind: 'estate', id: 'ai', label: 'The token layer' },
      'watch',
    )!;
    at();
    fireEvent.click(screen.getByTestId(`intent-sync-${declared.id}`));
    expect(mockNavigate).toHaveBeenCalledWith(`/discover?draft=intent-${declared.id}`);
  });

  it('the mode toggle flips the engine, remove removes, and both are undoable', () => {
    const meter = (CC.tokenMeterList() as { tag: string; pct: number }[]).find(m => m.pct < 80)!;
    const declared = CC.declareIntent(
      'cap-token-spend',
      { kind: 'identity', id: meter.tag, label: meter.tag },
      'watch',
    )!;
    at();
    fireEvent.click(screen.getByTestId(`intent-mode-${declared.id}`));
    expect(CC.intentList()[0].mode).toBe('enforce');

    fireEvent.click(screen.getByTestId(`intent-remove-${declared.id}`));
    expect(CC.intentList()).toHaveLength(0);
    CC.undo(); // the removal
    expect(CC.intentList()).toHaveLength(1);
    CC.undo(); // the mode change
    expect(CC.intentList()[0].mode).toBe('watch');
    CC.undo(); // the declaration
    expect(CC.intentList()).toHaveLength(0);
  });

  it('the overlay weaves one thread per intent-and-stratum pair, status carried', async () => {
    const declared = CC.declareIntent(
      'private-inference',
      { kind: 'estate', id: 'ai', label: 'The token layer' },
      'watch',
    )!;
    // A harness standing in for StackPanel: the rows, the band anchors the
    // overlay measures against, and the overlay itself under one container.
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <div ref={ref} style={{ position: 'relative' }}>
          <IntentThreads />
          <div data-testid="stack-band-ai" />
          <div data-testid="stack-band-naas" />
          <IntentThreadOverlay containerRef={ref} />
        </div>
      );
    }
    render(<MemoryRouter><Harness /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByTestId('intent-thread-overlay')).toBeInTheDocument();
    });
    for (const band of THREADS['private-inference']) {
      const path = screen.getByTestId(`thread-${declared.id}-${band}`);
      expect(path).toHaveAttribute('data-status', 'violated');
      // Violated threads pulse; the global reduced-motion rule suppresses it.
      expect(path.classList.contains('animate-pulse')).toBe(true);
    }
  });

  it('an aligned intent renders quiet - no pulse class on its dot', () => {
    const meter = (CC.tokenMeterList() as { tag: string; pct: number }[]).find(m => m.pct < 80)!;
    const declared = CC.declareIntent(
      'cap-token-spend',
      { kind: 'identity', id: meter.tag, label: meter.tag },
      'watch',
    )!;
    at();
    const badge = screen.getByTestId(`intent-badge-${declared.id}`);
    expect(badge).toHaveAttribute('data-status', 'aligned');
    expect(badge.querySelector('.animate-pulse')).toBeNull();
  });
});

describe('the declare-from-catalog picker', () => {
  it('lists all eighteen intents grouped by taxonomy', () => {
    at();
    fireEvent.click(screen.getByTestId('intent-declare-open'));
    const items = screen.getAllByTestId(/^declare-item-/);
    expect(items).toHaveLength(18);
    for (const taxonomy of ['Performance', 'Resiliency', 'Security and compliance', 'AI and workload', 'Operational and governance']) {
      expect(screen.getByText(taxonomy)).toBeInTheDocument();
    }
  });

  it('a single-scope entry declares in watch mode on click', () => {
    at();
    fireEvent.click(screen.getByTestId('intent-declare-open'));
    fireEvent.click(screen.getByTestId('declare-item-threat-aware-routing'));
    const declared = CC.intentList().find(i => i.key === 'threat-aware-routing');
    expect(declared).toBeTruthy();
    expect(declared!.mode).toBe('watch');
  });

  it('a multi-scope entry opens the scope step and declares the picked one', () => {
    at();
    fireEvent.click(screen.getByTestId('intent-declare-open'));
    fireEvent.click(screen.getByTestId('declare-item-optimize-jitter'));
    const scopes = screen.getAllByTestId(/^declare-scope-/);
    expect(scopes.length).toBeGreaterThan(1);
    fireEvent.click(scopes[0]);
    expect(CC.intentList().find(i => i.key === 'optimize-jitter')).toBeTruthy();
  });

  it('an already-declared entry reads declared and cannot double-declare', () => {
    CC.declareIntent('threat-aware-routing', { kind: 'estate', id: 'egress', label: 'Egress screening' }, 'watch');
    at();
    fireEvent.click(screen.getByTestId('intent-declare-open'));
    const item = screen.getByTestId('declare-item-threat-aware-routing');
    expect(item).toBeDisabled();
    expect(item).toHaveTextContent('declared');
  });
});
