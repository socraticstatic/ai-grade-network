import type { CloudControl } from '../../engine/types';

/**
 * Pure derivations for the Discover drill-down tree — the counts, keys and
 * expand/collapse state logic, kept out of the component so they can be
 * unit-tested. All read from the engine handle (`window.CC`) or from a plain
 * open-set; none touch the DOM or React.
 */

export interface Cloud {
  id: string;
  name: string;
  color: string;
  mk: string;
  workloads: number;
  attached: boolean;
  ai?: boolean;
  partial?: boolean;
}
export interface Region {
  id: string;
  name: string;
  sub: string;
  subnets: number;
  /** Fixed per-region seeds; counts() sums them into the estate figures. */
  routes: number;
  gateways: number;
  lat: number;
  attached: boolean;
  spof?: boolean;
  ai?: boolean;
  /** [lat, lon] of the region, used to estimate on-ramp→region latency by distance */
  geo?: readonly [number, number];
}
export interface Vpc {
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
}
export interface Tag {
  label: string;
  hex: string;
  desc?: string;
}
/** A customer premises. Distinct from `onramps[].site`, which is the AT&T
 *  colo facility an on-ramp lives in — a branch is the customer's own
 *  building, and is what the stakeholder note means by "San Jose". */
export type SiteClass = 'dc' | 'office' | 'branch' | 'atm';
export interface Branch {
  id: string;
  name: string;
  city: string;
  cidrs: string[];
  onrampId?: string;
  cloudTags?: Record<string, string>;
  siteClass: SiteClass;
}

/** Tree node keys are path-joined: `aws`, `aws/use1`, `aws/use1/vpcprod`. */
export const cloudKey = (cloudId: string) => cloudId;
export const regionKey = (cloudId: string, regionId: string) => `${cloudId}/${regionId}`;
export const vpcKey = (cloudId: string, regionId: string, vpcId: string) => `${cloudId}/${regionId}/${vpcId}`;

/* --------------------------- selection --------------------------- */

/* Selection is a SECOND set, deliberately not the open-set: expanding a
   region to look inside it is not the same act as choosing it, and
   overloading toggleKey would make every drill-down silently claim
   something. The two sets share the same path vocabulary so a selected node
   is identifiable no matter how the tree is expanded. */

/** Sites live outside the cloud tree, so their key is namespaced rather
 *  than path-joined — `site/br-sjc` can never collide with a cloud id. */
export const branchKey = (branchId: string) => `site/${branchId}`;
export const isBranchKey = (key: string) => key.startsWith('site/');

export const branchesOf = (cc: CloudControl): Branch[] => ((cc.branches || []) as Branch[]);

/** Selection keys are tree paths; the engine's group `members` are estate
 *  ids. The estate id is always the last path segment — `aws/usw2/vpcwest`
 *  names the VPC `vpcwest`, `site/br-sjc` names the branch `br-sjc`. */
export function selectionMemberIds(sel: ReadonlySet<string>): string[] {
  return [...sel].map(k => k.slice(k.lastIndexOf('/') + 1));
}

/* `kind` is what the engine's resolver checks literal members against, so
   getting it wrong drops half a selection with nothing on screen saying
   why. A selection spanning both estates therefore becomes 'mixed' — the
   only kind that can hold a branch and a VPC at once. It is stated
   explicitly rather than left to addGroup's inference so the selection bar
   can show the person which estate their group will cover before they
   commit to it. */
export function selectionKind(sel: ReadonlySet<string>): 'workload' | 'site' | 'mixed' {
  const keys = [...sel];
  if (keys.length === 0) return 'mixed';
  const hasSite = keys.some(isBranchKey);
  const hasVpc = keys.some(k => !isBranchKey(k));
  if (hasSite && hasVpc) return 'mixed';
  return hasSite ? 'site' : 'workload';
}

export const regionsOf = (cc: CloudControl, cloudId: string): Region[] => (cc.regions[cloudId] || []) as Region[];
export const vpcsOf = (cc: CloudControl, regionId: string): Vpc[] => (cc.vpcs[regionId] || []) as Vpc[];

export const cloudRegionCount = (cc: CloudControl, cloudId: string): number => regionsOf(cc, cloudId).length;
export const cloudVpcCount = (cc: CloudControl, cloudId: string): number =>
  regionsOf(cc, cloudId).reduce((n, r) => n + vpcsOf(cc, r.id).length, 0);

export interface EstateStat {
  key: string;
  label: string;
  value: number;
  /**
   * Optional denominator, rendered as the engine's own `n / m` idiom
   * (`state-actions.ts:21`, "Active on-ramps 1 / 4"). Used where the figure
   * a viewer needs is a share of a total, not a bare count — stating only
   * the total would claim capacity the customer does not actually hold.
   */
  of?: number;
}

export interface EstateDomain {
  key: 'network' | 'cloud' | 'ai';
  label: string;
  /** One line on what this domain is, and what you control here. */
  blurb: string;
  stats: EstateStat[];
  /**
   * Where this domain is acted on.
   *
   * Discover names a security gap in the AI domain and every other link on the
   * screen goes to `/naas/*`, so the screens that close that gap had no route
   * in from the screen that raises it. The CTA is also the only place the
   * taxonomy is stated in the page body rather than in a drawer tooltip:
   * Network and Cloud are NaaS, AI workflows are the AI Fabric.
   */
  cta: { label: string; to: string };
}

/**
 * Gbps of app traffic bound for AI endpoints that is NOT on an AT&T-controlled
 * path — read off `routeFlows()`, the same derivation `/naas/observe` renders
 * in its flow table, so a claim made here can be checked against that table.
 *
 * `aiExposed()` counts VPCs, and `activateOnramp('nb2')` drives it to 0 in one
 * action. The flows to those endpoints are rooted in their SOURCE regions,
 * which nb2 does not touch, so `rd-helion → AI endpoints` (12.8 Gbps) and
 * `shared-services → AI endpoints` (7.2 Gbps) stay public and no in-app action
 * clears them. A "gap closed" claim keyed on endpoints alone is denied by that
 * table one click away.
 */
export function aiPublicFlowGbps(cc: CloudControl): number {
  const rows = (cc as unknown as { routeFlows?(): { dst?: string; gbps: number; current: { attControlled: boolean } }[] })
    .routeFlows?.() ?? [];
  const total = rows
    .filter(r => r.dst === 'ai-endpoints' && !r.current.attControlled)
    .reduce((s, r) => s + r.gbps, 0);
  return Math.round(total * 10) / 10;
}

/**
 * Region id -> the latency it states, and the PATH that figure measures.
 *
 * From `fabricModel()` — the ONE region-latency derivation this estate has.
 * Discover used to render the raw seed `r.lat`, so Nebius read 44ms here and
 * 120ms on Connect and all nine regions disagreed; that was fixed by reading
 * `latencyMs`. It then rendered the FABRIC figure for regions still riding
 * public transit, under a bare "LATENCY" label, while /naas/observe stated the
 * public figure for the same regions — a second disagreement in the same tile.
 *
 * `latencyMs` is now the figure for the path the region is on today and this
 * map carries the path with it, so the tile can say which of the two it is
 * showing rather than leaving a viewer to guess between two screens.
 */
export function regionLatencyMap(cc: CloudControl): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of cc.fabricModel().regions) map[r.regionId] = r.latencyMs;
  return map;
}

/** Region id -> which path its `regionLatencyMap` figure measures. */
export function regionLatencyPathMap(cc: CloudControl): Record<string, 'private' | 'public'> {
  const map: Record<string, 'private' | 'public'> = {};
  for (const r of cc.fabricModel().regions) map[r.regionId] = r.path;
  return map;
}

/**
 * Discovery reads in three parts — the network you already have, the cloud
 * estate on the other side of it, and the AI workloads riding both. The split
 * is the stakeholders' ask; every figure is still a `counts()` derivation.
 */
export function estateDomains(cc: CloudControl): EstateDomain[] {
  const c = cc.counts();
  const branches = (cc as unknown as { branches?: unknown[] }).branches ?? [];
  const onramps = (cc as unknown as { onramps?: unknown[] }).onramps ?? [];
  /* `onramps.length` is every circuit in the model, including the two seeded
     `active:false · unused capacity` ones and `nb2`, seeded "not yet
     provisioned". Showing that total under a sentence about paths "already
     under your control" counted circuits the customer does not have, and
     the figure never moved when the page's own CTA activated one. The
     engine already answers the honest question — `activeOnramps()` — and
     already states it as `n / m` (`state-actions.ts:21`), which keeps the
     available capacity visible without claiming it. */
  const activeOnramps = (cc as unknown as { activeOnramps?(): number }).activeOnramps?.() ?? 0;
  const allRegions = Object.values(
    (cc as unknown as { regions: Record<string, { ai?: boolean }[]> }).regions,
  ).flat();
  const models = (cc as unknown as { modelCatalog?(): unknown[] }).modelCatalog?.() ?? [];
  const agents = (cc as unknown as { agentList?(): unknown[] }).agentList?.() ?? [];
  /* AI endpoints still riding public internet (`state.ts:383`). The only
     figure in this domain that is a posture finding rather than an
     inventory count — and the one that lets the AI blurb name a thesis
     word its own tiles can back. */
  const aiExposed = (cc as unknown as { aiExposed?(): number }).aiExposed?.() ?? 0;
  /* The second half of the AI posture, and the reason the zero-branch below
     needs two predicates: endpoints attached is not the same fact as traffic
     to them controlled. */
  const aiFlowPublic = aiPublicFlowGbps(cc);

  return [
    {
      key: 'network',
      label: 'Network',
      /* Not "active over available" — `onramps.length` counts `nb2` (seeded
         `planned:true · 'not yet provisioned'`) and anything `orderCircuit`
         adds mid-provisioning, so "available" would claim readiness the
         denominator does not hold. "On order" makes no such claim. */
      blurb: 'Your sites and the AT&T on-ramps reaching them — active over every circuit on order, so control is a count, not a claim.',
      // Rows 35-36 of the phase-0 metric audit: "Routes" and "Gateways"
      // cut — already folded behind this disclosure and failing every
      // test regardless ("routes" is ambiguous between routing-protocol
      // routes and route tables; a gateway is not a first-class object
      // anywhere else in this product). `counts().routes` / `.gateways`
      // (state.ts) have no other consumer and are noted as orphaned
      // engine derivations.
      stats: [
        { key: 'sites', label: 'Sites', value: branches.length },
        { key: 'onramps', label: 'Active on-ramps', value: activeOnramps, of: onramps.length },
      ],
      cta: { label: 'Order and attach circuits in NaaS · Connect', to: '/naas/connect' },
    },
    {
      key: 'cloud',
      label: 'Cloud',
      blurb: 'Every hyperscaler account scanned to the subnet, so exposure is a security question you can answer, not guess at.',
      stats: [
        { key: 'clouds', label: 'Clouds', value: c.clouds },
        { key: 'regions', label: 'Regions', value: c.regions },
        { key: 'vpcs', label: 'VPC · VNet', value: c.vpcs },
        { key: 'subnets', label: 'Subnets', value: c.subnets },
        { key: 'workloads', label: 'Workloads', value: c.workloads },
        { key: 'attached', label: 'Attached', value: c.attached },
      ],
      cta: { label: 'Attach these VPCs in NaaS · Connect', to: '/naas/connect' },
    },
    {
      key: 'ai',
      label: 'AI workflows',
      /* A static sentence here would drift the moment `aiExposed()` reaches 0 —
         through the tour's own beat (`cloudConnectTour.ts:160`) or either
         Observe/Govern action card (`state-actions.ts:36,65`), all three call
         `CC.activateOnramp('nb2')`.

         Three branches, because "closed" needs two predicates, not one.
         `aiExposed()` counts VPCs; a single `activateOnramp('nb2')` zeroes it
         while `/naas/observe` still lists `rd-helion → AI endpoints` at 12.8
         Gbps and `shared-services → AI endpoints` at 7.2 Gbps on Public
         internet / Uncontrolled — rooted in SOURCE regions nb2 does not
         attach, and clearable by no action in the app. The middle branch is
         that state, stated with the same figure that table sums to. All three
         name security, so the thesis-word guard keeps passing in every
         reachable state, precedent `state-actions.ts:44`. */
      blurb: aiExposed
        ? 'GPU regions, models, and the agents calling them — with the AI endpoints still riding public internet, the security gap in this domain.'
        : aiFlowPublic > 0
          ? `GPU regions, models, and the agents calling them — every AI endpoint is on a private path, and ${aiFlowPublic} Gbps of traffic still reaches them from source regions that are not: the rest of the security gap, itemised in NaaS · Observe.`
          /* Scoped, deliberately. This branch measures two BYTES-layer facts —
             endpoints attached, and Gbps of flow reaching them under control —
             and neither is a statement about token spend. An identity can meter
             ungoverned tokens over the public internet in exactly this estate
             (AI Fabric · Cost states that figure from its own engine bucket),
             so a bare "the security gap in this domain closed" would be denied
             one screen away. It names the layer it measured and points at the
             one it did not. */
          : 'GPU regions, models, and the agents calling them — every AI endpoint on a private path and every flow reaching them under AT&T control, the network-layer security gap in this domain closed. Token-layer governance is metered separately in AI Fabric · Observe.',
      stats: [
        { key: 'aiRegions', label: 'AI regions', value: allRegions.filter(r => r.ai).length },
        { key: 'models', label: 'Models', value: models.length },
        { key: 'agents', label: 'Agents', value: agents.length },
        { key: 'aiExposed', label: 'Exposed endpoints', value: aiExposed },
      ],
      cta: { label: 'Attach and govern these in AI Fabric · Providers', to: '/ai/providers' },
    },
  ];
}

/** Every expandable key in the tree — used by Expand-all. */
export function allKeys(cc: CloudControl): string[] {
  const keys: string[] = [];
  for (const c of cc.clouds as Cloud[]) {
    keys.push(cloudKey(c.id));
    for (const r of regionsOf(cc, c.id)) {
      keys.push(regionKey(c.id, r.id));
      for (const v of vpcsOf(cc, r.id)) keys.push(vpcKey(c.id, r.id, v.id));
    }
  }
  return keys;
}

/** Immutable toggle: returns a new Set with `key` flipped. */
export function toggleKey(open: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(open);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/**
 * Port of the original `updateScope()` — a human summary of how deep the tree
 * is currently expanded. Resource maps (depth-3 keys) win over regions.
 */
export function openSummary(open: ReadonlySet<string>): string {
  let maps = 0;
  let regions = 0;
  open.forEach(k => {
    const depth = k.split('/').length;
    if (depth === 3) maps++;
    else if (depth === 2) regions++;
  });
  if (maps) return `${maps} resource map${maps > 1 ? 's' : ''} expanded`;
  if (regions) return `${regions} region${regions > 1 ? 's' : ''} expanded`;
  return 'collapsed view';
}

/**
 * Tag chip color. The engine ships `finance-invoices` with an amber hex, but
 * the light Flywheel theme forbids amber, so that one policy tag renders in
 * neutral slate (its meaning — "no direct internet" — reads as an attention
 * tag, not a warm alert). Every other tag keeps its own hue.
 */
const TAG_HEX_OVERRIDE: Record<string, string> = { 'finance-invoices': '#64748b' };
export function tagHex(id: string, tags: Record<string, Tag>): string {
  return TAG_HEX_OVERRIDE[id] ?? tags[id]?.hex ?? '#64748b';
}
export function tagLabel(id: string, tags: Record<string, Tag>): string {
  return tags[id]?.label ?? id;
}

/* --------------------------- rollups --------------------------- */

/** Rows above this count collapse behind a rollup disclosure rather than
 *  listing every leaf — the estate-scale threshold the discover tree and
 *  filters share. */
export const ROLLUP_THRESHOLD = 50;
export const needsRollup = (count: number): boolean => count > ROLLUP_THRESHOLD;

export const CLASS_ORDER: SiteClass[] = ['dc', 'office', 'branch', 'atm'];

/** Lowercase plural nouns for a rollup row's prose ("2,840 branches"),
 *  matching `CLASS_ORDER`'s fixed dc→office→branch→atm order. Distinct from
 *  `EstateFilterChips`'s capitalized `SITE_CLASS_LABEL` (a chip label), which
 *  reads as a heading, not a sentence. */
export const SITE_CLASS_PLURAL: Record<SiteClass, string> = {
  dc: 'data centers', office: 'offices', branch: 'branches', atm: 'ATMs',
};

/** One row per site class actually present, in fixed dc→office→branch→atm
 *  order (absent classes omitted rather than zero-filled — a customer with
 *  no ATMs sees no ATM row, not a row that reads 0). `onNet` counts branches
 *  in that class carrying an `onrampId`, i.e. reachable over an AT&T circuit
 *  today, not merely inventoried. */
export function siteRollup(cc: CloudControl): { siteClass: SiteClass; count: number; onNet: number }[] {
  const acc = new Map<SiteClass, { count: number; onNet: number }>();
  for (const b of branchesOf(cc)) {
    const row = acc.get(b.siteClass) ?? { count: 0, onNet: 0 };
    row.count += 1;
    if (b.onrampId) row.onNet += 1;
    acc.set(b.siteClass, row);
  }
  return CLASS_ORDER.filter(c => acc.has(c)).map(c => ({ siteClass: c, ...acc.get(c)! }));
}

/**
 * One row per cloud with its region and workload counts.
 *
 * The brief's sketch read `cc.fabricModel().clouds` — `fabricModel()` has no
 * `clouds` field (`sites`/`onramps`/`regions`/`c2c` only; see
 * `src/engine/types.ts`), and its `regions` carry no workload count. Cloud
 * identity/name/workloads come off the engine's own `clouds` seed instead
 * (`cc.clouds`, already read the same way by `allKeys()` above), and the
 * region count reuses `cloudRegionCount`, the derivation this file already
 * exposes and tests for the same seed.
 */
export function cloudRollup(cc: CloudControl): { cloudId: string; name: string; regions: number; workloads: number }[] {
  return (cc.clouds as Cloud[]).map(cl => ({
    cloudId: cl.id,
    name: cl.name,
    regions: cloudRegionCount(cc, cl.id),
    workloads: cl.workloads,
  }));
}

/** Gateway accent colors — de-ambered (NAT moves from amber to slate). */
export const GW_COLOR: Record<string, string> = {
  igw: '#0057b8', // cobalt — internet gateway
  nat: '#64748b', // slate — NAT (was amber in the original)
  dx: '#00a862', // green — Direct Connect / ExpressRoute
  s3: '#af29bb', // purple — service endpoint
  tgw: '#0891b2', // teal — transit / vWAN hub
  fw: '#c70032', // red — inspection firewall
};
