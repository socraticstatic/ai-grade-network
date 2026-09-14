import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeAll } from 'vitest';
import { CC } from '../../engine';
import { AiObservePage } from './AiObservePage';
import { AiProvidersPage, AiTeamsPage } from './GatewayGovernancePages';
import { SecurityTab } from './insights/SecurityTab';
import { aiSpendTotals, fmtTokens, routeLabel } from './aiSpend';
import { insightKpis, requestRows } from './insights/insightsFigures';
import { aiPublicFlowGbps, estateDomains } from '../discover/discoveryModel';

/**
 * Ungoverned tokens are a fact the engine records, not one a screen infers.
 *
 * Four surfaces make claims about AI token exposure — `/ai/observe`
 * (Insights: KPI strip and Security tab), `/ai/teams` (the budgets block),
 * `/ai/providers`, `/discover`. Before the engine carried a second bucket,
 * every one of them had to reconstruct "did this spend cross the public
 * internet?" from the identity's route RIGHT NOW, and that reconstruction is
 * wrong in the state the demo actually reaches:
 *
 *   cold start   → agents meter over the public internet
 *   Connect beat → `activateOnramp('nb2')` attaches every endpoint
 *   result       → the old Cost screen printed "none of that spend leaves
 *                  over the public internet" over a token total most of
 *                  which had already left over the public internet.
 *
 * Every assertion below is a `CC`/`aiSpendTotals` derivation. Nothing is a
 * pinned number, and nothing compares a screen only to the function that
 * screen calls: where two surfaces state one quantity, both are read and
 * compared to each other.
 *
 * The engine is a shared singleton and mutations persist within this file, so
 * the unattached describe runs FIRST.
 */

/* Determinism: `agentTick` meters, and the ticker used to fire on an ungated
   7s interval that no test could stop. It is now off by default under test
   (see engine/agentTicker.test.ts), so the estate rests here. */

const at = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

const kpi = (key: string) => insightKpis(CC).find(k => k.key === key)!;

describe('ungoverned tokens — cold start, nothing attached', () => {
  beforeAll(() => {
    // Exactly what a traced agent request does, over the path the engine
    // reports for this identity. No timer, no rng.
    CC.promptTrace('shared-services', 'gpt-class', 'autonomous task · read:telemetry');
    CC.promptTrace('rd-helion', 'helion-70b', 'autonomous task · invoke:helion-70b');
  });

  it('is the state the claim is about: metered, and every route public', () => {
    const t = aiSpendTotals(CC);
    expect(t.tokensToday).toBeGreaterThan(0);
    expect(t.publicPathCount).toBe(t.identityCount);
    expect(t.ungovernedTokensToday, 'all of it rode the internet').toBe(t.tokensToday);
    expect(t.governedTokensToday).toBe(0);
  });

  it('states the split on the Tokens KPI, not a number a reader must infer', () => {
    /* The old strip gave the bucket a tile of its own; the Figma strip has
       five cards, so the bucket rides the Tokens card's subline. Same fact,
       still stated, still the engine's meter-time bookkeeping. */
    const t = aiSpendTotals(CC);
    expect(kpi('tokens').value).toBe(fmtTokens(t.tokensToday));
    expect(kpi('tokens').sub).toContain(`${fmtTokens(t.ungovernedTokensToday)} public`);
  });

  it('states the same ungoverned figure on /ai/teams as on the KPI strip', () => {
    const t = aiSpendTotals(CC);
    at(<AiTeamsPage />);
    const shown = fmtTokens(t.ungovernedTokensToday);
    expect(shown, 'a 0-vs-0 agreement proves nothing').not.toBe('0');
    expect(screen.getByText(new RegExp(`${shown} of .* rode the public internet`))).toBeInTheDocument();
  });

  it('the Security tab states the bucket and never claims the layer is clean', () => {
    const t = aiSpendTotals(CC);
    at(<SecurityTab />);
    const guard = screen.getByText('Left unguarded').parentElement as HTMLElement;
    expect(within(guard).getByText(fmtTokens(t.ungovernedTokensToday))).toBeInTheDocument();
    expect(screen.queryByText(/Every token metered today rode a private or governed path/i)).toBeNull();
  });

  it('a request recorded on a public path says so in its own row', () => {
    const rows = requestRows(CC);
    const publicRows = rows.filter(r => r.route === routeLabel('public'));
    expect(publicRows.length, 'this state needs public request rows').toBeGreaterThan(0);
    for (const r of publicRows.slice(0, 3)) {
      expect(r.route).toMatch(/public/i);
    }
  });

  /* Declared last in this describe: it mutates the meters and the decision
     log under a mounted screen. */
  it('states one request count on /ai/observe, not one per panel', async () => {
    /* Row 80 of the phase-0 metric audit cut the standalone Requests KPI
       card — it restated `decisionLog().length`, which the deep dive's own
       verdict sentence and the request table below it both already state.
       Those two surfaces must still agree and both subscribe live: a tick
       has to land UNDER the mounted screen and move both. */
    const observe = at(<AiObservePage />);
    const verdict = () => within(observe.container).getByTestId('requests-verdict');

    const before = verdict().textContent ?? '';
    expect(before).toContain(`${requestRows(CC).length} requests today`);

    // Exactly what an agent tick does: trace a request, then emit `hits`.
    await act(async () => {
      CC.promptTrace('shared-services', 'gpt-class', 'autonomous task · read:telemetry');
      (CC._ as unknown as { emit(e: { type: string }): void }).emit({ type: 'hits' });
    });

    const after = verdict().textContent ?? '';
    expect(after, 'the verdict sentence froze at its mount instant').not.toBe(before);
    expect(after).toContain(`${requestRows(CC).length} requests today`);

    // And the table below it counts the same log.
    const header = within(observe.container).getByText(/^Requests \(\d+\)$/);
    expect(header.textContent).toBe(`Requests (${requestRows(CC).length})`);
  });
});

describe('ungoverned tokens — after the Connect beat, history does not launder', () => {
  let ungovernedAtAttach: number;

  beforeAll(() => {
    ungovernedAtAttach = aiSpendTotals(CC).ungovernedTokensToday;
    CC.activateOnramp('nb2');
    (CC._ as unknown as { tickTokens(rng: () => number): boolean }).tickTokens(() => 0.5);
  });

  it('is the state the old copy lied in: nothing public now, plenty public earlier', () => {
    const t = aiSpendTotals(CC);
    expect(t.publicPathCount, 'every route is governed now').toBe(0);
    expect(t.ungovernedTokensToday, 'and the ungoverned history survives').toBe(ungovernedAtAttach);
    expect(ungovernedAtAttach).toBeGreaterThan(0);
    expect(t.governedTokensToday, 'while governed spend has started').toBeGreaterThan(0);
  });

  it('does not let /ai/teams claim none of the spend left over the public internet', () => {
    at(<AiTeamsPage />);
    expect(screen.queryByText(/none of that spend leaves over the public internet/i)).toBeNull();
    const shown = fmtTokens(aiSpendTotals(CC).ungovernedTokensToday);
    expect(screen.getByText(new RegExp(`${shown} of .* rode the public internet`))).toBeInTheDocument();
  });

  it('carries the split down to each /ai/teams row, beside the path that denies it', () => {
    /* Every row's State cell now reads a governed route. Without the split on
       the row itself, a reader reconciling the summary's ungoverned figure
       against the table has no row to attribute it to. */
    const teams = at(<AiTeamsPage />);
    const spend = aiSpendTotals(CC);
    const withUngoverned = spend.rows.filter(r => r.ungovernedToday > 0);
    expect(withUngoverned.length, 'this state needs ungoverned rows').toBeGreaterThan(0);
    for (const r of withUngoverned) {
      const row = within(teams.container).getByRole('row', { name: new RegExp(r.tag) });
      expect(row, `${r.tag} row hides its ungoverned share`).toHaveTextContent(
        `${fmtTokens(r.ungovernedToday)} ungoverned today`,
      );
      expect(row, 'while its route reads governed, which is the trap').toHaveTextContent(
        routeLabel(r.routePath),
      );
      expect(r.onPublicPath).toBe(false);
    }
  });

  it('keeps the split on the Tokens KPI while every route reads governed', () => {
    const t = aiSpendTotals(CC);
    expect(t.ungovernedTokensToday).toBeGreaterThan(0);
    expect(kpi('tokens').sub, 'the KPI subline launders history').toContain(
      `${fmtTokens(t.ungovernedTokensToday)} public`,
    );
    expect(kpi('tokens').sub).not.toMatch(/all on governed paths/i);
  });

  it('the Security tab still states the bucket after the attach', () => {
    const t = aiSpendTotals(CC);
    at(<SecurityTab />);
    const guard = screen.getByText('Left unguarded').parentElement as HTMLElement;
    expect(within(guard).getByText(fmtTokens(t.ungovernedTokensToday))).toBeInTheDocument();
    expect(screen.queryByText(/Every token metered today rode a private or governed path/i)).toBeNull();
  });

  it('qualifies /ai/providers\' "governed & ready" badge while ungoverned spend stands', () => {
    const models = CC.modelCatalog() as { ready: boolean }[];
    const t = aiSpendTotals(CC);
    const providers = at(<AiProvidersPage />);
    expect(
      within(providers.container).getByText(
        `${models.filter(m => m.ready).length} / ${models.length} governed & ready`,
      ),
      'the fixture needs the badge at full marks',
    ).toBeInTheDocument();
    expect(models.every(m => m.ready)).toBe(true);
    expect(
      within(providers.container).getByText(
        new RegExp(`${fmtTokens(t.ungovernedTokensToday)} tokens .* public internet`),
      ),
    ).toBeInTheDocument();
  });

  it('still reconciles: the buckets sum to the total every screen states', () => {
    const t = aiSpendTotals(CC);
    expect(t.governedTokensToday + t.ungovernedTokensToday).toBe(t.tokensToday);
    for (const r of t.rows) expect(r.governedToday + r.ungovernedToday).toBe(r.tokensToday);
    expect(kpi('tokens').value).toBe(fmtTokens(t.tokensToday));
    expect(kpi('tokens').sub).toContain(fmtTokens(t.ungovernedTokensToday));
  });
});

/* Runs LAST: reaching Discover's "gap closed" branch means attaching every
   remaining on-ramp, which is irreversible for this file. */
describe('ungoverned tokens — Discover only closes the gap it measured', () => {
  beforeAll(() => {
    // The only thing that clears the public AI flows is putting every flow's
    // SOURCE region on the fabric.
    (CC.onramps as { id: string; active: boolean }[])
      .filter(o => !o.active)
      .forEach(o => CC.activateOnramp(o.id));
  });

  it('actually reaches the closed branch, or this proves nothing', () => {
    expect(aiPublicFlowGbps(CC as never), 'no public AI flow left').toBe(0);
    expect((CC as unknown as { aiExposed(): number }).aiExposed()).toBe(0);
    expect(estateDomains(CC as never)[2].blurb.toLowerCase()).toContain('closed');
  });

  it('is a state where the token layer is demonstrably NOT clean', () => {
    expect(aiSpendTotals(CC).ungovernedTokensToday).toBeGreaterThan(0);
  });

  it('names the layer it closed, instead of closing one it never measured', () => {
    /* Discover's AI blurb is a BYTES-layer claim — endpoints attached and Gbps
       of flow under control. In this exact estate /ai/teams states a non-zero
       ungoverned token figure, so an unqualified "the security gap in this
       domain closed" is denied one click away. */
    const blurb = estateDomains(CC as never)[2].blurb;
    expect(blurb.toLowerCase(), 'the thesis word must survive the qualification').toContain(
      'security',
    );
    expect(blurb, 'a bare "closed" covers a layer this sentence never measured').toMatch(
      /network-layer/i,
    );
    expect(blurb, 'and it points at the layer that is still open').toMatch(/token/i);
  });
});
