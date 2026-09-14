import { describe, it, expect } from 'vitest';
import { CC } from './index';

describe('group resolution', () => {
  it('resolves literal members', () => {
    const r = CC.resolveGroup('west-branches');
    expect(r.branchIds).toEqual(expect.arrayContaining(['br-sjc', 'br-sfo', 'br-bkl']));
    expect(r.count).toBe(3);
  });

  // west-workloads is seeded as a Region:west predicate (not Project), so a
  // person watching "west-branches talk to west-workloads" only ever sees
  // VPCs that are actually west - not vpc-eu-01 or vnet-emea-01 riding along
  // because they happen to share a Project tag. Asserted by region id, not
  // by count: a count assertion would pass even if the wrong VPCs were in.
  it('resolves cloudTag predicates by region, matching only genuinely-west VPCs', () => {
    const r = CC.resolveGroup('west-workloads');
    expect(r.vpcIds.slice().sort()).toEqual(
      ['vnetapp', 'vnetdata', 'vpcbak', 'vpcgcp1', 'vpcgcp2', 'vpcwest'].sort()
    );
    // explicitly NOT west, despite sharing the old Project=xyz/abc tag
    expect(r.vpcIds).not.toContain('vpceu');    // Ireland (eu-west-1)
    expect(r.vpcIds).not.toContain('vnetemea'); // UK South
    expect(r.vpcIds).not.toContain('ocivcn');   // Ashburn
    expect(r.vpcIds).not.toContain('cwgpu');    // US-EAST-04A
    expect(r.vpcIds).not.toContain('nbgpu');    // Finland
    expect(r.vpcIds).not.toContain('vpcprod');  // N. Virginia
  });

  it('collects CIDRs for branch members', () => {
    const r = CC.resolveGroup('west-branches');
    expect(r.cidrs).toContain('10.60.0.0/20');
  });

  it('returns an empty resolution for an unknown group', () => {
    const r = CC.resolveGroup('nope');
    expect(r.count).toBe(0);
    expect(r.vpcIds).toEqual([]);
  });

  it('reports which groups an object belongs to', () => {
    expect(CC.groupsFor('br-sjc')).toContain('west-branches');
    expect(CC.groupsFor('vpcwest')).toContain('west-workloads');
  });

  // Address-plan safety net: branch CIDRs (10.60-10.63/20) and VPC CIDRs
  // (10.0-10.34/16) are disjoint today by construction, not by guard. A
  // future seed edit could collide them silently and make group CIDR
  // resolution ambiguous (same address claimed by a branch and a VPC).
  it('has no overlap between branch CIDRs and VPC CIDRs', () => {
    function range(cidr: string): [number, number] {
      const [ip, bitsStr] = cidr.split('/');
      const bits = Number(bitsStr);
      const parts = ip.split('.').map(Number);
      const asInt = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      const start = (asInt & mask) >>> 0;
      const end = (start | (~mask >>> 0)) >>> 0;
      return [start, end];
    }
    function overlaps(a: string, b: string): boolean {
      const [as, ae] = range(a);
      const [bs, be] = range(b);
      return as <= be && bs <= ae;
    }

    const branchCidrs = CC.branches.flatMap((b: any) => b.cidrs as string[]);
    const vpcCidrs = Object.values(CC.vpcs).flat().map((v: any) => v.cidr as string);

    const collisions: string[] = [];
    branchCidrs.forEach((bc) => {
      vpcCidrs.forEach((vc) => {
        if (overlaps(bc, vc)) collisions.push(`${bc} <-> ${vc}`);
      });
    });
    expect(collisions).toEqual([]);
  });

  // Mutations last — the engine is a shared singleton within this file.
  it('adds and removes a group', () => {
    const g = CC.addGroup({ id: 'tmp-grp', label: 'Temp', kind: 'workload', members: ['vpcbak'], predicates: [] });
    expect(g).toBeTruthy();
    expect(CC.resolveGroup('tmp-grp').vpcIds).toEqual(['vpcbak']);
    expect(CC.removeGroup('tmp-grp')).toBe(true);
    expect(CC.resolveGroup('tmp-grp').count).toBe(0);
  });

  it('updates a group with a new predicate and re-resolves', () => {
    CC.addGroup({ id: 'upd-grp', label: 'Upd', kind: 'workload', members: [], predicates: [] });
    expect(CC.resolveGroup('upd-grp').count).toBe(0);
    CC.updateGroup('upd-grp', {
      predicates: [{ source: 'cloudTag', key: 'Env', values: ['stage'] }],
    });
    const r = CC.resolveGroup('upd-grp');
    expect(r.vpcIds).toContain('vnetapp');   // Env=stage
    expect(r.vpcIds).not.toContain('vpcprod'); // Env=prod
    CC.removeGroup('upd-grp');
  });

  it('returns null when updating an unknown group', () => {
    expect(CC.updateGroup('does-not-exist', { members: [] })).toBe(null);
  });

  // I4 — the governanceTag branch of matchesPredicate. `tags` is the AT&T
  // governance taxonomy; `cloudTags` is the hyperscaler key/value map. The
  // two must never be conflated, so the governance axis needs its own proof.
  it('resolves governanceTag predicates against the AT&T taxonomy', () => {
    CC.addGroup({
      id: 'gov-grp', label: 'Gov', kind: 'workload', members: [],
      predicates: [{ source: 'governanceTag', values: ['rd-helion'] }],
    });
    const r = CC.resolveGroup('gov-grp');
    expect(r.vpcIds).toContain('vpcprod');
    expect(r.vpcIds).toContain('vnetapp');
    expect(r.vpcIds).toContain('cwgpu');
    expect(r.vpcIds).not.toContain('vpcbak'); // carries no `tags` key at all
    CC.removeGroup('gov-grp');
  });

  // I5 — branches carry cloudTags, so a predicate can select premises.
  // governanceTag predicates match no branch (branches have no `tags`), which
  // is expected: governance taxonomy is a cloud-workload concept.
  //
  // Uses Region:'central' rather than 'west': every VPC now carries a
  // Region cloudTag too (west-workloads' own seed depends on it), and
  // 'west' matches six of them - which would prove nothing about branches
  // being matched independently of VPCs. 'central' is only ever applied to
  // branches (br-dal, br-chi) in the seed, so it isolates the property this
  // test exists to demonstrate: a cloudTag predicate is one vocabulary
  // across both estates, and can match branches with zero VPCs involved.
  it('resolves cloudTag predicates against branches, not just VPCs', () => {
    CC.addGroup({
      id: 'central-pred', label: 'Central by predicate', kind: 'site', members: [],
      predicates: [{ source: 'cloudTag', key: 'Region', values: ['central'] }],
    });
    const r = CC.resolveGroup('central-pred');
    expect(r.branchIds.slice().sort()).toEqual(['br-chi', 'br-dal']);
    expect(r.vpcIds).toEqual([]);
    expect(r.count).toBe(2);
    CC.removeGroup('central-pred');
  });

  // Task C2 — `kind` is now load-bearing. west-workloads' Region:west
  // predicate matches BOTH estates by vocabulary, but west-workloads is
  // kind:'workload', so predicate matching is restricted to VPCs. Before the
  // fix this pulled in br-sjc/br-sfo/br-bkl (the three west branches) too -
  // "West workloads" resolving to three offices, one of which is literally a
  // member of a group called "workloads".
  it('west-workloads resolves to VPCs only - kind:workload excludes branches from predicate matching', () => {
    const r = CC.resolveGroup('west-workloads');
    expect(r.branchIds).toEqual([]);
    expect(r.vpcIds.slice().sort()).toEqual(
      ['vnetapp', 'vnetdata', 'vpcbak', 'vpcgcp1', 'vpcgcp2', 'vpcwest'].sort()
    );
    expect(r.count).toBe(r.vpcIds.length);
  });

  // west-branches is kind:'site' - its own predicates (there are none, but
  // the constraint applies regardless) would be restricted to branches only.
  it('west-branches resolves to branches only', () => {
    const r = CC.resolveGroup('west-branches');
    expect(r.vpcIds).toEqual([]);
    expect(r.branchIds.slice().sort()).toEqual(['br-bkl', 'br-sfo', 'br-sjc']);
  });

  // The headline policy ("allow west-branches to talk to west-workloads")
  // is only a real access-control statement if the two groups do not
  // overlap. Before the fix, west-branches was a strict subset of
  // west-workloads.
  it('west-workloads and west-branches share zero members', () => {
    const workloads = CC.resolveGroup('west-workloads');
    const branches = CC.resolveGroup('west-branches');
    const workloadIds = new Set([...workloads.vpcIds, ...workloads.branchIds]);
    const overlap = [...branches.vpcIds, ...branches.branchIds].filter(id => workloadIds.has(id));
    expect(overlap).toEqual([]);
  });

  // Design decision: `kind` also constrains literal `members`, not just
  // predicates - a kind:'workload' group cannot hold a branch no matter how
  // the id got into `members` (typed in, replayed off a share link, or
  // written by updateGroup). Enforcing this in resolveGroup rather than only
  // at addGroup() means updateGroup() can't reopen the same hole by patching
  // `members` after creation. The alternative (reject at addGroup, or let
  // literals override kind) would leave a `kind:'workload'` group able to
  // contain a branch again - exactly the defect this task fixes.
  it('drops a literal branch member from a kind:workload group at resolution', () => {
    CC.addGroup({
      id: 'kind-literal-workload', label: 'Kind literal workload', kind: 'workload',
      members: ['vpcbak', 'br-sjc'], predicates: [],
    });
    const r = CC.resolveGroup('kind-literal-workload');
    expect(r.vpcIds).toEqual(['vpcbak']);
    expect(r.branchIds).toEqual([]);
    expect(CC.groupsFor('br-sjc')).not.toContain('kind-literal-workload');
    CC.removeGroup('kind-literal-workload');
  });

  it('drops a literal VPC member from a kind:site group at resolution', () => {
    CC.addGroup({
      id: 'kind-literal-site', label: 'Kind literal site', kind: 'site',
      members: ['br-sjc', 'vpcbak'], predicates: [],
    });
    const r = CC.resolveGroup('kind-literal-site');
    expect(r.branchIds).toEqual(['br-sjc']);
    expect(r.vpcIds).toEqual([]);
    CC.removeGroup('kind-literal-site');
  });

  // kind:'mixed' is unchanged - literal members from either estate count.
  it('keeps both a literal VPC and a literal branch in a kind:mixed group', () => {
    CC.addGroup({
      id: 'kind-literal-mixed', label: 'Kind literal mixed', kind: 'mixed',
      members: ['br-sjc', 'vpcbak'], predicates: [],
    });
    const r = CC.resolveGroup('kind-literal-mixed');
    expect(r.branchIds).toEqual(['br-sjc']);
    expect(r.vpcIds).toEqual(['vpcbak']);
    CC.removeGroup('kind-literal-mixed');
  });

  // addGroup() must not hand back the permissive 'mixed' default when the
  // caller's own members already disclose a kind - otherwise every group
  // created without an explicit kind (UI, share link) gets predicate
  // matching against both estates, and this defect returns by the back
  // door. Inference is member-based only (predicates are ambiguous by
  // design - cloudTag is one vocabulary across both estates - so a
  // predicate-only group with no explicit kind still falls back to 'mixed',
  // which is the honest "caller declined to constrain this" case).
  it('infers kind:workload when every literal member is a VPC and kind is omitted', () => {
    const g = CC.addGroup({ id: 'infer-workload', label: 'Infer workload', members: ['vpcbak'], predicates: [] });
    expect(g.kind).toBe('workload');
    CC.removeGroup('infer-workload');
  });

  it('infers kind:site when every literal member is a branch and kind is omitted', () => {
    const g = CC.addGroup({ id: 'infer-site', label: 'Infer site', members: ['br-sjc'], predicates: [] });
    expect(g.kind).toBe('site');
    CC.removeGroup('infer-site');
  });

  it('infers kind:mixed when literal members span both estates and kind is omitted', () => {
    const g = CC.addGroup({ id: 'infer-mixed', label: 'Infer mixed', members: ['br-sjc', 'vpcbak'], predicates: [] });
    expect(g.kind).toBe('mixed');
    CC.removeGroup('infer-mixed');
  });

  it('falls back to kind:mixed when there are no literal members to infer from', () => {
    const g = CC.addGroup({
      id: 'infer-no-members', label: 'Infer no members', predicates: [{ source: 'cloudTag', key: 'Region', values: ['west'] }],
    });
    expect(g.kind).toBe('mixed');
    CC.removeGroup('infer-no-members');
  });

  // I3 — a literal member id that names nothing real must not inflate count.
  it('drops literal member ids that match no real branch or VPC', () => {
    CC.addGroup({
      id: 'phantom-grp', label: 'Phantom', kind: 'workload',
      members: ['vpcbak', 'typo-vpc'], predicates: [],
    });
    const r = CC.resolveGroup('phantom-grp');
    expect(r.vpcIds).toEqual(['vpcbak']);
    expect(r.count).toBe(1);
    expect(r.cidrs).toEqual(['10.9.0.0/16']);
    expect(CC.groupsFor('typo-vpc')).not.toContain('phantom-grp');
    CC.removeGroup('phantom-grp');
  });

  // M6 — vnetapp and vpcgcp2 genuinely share 10.4.0.0/16 in the seed.
  it('deduplicates CIDRs shared by two members', () => {
    CC.addGroup({
      id: 'dup-grp', label: 'Dup', kind: 'workload',
      members: ['vnetapp', 'vpcgcp2'], predicates: [],
    });
    const r = CC.resolveGroup('dup-grp');
    expect(r.count).toBe(2);
    expect(r.cidrs.filter((c: string) => c === '10.4.0.0/16')).toHaveLength(1);
    CC.removeGroup('dup-grp');
  });

  // M8 — mutators must not hand back live internal references.
  it('returns copies, so a caller cannot silently rewrite a group', () => {
    const g = CC.addGroup({
      id: 'copy-grp', label: 'Copy', kind: 'workload',
      members: ['vpcbak'], predicates: [],
    });
    g.members.push('vpcprod');
    g.label = 'hijacked';
    expect(CC.resolveGroup('copy-grp').vpcIds).toEqual(['vpcbak']);
    expect(CC.groupList().find((x: any) => x.id === 'copy-grp').label).toBe('Copy');

    const listed = CC.groupList().find((x: any) => x.id === 'copy-grp');
    listed.members.push('vpcprod');
    expect(CC.resolveGroup('copy-grp').vpcIds).toEqual(['vpcbak']);
    CC.removeGroup('copy-grp');
  });

  // C2 — undo has to actually undo. A restore that leaves the group in place
  // while writing 'Undid · …' into the audit trail is worse than no undo.
  it('undo actually removes a created group', () => {
    CC.addGroup({ id: 'undo-grp', label: 'Undo me', kind: 'workload', members: ['vpcbak'], predicates: [] });
    expect(CC.groupList().some((g: any) => g.id === 'undo-grp')).toBe(true);
    expect(CC.undo()).toBe(true);
    expect(CC.groupList().some((g: any) => g.id === 'undo-grp')).toBe(false);
    expect(CC.resolveGroup('undo-grp').count).toBe(0);
  });

  it('undo restores a removed group', () => {
    CC.addGroup({ id: 'undo-rm', label: 'Undo remove', kind: 'workload', members: ['vpcbak'], predicates: [] });
    expect(CC.removeGroup('undo-rm')).toBe(true);
    expect(CC.groupList().some((g: any) => g.id === 'undo-rm')).toBe(false);
    expect(CC.undo()).toBe(true);
    expect(CC.resolveGroup('undo-rm').vpcIds).toEqual(['vpcbak']);
    CC.removeGroup('undo-rm');
    CC.undo(); // pop the remove we just pushed
    CC.removeGroup('undo-rm');
    CC.undo();
    CC.undo(); // pop the original create — leaves the store as we found it
    expect(CC.groupList().some((g: any) => g.id === 'undo-rm')).toBe(false);
  });

  it('undo reverts a group update', () => {
    CC.addGroup({ id: 'undo-upd', label: 'Undo update', kind: 'workload', members: ['vpcbak'], predicates: [] });
    CC.updateGroup('undo-upd', { members: ['vpcprod'], label: 'Renamed' });
    expect(CC.resolveGroup('undo-upd').vpcIds).toEqual(['vpcprod']);
    expect(CC.undo()).toBe(true);
    expect(CC.resolveGroup('undo-upd').vpcIds).toEqual(['vpcbak']);
    expect(CC.groupList().find((g: any) => g.id === 'undo-upd').label).toBe('Undo update');
    CC.removeGroup('undo-upd');
  });

  // C1 — THE defining property: resolution is derived at call time, never
  // stored. rescanAccount('gcp') discovers vpc-ml-suite (Project=xyz), and
  // west-workloads must pick it up with no re-registration of anything.
  //
  // MUST STAY LAST IN THIS FILE: rescanAccount permanently mutates the shared
  // singleton for every test that follows it.
  it('resolves live — a VPC discovered after group creation joins the group', () => {
    const before = CC.resolveGroup('west-workloads');
    expect(before.vpcIds).not.toContain('vpcml');

    expect(CC.rescanAccount('gcp')).toBe('vpc-ml-suite');

    const after = CC.resolveGroup('west-workloads');
    expect(after.vpcIds).toContain('vpcml');
    expect(after.count).toBe(before.count + 1);
    expect(after.cidrs).toContain('10.19.0.0/16');
    expect(CC.groupsFor('vpcml')).toContain('west-workloads');
  });
});
