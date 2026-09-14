import { useState } from 'react';
import { VIZ_HEX } from '../../../components/viz/kit';
import { fmtUsd } from '../aiSpend';
import type { InsightRequestRow, RequestFilters } from './insightsFigures';
import {
  requestVerdict,
  requestFacets,
  requestOutliers,
  type FacetBucket,
  type RequestFacet,
  type RequestOutlier,
} from './requestAnalysis';
import { RequestDrawer } from './RequestDrawer';

/**
 * The requests screen opens with a verdict, not a table: one sentence for
 * today's outcome split and spend, four facets to slice by, and the five
 * costliest and slowest requests called out. The raw log is one disclosure
 * away (InsightsPage), not the first thing on screen.
 *
 * CategoryBars (src/components/viz/kit) renders its own <li>/<span> markup
 * with no seam for a per-row click handler, and every bucket here except
 * the unclickable 'Other' tail needs to be a real <button> carrying its own
 * testid and aria-pressed state. Rather than fight CategoryBars' markup,
 * facet rows are rolled here in the same idiom - label · count, single-hue
 * bar scaled to the facet's max - so the interactive contract (button,
 * data-testid, aria-pressed) can live on the row itself.
 */

const FACET_COLOR: Record<RequestFacet['id'], string> = {
  identity: VIZ_HEX.cobalt,
  model: VIZ_HEX.cobaltSoft,
  route: VIZ_HEX.slateInk,
  outcome: VIZ_HEX.green,
};

export function RequestDeepDive({
  rows,
  filters,
  onFiltersChange,
}: {
  rows: InsightRequestRow[];
  filters: RequestFilters;
  onFiltersChange: (f: RequestFilters) => void;
}) {
  const [openRow, setOpenRow] = useState<InsightRequestRow | null>(null);

  const facets = requestFacets(rows);
  const outliers = requestOutliers(rows);

  const toggleBucket = (bucket: FacetBucket) => {
    const isActive = filters[bucket.filterKey] === bucket.filterValue;
    onFiltersChange({ ...filters, [bucket.filterKey]: isActive ? 'all' : bucket.filterValue });
  };

  return (
    <div className="space-y-4" data-testid="request-deep-dive">
      <p data-testid="requests-verdict" className="text-figma-sm text-fw-body">
        {requestVerdict(rows)}
      </p>

      <div className="grid gap-4 min-[1024px]:grid-cols-2">
        {facets.map(facet => {
          const max = Math.max(...facet.buckets.map(b => b.value), 1);
          return (
            <section
              key={facet.id}
              className="rounded-2xl border border-fw-secondary bg-fw-base p-4"
            >
              <h3 className="mb-3 text-figma-sm font-bold text-fw-heading">{facet.title}</h3>
              <ul aria-label={facet.title} className="space-y-2">
                {facet.buckets.map(bucket => (
                  <FacetRow
                    key={bucket.label}
                    facetId={facet.id}
                    bucket={bucket}
                    width={`${(bucket.value / max) * 100}%`}
                    color={FACET_COLOR[facet.id]}
                    active={filters[bucket.filterKey] === bucket.filterValue}
                    onToggle={() => toggleBucket(bucket)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="grid gap-4 min-[1024px]:grid-cols-2">
        <OutlierList
          testId="outliers-cost"
          title="Highest cost"
          outliers={outliers.cost}
          metric={row => fmtUsd(row.cost)}
          onSelect={setOpenRow}
        />
        <OutlierList
          testId="outliers-slow"
          title="Slowest to answer"
          outliers={outliers.slow}
          metric={row => `${Math.round(row.ttftMs)}ms`}
          onSelect={setOpenRow}
        />
      </div>

      {openRow && <RequestDrawer row={openRow} onClose={() => setOpenRow(null)} />}
    </div>
  );
}

function FacetRow({
  facetId,
  bucket,
  width,
  color,
  active,
  onToggle,
}: {
  facetId: RequestFacet['id'];
  bucket: FacetBucket;
  width: string;
  color: string;
  active: boolean;
  onToggle: () => void;
}) {
  const bar = (
    <>
      <span className="w-32 shrink-0 text-figma-xs text-fw-body tabular-nums">{`${bucket.label} · ${bucket.value}`}</span>
      <span className="relative h-3 flex-1 overflow-hidden rounded bg-fw-wash">
        <span
          className="absolute inset-y-0 left-0 rounded"
          style={{ width, background: color }}
        />
      </span>
    </>
  );

  // The 'Other' tail (filterValue '') folds many small groups into one row -
  // it has no single value to filter to, so it renders as a plain row, not
  // a button a click on it would silently do nothing.
  if (bucket.filterValue === '') {
    return <li className="flex items-center gap-3">{bar}</li>;
  }

  return (
    <li>
      <button
        type="button"
        data-testid={`facet-${facetId}-${bucket.filterValue}`}
        aria-pressed={active}
        onClick={onToggle}
        className={`flex w-full items-center gap-3 rounded text-left ${
          active ? 'bg-fw-accent' : 'hover:bg-fw-wash'
        }`}
      >
        {bar}
      </button>
    </li>
  );
}

function OutlierList({
  testId,
  title,
  outliers,
  metric,
  onSelect,
}: {
  testId: string;
  title: string;
  outliers: RequestOutlier[];
  metric: (row: InsightRequestRow) => string;
  onSelect: (row: InsightRequestRow) => void;
}) {
  return (
    <section data-testid={testId} className="rounded-2xl border border-fw-secondary bg-fw-base p-4">
      <h3 className="mb-3 text-figma-sm font-bold text-fw-heading">{title}</h3>
      {outliers.length === 0 ? (
        <p className="text-figma-xs text-fw-bodyLight">Nothing to flag yet.</p>
      ) : (
        <ul className="divide-y divide-fw-secondary">
          {outliers.map(({ row }) => (
            <li key={row.id}>
              <button
                type="button"
                data-testid={`outlier-row-${row.id}`}
                onClick={() => onSelect(row)}
                className="flex w-full items-center gap-3 py-2 text-left hover:bg-fw-wash"
              >
                <span className="w-20 shrink-0 text-figma-xs text-fw-bodyLight tabular-nums">{row.time}</span>
                <span className="flex-1 truncate text-figma-sm text-fw-body">{row.identity}</span>
                <span className="w-28 shrink-0 truncate text-figma-xs text-fw-bodyLight">{row.model}</span>
                <span className="w-16 shrink-0 text-right text-figma-sm font-medium text-fw-heading tabular-nums">
                  {metric(row)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
