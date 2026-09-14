import type { SankeyModel, SankeyNode, SankeyDrill } from './sankeyModel';
import { PATH_NODES } from './sankeyModel';
import { SankeyChart } from './SankeyChart';
import type { SiteClass } from '../discover/discoveryModel';
import { VIZ_HEX, ribbonPath } from '../../components/viz/kit';

/* ------------------------------------------------------------------ *
 * The Flow tab's ribbon diagram, hand-rolled in the FabricHero idiom:
 * deterministic geometry, Flywheel palette, no chart library. recharts'
 * generic Sankey rendered gray slivers and floating labels — on the one
 * screen sold as visibility-led, the paths have to BE the picture.
 *
 * Color carries exactly one meaning, the same one the whole app uses:
 * cobalt = riding the AT&T fabric, slate = exposed to the public
 * internet. Everything else is ink. The headline states the split so the
 * takeaway survives even a glance; the ribbons make the same claim in
 * proportion; the sr-only list restates every ribbon for screen readers
 * (the records table below is the full data view).
 * ------------------------------------------------------------------ */

const VIEW_W = 1000;
const SRC_BAR_X = 212;
const MID_X = 494;
const DEST_BAR_X = 748;
const BAR_W = 8;
const NODE_GAP = 16;
const RIBBON_GAP = 2;
const PLOT_INNER = 368;
const PAD_Y = 12;

export interface GNode {
  name: string;
  band: 'source' | 'path' | 'dest';
  x: number;
  y: number;
  h: number;
  value: number;
  fill: string;
  pathKind?: 'private' | 'public';
}
export interface GRibbon {
  d: string;
  fill: string;
  label: string;
  key: string;
}
export interface SankeyGeometry {
  w: number;
  h: number;
  nodes: GNode[];
  ribbons: GRibbon[];
  privateGbps: number;
  publicGbps: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Pure geometry: identical model in ⇒ identical layout out. */
export function computeSankeyGeometry(model: SankeyModel): SankeyGeometry {
  const nodeValue = (i: number) =>
    model.links.reduce((s, l) => s + (l.source === i || l.target === i ? l.value : 0), 0) /
    (model.nodes[i].band === 'path' ? 2 : 1);

  const idx = model.nodes.map((n, i) => ({ n, i, value: nodeValue(i) }));
  const privateIdx = idx.find(x => x.n.band === 'path' && x.n.name === 'AT&T fabric');
  const publicIdx = idx.find(x => x.n.band === 'path' && x.n.name !== 'AT&T fabric');

  /* Band orders. Sources: public-path flows first (they dominate), each
     group by size — this keeps ribbon crossings near zero. Mid: public on
     top for the same reason. Dests by size. */
  const srcKind = (i: number): 'private' | 'public' =>
    model.links.some(l => l.source === i && l.pathKind === 'private') ? 'private' : 'public';
  const sources = idx
    .filter(x => x.n.band === 'source')
    .sort((a, b) =>
      srcKind(a.i) === srcKind(b.i) ? b.value - a.value : srcKind(a.i) === 'public' ? -1 : 1,
    );
  const mids = [publicIdx, privateIdx].filter(Boolean) as typeof idx;
  const dests = idx.filter(x => x.n.band === 'dest').sort((a, b) => b.value - a.value);

  const bands = [sources, mids, dests];
  const scale = Math.min(
    ...bands.map(b => {
      const gaps = (b.length - 1) * NODE_GAP;
      const total = b.reduce((s, x) => s + x.value, 0) || 1;
      return (PLOT_INNER - gaps) / total;
    }),
  );

  const heights = new Map<number, number>();
  bands.flat().forEach(x => heights.set(x.i, Math.max(x.value * scale, 8)));
  const bandH = (b: typeof idx) =>
    b.reduce((s, x) => s + heights.get(x.i)!, 0) + (b.length - 1) * NODE_GAP;
  const h = Math.max(...bands.map(bandH)) + PAD_Y * 2;

  const yTop = new Map<number, number>();
  const xFor = (band: GNode['band']) => (band === 'source' ? SRC_BAR_X : band === 'path' ? MID_X : DEST_BAR_X);
  const nodes: GNode[] = [];
  for (const b of bands) {
    let y = (h - bandH(b)) / 2;
    for (const x of b) {
      yTop.set(x.i, y);
      nodes.push({
        name: x.n.name,
        band: x.n.band,
        x: xFor(x.n.band),
        y,
        h: heights.get(x.i)!,
        value: r1(x.value),
        fill:
          x.n.band === 'path'
            ? x.n.name === 'AT&T fabric'
              ? VIZ_HEX.cobalt
              : VIZ_HEX.slateMuted
            : VIZ_HEX.slateMuted,
        pathKind: x.n.band === 'path' ? (x.n.name === 'AT&T fabric' ? 'private' : 'public') : undefined,
      });
      y += heights.get(x.i)! + NODE_GAP;
    }
  }

  /* Ribbons. Offsets stack per node end; each end's thickness is the
     link's share of that node's height (minus the 2px gaps), so ribbons
     always stay inside their bars even where a min-height applied. */
  const linkCount = new Map<number, number>();
  model.links.forEach(l => {
    linkCount.set(l.source, (linkCount.get(l.source) ?? 0) + 1);
    linkCount.set(l.target, (linkCount.get(l.target) ?? 0) + 1);
  });
  const nodeTotal = new Map<number, number>();
  bands.flat().forEach(x => nodeTotal.set(x.i, x.value || 1));
  /* Two accumulators, deliberately separate: a path-band node is the TARGET
     of source→path ribbons and the SOURCE of path→dest ribbons, and each
     side stacks from the top of the bar independently. */
  const sAcc = new Map<number, number>();
  const tAcc = new Map<number, number>();
  const endThickness = (i: number, value: number) => {
    const inner = heights.get(i)! - (linkCount.get(i)! - 1) * RIBBON_GAP;
    return Math.max((value / nodeTotal.get(i)!) * inner, 2);
  };

  const bandOrder = new Map<number, number>();
  bands.flat().forEach((x, k) => bandOrder.set(x.i, k));
  const ordered = [...model.links].sort(
    (a, b) => bandOrder.get(a.source)! - bandOrder.get(b.source)! || bandOrder.get(a.target)! - bandOrder.get(b.target)!,
  );
  /* Target-side stacking must follow source order per target, so run a
     second pass keyed by target. */
  const byTarget = [...model.links].sort(
    (a, b) => bandOrder.get(a.target)! - bandOrder.get(b.target)! || bandOrder.get(a.source)! - bandOrder.get(b.source)!,
  );
  const tOffset = new Map<string, number>();
  const tKey = (l: { source: number; target: number }) => `${l.source}|${l.target}`;
  byTarget.forEach(l => {
    const prev = tAcc.get(l.target) ?? 0;
    tOffset.set(tKey(l), prev);
    tAcc.set(l.target, prev + endThickness(l.target, l.value) + RIBBON_GAP);
  });

  const ribbons: GRibbon[] = [];
  ordered.forEach(l => {
    const sPrev = sAcc.get(l.source) ?? 0;
    const st = endThickness(l.source, l.value);
    sAcc.set(l.source, sPrev + st + RIBBON_GAP);
    const tt = endThickness(l.target, l.value);
    const sy0 = yTop.get(l.source)! + sPrev;
    const ty0 = yTop.get(l.target)! + tOffset.get(tKey(l))!;
    const srcBand = model.nodes[l.source].band;
    const sx = (srcBand === 'source' ? SRC_BAR_X : MID_X) + BAR_W;
    const tx = model.nodes[l.target].band === 'path' ? MID_X : DEST_BAR_X;
    ribbons.push({
      key: tKey(l),
      label: `${model.nodes[l.source].name} → ${model.nodes[l.target].name} · ${r1(l.value)} Gbps`,
      fill: l.pathKind === 'private' ? VIZ_HEX.cobalt : VIZ_HEX.slate,
      d: ribbonPath(sx, sy0, tx, ty0, st, tt),
    });
  });

  return {
    w: VIEW_W,
    h,
    nodes,
    ribbons,
    privateGbps: r1(privateIdx?.value ?? 0),
    publicGbps: r1(publicIdx?.value ?? 0),
  };
}

function NodeLabel({ n }: { n: GNode }) {
  const mid = n.y + n.h / 2;
  const value = `${n.value} Gbps`;
  if (n.band === 'source') {
    return (
      <text x={SRC_BAR_X - 8} y={mid} dy="0.35em" textAnchor="end" fontSize={13}>
        <tspan fill={VIZ_HEX.ink} fontWeight={600}>{n.name}</tspan>
        <tspan fill={VIZ_HEX.inkSoft}>{` · ${value}`}</tspan>
      </text>
    );
  }
  if (n.band === 'dest') {
    return (
      <text x={DEST_BAR_X + BAR_W + 8} y={mid} dy="0.35em" fontSize={13}>
        <tspan fill={VIZ_HEX.ink} fontWeight={600}>{n.name}</tspan>
        <tspan fill={VIZ_HEX.inkSoft}>{` · ${value}`}</tspan>
      </text>
    );
  }
  /* Path node: the label rides above the bar in a white halo so it stays
     legible over the ribbons on either side. */
  return (
    <text
      x={MID_X + BAR_W / 2}
      y={n.y - 7}
      textAnchor="middle"
      fontSize={13.5}
      fontWeight={700}
      fill={n.pathKind === 'private' ? VIZ_HEX.cobalt : VIZ_HEX.inkSoft}
      stroke="var(--viz-halo, #ffffff)"
      strokeWidth={4}
      paintOrder="stroke"
    >
      {`${n.name} · ${n.value} Gbps`}
    </text>
  );
}

export function SankeyPanel({
  model,
  scope,
  drill = null,
  onDrill,
  drills,
  onDrills,
}: {
  model: SankeyModel;
  /** "All flows - N site-originated, M cloud-originated" under the chart. */
  scope?: { siteFlows: number; cloudFlows: number };
  drill?: SiteClass | null;
  onDrill?: (cls: SiteClass | null) => void;
  /** Per-band drill state and its setter - sites, paths, clouds. */
  drills?: SankeyDrill;
  onDrills?: (d: SankeyDrill) => void;
}) {
  const g = computeSankeyGeometry(model);
  const total = r1(g.privateGbps + g.publicGbps);
  const nf = new Intl.NumberFormat('en-US');
  /* Rollup nodes are the drillable ones - a class opens into its metros.
     Keyed by node NAME because geometry nodes carry no model index. */
  const rollupByName = new Map<string, NonNullable<SankeyNode['rollup']>>(
    model.nodes.filter(n => n.rollup).map(n => [n.name, n.rollup!]),
  );
  return (
    <div data-testid="sankey-panel">
      {/* The takeaway, stated before it is drawn. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-figma-base text-fw-heading">
          <span className="font-semibold">{g.publicGbps} of {total} Gbps</span> still rides the public
          internet · <span className="font-semibold" style={{ color: VIZ_HEX.cobalt }}>{g.privateGbps} Gbps</span> under
          AT&amp;T control
        </p>
        <span className="flex items-center gap-3 text-[11px] text-fw-bodyLight">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: VIZ_HEX.cobalt }} /> AT&amp;T fabric
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: VIZ_HEX.slate }} /> public internet
          </span>
        </span>
      </div>

      {/* Drilling is a click on the node itself now, so this row is a
          breadcrumb rather than a wall of chips: it says where you are and
          how to get back, and says nothing at all when you are at the top. */}
      {drill && onDrill && (
        <div className="mb-2 flex items-center gap-2 text-figma-xs" data-testid="sankey-drill">
          <span className="text-fw-bodyLight">Showing</span>
          <span className="font-semibold text-fw-heading">
            {[...rollupByName.entries()].find(([, r]) => r.siteClass === drill)?.[0] ?? drill} by metro
          </span>
          <button
            type="button"
            data-testid="sankey-drill-clear"
            onClick={() => onDrill(null)}
            className="rounded-full border border-fw-secondary px-2.5 py-0.5 font-medium text-fw-body transition-colors hover:border-fw-active hover:text-fw-link"
          >
            Back to all sites
          </button>
        </div>
      )}
      {drills?.path && onDrills && (
        <div className="mb-2 flex items-center gap-2 text-figma-xs" data-testid="sankey-path-drill">
          <span className="text-fw-bodyLight">Showing</span>
          <span className="font-semibold text-fw-heading">
            {drills.path === 'private' ? 'the AT&T fabric by circuit' : 'the public path by exit'}
          </span>
          <button
            type="button"
            onClick={() => onDrills({ ...drills, path: null })}
            className="rounded-full border border-fw-secondary px-2.5 py-0.5 font-medium text-fw-body transition-colors hover:border-fw-active hover:text-fw-link"
          >
            Collapse
          </button>
        </div>
      )}
      {!drill && !drills?.path && rollupByName.size > 0 && onDrill && (
        <p className="mb-2 text-figma-xs text-fw-bodyLight" data-testid="sankey-drill-hint">
          Click a site group to split it by metro, or a path to split it by circuit.
        </p>
      )}

      {/* The chart itself, on ECharts' sankey layout: it assigns depth,
          orders nodes to minimise crossings and relaxes them iteratively -
          none of which the hand-rolled version did, which is why bank-scale
          data crossed its own ribbons. Hovering isolates a path's whole
          trajectory; clicking a rollup node drills it. */}
      <SankeyChart
        model={model}
        activeName={drill ? model.nodes.find(n => n.rollup?.siteClass === drill)?.name ?? null : null}
        onNodeClick={node => {
          /* Any band can open. Sites split by metro, and the fabric (or the
             public path) splits into the circuits underneath it - "which of
             my on-ramps actually carries the branches" is the question a
             bank asks the moment it sees how little is on-net. */
          if (node.rollup && onDrill) {
            onDrill(drill === node.rollup.siteClass ? null : node.rollup.siteClass);
            return;
          }
          if (node.band === 'path' && onDrills) {
            const isPrivate = node.name === PATH_NODES.private;
            const isPublic = node.name === PATH_NODES.public;
            if (!isPrivate && !isPublic) return; // already drilled; click the breadcrumb to go back
            const next = isPrivate ? 'private' : 'public';
            onDrills({ ...drills, path: drills?.path === next ? null : next });
          }
        }}
      />

      {scope && (
        <p data-testid="sankey-scope-caption" className="mt-2 text-[11px] text-fw-bodyLight">
          All flows — {nf.format(scope.siteFlows)} site-originated, {nf.format(scope.cloudFlows)}{' '}
          cloud-originated. Sites roll up by class; the records table below lists cloud flows only.
        </p>
      )}

      {/* Screen-reader restatement of every ribbon; the records table below
          is the full data view. */}
      <ul data-testid="sankey-links" className="sr-only">
        {model.links.map((l, i) => {
          const source = model.nodes[l.source]?.name ?? '';
          const target = model.nodes[l.target]?.name ?? '';
          return (
            <li key={i}>
              {source} → {target} · {r1(l.value)} Gbps
            </li>
          );
        })}
      </ul>
    </div>
  );
}
