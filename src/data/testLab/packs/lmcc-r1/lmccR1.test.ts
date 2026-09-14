import { describe, it, expect } from 'vitest';
import { lmccR1 } from './index';
import { validatePacks } from '../index';

describe('lmcc-r1 pack', () => {
  it('validates clean', () => {
    expect(validatePacks([lmccR1])).toEqual([]);
  });

  it('never leaks successCriteria into scenarios', () => {
    for (const t of lmccR1.tasks) {
      expect(t.scenario).not.toContain(t.successCriteria);
    }
  });

  it('tags the pre-GA feature version', () => {
    expect(lmccR1.featureVersion).toContain('pre-GA');
  });

  it('covers happy, permission-wall and bad-input paths', () => {
    const paths = new Set(lmccR1.tasks.map(t => t.path));
    expect(paths.has('happy')).toBe(true);
    expect(paths.has('permission-wall')).toBe(true);
    expect(paths.has('bad-input')).toBe(true);
  });

  it('order verifier is baseline-relative (seeded samples do not false-positive)', () => {
    const state = {
      connections: [
        { id: 'sample-1', configuration: { isLmcc: true } },
        { id: 'sample-2', configuration: { isLmcc: true } },
      ],
      testLabSeedMeta: { lmccBaselineIds: ['sample-1', 'sample-2'], lmccMarkCount: 2 },
    };
    expect(lmccR1.verifiers['lmcc-order-exists'](state)).toBe(false);
    expect(lmccR1.verifiers['lmcc-no-new-order'](state)).toBe(true);
    const afterOrder = {
      ...state,
      connections: [...state.connections, { id: 'conn-99', configuration: { isLmcc: true } }],
    };
    expect(lmccR1.verifiers['lmcc-order-exists'](afterOrder)).toBe(true);
    expect(lmccR1.verifiers['lmcc-no-new-order'](afterOrder)).toBe(false);
    expect(lmccR1.verifiers['lmcc-new-since-mark'](afterOrder)).toBe(true);
  });

  it('catch-up plant does not count as a participant order', () => {
    const state = {
      connections: [
        { id: 'testlab-lmcc-order', configuration: { isLmcc: true } },
      ],
      testLabSeedMeta: { lmccBaselineIds: [], lmccMarkCount: 0 },
    };
    expect(lmccR1.verifiers['lmcc-order-exists'](state)).toBe(false);
  });
});
