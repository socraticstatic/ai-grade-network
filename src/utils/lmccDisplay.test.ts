import { describe, it, expect } from 'vitest';
import { keyExpiryInfo, displayStatus } from './lmccDisplay';

describe('keyExpiryInfo', () => {
  it('shows days and hours remaining', () => {
    const r = keyExpiryInfo('2026-07-10T00:00:00Z', '2026-07-10T01:00:00Z');
    expect(r.expired).toBe(false);
    expect(r.label).toBe('Expires in 6d 23h');
  });

  it('shows hours and minutes when under a day', () => {
    const r = keyExpiryInfo('2026-07-10T00:00:00Z', '2026-07-16T20:48:00Z');
    expect(r.expired).toBe(false);
    expect(r.label).toBe('Expires in 3h 12m');
  });

  it('expired at exactly 7 days, with the date', () => {
    const r = keyExpiryInfo('2026-07-10T00:00:00Z', '2026-07-17T00:00:00Z');
    expect(r.expired).toBe(true);
    expect(r.label).toMatch(/^Expired Jul 17/);
  });
});

describe('displayStatus expiry derivation', () => {
  const lmccPending = (keyCreatedAt: string) => ({
    status: 'Pending',
    configuration: { isLmcc: true, lmccKeyCreatedAt: keyCreatedAt },
  });

  it('fresh pending LMCC stays Pending', () => {
    expect(displayStatus(lmccPending(new Date().toISOString()))).toBe('Pending');
  });

  it('stale pending LMCC reads Expired', () => {
    expect(displayStatus(lmccPending('2026-01-01T00:00:00Z'))).toBe('Expired');
  });

  it('non-LMCC pending is untouched', () => {
    expect(displayStatus({ status: 'Pending', configuration: {} })).toBe('Pending');
  });
});
