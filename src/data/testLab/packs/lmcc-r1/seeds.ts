import type { SeedFn } from '../../../../types/testLab';

const isLmcc = (c: any) => c?.configuration?.isLmcc === true;

export const seeds: Record<string, SeedFn> = {
  // Baseline: record which LMCC connections already exist so verifiers are baseline-relative
  // (sample data ships with LMCC connections — absolute checks would false-positive).
  'lmcc-baseline': ({ set, get }) => {
    const lmccIds = (get().connections ?? []).filter(isLmcc).map((c: any) => c.id);
    set({
      activeTab: 'connections',
      testLabSeedMeta: { lmccBaselineIds: lmccIds, lmccMarkCount: lmccIds.length },
    });
  },

  // Mark the current LMCC count at task start — verifiers can then require "new since mark".
  'lmcc-mark-count': ({ set, get }) => {
    const count = (get().connections ?? []).filter(isLmcc).length;
    const meta = get().testLabSeedMeta ?? {};
    set({ testLabSeedMeta: { ...meta, lmccMarkCount: count } });
  },

  // Catch-up: plant the circuit the order task would have created, then re-mark
  // so the planted circuit does not count as participant-created.
  'lmcc-with-order': ({ set, get }) => {
    const connections = get().connections ?? [];
    if (!connections.some((c: any) => c.id === 'testlab-lmcc-order')) {
      set({
        connections: [{
          id: 'testlab-lmcc-order',
          name: 'AWS Max — San Jose last mile',
          provider: 'AWS',
          type: 'Internet to Cloud',
          status: 'Provisioning',
          bandwidth: '1 Gbps',
          location: 'metro-sj',
          configuration: { awsAccountId: '123456789012', lmccMetro: 'metro-sj', isLmcc: true },
        }, ...connections],
      });
    }
    const count = (get().connections ?? []).filter(isLmcc).length;
    const meta = get().testLabSeedMeta ?? {};
    set({ testLabSeedMeta: { ...meta, lmccMarkCount: count } });
  },
};
