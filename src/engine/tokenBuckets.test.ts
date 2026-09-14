import { describe, it, expect, beforeAll } from 'vitest';
import { CC } from './index';

/**
 * Governed and ungoverned tokens are two buckets, not one number with a
 * caveat.
 *
 * `promptTrace()` meters an identity's tokens whether or not its model
 * endpoint is attached — agents genuinely issue traced requests before the
 * substrate exists, and that is the cold-start beat the product tells. Those
 * tokens are real, and they rode the public internet. Tokens metered once the
 * endpoint is attached rode an AT&T path.
 *
 * Before this split the engine carried only `today`, so every surface that
 * wanted to say anything about exposure had to INFER it from a second, later
 * fact — the identity's route RIGHT NOW. That inference is wrong in both
 * directions and the product shipped both errors: `/ai/cost` printed "All 3
 * route to a model endpoint attached to the fabric, so none of that spend
 * leaves over the public internet" over a token total that was accrued public,
 * and `/ai/observe`'s briefing printed "No AI Fabric traffic currently crosses
 * the public internet" beside the same figure.
 *
 * The engine now carries both buckets, so no surface has to infer either.
 *
 * The engine is a shared singleton and mutations persist within this file, so
 * the unattached assertions come FIRST and the attaching describe runs last.
 */

/* Determinism: `agentTick` meters, so a tick landing mid-file would move these
   figures. The ticker is now a managed handle that does not start under test
   (see agentTicker.test.ts), so nothing here has to suspend the agents to
   freeze the estate. */

interface Meter {
  tag: string;
  ready: boolean;
  today: number;
  governed: number;
  ungoverned: number;
  budget: number;
  pct: number;
}
interface Route {
  tag: string;
  app: string;
  path: 'private' | 'governed egress' | 'public';
}
interface TraceStep {
  hop: string;
  detail: string;
  ok: boolean;
}

const meters = () => CC.tokenMeterList() as Meter[];
const meter = (tag: string) => meters().find(m => m.tag === tag)!;
const routes = () => CC.modelRoutes() as Route[];
const tickTokens = (CC._ as unknown as { tickTokens(rng: () => number): boolean }).tickTokens;

describe('token meters — the buckets exist and always reconcile', () => {
  it('reports a governed and an ungoverned bucket for every metered identity', () => {
    for (const m of meters()) {
      expect(typeof m.governed, `${m.tag}.governed`).toBe('number');
      expect(typeof m.ungoverned, `${m.tag}.ungoverned`).toBe('number');
    }
  });

  it('carries `today` as the sum of the two, so no surface can double-count', () => {
    for (const m of meters()) expect(m.today).toBe(m.governed + m.ungoverned);
  });

  it('names the tag on every route, so path is looked up and never index-guessed', () => {
    expect(routes().map(r => r.tag)).toEqual(meters().map(m => m.tag));
  });
});

describe('token meters — an unattached endpoint meters UNGOVERNED tokens', () => {
  /* The seeded resting state: nothing attached, so every route is public. */
  let tag: string;

  beforeAll(() => {
    tag = routes().find(r => r.path === 'public')!.tag;
    CC.meterTokens(tag, 507);
  });

  it('starts from an estate where the route really is public', () => {
    expect(routes().find(r => r.tag === tag)!.path).toBe('public');
    expect(meter(tag).ready, 'and the engine does not consider it meter-ready').toBe(false);
  });

  it('counts the spend, rather than discarding it', () => {
    expect(meter(tag).today).toBeGreaterThan(0);
  });

  it('books it as ungoverned, and books nothing to governed', () => {
    const m = meter(tag);
    expect(m.ungoverned, 'metered over the public internet').toBe(m.today);
    expect(m.governed, 'nothing rode an AT&T path').toBe(0);
  });

  it('lets promptTrace and the meter tell one story about the same request', () => {
    const before = meter('shared-services');
    const res = CC.promptTrace('shared-services', 'gpt-class', 'x') as {
      blocked: boolean;
      tokens: number;
      steps: TraceStep[];
    };
    expect(res.blocked, 'this fixture needs an allowed request').toBe(false);
    expect(res.tokens).toBeGreaterThan(0);

    const hop = res.steps.find(s => s.hop === 'Network path')!;
    const after = meter('shared-services');
    // The trace stamps the path on the hop; the meter must book the SAME
    // request into the bucket that hop names. A trace reading "public internet
    // · no SLA" over a token booked as governed is the defect, restated.
    if (hop.ok) {
      expect(after.governed - before.governed).toBe(res.tokens);
      expect(after.ungoverned).toBe(before.ungoverned);
    } else {
      expect(after.ungoverned - before.ungoverned).toBe(res.tokens);
      expect(after.governed).toBe(before.governed);
    }
    expect(hop.ok, 'nothing is attached in this describe, so the hop is public').toBe(false);
  });

  it('charts the meter even while the engine has no series history for it', () => {
    /* The live symptom: `tokenSeries()` returned all zeros for any identity the
       engine did not consider meter-ready, so `/ai/observe` rendered its
       "No token flow yet" empty state directly under a non-zero TOKENS tile.
       There is no charted history for a cold-start identity — it started
       today — but the tail is today's meter, and today's meter is not zero. */
    const series = CC.tokenSeries(tag, 24) as number[];
    expect(meter(tag).ready, 'the identity the engine will not chart').toBe(false);
    expect(series[series.length - 1], 'the tail is the live meter').toBe(meter(tag).today);
    expect(series.some(v => v > 0), 'so the empty state cannot fire beside the tile').toBe(true);
  });
});

describe('token meters — attaching governs what comes NEXT, not what already went', () => {
  let tag: string;
  let ungovernedBefore: number;

  beforeAll(() => {
    tag = 'shared-services';
    ungovernedBefore = meter(tag).ungoverned;
    // The tour's Connect beat. It attaches CoreWeave, Nebius and nb2.
    CC.activateOnramp('nb2');
  });

  it('puts the identity on a governed route', () => {
    expect(routes().find(r => r.tag === tag)!.path).not.toBe('public');
  });

  it('does not retro-launder the tokens that already rode the internet', () => {
    expect(ungovernedBefore, 'the fixture needs something to launder').toBeGreaterThan(0);
    expect(meter(tag).ungoverned).toBe(ungovernedBefore);
  });

  it('books everything metered from now on as governed', () => {
    const before = meter(tag);
    CC.meterTokens(tag, 4_000);
    const after = meter(tag);
    expect(after.governed - before.governed).toBe(4_000);
    expect(after.ungoverned).toBe(before.ungoverned);
  });

  it('only ever adds governed tokens from the readiness-gated tick', () => {
    /* `tickTokens` skips any identity `endpointReadyFor()` denies, and that
       predicate is strictly stronger than "attached" — so every token it adds
       rode an AT&T path by construction. Pinned, because a future gate change
       that let it tick an unattached identity would silently mint governed
       tokens for traffic on the internet. */
    const before = meters().map(m => ({ tag: m.tag, ungoverned: m.ungoverned }));
    expect(tickTokens(() => 0.5), 'this fixture needs the tick to do something').toBe(true);
    for (const b of before) expect(meter(b.tag).ungoverned, b.tag).toBe(b.ungoverned);
    expect(meters().some(m => m.governed > 0), 'and it added governed tokens').toBe(true);
  });

  it('still reconciles after every one of those mutations', () => {
    for (const m of meters()) expect(m.today).toBe(m.governed + m.ungoverned);
  });
});
