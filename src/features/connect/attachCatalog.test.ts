import { describe, it, expect } from 'vitest';
import '../../engine';
import { ATTACH_TYPES, activeAttachTypeId } from './attachCatalog';

describe('attach-type catalog', () => {
  it('carries the five Phase-1 attach types with non-empty labels/descriptions', () => {
    const ids = ATTACH_TYPES.map(t => t.id);
    expect(ids).toEqual(['ip', 'ipsec', 'privatelink', 'cloud-native', 'dedicated']);
    ATTACH_TYPES.forEach(t => {
      expect(t.label.trim()).not.toBe('');
      expect(t.desc.trim().length).toBeGreaterThan(10);
      expect(['available', 'planned']).toContain(t.availability);
    });
  });

  it('maps hyperscaler circuits to `dedicated` and NetBond (MPLS/IP-VPN) to `ip`', () => {
    // NetBond is an AT&T routed IP hand-off, NOT a dedicated hyperscaler circuit.
    expect(activeAttachTypeId([{ type: 'NetBond', active: true }])).toBe('ip');
    expect(activeAttachTypeId([{ type: 'NetBond Adv', active: true }])).toBe('ip');
    expect(activeAttachTypeId([{ type: 'Direct Connect', active: true }])).toBe('dedicated');
    expect(activeAttachTypeId([{ type: 'ExpressRoute', active: true }])).toBe('dedicated');
    expect(activeAttachTypeId([{ type: 'Direct Connect', active: false }])).toBe('ip');
    expect(activeAttachTypeId([
      { type: 'NetBond', active: true }, { type: 'Direct Connect', active: true },
    ])).toBe('dedicated');
  });
});
