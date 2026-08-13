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
  it('expanded: the inside is the real on-ramp inventory, grouped by facility', () => {
    const l = computeFabricLayout(model, { expanded: true });
    const facilities = new Set(model.onramps.map(o => o.site));

    // Never more than the three biggest facilities, and never more than there
    // are - the band has to hold what it draws.
    expect(l.internals!.sites.length).toBe(Math.min(3, facilities.size));
    expect(l.internals!.sites.map(s => s.label).every(f => facilities.has(f))).toBe(true);

    // Every drawn path is a real on-ramp of a drawn facility, stated lit/dark.
    const drawnFacilities = new Set(l.internals!.sites.map(s => s.label));
    const eligible = model.onramps.filter(o => drawnFacilities.has(o.site));
    expect(l.internals!.paths.length).toBeGreaterThan(0);
    expect(l.internals!.paths.length).toBeLessThanOrEqual(eligible.length);
    for (const p of l.internals!.paths) {
      expect(p.label).toMatch(/ · (lit|dark)$/);
      expect(eligible.some(o => p.id === `fab-path-${o.id}`)).toBe(true);
      // and sits between the band's top and bottom
      expect(p.y).toBeGreaterThan(l.fabric.y);
      expect(p.y).toBeLessThan(l.fabric.y + l.fabric.h);
    }

    // The caption states this estate's counts, then names the one figure that
    // is a product specification rather than a reading.
    const lit = model.onramps.filter(o => o.active).length;
    expect(l.internals!.caption).toContain(`${model.onramps.length} on-ramps in ${facilities.size} AT&T facilities`);
    expect(l.internals!.caption).toContain(`${lit} lit`);
    expect(l.internals!.caption).toContain('BFD failover detect in 900ms');
  });
  it('deterministic in both modes', () => {
    expect(computeFabricLayout(model, { expanded: true })).toEqual(computeFabricLayout(model, { expanded: true }));
  });
});
