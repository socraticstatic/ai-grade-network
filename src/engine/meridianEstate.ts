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
  /** Two-letter US state. A bank's estate is organised state-first below the
   *  region: compliance, tax and the branch org chart all follow state lines,
   *  and a metro list alone cannot express "everything in Texas". */
  state: string;
  /** The bank's own operating region — the level above state. */
  region: string;
  /** The sub-metro operating unit. One city can hold hundreds of branches, so
   *  metro is not the last stop before an individual site; districts are how
   *  a real retail bank slices a city (region → state → metro → district →
   *  branch). Data centres and offices have no district. */
  district?: string;
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

interface Metro {
  city: string;
  state: string;
  region: string;
  lat: number;
  lon: number;
  /** Shapes how many branches/ATMs land here. */
  weight: number;
}

/* The estate's geography, as a bank actually organises it.
 *
 * The first version was twelve cities with no state and a three-way
 * west/central/east tag. That reads fine on a slide and collapses the moment
 * anyone asks a real question - "how exposed is Texas?", "what does the
 * Southeast look like?" - because neither level existed. Thirty-five metros
 * across twenty-one states and five operating regions gives every level of
 * the drill something true to say, and puts several metros inside the states
 * that matter (TX, CA, FL, NC, MO, PA) rather than one city per state. */
const METROS: Metro[] = [
  // West
  { city: 'Seattle', state: 'WA', region: 'West', lat: 47.61, lon: -122.33, weight: 4 },
  { city: 'Portland', state: 'OR', region: 'West', lat: 45.52, lon: -122.68, weight: 4 },
  { city: 'San Francisco', state: 'CA', region: 'West', lat: 37.77, lon: -122.42, weight: 5 },
  { city: 'Los Angeles', state: 'CA', region: 'West', lat: 34.05, lon: -118.24, weight: 7 },
  { city: 'San Diego', state: 'CA', region: 'West', lat: 32.72, lon: -117.16, weight: 3 },
  { city: 'Phoenix', state: 'AZ', region: 'West', lat: 33.45, lon: -112.07, weight: 6 },
  { city: 'Las Vegas', state: 'NV', region: 'West', lat: 36.17, lon: -115.14, weight: 3 },
  { city: 'Salt Lake City', state: 'UT', region: 'West', lat: 40.76, lon: -111.89, weight: 3 },
  { city: 'Denver', state: 'CO', region: 'West', lat: 39.74, lon: -104.99, weight: 5 },
  // Southwest
  { city: 'Dallas', state: 'TX', region: 'Southwest', lat: 32.78, lon: -96.8, weight: 9 },
  { city: 'Houston', state: 'TX', region: 'Southwest', lat: 29.76, lon: -95.37, weight: 7 },
  { city: 'San Antonio', state: 'TX', region: 'Southwest', lat: 29.42, lon: -98.49, weight: 5 },
  { city: 'Austin', state: 'TX', region: 'Southwest', lat: 30.27, lon: -97.74, weight: 4 },
  { city: 'Oklahoma City', state: 'OK', region: 'Southwest', lat: 35.47, lon: -97.52, weight: 3 },
  { city: 'Albuquerque', state: 'NM', region: 'Southwest', lat: 35.08, lon: -106.65, weight: 2 },
  // Midwest
  { city: 'Chicago', state: 'IL', region: 'Midwest', lat: 41.88, lon: -87.63, weight: 8 },
  { city: 'Minneapolis', state: 'MN', region: 'Midwest', lat: 44.98, lon: -93.27, weight: 4 },
  { city: 'Columbus', state: 'OH', region: 'Midwest', lat: 39.96, lon: -83.0, weight: 5 },
  { city: 'Detroit', state: 'MI', region: 'Midwest', lat: 42.33, lon: -83.05, weight: 4 },
  { city: 'Des Moines', state: 'IA', region: 'Midwest', lat: 41.59, lon: -93.62, weight: 3 },
  { city: 'Kansas City', state: 'MO', region: 'Midwest', lat: 39.1, lon: -94.58, weight: 4 },
  { city: 'St. Louis', state: 'MO', region: 'Midwest', lat: 38.63, lon: -90.2, weight: 3 },
  { city: 'Indianapolis', state: 'IN', region: 'Midwest', lat: 39.77, lon: -86.16, weight: 3 },
  // Southeast
  { city: 'Charlotte', state: 'NC', region: 'Southeast', lat: 35.23, lon: -80.84, weight: 8 },
  { city: 'Raleigh', state: 'NC', region: 'Southeast', lat: 35.78, lon: -78.64, weight: 4 },
  { city: 'Atlanta', state: 'GA', region: 'Southeast', lat: 33.75, lon: -84.39, weight: 6 },
  { city: 'Nashville', state: 'TN', region: 'Southeast', lat: 36.16, lon: -86.78, weight: 4 },
  { city: 'Tampa', state: 'FL', region: 'Southeast', lat: 27.95, lon: -82.46, weight: 4 },
  { city: 'Miami', state: 'FL', region: 'Southeast', lat: 25.76, lon: -80.19, weight: 5 },
  { city: 'Jacksonville', state: 'FL', region: 'Southeast', lat: 30.33, lon: -81.66, weight: 3 },
  { city: 'Birmingham', state: 'AL', region: 'Southeast', lat: 33.52, lon: -86.8, weight: 2 },
  // Northeast
  { city: 'New York', state: 'NY', region: 'Northeast', lat: 40.71, lon: -74.01, weight: 9 },
  { city: 'Philadelphia', state: 'PA', region: 'Northeast', lat: 39.95, lon: -75.17, weight: 5 },
  { city: 'Pittsburgh', state: 'PA', region: 'Northeast', lat: 40.44, lon: -79.996, weight: 3 },
  { city: 'Boston', state: 'MA', region: 'Northeast', lat: 42.36, lon: -71.06, weight: 5 },
  { city: 'Newark', state: 'NJ', region: 'Northeast', lat: 40.74, lon: -74.17, weight: 3 },
  { city: 'Hartford', state: 'CT', region: 'Northeast', lat: 41.76, lon: -72.68, weight: 2 },
];

/* How a retail bank slices a city below the metro. Deterministic per site so
 * the same branch always lands in the same district. */
const DISTRICTS = ['Downtown', 'North', 'South', 'East', 'West'] as const;

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
  /* Districts draw from their OWN generator. Taking a value off `rnd` would
     shift the shared stream, and that stream decides which ATMs are on-net —
     the estate's headline "3,509 of 4,183 on the fabric" would move because
     a label was added. A second seed keeps every existing figure exact. */
  const drnd = lcg(20260811);
  const branches: MeridianBranch[] = [];

  const weighted = () => { // pick a metro by weight
    const total = METROS.reduce((s, m) => s + m.weight, 0);
    let roll = rnd() * total;
    for (const m of METROS) { roll -= m.weight; if (roll <= 0) return m; }
    return METROS[0];
  };

  const push = (
    siteClass: MeridianSiteClass,
    i: number,
    seq: number,
    metro: Metro,
    mask: 20 | 24 | 28,
    allocate: (index: number) => string,
  ) => {
    const { city, state, region, lat, lon } = metro;
    /* Only the retail estate is districted. A city's three data centres are
       not "the North district" of anything, and inventing one would put a
       level in the drill that means nothing. */
    const district = siteClass === 'branch' || siteClass === 'atm'
      ? DISTRICTS[Math.floor(drnd() * DISTRICTS.length) % DISTRICTS.length]
      : undefined;
    branches.push({
      id: `mt-${siteClass}-${String(i).padStart(4, '0')}`,
      name: siteClass === 'dc' ? `${city} data center` : siteClass === 'office' ? `${city} office ${i}` : siteClass === 'branch' ? `${city} branch ${i}` : `${city} ATM ${i}`,
      city,
      state,
      region,
      ...(district ? { district } : {}),
      geo: [lat + (rnd() - 0.5) * 0.4, lon + (rnd() - 0.5) * 0.4],
      cidrs: [allocate(seq)],
      // DCs and offices are on AVPN (on-net); branches mostly on-net via SD-WAN;
      // ATMs split cellular (off-net) vs wired (on-net).
      ...(siteClass === 'atm' ? (rnd() < 0.6 ? {} : { onrampId: 'mt-nb1' }) : { onrampId: 'mt-nb1' }),
      siteClass,
      cloudTags: { Region: region, Env: 'prod', Owner: 'facilities' },
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
      const regionTag = r.geo[1] < -100 ? 'west' : r.geo[1] < -90 ? 'central' : 'east';
      const hub: MeridianVpc = {
        id: `${r.id}-hub`, name: `${cloudId === 'aws' ? 'tgw' : 'vwan'}-${r.id}`,
        cidr: `10.128.${Object.keys(vpcs).length * 8}.0/21`, azs: 3, subnets: 6, attached: r.attached,
        role: 'Transit hub · platform', vnet: cloudId === 'azure',
        cloudTags: { Project: 'platform', Env: 'prod', Owner: 'platform', Region: regionTag },
      };
      const spokes: MeridianVpc[] = bu.map((unit, i) => ({
        id: `${r.id}-${unit}`, name: `${cloudId === 'aws' ? 'vpc' : 'vnet'}-${unit}-${r.id}`,
        cidr: `10.129.${Object.keys(vpcs).length * 8 + i + 1}.0/24`, azs: 2, subnets: 4,
        attached: r.attached && unit !== 'ai-lab',
        role: `${unit} workloads`, vnet: cloudId === 'azure',
        // ai-lab spokes are the untracked-AI seed: ai:true, NO governance tags.
        ...(unit === 'ai-lab' ? { ai: true } : { tags: unit === 'payments' ? ['pci'] : ['shared-services'] }),
        cloudTags: { Project: unit, Env: 'prod', Owner: unit, Region: regionTag },
      }));
      vpcs[r.id] = [hub, ...spokes];
    }
  }
  return { branches, clouds, regions, vpcs };
}
