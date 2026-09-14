import { describe, test, expect, afterEach } from 'vitest';
import { moveLabel, stagedDeltas, commitMoves, type StagedMove } from './stackFigures';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

const spec = {
  name: 'Block classified DNS tunnelling (tightened)',
  src: { tag: 'classified-helion', cloud: 'any' },
  dst: 'dns-exfil',
  ports: 'any',
  action: 'deny',
  chain: [] as string[],
};
const move: StagedMove = { kind: 'rule', spec };

describe('the rule staged move', () => {
  test('labels itself with the rule name and dryRun figures, never invented ones', () => {
    const { label, detail } = moveLabel(CC, move);
    const dry = CC.dryRun(spec) as { matched: unknown[]; gbps: number };
    expect(label).toContain(spec.name);
    expect(detail).toContain(String(dry.matched.length));
  });

  test('states itself as a policy note, never as a dollar figure', () => {
    const d = stagedDeltas(CC, [move]);
    expect(d.moves).toBe(1);
    expect(d.egressSavingMo).toBe(0);
    expect(d.policyNotes.join(' ')).toContain(spec.name);
  });

  test('commits by authoring the rule, unenforced', () => {
    const before = CC.ruleList().length;
    const failed = commitMoves(CC, [move]);
    expect(failed).toEqual([]);
    const rules = CC.ruleList();
    expect(rules.length).toBe(before + 1);
    const authored = rules.find((r: { name: string }) => r.name === spec.name)!;
    expect(authored).toBeDefined();
    expect(CC.ruleEnforced(authored)).toBe(false);
  });

  test('reports a failed author rather than swallowing it', () => {
    // addRule returns null for a destination naming no live group.
    const bad: StagedMove = { kind: 'rule', spec: { ...spec, dst: { group: 'no-such-group' } } };
    const failed = commitMoves(CC, [bad]);
    expect(failed).toEqual([bad]);
  });
});

describe('the enforce staged move', () => {
  test('labels itself with the rule\'s name, not its id', () => {
    const rule = (CC.ruleList() as { id: string; name: string }[]).find(r => r.id === 'pol-perimeter')!;
    const enforceMove: StagedMove = { kind: 'enforce', ruleId: 'pol-perimeter' };
    const { label } = moveLabel(CC, enforceMove);
    expect(label).toContain(rule.name);
    expect(label).not.toContain('pol-perimeter');
  });

  test('falls back to the rule id, without throwing, when the estate no longer carries that rule', () => {
    const enforceMove: StagedMove = { kind: 'enforce', ruleId: 'no-such-rule' };
    expect(() => moveLabel(CC, enforceMove)).not.toThrow();
    const { label } = moveLabel(CC, enforceMove);
    expect(label).toContain('no-such-rule');
  });
});
