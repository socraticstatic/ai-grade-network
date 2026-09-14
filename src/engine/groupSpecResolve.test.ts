import { describe, it, expect } from 'vitest';
import { CC } from './index';

/* A group being AUTHORED does not exist yet, so resolveGroup(id) cannot
   describe it — but the person authoring it needs to see what the draft
   resolves to before committing. resolveGroupSpec resolves an unsaved spec
   through exactly the same code path resolveGroup uses, so the preview a
   person reads and the membership they get after saving can never disagree. */
describe('resolveGroupSpec — resolving an unsaved draft', () => {
  it('resolves a cloudTag predicate scoped to sites, matching branches only', () => {
    const r = CC.resolveGroupSpec({
      kind: 'site',
      members: [],
      predicates: [{ source: 'cloudTag', key: 'Region', values: ['central'] }],
    });
    expect(r.branchIds.slice().sort()).toEqual(['br-chi', 'br-dal']);
    expect(r.vpcIds).toEqual([]);
    expect(r.count).toBe(2);
  });

  it('honours kind for literal members the same way resolveGroup does', () => {
    // br-sjc is a branch; a kind:'workload' group must drop it.
    const r = CC.resolveGroupSpec({ kind: 'workload', members: ['br-sjc', 'vpcwest'], predicates: [] });
    expect(r.branchIds).toEqual([]);
    expect(r.vpcIds).toEqual(['vpcwest']);
  });

  it('resolves a governanceTag predicate against VPC tags', () => {
    const r = CC.resolveGroupSpec({
      kind: 'workload',
      members: [],
      predicates: [{ source: 'governanceTag', values: ['pci'] }],
    });
    expect(r.vpcIds).toEqual(['vpcdata']);
  });

  /* The trap the Groups UI has to warn about: branches carry cloudTags but
     no `tags` array, so a governanceTag predicate on a site group is
     unsatisfiable by construction — not "empty today", empty always. */
  it('resolves a governanceTag predicate on a site group to nothing, always', () => {
    const r = CC.resolveGroupSpec({
      kind: 'site',
      members: [],
      predicates: [{ source: 'governanceTag', values: ['pci', 'shared-services', 'rd-helion'] }],
    });
    expect(r.count).toBe(0);
  });

  it('agrees exactly with resolveGroup for an already-stored group', () => {
    const stored = CC.groupList().find(g => g.id === 'west-workloads');
    const viaId = CC.resolveGroup('west-workloads');
    const viaSpec = CC.resolveGroupSpec(stored);
    expect(viaSpec.vpcIds.slice().sort()).toEqual(viaId.vpcIds.slice().sort());
    expect(viaSpec.count).toBe(viaId.count);
    expect(viaId.count).toBe(6);
  });

  it('returns an empty resolution for an empty or missing spec', () => {
    expect(CC.resolveGroupSpec(null).count).toBe(0);
    expect(CC.resolveGroupSpec({ kind: 'mixed', members: [], predicates: [] }).count).toBe(0);
  });
});
