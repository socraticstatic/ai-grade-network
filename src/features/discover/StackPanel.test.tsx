import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { StackPanel } from './StackPanel';
import { CC } from '../../engine';
import { naasStratum, attachOpportunities, moneyOnTheTable } from './stackFigures';

const renderPanel = () =>
  render(<MemoryRouter><StackPanel /></MemoryRouter>);

describe('StackPanel — the IA contracts hold', () => {
  test('draws the strata in elevation order', () => {
    renderPanel();
    const panel = screen.getByTestId('stack-panel');
    const order = Array.from(panel.querySelectorAll('[data-testid^="stack-band-"]'))
      .map(el => el.getAttribute('data-testid'));
    expect(order).toEqual([
      'stack-band-ai', 'stack-band-cloud', 'stack-band-naas', 'stack-band-transport',
    ]);
  });

  test('live layers open their four verbs', () => {
    renderPanel();
    for (const [key, prefix] of [['ai', '/ai/'], ['naas', '/naas/']] as const) {
      const band = screen.getByTestId(`stack-band-${key}`);
      const hrefs = within(band).getAllByRole('link').map(a => a.getAttribute('href'));
      expect(hrefs).toEqual([`${prefix}connect`, `${prefix}govern`, `${prefix}observe`, `${prefix}cost`]);
    }
  });

  test('Cloud deep-links only to where cloud attach lives today', () => {
    renderPanel();
    const band = screen.getByTestId('stack-band-cloud');
    const hrefs = within(band).getAllByRole('link').map(a => a.getAttribute('href'));
    expect(hrefs).toEqual(['/naas/connect']);
  });

  test('Transport & Access names its media and links nowhere', () => {
    renderPanel();
    const band = screen.getByTestId('stack-band-transport');
    expect(within(band).queryAllByRole('link')).toHaveLength(0);
    for (const m of ['Fiber', 'Dark fiber', 'Satellite']) {
      expect(within(band).getByText(m)).toBeInTheDocument();
    }
  });

  test('points at the concept deck', () => {
    renderPanel();
    expect(screen.getByRole('link', { name: /organized this way/i }))
      .toHaveAttribute('href', '/stack');
  });
});

describe('StackPanel — the cross-section states engine figures', () => {
  /* Row 27 of the phase-0 metric audit: the AI band's four figures
     (model endpoints ready, tokens today, public-internet exposure, spend
     + identities) demoted off this screen — the AI layer home's own
     Estate at a glance already states them, and four numbers stacked in a
     NaaS-shaped rail read as a broken panel. The band itself, its blurb
     and its four verb links stay. */
  test('the AI band keeps its verbs and drops its figures — and renders no empty figures slot at all', () => {
    renderPanel();
    // Fix-wave review finding 3: figures={null} used to still render the
    // bordered `stack-figures-ai` container (border-t + padding) with
    // nothing inside it. LiveBand now skips the slot entirely when figures
    // is null, so the testid should not exist at all.
    expect(screen.queryByTestId('stack-figures-ai')).not.toBeInTheDocument();
    const band = screen.getByTestId('stack-band-ai');
    expect(within(band).getByText(/AI/)).toBeInTheDocument();
  });

  test('the NaaS band states egress and the savings on the table, not the region/site counts', () => {
    renderPanel();
    const fig = naasStratum(CC);
    const strip = screen.getByTestId('stack-figures-naas');
    expect(within(strip).getByText(/egress on public transit/)).toBeInTheDocument();
    expect(within(strip).getByText(`$${Math.round(moneyOnTheTable(CC).savingsMo).toLocaleString()}/mo`)).toBeInTheDocument();
    // Row 29a: "regions on the fabric" and "sites" cut — both restate
    // figures shown better elsewhere on the same page (rows 20, 21/37).
    expect(within(strip).queryByText('regions on the fabric')).not.toBeInTheDocument();
    expect(within(strip).queryByText('sites')).not.toBeInTheDocument();
  });

  /* Row 28: the "N clouds · N regions · N VPCs" count cut — a third
     rendering of the summary band's own tiles on the same screen
     (Discover's rows 22, 24). The band's job, "its own layer, next",
     stays. */
  test('the Cloud band names its place in the stack and states no count', () => {
    renderPanel();
    const band = screen.getByTestId('stack-band-cloud');
    expect(within(band).getByText('its own layer, next')).toBeInTheDocument();
    expect(within(band).queryByText(/VPCs in the estate today/)).not.toBeInTheDocument();
  });
});

describe('StackPanel — design mode', () => {
  test('off by default: no move chips, no tray', () => {
    renderPanel();
    expect(screen.getByTestId('design-toggle')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('naas-moves')).toBeNull();
    expect(screen.queryByTestId('design-tray')).toBeNull();
  });

  test('toggling on reveals the engine\'s attach opportunities with the latency arrow', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('design-toggle'));
    const opps = attachOpportunities(CC);
    expect(opps.length).toBeGreaterThan(0);
    for (const opp of opps) {
      const chip = screen.getByTestId(`move-attach-${opp.regionId}`);
      expect(chip.textContent).toContain(`${opp.publicMs}→${opp.privateMs} ms`);
    }
  });

  test('staging fills the tray with stagedDeltas figures; discard clears without touching the engine', () => {
    renderPanel();
    const before = naasStratum(CC);
    fireEvent.click(screen.getByTestId('design-toggle'));
    const opp = attachOpportunities(CC)[0];
    fireEvent.click(screen.getByTestId(`move-attach-${opp.regionId}`));
    const tray = screen.getByTestId('design-tray');
    expect(tray.textContent).toContain('1 move staged');
    expect(tray.textContent).toContain(`${opp.publicMs}→${opp.privateMs} ms`);
    fireEvent.click(screen.getByTestId('design-discard'));
    expect(screen.queryByTestId('design-tray')).toBeNull();
    // Discard never mutated the estate.
    expect(naasStratum(CC)).toEqual(before);
  });

  test('commit applies through the engine and the band restates the live figure; undo restores', () => {
    renderPanel();
    const before = naasStratum(CC);
    fireEvent.click(screen.getByTestId('design-toggle'));
    const opp = attachOpportunities(CC)[0];
    fireEvent.click(screen.getByTestId(`move-attach-${opp.regionId}`));
    fireEvent.click(screen.getByTestId('design-commit'));
    const after = naasStratum(CC);
    // The engine mutated — any attach grows the attached-region count, even
    // when it does not move THIS band's remaining figures (egress/savings
    // move only for the specific on-ramp bucket the attach captures; see
    // stackFigures.test.ts's opportunity-pricing tests).
    expect(after.regionsAttached).toBeGreaterThan(before.regionsAttached);
    expect(screen.getByTestId('design-tray').textContent).toContain('committed to the estate');
    // The band re-renders off the post-commit engine state, not a stale value.
    expect(within(screen.getByTestId('stack-figures-naas'))
      .getByText(`$${Math.round(moneyOnTheTable(CC).savingsMo).toLocaleString()}/mo`)).toBeInTheDocument();
    // Restore the shared engine for the rest of the suite.
    expect(CC.undo()).toBeTruthy();
    expect(naasStratum(CC).regionsAttached).toBe(before.regionsAttached);
  });
});

describe('StackPanel — proposals and the advisor', () => {
  test('the advisor chip states the draft and Review stages it', async () => {
    const { advisorDraft } = await import('./stackFigures');
    renderPanel();
    const draft = advisorDraft(CC);
    expect(draft.moves.length).toBeGreaterThan(0);
    const chip = screen.getByTestId('advisor-chip');
    expect(chip.textContent).toContain(`Advisor: ${draft.moves.length} moves`);
    expect(chip.textContent).toContain(`$${Math.round(draft.deltas.egressSavingMo).toLocaleString()}/mo`);
    fireEvent.click(chip);
    expect(screen.getByTestId('design-tray').textContent)
      .toContain(`${draft.moves.length} moves staged`);
    // The chip yields while designing — one authority at a time.
    expect(screen.queryByTestId('advisor-chip')).toBeNull();
    fireEvent.click(screen.getByTestId('design-discard'));
  });

  test('Share proposal copies proposalUrl(staged) and flips to Copied', async () => {
    const writes: string[] = [];
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (t: string) => { writes.push(t); return Promise.resolve(); } },
    });
    try {
      renderPanel();
      fireEvent.click(screen.getByTestId('design-toggle'));
      const opp = attachOpportunities(CC)[0];
      fireEvent.click(screen.getByTestId(`move-attach-${opp.regionId}`));
      fireEvent.click(screen.getByTestId('share-proposal'));
      await screen.findByText('Copied');
      expect(writes).toHaveLength(1);
      expect(writes[0]).toBe(CC.proposalUrl([{ kind: 'attach', regionId: opp.regionId }]));
      fireEvent.click(screen.getByTestId('design-discard'));
    } finally {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: original });
    }
  });

  test('a pending proposal stages the tray on mount and counts stale moves', () => {
    const opp = attachOpportunities(CC)[0];
    const raw = new URL(CC.proposalUrl([
      { kind: 'attach', regionId: opp.regionId },
      { kind: 'attach', regionId: 'no-such-region' },
    ])).searchParams.get('s')!;
    CC.applyShareData(raw);
    renderPanel();
    const tray = screen.getByTestId('design-tray');
    expect(within(tray).getByTestId('proposal-note').textContent)
      .toBe('Opened from a proposal link · 1 move · 1 no longer applies');
    expect(tray.textContent).toContain(`${opp.publicMs}→${opp.privateMs} ms`);
    fireEvent.click(screen.getByTestId('design-discard'));
  });

  test('?draft=policy-<tag> stages an enforce patch for the layer-home dashboard\'s Enforce action', () => {
    const tag = CC.tokenPolicyList()[0].tag;
    render(
      <MemoryRouter initialEntries={[`/discover?draft=policy-${tag}`]}>
        <StackPanel />
      </MemoryRouter>,
    );
    const tray = screen.getByTestId('design-tray');
    expect(within(tray).getByTestId('proposal-note').textContent)
      .toBe(`Token policy · ${tag} · enforce`);
    expect(tray.textContent).toContain(`Token policy · ${tag}`);
    fireEvent.click(screen.getByTestId('design-discard'));
  });
});
