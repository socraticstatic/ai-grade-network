import { Search, X } from 'lucide-react';
import {
  activeChips,
  filterOptions,
  EMPTY_FILTERS,
  type InsightRequestRow,
  type RequestFilters,
} from './insightsFigures';

const SELECTS: { key: Exclude<keyof RequestFilters, 'q'>; label: string }[] = [
  { key: 'provider', label: 'Provider' },
  { key: 'model', label: 'Model' },
  { key: 'identity', label: 'Identity' },
  { key: 'path', label: 'Path' },
  { key: 'status', label: 'Status' },
];

/**
 * Search + five scoped selects + applied-filter chips (Figma 1:5581).
 * Options come off the rows themselves, so a filter can never offer a value
 * the table cannot show. Each chip's × clears exactly its own key.
 */
export function RequestsFilterBar({
  rows,
  filters,
  onChange,
}: {
  rows: InsightRequestRow[];
  filters: RequestFilters;
  onChange: (f: RequestFilters) => void;
}) {
  const options = filterOptions(rows);
  const chips = activeChips(filters);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-5">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fw-bodyLight" aria-hidden="true" />
          <input
            data-testid="req-search"
            type="search"
            value={filters.q}
            onChange={e => onChange({ ...filters, q: e.target.value })}
            placeholder="Search identity, model..."
            aria-label="Search requests"
            className="h-9 w-[284px] max-w-full rounded-lg border border-fw-secondary bg-fw-base pl-9 pr-3 text-figma-sm text-fw-body placeholder:text-fw-bodyLight shadow-[0px_1px_1px_0px_rgba(0,0,0,0.1)]"
          />
        </label>
        {SELECTS.map(s => (
          <label key={s.key} className="flex items-center gap-2 text-figma-sm">
            <span className="font-medium text-fw-heading">{s.label}</span>
            <select
              data-testid={`req-filter-${s.key}`}
              value={filters[s.key]}
              onChange={e => onChange({ ...filters, [s.key]: e.target.value })}
              className="h-9 rounded-lg border border-fw-secondary bg-fw-base px-3 text-figma-sm text-fw-body shadow-[0px_1px_1px_0px_rgba(0,0,0,0.1)]"
            >
              <option value="all">All</option>
              {options[s.key].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map(chip => (
            <span
              key={chip.key}
              data-testid={`req-chip-${chip.key}`}
              className="inline-flex items-center gap-1 rounded-full border border-fw-secondary bg-fw-accent px-2 py-0.5 text-xs font-medium"
            >
              <span className="text-fw-blue-functional">{chip.label}: </span>
              <span className="text-fw-heading">{chip.value}</span>
              <button
                type="button"
                aria-label={`Clear ${chip.label} filter`}
                onClick={() =>
                  onChange(
                    chip.key === 'q'
                      ? { ...filters, q: '' }
                      : { ...filters, [chip.key]: 'all' },
                  )
                }
                className="ml-0.5 text-fw-bodyLight hover:text-fw-body"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            type="button"
            data-testid="req-clear-all"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="h-6 rounded-lg px-2 text-xs font-medium text-fw-cobalt-700 hover:bg-fw-wash"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
