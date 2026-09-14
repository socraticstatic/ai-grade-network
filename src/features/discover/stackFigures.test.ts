import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { aiSpendTotals } from '../ai-fabric/aiSpend';
import { estimateMonthlySavings, publicGbps, toSavingsRec } from '../cost/costMath';
import {
  aiStratum,
  naasStratum,
  attachOpportunities,
  steerOpportunities,
  stagedDeltas,
  commitMoves,
  type StagedMove,
} from './stackFigures';

/* The engine is a shared singleton; ORDER MATTERS in this file. Every test
   before the "commit" block is read-only. The commit test runs last and
   undoes what it does. */

describe('stackFigures — view-mode derivations agree with the verb pages', () => {
  it('AI stratum restates aiSpendTotals and the model catalog, nothing else', () => {
    const fig = aiStratum(CC);
    const totals = aiSpendTotals(CC);
    const catalog = CC.modelCatalog() as { ready: boolean }[];
    expect(fig.tokensToday).toBe(totals.tokensToday);
    expect(fig.ungovernedTokensToday).toBe(totals.ungovernedTokensToday);
    expect(fig.spendToday).toBe(totals.spendToday);
    expect(fig.identityCount).toBe(totals.identityCount);
    expect(fig.modelsTotal).toBe(catalog.length);
    expect(fig.modelsReady).toBe(catalog.filter(m => m.ready).length);
  });

  it('NaaS stratum restates fabricModel, egress and arbitrage', () => {
    const fig = naasStratum(CC);
    const fabric = CC.fabricModel();
    expect(fig.regionsTotal).toBe(fabric.regions.length);
    expect(fig.regionsAttached).toBe(fabric.regions.filter(r => r.attached).length);
    expect(fig.sites).toBe(fabric.sites.length);
    expect(fig.egressPubMo).toBe(CC.egress().pub);
    expect(fig.egressPrivMo).toBe(CC.egress().priv);
    expect(fig.availableSavingsMo).toBe(CC.arbitrage().availableSavings);
  });
});

describe('stackFigures — opportunities', () => {
  it('offers exactly the unattached fabric regions, with regionLatency figures', () => {
    const opps = attachOpportunities(CC);
    const unattached = CC.fabricModel().regions.filter(r => !r.attached);
    expect(opps.map(o => o.regionId).sort()).toEqual(unattached.map(r => r.regionId).sort());
    for (const opp of opps) {
      const lat = CC.regionLatency(opp.regionId)!;
      expect(opp.privateMs).toBe(lat.privateMs);
      expect(opp.publicMs).toBe(lat.publicMs);
      expect(opp.publicMs).toBeGreaterThan(opp.privateMs);
    }
  });

  it('prices an attach only from an unattached arbitrage bucket on that on-ramp', () => {
    const buckets = CC.arbitrage().buckets;
    for (const opp of attachOpportunities(CC)) {
      if (opp.bucketSavingMo === null) continue;
      const bucket = buckets.find(b => b.label === opp.bucketLabel)!;
      expect(bucket.attached).toBe(false);
      expect(opp.bucketSavingMo).toBe(bucket.saving);
    }
  });

  it('prices a steer with the SAME arithmetic as /naas/cost SteerToSave', () => {
    const flows = CC.routeFlows();
    const pub = CC.egress().pub;
    const gbps = publicGbps(flows);
    for (const opp of steerOpportunities(CC)) {
      const rec = CC.routeAdvisor().recommendations.find(
        r => r.flowId === opp.flowId && r.action === 'steer',
      )!;
      const expected = estimateMonthlySavings([toSavingsRec(rec, flows)], pub, gbps);
      expect(opp.egressSavingMo).toBe(expected > 0 ? expected : null);
    }
  });
});

describe('stackFigures — staged deltas', () => {
  it('sums priced moves, names unpriced ones, and states the worst path arrow', () => {
    const opps = attachOpportunities(CC);
    expect(opps.length).toBeGreaterThan(0);
    const staged: StagedMove[] = opps.map(o => ({ kind: 'attach', regionId: o.regionId }));
    const deltas = stagedDeltas(CC, staged);
    expect(deltas.moves).toBe(staged.length);
    const pricedSum = opps.reduce((s, o) => s + (o.bucketSavingMo ?? 0), 0);
    expect(deltas.egressSavingMo).toBe(pricedSum);
    expect(deltas.unpricedMoves).toEqual(
      opps.filter(o => o.bucketSavingMo === null).map(o => o.label),
    );
    const worst = [...opps].sort((a, b) => b.publicMs - a.publicMs)[0];
    expect(deltas.worstPath).toEqual({
      label: worst.label, publicMs: worst.publicMs, privateMs: worst.privateMs,
    });
    // The arrow's two figures are regionLatency's, verbatim.
    const lat = CC.regionLatency(worst.regionId)!;
    expect(deltas.worstPath!.privateMs).toBe(lat.privateMs);
  });

  it('an empty tray states nothing', () => {
    expect(stagedDeltas(CC, [])).toEqual({
      moves: 0, worstPath: null, egressSavingMo: 0, unpricedMoves: [],
      violationsCleared: 0, policyNotes: [],
    });
  });
});

describe('stackFigures — commit (mutates, then restores)', () => {
  it('commit attaches through provisionRegion and the stratum figure moves', () => {
    const before = naasStratum(CC);
    const opp = attachOpportunities(CC)[0];
    expect(opp).toBeDefined();
    const failed = commitMoves(CC, [{ kind: 'attach', regionId: opp.regionId }]);
    expect(failed).toEqual([]);
    const after = naasStratum(CC);
    // Activating an on-ramp can attach every region it serves, so the count
    // rises by AT LEAST the staged region.
    expect(after.regionsAttached).toBeGreaterThan(before.regionsAttached);
    // The committed figure is what the staged arrow promised.
    const region = CC.fabricModel().regions.find(r => r.regionId === opp.regionId)!;
    expect(region.attached).toBe(true);
    expect(region.latencyMs).toBe(opp.privateMs);
    // Restore for the rest of the suite.
    expect(CC.undo()).toBeTruthy();
    expect(naasStratum(CC).regionsAttached).toBe(before.regionsAttached);
  });

  it('a move the engine refuses is returned, not swallowed', () => {
    const failed = commitMoves(CC, [{ kind: 'attach', regionId: 'no-such-region' }]);
    expect(failed).toHaveLength(1);
  });
});

describe('stackFigures — the advisor draft', () => {
  it('drafts only moves the engine itself prices, with stagedDeltas over them', async () => {
    const { advisorDraft, attachOpportunities: attach, steerOpportunities: steer, stagedDeltas: deltas } =
      await import('./stackFigures');
    const draft = advisorDraft(CC);
    const pricedAttach = attach(CC).filter(o => o.bucketSavingMo !== null);
    const steers = steer(CC);
    expect(draft.moves).toHaveLength(pricedAttach.length + steers.length);
    for (const m of draft.moves) {
      if (m.kind === 'attach') {
        expect(pricedAttach.some(o => o.regionId === m.regionId)).toBe(true);
      } else {
        expect(steers.some(o => o.flowId === m.flowId && o.pathId === m.pathId)).toBe(true);
      }
    }
    expect(draft.deltas).toEqual(deltas(CC, draft.moves));
    // Every drafted move is priced, so nothing lands in the unpriced list.
    expect(draft.deltas.unpricedMoves).toEqual([]);
  });
});
