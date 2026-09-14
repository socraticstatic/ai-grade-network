import type { VerifierFn } from '../../../../types/testLab';

const isLmcc = (c: any) => c?.configuration?.isLmcc === true;

export const verifiers: Record<string, VerifierFn> = {
  // A participant-created LMCC order exists (excludes baseline samples and the catch-up plant).
  'lmcc-order-exists': (state) => {
    const baseline: string[] = state.testLabSeedMeta?.lmccBaselineIds ?? [];
    return (state.connections ?? []).some(
      (c: any) => isLmcc(c) && !baseline.includes(c.id) && c.id !== 'testlab-lmcc-order',
    );
  },

  // A new LMCC order landed since this task started (mark set by the task's reseed).
  'lmcc-new-since-mark': (state) => {
    const mark = state.testLabSeedMeta?.lmccMarkCount;
    if (typeof mark !== 'number') return false;
    return (state.connections ?? []).filter(isLmcc).length > mark;
  },

  // Permission wall: nothing was created — LMCC count is at or below the seeded baseline.
  'lmcc-no-new-order': (state) => {
    const baseline: string[] = state.testLabSeedMeta?.lmccBaselineIds;
    if (!Array.isArray(baseline)) return true;
    return (state.connections ?? []).filter(isLmcc).length <= baseline.length;
  },
};
