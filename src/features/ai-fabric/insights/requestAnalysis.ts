import type { InsightRequestRow, RequestFilters } from './insightsFigures';
import { fmtUsd } from '../aiSpend';

/**
 * One clickable bucket inside a facet: a label, its row count, and the exact
 * filter key/value `applyFilters` (insightsFigures.ts) recognizes - so a
 * click on a bucket can drive the same filter state the requests table reads.
 * `filterValue: ''` marks a bucket that summarizes many small groups (the
 * 'Other' bucket) rather than one real value - it has nothing to filter to,
 * so callers must treat it as unclickable.
 */
export interface FacetBucket {
  label: string;
  value: number;
  filterKey: keyof RequestFilters;
  filterValue: string;
}

/** A named group of buckets: one axis to slice today's requests by. */
export interface RequestFacet {
  id: 'identity' | 'model' | 'route' | 'outcome';
  title: string;
  buckets: FacetBucket[];
}

/** A single request called out for spending too much or answering too slow. */
export interface RequestOutlier {
  row: InsightRequestRow;
  kind: 'cost' | 'slow';
}

/**
 * Allowed/guardrailed/denied mirrors GovernanceDecisions.tsx:51-56's
 * predicate exactly: `ok` stands in for `allowed`, `guarded` is the same
 * decision-log field GovernanceDecisions reads (InsightRequestRow now
 * carries it straight through from decisionLog() in insightsFigures.ts).
 * `!ok` is always denied, regardless of `guarded`.
 */
function classify(row: InsightRequestRow): 'allowed' | 'guardrailed' | 'denied' {
  if (!row.ok) return 'denied';
  return row.guarded ? 'guardrailed' : 'allowed';
}

/**
 * The day's requests as one verdict sentence: how many ran, how the gateway
 * split their outcomes, and the money that moved. Empty rows get their own
 * sentence instead of a hollow "0 requests" - there is nothing to report on
 * yet, not a zero worth stating.
 */
export function requestVerdict(rows: InsightRequestRow[]): string {
  if (rows.length === 0) return 'No requests traced yet. Run a trace to populate this view.';

  let allowed = 0;
  let guardrailed = 0;
  let denied = 0;
  let spent = 0;
  let saved = 0;
  for (const row of rows) {
    const outcome = classify(row);
    if (outcome === 'allowed') allowed += 1;
    else if (outcome === 'guardrailed') guardrailed += 1;
    else denied += 1;
    spent += row.cost;
    saved += row.costSaved;
  }

  return (
    `${rows.length} requests today: ${allowed} allowed, ${guardrailed} guardrailed, ${denied} denied. ` +
    `${fmtUsd(spent)} spent, ${fmtUsd(saved)} saved.`
  );
}

/** Counts occurrences of `keyFn(row)`, in first-seen order of each key. */
function tally(rows: InsightRequestRow[], keyFn: (row: InsightRequestRow) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Turns a tally into value-desc buckets bound to one filter key. When `cap`
 * is set and the tally holds more distinct keys than that, the smallest
 * groups fold into one trailing 'Other' bucket (filterValue `''`, so it
 * cannot be clicked into a filter it cannot express) rather than spilling
 * a long tail into the facet.
 */
function bucketsFrom(
  counts: Map<string, number>,
  filterKey: keyof RequestFilters,
  cap?: number,
): FacetBucket[] {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!cap || sorted.length <= cap) {
    return sorted.map(([label, value]) => ({ label, value, filterKey, filterValue: label }));
  }
  const kept = sorted.slice(0, cap);
  const rest = sorted.slice(cap);
  const otherValue = rest.reduce((sum, [, value]) => sum + value, 0);
  const buckets = kept.map(([label, value]) => ({ label, value, filterKey, filterValue: label }));
  buckets.push({ label: 'Other', value: otherValue, filterKey, filterValue: '' });
  return buckets;
}

const FACET_CAP = 6;

/**
 * The day's requests sliced four ways: who ran them, which model answered,
 * which route they took, and how the gateway ruled. Route and outcome
 * buckets carry the same `path`/`status` filter values `applyFilters`
 * understands, so a click can drive the requests table directly.
 */
export function requestFacets(rows: InsightRequestRow[]): RequestFacet[] {
  return [
    {
      id: 'identity',
      title: 'Identity',
      buckets: bucketsFrom(tally(rows, r => r.identity), 'identity', FACET_CAP),
    },
    {
      id: 'model',
      title: 'Model',
      buckets: bucketsFrom(tally(rows, r => r.model), 'model', FACET_CAP),
    },
    {
      id: 'route',
      title: 'Route',
      buckets: bucketsFrom(tally(rows, r => r.route), 'path'),
    },
    {
      id: 'outcome',
      title: 'Outcome',
      buckets: bucketsFrom(tally(rows, r => String(r.status)), 'status'),
    },
  ];
}

/** Sorts rows by `valueOf` desc, breaking ties by `ts` desc, and takes the top 5. */
function top5(rows: InsightRequestRow[], valueOf: (row: InsightRequestRow) => number): InsightRequestRow[] {
  return [...rows]
    .sort((a, b) => {
      const d = valueOf(b) - valueOf(a);
      return d !== 0 ? d : b.ts - a.ts;
    })
    .slice(0, 5);
}

/**
 * The requests worth a second look: the five that cost the most, and the
 * five that took longest to answer. A short list, not the full log - a
 * viewer scanning for outliers should not have to page through everything
 * else to find them.
 */
export function requestOutliers(rows: InsightRequestRow[]): { cost: RequestOutlier[]; slow: RequestOutlier[] } {
  return {
    cost: top5(rows, r => r.cost).map(row => ({ row, kind: 'cost' as const })),
    slow: top5(rows, r => r.ttftMs).map(row => ({ row, kind: 'slow' as const })),
  };
}
