import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { CC } from '../../../engine';
import { aiSpendTotals } from '../aiSpend';
import {
  CACHE_HIT_RATE,
  routingCard,
  cachingCard,
  budgetTrack,
  teamCards,
  providerShare,
} from './costFigures';

/* Shared engine singleton: drive one trace up front so spend is non-zero,
   restore any flag mutation after each test so order stays irrelevant. */
beforeAll(() => {
  CC.promptTrace!('rd-helion', 'helion-70b', 'cost figures test drive');
});

afterEach(() => {
  while (CC.gatewayFlags().routing || CC.gatewayFlags().caching) CC.undo();
});

describe('routingCard', () => {
  it('states the aiSpendTotals day figures times 30, and the flag', () => {
    const totals = aiSpendTotals(CC);
    const card = routingCard(CC);
    expect(card.currentMonthly).toBeCloseTo(totals.spendIfExternal * 30, 10);
    expect(card.routedMonthly).toBeCloseTo(totals.spendToday * 30, 10);
    expect(card.savingMonthly).toBeCloseTo(card.currentMonthly - card.routedMonthly, 10);
    expect(card.achieved).toBe(false);
    CC.setGatewayFlag('routing', true);
    expect(routingCard(CC).achieved).toBe(true);
  });
});

describe('cachingCard', () => {
  it('projects the stated hit rate over per-model monthly spend', () => {
    const card = cachingCard(CC);
    const monthly = card.perModel.reduce((s, m) => s + m.monthly, 0);
    expect(card.savingMonthly).toBeCloseTo(monthly * CACHE_HIT_RATE, 10);
    // sorted by monthly, descending
    const sorted = card.perModel.map(m => m.monthly);
    expect(sorted).toEqual(sorted.slice().sort((a, b) => b - a));
    expect(card.achieved).toBe(false);
    CC.setGatewayFlag('caching', true);
    expect(cachingCard(CC).achieved).toBe(true);
  });
});

describe('budgetTrack', () => {
  it('cumulative series never decreases and the seeded estate is under budget', () => {
    const t = budgetTrack(CC);
    expect(t.spentSeries.length).toBe(24);
    for (let i = 1; i < t.spentSeries.length; i++) {
      expect(t.spentSeries[i]).toBeGreaterThanOrEqual(t.spentSeries[i - 1]);
    }
    expect(t.budgetMonthly).toBeGreaterThan(0);
    expect(t.overBudget).toBe(t.predictedMonthly > t.budgetMonthly);
  });
});

describe('teamCards', () => {
  it('one card per metered identity, sorted by spend, driver named', () => {
    const cards = teamCards(CC);
    expect(cards.length).toBeGreaterThanOrEqual(3);
    const spends = cards.map(c => c.spendToday);
    expect(spends).toEqual(spends.slice().sort((a, b) => b - a));
    const helion = cards.find(c => c.tag === 'rd-helion');
    expect(helion!.driver).toBe('helion-70b');
  });
});

describe('providerShare', () => {
  it('percentages sum to about 100 and the basis is honest', () => {
    const { shares, basis } = providerShare(CC);
    expect(['spend', 'budget']).toContain(basis);
    expect(shares.length).toBeGreaterThanOrEqual(2);
    const pctSum = shares.reduce((s, x) => s + x.pct, 0);
    expect(pctSum).toBeGreaterThanOrEqual(98);
    expect(pctSum).toBeLessThanOrEqual(102);
    shares.forEach(s => expect(s.color).toMatch(/^#/));
  });
});
