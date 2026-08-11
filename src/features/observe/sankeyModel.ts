import type { CloudControl } from '../../engine/types';
import { DST_LABELS } from './flowLogs';
import { branchesOf, SITE_CLASS_PLURAL, type SiteClass } from '../discover/discoveryModel';

/* Branch-originated flow rows (state-rules.ts flows()) - mirrored the same
 * way flowLogs.ts mirrors them: only the fields this band reads. */
interface BranchFlowRow {
  srcBranch?: string;
  dstCloud?: string | null;
  viaPublic?: boolean;
  gbps: number;
}

const nfSite = new Intl.NumberFormat('en-US');

// Shape of a routeFlows() row (src/engine/state-routing.ts) — untyped at the
// source (// @ts-nocheck), so we mirror the fields this binding consumes.
// c2c rows use '↔' (state-routing.ts:120) — their label format is
// "${A.cloud.name} ${A.r.name} ↔ ${B.cloud.name} ${B.r.name}" — the source
// for Sankey is the left side (region name before ↔).
interface RouteFlowRow {
  id: string;
  kind?: 'app' | 'c2c';
  label: string;
  gbps: number;
  dst?: string; // present on app rows only (kind: 'app')
  current: { attControlled: boolean };
}

/** Every row's source, dest, and path, derived once and shared by both the
 *  node-collection pass and the link-building pass below — so the two
 *  passes can never drift from each other on how a row is read.
 *
 *  Dest for app rows comes from `row.dst` via flowLogs' own DST_LABELS —
 *  the SAME map flow-log records use for their `dst` field — not from
 *  parsing `row.label` (state-routing.ts's own DST_LABEL is a *different*,
 *  lowercase-cased map meant for its log line, e.g. 'object storage'; the
 *  Sankey dest band needs to read the same node names Flow Logs does, e.g.
 *  'Object storage', or the two surfaces disagree over the exact same
 *  data). The label parse is kept only as a fallback for a `dst` this map
 *  doesn't recognize. */
function rowEndpoints(row: RouteFlowRow): { source: string; dest: string; pathKind: 'private' | 'public' } {
  const pathKind: 'private' | 'public' = row.current.attControlled ? 'private' : 'public';

  if (row.kind === 'c2c') {
    // c2c source: left side of '↔' (e.g. "AWS us-east-1")
    return { source: row.label.split('↔')[0].trim(), dest: 'Inter-cloud', pathKind };
  }

  const source = row.label.split('→')[0].trim();
  const dest = (row.dst && DST_LABELS[row.dst]) || row.label.split('→')[1]?.trim() || '';
  return { source, dest, pathKind };
}

export interface SankeyNode {
  name: string;
  band: 'source' | 'path' | 'dest';
  /** Present on site-origin rollup nodes ("2,840 branches") - the class
   *  and how many sites it aggregates. Never one node per site. */
  rollup?: { siteClass: SiteClass; count: number };
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
  pathKind: 'private' | 'public';
}

export interface SankeyModel {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export const PATH_NODES = {
  private: 'AT&T fabric',
  public: 'Public internet',
};

export function buildSankey(cc: CloudControl): SankeyModel {
  const rows = cc.routeFlows() as RouteFlowRow[];

  // Collect all sources and destinations
  const sourcesSet = new Set<string>();
  const destsSet = new Set<string>();

  for (const row of rows) {
    const { source, dest } = rowEndpoints(row);
    sourcesSet.add(source);
    destsSet.add(dest);
  }

  /* Site-origin band: the customer's own sites, rolled up by class - the
   * Wells Fargo answer on the money screen. Branch flow rows (one per
   * branch x reachable VPC - ~35k under the bank estate) aggregate to at
   * most four source nodes ("2,840 branches"), each linking through the
   * path band to the cloud it reaches. Never one node per site. */
  const branchClass = new Map<string, SiteClass>();
  const classCount = new Map<SiteClass, number>();
  for (const b of branchesOf(cc)) {
    branchClass.set(b.id, b.siteClass);
    classCount.set(b.siteClass, (classCount.get(b.siteClass) ?? 0) + 1);
  }
  const cloudName = new Map<string, string>();
  for (const c of (cc.clouds ?? []) as { id: string; name: string }[]) cloudName.set(c.id, c.name);
  // class -> pathKind -> dest cloud name -> gbps
  const siteAgg = new Map<SiteClass, Map<'private' | 'public', Map<string, number>>>();
  const ccFlows = (cc as unknown as { flows?: () => BranchFlowRow[] }).flows;
  const branchRows = (ccFlows ? ccFlows() : []).filter(r => r.srcBranch);
  for (const r of branchRows) {
    const cls = branchClass.get(r.srcBranch as string);
    const dest = cloudName.get(r.dstCloud ?? '');
    if (!cls || !dest) continue;
    const kind: 'private' | 'public' = r.viaPublic ? 'public' : 'private';
    const byKind = siteAgg.get(cls) ?? new Map();
    const byDest = byKind.get(kind) ?? new Map<string, number>();
    byDest.set(dest, (byDest.get(dest) ?? 0) + r.gbps);
    byKind.set(kind, byDest);
    siteAgg.set(cls, byKind);
    destsSet.add(dest);
  }
  const siteNodes: SankeyNode[] = [...siteAgg.keys()]
    .sort((a, b) => (classCount.get(b) ?? 0) - (classCount.get(a) ?? 0))
    .map(cls => ({
      name: `${nfSite.format(classCount.get(cls) ?? 0)} ${SITE_CLASS_PLURAL[cls]}`,
      band: 'source' as const,
      rollup: { siteClass: cls, count: classCount.get(cls) ?? 0 },
    }));

  // Build node arrays - site rollups lead the source band.
  const sourceNodes: SankeyNode[] = [
    ...siteNodes,
    ...Array.from(sourcesSet).sort().map(name => ({
      name,
      band: 'source' as const,
    })),
  ];

  const pathNodes: SankeyNode[] = [
    { name: PATH_NODES.private, band: 'path' },
    { name: PATH_NODES.public, band: 'path' },
  ];

  const destNodes: SankeyNode[] = Array.from(destsSet).sort().map(name => ({
    name,
    band: 'dest' as const,
  }));

  const nodes = [...sourceNodes, ...pathNodes, ...destNodes];

  // Create a map for quick index lookups
  const nodeIndex = new Map<string, number>();
  nodes.forEach((node, i) => {
    nodeIndex.set(`${node.band}:${node.name}`, i);
  });

  // Build links: aggregate by source->path and path->dest pairs
  const sourceToPaths = new Map<string, number>(); // key: "sourceIdx:pathIdx" -> value
  const pathToDests = new Map<string, number>(); // key: "pathIdx:destIdx" -> value

  for (const row of rows) {
    const { source, dest, pathKind } = rowEndpoints(row);

    const sourceIdx = nodeIndex.get(`source:${source}`)!;

    const pathName = pathKind === 'private' ? PATH_NODES.private : PATH_NODES.public;
    const pathIdx = nodeIndex.get(`path:${pathName}`)!;

    const destIdx = nodeIndex.get(`dest:${dest}`)!;

    // Aggregate source->path link
    const sourcePathKey = `${sourceIdx}:${pathIdx}`;
    sourceToPaths.set(sourcePathKey, (sourceToPaths.get(sourcePathKey) ?? 0) + row.gbps);

    // Aggregate path->dest link
    const pathDestKey = `${pathIdx}:${destIdx}`;
    pathToDests.set(pathDestKey, (pathToDests.get(pathDestKey) ?? 0) + row.gbps);
  }

  // Convert aggregated links to array format
  const links: SankeyLink[] = [];

  // Add source->path links
  for (const [key, value] of sourceToPaths) {
    const [sourceIdx, pathIdx] = key.split(':').map(Number);
    const pathNode = nodes[pathIdx];
    const pathKind = pathNode.name === PATH_NODES.private ? 'private' : 'public';
    links.push({
      source: sourceIdx,
      target: pathIdx,
      value,
      pathKind,
    });
  }

  // Add path->dest links
  for (const [key, value] of pathToDests) {
    const [pathIdx, destIdx] = key.split(':').map(Number);
    const pathNode = nodes[pathIdx];
    const pathKind = pathNode.name === PATH_NODES.private ? 'private' : 'public';
    links.push({
      source: pathIdx,
      target: destIdx,
      value,
      pathKind,
    });
  }

  // Site-band links: class rollup -> path, path -> dest cloud. Same
  // two-hop shape as the route-flow links above; values are summed gbps
  // of real branch flows, rounded to keep the labels readable.
  for (const [cls, byKind] of siteAgg) {
    const clsIdx = nodes.findIndex(n => n.rollup?.siteClass === cls);
    for (const [kind, byDest] of byKind) {
      const pathIdx = nodeIndex.get(`path:${kind === 'private' ? PATH_NODES.private : PATH_NODES.public}`)!;
      let total = 0;
      for (const [dest, gbps] of byDest) {
        const destIdx = nodeIndex.get(`dest:${dest}`)!;
        const v = Math.round(gbps * 10) / 10;
        total += v;
        links.push({ source: pathIdx, target: destIdx, value: v, pathKind: kind });
      }
      links.push({ source: clsIdx, target: pathIdx, value: Math.round(total * 10) / 10, pathKind: kind });
    }
  }

  return { nodes, links };
}
