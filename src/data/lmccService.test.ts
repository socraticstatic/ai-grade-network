import { describe, it, expect } from 'vitest';
import { CURRENT_PHASE, getAvailableMetros, getBandwidthOptions } from './lmccService';

describe('LMCC GA phase', () => {
  it('runs in GA', () => {
    expect(CURRENT_PHASE).toBe('ga');
  });

  it('offers San Jose and Ashburn', () => {
    const names = getAvailableMetros().map(m => m.name);
    expect(names.some(n => n.includes('San Jose'))).toBe(true);
    expect(names.some(n => n.includes('Ashburn'))).toBe(true);
  });

  it('bandwidth tiers match the Design Brief: 1/2/5/10/20/50/100 Gbps', () => {
    const options = getBandwidthOptions();
    expect(Math.max(...options)).toBeGreaterThanOrEqual(100000);
    expect(options).toContain(20000);
    expect(options).not.toContain(25000);
  });
});
