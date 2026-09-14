import { describe, it, expect, beforeAll } from 'vitest';
import { CC } from '../../engine';
import {
  EXTERNAL_MODEL_ID,
  aiSpendRows,
  aiSpendTotals,
  fmtTokens,
  fmtUsd,
  modelForTag,
  statesRealMoney,
  tagModelMap,
} from './aiSpend';

/**
 * `aiSpend` is the module every AI money figure on the product flows through:
 * the Cost screen's three tiles and its budget table, and the Observe screen's
 * Cost, Tokens and Savings KPIs. Until now it had no test of its own — only
 * assertions comparing a screen to the same function the screen calls, which
 * agree no matter what that function computes.
 *
 * These tests pin the module against its two engine sources instead:
 * `CC.tokenMeterList()` for volume, budget and endpoint readiness,
 * `CC.modelCatalog()` for the price, and `CC.agentList()` for which model an
 * identity actually invokes. Nothing here is compared against a literal figure
 * or against `aiSpend` itself.
 *
 * Two estates, in this order, because neither alone is sufficient:
 *
 * - **Resting** (nothing attached, tokens already metered). The only state in
 *   which "is it spending" and "is its endpoint attached" disagree, so it is
 *   the only state that can catch a module conflating them.
 * - **Lit** (everything attached and ticked). Spend maths needs it: on a
 *   seeded estate every price multiplies zero, and `x * 3` on zero is still
 *   zero — an assertion that cannot tell a correct sum from a tripled one is
 *   not a test.
 */

interface Meter {
  tag: string;
  ready: boolean;
  today: number;
  governed: number;
  ungoverned: number;
  budget: number;
  pct: number;
}
interface CatalogEntry {
  id: string;
  name: string;
  price: number;
  ready: boolean;
}
interface Agent {
  id: string;
  app: string;
  scopes: string[];
}
interface Route {
  tag: string;
  app: string;
  path: 'private' | 'governed egress' | 'public';
}

const meters = () => CC.tokenMeterList() as Meter[];
const catalog = () => CC.modelCatalog() as CatalogEntry[];
const routes = () => CC.modelRoutes() as Route[];
const agents = () => CC.agentList() as Agent[];
const entry = (id: string) => catalog().find(m => m.id === id)!;

/* ------------------------------------------------------------------ *
 * The resting state FIRST. The engine is a shared singleton and the
 * lighting below is irreversible within this file.
 * ------------------------------------------------------------------ */

describe('aiSpend — spend and endpoint attachment are two different facts', () => {
  /* This is the state a cold demo actually opens in, and the one that made
     /ai/cost contradict itself three ways. `CC.promptTrace` meters an
     identity's tokens whether or not its endpoint is attached — agents keep
     issuing requests, and unattached those requests simply leave over the
     public internet — while `tokenMeterList().ready` reports attachment. So
     the seeded estate rests at `today > 0, ready === false`.

     A test that only ever runs against a lit estate cannot see the
     difference: lit, every identity is both metering AND attached, and
     `metering: m.ready` passes. It has to be pinned here, unlit.

     Metering directly is exactly what promptTrace does; no timer, no rng. */
  let restingTag: string;

  beforeAll(() => {
    restingTag = meters().find(m => !m.ready)!.tag;
    CC.meterTokens(restingTag, 507);
  });

  it('reports spend for an identity whose endpoint is not attached', () => {
    const m = meters().find(x => x.tag === restingTag)!;
    expect(m.today, 'the engine meters an unready identity').toBeGreaterThan(0);
    expect(m.ready, 'and still reports it as unattached').toBe(false);

    const row = aiSpendRows(CC).find(r => r.tag === restingTag)!;
    expect(row.metering, 'metering must follow the tokens').toBe(true);
    expect(row.endpointReady, 'readiness must follow the engine meter').toBe(false);
    expect(row.spendToday).toBeGreaterThan(0);
  });

  it('counts spend and readiness separately, so a screen cannot conflate them', () => {
    const t = aiSpendTotals(CC);
    const ms = meters();
    expect(t.meteringCount).toBe(ms.filter(m => m.today > 0).length);
    expect(t.endpointReadyCount).toBe(ms.filter(m => m.ready).length);
    // The whole point: in this state they disagree.
    expect(t.meteringCount).toBeGreaterThan(t.endpointReadyCount);
  });

  it('states the path from modelRoutes(), matched on the tag rather than the index', () => {
    for (const r of aiSpendRows(CC)) {
      expect(r.routePath).toBe(routes().find(x => x.tag === r.tag)!.path);
    }
    expect(aiSpendTotals(CC).publicPathCount).toBe(routes().filter(r => r.path === 'public').length);
  });

  /* The bucket, pinned to the engine rather than to this module. In this state
     every route is public, so every token metered here is ungoverned — and
     that is a fact the engine recorded at meter time, not one aiSpend derives
     from the route it can see now. */
  it('carries the governed / ungoverned split the engine booked, untouched', () => {
    const rows = aiSpendRows(CC);
    for (const m of meters()) {
      const row = rows.find(r => r.tag === m.tag)!;
      expect(row.governedToday).toBe(m.governed);
      expect(row.ungovernedToday).toBe(m.ungoverned);
      expect(row.governedToday + row.ungovernedToday).toBe(row.tokensToday);
    }
    const t = aiSpendTotals(CC);
    expect(t.ungovernedTokensToday).toBe(meters().reduce((s, m) => s + m.ungoverned, 0));
    expect(t.governedTokensToday).toBe(meters().reduce((s, m) => s + m.governed, 0));
    expect(t.ungovernedCount).toBe(rows.filter(r => r.ungovernedToday > 0).length);
    expect(t.ungovernedTokensToday, 'nothing is attached, so it all rode public').toBe(
      t.tokensToday,
    );
    expect(t.governedTokensToday).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * The tour's own two beats, in the tour's own order, and the ONE state
 * in which readiness and path disagree.
 *
 * `activateOnramp('nb2')` attaches CoreWeave and Nebius; `pol-insp`
 * applies `fixes.fwInspection`. `fixes.segmentHelion` is deliberately NOT
 * applied — that is `rd-helion`'s remaining readiness prerequisite, so it
 * rests at `ready === false` with its endpoint attached and its route
 * private. This is the state in which /ai/cost read "1 of 3 … leave over
 * the public internet" while /ai/connect read "3 / 3 governed & ready".
 * ------------------------------------------------------------------ */
describe('aiSpend — after the Connect and Govern beats, path is not readiness', () => {
  beforeAll(() => {
    CC.activateOnramp('nb2');
    (CC as unknown as { enforceAny(id: string): boolean }).enforceAny('pol-insp');
  });

  it('reaches a state where an identity is not meter-ready but is not public either', () => {
    const split = aiSpendRows(CC).find(r => !r.endpointReady && !r.onPublicPath);
    expect(
      split,
      'the fixture no longer produces the readiness/path split this file exists to pin',
    ).toBeTruthy();
    expect(
      (CC as unknown as { fixes: Record<string, boolean> }).fixes.segmentHelion,
      'and it is unready for the reason we think it is',
    ).toBe(false);
  });

  it('agrees with /ai/connect: an identity is public exactly when its model is not ready', () => {
    // `modelCatalog().ready` is the predicate behind Connect's "n / m governed
    // & ready" badge and every row's "Governed · ready" state. If Cost's path
    // claim and Connect's readiness badge ever key off different engine facts
    // again, this fails.
    for (const row of aiSpendRows(CC)) {
      expect(row.onPublicPath, `${row.tag} vs the model catalog`).toBe(!entry(row.modelId).ready);
    }
    const t = aiSpendTotals(CC);
    expect(t.identityCount - t.publicPathCount).toBe(
      catalog().filter(m => m.ready && aiSpendRows(CC).some(r => r.modelId === m.id)).length,
    );
  });

  it('does not let readiness stand in for the path count', () => {
    const t = aiSpendTotals(CC);
    expect(t.publicPathCount, 'nothing is routed public once every endpoint is attached').toBe(0);
    expect(
      t.endpointReadyCount,
      'while readiness still lags, which is exactly why the two must not be swapped',
    ).toBeLessThan(t.identityCount);
  });
});

describe('aiSpend — pinned to the engine, not to itself', () => {
  beforeAll(() => {
    // nb2 attaches CoreWeave/cwe and Nebius/nbe; the two fixes complete the
    // remaining prerequisites, so all three identities meter and every catalog
    // price is exercised. Deterministic: a constant rng, never Math.random.
    CC.activateOnramp('nb2');
    CC.applyFix('segmentHelion');
    CC.applyFix('fwInspection');
    (CC._ as unknown as { tickTokens: (rng: () => number) => boolean }).tickTokens(() => 0.5);
  });

  it('meters a real estate, so nothing below is a comparison of zeros', () => {
    const totals = aiSpendTotals(CC);
    expect(totals.identityCount).toBeGreaterThan(1);
    expect(totals.tokensToday).toBeGreaterThan(0);
    expect(totals.spendToday).toBeGreaterThan(0);
    // More than one distinct price in play, or a mis-mapped model would be
    // invisible in the total.
    expect(new Set(totals.rows.map(r => r.price)).size).toBeGreaterThan(1);
  });

  it('carries one row per engine meter, in the engine order', () => {
    expect(aiSpendRows(CC).map(r => r.tag)).toEqual(meters().map(m => m.tag));
  });

  it('takes volume, budget, percent and path state from tokenMeterList(), untouched', () => {
    const rows = aiSpendRows(CC);
    for (const m of meters()) {
      const row = rows.find(r => r.tag === m.tag)!;
      expect(row.tokensToday).toBe(m.today);
      expect(row.budgetTokens).toBe(m.budget);
      expect(row.pct).toBe(m.pct);
      // Three distinct engine facts, and none is another: `ready` is the
      // engine's meter gate, `today > 0` is accrued spend, and the path comes
      // from modelRoutes().
      expect(row.endpointReady).toBe(m.ready);
      expect(row.metering).toBe(m.today > 0);
    }
    for (const row of aiSpendRows(CC)) {
      const route = routes().find(r => r.tag === row.tag)!;
      expect(row.routePath).toBe(route.path);
      expect(row.onPublicPath).toBe(route.path === 'public');
    }
  });

  /* Attaching governs what comes next. It does not reach back and re-book the
     tokens that already left — which is exactly the inference /ai/cost and the
     Observe briefing used to make from `publicPathCount`, and exactly the state
     this describe is in: nothing routes public, and the ungoverned bucket from
     the resting describe above is still standing. */
  it('keeps the ungoverned history after every route has been governed', () => {
    const t = aiSpendTotals(CC);
    expect(t.publicPathCount, 'nothing routes public here').toBe(0);
    expect(t.ungovernedTokensToday, 'and the earlier public spend survives').toBeGreaterThan(0);
    expect(t.governedTokensToday, 'alongside real governed spend').toBeGreaterThan(0);
    expect(t.governedTokensToday + t.ungovernedTokensToday).toBe(t.tokensToday);
  });

  it('prices each identity with the catalog price of the model its agent invokes', () => {
    const rows = aiSpendRows(CC);
    for (const row of rows) {
      // Derived from the engine's own authority model: the agent whose `app`
      // is this identity, and the model named in its `invoke:` scope.
      const agent = agents().find(a => a.app === row.tag)!;
      const invoked = agent.scopes
        .find(s => s.startsWith('invoke:'))!
        .slice('invoke:'.length);

      expect(row.modelId).toBe(invoked);
      expect(row.modelName).toBe(entry(invoked).name);
      expect(row.price).toBe(entry(invoked).price);
      expect(row.price).toBeGreaterThan(0);
    }
  });

  it('computes row spend as volume x catalog price, to the cent and beyond', () => {
    for (const row of aiSpendRows(CC)) {
      const m = meters().find(x => x.tag === row.tag)!;
      const price = entry(row.modelId).price;
      expect(row.spendToday).toBeCloseTo((m.today / 1_000_000) * price, 10);
      expect(row.spendIfExternal).toBeCloseTo(
        (m.today / 1_000_000) * entry(EXTERNAL_MODEL_ID).price,
        10,
      );
    }
  });

  it('totals nothing the rows do not contain', () => {
    const t = aiSpendTotals(CC);
    const sum = (f: (r: (typeof t.rows)[number]) => number) => t.rows.reduce((s, r) => s + f(r), 0);

    expect(t.tokensToday).toBe(sum(r => r.tokensToday));
    expect(t.budgetTokens).toBe(sum(r => r.budgetTokens));
    expect(t.spendToday).toBeCloseTo(sum(r => r.spendToday), 10);
    expect(t.spendIfExternal).toBeCloseTo(sum(r => r.spendIfExternal), 10);
    expect(t.identityCount).toBe(t.rows.length);
    expect(t.meteringCount).toBe(t.rows.filter(r => r.metering).length);
    expect(t.endpointReadyCount).toBe(t.rows.filter(r => r.endpointReady).length);
    expect(t.publicPathCount).toBe(t.rows.filter(r => r.onPublicPath).length);
  });

  it('states the totals the engine implies, summed independently here', () => {
    const t = aiSpendTotals(CC);
    const ms = meters();
    const tagModel = tagModelMap(CC);

    expect(t.tokensToday).toBe(ms.reduce((s, m) => s + m.today, 0));
    expect(t.budgetTokens).toBe(ms.reduce((s, m) => s + m.budget, 0));
    expect(t.spendToday).toBeCloseTo(
      ms.reduce((s, m) => s + (m.today / 1_000_000) * entry(tagModel[m.tag]).price, 0),
      10,
    );
    expect(t.endpointReadyCount).toBe(ms.filter(m => m.ready).length);
  });

  it('never states a negative saving, and states the external comparison rate', () => {
    const t = aiSpendTotals(CC);
    const external = entry(EXTERNAL_MODEL_ID).price;
    expect(t.spendIfExternal).toBeCloseTo((t.tokensToday / 1_000_000) * external, 10);
    expect(t.savings).toBeCloseTo(Math.max(0, t.spendIfExternal - t.spendToday), 10);
    expect(t.savings).toBeGreaterThanOrEqual(0);
  });

  it('accounts for every token policy Govern lists', () => {
    const t = aiSpendTotals(CC);
    const policies = CC.tokenPolicyList() as { tag: string }[];
    expect(t.identityCount + t.unmeteredPolicyTags.length).toBe(policies.length);
    for (const tag of t.unmeteredPolicyTags) {
      expect(meters().some(m => m.tag === tag)).toBe(false);
    }
  });
});

describe('modelForTag — derived from the engine, and loud on a miss', () => {
  it('reads the model out of the agent scope rather than a map kept in parallel', () => {
    for (const a of agents()) {
      const invoked = a.scopes.find(s => s.startsWith('invoke:'));
      if (!invoked) continue;
      expect(modelForTag(CC, a.app)).toBe(invoked.slice('invoke:'.length));
    }
  });

  it('covers every metered identity', () => {
    const map = tagModelMap(CC);
    for (const m of meters()) {
      expect(map[m.tag], `no model derived for ${m.tag}`).toBeTruthy();
      expect(catalog().some(c => c.id === map[m.tag])).toBe(true);
    }
  });

  /* A miss used to be silent: an unknown tag produced modelId '', price 0 and
     therefore spendToday 0 — a blank model cell and a confident $0.00. The
     screen would have shown a wrong number calmly. It now throws. */
  it('throws rather than pricing an identity no agent invokes a model for', () => {
    expect(() => modelForTag(CC, 'no-such-identity')).toThrow(/diverged/i);
  });
});

describe('formatting and the money guard', () => {
  it('formats tokens and dollars at the thresholds the screens hit', () => {
    expect(fmtTokens(334)).toBe('334');
    // One decimal in the k band: `Math.round(n/1000)` made a Records column of
    // three ~1.2k rows read `1k / 1k / 1k` under a `4k` tile.
    expect(fmtTokens(1_500)).toBe('1.5k');
    expect(fmtTokens(1_183)).toBe('1.2k');
    expect(fmtTokens(4_900_000)).toBe('4.90M');
    expect(fmtUsd(0)).toBe('$0.00');
    expect(fmtUsd(1.618)).toBe('$1.62');
    expect(fmtUsd(2_500)).toBe('$2.5k');
    // A metered but sub-cent spend must not print as $0.00 beside a row the
    // same screen calls metering.
    expect(fmtUsd(0.0009)).toBe('<$0.01');
  });

  /* The guard that stops "holds $0.00 of that spend back" from ever
     rendering: a raw `savings > 0` test passes at $0.0015. */
  it('refuses a figure that rounds away, however positive the float', () => {
    expect(0.0015 > 0).toBe(true);
    expect(fmtUsd(0.0015)).not.toMatch(/^\$0\.0[1-9]/);
    expect(statesRealMoney(0.0015)).toBe(false);
    expect(statesRealMoney(0)).toBe(false);
    expect(statesRealMoney(0.005)).toBe(true);
  });
});
