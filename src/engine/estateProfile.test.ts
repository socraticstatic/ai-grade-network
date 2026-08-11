import { afterEach, describe, expect, it } from 'vitest';
import { applyEstateProfile, resolveProfile, seedAcmeAdvisorDone } from './estateProfile';
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

  it('acme restore reverts a mutation made in place after the acme snapshot was taken', () => {
    // engine actions (e.g. activateOnramp, restore()) mutate seed elements
    // IN PLACE - simulate that here instead of going through activateOnramp,
    // to isolate the snapshot depth from any other engine behavior.
    const regions = CC.regions as { aws: { id: string; attached: boolean }[] };
    const usw2 = regions.aws.find(r => r.id === 'usw2')!;
    expect(usw2.attached).toBe(false); // original acme seed value

    usw2.attached = true;

    applyEstateProfile(CC as never, 'meridian');
    applyEstateProfile(CC as never, 'acme');

    const restored = (CC.regions as { aws: { id: string; attached: boolean }[] }).aws.find(r => r.id === 'usw2')!;
    expect(restored.attached).toBe(false); // reverted to the ORIGINAL value, not the mutation
  });

  /* Finding 3 — mergeRecord(cc.vpcs, next.vpcs) only ADDS/REPLACES the keys
   * `next` names; it never removes one. Merging regions, by contrast,
   * replaces the WHOLE aws/azure arrays, so acme's euw1/wus2/uks region
   * ids vanish from cc.regions the instant meridian applies. Without the
   * vpcs-key prune, cc.vpcs['euw1']/['wus2']/['uks'] survive as orphans:
   * ACME VPCs filed under region ids that exist under no cloud while
   * meridian is active. */
  it('meridian-active vpcs keys are a subset of live region ids (no orphaned acme vpc keys)', () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      const regions = CC.regions as Record<string, { id: string }[]>;
      const liveRegionIds = new Set(Object.values(regions).flatMap(rs => rs.map(r => r.id)));
      const vpcs = CC.vpcs as Record<string, unknown[]>;
      for (const key of Object.keys(vpcs)) {
        expect(liveRegionIds.has(key), `orphaned vpcs key '${key}' names no live region under meridian`).toBe(true);
      }
      // sanity: acme's dropped region ids are actually gone, not just untested
      expect(vpcs.euw1).toBeUndefined();
      expect(vpcs.wus2).toBeUndefined();
      expect(vpcs.uks).toBeUndefined();
      // and meridian's own region ids are present
      expect(vpcs.use1).toBeDefined();
      expect(vpcs.scus).toBeDefined();
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });

  it('acme restore after a meridian round trip has the exact original acme vpcs key set', () => {
    const before = Object.keys(CC.vpcs as Record<string, unknown[]>).sort();
    applyEstateProfile(CC as never, 'meridian');
    applyEstateProfile(CC as never, 'acme');
    const after = Object.keys(CC.vpcs as Record<string, unknown[]>).sort();
    expect(after).toEqual(before);
  });

  describe('seedAcmeAdvisorDone', () => {
    afterEach(() => {
      localStorage.removeItem('advisor:acme:done');
    });

    it('seeds advisor:acme:done for acme', () => {
      seedAcmeAdvisorDone('acme');
      expect(localStorage.getItem('advisor:acme:done')).toBe('1');
    });

    it('leaves the flag untouched for meridian - meridian first-runs the advisor', () => {
      seedAcmeAdvisorDone('meridian');
      expect(localStorage.getItem('advisor:acme:done')).toBeNull();
    });

    it('tolerates a localStorage that throws', () => {
      const realSet = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('quota exceeded');
      };
      try {
        expect(() => seedAcmeAdvisorDone('acme')).not.toThrow();
      } finally {
        localStorage.setItem = realSet;
      }
    });
  });
});
