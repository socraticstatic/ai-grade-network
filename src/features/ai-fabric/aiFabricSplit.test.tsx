import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll } from 'vitest';
import { CC } from '../../engine';
import { AiGovernPage } from './AiGovernPage';
import { AiObservePage } from './AiObservePage';
import { AiProvidersPage, AiTeamsPage } from './GatewayGovernancePages';
import { SecurityTab } from './insights/SecurityTab';
import { insightKpis } from './insights/insightsFigures';
import { aiSpendTotals, fmtTokens, fmtUsd, routeLabel, statesRealMoney } from './aiSpend';

/**
 * The AI Fabric used to be one tabbed page, then four verb screens. Phase 3
 * folded them into the gateway surfaces: the model catalog lives on
 * Providers, the token budgets on Teams & limits, and Observe is the
 * Insights screen. These tests pin WHICH block landed on WHICH screen — a
 * block that silently moves, or a screen that renders empty, fails here —
 * and assert every figure against the engine rather than against a literal.
 *
 * The engine is a shared singleton and mutations persist within a file, so
 * nothing here clicks a mutating control until the ordered describes below.
 */

/* ------------------------------------------------------------------ *
 * Determinism: the agents cannot meter under us.
 *
 * `agentTick`'s promptTrace -> meterTokens path meters whether or not an
 * endpoint is attached, so the unlit assertions below once held only because
 * vitest usually finished the file inside the ticker's seven seconds — on a
 * slow machine, or under `--repeat-each`, the first tick landed mid-file and
 * the estate was no longer unlit. That was a test passing on a race.
 *
 * The ticker is now a managed handle that does not start under test
 * (see engine/agentTicker.test.ts), so the estate rests until something here
 * moves it.
 * ------------------------------------------------------------------ */

/* Module loading is async under vite-node, so on a loaded runner the engine's
   3s tick can fire BETWEEN the engine import and this file's module scope -
   metering tokens before the freeze above lands. Drain anything that slipped
   in, so "nothing metered yet" states the frozen estate, not the runner's
   scheduling. */
{
  const meters = (CC._ as unknown as { tokenMeters: Record<string, { governed: number; ungoverned: number }> }).tokenMeters;
  for (const key of Object.keys(meters)) {
    meters[key].governed = 0;
    meters[key].ungoverned = 0;
  }
}

const tickMeters = () =>
  (CC._ as unknown as { tickTokens: (rng: () => number) => boolean }).tickTokens(() => 0.5);
const emitHits = () => (CC._ as unknown as { emit: (e: { type: string }) => void }).emit({ type: 'hits' });

const at = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

/** The summary StatTile carrying `label`. Scoped to the totals band, because
 *  the budgets table below it uses the same column names. */
const tile = (label: string) =>
  within(screen.getByTestId('ai-cost-totals')).getByText(label).parentElement as HTMLElement;

describe('AI Fabric · Providers (Connect folded in)', () => {
  it('carries the model catalog, counting governed endpoints as the engine does', () => {
    at(<AiProvidersPage />);

    const models = CC.modelCatalog() as { ready: boolean }[];
    const ready = models.filter(m => m.ready).length;

    expect(screen.getByText('Model catalog')).toBeInTheDocument();
    expect(
      screen.getByText(`${ready} / ${models.length} governed & ready`),
    ).toBeInTheDocument();
    // One row per catalogued model, plus the header row.
    expect(screen.getAllByRole('row')).toHaveLength(models.length + 1);
  });

  it('is the Providers screen, not the Policies one — no token-policy table here', () => {
    at(<AiProvidersPage />);
    expect(screen.queryByText('Token policies')).toBeNull();
  });
});

describe('AI Fabric · Govern', () => {
  it('carries the token policies and the agents they bind', () => {
    at(<AiGovernPage />);

    const policies = CC.tokenPolicyList() as { enforced: boolean }[];
    const agents = CC.agentList() as { enabled: boolean }[];

    expect(screen.getByText('Token policies')).toBeInTheDocument();
    expect(
      screen.getByText(
        `${policies.filter(p => p.enforced).length} / ${policies.length} enforced`,
      ),
    ).toBeInTheDocument();

    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(
      screen.getByText(`${agents.filter(a => a.enabled).length} / ${agents.length} enabled`),
    ).toBeInTheDocument();
  });

  it('keeps the tour anchor the retired /ai-fabric path used to land on', () => {
    const { container } = at(<AiGovernPage />);
    expect(container.querySelector('[data-tour="aifabric-policies"]')).toBeTruthy();
  });
});

describe('AI Fabric · Observe (Insights)', () => {
  it('carries the KPI strip, the sankey and the request log', () => {
    at(<AiObservePage />);

    // Derived, not pinned: one card per insightKpis entry.
    for (const k of insightKpis(CC)) {
      expect(screen.getByTestId(`kpi-${k.key}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('sankey')).toBeInTheDocument();
    expect(screen.getByTestId('requests-table')).toBeInTheDocument();
  });

  it('renders the trace above the decision log, which tells the reader to look up', () => {
    // The two blocks live on the Security tab now; the order survived the move.
    const { container } = at(<SecurityTab />);
    const trace = screen.getByText('Prompt trace');
    const decisions = screen.getByText('Governance decisions');
    // Node.DOCUMENT_POSITION_FOLLOWING === 4: `decisions` comes after `trace`.
    expect(trace.compareDocumentPosition(decisions) & 4).toBeTruthy();
    expect(container).toBeTruthy();
  });
});

describe('AI Fabric · Teams & limits — nothing metered yet (Cost folded in)', () => {
  /* The seeded estate has budgets and no spend: no AI endpoint's path is
     attached and (with the agents frozen above) nothing has been metered. That
     is a real state and it must not render as a blank screen, nor as a screen
     claiming a saving it cannot have. This describe runs FIRST, before the
     ones below mutate the engine. */
  it('renders the ceilings and says why nothing has metered', () => {
    at(<AiTeamsPage />);

    const totals = aiSpendTotals(CC);
    expect(totals.tokensToday, 'the agents are frozen, so this is exact').toBe(0);
    expect(totals.meteringCount).toBe(0);

    expect(screen.getByText(/No identity has metered a token yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/holds \$/i)).toBeNull();

    // Not blank: every ceiling is on screen even with nothing spent.
    for (const r of totals.rows) {
      const row = screen.getByRole('row', { name: new RegExp(r.tag) });
      expect(row).toHaveTextContent(r.budgetTokens.toLocaleString());
      expect(row).toHaveTextContent('No spend yet');
      // The path line states the ROUTE, in the same words /ai/observe uses.
      expect(row).toHaveTextContent(routeLabel(r.routePath));
    }
  });
});

describe('AI Fabric · Teams & limits — metered, but nothing attached', () => {
  /* THE state a cold demo opens in, and the one the screen used to contradict
     itself in three ways at once. The engine meters an identity's tokens from
     promptTrace whether or not its endpoint is attached, so tokens appear with
     `ready` still false. Metering directly is exactly what promptTrace does —
     no timer, no rng.

     Every count that says "how many are metering" must agree with every other
     one, and with the token column beside them. */
  beforeAll(() => {
    const unattached = (CC.tokenMeterList() as { tag: string; ready: boolean }[]).find(m => !m.ready)!;
    CC.meterTokens(unattached.tag, 507);
  });

  it('states one metering count, not three, and never one that denies the tokens', () => {
    at(<AiTeamsPage />);

    const totals = aiSpendTotals(CC);
    expect(totals.tokensToday, 'tokens are metered').toBeGreaterThan(0);
    expect(totals.publicPathCount, 'and every route is public').toBe(totals.identityCount);
    expect(totals.meteringCount).toBeGreaterThan(0);

    // The summary sentence, the table header and the row chips are the same
    // derivation. The screen used to state 1, 0 and 0 simultaneously.
    expect(
      screen.getByText(
        new RegExp(`${totals.meteringCount} of ${totals.identityCount} identit`),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${totals.meteringCount} / ${totals.identityCount} metering`),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Metering')).toHaveLength(totals.meteringCount);

    // The old copy claimed nothing was metering while the tokens column
    // showed hundreds. It must not come back.
    expect(screen.queryByText(/No identity has metered a token yet/i)).toBeNull();
  });

  it('never states a saving that rounds to $0.00', () => {
    at(<AiTeamsPage />);
    const totals = aiSpendTotals(CC);

    // Raw guard passes here; the formatted one is what the screen must use.
    expect(totals.savings).toBeGreaterThan(0);
    expect(statesRealMoney(totals.savings), 'sub-cent — not worth a sentence').toBe(false);
    expect(screen.queryByText(/holds \$0\.00/)).toBeNull();
    expect(screen.queryByText(/holds/)).toBeNull();
  });

  it('says the spend is leaving over the public internet, and where to fix it', () => {
    at(<AiTeamsPage />);
    const totals = aiSpendTotals(CC);

    expect(totals.publicPathCount, 'the claim needs something to claim').toBeGreaterThan(0);
    expect(
      screen.getByText(
        new RegExp(`${totals.publicPathCount} of ${totals.identityCount} route to a model endpoint`),
      ),
    ).toBeInTheDocument();
  });
});

describe('AI Fabric · Teams & limits — metering (the Connect beat)', () => {
  /* `activateOnramp('nb2')` is the tour's Connect beat: every AI endpoint
     attaches, the series meter starts, and the counts below go plural. */
  beforeAll(() => {
    CC.activateOnramp('nb2');
    tickMeters();
  });

  it('states the metering count the engine reports, not a claim of its own', () => {
    at(<AiTeamsPage />);
    const totals = aiSpendTotals(CC);
    expect(totals.meteringCount, 'the tick metered everyone').toBeGreaterThan(1);
    expect(
      screen.getByText(
        new RegExp(`${totals.meteringCount} of ${totals.identityCount} identities are metering`),
      ),
    ).toBeInTheDocument();
  });

  /* Govern lists EVERY token policy; only metered app tags carry a meter, so
     the budgets screen's identity count is legitimately smaller than Govern's
     policy count. Left unsaid, that reads as one of the two screens being
     wrong. The screen must account for the difference, and account for it from
     the engine — not from a sentence someone remembered to write. */
  it('accounts for every token policy Govern lists, metered or not', () => {
    at(<AiTeamsPage />);

    const totals = aiSpendTotals(CC);
    const policies = CC.tokenPolicyList() as { tag: string }[];

    expect(totals.identityCount + totals.unmeteredPolicyTags.length).toBe(policies.length);

    if (totals.unmeteredPolicyTags.length > 0) {
      const note = screen.getByText(/scopes? a group rather than a metered identity/i);
      expect(note).toHaveTextContent(String(totals.unmeteredPolicyTags.length));
      for (const tag of totals.unmeteredPolicyTags) {
        expect(note).toHaveTextContent(tag);
      }
    }
  });

  /* Cost is stated on two screens. They must be the same figure — not
     "close", the same string — or one of them is lying. Asserted against a
     non-zero spend, so a screen that re-derived the number wrongly cannot
     slip through on both sides reading $0.00. */
  it('states the same spend the Insights KPI states', () => {
    const totals = aiSpendTotals(CC);
    expect(totals.spendToday, 'a $0.00 agreement proves nothing').toBeGreaterThan(0);

    const kpis = insightKpis(CC);
    const costKpi = kpis.find(k => k.key === 'cost')!.value;

    expect(costKpi).toBe(fmtUsd(totals.spendToday));
    expect(costKpi).not.toBe('$0.00');
    expect(kpis.find(k => k.key === 'tokens')!.value).toBe(fmtTokens(totals.tokensToday));

    at(<AiTeamsPage />);
    expect(within(tile('Spend today')).getByText(costKpi)).toBeInTheDocument();
  });

  /* Agreeing on the same DERIVATION is not the same as agreeing on the same
     INSTANT. The meters tick every 3s; `useCloudControl` drops the `hits`
     event that carries them, so both money screens used to freeze at their own
     mount time and a viewer crossing between them saw two figures for one
     estate. Insights subscribes live. This test moves the meters under a
     MOUNTED Insights screen: if it re-renders, it cannot have frozen. */
  it('tracks the meters while mounted, so the two money screens cannot freeze apart', async () => {
    const observe = at(<AiObservePage />);
    const costCard = () => within(observe.container).getByTestId('kpi-cost');

    const before = costCard().textContent ?? '';
    expect(before).toContain(fmtUsd(aiSpendTotals(CC).spendToday));

    // Exactly what a tick does: mutate the meters, then emit `hits`.
    const attached = (CC.tokenMeterList() as { tag: string; ready: boolean }[]).find(m => m.ready)!;
    await act(async () => {
      CC.meterTokens(attached.tag, 200_000_000);
      emitHits();
    });

    const after = costCard().textContent ?? '';
    expect(after, 'the mounted Insights screen froze at its mount instant').not.toBe(before);
    expect(after).toContain(fmtUsd(aiSpendTotals(CC).spendToday));

    // And the budgets screen, mounted after that tick, states the same figure.
    const teams = at(<AiTeamsPage />);
    const spendTile = within(within(teams.container).getByTestId('ai-cost-totals'))
      .getByText('Spend today').parentElement as HTMLElement;
    expect(spendTile).toHaveTextContent(fmtUsd(aiSpendTotals(CC).spendToday));
  });
});
