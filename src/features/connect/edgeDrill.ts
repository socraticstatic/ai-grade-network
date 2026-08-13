import type { CloudControl } from '../../engine/types';
import type { Branch, SiteClass } from '../discover/discoveryModel';
import { CLASS_ORDER, siteClassNoun, ROLLUP_THRESHOLD } from '../discover/discoveryModel';
import { connectionOf, OFF_NET } from '../discover/estateFilters';

/**
 * The ingress column of the fabric diagram: a meta view of the whole estate
 * that descends, without a gap, to one building.
 *
 * Two things were wrong with the first cut.
 *
 * The hierarchy was `class → metro → site`. A bank does not think that way
 * and neither does its estate: a single city can hold hundreds of branches,
 * those cities sit inside states that carry their own compliance and org
 * lines, and states roll up into the bank's operating regions. Asking "how
 * exposed is Texas?" or "what does the Southeast look like?" had no level to
 * land on, and the last hop dropped from a metro straight onto an
 * unnavigable list of individual sites.
 *
 * And the level was TRUNCATED - seven rows and a "+ 6 more metros" lump.
 * That is the one thing a fleet view must never do, because the lump is
 * exactly where the exposure hides. The column is a fixed-height part of a
 * diagram and can only carry so many rows, so it now carries the largest few
 * and says so, while `EstateLevelMap` renders EVERY group at the level as a
 * tile - the way a host map does. Nothing is summarised away.
 *
 * The chain is data, not control flow, so a level can be inserted or the
 * order changed without touching a component:
 *
 *   class → region → state → metro → district → site
 */

export type EdgeDim = 'class' | 'region' | 'state' | 'metro' | 'district' | 'site';

/** The default descent. Class first: it is the estate's own top-level split
 *  (a data centre and an ATM are different machines, not different places),
 *  and geography orders itself underneath. */
export const DEFAULT_CHAIN: EdgeDim[] = ['class', 'region', 'state', 'metro', 'district', 'site'];

/** Geography-first, for the exec who thinks in territories rather than kit. */
export const GEO_CHAIN: EdgeDim[] = ['region', 'state', 'metro', 'class', 'district', 'site'];

export const CHAINS: { id: string; label: string; chain: EdgeDim[] }[] = [
  { id: 'class', label: 'Type → Region → State → Metro', chain: DEFAULT_CHAIN },
  { id: 'geo', label: 'Region → State → Metro → Type', chain: GEO_CHAIN },
];

export const DIM_LABEL: Record<EdgeDim, string> = {
  class: 'type',
  region: 'region',
  state: 'state',
  metro: 'metro',
  district: 'district',
  site: 'site',
};

/** Plural nouns for the level's own prose ("all 35 metros"). */
export const DIM_PLURAL: Record<EdgeDim, string> = {
  class: 'types',
  region: 'regions',
  state: 'states',
  metro: 'metros',
  district: 'districts',
  site: 'sites',
};

/**
 * Where the viewer is standing: one value per level already descended, in
 * chain order. An empty path is the top of the estate.
 */
export interface EdgeDrill {
  path: string[];
  chain: EdgeDim[];
}

export const NO_EDGE_DRILL: EdgeDrill = { path: [], chain: DEFAULT_CHAIN };

export type EdgeIcon = 'dc' | 'office' | 'branch' | 'atm' | 'region' | 'state' | 'metro' | 'district' | 'site';

export interface EdgeNode {
  /** Namespaced by level, so a state key can never collide with a metro. */
  id: string;
  /** The raw value this node stands for — what gets pushed onto the path. */
  value: string;
  label: string;
  /** The count line — always present, always the honest denominator. */
  sub: string;
  count: number;
  onFabric: number;
  /** Dominant first-mile transport across the members, or null for off-net. */
  firstMile: string | null;
  /** True when there is another level below this one. */
  drillable: boolean;
  /** 0..1 on the AT&T fabric — the figure the node's share bar draws. */
  share: number;
  icon: EdgeIcon;
  members: Branch[];
}

export type EdgeSort = 'largest' | 'exposed' | 'name';

export const SORTS: { id: EdgeSort; label: string }[] = [
  { id: 'largest', label: 'Largest' },
  { id: 'exposed', label: 'Most exposed' },
  { id: 'name', label: 'A–Z' },
];

/** The diagram column is a fixed height. The level map carries the rest. */
export const COLUMN_MAX = 7;

const fmt = (n: number) => n.toLocaleString('en-US');

/* ------------------------------ dimensions ----------------------------- */

const UNKNOWN = 'Unassigned';

/** How each level reads a value off a site. */
export function dimValue(dim: EdgeDim, b: Branch): string {
  switch (dim) {
    case 'class': return b.siteClass;
    case 'region': return b.region ?? UNKNOWN;
    case 'state': return b.state ?? UNKNOWN;
    case 'metro': return b.city || UNKNOWN;
    case 'district': return b.district ?? 'All sites';
    case 'site': return b.id;
  }
}

function dimLabel(dim: EdgeDim, value: string, members: Branch[]): string {
  if (dim === 'class') return capitalize(siteClassNoun(value as SiteClass, members.length));
  if (dim === 'site') return members[0]?.name ?? value;
  if (dim === 'district') return `${value} district`;
  return value;
}

function dimIcon(dim: EdgeDim, value: string): EdgeIcon {
  if (dim === 'class') return value as EdgeIcon;
  return dim as EdgeIcon;
}

/**
 * The levels still below the viewer, given where they are.
 *
 * A level that cannot split its members is skipped rather than drawn: an
 * office has no district, and a "district" level holding one group called
 * "All sites" is a step that costs a click and says nothing.
 */
function levelsBelow(drill: EdgeDrill, members: Branch[]): EdgeDim[] {
  const rest = drill.chain.slice(drill.path.length + 1);
  return rest.filter(dim => {
    if (dim === 'site') return members.length > 1;
    const distinct = new Set(members.map(b => dimValue(dim, b)));
    return distinct.size > 1;
  });
}

/* -------------------------------- nodes -------------------------------- */

/**
 * The transport a group rides, when the group agrees on one. A mixed group
 * gets "mixed" rather than a plurality dressed as a fact.
 */
function dominantFirstMile(cc: CloudControl, members: Branch[]): string | null {
  const seen = new Set<string>();
  for (const b of members) {
    const conn = connectionOf(cc, b);
    seen.add(conn);
    if (seen.size > 2) break;
  }
  if (seen.size === 0) return null;
  if (seen.size === 1) {
    const only = [...seen][0];
    return only === OFF_NET ? null : only;
  }
  return 'mixed';
}

/**
 * A group's one-line summary, sized to fit the node box: the count, then the
 * on-fabric share as a percentage rather than a second raw number.
 */
function groupSub(count: number, onFabric: number): string {
  if (onFabric === 0) return `${fmt(count)} · none on fabric`;
  if (onFabric === count) return `${fmt(count)} · all on fabric`;
  return `${fmt(count)} · ${Math.round((onFabric / count) * 100)}% on fabric`;
}

function toNode(
  cc: CloudControl,
  dim: EdgeDim,
  value: string,
  members: Branch[],
  drillable: boolean,
): EdgeNode {
  const onFabric = members.filter(b => b.onrampId).length;
  return {
    id: `edge:${dim}:${value}`,
    value,
    label: dimLabel(dim, value, members),
    sub: members.length === 1 ? (onFabric === 1 ? 'on the fabric' : 'public internet') : groupSub(members.length, onFabric),
    count: members.length,
    onFabric,
    firstMile: dominantFirstMile(cc, members),
    drillable,
    share: members.length ? onFabric / members.length : 0,
    icon: dimIcon(dim, value),
    members,
  };
}

/* ------------------------------ traversal ------------------------------ */

/** The sites in scope at the viewer's current position. */
export function membersAt(branches: Branch[], drill: EdgeDrill): Branch[] {
  let scope = branches;
  drill.path.forEach((value, i) => {
    const dim = drill.chain[i];
    scope = scope.filter(b => dimValue(dim, b) === value);
  });
  return scope;
}

/** The dimension the current level is grouped by, or null past the leaf. */
export function currentDim(drill: EdgeDrill): EdgeDim | null {
  return drill.chain[drill.path.length] ?? null;
}

function sortNodes(rows: EdgeNode[], sort: EdgeSort): EdgeNode[] {
  const by = [...rows];
  if (sort === 'name') by.sort((a, b) => a.label.localeCompare(b.label));
  else if (sort === 'exposed') by.sort((a, b) => (b.count - b.onFabric) - (a.count - a.onFabric) || b.count - a.count);
  else by.sort((a, b) => b.count - a.count);
  return by;
}

/**
 * EVERY group at the current level — never a truncated set. Callers that can
 * only draw a few take the head; the level map draws all of them.
 */
export function levelNodes(
  cc: CloudControl,
  branches: Branch[],
  drill: EdgeDrill,
  opts?: { sort?: EdgeSort; query?: string },
): EdgeNode[] {
  const dim = currentDim(drill);
  if (!dim) return [];
  const scope = membersAt(branches, drill);

  const acc = new Map<string, Branch[]>();
  for (const b of scope) {
    const v = dimValue(dim, b);
    const row = acc.get(v);
    if (row) row.push(b);
    else acc.set(v, [b]);
  }

  let rows = [...acc.entries()].map(([value, members]) =>
    toNode(cc, dim, value, members, levelsBelow(drill, members).length > 0),
  );

  // Site classes have a fixed, meaningful order; everything else is ranked.
  if (dim === 'class') {
    rows.sort((a, b) => CLASS_ORDER.indexOf(a.value as SiteClass) - CLASS_ORDER.indexOf(b.value as SiteClass));
  } else {
    rows = sortNodes(rows, opts?.sort ?? 'largest');
  }

  const q = opts?.query?.trim().toLowerCase();
  return q ? rows.filter(r => r.label.toLowerCase().includes(q)) : rows;
}

/**
 * Descend into a node, or null when it is an individual site.
 *
 * Levels that cannot split this particular node are dropped from the chain
 * on the way down rather than drawn: offices have no district, and Georgia
 * has one metro. A click that produces a single group identical to the one
 * you just left is a click that wasted the viewer's time.
 */
export function descend(drill: EdgeDrill, node: EdgeNode): EdgeDrill | null {
  if (!node.drillable) return null;
  const path = [...drill.path, node.value];
  let chain = drill.chain;
  while (path.length < chain.length) {
    const dim = chain[path.length];
    const splits = dim === 'site'
      ? node.members.length > 1
      : new Set(node.members.map(b => dimValue(dim, b))).size > 1;
    if (splits) return { path, chain };
    chain = [...chain.slice(0, path.length), ...chain.slice(path.length + 1)];
  }
  return null;
}

/** Breadcrumb — each hop is a level you can step back to. */
export function edgeTrail(branches: Branch[], drill: EdgeDrill): { label: string; drill: EdgeDrill }[] {
  const trail: { label: string; drill: EdgeDrill }[] = [
    { label: 'Whole estate', drill: { path: [], chain: drill.chain } },
  ];
  drill.path.forEach((value, i) => {
    const dim = drill.chain[i];
    const path = drill.path.slice(0, i + 1);
    const members = membersAt(branches, { path, chain: drill.chain });
    trail.push({ label: dimLabel(dim, value, members), drill: { path, chain: drill.chain } });
  });
  return trail;
}

/** The group the viewer is standing inside, or null at the top. */
export function scopeNode(cc: CloudControl, branches: Branch[], drill: EdgeDrill): EdgeNode | null {
  if (drill.path.length === 0) return null;
  const dim = drill.chain[drill.path.length - 1];
  const value = drill.path[drill.path.length - 1];
  const members = membersAt(branches, drill);
  if (members.length === 0) return null;
  const node = toNode(cc, dim, value, members, levelsBelow(drill, members).length > 0);
  // Name it in full, so "North district" reads as "Dallas · North district".
  const context = drill.path.slice(0, -1).filter((_, i) => drill.chain[i] !== 'class');
  return context.length ? { ...node, label: `${context[context.length - 1]} · ${node.label}` } : node;
}

/**
 * The caption under the level: what the viewer is standing on, and how much
 * of the level the column could draw. Never implies the column is complete.
 */
export function edgeCaption(shown: EdgeNode[], total: number, all: number, dim: EdgeDim | null): string {
  const sites = shown.reduce((n, r) => n + r.count, 0);
  const onFabric = shown.reduce((n, r) => n + r.onFabric, 0);
  if (sites === 0) return 'No sites match the current filters.';
  const scope = sites === total ? 'the whole estate' : `${fmt(sites)} of ${fmt(total)} sites`;
  const level = dim && all > shown.length ? ` · ${fmt(shown.length)} of ${fmt(all)} ${DIM_PLURAL[dim]} drawn` : '';
  return `${fmt(onFabric)} of ${fmt(sites)} on the AT&T fabric — ${scope}${level}.`;
}

export const edgeNeedsRollup = (total: number): boolean => total > ROLLUP_THRESHOLD;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
