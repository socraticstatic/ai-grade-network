import type { SeedFn } from '../../../../types/testLab';

const isLmcc = (c: any) => c?.configuration?.isLmcc === true;

const parseMbps = (bandwidth?: string): number => {
  const m = String(bandwidth ?? '').match(/([\d.]+)\s*(G|M)bps/i);
  return m ? (m[2].toUpperCase() === 'G' ? parseFloat(m[1]) * 1000 : parseFloat(m[1])) : 0;
};

/** Planted ids — verifiers exclude these from "participant created it" checks. */
export const PLANT_LIVE_ID = 'testlab-lmcc-ga-live';
export const PLANT_EXPIRED_ID = 'testlab-lmcc-ga-expired';

const plantLive = (over: Record<string, any> = {}) => ({
  id: PLANT_LIVE_ID,
  name: 'AWS Max — POS analytics (San Jose)',
  provider: 'AWS',
  type: 'AWS Last Mile',
  status: 'Active',
  bandwidth: '10 Gbps',
  location: 'San Jose - SJ',
  createdAt: new Date(Date.now() - 90 * 24 * 3600_000).toISOString(),
  configuration: {
    isLmcc: true,
    lmccMetro: 'metro-sj',
    lmccActivePaths: 4,
    lmccContractTerm: 'fixed-12',
    awsAccountId: '123456789012',
  },
  ...over,
});

/** Ensure the planted live circuit exists (idempotent); returns updated list. */
function ensureLive(get: () => Record<string, any>, set: (p: Record<string, any>) => void, activePaths: number) {
  const connections = get().connections ?? [];
  const existing = connections.find((c: any) => c.id === PLANT_LIVE_ID);
  if (existing) {
    set({
      connections: connections.map((c: any) =>
        c.id === PLANT_LIVE_ID
          ? { ...c, status: 'Active', configuration: { ...c.configuration, lmccActivePaths: activePaths } }
          : c,
      ),
    });
  } else {
    set({ connections: [plantLive({ configuration: { ...plantLive().configuration, lmccActivePaths: activePaths } }), ...connections] });
  }
}

export const seeds: Record<string, SeedFn> = {
  // Baseline: record pre-existing LMCC ids so verifiers are baseline-relative
  // (GA sample data ships with LMCC connections — absolute checks would false-positive).
  'ga-baseline': ({ set, get }) => {
    const lmccIds = (get().connections ?? []).filter(isLmcc).map((c: any) => c.id);
    set({
      activeTab: 'connections',
      testLabSeedMeta: { gaBaselineIds: lmccIds, gaMarkCount: lmccIds.length },
    });
  },

  // Mark the LMCC count at task start — verifiers require "new since mark".
  'ga-mark-count': ({ set, get }) => {
    const count = (get().connections ?? []).filter(isLmcc).length;
    const meta = get().testLabSeedMeta ?? {};
    set({ testLabSeedMeta: { ...meta, gaMarkCount: count } });
  },

  // A healthy live circuit to operate on, regardless of how earlier tasks went.
  'ga-with-live': ({ set, get }) => {
    ensureLive(get, set, 4);
  },

  // One of four paths down: status stays Live, health drops to reduced — the
  // comprehension moment the GA status model exists for.
  'ga-with-reduced': ({ set, get }) => {
    ensureLive(get, set, 3);
  },

  // Live circuit guaranteed + record every live LMCC bandwidth so the downgrade
  // verifier can require "someone's tier went DOWN since the task began".
  'ga-live-mark-bandwidth': ({ set, get }) => {
    ensureLive(get, set, 4);
    const marks: Record<string, number> = {};
    for (const c of (get().connections ?? [])) {
      if (isLmcc(c) && c.status === 'Active') marks[c.id] = parseMbps(c.bandwidth);
    }
    const meta = get().testLabSeedMeta ?? {};
    set({ testLabSeedMeta: { ...meta, gaBandwidthMarks: marks } });
  },

  // Live circuit guaranteed + record which LMCC connections were alive so the
  // delete verifier can require one of them to be gone or tearing down.
  'ga-live-mark-active': ({ set, get }) => {
    ensureLive(get, set, 4);
    const activeIds = (get().connections ?? [])
      .filter((c: any) => isLmcc(c) && c.status !== 'Deleted' && c.status !== 'Deleting')
      .map((c: any) => c.id);
    const meta = get().testLabSeedMeta ?? {};
    set({ testLabSeedMeta: { ...meta, gaActiveIds: activeIds } });
  },

  // Record which LMCC connections are NOT yet Live — the go-live verifier requires
  // one of exactly these to reach Active (the participant's own order, usually).
  'ga-mark-nonlive': ({ set, get }) => {
    const ids = (get().connections ?? [])
      .filter((c: any) => isLmcc(c) && c.status !== 'Active' && c.status !== 'Deleted' && c.status !== 'Deleting')
      .map((c: any) => c.id);
    const meta = get().testLabSeedMeta ?? {};
    set({ testLabSeedMeta: { ...meta, gaNonLiveIds: ids } });
  },

  // A key that was generated and never uploaded: stale Pending derives to Expired
  // on every surface — the billing question is what it cost (nothing).
  'ga-with-expired': ({ set, get }) => {
    const connections = get().connections ?? [];
    if (!connections.some((c: any) => c.id === PLANT_EXPIRED_ID)) {
      set({
        connections: [{
          id: PLANT_EXPIRED_ID,
          name: 'AWS Max — dev sandbox (never activated)',
          provider: 'AWS',
          type: 'AWS Last Mile',
          status: 'Pending',
          bandwidth: '1 Gbps',
          location: 'San Jose - SJ',
          createdAt: new Date(Date.now() - 8 * 24 * 3600_000).toISOString(),
          configuration: {
            isLmcc: true,
            lmccMetro: 'metro-sj',
            lmccContractTerm: 'monthly',
            lmccKeyCreatedAt: new Date(Date.now() - 8 * 24 * 3600_000).toISOString(),
          },
        }, ...connections],
      });
    }
  },
};
