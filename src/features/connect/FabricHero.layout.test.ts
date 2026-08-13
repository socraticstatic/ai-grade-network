import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { computeFabricLayout } from './FabricHero';
import type { FabricModel } from './FabricHero';

const model = CC.fabricModel() as FabricModel;

describe('computeFabricLayout expanded mode', () => {
  it('collapsed: no internals, band at the classic x', () => {
    const l = computeFabricLayout(model);
    expect(l.internals).toBeUndefined();
    expect(l.fabric.x).toBe(404);
  });
  it('expanded: band widens leftward, right edge fixed so region edges stay put', () => {
    const collapsed = computeFabricLayout(model);
    const l = computeFabricLayout(model, { expanded: true });
    expect(l.fabric.x).toBeLessThan(404);
    expect(l.fabric.x + l.fabric.w).toBe(collapsed.fabric.x + collapsed.fabric.w);
    expect(l.regions.map(r => r.edge.to.x)).toEqual(collapsed.regions.map(r => r.edge.to.x));
  });
  it('expanded: two site rows and four ordered paths inside the band, left to right facts', () => {
    const l = computeFabricLayout(model, { expanded: true });
    expect(l.internals!.sites).toHaveLength(2);
    expect(l.internals!.paths).toHaveLength(4);
    expect(l.internals!.paths.map(p => p.siteIdx)).toEqual([0, 0, 1, 1]);
    // A product specification, framed as one - not this estate's telemetry.
    expect(l.internals!.caption).toBe(
      'How the fabric is built: 4 paths · 2 diverse sites · BFD failover detect in 900ms',
    );
    // paths of a site sit between the band's top and bottom
    for (const p of l.internals!.paths) {
      expect(p.y).toBeGreaterThan(l.fabric.y);
      expect(p.y).toBeLessThan(l.fabric.y + l.fabric.h);
    }
  });
  it('deterministic in both modes', () => {
    expect(computeFabricLayout(model, { expanded: true })).toEqual(computeFabricLayout(model, { expanded: true }));
  });
});
