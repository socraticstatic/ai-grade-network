import { describe, it, expect } from 'vitest';
import { changeDirection, downgradeChangeFee, earlyTerminationCharge, estimateMonthlyRate, getMonthlyCost, termDiscountRate, volumeDiscountRate, buildAccountLedger } from './lmccBilling';

describe('changeDirection', () => {
  it('classifies up, down, and none', () => {
    expect(changeDirection(1000, 10000)).toBe('upgrade');
    expect(changeDirection(50000, 20000)).toBe('downgrade');
    expect(changeDirection(5000, 5000)).toBe('none');
  });
});

describe('downgradeChangeFee', () => {
  it('is a flat base plus a share of the monthly delta', () => {
    const fee = downgradeChangeFee(50000, 20000);
    const delta = estimateMonthlyRate(50000) - estimateMonthlyRate(20000);
    expect(fee).toBe(500 + Math.round(delta * 0.1));
  });

  it('bigger drops cost more', () => {
    expect(downgradeChangeFee(100000, 1000)).toBeGreaterThan(downgradeChangeFee(100000, 50000));
  });
});

describe('earlyTerminationCharge', () => {
  it('is half the remaining commitment', () => {
    expect(earlyTerminationCharge(10000, 6)).toBe(Math.round(estimateMonthlyRate(10000) * 6 * 0.5));
  });

  it('zero when nothing remains (month-to-month or term served)', () => {
    expect(earlyTerminationCharge(10000, 0)).toBe(0);
  });
});

describe('getMonthlyCost', () => {
  it('LMCC connections use the GA rate card', () => {
    expect(getMonthlyCost({ bandwidth: '1 Gbps', configuration: { isLmcc: true } })).toBe(estimateMonthlyRate(1000));
  });

  it('non-LMCC connections use their billing total when present', () => {
    expect(getMonthlyCost({ bandwidth: '10 Gbps', billing: { total: 1200 } })).toBe(1200);
  });

  it('falls back to a bandwidth-derived estimate', () => {
    expect(getMonthlyCost({ bandwidth: '500 Mbps' })).toBe(estimateMonthlyRate(500));
  });

  it('null when there is nothing to go on', () => {
    expect(getMonthlyCost({})).toBeNull();
  });
});

describe('discounts and the account ledger', () => {
  const live = (over?: any) => ({
    id: 'c1', name: 'AWS Max - San Jose', type: 'AWS Last Mile', status: 'Active',
    bandwidth: '10 Gbps', configuration: { isLmcc: true, lmccContractTerm: 'fixed-12' },
    createdAt: '2026-01-15T00:00:00Z', ...over,
  });

  it('longer terms earn deeper discounts; month-to-month earns none', () => {
    expect(termDiscountRate('monthly')).toBe(0);
    expect(termDiscountRate('fixed-12')).toBeGreaterThan(0);
    expect(termDiscountRate('fixed-36')).toBeGreaterThan(termDiscountRate('fixed-24'));
  });

  it('volume discount kicks in as committed bandwidth grows', () => {
    expect(volumeDiscountRate(1000)).toBe(0);
    expect(volumeDiscountRate(100000)).toBeGreaterThan(volumeDiscountRate(20000));
  });

  it('ledger lines cover billable connections and discounts subtract from the total', () => {
    const ledger = buildAccountLedger([live(), live({ id: 'c2', name: 'B', bandwidth: '50 Gbps', configuration: { isLmcc: true, lmccContractTerm: 'fixed-36' } })]);
    expect(ledger.lines).toHaveLength(2);
    expect(ledger.subtotal).toBe(estimateMonthlyRate(10000) + estimateMonthlyRate(50000));
    expect(ledger.termDiscount).toBeGreaterThan(0);
    expect(ledger.volumeDiscount).toBeGreaterThan(0);
    expect(ledger.total).toBe(ledger.subtotal - ledger.termDiscount - ledger.volumeDiscount);
  });

  it('only Live connections bill — pending, expired, deleted never appear', () => {
    const ledger = buildAccountLedger([live(), live({ id: 'c2', status: 'Pending' }), live({ id: 'c3', status: 'Deleted' })]);
    expect(ledger.lines).toHaveLength(1);
  });
});
