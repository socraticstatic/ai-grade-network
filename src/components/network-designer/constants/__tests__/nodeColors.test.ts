import { describe, it, expect } from 'vitest';
import { getNodeColors, STATUS_DOT_COLORS } from '../nodeColors';

describe('getNodeColors', () => {
  it('returns pink/magenta for hub', () => {
    const colors = getNodeColors('function', 'router');
    expect(colors.border).toBe('#d946ef');
    expect(colors.bg).toBe('var(--nd-bg-fuchsia, #fdf4ff)');
  });

  it('returns purple for AT&T Core (ipe)', () => {
    const colors = getNodeColors('network', 'ipe');
    expect(colors.border).toBe('#7c3aed');
  });

  it('returns blue for cloud destinations', () => {
    const colors = getNodeColors('destination', 'aws');
    expect(colors.border).toBe('#3b82f6');
    expect(colors.bg).toBe('var(--nd-bg-blue, #eff6ff)');
  });

  it('returns gray for datacenter', () => {
    const colors = getNodeColors('datacenter', 'equinix');
    expect(colors.border).toBe('#6b7280');
  });

  it('returns amber for firewall', () => {
    const colors = getNodeColors('function', 'firewall');
    expect(colors.border).toBe('#f59e0b');
  });

  it('returns amber for VNF', () => {
    const colors = getNodeColors('function', 'vnf');
    expect(colors.border).toBe('#f59e0b');
  });

  it('returns defaults for unknown type', () => {
    const colors = getNodeColors('unknown', 'whatever');
    expect(colors.border).toBe('#9ca3af');
    expect(colors.bg).toBe('var(--nd-bg-default, #ffffff)');
  });

  it('returns defaults for unknown function type', () => {
    const colors = getNodeColors('function', 'unknown-fn');
    expect(colors.border).toBe('#9ca3af');
  });
});

describe('STATUS_DOT_COLORS', () => {
  it('maps unconfigured to gray', () => {
    expect(STATUS_DOT_COLORS['unconfigured']).toBe('var(--nd-dot-unconfigured, #d1d5db)');
  });

  it('maps configured-inactive to darker gray', () => {
    expect(STATUS_DOT_COLORS['configured-inactive']).toBe('var(--nd-dot-inactive, #9ca3af)');
  });

  it('maps active to green', () => {
    expect(STATUS_DOT_COLORS['active']).toBe('#22c55e');
  });

  it('maps active-down to red', () => {
    expect(STATUS_DOT_COLORS['active-down']).toBe('#ef4444');
  });
});
