/**
 * Provider locations for the wizard.
 *
 * CRITICAL DISTINCTION:
 * - AWS, Azure, Google, Oracle: These are physical interconnect LOCATIONS
 *   (datacenters where AT&T's IPE connects), NOT cloud provider regions.
 * - IBM, Equinix, Digital Realty, etc.: Already physical locations.
 *
 * The "servesRegions" field shows which cloud regions a location connects to,
 * displayed as help text in the wizard.
 *
 * The "metro" field groups locations by metropolitan area - used by
 * Maximum resiliency (Azure: pick 2 sites in same metro) and
 * Geodiversity (pick sites in 2 different metros).
 *
 * The "edgeDomain" field is Google-specific - edge availability domains
 * within a metro. 99.9% SLA requires different edge domains.
 */

export interface ProviderLocation {
  label: string;
  servesRegions?: string[];
  metro?: string;
  edgeDomain?: string;
}

export const PROVIDER_LOCATIONS: Record<string, ProviderLocation[]> = {
  'AWS': [
    // AWS Interconnect – last mile locations serve ALL AWS regions via the AWS backbone.
    // The "servesRegions" field shows the nearest region for latency guidance only.
    // Multiple facilities per metro listed per provider-trees.md
    { label: 'Ashburn, VA (Equinix DC1-DC15)', servesRegions: ['us-east-1', 'us-east-2'], metro: 'Ashburn' },
    { label: 'Ashburn, VA (CoreSite VA1)', servesRegions: ['us-east-1', 'us-east-2'], metro: 'Ashburn' },
    { label: 'Columbus, OH (Cologix COL1)', servesRegions: ['us-east-2'], metro: 'Columbus' },
    { label: 'Chicago, IL (CoreSite CH1)', servesRegions: ['us-east-2', 'us-west-2'], metro: 'Chicago' },
    { label: 'Chicago, IL (Equinix CH)', servesRegions: ['us-east-2', 'us-west-2'], metro: 'Chicago' },
    { label: 'Dallas, TX (Equinix DA1)', servesRegions: ['us-east-1', 'us-west-2'], metro: 'Dallas' },
    { label: 'Dallas, TX (CyrusOne)', servesRegions: ['us-east-1', 'us-west-2'], metro: 'Dallas' },
    { label: 'Los Angeles, CA (CoreSite LA1)', servesRegions: ['us-west-2', 'us-west-1'], metro: 'Los Angeles' },
    { label: 'Los Angeles, CA (Equinix LA)', servesRegions: ['us-west-2', 'us-west-1'], metro: 'Los Angeles' },
    { label: 'Portland, OR (Pittock Block)', servesRegions: ['us-west-2'], metro: 'Portland' },
    { label: 'Portland, OR (EdgeConneX)', servesRegions: ['us-west-2'], metro: 'Portland' },
  ],
  'Azure': [
    // Peering locations where AT&T NetBond is listed as connectivity provider
    { label: 'Atlanta (Equinix AT1)', servesRegions: ['East US', 'East US 2'], metro: 'Atlanta' },
    { label: 'Ashburn (Equinix DC2)', servesRegions: ['East US', 'East US 2'], metro: 'Washington DC' },
    { label: 'Ashburn 2 (CoreSite VA2)', servesRegions: ['East US', 'East US 2'], metro: 'Washington DC' },
    { label: 'Chicago (Equinix CH1)', servesRegions: ['North Central US'], metro: 'Chicago' },
    { label: 'Chicago 2 (CoreSite CH1)', servesRegions: ['North Central US'], metro: 'Chicago' },
    { label: 'Dallas (Equinix DA3)', servesRegions: ['South Central US'], metro: 'Dallas' },
    { label: 'Dallas 2 (Digital Realty DFW10)', servesRegions: ['South Central US'], metro: 'Dallas' },
    { label: 'Los Angeles (CoreSite LA1)', servesRegions: ['West US'], metro: 'Los Angeles' },
    { label: 'Phoenix (EdgeConneX PHX01)', servesRegions: ['West US 3'], metro: 'Phoenix' },
    { label: 'San Antonio (CyrusOne SA1)', servesRegions: ['South Central US'], metro: 'San Antonio' },
    { label: 'San Jose (Equinix SV1)', servesRegions: ['West US', 'West US 2'], metro: 'Silicon Valley' },
    { label: 'Seattle (Equinix SE2)', servesRegions: ['West US 2'], metro: 'Seattle' },
  ],
  'Google': [
    { label: 'Ashburn, VA (Equinix)', servesRegions: ['us-east1', 'us-east4'], metro: 'Ashburn', edgeDomain: 'ash-zone1' },
    { label: 'Ashburn, VA (CoreSite)', servesRegions: ['us-east1', 'us-east4'], metro: 'Ashburn', edgeDomain: 'ash-zone2' },
    { label: 'Chicago, IL (Equinix)', servesRegions: ['us-central1'], metro: 'Chicago', edgeDomain: 'chi-zone1' },
    { label: 'Chicago, IL (CoreSite)', servesRegions: ['us-central1'], metro: 'Chicago', edgeDomain: 'chi-zone2' },
    { label: 'Dallas, TX (Equinix)', servesRegions: ['us-south1'], metro: 'Dallas', edgeDomain: 'dal-zone1' },
    { label: 'Los Angeles, CA (Equinix)', servesRegions: ['us-west2'], metro: 'Los Angeles', edgeDomain: 'lax-zone1' },
    { label: 'Los Angeles, CA (CoreSite)', servesRegions: ['us-west2'], metro: 'Los Angeles', edgeDomain: 'lax-zone2' },
    { label: 'New York, NY (Equinix)', servesRegions: ['us-east1'], metro: 'New York', edgeDomain: 'nyc-zone1' },
  ],
  'Oracle': [
    { label: 'Ashburn, VA (US East)', servesRegions: ['us-ashburn-1'], metro: 'Ashburn' },
    { label: 'Phoenix, AZ (US West)', servesRegions: ['us-phoenix-1'], metro: 'Phoenix' },
    { label: 'Frankfurt (Europe)', servesRegions: ['eu-frankfurt-1'], metro: 'Frankfurt' },
    { label: 'Tokyo (Asia Pacific)', servesRegions: ['ap-tokyo-1'], metro: 'Tokyo' },
  ],
  'IBM': [
    { label: 'Dallas', metro: 'Dallas' },
    { label: 'Washington DC', metro: 'Washington DC' },
    { label: 'London', metro: 'London' },
    { label: 'Frankfurt', metro: 'Frankfurt' },
    { label: 'Tokyo', metro: 'Tokyo' },
    { label: 'Sydney', metro: 'Sydney' },
  ],
  'Equinix': [
    { label: 'New York' },
    { label: 'Chicago' },
    { label: 'Los Angeles' },
    { label: 'London' },
    { label: 'Frankfurt' },
    { label: 'Tokyo' },
    { label: 'Singapore' },
  ],
  'Digital Realty': [
    { label: 'New York Metro' },
    { label: 'Chicago' },
    { label: 'Dallas' },
    { label: 'Los Angeles' },
    { label: 'London' },
    { label: 'Amsterdam' },
  ],
  'Centersquare': [
    { label: 'Atlanta' },
    { label: 'Dallas' },
    { label: 'Denver' },
    { label: 'Phoenix' },
    { label: 'Toronto' },
  ],
  'CoreSite': [
    { label: 'New York' },
    { label: 'Los Angeles' },
    { label: 'Chicago' },
    { label: 'Denver' },
    { label: 'Virginia' },
  ],
  'DataBank': [
    { label: 'Dallas' },
    { label: 'Minneapolis' },
    { label: 'Kansas City' },
    { label: 'Baltimore' },
    { label: 'Salt Lake City' },
  ],
  'Cisco Jasper': [
    { label: 'Ashburn, VA - CenterSquare' },
    { label: 'Columbus, OH - Cologix' },
    { label: 'Lynnwood, WA - CenterSquare' },
    { label: 'Atlanta, GA - QTS' },
    { label: 'Atlanta New DC - Equinix' },
    { label: 'San Jose, CA - Equinix' },
    { label: 'Phoenix, AZ - Digital Realty' },
  ],
};

/**
 * Backward-compatible helper that returns just the label strings.
 */
export function getLocationLabels(provider: string): string[] {
  const locations = PROVIDER_LOCATIONS[provider];
  if (!locations) return [];
  return locations.map(l => l.label);
}

/**
 * Get the full location objects for a provider.
 */
export function getLocations(provider: string): ProviderLocation[] {
  return PROVIDER_LOCATIONS[provider] || [];
}

/**
 * Get unique metros for a provider.
 */
export function getMetros(provider: string): string[] {
  const locations = PROVIDER_LOCATIONS[provider] || [];
  return [...new Set(locations.map(l => l.metro).filter(Boolean))] as string[];
}

/**
 * Get locations within a specific metro for a provider.
 */
export function getLocationsInMetro(provider: string, metro: string): ProviderLocation[] {
  const locations = PROVIDER_LOCATIONS[provider] || [];
  return locations.filter(l => l.metro === metro);
}
