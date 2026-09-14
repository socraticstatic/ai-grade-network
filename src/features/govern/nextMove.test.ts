import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { rankMoves, nextMove } from './nextMove';

/**
 * The Govern recommendation. These tests pin the RULE, not the answer:
 * every expectation below is computed from the engine at assert time, so
 * re-seeding the estate moves the expected winner instead of breaking the
 * suite for the wrong reason.
 *
 * NOTE: the engine is a shared singleton and `enforceAny` mutates. Ordering
 * matters inside this file — the read-only expectations run first.
 */
describe('govern next move ranking', () => {
  it('ranks every unenforced rule, including the three with no bound remediation', () => {
    const ranked = rankMoves(CC);
    const unenforced = (CC.ruleList() as { id: string }[]).filter(
      r => !CC.ruleEnforced(r as never),
    );
    expect(ranked).toHaveLength(unenforced.length);
    expect(ranked.map(m => m.ruleId)).toEqual(
      expect.arrayContaining(['pol-pci', 'pol-internet-facing', 'pol-branch-finance']),
    );
  });

  it('states violations cleared for a previewable rule as the engine reports it', () => {
    const ranked = rankMoves(CC);
    const insp = ranked.find(m => m.ruleId === 'pol-insp');
    expect(insp).toBeTruthy();

    const now = CC.violations().length;
    const preview = CC.previewFix('fwInspection') as { violations: number; posture: number };
    expect(insp!.cleared).toBe(now - preview.violations);
    expect(insp!.postureDelta).toBe(preview.posture - CC.posture());
    expect(insp!.projected).toBe(true);
  });

  it('gives an unprojectable rule its own open violations as its cleared count', () => {
    const ranked = rankMoves(CC);
    const pci = ranked.find(m => m.ruleId === 'pol-pci')!;
    const own = (CC.violations() as { policy?: string }[]).filter(v => v.policy === 'pol-pci');
    expect(pci.projected).toBe(false);
    expect(pci.postureDelta).toBeNull();
    expect(pci.cleared).toBe(own.length);
    expect(pci.cleared).toBeGreaterThan(0);
  });

  it('does not bury the unprojectable rules — they outrank previewable rules that clear less', () => {
    const ranked = rankMoves(CC);
    const at = (id: string) => ranked.findIndex(m => m.ruleId === id);
    // pol-dns and pol-perimeter are previewable but clear zero violations.
    expect(ranked.find(m => m.ruleId === 'pol-dns')!.cleared).toBe(0);
    expect(at('pol-pci')).toBeLessThan(at('pol-dns'));
    expect(at('pol-internet-facing')).toBeLessThan(at('pol-perimeter'));
  });

  it('sorts by violations cleared first', () => {
    const ranked = rankMoves(CC);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].cleared).toBeGreaterThanOrEqual(ranked[i].cleared);
    }
  });

  it('picks the rule that clears the most violations as the next move', () => {
    const move = nextMove(CC)!;
    const best = Math.max(...rankMoves(CC).map(m => m.cleared));
    expect(move.cleared).toBe(best);
    expect(move.ruleId).toBe('pol-insp');
  });

  it('moves on once the recommended rule is enforced', () => {
    const before = nextMove(CC)!;
    CC.enforceAny(before.ruleId);
    const after = nextMove(CC)!;
    expect(after.ruleId).not.toBe(before.ruleId);
    expect(CC.ruleEnforced((CC.ruleList() as { id: string }[]).find(r => r.id === before.ruleId) as never)).toBe(true);
  });

  it('returns null when every rule is enforced', () => {
    (CC.ruleList() as { id: string }[]).forEach(r => CC.enforceAny(r.id));
    expect(rankMoves(CC)).toHaveLength(0);
    expect(nextMove(CC)).toBeNull();
  });
});
