import type { CloudControl, ManagedVpc } from '../../engine/types';
import { buildMap } from './buildMap';
import {
  regionsOf, vpcsOf, regionLatencyMap, regionLatencyPathMap, branchesOf,
  type Cloud, type Region, type Vpc, type Branch, type SiteClass,
} from './discoveryModel';
import { branchMatches, EMPTY_ESTATE_FILTERS, type EstateFilters } from './estateFilters';

/**
 * Pure derivations for the Attachment Map — the chain from a workload through
 * its cloud gateways and AT&T circuit to the fabric, and the map-wide model
 * the layout consumes. Deterministic: VLANs come from seeded array indices,
 * ASNs are constants, latency is per-workload: private only when this
 * workload actually has a circuit onto a region whose path is private,
 * otherwise the honest public figure — both drawn from the engine's
 * `cc.regionLatency(regionId)` pair (`regionLatencyMap`/`regionLatencyPathMap`
 * as a fallback only for a region the engine doesn't carry).
 */

export const MAP_CLOUDS = ['aws', 'azure'] as const;

export const CUSTOMER_ASN = 65000;
/** Provider-side BGP ASN, per reality: Azure MSEE is fixed 12076; AWS 64512
 *  is the Amazon default for a private VIF on a DX gateway. */
export const PROVIDER_ASN: Record<string, number> = { aws: 64512, azure: 12076 };

export interface ChainHop { id: string; name: string; type: string }
export interface ChainCircuit {
  onrampId: string;
  name: string;
  type: string;
  site: string;
  bandwidth: string;
  vlan: number;
  bgp: { customerAsn: number; providerAsn: number };
}
export interface AttachmentChain {
  workload: {
    id: string; name: string; cidr: string; role: string;
    tags: string[]; vnet: boolean; ai: boolean;
    endpoints: { enis: number; serviceEndpoints: string[] };
  };
  gateways: ChainHop[];
  circuit: ChainCircuit | null;
  /** The ramp that WOULD serve this workload — the drawer's attach CTA target
   *  when `circuit` is null. */
  candidateOnrampId: string | null;
  path: { kind: 'private' | 'public'; latencyMs: number };
  internet: { egressNote: string } | null;
  /** The region's AT&T-managed gateway VPC/VNET — only once it has gone
   *  live; null while it doesn't exist or is still mid-deploy. */
  managedVpc: ManagedVpc | null;
}

interface RampLike {
  id: string; name: string; type: string; sub: string; active?: boolean;
  site: { name: string }; targets: [string, string][];
}

const rampsOf = (cc: CloudControl): RampLike[] =>
  ((cc as unknown as { onramps?: RampLike[] }).onramps ?? []);

/** On-ramps whose targets reach this cloud/region (the engine's rampsFor logic). */
export function servingRamps(cc: CloudControl, cloudId: string, regionId: string): RampLike[] {
  return rampsOf(cc).filter(o => o.targets.some(([c, r]) => c === cloudId && r === regionId));
}

/** The region's managed VPC/VNET record, but only once it has earned live —
 *  a chain or map cannot claim a hop that isn't actually up yet. */
function liveManagedVpc(cc: CloudControl, cloudId: string, regionId: string): ManagedVpc | null {
  const mv = (cc as unknown as { managedVpcFor?: (c: string, r: string) => ManagedVpc | null })
    .managedVpcFor?.(cloudId, regionId) ?? null;
  return mv && mv.stage === 'live' ? mv : null;
}

/** The ONE ramp that serves a region — active wins, else first on order. Every
 *  surface (chain, edge label, drawer) must resolve through this so they can
 *  never disagree. */
export function servingRamp(cc: CloudControl, cloudId: string, regionId: string): RampLike | null {
  const ramps = servingRamps(cc, cloudId, regionId);
  return ramps.find(r => r.active) ?? ramps[0] ?? null;
}

/** Bandwidth as the on-ramp seed states it — '—' when the seed makes no claim. */
export function bandwidthOf(sub: string): string {
  const m = sub.match(/(\d+\s*[GM]bps)/i);
  return m ? m[1].replace(/\s+/, '') : '—';
}

export function vlanFor(regionIndex: number, vpcIndex: number): number {
  return 100 + regionIndex * 10 + vpcIndex;
}

/** Short product label — mirrors FabricHero's onrampShort without a
 *  cross-feature import. */
export function rampShort(type: string): string {
  if (/direct connect/i.test(type)) return 'DX';
  if (/expressroute/i.test(type)) return 'ER';
  if (/interconnect/i.test(type)) return 'IX';
  if (/netbond/i.test(type)) return 'NetBond';
  return type;
}

export function attachmentChain(
  cc: CloudControl, cloudId: string, regionId: string, vpcId: string,
): AttachmentChain | null {
  const cloud = (cc.clouds as Cloud[]).find(c => c.id === cloudId);
  if (!cloud) return null;
  const regions = regionsOf(cc, cloudId);
  const regionIndex = regions.findIndex(r => r.id === regionId);
  if (regionIndex < 0) return null;
  const region: Region = regions[regionIndex];
  const list = vpcsOf(cc, regionId);
  const vpcIndex = list.findIndex(v => v.id === vpcId);
  if (vpcIndex < 0) return null;
  const vpc: Vpc = list[vpcIndex];

  const m = buildMap(vpc, cloud, region);
  const enis = m.subnets.reduce((n, s) => n + s.eni, 0);
  const serviceEndpoints = m.gateways.filter(g => g.ic === 's3').map(g => g.name);
  const gateways: ChainHop[] = m.gateways
    .filter(g => g.ic === 'dx' || g.ic === 'tgw')
    .map(g => ({ id: g.id, name: g.name, type: g.type }));

  const live = liveManagedVpc(cc, cloudId, regionId);
  if (live) {
    gateways.push({
      id: live.id, name: live.name,
      type: (cloudId === 'azure' ? 'AT&T managed VNET' : 'AT&T managed VPC') + ' · vSRX HA pair',
    });
  }

  const ramp = servingRamp(cc, cloudId, regionId);

  const circuit: ChainCircuit | null = vpc.attached && ramp
    ? {
        onrampId: ramp.id, name: ramp.name, type: ramp.type,
        site: ramp.site.name, bandwidth: bandwidthOf(ramp.sub),
        vlan: vlanFor(regionIndex, vpcIndex),
        bgp: { customerAsn: CUSTOMER_ASN, providerAsn: PROVIDER_ASN[cloudId] ?? CUSTOMER_ASN },
      }
    : null;

  const regionKind = regionLatencyPathMap(cc)[regionId] ?? 'public';
  const pair = cc.regionLatency(regionId);
  const kind: 'private' | 'public' = circuit && regionKind === 'private' ? 'private' : 'public';
  const latencyMs = pair ? (kind === 'private' ? pair.privateMs : pair.publicMs)
                         : (regionLatencyMap(cc)[regionId] ?? 0);

  return {
    workload: {
      id: vpc.id, name: vpc.name, cidr: vpc.cidr, role: vpc.role,
      tags: vpc.tags ?? [], vnet: !!vpc.vnet, ai: !!vpc.ai,
      endpoints: { enis, serviceEndpoints },
    },
    gateways,
    circuit,
    candidateOnrampId: ramp?.id ?? null,
    path: { kind, latencyMs },
    internet: vpc.attached
      ? null
      : { egressNote: 'Traffic leaves through the internet gateway — no AT&T-controlled path.' },
    managedVpc: live,
  };
}

/** Every attached AWS/Azure workload riding this circuit. */
export function workloadsOnRamp(
  cc: CloudControl, onrampId: string,
): { cloudId: string; regionId: string; vpc: Vpc }[] {
  const out: { cloudId: string; regionId: string; vpc: Vpc }[] = [];
  for (const cloudId of MAP_CLOUDS) {
    for (const r of regionsOf(cc, cloudId)) {
      const serving = servingRamp(cc, cloudId, r.id);
      if (serving?.id !== onrampId) continue;
      for (const v of vpcsOf(cc, r.id)) {
        if (v.attached) out.push({ cloudId, regionId: r.id, vpc: v });
      }
    }
  }
  return out;
}

export interface MapWorkload { cloudId: string; regionId: string; vpc: Vpc }
export interface AttachmentMapModel {
  /** `count` is present only on a clustered marker (AttachmentMap.tsx,
   *  past `ROLLUP_THRESHOLD`) — a stand-in "site" representing every branch
   *  of one class in one metro, never emitted by this pure builder. */
  sites: { id: string; name: string; city: string; onrampId?: string; siteClass: SiteClass; count?: number }[];
  onramps: { id: string; name: string; type: string; short: string; site: string; active: boolean }[];
  groups: {
    cloudId: string; cloudName: string; color: string;
    regions: { region: Region; regionIndex: number; workloads: MapWorkload[]; viaShort: string | null; managedVpc: boolean }[];
  }[];
}

/**
 * `filters` narrows `sites` by the siteClass facet — `branchMatches` (Task 5)
 * — the same predicate the tree's SitesPanel filters by, so the estate
 * filter chips scope the map the same way they scope the tree instead of
 * only ever touching the cloud side (`regionMatches`, used for the region
 * dimming below). Defaults to `EMPTY_ESTATE_FILTERS` so every existing
 * caller (and every existing test) that doesn't pass filters keeps seeing
 * every branch, unfiltered.
 */
export function buildAttachmentMapModel(cc: CloudControl, filters: EstateFilters = EMPTY_ESTATE_FILTERS): AttachmentMapModel {
  const branches = (branchesOf(cc) as Branch[]).filter(b => branchMatches(b, filters, cc));
  const clouds = (cc.clouds as Cloud[]).filter(c => (MAP_CLOUDS as readonly string[]).includes(c.id));
  return {
    sites: branches.map(b => ({ id: b.id, name: b.name, city: b.city, onrampId: b.onrampId, siteClass: b.siteClass })),
    onramps: rampsOf(cc).map(o => ({
      id: o.id, name: o.name, type: o.type, short: rampShort(o.type),
      site: o.site.name, active: !!o.active,
    })),
    groups: clouds.map(c => ({
      cloudId: c.id, cloudName: c.name, color: c.color,
      regions: regionsOf(cc, c.id).map((region, regionIndex) => {
        // Resolve the serving ramp for this region and compute its short label.
        // This ensures edge labels match attachmentChain's ramp choice consistently.
        const ramp = servingRamp(cc, c.id, region.id);
        return {
          region, regionIndex,
          workloads: vpcsOf(cc, region.id).map(vpc => ({ cloudId: c.id, regionId: region.id, vpc })),
          viaShort: ramp ? rampShort(ramp.type) : null,
          managedVpc: !!liveManagedVpc(cc, c.id, region.id),
        };
      }),
    })),
  };
}
