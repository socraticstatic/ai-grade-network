import { CC } from '../../engine';

/* Estate lookups for the Groups surface.
 *
 * Every one of these reads the LIVE engine on each call — never a table
 * copied into a component. A workload renamed or a VPC discovered by a
 * rescan is renamed and discovered here, on the next render, with no other
 * change. Same contract the engine's own resolver keeps: derived at call
 * time, never stored. */

export interface EstateVpc {
  id: string;
  name: string;
  tags?: string[];
  cloudTags?: Record<string, string>;
}

export interface EstateBranch {
  id: string;
  name: string;
  cloudTags?: Record<string, string>;
}

export function allVpcs(): EstateVpc[] {
  const byRegion = (CC.vpcs || {}) as unknown as Record<string, EstateVpc[]>;
  return Object.values(byRegion).flat();
}

export function allBranches(): EstateBranch[] {
  return ((CC.branches || []) as unknown as EstateBranch[]).slice();
}

/** The human name behind an estate id. An id that names nothing real is
 *  returned as-is rather than blanked — a dangling member should be visible,
 *  not silently swallowed. */
export function estateName(id: string): string {
  const branch = allBranches().find(b => b.id === id);
  if (branch) return branch.name;
  const vpc = allVpcs().find(v => v.id === id);
  if (vpc) return vpc.name;
  return id;
}

/** Cloud tag keys actually present in the estate — Region, Env, Owner,
 *  Project — rather than a hardcoded list that would go stale. */
export function cloudTagKeys(): string[] {
  const keys = new Set<string>();
  [...allVpcs(), ...allBranches()].forEach(o =>
    Object.keys(o.cloudTags || {}).forEach(k => keys.add(k)),
  );
  return [...keys].sort();
}

/** Values seen for one cloud tag key. Offered as suggestions, never as a
 *  closed set: the value field stays free text so a person can express a
 *  value the estate does not carry yet — and so a typo lands in the
 *  designed empty-resolution state instead of being silently impossible. */
export function cloudTagValues(key: string): string[] {
  if (!key) return [];
  const values = new Set<string>();
  [...allVpcs(), ...allBranches()].forEach(o => {
    const v = (o.cloudTags || {})[key];
    if (v) values.add(v);
  });
  return [...values].sort();
}

/** The AT&T governance taxonomy, read off the workloads that carry it.
 *  Branches never appear here — they carry no `tags` array at all, which is
 *  precisely the trap the builder has to warn about. */
export function governanceTagValues(): string[] {
  const values = new Set<string>();
  allVpcs().forEach(v => (v.tags || []).forEach(t => values.add(t)));
  return [...values].sort();
}
