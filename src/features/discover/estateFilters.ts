import type { FabricRegion } from '../../engine/types';
import type { Branch, SiteClass } from './discoveryModel';

/**
 * Estate filter state for Discover's tree and map. Four independent facets
 * that AND together: which cloud, which path (on the fabric or public
 * internet), which domain (network or AI/GPU), and which site class (data
 * center, office, branch, ATM). `'all'` on any facet drops it out of the
 * conjunction entirely, so `EMPTY_ESTATE_FILTERS` matches every region and
 * every branch — the default, unfiltered state.
 *
 * Cloud/path/domain describe the cloud estate (regions); they say nothing
 * about a customer premises, so `branchMatches` below leaves branches alone
 * under those three and narrows only on `siteClass` — the one facet a
 * branch actually carries.
 */
export interface EstateFilters {
  cloud: string | 'all';
  path: 'private' | 'public' | 'all';
  domain: 'network' | 'ai' | 'all';
  siteClass: SiteClass | 'all';
}

export const EMPTY_ESTATE_FILTERS: EstateFilters = { cloud: 'all', path: 'all', domain: 'all', siteClass: 'all' };

/** The AI/GPU clouds — the same special-case `providerName` (ai-fabric's
 *  insightsFigures.ts) uses to name CoreWeave and Nebius. Everything else on
 *  the estate is 'network'. */
const AI_CLOUD_IDS: ReadonlySet<string> = new Set(['cw', 'neb']);

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

/** Whether a branch belongs to the current filter scope. Cloud, path and
 *  domain describe the cloud estate and never exclude a branch — only
 *  `siteClass` narrows here. */
export function branchMatches(b: Branch, f: EstateFilters): boolean {
  return f.siteClass === 'all' || b.siteClass === f.siteClass;
}
