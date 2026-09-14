/**
 * LMCC Data Layer
 *
 * Source of truth: LMCC Product Notes (AT&T AWS LMCC Interconnect - 04092026.docx)
 *
 * Key facts:
 * - Preview: San Jose only at 1 Gbps. LA requires ~500mi fiber run (not yet installed).
 * - GA: San Jose + Ashburn (LA drops). Bandwidth 50 Mbps–100 Gbps in spec'd tiers.
 * - GA date: November 16, 2026.
 * - Locations and bandwidth options come from live API — never hardcode in prod.
 */

import {
  LMCCMetro,
  LMCCPhaseConfig,
  LMCCConnection,
  LMCCContractType,
} from '../types/lmcc';

// ─── Region grouping ──────────────────────────────────────────────────────────

export interface LMCCRegionGroup {
  regionId: string;
  regionLabel: string;
  metros: LMCCMetro[];
}

export function getMetrosGroupedByRegion(metros: LMCCMetro[] = LMCC_METROS): LMCCRegionGroup[] {
  const groups = new Map<string, LMCCRegionGroup>();
  for (const metro of metros) {
    if (!groups.has(metro.awsRegion)) {
      groups.set(metro.awsRegion, { regionId: metro.awsRegion, regionLabel: metro.awsRegionLabel, metros: [] });
    }
    groups.get(metro.awsRegion)!.metros.push(metro);
  }
  return Array.from(groups.values());
}

// --- Metro Definitions ---
// PRD rule: customers see metro names only, never datacenter/colocation names.
// Datacenter names here are AT&T internal references, not shown in location selectors.

export const LMCC_METROS: LMCCMetro[] = [
  {
    id: 'metro-sj',
    name: 'San Jose, CA',
    // Preview: Equinix SJ — AT&T and AWS are in the same building, intra-DC cross-connect.
    // GA adds CoreSite SJ after Equinix LA is migrated and decommissioned.
    datacenters: ['Equinix San Jose', 'Equinix San Jose (SV5)'],
    facilities: ['Equinix'],
    phase: 'preview',
    awsRegion: 'us-west-1',
    awsRegionLabel: 'US West (N. California)',
    available: true,
  },
  {
    id: 'metro-la',
    name: 'Los Angeles, CA',
    // NOT a separate metro at GA: the LA site (Equinix El Segundo) belongs to the same
    // US West service area as San Jose and migrates into CoreSite SJ. Kept here only as
    // preview-era history; never rendered at GA (getAllMetrosForPhase uses LMCC_METROS_GA).
    datacenters: ['Equinix Los Angeles'],
    facilities: ['Equinix'],
    phase: 'preview',
    awsRegion: 'us-west-1',
    awsRegionLabel: 'US West (N. California)',
    available: false,
    unavailableReason: 'Infrastructure pending — fiber installation in progress',
  },
  {
    id: 'metro-ashburn',
    // PRD customer display name agreed jointly with AWS
    name: 'Ashburn, VA',
    datacenters: ['Equinix DC2', 'CoreSite VA1'],
    facilities: ['Equinix', 'CoreSite'],
    phase: 'ga',
    awsRegion: 'us-east-1',
    awsRegionLabel: 'US East (N. Virginia)',
    available: false,
    unavailableReason: 'Available at GA (November 16, 2026)',
  },
];

// GA metro set: San Jose (CoreSite added) + Ashburn. LA drops at GA.
export const LMCC_METROS_GA: LMCCMetro[] = [
  {
    id: 'metro-sj',
    name: 'San Jose, CA',
    // GA: Equinix SJ (new certified hardware) + CoreSite SJ (replaces Equinix LA via migration).
    datacenters: ['Equinix San Jose', 'CoreSite San Jose'],
    facilities: ['Equinix', 'CoreSite'],
    phase: 'ga',
    awsRegion: 'us-west-1',
    awsRegionLabel: 'US West (N. California)',
    available: true,
  },
  {
    id: 'metro-ashburn',
    name: 'Ashburn, VA',
    datacenters: ['Equinix DC2', 'CoreSite VA1'],
    facilities: ['Equinix', 'CoreSite'],
    phase: 'ga',
    awsRegion: 'us-east-1',
    awsRegionLabel: 'US East (N. Virginia)',
    available: true,
  },
];

// Phase launch dates — from PRD
export const PHASE_DATES = {
  preview: 'June 30, 2026',
  ga: 'November 16, 2026',
} as const;

// --- Phase Capabilities ---

export const LMCC_PHASES: Record<'preview' | 'ga', LMCCPhaseConfig> = {
  preview: {
    phase: 'preview',
    availableMetros: ['metro-sj'],  // LA unavailable until fiber confirmed
    bandwidthOptions: [1000],       // Fixed 1 Gbps only at Preview
    contractTypes: ['trial'],
    transports: ['mpls', 'internet'],
    operations: ['create', 'delete'],
  },
  ga: {
    phase: 'ga',
    availableMetros: ['metro-sj', 'metro-ashburn'],
    // Tiers per Design Brief (design authority): 1/2/5/10/20/50/100 Gbps. Sub-Gbps eliminated.
    bandwidthOptions: [1000, 2000, 5000, 10000, 20000, 50000, 100000],
    contractTypes: ['monthly', 'fixed-12', 'fixed-24', 'fixed-36'],
    transports: ['mpls', 'internet'],
    operations: ['create', 'read', 'update', 'delete'],
  },
};

// Current phase for the prototype. GA since the 2026-07-10 build:
// San Jose + Ashburn, 1–100 Gbps tiers (sub-Gbps eliminated per Design Brief).
export const CURRENT_PHASE: 'preview' | 'ga' = 'ga';

// --- Helpers ---

export function getAvailableMetros(phase?: 'preview' | 'ga'): LMCCMetro[] {
  const p = phase || CURRENT_PHASE;
  const config = LMCC_PHASES[p];
  const allMetros = p === 'ga' ? LMCC_METROS_GA : LMCC_METROS;
  return allMetros.filter(m => config.availableMetros.includes(m.id) && m.available);
}

export function getAllMetrosForPhase(phase?: 'preview' | 'ga'): LMCCMetro[] {
  const p = phase || CURRENT_PHASE;
  return p === 'ga' ? LMCC_METROS_GA : LMCC_METROS;
}

export function getMetroById(id: string): LMCCMetro | undefined {
  return [...LMCC_METROS, ...LMCC_METROS_GA].find(m => m.id === id);
}

export function getBandwidthOptions(phase?: 'preview' | 'ga'): number[] {
  const p = phase || CURRENT_PHASE;
  return LMCC_PHASES[p].bandwidthOptions;
}

export function getContractTypes(phase?: 'preview' | 'ga'): LMCCContractType[] {
  const p = phase || CURRENT_PHASE;
  return LMCC_PHASES[p].contractTypes;
}

export function formatBandwidth(mbps: number): string {
  if (mbps >= 1000) return `${mbps / 1000} Gbps`;
  return `${mbps} Mbps`;
}

export function getPhaseLabel(phase: 'preview' | 'ga'): string {
  return phase === 'preview' ? `Preview (${PHASE_DATES.preview})` : `GA (${PHASE_DATES.ga})`;
}

export function getPhaseTag(phase: 'preview' | 'ga'): { label: string; className: string } {
  return phase === 'preview'
    ? { label: 'Preview · Jun 2026', className: 'bg-fw-accent text-fw-link' }
    : { label: 'GA · Nov 2026', className: 'bg-fw-wash text-fw-bodyLight border border-fw-secondary' };
}

// Validates AWS account ID format: exactly 12 digits
export function isValidAwsAccountId(id: string): boolean {
  return /^\d{12}$/.test(id.trim());
}

// --- Mock Data ---

export const MOCK_LMCC_CONNECTIONS: LMCCConnection[] = [
  {
    id: 'lmcc-001',
    awsAccountId: '123456789012',
    metro: LMCC_METROS_GA[0],
    status: 'live',
    provisioningStatus: 'live',
    contractType: 'fixed-12',
    bandwidth: 1000,
    transport: 'mpls',
    paths: [
      {
        id: 'path-1',
        ipeId: 'MX304-SJ-A',
        datacenter: 'Equinix San Jose',
        awsConnectionId: 'dxcon-fh9k4m2x',
        vlanId: 1001,
        bgpState: 'established',
        physicalPort: '100GE-0/0/0',
        status: 'active',
        subnet: { network: '169.254.10.0/30', attPeerIp: '169.254.10.1', awsPeerIp: '169.254.10.2' },
      },
      {
        id: 'path-2',
        ipeId: 'MX304-SJ-B',
        datacenter: 'Equinix San Jose',
        awsConnectionId: 'dxcon-7tp3vqzr',
        vlanId: 1002,
        bgpState: 'active',
        physicalPort: '100GE-0/0/1',
        status: 'warning',
        subnet: { network: '169.254.10.4/30', attPeerIp: '169.254.10.5', awsPeerIp: '169.254.10.6' },
      },
      {
        id: 'path-3',
        ipeId: 'MX304-SJ-C',
        datacenter: 'Equinix San Jose (SV5)',
        awsConnectionId: 'dxcon-2nb8jc6w',
        vlanId: 1003,
        bgpState: 'established',
        physicalPort: '100GE-0/0/0',
        status: 'active',
        subnet: { network: '169.254.10.8/30', attPeerIp: '169.254.10.9', awsPeerIp: '169.254.10.10' },
      },
      {
        id: 'path-4',
        ipeId: 'MX304-SJ-D',
        datacenter: 'Equinix San Jose (SV5)',
        awsConnectionId: 'dxcon-y5gd1lxa',
        vlanId: 1004,
        bgpState: 'established',
        physicalPort: '100GE-0/0/1',
        status: 'active',
        subnet: { network: '169.254.10.12/30', attPeerIp: '169.254.10.13', awsPeerIp: '169.254.10.14' },
      },
    ],
    bgp: { partnerASN: 7018, customerASN: 65000, md5Key: '********' },
    bfd: { interval: 300, multiplier: 3 },
    billing: { trigger: 'bgp-established', startedAt: '2026-07-01T14:30:00Z', model: 'fixed-rate' },
    createdAt: '2026-07-01T14:00:00Z',
    updatedAt: '2026-07-01T14:30:00Z',
  },
  {
    id: 'lmcc-002',
    awsAccountId: '987654321098',
    metro: LMCC_METROS_GA[0],
    status: 'negotiating',
    provisioningStatus: 'negotiating',
    contractType: 'monthly',
    bandwidth: 1000,
    transport: 'mpls',
    paths: [
      {
        id: 'path-5',
        ipeId: 'MX304-SJ-E',
        datacenter: 'Equinix San Jose',
        awsConnectionId: 'dxcon-def001',
        vlanId: 2001,
        bgpState: 'idle',
        physicalPort: '100GE-0/0/2',
        status: 'pending',
        subnet: { network: '169.254.20.0/30', attPeerIp: '169.254.20.1', awsPeerIp: '169.254.20.2' },
      },
      {
        id: 'path-6',
        ipeId: 'MX304-SJ-F',
        datacenter: 'Equinix San Jose',
        awsConnectionId: 'dxcon-def002',
        vlanId: 2002,
        bgpState: 'idle',
        physicalPort: '100GE-0/0/3',
        status: 'pending',
        subnet: { network: '169.254.20.4/30', attPeerIp: '169.254.20.5', awsPeerIp: '169.254.20.6' },
      },
      {
        id: 'path-7',
        ipeId: 'MX304-SJ-G',
        datacenter: 'Equinix San Jose (SV5)',
        awsConnectionId: 'dxcon-def003',
        vlanId: 2003,
        bgpState: 'idle',
        physicalPort: '100GE-0/0/2',
        status: 'pending',
        subnet: { network: '169.254.20.8/30', attPeerIp: '169.254.20.9', awsPeerIp: '169.254.20.10' },
      },
      {
        id: 'path-8',
        ipeId: 'MX304-SJ-H',
        datacenter: 'Equinix San Jose (SV5)',
        awsConnectionId: 'dxcon-def004',
        vlanId: 2004,
        bgpState: 'idle',
        physicalPort: '100GE-0/0/3',
        status: 'pending',
        subnet: { network: '169.254.20.12/30', attPeerIp: '169.254.20.13', awsPeerIp: '169.254.20.14' },
      },
    ],
    bgp: { partnerASN: 7018, customerASN: 65100 },
    bfd: { interval: 300, multiplier: 3 },
    billing: { trigger: 'bgp-established', model: 'fixed-rate' },
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
  },
];
