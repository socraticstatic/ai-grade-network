import type { CloudControl } from '../../engine/types';

/** Pure logic for the Deploy Managed VPC wizard — eligibility, steps, CIDR
 *  shape and confirm copy, kept out of the component (wizardModel precedent). */

export const WIZ_STEPS = ['region', 'tier', 'cidr', 'confirm'] as const;
export type WizStep = (typeof WIZ_STEPS)[number];

export interface EligibleRegion { cloudId: string; cloudName: string; regionId: string; regionName: string }

export const MANAGED_CLOUDS = ['aws', 'azure'];

/** The binding vocabulary rule: Azure surfaces say VNET, everyone else VPC. */
export function managedNoun(cloudId: string): 'Managed VNET' | 'Managed VPC' {
  return cloudId === 'azure' ? 'Managed VNET' : 'Managed VPC';
}

export function eligibleRegions(cc: CloudControl): EligibleRegion[] {
  const out: EligibleRegion[] = [];
  for (const c of (cc.clouds as { id: string; name: string }[]).filter(c => MANAGED_CLOUDS.includes(c.id))) {
    for (const r of (cc.regions[c.id] || []) as { id: string; name: string }[]) {
      if (!cc.managedVpcFor(c.id, r.id)) out.push({ cloudId: c.id, cloudName: c.name, regionId: r.id, regionName: r.name });
    }
  }
  return out;
}

export const TIERS = [
  { id: '500M', label: '500 Mbps', blurb: 'Branch-scale workloads' },
  { id: '1G', label: '1 Gbps', blurb: 'The common enterprise tier' },
  { id: '5G', label: '5 Gbps', blurb: 'Data-heavy east-west traffic' },
] as const;

export function validCidr(raw: string): boolean {
  return /^10\.255\.\d{1,3}\.0\/24$/.test(raw.trim());
}

export function confirmCopy(cloudId: string, regionName: string, tier: string, onrampName: string): string {
  const az = cloudId === 'azure';
  const t = TIERS.find(x => x.id === tier)?.label ?? tier;
  return az
    ? `This deploys a Managed VNET in ${regionName}: vSRX HA pair (${t}), VNet peering + UDRs toward your workloads, private peering + route exchange (BGP) to AT&T over ${onrampName}.`
    : `This deploys a Managed VPC in ${regionName}: vSRX HA pair (${t}), TGW attachment toward your workloads, private VIF + route exchange (BGP) to AT&T over ${onrampName}.`;
}
