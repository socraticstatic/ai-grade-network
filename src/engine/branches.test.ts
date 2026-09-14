import { describe, it, expect } from 'vitest';
import { CC } from './index';

interface Branch { id: string; name: string; city: string; geo: [number, number]; cidrs: string[]; onrampId: string }

describe('branches', () => {
  it('seeds the stakeholder example branches', () => {
    const names = (CC.branches as Branch[]).map(b => b.city);
    expect(names).toContain('San Jose');
    expect(names).toContain('San Francisco');
    expect(names).toContain('Berkeley');
  });

  it('gives every branch a routable CIDR and a real on-ramp', () => {
    const onrampIds = new Set((CC.onramps as { id: string }[]).map(o => o.id));
    (CC.branches as Branch[]).forEach(b => {
      expect(b.cidrs.length, `${b.id} has no CIDRs`).toBeGreaterThan(0);
      expect(onrampIds.has(b.onrampId), `${b.id} points at unknown on-ramp ${b.onrampId}`).toBe(true);
    });
  });
});
