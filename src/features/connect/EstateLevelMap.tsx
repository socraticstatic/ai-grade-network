import { useMemo, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import type { EdgeNode, EdgeSort, EdgeDim } from './edgeDrill';
import { SORTS, DIM_PLURAL } from './edgeDrill';

/**
 * The meta level: every group at the current depth, on screen at once.
 *
 * A fleet view earns trust by never summarising anything away. The diagram's
 * ingress column is a fixed height and can carry seven rows, so the version
 * before this one drew the largest seven and lumped the rest into "+ 6 more
 * metros" — which is precisely where the exposure hides. Twenty ATMs on
 * cellular in Birmingham do not show up in a lump; they show up when every
 * group is a tile you can see, sort and search.
 *
 * The form is the host-map/small-multiple answer rather than a treemap:
 * identical tiles, so the eye compares like with like, ordered by whichever
 * question is being asked (largest, most exposed, alphabetical). Area does
 * not encode count — the number does, and area-encoding thirty-five groups
 * makes the small ones unreadable and unclickable, which defeats the point.
 *
 * Colour carries the same meaning it does everywhere in this product: cobalt
 * is on the AT&T fabric. A tile's bar is the share; a fully attached group is
 * a full cobalt bar, and one still on the public internet is an empty track.
 */

const fmt = (n: number) => n.toLocaleString('en-US');

export function EstateLevelMap({
  nodes,
  dim,
  sort,
  onSort,
  query,
  onQuery,
  onOpen,
  onSelect,
  selectedId,
}: {
  /** EVERY group at this level, already sorted and filtered. */
  nodes: EdgeNode[];
  dim: EdgeDim;
  sort: EdgeSort;
  onSort: (s: EdgeSort) => void;
  query: string;
  onQuery: (q: string) => void;
  onOpen: (node: EdgeNode) => void;
  onSelect: (node: EdgeNode) => void;
  selectedId?: string | null;
}) {
  const [showAll, setShowAll] = useState(false);
  /* A soft cap on the initial paint only — "show all" is one click and the
     count is always stated, so nothing is ever hidden without saying so. */
  const CAP = 60;
  const visible = showAll ? nodes : nodes.slice(0, CAP);

  const totals = useMemo(() => {
    const sites = nodes.reduce((n, r) => n + r.count, 0);
    const onFabric = nodes.reduce((n, r) => n + r.onFabric, 0);
    const exposedGroups = nodes.filter(r => r.onFabric < r.count).length;
    return { sites, onFabric, exposedGroups };
  }, [nodes]);

  return (
    <section
      aria-label={`All ${DIM_PLURAL[dim]} at this level`}
      data-testid="estate-level-map"
      className="rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="font-semibold text-fw-heading">
            All {fmt(nodes.length)} {DIM_PLURAL[dim]}
          </h3>
          <p className="text-figma-xs text-fw-bodyLight">
            {fmt(totals.sites)} sites · {fmt(totals.sites - totals.onFabric)} still off the fabric
            {totals.exposedGroups > 0 && ` across ${fmt(totals.exposedGroups)} of them`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search {DIM_PLURAL[dim]}</span>
            <Search
              size={13}
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fw-bodyLight"
            />
            <input
              type="search"
              value={query}
              onChange={e => onQuery(e.target.value)}
              placeholder={`Find a ${dim}`}
              className="w-40 rounded-lg border border-fw-secondary bg-fw-base py-1.5 pl-7 pr-2 text-figma-xs text-fw-heading placeholder:text-fw-bodyLight focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link/50"
            />
          </label>

          <div role="group" aria-label="Sort" className="flex rounded-lg border border-fw-secondary p-0.5">
            {SORTS.map(s => (
              <button
                key={s.id}
                type="button"
                aria-pressed={sort === s.id}
                onClick={() => onSort(s.id)}
                className={`rounded-[6px] px-2 py-1 text-[11px] font-medium transition-colors ${
                  sort === s.id ? 'bg-fw-ctaPrimary text-white' : 'text-fw-bodyLight hover:bg-fw-wash'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {nodes.length === 0 ? (
        <p className="py-6 text-center text-figma-sm text-fw-bodyLight">
          Nothing matches “{query}”.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map(n => {
              const pct = Math.round(n.share * 100);
              const off = n.count - n.onFabric;
              const selected = selectedId === n.id;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    data-testid={`level-tile-${n.id}`}
                    aria-pressed={selected}
                    onClick={() => (n.drillable ? onOpen(n) : onSelect(n))}
                    className={`flex h-full w-full flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link/50 ${
                      selected
                        ? 'border-fw-active bg-fw-ctaPrimary/[0.05] ring-1 ring-fw-link'
                        : 'border-fw-secondary bg-fw-base hover:bg-fw-wash'
                    }`}
                  >
                    <span className="flex items-baseline gap-1">
                      <span className="min-w-0 flex-1 truncate text-figma-xs font-semibold text-fw-heading">
                        {n.label}
                      </span>
                      {n.drillable && (
                        <ChevronRight size={12} className="shrink-0 text-fw-link" aria-hidden="true" />
                      )}
                    </span>
                    <span className="flex items-baseline gap-1.5">
                      {/* An individual building is not "1 · all on fabric" —
                          it is on the fabric or it is not. Counting to one is
                          the tell of a template that never met a leaf. */}
                      {n.count === 1 ? (
                        <span className="text-[11px] font-medium text-fw-bodyLight">
                          {n.onFabric === 1 ? 'On the AT&T fabric' : 'On the public internet'}
                        </span>
                      ) : (
                        <>
                          <span className="text-figma-base font-semibold tabular-nums leading-none text-fw-heading">
                            {fmt(n.count)}
                          </span>
                          <span className="text-[10px] text-fw-bodyLight">
                            {off === 0 ? 'all on fabric' : `${fmt(off)} off`}
                          </span>
                        </>
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex h-1.5 w-full overflow-hidden rounded-full bg-fw-secondary"
                      title={`${pct}% on the AT&T fabric`}
                    >
                      <span className="h-full rounded-full bg-fw-ctaPrimary" style={{ width: `${pct}%` }} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {nodes.length > visible.length && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full rounded-lg border border-fw-secondary py-2 text-figma-xs font-medium text-fw-link hover:bg-fw-wash focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link/50"
            >
              Show the remaining {fmt(nodes.length - visible.length)} {DIM_PLURAL[dim]}
            </button>
          )}
        </>
      )}
    </section>
  );
}
