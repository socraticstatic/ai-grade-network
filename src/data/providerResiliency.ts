/**
 * AI-grade network Resiliency Tiers
 *
 * Three tiers (High removed per product requirements):
 *
 * 1. STANDARD - Local redundancy at 1 site
 *    Single site, redundant routers/links within that site.
 *    Protects against device/link failure. No site/metro protection.
 *
 * 2. MAXIMUM - Mid-tier redundancy (varies by provider)
 *    Protects against device, link, and single-site failures.
 *    AWS: LMCC auto-provisions 4 connections across 2 sites in 1 metro
 *    Azure: "High Resiliency" - 2 peering locations in same metro
 *    Google: "99.9% Production" - 2 sites, different edge availability domains
 *    Oracle: "Redundant" - 2 circuits on different devices at same location
 *
 * 3. GEODIVERSITY - 4 links across 2 sites in 2 metros
 *    Two different metros, each with local redundancy.
 *    Protects against device, site, and metro-wide failures.
 *    Highest resilience option.
 */

export interface ResiliencyTierConfig {
  providerName: string;
  sla: string;
  architecture: string;
  minConnections: number;
  minLocations: number;
  minMetros: number;
  locationConstraint: string;
  locationBehavior: 'single-site' | 'single-metro-auto' | 'single-metro-manual' | 'dual-metro';
  details: string[];
  uiLabel: string;
}

export type Tier = 'standard' | 'maximum' | 'geodiversity';

const AWS_TIERS: Record<Tier, ResiliencyTierConfig> = {
  standard: {
    providerName: 'Dev/Test',
    sla: 'No SLA',
    architecture: 'Connectivity from one AWS Interconnect – last mile location with redundant routers/links within the site. Protects against device failure only.',
    minConnections: 1,
    minLocations: 1,
    minMetros: 1,
    locationConstraint: '1 AWS Interconnect – last mile location, device redundancy',
    locationBehavior: 'single-site',
    uiLabel: 'Single-site, locally redundant',
    details: [
      'Redundant connections on separate devices',
      'Single AWS Interconnect – last mile location',
      'Device and link failure protection',
      'No protection against site or metro outages',
    ],
  },
  maximum: {
    providerName: 'Maximum Resiliency (AWS Max)',
    sla: '99.99%',
    architecture: 'AT&T auto-provisions 4 hosted connections across 4 IPEs (Juniper MX-304) in 2 diverse sites within your selected metro. Customer selects one metro.',
    minConnections: 4,
    minLocations: 2,
    minMetros: 1,
    locationConstraint: '2 sites in 1 metro, 2 links per site',
    locationBehavior: 'single-metro-auto',
    uiLabel: 'Maximum resilience within one metro',
    details: [
      '4 links: 2 sites x 2 links per site',
      'AT&T automates provisioning end-to-end',
      'Customer selects metro only',
      'Requires Enterprise Support + Well-Architected Review for SLA',
    ],
  },
  geodiversity: {
    providerName: 'Geo-Diverse Resiliency',
    sla: '99.99%',
    architecture: '4 hosted connections across 2 sites in 2 geographically independent metros. Each metro has local redundancy. Highest protection level.',
    minConnections: 4,
    minLocations: 2,
    minMetros: 2,
    locationConstraint: '2 metros, each with 2 links at 1 site',
    locationBehavior: 'dual-metro',
    uiLabel: 'Geo-diverse, metro-independent redundancy',
    details: [
      '4 links across 2 independent metros',
      'Each metro has local redundancy',
      'Protects against metro-wide outages',
      'Required for business-critical and regulated workloads',
    ],
  },
};

const AZURE_TIERS: Record<Tier, ResiliencyTierConfig> = {
  standard: {
    providerName: 'Single Circuit',
    sla: '99.95%',
    architecture: 'One ExpressRoute circuit with built-in primary and secondary connections (active-active to 2 MSEEs) at one peering location.',
    minConnections: 1,
    minLocations: 1,
    minMetros: 1,
    locationConstraint: '1 peering location',
    locationBehavior: 'single-site',
    uiLabel: 'Single-site, locally redundant',
    details: [
      '1 circuit with primary + secondary (built-in)',
      'Active-active to 2 Microsoft Edge routers',
      'Single peering location',
      'No protection against site failure',
    ],
  },
  maximum: {
    providerName: 'High Resiliency',
    sla: '99.95%',
    architecture: '1 ExpressRoute circuit across 2 peering locations in the same metro for site-level redundancy.',
    minConnections: 1,
    minLocations: 2,
    minMetros: 1,
    locationConstraint: '2 peering locations in the same metro',
    locationBehavior: 'single-metro-manual',
    uiLabel: 'Dual-site within a metro',
    details: [
      '1 circuit across 2 peering locations in same metro',
      'Built-in primary + secondary paths',
      'Protects against single-site failure',
      'Zone-redundant hubs recommended',
    ],
  },
  geodiversity: {
    providerName: 'Maximum Resiliency',
    sla: '99.99%',
    architecture: '2 ExpressRoute circuits in 2 different metros with zone-redundant hubs. Premium SKU needed if crossing geopolitical regions.',
    minConnections: 4,
    minLocations: 2,
    minMetros: 2,
    locationConstraint: '2 peering locations in different metros',
    locationBehavior: 'dual-metro',
    uiLabel: 'Geo-diverse, metro-independent redundancy',
    details: [
      '2 circuits across 2 different metros',
      'Each metro has local redundancy',
      'Premium SKU if crossing geopolitical boundary',
      'Zone-redundant hubs recommended',
    ],
  },
};

const GOOGLE_TIERS: Record<Tier, ResiliencyTierConfig> = {
  standard: {
    providerName: 'No SLA',
    sla: 'None',
    architecture: 'Single VLAN attachment at one interconnect location. No uptime SLA from Google.',
    minConnections: 1,
    minLocations: 1,
    minMetros: 1,
    locationConstraint: '1 interconnect location',
    locationBehavior: 'single-site',
    uiLabel: 'Single-site, locally redundant',
    details: [
      '1 VLAN attachment',
      'No uptime SLA',
      'Development and testing only',
    ],
  },
  maximum: {
    providerName: '99.9% Production',
    sla: '99.9%',
    architecture: '4 VLAN attachments at two sites in the same metro, in different edge availability domains.',
    minConnections: 4,
    minLocations: 2,
    minMetros: 1,
    locationConstraint: '2 sites in same metro, different edge availability domains',
    locationBehavior: 'single-metro-manual',
    uiLabel: 'Maximum resilience within one metro',
    details: [
      '4 links: 2 sites x 2 links per site',
      'MUST be in different edge availability domains',
      '99.9% uptime SLA',
    ],
  },
  geodiversity: {
    providerName: '99.99% Critical Production',
    sla: '99.99%',
    architecture: 'VLAN attachments across two different metros, each pair in different edge availability domains.',
    minConnections: 4,
    minLocations: 2,
    minMetros: 2,
    locationConstraint: '2 different metros, each with edge availability domain diversity',
    locationBehavior: 'dual-metro',
    uiLabel: 'Geo-diverse, metro-independent redundancy',
    details: [
      '4 attachments across 2 metros',
      'Edge availability domain diversity per metro',
      '99.99% uptime SLA',
      'Required for critical production workloads',
    ],
  },
};

const ORACLE_TIERS: Record<Tier, ResiliencyTierConfig> = {
  standard: {
    providerName: 'Single Circuit',
    sla: 'None',
    architecture: 'One virtual circuit at one FastConnect location. No SLA guaranteed.',
    minConnections: 1,
    minLocations: 1,
    minMetros: 1,
    locationConstraint: '1 FastConnect location',
    locationBehavior: 'single-site',
    uiLabel: 'Single-site, locally redundant',
    details: [
      '1 virtual circuit',
      'No SLA guaranteed',
      'Single point of failure',
    ],
  },
  maximum: {
    providerName: 'Redundant',
    sla: '99.9%',
    architecture: '2 virtual circuits on different physical devices at the same FastConnect location.',
    minConnections: 2,
    minLocations: 1,
    minMetros: 1,
    locationConstraint: '1 FastConnect location, 2 circuits on different devices',
    locationBehavior: 'single-site',
    uiLabel: 'Device-redundant at one location',
    details: [
      '2 virtual circuits on different physical devices',
      'Same FastConnect location',
      'Redundant BGP peers required for SLA',
      'Device failure protection',
      '99.9% SLA guaranteed',
    ],
  },
  geodiversity: {
    providerName: 'Location-Diverse',
    sla: '99.9%+',
    architecture: '2+ virtual circuits at different FastConnect locations for location-level redundancy.',
    minConnections: 2,
    minLocations: 2,
    minMetros: 2,
    locationConstraint: '2+ different FastConnect locations',
    locationBehavior: 'dual-metro',
    uiLabel: 'Location-diverse redundancy',
    details: [
      '2+ circuits at different FastConnect locations',
      'Full location diversity',
      'Partner diversity optional',
      'Maximum fault tolerance',
    ],
  },
};

const DEFAULT_TIERS: Record<Tier, ResiliencyTierConfig> = {
  standard: {
    providerName: 'Standard',
    sla: '99.9%',
    architecture: 'Single connection at one location with local redundancy.',
    minConnections: 1,
    minLocations: 1,
    minMetros: 1,
    locationConstraint: '1 location',
    locationBehavior: 'single-site',
    uiLabel: 'Single-site, locally redundant',
    details: ['Single connection', 'Local redundancy'],
  },
  maximum: {
    providerName: 'Maximum',
    sla: '99.99%',
    architecture: 'Fully redundant connections across 2 sites in one metro.',
    minConnections: 4,
    minLocations: 2,
    minMetros: 1,
    locationConstraint: '2 sites in 1 metro',
    locationBehavior: 'single-metro-auto',
    uiLabel: 'Maximum resilience within one metro',
    details: ['4 links across 2 sites', 'Single metro'],
  },
  geodiversity: {
    providerName: 'Geo-Diverse',
    sla: '99.99%',
    architecture: 'Fully redundant connections across 2 metros.',
    minConnections: 4,
    minLocations: 2,
    minMetros: 2,
    locationConstraint: '2 metros with local redundancy each',
    locationBehavior: 'dual-metro',
    uiLabel: 'Geo-diverse, metro-independent redundancy',
    details: ['Full redundancy across metros', 'Maximum availability'],
  },
};

const PROVIDER_TIERS: Record<string, Record<Tier, ResiliencyTierConfig>> = {
  'AWS': AWS_TIERS,
  'Azure': AZURE_TIERS,
  'Google': GOOGLE_TIERS,
  'Oracle': ORACLE_TIERS,
};

export function getResiliencyConfig(provider: string, tier: Tier): ResiliencyTierConfig {
  const providerTiers = PROVIDER_TIERS[provider];
  if (providerTiers) return providerTiers[tier];
  return DEFAULT_TIERS[tier];
}

export function getAllResiliencyTiers(provider: string): Record<Tier, ResiliencyTierConfig> {
  return PROVIDER_TIERS[provider] || DEFAULT_TIERS;
}

export function getMinLocations(provider: string, tier: Tier): number {
  const config = getResiliencyConfig(provider, tier);
  return config.minLocations;
}

export function getAvailableTiers(): Tier[] {
  return ['standard', 'maximum', 'geodiversity'];
}
