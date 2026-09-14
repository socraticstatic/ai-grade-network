import { describe, it, expect, afterEach } from 'vitest';
import { CC } from './index';

/**
 * The honest-middle per-bucket arbitrage model. arbitrage() and
 * egress()/billing() derive from the SAME per-bucket public/AT&T rates and the
 * SAME attach state, so every headline reconciles by construction:
 *
 *   hyperscalerBill >= cloudConnectBill >= fullyFabricBill
 *   billing().total === arbitrage().cloudConnectBill
 *
 * Fresh window.CC per file (vitest isolates modules per file), so these read
 * the seed baseline directly. Any on-ramp activated in a test is reverted after
 * so ordering doesn't matter.
 */

// nb1 is the only active on-ramp at seed; revert anything a test attaches.
const attached: string[] = [];
afterEach(() => {
  while (attached.length) {
    const id = attached.pop()!;
    const o = CC.onramps.find(x => x.id === id);
    if (o) o.active = false;
  }
});

describe('arbitrage() seed numbers (calibration target)', () => {
  it('produces the exact seed bills (egress-only; ports disclosed separately)', () => {
    const a = CC.arbitrage();
    // EGRESS-ONLY: public gpu/aws/azure/misc (29_900) + base captured (15_000)
    expect(a.cloudConnectBill).toBe(44_900);
    // Σ publicCost all buckets (48_200), NO ports — attach-invariant ceiling.
    expect(a.hyperscalerBill).toBe(48_200);
    expect(a.savings).toBe(3_300);                // 48_200 - 44_900
    expect(a.savingsPct).toBe(7);                 // 3300 / 48200 ≈ 6.8%
    // Σ attCost all buckets (3400+3300+2100+1200+15000 = 25_000)
    expect(a.fullyFabricBill).toBe(25_000);
    expect(a.availableSavings).toBe(19_900);      // 44_900 - 25_000
    // ports disclosed separately: nb1 NetBond = 4200 active.
    expect(a.portFeesMo).toBe(4_200);
    // if every on-ramp were attached: +dx1(3800)+er1(3800)+nb2(5600) = 17_400.
    expect(a.fullyFabricPortFeesMo).toBe(17_400);
  });

  it('egress at seed matches: pub 29_900, priv 15_000, total 44_900, savings 3_300', () => {
    const e = CC.egress();
    expect(e.pub).toBe(29_900);
    expect(e.priv).toBe(15_000);
    expect(e.total).toBe(44_900);
    expect(e.savings).toBe(3_300);
  });

  it('rate table is honest-middle: internet/cross-cloud win big, base stays modest', () => {
    const a = CC.arbitrage();
    const by = Object.fromEntries(a.buckets.map(b => [b.key, b]));
    expect(by.gpu).toMatchObject({ publicCost: 11_400, attCost: 3_400, category: 'internet', onrampId: 'nb2' });
    expect(by['aws-west-eu']).toMatchObject({ publicCost: 9_500, attCost: 3_300, category: 'cross-cloud', onrampId: 'dx1' });
    expect(by.azure).toMatchObject({ publicCost: 6_000, attCost: 2_100, category: 'cross-cloud', onrampId: 'er1' });
    expect(by.misc).toMatchObject({ publicCost: 3_000, attCost: 1_200, category: 'internet', onrampId: null });
    expect(by['base-private']).toMatchObject({ publicCost: 18_300, attCost: 15_000, category: 'committed', onrampId: null });
    // committed base saves ~18%, the opportunity buckets 60-70%+.
    expect(by['base-private'].savingPct).toBe(18);
    expect(by.gpu.savingPct).toBeGreaterThanOrEqual(60);
  });

  it('buckets are ranked by saving, biggest opportunity first', () => {
    const savings = CC.arbitrage().buckets.map(b => b.saving);
    for (let i = 1; i < savings.length; i++) expect(savings[i - 1]).toBeGreaterThanOrEqual(savings[i]);
    expect(CC.arbitrage().buckets[0].key).toBe('gpu'); // 8_000 saving
  });
});

describe('consistency invariants (binding)', () => {
  it('billing().total === arbitrage().cloudConnectBill + arbitrage().portFeesMo (egress + ports)', () => {
    const a = CC.arbitrage();
    expect(CC.billing().total).toBe(a.cloudConnectBill + a.portFeesMo);
  });

  it('hyperscalerBill >= cloudConnectBill >= fullyFabricBill', () => {
    const a = CC.arbitrage();
    expect(a.hyperscalerBill).toBeGreaterThanOrEqual(a.cloudConnectBill);
    expect(a.cloudConnectBill).toBeGreaterThanOrEqual(a.fullyFabricBill);
  });

  it('savings == hyperscalerBill - cloudConnectBill; availableSavings == cloudConnectBill - fullyFabricBill', () => {
    const a = CC.arbitrage();
    expect(a.savings).toBe(a.hyperscalerBill - a.cloudConnectBill);
    expect(a.availableSavings).toBe(a.cloudConnectBill - a.fullyFabricBill);
  });

  it('egress().savings equals arbitrage().savings (one savings number everywhere)', () => {
    expect(CC.egress().savings).toBe(CC.arbitrage().savings);
  });
});

describe('attaching a bucket moves the bills', () => {
  it('activating nb2 captures gpu: savings rise, cloudConnectBill falls, gpu flips attached', () => {
    const before = CC.arbitrage();
    expect(before.buckets.find(b => b.key === 'gpu')!.attached).toBe(false);

    const nb2 = CC.onramps.find(o => o.id === 'nb2')!;
    nb2.active = true;                       // NetBond Adv port fee = 5_600
    attached.push('nb2');

    const after = CC.arbitrage();
    expect(after.buckets.find(b => b.key === 'gpu')!.attached).toBe(true);
    // gpu egress moves 11_400 public -> 3_400 att: egress-only bills, so the
    // whole 8_000 shows up cleanly.
    expect(after.savings - before.savings).toBe(8_000);
    expect(before.cloudConnectBill - after.cloudConnectBill).toBe(8_000);
    // opportunity still on the table shrinks by 8_000.
    expect(before.availableSavings - after.availableSavings).toBe(8_000);
    // the hyperscaler ceiling is ATTACH-INVARIANT (egress-only, no ports).
    expect(after.hyperscalerBill).toBe(before.hyperscalerBill);
    expect(after.hyperscalerBill).toBe(48_200);
    // ports are disclosed separately and DO grow (nb2 NetBond Adv = 5_600).
    expect(after.portFeesMo - before.portFeesMo).toBe(5_600);
    // invariant holds and invoice still reconciles (egress + ports).
    expect(after.cloudConnectBill).toBeGreaterThanOrEqual(after.fullyFabricBill);
    expect(CC.billing().total).toBe(after.cloudConnectBill + after.portFeesMo);
  });
});
