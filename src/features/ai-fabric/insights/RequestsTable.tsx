import { useState } from 'react';
import { fmtTokens, fmtUsd } from '../aiSpend';
import {
  sortRows,
  windowRows,
  type InsightRequestRow,
  type RequestSort,
} from './insightsFigures';
import { RequestDrawer } from './RequestDrawer';

/**
 * The request-level log (Figma 1:5302), savings columns in green. Ten
 * columns, not the comp's fifteen: this estate carries no ingress-site,
 * body-size or wall-clock-total facts, and an invented column is a mock
 * column. Divider borders only, wash header row, 56px rows.
 *
 * Numeric columns sort (click toggles asc/desc, newest-first by default),
 * the log windows at 25 rows a page, and clicking a row opens the
 * per-request drawer - the LiteLLM pattern the Figma reference catalogued.
 */

const PAGE_SIZE = 25;

type SortKey = RequestSort['key'];

const COLUMNS: { label: string; sortKey: SortKey | null }[] = [
  { label: 'Time', sortKey: 'time' },
  { label: 'Status', sortKey: null },
  { label: 'Identity', sortKey: null },
  { label: 'Model', sortKey: null },
  { label: 'Route', sortKey: null },
  { label: 'Tokens', sortKey: 'tokens' },
  { label: 'Cost', sortKey: 'cost' },
  { label: 'Cost savings', sortKey: 'costSaved' },
  { label: 'TTFT', sortKey: 'ttftMs' },
  { label: 'Reason', sortKey: null },
];

export function RequestsTable({ rows }: { rows: InsightRequestRow[] }) {
  const [sort, setSort] = useState<RequestSort>({ key: 'time', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const win = windowRows(sortRows(rows, sort), page, PAGE_SIZE);
  const openRow = openId === null ? null : rows.find(r => r.id === openId) ?? null;

  const toggleSort = (key: SortKey) => {
    setSort(s =>
      s.key === key
        ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: 'desc' },
    );
  };

  const first = (win.page - 1) * PAGE_SIZE + 1;
  const last = first + win.rows.length - 1;

  return (
    <>
      <section
        data-testid="requests-table"
        className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-figma-base font-bold text-fw-body tracking-[-0.03em]">
            Requests ({rows.length})
          </h3>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 pb-5 text-figma-sm text-fw-bodyLight">
            No requests yet. Agents issue traced requests every few seconds, so this
            table fills on its own.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-figma-sm">
              <thead>
                <tr className="bg-fw-wash border-b border-fw-secondary text-left">
                  {COLUMNS.map(col =>
                    col.sortKey ? (
                      <th
                        key={col.label}
                        aria-sort={
                          sort.key === col.sortKey
                            ? sort.dir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : undefined
                        }
                        className="px-3 py-2 first:pl-4 font-bold text-fw-heading whitespace-nowrap"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(col.sortKey as SortKey)}
                          className="inline-flex items-center gap-1 font-bold text-fw-heading"
                        >
                          {col.label}
                          <span aria-hidden="true" className="text-fw-bodyLight">
                            {sort.key === col.sortKey
                              ? sort.dir === 'asc'
                                ? '▲'
                                : '▼'
                              : '↕'}
                          </span>
                        </button>
                      </th>
                    ) : (
                      <th
                        key={col.label}
                        className="px-3 py-2 first:pl-4 font-bold text-fw-heading whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {win.rows.map(r => (
                  <tr
                    key={r.id}
                    data-testid={`req-row-${r.id}`}
                    tabIndex={0}
                    onClick={() => setOpenId(r.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenId(r.id);
                      }
                    }}
                    className="h-14 border-b border-fw-secondary last:border-b-0 cursor-pointer hover:bg-fw-wash"
                  >
                    <td className="px-3 pl-4 text-fw-body whitespace-nowrap">{r.time}</td>
                    <td className="px-3">
                      <span className="inline-flex items-center gap-1 rounded-2xl text-fw-body">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 rounded-full ${r.ok ? 'bg-fw-success' : 'bg-fw-red-600'}`}
                        />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 text-fw-body">{r.identity}</td>
                    <td className="px-3">
                      <span className="block text-fw-body">{r.model}</span>
                      <span className="block text-xs text-fw-bodyLight">{r.provider}</span>
                    </td>
                    <td className="px-3 text-fw-body whitespace-nowrap">{r.route}</td>
                    <td className="px-3 text-fw-body">{r.tokens > 0 ? fmtTokens(r.tokens) : '0'}</td>
                    <td className="px-3 text-fw-body whitespace-nowrap">{r.ok ? fmtUsd(r.cost) : fmtUsd(0)}</td>
                    <td className="px-3 whitespace-nowrap">
                      {r.costSaved > 0 ? (
                        <>
                          <span className="block text-fw-success">{fmtUsd(r.costSaved)}</span>
                          <span className="block text-xs text-fw-success">{r.savedPct}%</span>
                        </>
                      ) : (
                        <span className="text-fw-bodyLight">·</span>
                      )}
                    </td>
                    <td className="px-3 text-fw-body whitespace-nowrap">
                      {r.ok ? `${Math.round(r.ttftMs)}ms` : '·'}
                    </td>
                    <td className="px-3 text-fw-bodyLight max-w-[280px] truncate" title={r.reason ?? undefined}>
                      {r.reason ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {win.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-fw-secondary px-4 py-3 text-figma-sm text-fw-bodyLight">
            <span>
              {first}-{last} of {win.total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="req-prev"
                disabled={win.page <= 1}
                onClick={() => setPage(win.page - 1)}
                className="rounded-lg border border-fw-secondary px-3 py-1 text-fw-body disabled:text-fw-disabled disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                type="button"
                data-testid="req-next"
                disabled={win.page >= win.pages}
                onClick={() => setPage(win.page + 1)}
                className="rounded-lg border border-fw-secondary px-3 py-1 text-fw-body disabled:text-fw-disabled disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
      {openRow && <RequestDrawer row={openRow} onClose={() => setOpenId(null)} />}
    </>
  );
}
