/* Meridian Trust - the bank-scale seed profile. Deterministic: a fixed-seed
 * LCG drives every choice; no Date/Math.random (resume- and test-safe).
 *
 * Structurally mirrors state.ts's branch/cloud/region/vpc literal shapes
 * (lines 49-104) plus the `siteClass` field added in task 1. Engine files
 * don't import from src/features/**, so the shapes are redefined here
 * rather than imported from discoveryModel.ts's SiteClass type. */

export type MeridianSiteClass = 'dc' | 'office' | 'branch' | 'atm';

export interface MeridianBranch {
  id: string;
  name: string;
  city: string;
  geo: [number, number];
  cidrs: string[];
  onrampId?: string;
  cloudTags: { Region: string; Env: string; Owner: string };
  siteClass: MeridianSiteClass;
}

export interface MeridianCloud {
  id: string;
  name: string;
  color: string;
  mk: string;
  workloads: number;
  attached: boolean;
  partial?: boolean;
  ai?: boolean;
}

export interface MeridianRegion {
  id: string;
  name: string;
  sub: string;
  subnets: number;
  routes: number;
  gateways: number;
  lat: number;
  attached: boolean;
  spof?: boolean;
  ai?: boolean;
  geo: [number, number];
}

export interface MeridianVpc {
  id: string;
  name: string;
  cidr: string;
  azs: number;
  subnets: number;
  attached: boolean;
  role: string;
  tags?: string[];
  vnet?: boolean;
  ai?: boolean;
  cloudTags: { Project: string; Env: string; Owner: string; Region: string };
}

export interface MeridianEstate {
  branches: MeridianBranch[];
  clouds: MeridianCloud[];
  regions: Record<string, MeridianRegion[]>;
  vpcs: Record<string, MeridianVpc[]>;
}

const METROS: [string, number, number, number][] = [
  // [city, lat, lon, weight] - weight shapes how many branches/ATMs land there
  ['Dallas', 32.78, -96.8, 9], ['Charlotte', 35.23, -80.84, 8], ['Chicago', 41.88, -87.63, 8],
  ['Phoenix', 33.45, -112.07, 6], ['Atlanta', 33.75, -84.39, 6], ['Denver', 39.74, -104.99, 5],
  ['Columbus', 39.96, -83.0, 5], ['San Antonio', 29.42, -98.49, 5], ['Minneapolis', 44.98, -93.27, 4],
  ['Portland', 45.52, -122.68, 4], ['Des Moines', 41.59, -93.62, 3], ['Salt Lake City', 40.76, -111.89, 3],
];

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/* CIDR allocator. Each site class gets its own disjoint band of first-octet
 * (`10.A.*`) values, so uniqueness across all 4,183 sites falls out of the
 * bands never overlapping - no cross-class bookkeeping needed. Within a
 * band, the allocator respects where a /N mask actually draws its network
 * boundary, so every octet the allocator ever writes stays inside 0-255
 * regardless of how many sites land in that class:
 *
 *  - /20 (dc + office, 213 sites): boundary falls 4 bits into the 3rd
 *    octet, so a block advances the 3rd octet by 16. 16 blocks exhaust one
 *    2nd-octet value, so every additional 16 sites rolls the 2nd octet
 *    (`B`) forward instead of overflowing the 3rd.
 *  - /24 (branch, 2,840 sites): boundary is the octet edge, so one block
 *    is one 3rd-octet value (256 per 2nd-octet value); every 256 sites
 *    rolls `B` forward.
 *  - /28 (atm, 1,130 sites): boundary falls 4 bits into the 4th octet, so
 *    a block advances the 4th octet by 16 (16 per 3rd-octet value, 4,096
 *    per 2nd-octet value) - 1,130 sites never leaves a single 2nd-octet
 *    value, let alone the first.
 *
 * Bands (2nd octet base): dc/office 64-77, branch 100-111, atm 150. None
 * overlap, so CIDRs are unique across classes by construction; the
 * within-class math above keeps them unique within a class too. */
function cidrAllocator(siteClass: MeridianSiteClass, mask: 20 | 24 | 28) {
  const base = siteClass === 'branch' ? 100 : siteClass === 'atm' ? 150 : 64;
  return (index: number): string => {
    if (mask === 20) {
      const b = base + Math.floor(index / 16);
      const third = (index % 16) * 16;
      return `10.${b}.${third}.0/20`;
    }
    if (mask === 24) {
      const b = base + Math.floor(index / 256);
      const third = index % 256;
      return `10.${b}.${third}.0/24`;
    }
    // /28
    const third = Math.floor(index / 16) % 256;
    const fourth = (index % 16) * 16;
    return `10.${base}.${third}.${fourth}/28`;
  };
}

export function meridianEstate(): MeridianEstate {
  const rnd = lcg(20260810);
  const branches: MeridianBranch[] = [];

  const weighted = () => { // pick a metro by weight
    const total = METROS.reduce((s, m) => s + m[3], 0);
    let roll = rnd() * total;
    for (const m of METROS) { roll -= m[3]; if (roll <= 0) return m; }
    return METROS[0];
  };

  const push = (
    siteClass: MeridianSiteClass,
    i: number,
    seq: number,
    metro: (typeof METROS)[number],
    mask: 20 | 24 | 28,
    allocate: (index: number) => string,
  ) => {
    const [city, lat, lon] = metro;
    branches.push({
      id: `mt-${siteClass}-${String(i).padStart(4, '0')}`,
      name: siteClass === 'dc' ? `${city} data center` : siteClass === 'office' ? `${city} office ${i}` : siteClass === 'branch' ? `${city} branch ${i}` : `${city} ATM ${i}`,
      city,
      geo: [lat + (rnd() - 0.5) * 0.4, lon + (rnd() - 0.5) * 0.4],
      cidrs: [allocate(seq)],
      // DCs and offices are on AVPN (on-net); branches mostly on-net via SD-WAN;
      // ATMs split cellular (off-net) vs wired (on-net).
      ...(siteClass === 'atm' ? (rnd() < 0.6 ? {} : { onrampId: 'mt-nb1' }) : { onrampId: 'mt-nb1' }),
      siteClass,
      cloudTags: { Region: lon < -100 ? 'west' : lon < -90 ? 'central' : 'east', Env: 'prod', Owner: 'facilities' },
    });
  };

  // dc + office share one /20 allocator band and one continuous index
  // sequence (mask===20), so the 16-per-2nd-octet rollover above spans
  // both classes together, matching the brief's combined 213-site count.
  const dcOfficeAllocate = cidrAllocator('office', 20);
  const branchAllocate = cidrAllocator('branch', 24);
  const atmAllocate = cidrAllocator('atm', 28);

  let dcOfficeSeq = 0;
  (['dc', 'office'] as const).forEach((cls) => {
    const n = cls === 'dc' ? 3 : 210;
    for (let i = 1; i <= n; i++) push(cls, i, dcOfficeSeq++, weighted(), 20, dcOfficeAllocate);
  });
  for (let i = 1; i <= 2840; i++) push('branch', i, i - 1, weighted(), 24, branchAllocate);
  for (let i = 1; i <= 1130; i++) push('atm', i, i - 1, weighted(), 28, atmAllocate);

  // Cloud estate: AWS + Azure, hub-spoke, business-unit spokes, finding seeds.
  const clouds: MeridianCloud[] = [
    { id: 'aws', name: 'AWS', color: '#ff9900', mk: 'aws', workloads: 640, attached: true, partial: true },
    { id: 'azure', name: 'Azure', color: '#3b8bd4', mk: 'AZ', workloads: 410, attached: false },
  ];
  const regions: Record<string, MeridianRegion[]> = {
    aws: [
      { id: 'use1', name: 'us-east-1', sub: 'N. Virginia', subnets: 96, routes: 210, gateways: 41, lat: 11, attached: true, geo: [38.9, -77.4] },
      { id: 'usw2', name: 'us-west-2', sub: 'Oregon', subnets: 64, routes: 140, gateways: 28, lat: 58, attached: false, geo: [45.6, -121.2] },
    ],
    azure: [
      { id: 'scus', name: 'South Central US', sub: 'Texas', subnets: 72, routes: 155, gateways: 30, lat: 16, attached: false, geo: [29.4, -98.5] },
      { id: 'eus2', name: 'East US 2', sub: 'Virginia · single path', subnets: 48, routes: 98, gateways: 19, lat: 24, attached: false, spof: true, geo: [36.6, -78.4] },
    ],
  };
  const bu = ['retail', 'payments', 'risk', 'ai-lab'];
  const vpcs: Record<string, MeridianVpc[]> = {};
  for (const [cloudId, rs] of Object.entries(regions)) {
    for (const r of rs) {
      const hub: MeridianVpc = {
        id: `${r.id}-hub`, name: `${cloudId === 'aws' ? 'tgw' : 'vwan'}-${r.id}`,
        cidr: `10.128.${Object.keys(vpcs).length * 8}.0/21`, azs: 3, subnets: 6, attached: r.attached,
        role: 'Transit hub · platform', vnet: cloudId === 'azure',
        cloudTags: { Project: 'platform', Env: 'prod', Owner: 'platform', Region: 'east' },
      };
      const spokes: MeridianVpc[] = bu.map((unit, i) => ({
        id: `${r.id}-${unit}`, name: `${cloudId === 'aws' ? 'vpc' : 'vnet'}-${unit}-${r.id}`,
        cidr: `10.129.${Object.keys(vpcs).length * 8 + i + 1}.0/24`, azs: 2, subnets: 4,
        attached: r.attached && unit !== 'ai-lab',
        role: `${unit} workloads`, vnet: cloudId === 'azure',
        // ai-lab spokes are the untracked-AI seed: ai:true, NO governance tags.
        ...(unit === 'ai-lab' ? { ai: true } : { tags: unit === 'payments' ? ['pci'] : ['shared-services'] }),
        cloudTags: { Project: unit, Env: 'prod', Owner: unit, Region: 'east' },
      }));
      vpcs[r.id] = [hub, ...spokes];
    }
  }
  return { branches, clouds, regions, vpcs };
}
