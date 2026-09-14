import type { AttachmentMapModel, MapWorkload } from './attachmentModel';

/**
 * Pure, deterministic geometry for the Attachment Map. Four bands left→right:
 * sites → AT&T fabric (a single band; on-ramps are labeled edges into it,
 * never blocks) → regions (grouped by cloud) → workloads. One row per
 * workload; the region label rides the first workload row of its region.
 * FabricHero precedent: fixed coordinates, no clocks, no RNG.
 */

export interface Pt { x: number; y: number }

export const VIEW_W = 1000;
const ROW_H = 48;
const TOP_PAD = 40;

const SITE_X = 28;
export const SITE_W = 148;
const FABRIC_X = 250;
const FABRIC_W = 84;
const REGION_ANCHOR_X = 470;
const WL_X = 620;
export const WL_W = 352;
export const NODE_H = 40;

export interface LayoutSite {
  id: string; name: string; city: string; x: number; y: number; edge: { from: Pt; to: Pt };
  /** Present only for a clustered marker (AttachmentMap.tsx, past
   *  ROLLUP_THRESHOLD) — a count badge instead of a single site's onramp. */
  count?: number;
}
export interface LayoutWorkload {
  wl: MapWorkload;
  attached: boolean;
  ai: boolean;
  x: number; y: number;
  /** Present on the first workload row of each region — the label slot. */
  regionLabel?: { cloudName: string; regionName: string; x: number; y: number };
  edge: { from: Pt; to: Pt; viaShort: string | null; dashed: boolean };
}
export interface AttachmentLayout {
  viewW: number;
  viewH: number;
  fabric: { x: number; y: number; w: number; h: number };
  sites: LayoutSite[];
  workloads: LayoutWorkload[];
  internet: Pt;
}

export function computeAttachmentLayout(model: AttachmentMapModel): AttachmentLayout {
  const flat: { wl: MapWorkload; first: boolean; cloudName: string; regionName: string; short: string | null }[] = [];
  for (const g of model.groups) {
    for (const r of g.regions) {
      // viaShort is resolved in buildAttachmentMapModel where cc is available.
      // The layout stays pure: it only reads the model, ensuring consistency with
      // attachmentChain's ramp selection.
      r.workloads.forEach((wl, i) => {
        flat.push({
          wl, first: i === 0, cloudName: g.cloudName, regionName: r.region.name,
          short: r.viaShort,
        });
      });
    }
  }

  const rows = Math.max(flat.length, model.sites.length);
  const viewH = TOP_PAD * 2 + Math.max(0, rows - 1) * ROW_H + NODE_H + 56; // + internet row
  const bandTop = 24;
  const bandBottom = viewH - 72;
  const fabric = { x: FABRIC_X, y: bandTop, w: FABRIC_W, h: bandBottom - bandTop };
  const clampBand = (y: number) => Math.min(bandBottom - 12, Math.max(bandTop + 12, y));

  const siteGap = Math.min(80, (bandBottom - bandTop) / Math.max(1, model.sites.length));
  const siteStart = (bandTop + bandBottom) / 2 - ((model.sites.length - 1) * siteGap) / 2;
  const sites: LayoutSite[] = model.sites.map((s, i) => {
    const y = siteStart + i * siteGap;
    return {
      id: s.id, name: s.name, city: s.city, x: SITE_X, y,
      edge: { from: { x: SITE_X + SITE_W, y }, to: { x: FABRIC_X, y: clampBand(y) } },
      count: s.count,
    };
  });

  const internet: Pt = { x: REGION_ANCHOR_X, y: viewH - 34 };

  const workloads: LayoutWorkload[] = flat.map((f, i) => {
    const y = TOP_PAD + i * ROW_H;
    const attached = f.wl.vpc.attached;
    return {
      wl: f.wl,
      attached,
      ai: !!f.wl.vpc.ai,
      x: WL_X, y,
      regionLabel: f.first
        ? { cloudName: f.cloudName, regionName: f.regionName, x: REGION_ANCHOR_X, y }
        : undefined,
      edge: attached
        ? { from: { x: WL_X, y }, to: { x: FABRIC_X + FABRIC_W, y: clampBand(y) }, viaShort: f.short, dashed: false }
        : { from: { x: WL_X, y }, to: internet, viaShort: null, dashed: true },
    };
  });

  return { viewW: VIEW_W, viewH, fabric, sites, workloads, internet };
}
