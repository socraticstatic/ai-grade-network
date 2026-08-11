import { describe, expect, it } from 'vitest';
import { meridianEstate } from './meridianEstate';

describe('meridianEstate', () => {
  it('is deterministic', () => {
    expect(JSON.stringify(meridianEstate())).toBe(JSON.stringify(meridianEstate()));
  });

  it('seeds the bank-scale site mix', () => {
    const byClass = (c: string) => meridianEstate().branches.filter(b => b.siteClass === c).length;
    expect(byClass('dc')).toBe(3);
    expect(byClass('office')).toBe(210);
    expect(byClass('branch')).toBe(2840);
    expect(byClass('atm')).toBe(1130);
  });

  it('gives every site an id, name, city, geo and a class-appropriate CIDR', () => {
    for (const b of meridianEstate().branches) {
      expect(b.id).toMatch(/^mt-/);
      expect(b.geo).toHaveLength(2);
      expect(b.cidrs[0]).toMatch(/^10\.\d+\.\d+\.\d+\/(20|24|28)$/); // dc-office /20, branch /24, atm /28
    }
  });

  it('builds a hub-spoke cloud estate on two providers', () => {
    const e = meridianEstate();
    expect(e.clouds.map(c => c.id).sort()).toEqual(['aws', 'azure']);
    for (const regionList of Object.values(e.regions)) {
      for (const r of regionList) {
        const spokes = e.vpcs[r.id] ?? [];
        expect(spokes.some(v => v.role.startsWith('Transit hub'))).toBe(true);
      }
    }
  });

  it('carries the phase-2a finding seeds', () => {
    const e = meridianEstate();
    const all = Object.values(e.vpcs).flat();
    expect(all.some(v => v.ai && !(v.tags ?? []).length)).toBe(true); // untracked AI
    expect(Object.values(e.regions).flat().some(r => !r.attached)).toBe(true); // unattached regions
    expect(Object.values(e.regions).flat().some(r => r.spof)).toBe(true); // SPOF
  });

  it('meridian vpc Region tags are geographically honest', () => {
    const e = meridianEstate();
    const regionGeo: Record<string, number> = {};
    for (const rs of Object.values(e.regions)) for (const r of rs) regionGeo[r.id] = r.geo[1];
    const expect3 = (lon: number) => (lon < -100 ? 'west' : lon < -90 ? 'central' : 'east');
    for (const [rid, vs] of Object.entries(e.vpcs))
      for (const v of vs) expect(v.cloudTags.Region).toBe(expect3(regionGeo[rid]));
  });

  it('allocates every CIDR uniquely across all 4,183 sites', () => {
    const e = meridianEstate();
    const cidrs = e.branches.map(b => b.cidrs[0]);
    expect(cidrs).toHaveLength(4183);
    expect(new Set(cidrs).size).toBe(4183);
    for (const cidr of cidrs) {
      const [, ip, mask] = cidr.match(/^10\.(\d+\.\d+\.\d+)\/(\d+)$/)!;
      for (const octet of ip.split('.')) {
        expect(Number(octet)).toBeGreaterThanOrEqual(0);
        expect(Number(octet)).toBeLessThanOrEqual(255);
      }
      expect(['20', '24', '28']).toContain(mask);
    }
  });
});
