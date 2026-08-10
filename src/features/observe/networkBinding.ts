import type { CloudControl } from '../../engine/types';
import type {
  ObservabilityBinding,
  Kpi,
  FlowTab,
  SeriesPoint,
  RecordRow,
  Briefing,
  BriefingBlock,
} from './ObservabilityBinding';
import { buildSankey } from './sankeyModel';
import { flowLogs, BUCKETS, type FlowLogRecord } from './flowLogs';

// Shape of a routeFlows() row (src/engine/state-routing.ts) — untyped at the
// source (// @ts-nocheck), so we mirror the fields this binding consumes.
interface RoutePath {
  id: string;
  label: string;
  sub?: string;
  attControlled: boolean;
}
interface RouteFlowRow {
  id: string;
  kind?: 'app' | 'c2c';
  label: string;
  gbps: number;
  viaPublic: boolean;
  srcCloud?: string;
  srcRid?: string;
  paths: RoutePath[];
  current: { id: string; label: string; sub?: string; attControlled: boolean; latencyMs: number };
  diverse?: boolean;
}

interface RegionTelemetry {
  key: string;
  name: string;
  attached: boolean;
  throughput: number[];
  latency: number[];
  loss: number[];
}
interface Telemetry {
  regions: RegionTelemetry[];
  egress: { pub: number; priv: number }[];
}

const SERIES_POINTS = 24;

const FLOW_TABS: FlowTab[] = [
  { id: 'flow', label: 'Flow', view: 'sankey' },
  { id: 'trend', label: 'Trend' },
  { id: 'throughput', label: 'Throughput' },
  { id: 'latency', label: 'Latency' },
  { id: 'loss', label: 'Loss' },
  { id: 'egress', label: 'Egress' },
  { id: 'control', label: 'Control' },
];

const GROUP_BY_OPTIONS: { id: string; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'source', label: 'Source' },
  { id: 'destination', label: 'Destination' },
  { id: 'path', label: 'Path' },
  { id: 'action', label: 'Action' },
];

function fmtDollars(n: number): string {
  return `$${(n / 1000).toFixed(1)}k`;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function percentile95(values: number[]): number {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length));
  return sorted[idx];
}

function seriesFromNumbers(values: number[]): SeriesPoint[] {
  return values.map((v, i) => ({ t: `T${i}`, v: Math.round(v * 10) / 10 }));
}

function buildFlowSeries(cc: CloudControl, tab: string): SeriesPoint[] {
  const tel = cc.telemetry(SERIES_POINTS) as Telemetry;
  const regions = tel.regions ?? [];
  const egress = tel.egress ?? [];

  switch (tab) {
    case 'latency': {
      const avgs = Array.from({ length: SERIES_POINTS }, (_, i) => {
        const vals = regions.map(r => r.latency[i]).filter((v): v is number => typeof v === 'number');
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      });
      return seriesFromNumbers(avgs);
    }
    case 'loss': {
      // Throughput-weighted network-wide packet loss per time index, so the
      // series tracks the loss the bulk of traffic actually sees.
      const loss = Array.from({ length: SERIES_POINTS }, (_, i) => {
        let wsum = 0;
        let w = 0;
        regions.forEach(r => {
          const l = r.loss?.[i] ?? 0;
          const tp = r.throughput?.[i] ?? 0;
          wsum += l * tp;
          w += tp;
        });
        return w ? wsum / w : 0;
      });
      // Keep 3-decimal precision (loss is sub-1%); seriesFromNumbers' 1-decimal
      // rounding would floor these to zero and blank the panel.
      return loss.map((v, i) => ({ t: `T${i}`, v: Math.round(v * 1000) / 1000 }));
    }
    case 'egress': {
      return seriesFromNumbers(egress.map(e => e.pub + e.priv));
    }
    case 'control': {
      return seriesFromNumbers(egress.map(e => (e.pub + e.priv ? (e.priv / (e.pub + e.priv)) * 100 : 0)));
    }
    case 'trend':
    case 'throughput':
    default: {
      const sums = Array.from({ length: SERIES_POINTS }, (_, i) =>
        regions.reduce((s, r) => s + (r.throughput[i] ?? 0), 0)
      );
      return seriesFromNumbers(sums);
    }
  }
}

/** ≥1e9 → GB, ≥1e6 → MB, else KB — one decimal place throughout. */
function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(1)} KB`;
}

/** deny → bad; an allow that passed vSRX inspection → ok; an uninspected
 *  flow riding the public path → muted (attention without alarm); anything
 *  else (an uninspected private flow) carries no tone. */
function toneForLog(r: FlowLogRecord): RecordRow['tone'] {
  if (r.action === 'deny') return 'bad';
  if (r.vsrx && r.action === 'allow') return 'ok';
  if (!r.vsrx && r.path === 'public') return 'muted';
  return undefined;
}

/** BUCKETS runs oldest ('T-04') → newest ('T-00'); "newest bucket first"
 *  reverses that ordering. Array#sort is a stable sort, so ties (same
 *  bucket, different flows) keep flowLogs()'s own relative order. */
const BUCKET_ORDER = [...BUCKETS].slice().reverse();

function buildLogRow(r: FlowLogRecord): RecordRow {
  const action = r.action + (r.vsrx ? ` · ${r.vsrx.zoneFrom}→${r.vsrx.zoneTo}` : '');
  return {
    id: r.id,
    label: r.src.label,
    cells: [r.bucket, r.src.label, r.dst, `${r.proto}/${r.port}`, fmtBytes(r.bytes), r.path, action],
    tone: toneForLog(r),
  };
}

function groupKeyForLog(r: FlowLogRecord, groupBy: string): string {
  switch (groupBy) {
    case 'source':
      return r.src.label;
    case 'destination':
      return r.dst;
    case 'path':
      return r.path;
    case 'action':
      return r.action;
    default:
      return 'All flows';
  }
}

/** The column this groupBy summarizes shows the group key itself; every
 *  other column shows its single common value, or a "<n> distinct" count
 *  when the group spans more than one. */
function distinctOr(values: string[]): string {
  const uniq = [...new Set(values)];
  return uniq.length === 1 ? uniq[0] : `${uniq.length} distinct`;
}

function buildGroupRow(groupBy: string, key: string, list: FlowLogRecord[]): RecordRow {
  const totalBytes = list.reduce((s, r) => s + r.bytes, 0);
  const denyCount = list.filter(r => r.action === 'deny').length;
  return {
    id: 'grp-' + groupBy + '-' + key,
    label: key,
    cells: [
      `${list.length} records`,
      groupBy === 'source' ? key : distinctOr(list.map(r => r.src.label)),
      groupBy === 'destination' ? key : distinctOr(list.map(r => r.dst)),
      distinctOr(list.map(r => `${r.proto}/${r.port}`)),
      fmtBytes(totalBytes),
      groupBy === 'path' ? key : distinctOr(list.map(r => r.path)),
      groupBy === 'action' ? key : distinctOr(list.map(r => r.action)),
    ],
    tone: denyCount > 0 ? 'bad' : undefined,
  };
}

function buildRecords(cc: CloudControl, groupBy: string): RecordRow[] {
  const logs = flowLogs(cc);

  if (groupBy === 'none') {
    return logs
      .slice()
      .sort((a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket))
      .map(buildLogRow);
  }

  const groups = new Map<string, FlowLogRecord[]>();
  logs.forEach(r => {
    const key = groupKeyForLog(r, groupBy);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  });

  return Array.from(groups.entries())
    .map(([key, list]) => ({ row: buildGroupRow(groupBy, key, list), bytes: list.reduce((s, r) => s + r.bytes, 0) }))
    .sort((a, b) => b.bytes - a.bytes)
    .map(({ row }) => row);
}

/** Throughput-weighted network-wide packet loss at the latest sample (%). */
function currentLoss(cc: CloudControl): number {
  const tel = cc.telemetry(SERIES_POINTS) as Telemetry;
  const regions = tel.regions ?? [];
  let wsum = 0;
  let w = 0;
  regions.forEach(r => {
    const last = r.loss?.[r.loss.length - 1] ?? 0;
    const tp = r.throughput?.[r.throughput.length - 1] ?? 0;
    wsum += last * tp;
    w += tp;
  });
  return w ? wsum / w : 0;
}

function buildKpis(cc: CloudControl): Kpi[] {
  const rk = cc.routingKpis();
  const eg = cc.egress();
  const rows = cc.routeFlows() as RouteFlowRow[];
  const p95 = percentile95(rows.map(r => r.current.latencyMs));
  const loss = currentLoss(cc);

  /* P95 is taken over the flow rows in the table below, each on the path it is
     on right now — and the tile says so. The briefing rail beside it speaks
     about REGIONS on the public path ("eu-north1 is the outlier at 204ms"),
     which is a different population, and neither tile nor sentence used to
     name its own. That is how a KPI reading 265ms came to sit beside a
     sentence naming 204ms as the estate's outlier: the 265 was a cloud-to-
     cloud row whose public latency was being priced off an AT&T backbone
     detour (fixed in `state-routing.ts`, `cloudToCloud`). */
  return [
    { key: 'throughput', label: 'Throughput', value: rk.totalGbps.toFixed(1), unit: 'Gbps' },
    {
      key: 'p95-latency',
      label: 'P95 Latency',
      value: String(Math.round(p95)),
      unit: 'ms',
      sub: `across ${rows.length} flows`,
    },
    { key: 'loss', label: 'Packet Loss', value: loss.toFixed(2), unit: '%' },
    // Row 50 of the phase-0 metric audit: "Egress" named traffic while the
    // figure is spend. Row 51: "Under Control" was builder language for
    // what the verdict line calls "on the AT&T fabric". Labels only.
    { key: 'egress', label: 'Egress Spend', value: fmtDollars(eg.total), sub: '/mo' },
    { key: 'under-control', label: 'On the AT&T Fabric', value: String(rk.pctUnderControl), unit: '%' },
    { key: 'savings', label: 'Savings', value: fmtDollars(eg.savings), sub: '/mo' },
  ];
}

function buildBriefing(cc: CloudControl): Briefing {
  const summary = stripTags(String(cc.obsSummary()));

  // Rows 55-56 of the phase-0 metric audit: the two narrative blocks that
  // used to open this briefing cut — a third statement of the verdict
  // line's 13% (row 55) and an 87%-of-Gbps sentence mislabelled "of flows"
  // (row 56), on a screen whose KPI strip (rows 50-51) and verdict line
  // (row 46) already carry both numbers. Their derivations (`routeFlows()`
  // filtered by control state) have no other consumer in this function and
  // are noted as orphaned in this task's report.
  const narrative: BriefingBlock[] = [
    { text: summary },
  ];

  const denies = flowLogs(cc).filter(r => r.action === 'deny');
  if (denies.length) {
    const first = denies[0];
    const regionsByCloud = (cc as unknown as { regions: Record<string, { id: string; name: string }[]> }).regions;
    const regionName =
      regionsByCloud[first.src.cloudId]?.find(r => r.id === first.src.regionId)?.name ?? first.src.regionId;
    narrative.push({
      text: `vSRX in ${regionName} blocked ${denies.length} flows from ${first.src.tag}-tagged workloads.`,
      emphasis: 'risk',
    });
  }

  return {
    narrative,
    actions: [
      { id: 'show-public', label: 'Show public flows' },
      { id: 'steer-worst', label: 'Steer worst offender' },
      { id: 'review-diversity', label: 'Review path diversity' },
    ],
    followups: [
      'Which flow would save the most by steering to AT&T mid-mile?',
      'What is driving the public egress spend?',
      'Are any controlled flows single-homed (no failover)?',
    ],
  };
}

/** Phase-1 verdict: the screen's conclusion in one sentence, savings-first.
 *  Every state returns a sentence - including the quiet fabric.
 *
 *  Emptiness is read off routeFlows() itself, not routingKpis().totalGbps:
 *  routingKpis() (src/engine/state-routing.ts) floors its internal total to
 *  `|| 1` to avoid a divide-by-zero, so totalGbps is never falsy even when
 *  there are no flows at all. The row count is the only reliable empty-state
 *  signal. */
export function buildVerdict(cc: CloudControl): string {
  const rows = cc.routeFlows();
  if (!rows.length) return 'No traffic yet. The fabric is quiet.';
  const rk = cc.routingKpis();
  const eg = cc.egress();
  const publicPct = 100 - rk.pctUnderControl;
  const saved = `${fmtDollars(eg.savings)}/mo`;
  if (publicPct <= 0) {
    return `All of your traffic rides the AT&T-controlled path, saving ${saved}.`;
  }
  return `${rk.pctUnderControl}% of your traffic rides the AT&T-controlled path, saving ${saved}. ${publicPct}% still crosses the public internet.`;
}

export function networkBinding(cc: CloudControl): ObservabilityBinding {
  return {
    layer: 'network',
    title: 'Network Observability',
    columns: ['Time', 'Source', 'Destination', 'Proto/Port', 'Bytes', 'Path', 'Action'],
    kpis: () => buildKpis(cc),
    flowTabs: () => FLOW_TABS,
    flowSeries: (tabId: string) => buildFlowSeries(cc, tabId),
    groupByOptions: () => GROUP_BY_OPTIONS,
    records: (groupBy: string) => buildRecords(cc, groupBy),
    briefing: () => buildBriefing(cc),
    verdict: buildVerdict(cc),
    moments: () => cc.windowMoments(),
    sankey: () => buildSankey(cc),
  };
}
