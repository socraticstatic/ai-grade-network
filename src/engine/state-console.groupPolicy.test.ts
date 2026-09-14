import { describe, it, expect } from 'vitest';
import { CC } from './index';

/* The stakeholder note: "the grouping here is going to be applicable to both
   the NaaS and the AI-fabric". The smallest honest form of that is a token
   policy whose scope is a GROUP name — the same west-workloads that Govern
   policy points at — resolving live through CC.resolveGroup, never stored.

   The engine is a shared singleton within this file: read-only assertions
   first, mutations last. */
describe('group-scoped token policies', () => {
  it('seeds one policy carrying a group id, and tokenPolicyList() passes it through', () => {
    const p = CC.tokenPolicyList().find((x: { tag: string }) => x.tag === 'west-workloads') as
      | { tag: string; group?: string; scope: string; budget: number; guardrail: boolean; enforced: boolean }
      | undefined;
    expect(p).toBeTruthy();
    expect(p!.group).toBe('west-workloads');
    expect(p!.scope).toBe('private-only');
    expect(p!.guardrail).toBe(true);
    expect(p!.enforced).toBe(false);
    expect(p!.budget).toBeGreaterThan(0);
  });

  it('stores only the group id — no resolution snapshot rides on the policy', () => {
    const p = CC.tokenPolicyList().find((x: { tag: string }) => x.tag === 'west-workloads') as Record<
      string,
      unknown
    >;
    // Resolution is derived at render via CC.resolveGroup, same contract as
    // every other surface. Nothing resolution-shaped may be stored here.
    expect(p.count).toBeUndefined();
    expect(p.vpcIds).toBeUndefined();
    expect(p.branchIds).toBeUndefined();
    expect(p.cidrs).toBeUndefined();
    // …and the live resolver answers for the same id.
    expect((CC.resolveGroup('west-workloads') as { count: number }).count).toBeGreaterThan(0);
  });

  it('does not change what the three tag-scoped seeds look like', () => {
    for (const tag of ['rd-helion', 'classified-helion', 'shared-services']) {
      const p = CC.tokenPolicyList().find((x: { tag: string }) => x.tag === tag) as {
        group?: string;
      };
      expect(p).toBeTruthy();
      expect(p.group).toBeUndefined();
    }
  });

  // Mutations from here down.
  it('setTokenPolicy on the group-scoped key works unchanged, and a patch does not clobber the group field', () => {
    CC.setTokenPolicy('west-workloads', { enforced: true });
    let p = CC.tokenPolicyList().find((x: { tag: string }) => x.tag === 'west-workloads') as {
      enforced: boolean;
      group?: string;
    };
    expect(p.enforced).toBe(true);
    expect(p.group).toBe('west-workloads');
    CC.setTokenPolicy('west-workloads', { enforced: false });
    p = CC.tokenPolicyList().find((x: { tag: string }) => x.tag === 'west-workloads') as {
      enforced: boolean;
    };
    expect(p.enforced).toBe(false);
  });

  it('a policy whose group was deleted still lists without crashing, and resolves to nothing', () => {
    CC.addGroup({
      id: 'tmp-token-grp',
      label: 'Temp token group',
      kind: 'workload',
      members: [],
      predicates: [{ source: 'cloudTag', key: 'Region', values: ['west'] }],
    });
    CC.setTokenPolicy('tmp-token-grp', { group: 'tmp-token-grp', scope: 'private-only', budget: 500000 });
    CC.removeGroup('tmp-token-grp');

    // The list still carries the policy — a dangling reference is visible,
    // not swallowed — and resolution degrades to empty rather than throwing.
    const list = CC.tokenPolicyList();
    const p = list.find((x: { tag: string }) => x.tag === 'tmp-token-grp') as { group?: string };
    expect(p).toBeTruthy();
    expect(p.group).toBe('tmp-token-grp');
    expect((CC.groupList() as { id: string }[]).some(g => g.id === 'tmp-token-grp')).toBe(false);
    expect((CC.resolveGroup('tmp-token-grp') as { count: number }).count).toBe(0);
  });
});
