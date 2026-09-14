import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { commitMoves, moveLabel, stagedDeltas, type StagedMove } from './stackFigures';

/**
 * The widened move vocabulary: fix, enforce and policy moves stage, state
 * their consequence in their own words, commit through the real engine
 * actions, and reverse under Undo. Engine singleton; mutating tests last.
 */

(CC.agentList() as { id: string; enabled: boolean }[])
  .filter(a => a.enabled)
  .forEach(a => CC.toggleAgent(a.id));

describe('stagedDeltas over the new kinds', () => {
  it('a staged fix states the violations it clears, via the engine projection', () => {
    expect(CC.fixes.isolateFinance).toBe(false);
    const before = CC.violations().length;
    const d = stagedDeltas(CC, [{ kind: 'fix', fixKey: 'isolateFinance' }]);
    expect(d.violationsCleared).toBeGreaterThan(0);
    expect(d.violationsCleared).toBeLessThanOrEqual(before);
    // fixes never claim egress money they do not have
    expect(d.egressSavingMo).toBe(0);
  });

  it('a staged policy patch speaks policy vocabulary, never dollars', () => {
    const d = stagedDeltas(CC, [
      { kind: 'policy', tag: 'rd-helion', patch: { guardrail: true, enforced: true } },
    ]);
    expect(d.policyNotes).toHaveLength(1);
    expect(d.policyNotes[0]).toContain('rd-helion');
    expect(d.policyNotes[0]).toMatch(/guardrail on/);
    expect(d.policyNotes[0]).toMatch(/enforced/);
    expect(d.egressSavingMo).toBe(0);
  });

  it('moveLabel names every kind', () => {
    const moves: StagedMove[] = [
      { kind: 'fix', fixKey: 'fwInspection' },
      { kind: 'enforce', ruleId: 'pol-insp' },
      { kind: 'policy', tag: 'shared-services', patch: { budget: 2_000_000 } },
    ];
    const labels = moves.map(m => moveLabel(CC, m));
    expect(labels[0].label).toContain('fwInspection');
    expect(labels[1].detail).toMatch(/draft to enforced/);
    expect(labels[2].detail).toContain('2,000,000');
  });
});

describe('commitMoves applies the new kinds through real mutations', () => {
  it('fix and policy moves commit, move the engine, and Undo restores both', () => {
    const before = {
      fix: CC.fixes.isolateFinance,
      guardrail: (CC.tokenPolicy!('rd-helion') as { guardrail: boolean }).guardrail,
      violations: CC.violations().length,
    };
    expect(before.fix).toBe(false);

    /* One undo entry for the batch, like the twin's commit button: push
       once, then apply silently through the same helpers commitMoves uses.
       commitMoves itself does not push (applyFix pushes per fix), so the
       assertion drives the moves the way StackPanel does and unwinds the
       stack entries it created. */
    const failed = commitMoves(CC, [
      { kind: 'fix', fixKey: 'isolateFinance' },
      { kind: 'policy', tag: 'rd-helion', patch: { guardrail: true } },
    ]);
    expect(failed).toEqual([]);
    expect(CC.fixes.isolateFinance).toBe(true);
    expect((CC.tokenPolicy!('rd-helion') as { guardrail: boolean }).guardrail).toBe(true);
    expect(CC.violations().length).toBeLessThan(before.violations);

    // applyFix pushed one undo entry; setTokenPolicy rides the same snapshot
    // discipline now (state.ts tpol). Unwind until both facts are restored.
    let guard = 0;
    while (
      (CC.fixes.isolateFinance !== before.fix ||
        (CC.tokenPolicy!('rd-helion') as { guardrail: boolean }).guardrail !== before.guardrail) &&
      guard++ < 10
    ) {
      if (!CC.undo()) break;
    }
    expect(CC.fixes.isolateFinance).toBe(before.fix);
    expect((CC.tokenPolicy!('rd-helion') as { guardrail: boolean }).guardrail).toBe(before.guardrail);
    expect(CC.violations().length).toBe(before.violations);
  });
});
