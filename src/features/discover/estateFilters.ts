import type { CloudControl, FabricRegion } from '../../engine/types';
import type { Branch, SiteClass, Vpc } from './discoveryModel';

/**
 * Estate filter state for Discover's tree and map, Observe's site band, and
 * anything else that has to carve a bank-scale estate down before drawing
 * it. Independent facets that AND together; `'all'` drops a facet out of the
 * conjunction, so `EMPTY_ESTATE_FILTERS` matches everything.
 *
 * The brainstorm named the customer's own mental models: "carve the estate
 * down by region, site type, business unit, connection type, whatever the
 * customer's mental model is - BEFORE the flow diagram renders individual
 * entities." All four are here, plus the cloud/path/domain facets the cloud
 * estate needs.
 *
 * Each facet narrows only what it can honestly describe:
 *   - cloud / path / domain -> cloud regions (a premises has no cloud)
 *   - region / siteClass / connection -> customer premises
 *   - unit (business unit) -> workloads, which is where the tag lives
 */
export interface EstateFilters {
  cloud: string | 'all';
  path: 'private' | 'public' | 'all';
  domain: 'network' | 'ai' | 'all';
  siteClass: SiteClass | 'all';
  /** Geographic region a premises sits in: west / central / east. */
  region: string | 'all';
  /** Business unit, read off a workload's own Project tag. */
  unit: string | 'all';
  /** How a premises reaches AT&T: an on-ramp type, or 'off-net'. */
  connection: string | 'all';
}

export const EMPTY_ESTATE_FILTERS: EstateFilters = {
  cloud: 'all',
  path: 'all',
  domain: 'all',
  siteClass: 'all',
  region: 'all',
  unit: 'all',
  connection: 'all',
};

/** True when nothing is narrowed — used to skip filtering work entirely. */
export const isUnfiltered = (f: EstateFilters): boolean =>
  f.cloud === 'all' &&
  f.path === 'all' &&
  f.domain === 'all' &&
  f.siteClass === 'all' &&
  f.region === 'all' &&
  f.unit === 'all' &&
  f.connection === 'all';

/** The AI/GPU clouds — the same special-case `providerName` (ai-fabric's
 *  insightsFigures.ts) uses to name CoreWeave and Nebius. Everything else on
 *  the estate is 'network'. */
const AI_CLOUD_IDS: ReadonlySet<string> = new Set(['cw', 'neb']);

/** How a premises reaches AT&T, in the customer's words. A branch with no
 *  on-ramp is genuinely off-net — that is a filterable state, not missing
 *  data, and it is exactly the set a "who is not on us yet" question wants. */
export const OFF_NET = 'off-net';

export function connectionOf(cc: CloudControl, b: Branch): string {
  if (!b.onrampId) return OFF_NET;
  const onramp = ((cc.onramps ?? []) as { id: string; type?: string }[]).find(o => o.id === b.onrampId);
  return onramp?.type ?? OFF_NET;
}

/** Region a premises sits in, from the same cloudTags vocabulary workloads
 *  carry, so one word means one thing on both sides of the estate. */
export const regionOf = (b: Branch): string => b.cloudTags?.Region ?? 'unknown';

/** Business unit of a workload, from its Project tag. */
export const unitOf = (v: Vpc): string => (v as { cloudTags?: Record<string, string> }).cloudTags?.Project ?? 'untagged';

/** Whether a region belongs to the current filter scope. Cloud, path and
 *  domain narrow conjunctively — each active facet must agree, or the region
 *  is out. */
export function regionMatches(r: FabricRegion, f: EstateFilters): boolean {
  if (f.cloud !== 'all' && r.cloudId !== f.cloud) return false;
  if (f.path !== 'all' && r.path !== f.path) return false;
  if (f.domain !== 'all') {
    const isAi = AI_CLOUD_IDS.has(r.cloudId);
    if (f.domain === 'ai' && !isAi) return false;
    if (f.domain === 'network' && isAi) return false;
  }
  return true;
}

/**
 * Whether a premises belongs to the current filter scope.
 *
 * Cloud/path/domain/unit describe the cloud estate and never exclude a
 * branch — a premises is not IN a cloud, it reaches one, and it carries no
 * business-unit tag of its own. Site type, region and connection are the
 * three a branch can answer for, so those are the three that narrow here.
 *
 * `connection` needs the engine handle to resolve an on-ramp type, so it is
 * only applied by the `cc`-aware overload below; callers holding just a
 * branch get the two facets that live on the object itself.
 */
export function branchMatches(b: Branch, f: EstateFilters, cc?: CloudControl): boolean {
  if (f.siteClass !== 'all' && b.siteClass !== f.siteClass) return false;
  if (f.region !== 'all' && regionOf(b) !== f.region) return false;
  if (f.connection !== 'all') {
    if (!cc) return true; // cannot resolve without the handle; do not lie
    if (connectionOf(cc, b) !== f.connection) return false;
  }
  return true;
}

/** Whether a workload belongs to the current scope. Only the business-unit
 *  facet reads a VPC's own tag; the rest are region-level concerns already
 *  applied by `regionMatches` on the branch above it in the tree. */
export function vpcMatches(v: Vpc, f: EstateFilters): boolean {
  return f.unit === 'all' || unitOf(v) === f.unit;
}
