import { describe, it, expect } from 'vitest';
import { CC } from './index';

// Fresh module instance per test file (vitest isolation) → seed state is pristine.

describe('fabricModel()', () => {
  it('is deterministic (same output on repeat calls)', () => {
    expect(CC.fabricModel()).toEqual(CC.fabricModel());
  });

  it('shapes sites with parsed first-mile transport', () => {
    const { sites } = CC.fabricModel();
    const byId = Object.fromEntries(sites.map(s => [s.id, s]));
    expect(byId['e-hq'].firstMile).toBe('AVPN');
    expect(byId['e-dc'].firstMile).toBe('ADI');
    expect(byId['e-branch'].firstMile).toBe('ABF');
    expect(byId['e-mob'].firstMile).toBe('Wireless');
    expect(byId['e-net'].firstMile).toBeNull();
  });

  it('exposes the fabric on-ramps (NetBond/DX/ER)', () => {
    const { onramps } = CC.fabricModel();
    expect(onramps.map(o => o.id).sort()).toEqual(['dx1', 'er1', 'nb1', 'nb2']);
    expect(onramps.find(o => o.id === 'nb1')!.active).toBe(true);
  });

  it('seed: AWS us-east-1 is attached, private, reliably reached', () => {
    const use1 = CC.fabricModel().regions.find(r => r.regionId === 'use1')!;
    expect(use1.attached).toBe(true);
    expect(use1.path).toBe('private');
    expect(['single', 'dual']).toContain(use1.reliability);
    expect(use1.onrampIds).toContain('nb1');
    expect(use1.latencyMs).toBeGreaterThan(0);
  });

  it('seed: an unattached region is public/none', () => {
    const usw2 = CC.fabricModel().regions.find(r => r.regionId === 'usw2')!;
    expect(usw2.attached).toBe(false);
    expect(usw2.path).toBe('public');
    expect(usw2.reliability).toBe('none');
  });

  /* IMPORTANT: `reliability` used to read `active.length === 1 || r.spof`, so
     a seeded single-path region rendered a "Single path" pill above a Reach
     line reading "On the public internet - not yet attached" and two path
     cards reading "Provisionable here" / "Not available here" — a pill
     asserting a path everything under it denied. Reliability counts ACTIVE
     on-ramps and nothing else; the type already carried 'none' for this. */
  it('never claims a path for a region with no active on-ramp', () => {
    const regions = CC.fabricModel().regions;
    const unattached = regions.filter(r => r.path === 'public');
    expect(unattached.length, 'the seed must carry unattached regions').toBeGreaterThan(0);
    for (const r of unattached) {
      expect(r.reliability, `${r.regionId} claims a path it does not have`).toBe('none');
    }
  });

  it('seed: UK South is spof and unattached, and reads as not attached, not single', () => {
    const seed = (CC.regions as Record<string, { id: string; spof?: boolean; attached: boolean }[]>)
      .azure.find(r => r.id === 'uks')!;
    expect(seed.spof, 'uks is the seeded single-point-of-failure region').toBe(true);
    expect(seed.attached).toBe(false);

    const uks = CC.fabricModel().regions.find(r => r.regionId === 'uks')!;
    expect(uks.path).toBe('public');
    expect(uks.reliability).toBe('none');
  });

  it('still reads single once an on-ramp is actually carrying the region', () => {
    // use1 is the seeded attached region: one active on-ramp, so 'single' is
    // earned by the on-ramp, not by the spof flag.
    const use1 = CC.fabricModel().regions.find(r => r.regionId === 'use1')!;
    expect(use1.onrampIds.length).toBeGreaterThan(0);
    expect(use1.reliability).toBe('single');
  });

  it('surfaces cloud-to-cloud flows', () => {
    const { c2c } = CC.fabricModel();
    expect(c2c.length).toBeGreaterThan(0);
    expect(c2c.every(f => typeof f.gbps === 'number')).toBe(true);
  });
});

describe('provisionRegion()', () => {
  it('activates the capturing on-ramp and returns the region attached/private', () => {
    const before = CC.fabricModel().regions.find(r => r.regionId === 'usw2')!;
    expect(before.attached).toBe(false);

    const shape = CC.provisionRegion('usw2', { attachType: 'Direct Connect' });
    expect(shape).not.toBeNull();
    expect(shape!.regionId).toBe('usw2');
    expect(shape!.attached).toBe(true);
    expect(shape!.path).toBe('private');

    // reflected in the model
    const after = CC.fabricModel().regions.find(r => r.regionId === 'usw2')!;
    expect(after.attached).toBe(true);
    expect(after.path).toBe('private');
  });

  it('returns null for an unknown region', () => {
    expect(CC.provisionRegion('does-not-exist')).toBeNull();
  });
});
