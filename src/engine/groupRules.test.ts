import { describe, it, expect } from 'vitest';
import { CC } from './index';

interface Flow { srcGroups?: string[]; dstGroups?: string[]; srcBranch?: string }

/* NOTE: tests in a file share one engine module (window.CC singleton).
   Every read-only assertion below runs BEFORE the one test that mutates the
   group store, so no test observes another's writes. */
describe('group-aware matching', () => {
  it('tags flows with the groups their source belongs to', () => {
    const flows = CC.flows() as Flow[];
    expect(flows.some(f => (f.srcGroups || []).includes('west-branches'))).toBe(true);
  });

  it('tags flows with the groups their destination belongs to', () => {
    const flows = CC.flows() as Flow[];
    expect(flows.some(f => (f.dstGroups || []).includes('west-workloads'))).toBe(true);
  });

  it('matches a group-to-group rule against a non-empty flow set', () => {
    const rule = { src: { group: 'west-branches' }, dst: { group: 'west-workloads' }, ports: 'any', action: 'allow', chain: [] };
    const result = CC.dryRun(rule);
    expect(result.matched.length).toBeGreaterThan(0);
  });

  it('does NOT silently match zero when dst is an object', () => {
    // Regression guard: `flow.dst !== rule.dst` is always true for an object
    // dst, which would make every group policy match nothing.
    const rule = { src: { group: 'west-branches' }, dst: { group: 'west-workloads' }, ports: 'any', action: 'allow', chain: [] };
    expect(CC.dryRun(rule).matched.length).not.toBe(0);
  });

  // intra-group / not-intra-group are meaningless without a source group.
  // They must match NOTHING rather than everything.
  it('matches nothing when intra-group is used without a source group', () => {
    const intra = { src: { tag: 'any' }, dst: 'intra-group', ports: 'any', action: 'allow', chain: [] };
    const notIntra = { src: { tag: 'any' }, dst: 'not-intra-group', ports: 'any', action: 'allow', chain: [] };
    expect(CC.dryRun(intra).matched.length).toBe(0);
    expect(CC.dryRun(notIntra).matched.length).toBe(0);
  });

  // Backward compatibility floor: the eight seeded rules target tags and
  // string destinations. Group awareness must not move a single one of them,
  // so the counts are pinned exactly, not merely asserted non-throwing.
  it('leaves the eight seeded tag rules matching exactly what they did', () => {
    const seeded = (CC.ruleList() as { id: string }[]).filter(r => r.id.startsWith('pol-'));
    expect(seeded.length).toBe(8);
    const counts: Record<string, number> = {};
    seeded.forEach(r => {
      expect(() => CC.dryRun(r)).not.toThrow();
      counts[r.id] = CC.dryRun(r).matched.length;
    });
    expect(counts).toEqual({
      'pol-fin': 1,
      'pol-insp': 8,
      'pol-seg': 8,
      'pol-dns': 2,
      'pol-perimeter': 1,
      'pol-pci': 0,
      'pol-internet-facing': 0,
      'pol-branch-finance': 0,
    });
  });

  // A missing dst must fail closed. The legacy destination branch guards
  // with `rule.dst && ...`, so a falsy dst skips the filter entirely and
  // would match every flow instead of none.
  it('fails closed when dst is missing rather than matching every flow', () => {
    const rule = { src: { tag: 'any' }, ports: 'any', action: 'allow', chain: [] };
    expect(CC.dryRun(rule).matched.length).toBe(0);
  });

  // An empty structured dst ({}) must also fail closed - no group key means
  // no filter was applied, which would otherwise match every flow.
  it('fails closed when dst is an empty object rather than matching every flow', () => {
    const rule = { src: { tag: 'any' }, dst: {}, ports: 'any', action: 'allow', chain: [] };
    expect(CC.dryRun(rule).matched.length).toBe(0);
  });

  /* MUTATING - keep last.

     `intra-group` means "the source group talking to itself". The two seeded
     groups cannot express that: only branch-originated flows carry a dstVpc
     (and therefore dstGroups), and no branch is a member of west-workloads,
     so west-branches -> west-workloads is the only group traffic that exists.
     A group that SPANS both sides is what makes same-group traffic possible,
     so the test authors one. */
  it('treats intra-group as same-group traffic across regions', () => {
    CC.addGroup({
      id: 'west-all', label: 'West everything', kind: 'mixed',
      members: ['br-sjc', 'br-sfo', 'br-bkl', 'vpcwest', 'vpceu', 'vpcgcp1'],
    });
    const rule = { src: { group: 'west-all' }, dst: 'intra-group', ports: 'any', action: 'allow', chain: [] };
    const matched = CC.dryRun(rule).matched as { flow: Flow }[];
    expect(matched.length).toBeGreaterThan(0);
    matched.forEach(m => expect(m.flow.dstGroups).toContain('west-all'));

    // and the complement excludes exactly those flows
    const inverse = CC.dryRun({ ...rule, dst: 'not-intra-group' }).matched as { flow: Flow }[];
    inverse.forEach(m => expect(m.flow.dstGroups).not.toContain('west-all'));
  });
});

/* Separate describe so it runs after the mutating test above without
   depending on its state: it authors its own group rule. */
describe('group rules are readable wherever they are summarised', () => {
  it('policies() renders a group rule without stringifying the objects', () => {
    CC.addRule({
      name: 'west-to-west',
      src: { group: 'west-branches' },
      dst: { group: 'west-workloads' },
      ports: 'any', action: 'allow', chain: [],
    });
    const p = (CC.policies() as { name: string; match: string }[]).find(x => x.name === 'west-to-west');
    expect(p).toBeTruthy();
    expect(p!.match).not.toContain('[object Object]');
    expect(p!.match).not.toContain('undefined');
    expect(p!.match).toContain('west-branches');
    expect(p!.match).toContain('west-workloads');
  });
});
