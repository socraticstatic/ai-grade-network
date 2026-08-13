import type { CloudControl } from '../../engine/types';
import type { Branch, SiteClass } from '../discover/discoveryModel';
import { branchesOf, CLASS_ORDER, siteClassNoun, ROLLUP_THRESHOLD } from '../discover/discoveryModel';
import { connectionOf, regionOf, OFF_NET } from '../discover/estateFilters';

/**
 * The ingress column of the fabric diagram, made real and drillable.
 *
 * It used to be five hardcoded archetypes — HQ, DC, Branch, Mobility,
 * Internet — which is a fine teaching picture for a nine-site estate and a
 * lie for a bank with 4,183 premises: every branch in the country collapsed
 * into one anonymous box labelled "Branch", with no count, no on-fabric
 * share, and nothing to click. The right column had eight real cloud regions
 * you could interrogate; the left had cartoons.
 *
 * So the column now descends the estate the same way Discover's tree and the
 * Observe sankey do — rollup first, one level at a time:
 *
 *   class  →  Branches (2,840 sites)
 *   metro  →  Dallas (312 sites)
 *   site   →  Branch · Dallas 04
 *
 * Each level answers "how many, and how many of them are already on the
 * fabric" before it offers anything to click, which is the whole rollup-first
 * contract: never render 2,840 rows, always say 2,840.
 */

export type EdgeLevel = 'class' | 'metro' | 'site';

export interface EdgeDrill {
  siteClass?: SiteClass | null;
  metro?: string | null;
}

export const NO_EDGE_DRILL: EdgeDrill = { siteClass: null, metro: null };

export interface EdgeNode {
  /** Namespaced so a class key can never collide with a branch id. */
  id: string;
  label: string;
  /** The count line — always present, always the honest denominator. */
  sub: string;
  count: number;
  onFabric: number;
  /** Dominant first-mile transport across the members, or null for off-net. */
  firstMile: string | null;
  /** True when clicking descends a level rather than just selecting. */
  drillable: boolean;
  members: Branch[];
}

/** The column never grows past this — beyond it, the tail becomes one row. */
const COLUMN_MAX = 7;

const fmt = (n: number) => n.toLocaleString('en-US');

/** The metro a site sits in. Branch names carry their city already. */
const metroOf = (b: Branch): string => b.city || regionOf(b) || 'unknown';

/**
 * The transport a group rides, when the group agrees on one. A mixed group
 * gets "mixed" rather than a plurality dressed as a fact — the whole point of
 * this column is that a viewer can trust the label without opening it.
 */
function dominantFirstMile(cc: CloudControl, members: Branch[]): string | null {
  const seen = new Set<string>();
  for (const b of members) {
    const conn = connectionOf(cc, b);
    if (conn === OFF_NET) {
      seen.add(OFF_NET);
      continue;
    }
    seen.add(conn);
    // Three distinct transports is already "mixed"; no need to walk 2,840.
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
 * on-fabric share as a percentage rather than a second raw number. "2,840 ·
 * 99% on fabric" reads at 10px; "2,840 branches · 2,812 on fabric" does not,
 * and the exact second figure is one click away in the panel below.
 */
function groupSub(count: number, onFabric: number): string {
  if (onFabric === 0) return `${fmt(count)} · none on fabric`;
  if (onFabric === count) return `${fmt(count)} · all on fabric`;
  return `${fmt(count)} · ${Math.round((onFabric / count) * 100)}% on fabric`;
}

function toNode(
  cc: CloudControl,
  id: string,
  label: string,
  members: Branch[],
  drillable: boolean,
): EdgeNode {
  const onFabric = members.filter(b => b.onrampId).length;
  return {
    id,
    label,
    sub: members.length === 1 ? (onFabric === 1 ? 'on the fabric' : 'public internet') : groupSub(members.length, onFabric),
    count: members.length,
    onFabric,
    firstMile: dominantFirstMile(cc, members),
    drillable,
    members,
  };
}

/** Group members by a key, preserving first-seen order. */
function groupBy(members: Branch[], keyOf: (b: Branch) => string): Map<string, Branch[]> {
  const acc = new Map<string, Branch[]>();
  for (const b of members) {
    const k = keyOf(b);
    const row = acc.get(k);
    if (row) row.push(b);
    else acc.set(k, [b]);
  }
  return acc;
}

/**
 * Trim a grouped level to the column budget: the biggest groups by count,
 * then one honest tail row naming what was left out. Never a silent cut.
 */
function withTail(rows: EdgeNode[], tailNoun: string): EdgeNode[] {
  if (rows.length <= COLUMN_MAX) return rows;
  const kept = rows.slice(0, COLUMN_MAX - 1);
  const rest = rows.slice(COLUMN_MAX - 1);
  const members = rest.flatMap(r => r.members);
  const onFabric = members.filter(b => b.onrampId).length;
  kept.push({
    id: 'edge:rest',
    label: `+ ${fmt(rest.length)} more ${tailNoun}`,
    sub: groupSub(members.length, onFabric),
    count: members.length,
    onFabric,
    firstMile: null,
    drillable: false,
    members,
  });
  return kept;
}

/**
 * The column's rows for the current drill, over a caller-supplied set of
 * branches (already filtered by the estate facets, so a filter narrows the
 * left column exactly as it narrows every other surface).
 */
export function edgeNodes(cc: CloudControl, branches: Branch[], drill: EdgeDrill): EdgeNode[] {
  const cls = drill.siteClass ?? null;
  const metro = drill.metro ?? null;

  if (!cls) {
    const byClass = groupBy(branches, b => b.siteClass);
    return CLASS_ORDER.filter(c => byClass.has(c)).map(c => {
      const members = byClass.get(c)!;
      return toNode(
        cc,
        `edge:class:${c}`,
        capitalize(siteClassNoun(c, members.length)),
        members,
        members.length > 1,
      );
    });
  }

  const inClass = branches.filter(b => b.siteClass === cls);

  if (!metro) {
    const byMetro = groupBy(inClass, metroOf);
    const rows = [...byMetro.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([m, members]) =>
        toNode(cc, `edge:metro:${m}`, m, members, members.length > 1),
      );
    return withTail(rows, 'metros');
  }

  const inMetro = inClass.filter(b => metroOf(b) === metro);
  const rows = inMetro.map(b =>
    toNode(cc, `edge:site:${b.id}`, b.name, [b], false),
  );
  return withTail(rows, 'sites');
}

/**
 * The group the column is currently standing inside, or null at the root.
 *
 * Without this the group panel was unreachable: every rollup node descends
 * rather than selects, so "2,840 branches, 40% of the ATMs still public" —
 * the whole reason to look at this column — had nowhere to be said. Drilling
 * into a level now puts that level's summary in the panel below.
 */
export function scopeNode(cc: CloudControl, branches: Branch[], drill: EdgeDrill): EdgeNode | null {
  if (!drill.siteClass) return null;
  const inClass = branches.filter(b => b.siteClass === drill.siteClass);
  if (!drill.metro) {
    return toNode(
      cc,
      `edge:class:${drill.siteClass}`,
      capitalize(siteClassNoun(drill.siteClass, inClass.length)),
      inClass,
      false,
    );
  }
  const inMetro = inClass.filter(b => metroOf(b) === drill.metro);
  return toNode(cc, `edge:metro:${drill.metro}`, `${drill.metro} · ${capitalize(siteClassNoun(drill.siteClass, inMetro.length))}`, inMetro, false);
}

/** Breadcrumb for the column — each hop is a drill you can step back to. */
export function edgeTrail(drill: EdgeDrill): { label: string; drill: EdgeDrill }[] {
  const trail: { label: string; drill: EdgeDrill }[] = [
    { label: 'All sites', drill: NO_EDGE_DRILL },
  ];
  if (drill.siteClass) {
    trail.push({
      label: capitalize(siteClassNoun(drill.siteClass, 2)),
      drill: { siteClass: drill.siteClass, metro: null },
    });
  }
  if (drill.siteClass && drill.metro) {
    trail.push({ label: drill.metro, drill: { ...drill } });
  }
  return trail;
}

/** What a click on a node descends to, or null when the node is a leaf. */
export function descend(drill: EdgeDrill, node: EdgeNode): EdgeDrill | null {
  if (!node.drillable) return null;
  if (node.id.startsWith('edge:class:')) {
    return { siteClass: node.id.slice('edge:class:'.length) as SiteClass, metro: null };
  }
  if (node.id.startsWith('edge:metro:')) {
    return { siteClass: drill.siteClass ?? null, metro: node.id.slice('edge:metro:'.length) };
  }
  return null;
}

/**
 * The caption under the column: how much of the estate this view is standing
 * on. Stated in full so a drilled column never reads as the whole estate.
 */
export function edgeCaption(shown: EdgeNode[], total: number): string {
  const sites = shown.reduce((n, r) => n + r.count, 0);
  const onFabric = shown.reduce((n, r) => n + r.onFabric, 0);
  if (sites === 0) return 'No sites match the current filters.';
  const scope = sites === total ? 'the estate' : `${fmt(sites)} of ${fmt(total)} sites`;
  return `${fmt(onFabric)} of ${fmt(sites)} on the AT&T fabric — ${scope}.`;
}

/** True when the estate is big enough that the column must roll up at all. */
export const edgeNeedsRollup = (total: number): boolean => total > ROLLUP_THRESHOLD;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
