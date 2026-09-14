import { estimateMonthlySavings, publicGbps, toSavingsRec, PUBLIC_EXPOSURE_ALERT_USD } from './costMath';

describe('toSavingsRec', () => {
  const flows = [
    { id: 'f1', gbps: 6.3, current: { attControlled: false, egressPerGb: 0.09 } },
    { id: 'f2', gbps: 2.4, current: { attControlled: false } }, // no egressPerGb → fallback
  ];

  it('parses "$X/GB" out of the engine rec detail', () => {
    const rec = { id: 'r1', flowId: 'f1', action: 'steer' as const, detail: 'steer to AT&T — −12ms, −$0.07/GB' };
    const out = toSavingsRec(rec, flows);
    expect(out.dCostPerGb).toBeCloseTo(0.07);
    expect(out.perGbCurrent).toBeCloseTo(0.09);
    expect(out.gbps).toBeCloseTo(6.3);
  });

  it('falls back to 0.09 perGbCurrent when the flow lacks egressPerGb', () => {
    const rec = { id: 'r2', flowId: 'f2', action: 'steer' as const, detail: '−$0.05/GB' };
    expect(toSavingsRec(rec, flows).perGbCurrent).toBe(0.09);
  });

  it('degrades to dCostPerGb=0 (not NaN) when the detail has no "$X/GB" token', () => {
    const rec = { id: 'r3', flowId: 'f1', action: 'steer' as const, detail: 'diversify this flow — add a second on-ramp' };
    const out = toSavingsRec(rec, flows);
    expect(out.dCostPerGb).toBe(0);
    expect(Number.isNaN(out.dCostPerGb)).toBe(false);
  });

  it('degrades to gbps=0 and dCostPerGb=0 when the flow id is unknown', () => {
    const rec = { id: 'r4', flowId: 'missing', action: 'steer' as const, detail: '' };
    const out = toSavingsRec(rec, flows);
    expect(out.gbps).toBe(0);
    expect(out.dCostPerGb).toBe(0);
    expect(out.perGbCurrent).toBe(0.09);
    // and estimateMonthlySavings stays finite (0), never NaN, on the degraded rec
    const est = estimateMonthlySavings([out], 29_900, 8.7);
    expect(Number.isNaN(est)).toBe(false);
    expect(est).toBe(0);
  });
});

it('estimates a steer rec as its share of public spend scaled by the per-GB discount', () => {
  // Single public flow carrying all public gbps: share = 1.
  // saving = 29900 * 1 * (0.07 / 0.09) = 23255.55… → 23256
  const recs = [
    { id: 'r1', action: 'steer' as const, dCostPerGb: 0.07, perGbCurrent: 0.09, gbps: 6.3 },
  ];
  expect(estimateMonthlySavings(recs, 29_900, 6.3)).toBe(23_256);
});

it('returns 0 when there is no public gbps to attribute spend to', () => {
  const recs = [
    { id: 'r1', action: 'steer' as const, dCostPerGb: 0.07, perGbCurrent: 0.09, gbps: 6.3 },
  ];
  expect(estimateMonthlySavings(recs, 29_900, 0)).toBe(0);
});

it('diversify recs contribute 0', () => {
  const recs = [
    { id: 'r1', action: 'steer' as const, dCostPerGb: 0.07, perGbCurrent: 0.09, gbps: 3.0 },
    { id: 'r2', action: 'diversify' as const, dCostPerGb: 0.07, perGbCurrent: 0.09, gbps: 3.0 },
  ];
  // Only r1 counts: share = 3/6 = 0.5 → 29900 * 0.5 * (0.07/0.09) = 11627.77… → 11628
  expect(estimateMonthlySavings(recs, 29_900, 6.0)).toBe(11_628);
});

it('guards a non-positive perGbCurrent to a 0 contribution', () => {
  const recs = [
    { id: 'r1', action: 'steer' as const, dCostPerGb: 0.07, perGbCurrent: 0, gbps: 6.3 },
  ];
  expect(estimateMonthlySavings(recs, 29_900, 6.3)).toBe(0);
});

it('publicGbps sums only flows whose current path is not AT&T controlled', () => {
  const flows = [
    { id: 'a', gbps: 6.3, current: { attControlled: false } },
    { id: 'b', gbps: 2.4, current: { attControlled: false } },
    { id: 'c', gbps: 4.0, current: { attControlled: true } },
  ];
  expect(publicGbps(flows)).toBeCloseTo(8.7);
});

it('exports the public-exposure alert threshold', () => {
  expect(PUBLIC_EXPOSURE_ALERT_USD).toBe(6000);
});
