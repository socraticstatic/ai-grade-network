import type { FindingKind } from './advisorModel';

/**
 * The offer ladder each advisor finding hands off to — three real AT&T
 * tiers, good/better/best, each landing on an existing in-app flow. This
 * module states copy and destinations only; it derives no numbers of its
 * own (advisorModel already owns the evidence a finding states).
 *
 * `route` values are checked against the app's actual `<Routes>` tree
 * (src/App.tsx:305-492) by offerCatalog.test.ts — every route here must
 * already be a live destination, not an aspirational one.
 */
export interface OfferTier {
  key: string;
  name: string;
  tagline: string; // customer language
  framing: 'good' | 'better' | 'best';
  route: string; // in-app destination (existing flows only)
}

const LADDERS: Record<FindingKind, [OfferTier, OfferTier, OfferTier]> = {
  'untracked-ai': [
    {
      key: 'untracked-ai-assessment',
      name: '14-day assessment',
      tagline: 'See every AI workload the estate is running, tagged and governed, before the next one ships untracked.',
      framing: 'good',
      route: '/assessment',
    },
    {
      key: 'untracked-ai-govern',
      name: 'AI Fabric governance',
      tagline: 'Fence a policy boundary around every AI workload so nothing spends or ships without a tag.',
      framing: 'better',
      route: '/ai/govern',
    },
    {
      key: 'untracked-ai-transport',
      name: 'Private AI transport',
      tagline: 'Move AI traffic off the public path entirely on a private, AWS Interconnect-class attach built for it.',
      framing: 'best',
      route: '/naas/connect',
    },
  ],
  'unattached-regions': [
    {
      key: 'unattached-regions-steer',
      name: 'Steer on the AT&T fabric',
      tagline: 'Start steering eligible traffic onto the fabric today, no new attach required.',
      framing: 'good',
      route: '/naas/observe',
    },
    {
      key: 'unattached-regions-netbond',
      name: 'NetBond attach',
      tagline: 'Attach the unattached region to the fabric and stop paying the public transit rate on it.',
      framing: 'better',
      route: '/naas/connect',
    },
    {
      key: 'unattached-regions-netbond-adv',
      name: 'NetBond Adv',
      tagline: 'Dual-attach every region on the fabric with the redundancy the estate is missing today.',
      framing: 'best',
      route: '/naas/connect',
    },
  ],
  'egress-bleed': [
    {
      key: 'egress-bleed-steer',
      name: 'Steer on the AT&T fabric',
      tagline: 'Steer the flows bleeding public egress onto the AT&T fabric — no new attach required.',
      framing: 'good',
      route: '/naas/observe',
    },
    {
      key: 'egress-bleed-netbond',
      name: 'NetBond attach',
      tagline: 'Attach the region behind these flows so the steer has a private path to land on.',
      framing: 'better',
      route: '/naas/connect',
    },
    {
      key: 'egress-bleed-netbond-adv',
      name: 'NetBond Adv',
      tagline: 'Dual-attach for a private path that holds even when the primary link goes down.',
      framing: 'best',
      route: '/naas/connect',
    },
  ],
  'exposed-spof': [
    {
      key: 'exposed-spof-dynamic-defense',
      name: 'Dynamic Defense',
      tagline: 'Pull the internet-facing workload behind inspection before it shows up in an incident review.',
      framing: 'good',
      route: '/naas/govern',
    },
    {
      key: 'exposed-spof-sase',
      name: 'SASE',
      tagline: 'Enforce zero-trust policy at the edge for every exposed workload, not just the ones caught today.',
      framing: 'better',
      route: '/naas/govern',
    },
    {
      key: 'exposed-spof-dual-path',
      name: 'Dual-path attach',
      tagline: 'Give the single-path region a second path so losing one link no longer takes the region down.',
      framing: 'best',
      route: '/naas/connect',
    },
  ],
};

/** The three-tier offer ladder for a finding kind — always good/better/best,
 *  always three, always landing on a real, already-registered route. */
export function ladderFor(kind: FindingKind): [OfferTier, OfferTier, OfferTier] {
  return LADDERS[kind];
}
