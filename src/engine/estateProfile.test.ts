import { describe, expect, it } from 'vitest';
import { applyEstateProfile, resolveProfile } from './estateProfile';
import { CC } from './index';

describe('estateProfile', () => {
  it('resolveProfile: URL wins, persists, defaults to acme', () => {
    const store: Record<string, string> = {};
    const ls = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
    expect(resolveProfile('?estate=meridian', ls as never)).toBe('meridian');
    expect(store.estateProfile).toBe('meridian');
    expect(resolveProfile('', ls as never)).toBe('meridian'); // sticky
    expect(resolveProfile('', { getItem: () => null, setItem: () => {} } as never)).toBe('acme');
  });

  it('applyEstateProfile swaps seeds in place, preserving array identity', () => {
    const before = CC.branches;
    applyEstateProfile(CC as never, 'meridian');
    expect(CC.branches).toBe(before);                 // same reference - closures still see it
    expect(CC.branches.length).toBeGreaterThan(4000);
    applyEstateProfile(CC as never, 'acme');
    expect(CC.branches.length).toBe(6);               // restorable for test isolation
  });

  it('meridian profile carries the mt-nb1 onramp; acme restore removes it', () => {
    const before = CC.onramps;
    expect(CC.onramps.some((o: { id: string }) => o.id === 'mt-nb1')).toBe(false);

    applyEstateProfile(CC as never, 'meridian');
    expect(CC.onramps).toBe(before); // same reference - closures still see it
    expect(CC.onramps.filter((o: { id: string }) => o.id === 'mt-nb1')).toHaveLength(1);
    // every meridian branch onrampId should resolve to a real onramp
    for (const b of CC.branches as { onrampId?: string }[]) {
      if (b.onrampId) {
        expect(CC.onramps.some((o: { id: string }) => o.id === b.onrampId)).toBe(true);
      }
    }

    applyEstateProfile(CC as never, 'acme');
    expect(CC.onramps).toBe(before);
    expect(CC.onramps.some((o: { id: string }) => o.id === 'mt-nb1')).toBe(false);
    expect(CC.onramps.length).toBe(4); // restored to the original acme seed count
  });
});
