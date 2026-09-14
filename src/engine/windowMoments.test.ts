import { describe, it, expect } from 'vitest';
import { CC } from './index';

/* The engine is a shared singleton — every test here restores what it moves. */

describe('windowMoments', () => {
  it('always carries the seeded anomaly at its own position', () => {
    const anomaly = CC.windowMoments().find(m => m.key === 'anomaly');
    expect(anomaly).toBeTruthy();
    expect(anomaly!.at).toBeGreaterThan(0);
    expect(anomaly!.at).toBeLessThan(1);
    expect(anomaly!.label).toMatch(/eu-west-1/);
  });

  it('a this-session attach adds its moment at the series step; undo keeps it, matching the drawn step', () => {
    const before = CC.windowMoments().filter(m => m.key.startsWith('attach:')).length;
    const region = CC.fabricModel().regions.find(r => !r.attached)!;
    expect(CC.provisionRegion(region.regionId)).toBeTruthy();
    const attachMoments = CC.windowMoments().filter(m => m.key.startsWith('attach:'));
    expect(attachMoments.length).toBeGreaterThan(before);
    for (const m of attachMoments) expect(m.at).toBeCloseTo(0.82, 5);
    // `_.sessionAttached` is append-only and latencySeries draws its 0.82
    // step from membership, not from attached-now — so after undo the chart
    // still shows the step and the moment must still name it.
    expect(CC.undo()).toBeTruthy();
    expect(CC.windowMoments().filter(m => m.key.startsWith('attach:')).length)
      .toBe(attachMoments.length);
  });

  it('an active failure sim marks the live tail, and clearing it removes the mark', () => {
    const onramp = CC.onramps.find((o: { active: boolean }) => o.active);
    expect(onramp).toBeTruthy();
    CC.simulateFailure(onramp.id);
    const sim = CC.windowMoments().find(m => m.key === 'sim');
    expect(sim).toBeTruthy();
    expect(sim!.at).toBe(1);
    expect(sim!.label).toContain(onramp.name);
    CC.clearSim();
    expect(CC.windowMoments().find(m => m.key === 'sim')).toBeUndefined();
  });
});
