import { describe, it, expect } from 'vitest';
import { CC } from './index';

describe('ported engine', () => {
  it('exposes computed counts', () => {
    const c = CC.counts();
    expect(c.clouds).toBe(6);
    expect(c.vpcs).toBe(15);
  });

  /* Routes and gateways are per-region seeds, summed in counts() — no
     hardcoded totals. Gateways must still read 38 so no displayed figure
     moved when the hardcode was removed. */
  it('counts().routes and counts().gateways are sums of per-region seeds', () => {
    const regions = Object.values(
      CC.regions as Record<string, { routes: number; gateways: number }[]>,
    ).flat();
    const c = CC.counts();
    expect(c.routes).toBe(regions.reduce((s, r) => s + r.routes, 0));
    expect(c.routes).toBeGreaterThan(0);
    expect(c.gateways).toBe(regions.reduce((s, r) => s + r.gateways, 0));
    expect(c.gateways).toBe(38); // pinned: un-hardcoding must not move the figure
  });

  it('a mutation changes a real number', () => {
    const before = CC.counts().attached;
    CC.activateOnramp('nb2');
    expect(CC.counts().attached).toBeGreaterThan(before);
  });
});
