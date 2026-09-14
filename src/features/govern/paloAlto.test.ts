import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';

/**
 * The NGFW service-insertion item (fw-inspect-01) must name Palo Alto so the
 * inline-inspection chain reads as a real product, not a placeholder id.
 */
describe('Palo Alto NGFW naming', () => {
  it('names Palo Alto on the fw-inspect-01 service catalog entry', () => {
    const svc = (CC.serviceCatalog() as { id: string; label: string; desc: string }[]).find(
      s => s.id === 'fw-inspect-01'
    )!;
    expect(svc).toBeDefined();
    expect(svc.label).toMatch(/palo alto/i);
    expect(svc.label).toMatch(/ngfw/i);
    expect(svc.desc).toMatch(/palo alto/i);
  });
});
