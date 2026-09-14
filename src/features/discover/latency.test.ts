import { describe, it, expect } from 'vitest';
import { airMiles, estimateRttMs, fabricLatency, PROBED } from './latency';

const ASHBURN = [39.0, -77.5] as const;
const OREGON = [45.6, -121.2] as const;
const USEAST1 = [38.9, -77.4] as const;

describe('latency model', () => {
  it('airMiles approximates great-circle distance', () => {
    expect(airMiles(ASHBURN, ASHBURN)).toBe(0);
    const d = airMiles(ASHBURN, OREGON);
    expect(d).toBeGreaterThan(2000);
    expect(d).toBeLessThan(2700);
  });

  it('estimateRttMs grows with distance; co-located ≈ base', () => {
    const near = estimateRttMs(ASHBURN, USEAST1);
    const far = estimateRttMs(ASHBURN, OREGON);
    expect(near).toBeLessThan(6); // ~co-located, floor-dominated
    expect(far).toBeGreaterThan(45); // cross-country propagation
    expect(far).toBeGreaterThan(near);
  });

  it('fabricLatency is estimated by default and probed when a measurement exists', () => {
    const k = 'test:aws/usw2';
    expect(fabricLatency(k, ASHBURN, OREGON).source).toBe('estimated');
    PROBED[k] = 41;
    expect(fabricLatency(k, ASHBURN, OREGON)).toEqual({ ms: 41, source: 'probed' });
    delete PROBED[k];
  });
});
