import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import {
  readEnforcement,
  enforceAndMeasure,
  splitDelta,
  heldSentence,
  type EnforcementDelta,
} from './enforcementDelta';

/** A delta built from two literal readings, for testing the split in
 *  isolation from the engine. */
function delta(
  before: Partial<EnforcementDelta['before']>,
  after: Partial<EnforcementDelta['after']>,
): EnforcementDelta {
  const base = { posture: 60, violations: 3, enforced: 2, total: 8 };
  return {
    ruleId: 'r1',
    ruleName: 'Rule one',
    before: { ...base, ...before },
    after: { ...base, ...after },
  };
}

describe('splitDelta · an unmoved figure is never a row', () => {
  it('reports only what moved', () => {
    const { moved, held } = splitDelta(
      delta({ violations: 3, posture: 60, enforced: 2 }, { violations: 1, posture: 64, enforced: 3 }),
    );
    expect(moved.map(r => r.key)).toEqual(['violations', 'posture', 'rules']);
    expect(held).toEqual([]);
  });

  it('drops posture to `held` when it did not move — the "60 → 60" bug', () => {
    const { moved, held } = splitDelta(
      delta({ violations: 3, posture: 60, enforced: 2 }, { violations: 1, posture: 60, enforced: 3 }),
    );
    expect(moved.map(r => r.key)).toEqual(['violations', 'rules']);
    expect(held).toEqual(['posture']);
    // No row may ever carry a zero change.
    expect(moved.every(r => r.change !== 0)).toBe(true);
  });

  it('drops BOTH when a rule clears nothing and lifts nothing', () => {
    const { moved, held } = splitDelta(
      delta({ violations: 0, posture: 72, enforced: 6 }, { violations: 0, posture: 72, enforced: 7 }),
    );
    // Rules enforced always moves, so the panel is never empty.
    expect(moved.map(r => r.key)).toEqual(['rules']);
    expect(held).toEqual(['violations', 'posture']);
  });

  it('names the good direction per figure: violations down, posture up', () => {
    const { moved } = splitDelta(
      delta({ violations: 3, posture: 60 }, { violations: 1, posture: 64, enforced: 3 }),
    );
    expect(moved.find(r => r.key === 'violations')!.good).toBe(true);
    expect(moved.find(r => r.key === 'posture')!.good).toBe(true);
  });

  it('does not call a regression good — and still does not call it a violation', () => {
    const { moved } = splitDelta(
      delta({ violations: 1, posture: 64 }, { violations: 3, posture: 60, enforced: 3 }),
    );
    expect(moved.find(r => r.key === 'violations')!.good).toBe(false);
    expect(moved.find(r => r.key === 'posture')!.good).toBe(false);
  });
});

describe('heldSentence', () => {
  it('states the value a held figure holds AT, not a zero delta', () => {
    const d = delta({ violations: 0, posture: 72, enforced: 6 }, { violations: 0, posture: 72, enforced: 7 });
    const { held } = splitDelta(d);
    expect(heldSentence(d, held)).toBe('Open violations hold at 0 · Security posture holds at 72');
    expect(heldSentence(d, held)).not.toMatch(/[+-]?0\s*$/);
  });

  it('conjugates a plural subject: violations HOLD, never "violations holds"', () => {
    const d = delta({ violations: 3 }, { violations: 3, enforced: 3 });
    expect(heldSentence(d, ['violations'])).toBe('Open violations hold at 3');
  });

  it('conjugates a singular subject: posture HOLDS', () => {
    const d = delta({ posture: 72 }, { posture: 72, enforced: 3 });
    expect(heldSentence(d, ['posture'])).toBe('Security posture holds at 72');
  });

  it('conjugates the rules figure as plural too, should it ever hold', () => {
    // splitDelta never puts `rules` in held today (enforcement always moves
    // it), but heldSentence is generic over keys and must stay grammatical.
    const d = delta({}, {});
    expect(heldSentence(d, ['rules'])).toBe('Rules enforced hold at 2');
  });

  it('is empty when nothing held', () => {
    expect(heldSentence(delta({}, {}), [])).toBe('');
  });
});

describe('enforceAndMeasure · brackets the real mutation', () => {
  it('returns null for an unknown rule and mutates nothing', () => {
    const before = readEnforcement(CC);
    expect(enforceAndMeasure(CC, 'no-such-rule')).toBeNull();
    expect(readEnforcement(CC)).toEqual(before);
  });

  it('reports the engine’s real before/after, and enforcing twice reports nothing', () => {
    const target = (CC.ruleList() as { id: string }[]).find(r => !CC.ruleEnforced(r))!;
    const before = readEnforcement(CC);

    const d = enforceAndMeasure(CC, target.id)!;
    expect(d).not.toBeNull();
    expect(d.before).toEqual(before);
    // The "after" is the live state every other surface now renders.
    expect(d.after).toEqual(readEnforcement(CC));
    expect(d.after.enforced).toBe(before.enforced + 1);

    // Already enforced: `enforceAny` returns false, so there is no second
    // consequence to report and the previous one must stand.
    expect(enforceAndMeasure(CC, target.id)).toBeNull();
  });
});
