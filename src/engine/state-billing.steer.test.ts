import { describe, it, expect } from 'vitest';
import { CC } from './index';

/**
 * The flagship Cost coupling: steering a public flow must move the BILL, not
 * just a route override. egress() is now steer-aware — a steered public flow
 * moves its share of the baseline public spend into committed pricing.
 *
 * Fresh window.CC per test file (vitest isolates modules per file), so these
 * read the seed baseline directly. Steers are reverted after each assertion so
 * ordering doesn't matter.
 */

// Baseline public flow set + spend, read once with zero steers (seed state).
const seedRows = CC.routeFlows();
const seedPublic = seedRows.filter(r => !r.current.attControlled);
const BASE_PUB = CC.egress().pub;                              // 29_900 at seed
const BASE_PUB_GBPS = seedPublic.reduce((s, r) => s + r.gbps, 0);

const steerableRow = () => {
  const rec = CC.routeAdvisor().recommendations.find(r => r.action === 'steer');
  return rec ? { rec, row: CC.routeFlows().find(r => r.id === rec.flowId)! } : null;
};

describe('steer-aware egress economics', () => {
  it('seed egress is fully public on the four opportunity buckets and is deterministic', () => {
    const a = CC.egress();
    const b = CC.egress();
    expect(a).toEqual(b);                    // no Date.now / Math.random
    expect(a.pub).toBe(29_900);
    // honest-middle: base-private is always captured at its committed rate, so
    // even at seed the fabric already saves vs all-public (18_300 - 15_000).
    expect(a.savings).toBe(3_300);
    expect(BASE_PUB).toBe(29_900);
  });

  it('(a) steering flow X drops egress.pub by X share of BASELINE_PUB; priv/savings rise, total drops', () => {
    const s = steerableRow();
    expect(s).not.toBeNull();
    const { rec, row } = s!;
    const before = CC.egress();
    expect(CC.steerFlow(rec.flowId, rec.pathId)).toBe(true);
    const after = CC.egress();

    const expectedReduction = BASE_PUB * (row.gbps / BASE_PUB_GBPS);
    expect(before.pub - after.pub).toBeCloseTo(expectedReduction, 4);
    expect(after.priv).toBeGreaterThan(before.priv);
    expect(after.savings).toBeGreaterThan(before.savings);
    expect(after.total).toBeLessThan(before.total);
    // realized delta is the private discount (15%) on what moved
    expect(before.total - after.total).toBeCloseTo(expectedReduction * 0.15, 0);

    CC.clearSteer(rec.flowId);
    expect(CC.egress().pub).toBeCloseTo(before.pub, 4); // fully reverts
  });

  it('(b) total captured over all steers stays <= BASELINE_PUB savings portion AND <= public exposure', () => {
    const startPub = CC.egress().pub;
    let captured = 0;
    const steered: string[] = [];
    for (let i = 0; i < 20; i++) {
      const s = steerableRow();
      if (!s) break;
      const { rec } = s;
      if (steered.includes(rec.flowId)) break;
      const before = CC.egress().total;
      CC.steerFlow(rec.flowId, rec.pathId);
      captured += before - CC.egress().total;
      steered.push(rec.flowId);
    }
    expect(captured).toBeGreaterThan(0);
    // captured is the 15% private discount on moved public spend, so it can
    // never exceed the savings portion of the baseline public spend...
    expect(captured).toBeLessThanOrEqual(BASE_PUB * 0.15 + 1);
    // ...nor the public exposure it was carved out of.
    expect(captured).toBeLessThanOrEqual(startPub);
    steered.forEach(id => CC.clearSteer(id));
  });
});
