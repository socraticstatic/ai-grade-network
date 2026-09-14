import { describe, it, expect } from 'vitest';
import { CC } from './index';

describe('hyperscaler cloud tags', () => {
  it('carries key-value cloudTags on every seeded VPC, distinct from governance tags', () => {
    const all = Object.values(CC.vpcs).flat() as { id: string; cloudTags?: Record<string, string> }[];
    expect(all.length).toBeGreaterThan(0);
    all.forEach(v => {
      expect(v.cloudTags, `${v.id} has no cloudTags`).toBeTruthy();
      expect(typeof v.cloudTags!.Project).toBe('string');
    });
  });

  it('uses Project values the west-workloads example can group on', () => {
    const all = Object.values(CC.vpcs).flat() as { cloudTags?: Record<string, string> }[];
    const projects = new Set(all.map(v => v.cloudTags?.Project));
    expect(projects.has('xyz')).toBe(true);
    expect(projects.has('abc')).toBe(true);
  });

  // MUST RUN LAST — rescanAccount mutates state permanently for rest of file
  it('survives rescan when hidden VPC is discovered', () => {
    const found = CC.rescanAccount('gcp');
    expect(found).toBe('vpc-ml-suite'); // hidden VPC should be discovered
    const all = Object.values(CC.vpcs).flat() as { id: string; cloudTags?: Record<string, string> }[];
    all.forEach(v => {
      expect(v.cloudTags, `${v.id} has no cloudTags after rescan`).toBeTruthy();
      expect(typeof v.cloudTags!.Project).toBe('string');
    });
  });
});
