import type { VerifierFn } from '../../../../types/testLab';
import { PLANT_LIVE_ID, PLANT_EXPIRED_ID } from './seeds';

const isLmcc = (c: any) => c?.configuration?.isLmcc === true;
const isPlant = (c: any) => c?.id === PLANT_LIVE_ID || c?.id === PLANT_EXPIRED_ID;

const parseMbps = (bandwidth?: string): number => {
  const m = String(bandwidth ?? '').match(/([\d.]+)\s*(G|M)bps/i);
  return m ? (m[2].toUpperCase() === 'G' ? parseFloat(m[1]) * 1000 : parseFloat(m[1])) : 0;
};

export const verifiers: Record<string, VerifierFn> = {
  // A participant-created LMCC connection exists beyond the seeded baseline and plants.
  'ga-order-exists': (state) => {
    const baseline: string[] = state.testLabSeedMeta?.gaBaselineIds ?? [];
    return (state.connections ?? []).some(
      (c: any) => isLmcc(c) && !baseline.includes(c.id) && !isPlant(c),
    );
  },

  // A new LMCC connection landed since this task started (mark set by the reseed).
  'ga-new-since-mark': (state) => {
    const mark = state.testLabSeedMeta?.gaMarkCount;
    if (typeof mark !== 'number') return false;
    return (state.connections ?? []).filter(isLmcc).length > mark;
  },

  // Some live LMCC circuit's bandwidth is now LOWER than when the task began —
  // the participant went through the downgrade (fee + acknowledgement) and confirmed.
  'ga-bandwidth-lowered': (state) => {
    const marks: Record<string, number> = state.testLabSeedMeta?.gaBandwidthMarks ?? {};
    return (state.connections ?? []).some((c: any) => {
      const was = marks[c.id];
      if (typeof was !== 'number' || was <= 0) return false;
      const now = parseMbps(c.bandwidth);
      return now > 0 && now < was;
    });
  },

  // A connection that was NOT Live at task start has reached Live — the wait resolved.
  'ga-went-live-since-mark': (state) => {
    const ids: string[] = state.testLabSeedMeta?.gaNonLiveIds ?? [];
    if (!ids.length) return false;
    const connections = state.connections ?? [];
    return ids.some((id) => connections.find((c: any) => c.id === id)?.status === 'Active');
  },

  // One of the circuits alive at task start is now tearing down or gone.
  'ga-deleted-since-mark': (state) => {
    const activeIds: string[] = state.testLabSeedMeta?.gaActiveIds ?? [];
    if (!activeIds.length) return false;
    const connections = state.connections ?? [];
    return activeIds.some((id) => {
      const c = connections.find((x: any) => x.id === id);
      return !c || c.status === 'Deleting' || c.status === 'Deleted';
    });
  },
};
