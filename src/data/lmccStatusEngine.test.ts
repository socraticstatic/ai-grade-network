import { describe, it, expect } from 'vitest';
import { deriveCustomerState, STATUS_META, HEALTH_META, EngineInput } from './lmccStatusEngine';

const base: EngineInput = {
  provisioningStatus: 'live',
  pathsUp: 4,
  attConfirmed: true,
  awsConfirmed: true,
  keyCreatedAt: '2026-07-01T00:00:00Z',
  now: '2026-07-03T00:00:00Z',
};

describe('deriveCustomerState', () => {
  it('fresh key → Pending, no health', () => {
    expect(deriveCustomerState({ ...base, provisioningStatus: 'key-generated', attConfirmed: false, awsConfirmed: false, pathsUp: 0 }))
      .toEqual({ status: 'Pending', health: null });
  });

  it('key at exactly 7 days → Expired', () => {
    expect(deriveCustomerState({
      ...base, provisioningStatus: 'key-generated', attConfirmed: false, awsConfirmed: false, pathsUp: 0,
      keyCreatedAt: '2026-07-01T00:00:00Z', now: '2026-07-08T00:00:00Z',
    })).toEqual({ status: 'Expired', health: null });
  });

  it('3 of 4 paths ready but still negotiating → Provisioning, not Live', () => {
    expect(deriveCustomerState({ ...base, provisioningStatus: 'negotiating', pathsUp: 3, awsConfirmed: false }))
      .toEqual({ status: 'Provisioning', health: null });
  });

  it('live but one provider unconfirmed → still Provisioning', () => {
    expect(deriveCustomerState({ ...base, awsConfirmed: false }))
      .toEqual({ status: 'Provisioning', health: null });
  });

  it('both confirmed, 4 paths → Live / full', () => {
    expect(deriveCustomerState(base)).toEqual({ status: 'Live', health: 'full' });
  });

  it('one path drops → status STAYS Live, health reduced-healing', () => {
    expect(deriveCustomerState({ ...base, pathsUp: 3 })).toEqual({ status: 'Live', health: 'reduced-healing' });
  });

  it('two paths down → Live / degraded (traffic still flows)', () => {
    expect(deriveCustomerState({ ...base, pathsUp: 2 })).toEqual({ status: 'Live', health: 'degraded' });
    expect(deriveCustomerState({ ...base, pathsUp: 1 })).toEqual({ status: 'Live', health: 'degraded' });
  });

  it('all paths down → Needs attention, no health', () => {
    expect(deriveCustomerState({ ...base, pathsUp: 0 })).toEqual({ status: 'Needs attention', health: null });
  });

  it('failed → Needs attention', () => {
    expect(deriveCustomerState({ ...base, provisioningStatus: 'failed' })).toEqual({ status: 'Needs attention', health: null });
  });

  it('deleting / deleted pass through', () => {
    expect(deriveCustomerState({ ...base, provisioningStatus: 'deleting' }).status).toBe('Deleting');
    expect(deriveCustomerState({ ...base, provisioningStatus: 'deleted' }).status).toBe('Deleted');
  });
});

describe('meta', () => {
  it('every status has presentation meta; health blurbs avoid real-time promises', () => {
    for (const s of ['Pending', 'Provisioning', 'Live', 'Needs attention', 'Expired', 'Deleting', 'Deleted'] as const) {
      expect(STATUS_META[s].dotClass).toBeTruthy();
      expect(STATUS_META[s].blurb.length).toBeGreaterThan(10);
      expect(/real.?time|instantly|immediately/i.test(STATUS_META[s].blurb)).toBe(false);
    }
    for (const h of ['full', 'reduced-healing', 'degraded'] as const) {
      expect(HEALTH_META[h].label).toBeTruthy();
      expect(/real.?time|instantly|immediately/i.test(HEALTH_META[h].blurb)).toBe(false);
    }
  });
});
