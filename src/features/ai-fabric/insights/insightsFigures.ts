import type { CloudControl, RequestRecord } from '../../../engine/types';
import {
  aiSpendTotals,
  fmtTokens,
  fmtUsd,
  routeLabel,
  statesRealMoney,
  tagModelMap,
  EXTERNAL_MODEL_ID,
  type ModelRoutePath,
} from '../aiSpend';

/**
 * The Insights screen's read side: the KPI strip and the requests table.
 *
 * Everything derives from the engine at call time. The KPI figures are the
 * SAME figures the sibling screens state - token money via aiSpendTotals,
 * TTFT over the full modelCatalog population (the population is the catalog
 * /ai/providers renders, never the meter-ready subset - see
 * observe/kpiPopulations.test.ts for why), request counts off
 * decisionLog(). The requests table renders recorded decisions only:
 * an entry without a tag predates the request-detail extension and has no
 * row to render, so it is skipped, never padded.
 */

interface ModelCatalogEntry {
  id: string;
  name: string;
  cloud: string | null;
  p50: number;
  price: number;
}

export interface InsightKpi {
  key: 'tokens' | 'cost' | 'ttft' | 'requests' | 'blocked';
  title: string;
  value: string;
  unit?: string;
  sub: string;
  subTone: 'neutral' | 'savings';
}

const SERIES_POINTS = 24;

function percentile95(values: number[]): number {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length))];
}

export function insightKpis(cc: CloudControl): InsightKpi[] {
  const totals = aiSpendTotals(cc);
  const catalog = cc.modelCatalog() as ModelCatalogEntry[];
  const log = (cc.decisionLog?.() ?? []) as RequestRecord[];
  const denied = log.filter(d => !d.allowed);

  const ttftPoints = catalog.flatMap(
    m => cc.modelLatencySeries(m.id, SERIES_POINTS) as number[],
  );
  const ttft = percentile95(ttftPoints.length ? ttftPoints : catalog.map(m => m.p50));

  const savingsReal = statesRealMoney(totals.savings);
  const savingsPct =
    totals.spendIfExternal > 0
      ? Math.round((totals.savings / totals.spendIfExternal) * 100)
      : 0;

  return [
    {
      key: 'tokens',
      title: 'Tokens',
      value: fmtTokens(totals.tokensToday),
      sub:
        totals.ungovernedTokensToday > 0
          ? `${fmtTokens(totals.governedTokensToday)} governed · ${fmtTokens(totals.ungovernedTokensToday)} public`
          : 'all on governed paths',
      subTone: 'neutral',
    },
    // Row 78 of the phase-0 metric audit: the card said "Cost" while the
    // emphasis toggle above it (InsightsPage.tsx) labels the same figure
    // "Spend", and "Savings $X (Y%)" never named what the saving beats.
    {
      key: 'cost',
      title: 'Spend',
      value: fmtUsd(totals.spendToday),
      sub: savingsReal ? `Saved ${fmtUsd(totals.savings)} vs external models (${savingsPct}%)` : '/today',
      subTone: savingsReal ? 'savings' : 'neutral',
    },
    {
      key: 'ttft',
      title: 'TTFT (p95 latency)',
      value: String(Math.round(ttft)),
      unit: 'ms',
      sub: `P95 across ${catalog.length} models`,
      subTone: 'neutral',
    },
    // Row 80 of the phase-0 metric audit: "Requests" cut from the KPI
    // strip — a gateway screen reading "6 requests today" reads as a
    // broken meter, not a small estate, and the request deep dive's own
    // opening sentence (RequestDeepDive.tsx, requestVerdict()) already
    // states this same count (`log.length` === `requestRows(cc).length`;
    // every decision the engine records carries a tag and a modelId, so
    // requestRows' filter never actually narrows the log).
    {
      key: 'blocked',
      title: 'Blocked requests',
      value: String(denied.length),
      /* This estate's denials are all token-policy denials - recordDecision
         quotes the trace's own DENIED sentence. No other denial kind exists,
         so no other kind is claimed.
         Row 81 of the phase-0 metric audit: the zero case read "Blocked
         requests · 0" beside "0 policy denials" — the same zero stated
         twice. The zero branch now reads as a sentence; non-zero counts are
         unchanged. */
      sub:
        denied.length === 0
          ? 'no request denied by policy today'
          : denied.length === 1
            ? '1 policy denial'
            : `${denied.length} policy denials`,
      subTone: 'neutral',
    },
  ];
}

export interface InsightRequestRow {
  id: string;
  ts: number;
  time: string;
  status: number;
  ok: boolean;
  /**
   * Mirrors the decision log's own `guarded` flag - the same field
   * GovernanceDecisions.tsx:53-55 reads to split its Allowed/Guardrail bars.
   * `ok && guarded` is a real guardrailed request; `ok && !guarded` is a
   * plain allow.
   */
  guarded: boolean;
  identity: string;
  model: string;
  provider: string;
  route: string;
  tokens: number;
  cost: number;
  costSaved: number;
  /** costSaved as a share of what the external model would have charged. */
  savedPct: number;
  ttftMs: number;
  reason: string | null;
}

export function providerName(cloud: string | null): string {
  if (cloud === 'cw') return 'CoreWeave';
  if (cloud === 'neb') return 'Nebius';
  return 'OpenAI (external)';
}

export function requestRows(cc: CloudControl): InsightRequestRow[] {
  const log = (cc.decisionLog?.() ?? []) as RequestRecord[];
  const catalog = cc.modelCatalog() as ModelCatalogEntry[];
  const external = catalog.find(m => m.id === EXTERNAL_MODEL_ID);
  const externalPrice = external?.price ?? 0;

  return log
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.tag !== null && d.modelId !== null)
    .map(({ d, i }) => {
      const model = catalog.find(m => m.id === d.modelId);
      const price = model?.price ?? 0;
      const cost = (d.tokens / 1_000_000) * price;
      const external$ = (d.tokens / 1_000_000) * externalPrice;
      const costSaved = Math.max(0, external$ - cost);
      return {
        id: `${d.ts}-${i}`,
        ts: d.ts,
        time: new Date(d.ts).toLocaleTimeString('en-US', { hour12: false }),
        status: d.allowed ? 200 : 403,
        ok: d.allowed,
        guarded: d.guarded,
        identity: d.tag as string,
        model: model?.name ?? (d.modelId as string),
        provider: providerName(model?.cloud ?? null),
        route: routeLabel(d.path as ModelRoutePath),
        tokens: d.tokens,
        cost,
        costSaved,
        savedPct: external$ > 0 ? Math.round((costSaved / external$) * 100) : 0,
        ttftMs: d.ttftMs,
        reason: d.reason,
      };
    })
    .reverse();
}

/** A sortable column of the requests log. `time` orders on the raw `ts`. */
export type RequestSort = {
  key: 'time' | 'tokens' | 'cost' | 'costSaved' | 'ttftMs';
  dir: 'asc' | 'desc';
};

/**
 * Stable, non-mutating sort. Ties keep their incoming order, so re-sorting
 * on a column full of equal values never shuffles rows under the viewer.
 */
export function sortRows(
  rows: InsightRequestRow[],
  sort: RequestSort,
): InsightRequestRow[] {
  const value = (r: InsightRequestRow) => (sort.key === 'time' ? r.ts : r[sort.key]);
  const dir = sort.dir === 'asc' ? 1 : -1;
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const d = value(a.r) - value(b.r);
      return d !== 0 ? d * dir : a.i - b.i;
    })
    .map(({ r }) => r);
}

export interface RequestWindow {
  rows: InsightRequestRow[];
  /** The page actually shown, clamped into [1, pages]. */
  page: number;
  pages: number;
  total: number;
}

/**
 * One page of the log. `page` is 1-based and clamped, so a filter change
 * that shrinks the row set can never leave the table on a blank page.
 */
export function windowRows(
  rows: InsightRequestRow[],
  page: number,
  pageSize = 25,
): RequestWindow {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const clamped = Math.min(Math.max(1, page), pages);
  return {
    rows: rows.slice((clamped - 1) * pageSize, clamped * pageSize),
    page: clamped,
    pages,
    total,
  };
}

export interface RequestFilters {
  q: string;
  provider: string;
  model: string;
  identity: string;
  path: string;
  status: string;
}

export const EMPTY_FILTERS: RequestFilters = {
  q: '',
  provider: 'all',
  model: 'all',
  identity: 'all',
  path: 'all',
  status: 'all',
};

const uniq = (xs: string[]) => Array.from(new Set(xs));

export function filterOptions(rows: InsightRequestRow[]) {
  return {
    provider: uniq(rows.map(r => r.provider)),
    model: uniq(rows.map(r => r.model)),
    identity: uniq(rows.map(r => r.identity)),
    path: uniq(rows.map(r => r.route)),
    status: uniq(rows.map(r => String(r.status))),
  };
}

export function applyFilters(
  rows: InsightRequestRow[],
  f: RequestFilters,
): InsightRequestRow[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter(r => {
    if (f.provider !== 'all' && r.provider !== f.provider) return false;
    if (f.model !== 'all' && r.model !== f.model) return false;
    if (f.identity !== 'all' && r.identity !== f.identity) return false;
    if (f.path !== 'all' && r.route !== f.path) return false;
    if (f.status !== 'all' && String(r.status) !== f.status) return false;
    if (q && !`${r.identity} ${r.model}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const CHIP_LABELS: Record<Exclude<keyof RequestFilters, 'q'>, string> = {
  provider: 'Provider',
  model: 'Model',
  identity: 'Identity',
  path: 'Path',
  status: 'Status',
};

export function activeChips(
  f: RequestFilters,
): { key: keyof RequestFilters; label: string; value: string }[] {
  const chips: { key: keyof RequestFilters; label: string; value: string }[] = [];
  (Object.keys(CHIP_LABELS) as (keyof typeof CHIP_LABELS)[]).forEach(k => {
    if (f[k] !== 'all') chips.push({ key: k, label: CHIP_LABELS[k], value: f[k] });
  });
  if (f.q.trim()) chips.push({ key: 'q', label: 'Search', value: f.q.trim() });
  return chips;
}
