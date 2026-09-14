import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProviderLogo } from '../../components/brand/ProviderLogo';
import type { FabricRegion } from '../../engine/types';
import { VIZ_HEX } from '../../components/viz/kit';
import { ChevronRight, Server, Building2, Store, Landmark, MapPin, Globe, Map as MapIcon, Compass } from 'lucide-react';

/** The ingress column's icon vocabulary — one per site class, so a group of
 *  ATMs and a group of data centres are never the same picture. */
export type SiteIcon = 'dc' | 'office' | 'branch' | 'atm' | 'region' | 'state' | 'metro' | 'district' | 'site';

const SITE_ICON = { dc: Server, office: Building2, branch: Store, atm: Landmark, region: Globe, state: MapIcon, metro: MapPin, district: Compass, site: Building2 } as const;

/* ------------------------------------------------------------------ *
 * Cloud Fabric hero — the manipulable centerpiece of Connect.
 *
 * Three columns read as ONE fabric:
 *   Sites (left, first-mile labeled)
 *     → the unified "AT&T Fabric" band (center; on-ramps NetBond/DX/ER
 *       are thin labeled EDGES into it, never blocks — this is the point)
 *     → Cloud Regions (right, grouped by cloud) + an internet/SaaS egress node.
 *
 * Edges encode the three focuses Connect foregrounds:
 *   reliability  — single vs double line
 *   private/public — cobalt solid (on the fabric) vs slate dashed (public)
 *   performance  — hover reveals latency + a jump into Observe
 *
 * cloud↔cloud is first-class: c2c flows render as region↔region arcs
 * (cobalt when controlled, slate dashed when it rides public peering).
 *
 * Layout is fully deterministic (fixed coordinates, no clocks/RNG) and
 * every node is a real <button> (foreignObject) so the diagram is keyboard-
 * accessible. Motion (the provisioned-edge draw-in) respects reduced-motion.
 * ------------------------------------------------------------------ */

export type FabricSelection =
  | { kind: 'site'; id: string }
  | { kind: 'region'; id: string }
  | { kind: 'fabric' }
  | { kind: 'internet' };

export interface FabricModel {
  /** The ingress column. `sub`/`drillable` arrive from `edgeDrill` when the
   *  column is standing on a real estate rather than the seed archetypes. */
  sites: { id: string; label: string; firstMile: string | null; sub?: string; drillable?: boolean; share?: number; icon?: SiteIcon }[];
  onramps: { id: string; name: string; type: string; site: string; active: boolean; targets: [string, string][] }[];
  regions: FabricRegion[];
  c2c: { id: string; label: string; gbps: number; viaPublic: boolean; controlled: boolean }[];
}

/* Flywheel hex applied as literal SVG attributes (the tailwind config only
 * extends text/bg/border with fw-*, so fill/stroke fw- classes compile to
 * nothing). Cobalt = private/on-fabric, green = dual/resilient, slate =
 * public. No amber anywhere. Values come from the shared VIZ_HEX kit palette
 * — `green` is #2d7e24 (fw-success); the #00a862 duplicate that used to live
 * here, competing with fw-success for the same meaning, is gone. */

const VIEW_W = 1000;
const ROW_H = 52;
const TOP_PAD = 40;

const SITE_X = 40;
const SITE_W = 168;
const NODE_H = 44;

const FABRIC_X = 404;
const FABRIC_W = 92;
const FABRIC_RIGHT = FABRIC_X + FABRIC_W;

/** Expanded drill-down: the band grows leftward into the empty mid-stage;
 *  FABRIC_RIGHT is fixed so no region edge moves. Wide enough (282 units)
 *  that the two-line caption (~150–160 units at 10px) clears the on-ramp
 *  label column starting at REGION_X's left neighbor. */
const FABRIC_X_EXPANDED = 252;

const REGION_X = 596;
const REGION_W = 320;
const REGION_RIGHT = REGION_X + REGION_W;

/** Performance hover card. Wide enough for "Public today Nms · on the fabric
 *  Nms" plus the Observe link, on one line, without wrapping. */
const HOVER_W = 340;

/** short product label for an on-ramp type — the edge detail, not a block. */
export function onrampShort(type: string): string {
  if (/direct connect/i.test(type)) return 'DX';
  if (/expressroute/i.test(type)) return 'ER';
  if (/interconnect/i.test(type)) return 'IX';
  if (/netbond/i.test(type)) return 'NetBond';
  return type;
}

/** which two region ids a cloud-to-cloud flow connects (by cloud keyword). */
function c2cEndpoints(label: string, regions: FabricRegion[]): [string, string] | null {
  const detect = (side: string): string | null => {
    const byName = regions.find(r => side.includes(r.name));
    if (byName) return byName.regionId;
    const cloud =
      /coreweave/i.test(side) ? 'cw' :
      /nebius/i.test(side) ? 'neb' :
      /google/i.test(side) ? 'gcp' :
      /azure/i.test(side) ? 'azure' :
      /oracle/i.test(side) ? 'oci' :
      /aws/i.test(side) ? 'aws' : null;
    if (!cloud) return null;
    const r = regions.find(x => x.cloudId === cloud);
    return r ? r.regionId : null;
  };
  const [a, b] = label.split('↔');
  if (!a || !b) return null;
  const ra = detect(a), rb = detect(b);
  return ra && rb ? [ra, rb] : null;
}

interface Pt { x: number; y: number }

export interface FabricLayout {
  viewW: number;
  viewH: number;
  fabric: { x: number; y: number; w: number; h: number; cx: number; cy: number };
  sites: { id: string; label: string; firstMile: string | null; sub?: string; drillable?: boolean; share?: number; icon?: SiteIcon; x: number; y: number }[];
  regions: {
    region: FabricRegion; x: number; y: number;
    edge: { from: Pt; to: Pt; onrampLabel: string; mid: Pt };
  }[];
  internet: { x: number; y: number; edge: { from: Pt; to: Pt } };
  arcs: { id: string; label: string; controlled: boolean; a: Pt; b: Pt; ctrl: Pt; regionIds: [string, string] }[];
  internals?: {
    sites: { id: string; label: string; y: number }[];
    paths: { id: string; label: string; y: number; siteIdx: 0 | 1 }[];
    /** The facilities the band had no room for. Stated in the list rather
     *  than the caption: a caption long enough to carry it overflowed the
     *  band, and a cut belongs next to what was cut. */
    more?: { label: string; y: number };
    caption: string;
  };
}

/** Pure, deterministic layout — identical model in ⇒ identical geometry out. */
export function computeFabricLayout(model: FabricModel, opts?: { expanded?: boolean }): FabricLayout {
  const rightCount = model.regions.length + 1; // regions + internet node
  const viewH = TOP_PAD * 2 + (rightCount - 1) * ROW_H;
  const bandTop = 28;
  const bandBottom = viewH - 28;
  const clampBand = (y: number) => Math.min(bandBottom - 10, Math.max(bandTop + 10, y));

  const expanded = opts?.expanded ?? false;
  const fx = expanded ? FABRIC_X_EXPANDED : FABRIC_X;
  const fabric = { x: fx, y: bandTop, w: FABRIC_RIGHT - fx, h: bandBottom - bandTop, cx: fx + (FABRIC_RIGHT - fx) / 2, cy: viewH / 2 };

  // Sites: vertically centered stack.
  /* The column used to be a fixed five, so a fixed 92px gap always fit.
     Drilling can put seven rows here, so the gap shrinks to whatever the
     band holds rather than running the last node off the bottom. */
  const rows = Math.max(1, model.sites.length);
  const siteGap = Math.min(92, (bandBottom - bandTop - NODE_H) / Math.max(1, rows - 1));
  const siteSpan = (rows - 1) * siteGap;
  const siteStart = viewH / 2 - siteSpan / 2;
  const sites = model.sites.map((s, i) => ({
    id: s.id, label: s.label, firstMile: s.firstMile, sub: s.sub, drillable: s.drillable, share: s.share, icon: s.icon,
    x: SITE_X, y: siteStart + i * siteGap,
  }));

  const byId = new Map(model.regions.map(r => [r.regionId, r] as const));
  const rowY = (i: number) => TOP_PAD + i * ROW_H;

  const regions = model.regions.map((region, i) => {
    const y = rowY(i);
    const onrampLabel = region.onrampIds
      .map(id => onrampShort(model.onramps.find(o => o.id === id)?.type ?? ''))
      .filter((v, idx, a) => v && a.indexOf(v) === idx)
      .join(' + ');
    const from: Pt = { x: FABRIC_RIGHT, y: clampBand(y) };
    const to: Pt = { x: REGION_X, y };
    const mid: Pt = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 7 };
    return { region, x: REGION_X, y, edge: { from, to, onrampLabel, mid } };
  });

  const internetY = rowY(model.regions.length);
  const internet = {
    x: REGION_X, y: internetY,
    edge: { from: { x: FABRIC_RIGHT, y: clampBand(internetY) }, to: { x: REGION_X, y: internetY } },
  };

  // c2c arcs — region↔region, bowing right past the region column.
  const yOf = (rid: string) => {
    const idx = model.regions.findIndex(r => r.regionId === rid);
    return idx >= 0 ? rowY(idx) : viewH / 2;
  };
  const arcs = model.c2c.map(f => {
    const ends = c2cEndpoints(f.label, model.regions);
    if (!ends || !byId.has(ends[0]) || !byId.has(ends[1])) return null;
    const ya = yOf(ends[0]);
    const yb = yOf(ends[1]);
    const a: Pt = { x: REGION_RIGHT - 6, y: ya };
    const b: Pt = { x: REGION_RIGHT - 6, y: yb };
    const ctrl: Pt = { x: REGION_RIGHT + 66, y: (ya + yb) / 2 };
    return { id: f.id, label: f.label, controlled: f.controlled, a, b, ctrl, regionIds: ends };
  }).filter(Boolean) as FabricLayout['arcs'];

  /* Drill-down internals: the fabric's own on-ramps, grouped by the AT&T
     facility they live in.

     This used to draw a fixed cartoon — two unnamed sites, four "MX-304"
     paths — regardless of what the estate actually had. It taught the
     architecture and answered nothing. The inside of the fabric is the
     on-ramp inventory: which PoPs carry this estate, what each one is
     (NetBond / Direct Connect / ExpressRoute), and which are lit. Those are
     in the model already; the picture just was not reading them. */
  let internals: FabricLayout['internals'];
  if (expanded) {
    const byFacility = new Map<string, typeof model.onramps>();
    for (const o of model.onramps) {
      const row = byFacility.get(o.site);
      if (row) row.push(o);
      else byFacility.set(o.site, [o]);
    }
    /* The inside has to fit the same band as the outside, so the biggest
       facilities are drawn and the tail is stated in the caption rather
       than silently dropped. */
    const FACILITY_MAX = 3;
    const facilities = [...byFacility.entries()].sort((a, b) => b[1].length - a[1].length);
    const shown = facilities.slice(0, FACILITY_MAX);
    const innerTop = fabric.y + 34;
    const innerBottom = fabric.y + fabric.h - 26;
    const slot = (innerBottom - innerTop) / Math.max(1, shown.length);
    const siteY = (i: number) => innerTop + i * slot + 10;

    const paths: FabricLayout['internals'] extends undefined ? never : NonNullable<FabricLayout['internals']>['paths'] = [];
    shown.forEach(([, ramps], i) => {
      ramps.slice(0, 3).forEach((o, j) => {
        paths.push({
          id: `fab-path-${o.id}`,
          label: `${o.name} · ${o.active ? 'lit' : 'dark'}`,
          y: siteY(i) + 18 + j * 15,
          siteIdx: (i % 2) as 0 | 1,
        });
      });
    });

    const lit = model.onramps.filter(o => o.active).length;
    const hiddenFacilities = facilities.length - shown.length;
    internals = {
      sites: shown.map(([facility], i) => ({ id: `fab-site-${i}`, label: facility, y: siteY(i) })),
      paths,
      more:
        hiddenFacilities > 0
          ? {
              label: `+ ${hiddenFacilities} more ${hiddenFacilities === 1 ? 'facility' : 'facilities'}`,
              y: Math.min(innerBottom - 4, siteY(shown.length - 1) + 18 + 3 * 15),
            }
          : undefined,
      /* Row 44 of the metric audit: the 900ms BFD figure is how the fabric
         is BUILT — a product specification. The counts either side of it are
         this estate's, engine-derived, so the caption names both kinds. */
      caption: `${model.onramps.length} on-ramps in ${facilities.length} AT&T facilities · ${lit} lit · BFD detect 900ms`,
    };
  }

  return { viewW: VIEW_W, viewH, fabric, sites, regions, internet, arcs, internals };
}

/** Splits a ' · '-joined caption into two BALANCED display lines.
 *
 *  It used to take the first two segments and dump the rest on line 2, which
 *  worked only while the caption was a fixed four-segment string. Now that
 *  the caption states this estate's real on-ramp counts, segment count and
 *  length both vary, and the fixed split ran line 2 off the edge of the
 *  band. Splitting at the midpoint of the total length keeps both lines
 *  inside it however the counts read. The data stays one line — this is
 *  presentation only. */
function splitCaptionLines(caption: string): [string, string] {
  const segments = caption.split(' · ');
  if (segments.length < 2) return [caption, ''];
  const half = caption.length / 2;
  let best = 1;
  let bestGap = Infinity;
  for (let cut = 1; cut < segments.length; cut++) {
    const len = segments.slice(0, cut).join(' · ').length;
    const gap = Math.abs(len - half);
    if (gap < bestGap) {
      bestGap = gap;
      best = cut;
    }
  }
  const line1 = segments.slice(0, best).join(' · ');
  const line2 = segments.slice(best).join(' · ');
  return [line1, line2];
}

/* ----- edge stroke encoding: private vs public, single vs double ----- */
function edgeStroke(path: 'private' | 'public'): { color: string; dash?: string } {
  return path === 'private'
    ? { color: VIZ_HEX.cobalt }
    : { color: VIZ_HEX.slate, dash: '5 5' };
}

function ReliabilityDot({ reliability }: { reliability: FabricRegion['reliability'] }) {
  const map = {
    dual: { c: VIZ_HEX.green, t: 'Dual · resilient' },
    single: { c: VIZ_HEX.cobalt, t: 'Single path' },
    none: { c: VIZ_HEX.slate, t: 'Not attached' },
  } as const;
  const m = map[reliability];
  return (
    <span title={m.t} className="inline-flex items-center gap-1 shrink-0">
      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: m.c }} />
      {reliability === 'dual' && <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: m.c }} />}
    </span>
  );
}

/** One traveling traffic comet: a bright short head (AT&T Blue) leading a
 *  dimmer cobalt tail. Head and tail share duration/delay; the head's dash
 *  window sits 0.115 path-units ahead, so it reads as a comet, not a dash.
 *  Base state of both layers is invisible (opacity 0, parked off-path):
 *  `animation:none` — the board freeze — and reduced-motion collapse to the
 *  static frame. */
function TrafficPulse({ d, delay, dur, soft = false }: { d: string; delay: number; dur: number; soft?: boolean }) {
  const timing = { animationDelay: `${delay}s`, animationDuration: `${dur}s` };
  return (
    <g data-fabric-pulse aria-hidden="true">
      <path
        d={d} fill="none" stroke={VIZ_HEX.cobalt} strokeWidth={2.2}
        strokeLinecap="round" pathLength={1}
        className={soft ? 'fabric-pulse-tail fabric-pulse-soft' : 'fabric-pulse-tail'}
        style={timing}
      />
      <path
        d={d} fill="none" stroke={VIZ_HEX.skyCursor} strokeWidth={3}
        strokeLinecap="round" pathLength={1}
        className={soft ? 'fabric-pulse-head fabric-pulse-soft-head' : 'fabric-pulse-head'}
        style={timing}
      />
    </g>
  );
}

interface FabricHeroProps {
  model: FabricModel;
  selected?: FabricSelection | null;
  onSelect?: (sel: FabricSelection) => void;
  justProvisioned?: string | null;
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Descend a rollup node in the ingress column. Absent ⇒ nodes only select. */
  onDrillSite?: (siteId: string) => void;
}

export function FabricHero({ model, selected = null, onSelect, justProvisioned = null, expanded = false, onToggleExpand, onDrillSite }: FabricHeroProps) {
  const layout = useMemo(() => computeFabricLayout(model, { expanded }), [model, expanded]);
  const [hover, setHover] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; region: FabricRegion } | null>(null);

  const selId =
    selected?.kind === 'region' ? selected.id :
    selected?.kind === 'site' ? selected.id :
    selected?.kind === 'internet' ? 'e-net' :
    selected?.kind === 'fabric' ? '__fabric__' : null;

  // A node is "lit" when it is the hover target, the selection, or (for the
  // fabric) whenever the whole fabric is the focus.
  const focusId = hover ?? selId;
  const fabricFocus = focusId === '__fabric__';

  const siteEdgeLit = (siteId: string) => fabricFocus || focusId === siteId;
  const regionEdgeLit = (rid: string) => fabricFocus || focusId === rid;
  const arcLit = (ids: [string, string]) => ids.includes(focusId ?? '');

  const select = (sel: FabricSelection) => onSelect?.(sel);

  return (
    <div
      data-tour="connect-onramp"
      data-testid="fabric-hero"
      className="rounded-2xl border border-fw-secondary bg-fw-base"
    >
      <svg
        viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
        width="100%"
        role="group"
        aria-label="Cloud fabric: sites to the AT&T fabric to cloud regions"
      >
        {/* Dark-only paint sources. Light never references these ids, so the
            light frame is untouched; the board freeze rebuilds SVG defs, so
            the gradients survive into Figma. */}
        <defs>
          <linearGradient id="fabric-band-grad-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b2340" />
            <stop offset="1" stopColor="#123054" />
          </linearGradient>
          <linearGradient id="fabric-band-hl-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5ba7f7" stopOpacity="0.16" />
            <stop offset="1" stopColor="#5ba7f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ---- the unified AT&T Fabric band (a single shape, clickable) ---- */}
        <g>
          <rect
            className="fabric-band-breathe"
            data-focus={fabricFocus || undefined}
            x={layout.fabric.x} y={layout.fabric.y} width={layout.fabric.w} height={layout.fabric.h}
            rx={18} fill={VIZ_HEX.band} stroke={fabricFocus ? VIZ_HEX.cobalt : VIZ_HEX.bandStroke}
            strokeWidth={fabricFocus ? 2.5 : 1.5}
          />
          {/* faint inner top highlight — lit infrastructure, not a flat
              rectangle. display:none outside html.dark. */}
          <rect
            className="fabric-band-hl" aria-hidden="true" pointerEvents="none"
            x={layout.fabric.x + 1.5} y={layout.fabric.y + 1.5}
            width={Math.max(0, layout.fabric.w - 3)} height={Math.max(0, layout.fabric.h * 0.42)}
            rx={16} fill="url(#fabric-band-hl-grad)"
          />
        </g>

        {/* ---- site → fabric edges (first-mile onto the private fabric) ---- */}
        <g data-edges-site>
          {layout.sites.map((s, i) => {
            const from = { x: s.x + SITE_W, y: s.y };
            const to = { x: layout.fabric.x, y: Math.min(layout.fabric.y + layout.fabric.h - 10, Math.max(layout.fabric.y + 10, s.y)) };
            const lit = siteEdgeLit(s.id);
            const d = `M ${from.x} ${from.y} C ${from.x + 60} ${from.y}, ${to.x - 60} ${to.y}, ${to.x} ${to.y}`;
            /* Every edge on this diagram means the same thing: cobalt rides
               the AT&T fabric, slate dashed rides the public internet. The
               ingress edges were a uniform cobalt-soft regardless, so a group
               that is 40% attached drew the same line as one that is 100% —
               the number said one thing and the picture said another. A
               partly-attached group now draws BOTH: the public baseline
               underneath, the attached share painted over it. */
            const share = s.share ?? 1;
            const dim = focusId && !lit ? 0.3 : 0.92;
            const w = lit ? 2.5 : 1.5;
            return (
              <g key={`se-${s.id}`}>
                {share < 1 && (
                  <path
                    data-fabric-edge data-kind="site-public" d={d} fill="none"
                    stroke={VIZ_HEX.slate} strokeWidth={w} strokeDasharray="5 4"
                    strokeOpacity={dim} strokeLinecap="round"
                    className="fabric-dash-drift"
                  />
                )}
                {share > 0 && (
                  <path
                    data-fabric-edge data-kind="site" d={d} fill="none"
                    stroke={VIZ_HEX.cobalt} strokeWidth={w}
                    strokeOpacity={dim} strokeLinecap="round"
                    pathLength={1} strokeDasharray={share < 1 ? `${share} ${1 - share}` : undefined}
                  />
                )}
                {/* traffic comets — ingress, riding the private edge. Only a
                    fully attached edge pulses end-to-end: a partial edge's
                    cobalt covers just the attached share, and a comet
                    crossing the slate remainder would claim traffic the
                    fabric doesn't carry. */}
                {share >= 1 && (
                  <TrafficPulse d={d} delay={-(i * 1.15)} dur={2.6 + (i % 3) * 0.25} />
                )}
                {/* port — the edge's termination on the band, one deliberate
                    treatment for every edge (dark-only; see the CSS). */}
                <circle
                  className="fabric-port" aria-hidden="true"
                  data-port-kind={share > 0 ? 'private' : 'public'}
                  cx={to.x} cy={to.y} r={2.6}
                />
              </g>
            );
          })}
        </g>

        {/* ---- fabric → region edges (on-ramp is the labeled edge detail) ---- */}
        <g data-edges-region>
          {layout.regions.map(({ region, edge }, i) => {
            const { color, dash } = edgeStroke(region.path);
            const lit = regionEdgeLit(region.regionId);
            const dual = region.reliability === 'dual';
            const provisioned = justProvisioned === region.regionId;
            const d = `M ${edge.from.x} ${edge.from.y} C ${edge.from.x + 60} ${edge.from.y}, ${edge.to.x - 60} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`;
            return (
              <g key={`re-${region.regionId}`}>
                {/* double line = dual/resilient; single line otherwise */}
                {dual && (
                  <path d={d} fill="none" stroke={color} strokeWidth={lit ? 2.5 : 1.5}
                    strokeOpacity={focusId && !lit ? 0.3 : 0.85} transform="translate(0,-2.4)" strokeLinecap="round" />
                )}
                <path
                  data-fabric-edge data-kind="region" data-region-id={region.regionId} data-path={region.path}
                  className={provisioned ? 'fabric-edge-enter' : region.path === 'public' ? 'fabric-dash-drift' : undefined}
                  d={d} fill="none" stroke={color} strokeWidth={lit ? 2.6 : 1.6}
                  strokeOpacity={focusId && !lit ? 0.3 : 0.9}
                  strokeDasharray={dash} strokeLinecap="round"
                >
                  <title>{region.cloudName} {region.name} · {region.path} · {region.reliability} · {region.latencyMs}ms on the {region.path === 'private' ? 'AT&T fabric' : 'public internet'}</title>
                </path>
                {/* traffic comets — egress, fabric → region, private paths
                    only (public rides the dash drift instead). Speed keys to
                    the path's own figure: a 3ms fabric edge runs visibly
                    quicker than a 60ms one. Deterministic — no clocks. */}
                {region.path === 'private' && (
                  <TrafficPulse
                    d={d}
                    delay={-(i * 0.85) - 0.5}
                    dur={Math.min(3.6, Math.max(2.1, 2.1 + region.latencyMs / 90))}
                  />
                )}
                {/* port — where the on-ramp lands on the band (dark-only) */}
                <circle
                  className="fabric-port" aria-hidden="true"
                  data-port-kind={region.path}
                  cx={edge.from.x} cy={edge.from.y} r={2.6}
                />
                {/* on-ramp product label — the edge detail-on-demand. Two
                    renderings, one visible per theme: the light frame keeps
                    the haloed text EXACTLY as frozen; dark swaps it for a
                    pill chip so the label sits on the edge with intent. */}
                {region.onrampIds.length > 0 && (
                  <>
                    <text data-onramp-text x={edge.mid.x} y={edge.mid.y} textAnchor="middle"
                      fill={VIZ_HEX.slateInk} stroke={VIZ_HEX.wash} strokeWidth={3} paintOrder="stroke"
                      className="text-[10px] font-medium" style={{ opacity: focusId && !lit ? 0.4 : 1 }}>
                      {edge.onrampLabel}
                    </text>
                    {(() => {
                      const chipW = edge.onrampLabel.length * 5.6 + 16;
                      return (
                        <g className="fabric-chip" aria-hidden="true" style={{ opacity: focusId && !lit ? 0.4 : 1 }}>
                          <rect x={edge.mid.x - chipW / 2} y={edge.mid.y - 12} width={chipW} height={16} rx={8} />
                          <text x={edge.mid.x} y={edge.mid.y} textAnchor="middle" className="text-[10px] font-medium">
                            {edge.onrampLabel}
                          </text>
                        </g>
                      );
                    })()}
                  </>
                )}
              </g>
            );
          })}
          {/* fabric → internet/SaaS (always public egress) */}
          {(() => {
            const e = layout.internet.edge;
            const lit = fabricFocus || focusId === 'e-net';
            const d = `M ${e.from.x} ${e.from.y} C ${e.from.x + 60} ${e.from.y}, ${e.to.x - 60} ${e.to.y}, ${e.to.x} ${e.to.y}`;
            return (
              <g>
                <path data-fabric-edge data-kind="internet" d={d} fill="none" stroke={VIZ_HEX.slate}
                  strokeWidth={lit ? 2.4 : 1.5} strokeOpacity={focusId && !lit ? 0.3 : 0.85}
                  strokeDasharray="5 5" strokeLinecap="round" className="fabric-dash-drift" />
                <circle
                  className="fabric-port" aria-hidden="true" data-port-kind="public"
                  cx={e.from.x} cy={e.from.y} r={2.6}
                />
              </g>
            );
          })()}
        </g>

        {/* ---- cloud ↔ cloud arcs (first-class east-west) ---- */}
        <g data-edges-c2c>
          {layout.arcs.map((a, i) => {
            const lit = arcLit(a.regionIds);
            const dArc = `M ${a.a.x} ${a.a.y} Q ${a.ctrl.x} ${a.ctrl.y} ${a.b.x} ${a.b.y}`;
            return (
              <g key={`arc-${a.id}`}>
                <path
                  data-fabric-arc data-controlled={a.controlled}
                  d={dArc}
                  fill="none" stroke={a.controlled ? VIZ_HEX.cobalt : VIZ_HEX.slate}
                  strokeWidth={lit ? 2.2 : 1.4} strokeOpacity={focusId && !lit ? 0.28 : 0.75}
                  strokeDasharray={a.controlled ? undefined : '4 5'} strokeLinecap="round"
                  className={a.controlled ? undefined : 'fabric-dash-drift'}
                >
                  <title>{a.label} · {a.controlled ? 'AT&T fabric' : 'public peering'}</title>
                </path>
                {/* east-west comets — controlled cloud↔cloud rides the
                    fabric too; softer and slower than the trunk edges so the
                    arcs read as secondary flows. */}
                {a.controlled && (
                  <TrafficPulse d={dArc} delay={-(i * 1.9) - 1.2} dur={5.2} soft />
                )}
              </g>
            );
          })}
        </g>

        {/* ---- fabric label (its own button) ---- */}
        <foreignObject
          x={layout.fabric.x - 6}
          y={expanded ? layout.fabric.y + 2 : layout.fabric.cy - 30}
          width={layout.fabric.w + 12}
          height={60}
        >
          <button
            type="button"
            aria-pressed={selected?.kind === 'fabric'}
            aria-expanded={expanded}
            data-testid="fabric-node-fabric"
            onClick={() => { select({ kind: 'fabric' }); onToggleExpand?.(); }}
            onMouseEnter={() => setHover('__fabric__')} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover('__fabric__')} onBlur={() => setHover(null)}
            className="w-full h-full flex flex-col items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link/50"
          >
            <span className="fabric-lockup-att text-[11px] font-semibold leading-tight text-fw-link">AT&amp;T</span>
            <span className="fabric-lockup-fabric text-[11px] font-semibold leading-tight text-fw-link">Fabric</span>
            <span className="fabric-lockup-hint text-[10px] leading-tight text-fw-bodyLight">{expanded ? 'collapse' : 'see inside'}</span>
          </button>
        </foreignObject>

        {/* ---- drill-down internals: sites and paths, same axis ---- */}
        {layout.internals && (
          <g data-testid="fabric-internals">
            {layout.internals.sites.map(s => (
              <text key={s.id} x={layout.fabric.x + 14} y={s.y} fill={VIZ_HEX.slateInk} className="text-[10px] font-semibold">
                {s.label}
              </text>
            ))}
            {layout.internals.paths.map(p => (
              <g key={p.id}>
                <line
                  x1={layout.fabric.x + 14} y1={p.y} x2={FABRIC_RIGHT - 14} y2={p.y}
                  stroke={VIZ_HEX.cobalt} strokeWidth={1.5} strokeOpacity={0.75} strokeLinecap="round"
                />
                <circle cx={layout.fabric.x + 14} cy={p.y} r={2.5} fill={VIZ_HEX.cobalt} />
                <circle cx={FABRIC_RIGHT - 14} cy={p.y} r={2.5} fill={VIZ_HEX.cobalt} />
                <text x={layout.fabric.x + 22} y={p.y - 4} fill={VIZ_HEX.slateInk} className="text-[9px]">
                  {p.label}
                </text>
              </g>
            ))}
            {layout.internals.more && (
              <text
                x={layout.fabric.x + 14} y={layout.internals.more.y}
                fill={VIZ_HEX.slateInk} className="text-[9px]" opacity={0.85}
              >
                {layout.internals.more.label}
              </text>
            )}
            {(() => {
              const [line1, line2] = splitCaptionLines(layout.internals.caption);
              const bandBottomY = layout.fabric.y + layout.fabric.h;
              return (
                <>
                  <text x={layout.fabric.cx} y={bandBottomY - 22} textAnchor="middle" fill={VIZ_HEX.slateInk} className="text-[10px]">
                    {line1}
                  </text>
                  <text x={layout.fabric.cx} y={bandBottomY - 10} textAnchor="middle" fill={VIZ_HEX.slateInk} className="text-[10px]">
                    {line2}
                  </text>
                </>
              );
            })()}
          </g>
        )}

        {/* ---- site nodes ---- */}
        <g data-nodes-site>
          {layout.sites.map(s => {
            const isSel = selected?.kind === 'site' && selected.id === s.id;
            return (
              <foreignObject key={`sn-${s.id}`} x={s.x} y={s.y - NODE_H / 2} width={SITE_W} height={NODE_H}>
                <button
                  type="button" aria-pressed={isSel}
                  data-fabric-node data-testid={`fabric-node-site-${s.id}`}
                  onClick={() => (s.drillable && onDrillSite ? onDrillSite(s.id) : select({ kind: 'site', id: s.id }))}
                  onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}
                  className={`w-full h-full flex flex-col justify-center rounded-lg border px-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link/50 ${
                    isSel ? 'border-fw-active bg-fw-ctaPrimary/[0.05] ring-1 ring-fw-link' : 'border-fw-secondary bg-fw-base hover:bg-fw-wash'
                  }`}
                >
                  {(() => {
                    const Icon = SITE_ICON[s.icon ?? 'site'];
                    const share = s.share ?? 1;
                    return (
                      <>
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-fw-heading leading-tight">
                          <Icon size={12} className="shrink-0 text-fw-bodyLight" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{s.label.split(' · ')[0]}</span>
                          {s.drillable && (
                            <ChevronRight size={13} className="-mr-0.5 shrink-0 text-fw-link" aria-hidden="true" />
                          )}
                        </span>
                        <span className="truncate text-[10px] text-fw-bodyLight leading-tight">
                          {s.sub ?? (s.firstMile ? `first-mile · ${s.firstMile}` : 'public internet')}
                        </span>
                        {/* The share, as a picture. A group reading "40% on
                            fabric" should look 40% attached, not identical to
                            one that is fully attached. Hidden for a single
                            site, where the sub-line already says it plainly. */}
                        {s.share !== undefined && share > 0 && share < 1 && (
                          <span aria-hidden="true" className="mt-1 flex h-[3px] w-full overflow-hidden rounded-full bg-fw-secondary">
                            <span className="h-full rounded-full bg-fw-ctaPrimary" style={{ width: `${Math.round(share * 100)}%` }} />
                          </span>
                        )}
                      </>
                    );
                  })()}
                </button>
              </foreignObject>
            );
          })}
        </g>

        {/* ---- region nodes (grouped by cloud) + internet/SaaS ---- */}
        <g data-nodes-region>
          {layout.regions.map(({ region, x, y }, i) => {
            const prev = layout.regions[i - 1]?.region.cloudId;
            const firstOfCloud = region.cloudId !== prev;
            const isSel = selected?.kind === 'region' && selected.id === region.regionId;
            return (
              <foreignObject key={`rn-${region.regionId}`} x={x} y={y - NODE_H / 2} width={REGION_W} height={NODE_H}>
                <button
                  type="button" aria-pressed={isSel}
                  data-fabric-node data-region-node data-testid={`fabric-node-region-${region.regionId}`}
                  data-region-id={region.regionId} data-path={region.path} data-reliability={region.reliability}
                  onClick={() => select({ kind: 'region', id: region.regionId })}
                  onMouseEnter={() => { setHover(region.regionId); setHoverInfo({ x: x - 8, y: y - NODE_H / 2 - 34, region }); }}
                  onMouseLeave={() => { setHover(null); setHoverInfo(null); }}
                  onFocus={() => { setHover(region.regionId); setHoverInfo({ x: x - 8, y: y - NODE_H / 2 - 34, region }); }}
                  onBlur={() => { setHover(null); setHoverInfo(null); }}
                  className={`w-full h-full flex items-center gap-2 rounded-lg border pl-2 pr-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link/50 ${
                    isSel ? 'border-fw-active bg-fw-ctaPrimary/[0.05] ring-1 ring-fw-link' : 'border-fw-secondary bg-fw-base hover:bg-fw-wash'
                  }`}
                >
                  <ProviderLogo id={region.cloudId} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[11px] font-semibold text-fw-heading leading-tight">{region.name}</span>
                      {firstOfCloud && <span className="truncate text-[10px] text-fw-bodyLight leading-tight">· {region.cloudName}</span>}
                    </span>
                    {/* The word and the number describe ONE path. `latencyMs`
                        is the figure for the path the region is on, so
                        "Public · 92ms" is the public figure — the same one
                        /naas/observe's flow rows state for this region — and
                        "Private · 3ms" is the fabric figure. This line used to
                        pair the word "Public" with the PRIVATE number, which
                        put eight of nine regions at odds with the Observe
                        screen the hover card links to. */}
                    <span className="flex items-center gap-1.5 leading-tight">
                      <span className={`text-[10px] font-medium ${region.path === 'private' ? 'text-fw-link' : 'text-fw-bodyLight'}`}>
                        {region.path === 'private' ? 'Private' : 'Public'}
                      </span>
                      <span className="text-[10px] text-fw-bodyLight">· {region.latencyMs}ms</span>
                    </span>
                  </span>
                  <ReliabilityDot reliability={region.reliability} />
                </button>
              </foreignObject>
            );
          })}
          {/* internet / SaaS egress node */}
          {(() => {
            const isSel = selected?.kind === 'internet';
            return (
              <foreignObject x={layout.internet.x} y={layout.internet.y - NODE_H / 2} width={REGION_W} height={NODE_H}>
                <button
                  type="button" aria-pressed={isSel}
                  data-fabric-node data-testid="fabric-node-internet"
                  onClick={() => select({ kind: 'internet' })}
                  onMouseEnter={() => setHover('e-net')} onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover('e-net')} onBlur={() => setHover(null)}
                  className={`w-full h-full flex items-center gap-2 rounded-lg border border-dashed pl-2.5 pr-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link/50 ${
                    isSel ? 'border-fw-active bg-fw-ctaPrimary/[0.05] ring-1 ring-fw-link' : 'border-fw-secondary bg-fw-wash hover:bg-fw-neutral'
                  }`}
                >
                  <span className="flex items-center justify-center h-6 w-6 rounded-md bg-fw-neutral text-fw-bodyLight text-[10px] font-bold shrink-0">SaaS</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-fw-heading leading-tight">Internet / SaaS</span>
                    <span className="block truncate text-[10px] text-fw-bodyLight leading-tight">Public egress · breakout</span>
                  </span>
                </button>
              </foreignObject>
            );
          })()}
        </g>

        {/* ---- performance hover card: BOTH figures, each labelled ----
             This card carries a link into Observe, so the two screens have to
             be readable against each other. It used to show one unlabelled
             number — the fabric RTT — beside "View in Observe →", and Observe
             showed the public figure for the same region under a Path column
             reading "Public internet": 40ms here, 68ms one click away.
             A region on the public path now leads with what it costs TODAY and
             names the fabric figure as the second term, because that gap is
             the whole argument for attaching it. An attached region has one
             path and states one figure.

             Its right edge lands on the region column's left edge: the card is
             wider now that it carries two labelled figures, and the fixed left
             offset it used to carry pushed it across the node above the one
             being hovered. */}
        {hoverInfo && (
          <foreignObject x={Math.max(4, hoverInfo.x + 8 - HOVER_W)} y={Math.max(2, hoverInfo.y)} width={HOVER_W} height={34}>
            <div
              data-testid={`fabric-hover-${hoverInfo.region.regionId}`}
              className="flex items-center justify-end gap-1.5 whitespace-nowrap rounded-md border border-fw-secondary bg-white px-2 py-1 text-[10px] shadow-sm"
            >
              {hoverInfo.region.path === 'private' ? (
                <span className="text-fw-bodyLight">
                  On the fabric{' '}
                  <span className="font-semibold tabular-nums text-fw-heading">{hoverInfo.region.privateMs}ms</span>
                </span>
              ) : (
                <span className="text-fw-bodyLight">
                  Public today{' '}
                  <span className="font-semibold tabular-nums text-fw-heading">{hoverInfo.region.publicMs}ms</span>
                  {' · on the fabric '}
                  <span className="font-semibold tabular-nums text-fw-link">{hoverInfo.region.privateMs}ms</span>
                </span>
              )}
              <Link to="/naas/observe" className="font-medium text-fw-link hover:underline">View in Observe →</Link>
            </div>
          </foreignObject>
        )}
      </svg>

      {/* Motion — CSS only, geometry never touched. Every animated element's
          BASE state is today's static frame (pulses park invisible, drift
          starts at offset 0, the band carries no filter), so `animation:none`
          — injected by the Figma board freeze — and reduced-motion both
          collapse to the exact pre-animation render. */}
      <style>{`
        .fabric-edge-enter { stroke-dasharray: 240; stroke-dashoffset: 240; animation: fabric-edge-draw .7s ease-out forwards; }
        @keyframes fabric-edge-draw { to { stroke-dashoffset: 0; } }

        /* hover focus feels liquid instead of snapping */
        [data-fabric-edge], [data-fabric-arc] { transition: stroke-opacity .25s ease, stroke-width .25s ease; }

        /* ───── dark-only treatment: lit infrastructure ─────
           Everything below is html.dark-scoped; the light frame stays
           hash-identical. The static dark frame (animation:none) carries the
           full look — steady band glow, gradient, chips, ports — because
           that frame is what the Figma freeze captures. */

        /* the slate public baseline under a partially-attached group sank
           into the dark card — lift just that stroke a step */
        html.dark [data-fabric-edge][data-kind="site-public"] { stroke: #7f90a6; }

        /* the band: deep cobalt gradient, steady AT&T-blue aura, breathing
           oscillates AROUND the steady glow (0%/100% = base ⇒ animation:none
           IS the static frame) */
        html.dark .fabric-band-breathe {
          fill: url(#fabric-band-grad-dark);
          stroke: #3374cc;
          stroke-width: 1.5;
          filter: drop-shadow(0 0 22px rgb(0 159 219 / .28));
          animation: fabric-band-breathe-dark 6s ease-in-out infinite;
        }
        html.dark .fabric-band-breathe[data-focus] { stroke: #58baff; stroke-width: 2.5; }
        @keyframes fabric-band-breathe-dark {
          0%, 100% { filter: drop-shadow(0 0 22px rgb(0 159 219 / .28)); }
          50%      { filter: drop-shadow(0 0 30px rgb(0 159 219 / .44)); }
        }
        .fabric-band-hl { display: none; }
        html.dark .fabric-band-hl { display: block; }

        /* edges the fabric carries lift to lit cobalt with a whisper of glow;
           public stays clearly visible but muted — the hierarchy IS the
           argument */
        html.dark [data-fabric-edge][data-kind="site"],
        html.dark [data-fabric-edge][data-kind="region"][data-path="private"],
        html.dark [data-fabric-arc][data-controlled="true"] {
          stroke: var(--viz-cobalt-lit, #58a6f0);
          filter: drop-shadow(0 0 3px rgb(0 159 219 / .4));
        }

        /* one deliberate termination for every edge: a port on the band */
        .fabric-port { display: none; }
        html.dark .fabric-port { display: block; }
        html.dark .fabric-port[data-port-kind="private"] { fill: var(--viz-cobalt-lit, #58a6f0); }
        html.dark .fabric-port[data-port-kind="public"] { fill: #7f90a6; }

        /* on-ramp labels become pill chips in dark; the light haloed text is
           frozen pixels and hides only under html.dark */
        .fabric-chip { display: none; }
        html.dark .fabric-chip { display: block; }
        html.dark [data-onramp-text] { display: none; }
        html.dark .fabric-chip rect { fill: #222e3c; stroke: #2f3d4d; stroke-width: 1; }
        html.dark .fabric-chip text { fill: #c5cfd9; }

        /* the lockup brightens; "Fabric" takes the AT&T Blue accent */
        html.dark .fabric-lockup-att { color: #f2f6fa; }
        html.dark .fabric-lockup-fabric { color: #33b5eb; }
        html.dark .fabric-lockup-hint { color: #97a3b0; letter-spacing: .08em; }

        /* traffic comets — bright head, dimmer tail, same clock. pathLength=1
           makes the dash math unit-scaled: the tail is a 16%-of-path window,
           the head the leading 4.5% of it (its offset ramp runs 0.115 ahead).
           Offsets park each layer entirely before the path and opacity lives
           ONLY inside the keyframes — the base state is invisible. */
        .fabric-pulse-tail { stroke-dasharray: .16 .84; stroke-dashoffset: 1.16; stroke-opacity: 0; animation: fabric-comet-tail 2.9s linear infinite; }
        .fabric-pulse-head { stroke-dasharray: .045 .955; stroke-dashoffset: 1.045; stroke-opacity: 0; animation: fabric-comet-head 2.9s linear infinite; }
        @keyframes fabric-comet-tail {
          0%   { stroke-dashoffset: 1.16; stroke-opacity: 0; }
          12%  { stroke-opacity: .35; }
          82%  { stroke-opacity: .35; }
          100% { stroke-dashoffset: .16; stroke-opacity: 0; }
        }
        @keyframes fabric-comet-head {
          0%   { stroke-dashoffset: 1.045; stroke-opacity: 0; }
          12%  { stroke-opacity: .95; }
          82%  { stroke-opacity: .95; }
          100% { stroke-dashoffset: .045; stroke-opacity: 0; }
        }
        .fabric-pulse-soft { animation-name: fabric-comet-tail-soft; }
        .fabric-pulse-soft-head { animation-name: fabric-comet-head-soft; }
        @keyframes fabric-comet-tail-soft {
          0%   { stroke-dashoffset: 1.16; stroke-opacity: 0; }
          15%  { stroke-opacity: .2; }
          80%  { stroke-opacity: .2; }
          100% { stroke-dashoffset: .16; stroke-opacity: 0; }
        }
        @keyframes fabric-comet-head-soft {
          0%   { stroke-dashoffset: 1.045; stroke-opacity: 0; }
          15%  { stroke-opacity: .55; }
          80%  { stroke-opacity: .55; }
          100% { stroke-dashoffset: .045; stroke-opacity: 0; }
        }
        html.dark .fabric-pulse-head { filter: drop-shadow(0 0 4px rgb(0 159 219 / .75)); }

        /* public internet — the dashes crawl. Dash periods here are 9 or 10
           units; -90 divides both, so the loop is seamless for every edge. */
        .fabric-dash-drift { animation: fabric-dash-crawl 70s linear infinite; }
        @keyframes fabric-dash-crawl { to { stroke-dashoffset: -90; } }

        /* the fabric breathes — a slow AT&T-blue aura on the band */
        .fabric-band-breathe { animation: fabric-band-breathe 5.4s ease-in-out infinite; }
        @keyframes fabric-band-breathe {
          0%, 100% { filter: drop-shadow(0 0 0px rgba(0,159,219,0)); }
          50%      { filter: drop-shadow(0 0 9px rgba(0,159,219,.32)); }
        }

        @media (prefers-reduced-motion: reduce) {
          .fabric-edge-enter { animation: none; stroke-dasharray: none; stroke-dashoffset: 0; }
          .fabric-pulse-tail, .fabric-pulse-head, .fabric-dash-drift, .fabric-band-breathe,
          html.dark .fabric-band-breathe { animation: none; }
          [data-fabric-edge], [data-fabric-arc] { transition: none; }
        }
      `}</style>
    </div>
  );
}
