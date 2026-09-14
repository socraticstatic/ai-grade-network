import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { CC } from '../../../engine';
import { useCloudControlLive } from '../../../engine/react/useCloudControl';
import { insightKpis, requestRows, applyFilters, EMPTY_FILTERS, type RequestFilters } from './insightsFigures';
import { sankeyGraph } from './sankeyModel';
import { KpiStrip } from './KpiStrip';
import { TrafficSankey } from './TrafficSankey';
import { RequestsFilterBar } from './RequestsFilterBar';
import { RequestsTable } from './RequestsTable';
import { RequestDeepDive } from './RequestDeepDive';
import { PerformanceTab } from './PerformanceTab';
import { SavingsTab } from './SavingsTab';
import { SecurityTab } from './SecurityTab';

type TabId = 'performance' | 'savings' | 'security';

const TABS: { id: TabId; label: string }[] = [
  { id: 'performance', label: 'Performance' },
  { id: 'savings', label: 'Savings' },
  { id: 'security', label: 'Security' },
];

/** `?tab=cost` deep-links still land: cost is the Figma's name for the tab
 *  this product calls Savings, and the /ai/cost redirect mints it. */
function tabFromParam(v: string | null): TabId {
  if (v === 'cost' || v === 'savings') return 'savings';
  if (v === 'security') return 'security';
  return 'performance';
}

/**
 * Seconds since the engine last emitted. Presentation only - no derived
 * figure reads this clock; it exists so "Updated Ns ago" is the truth of
 * the engine's own tick rather than a decorative timestamp.
 */
function useUpdatedAgo(): number {
  const lastRef = useRef(Date.now());
  const [ago, setAgo] = useState(0);
  useEffect(() => {
    const unsub = CC.subscribe(() => { lastRef.current = Date.now(); });
    const t = setInterval(() => {
      setAgo(Math.max(0, Math.round((Date.now() - lastRef.current) / 1000)));
    }, 1000);
    return () => { unsub?.(); clearInterval(t); };
  }, []);
  return ago;
}

export function InsightsPage() {
  const [params, setParams] = useSearchParams();
  const tab = tabFromParam(params.get('tab'));
  const [filters, setFilters] = useState<RequestFilters>(EMPTY_FILTERS);
  // Row 80 of the phase-0 metric audit cut the "Requests" KPI card; the
  // emphasis toggle drops the option that pointed at it rather than leave
  // a control that highlights nothing.
  const [emphasis, setEmphasis] = useState<'tokens' | 'cost'>('tokens');
  const ago = useUpdatedAgo();

  const view = useCloudControlLive(cc => ({
    kpis: insightKpis(cc),
    rows: requestRows(cc),
    graph: sankeyGraph(cc),
  }));

  const setTab = (id: TabId) => {
    const next = new URLSearchParams(params);
    if (id === 'performance') next.delete('tab');
    else next.set('tab', id);
    setParams(next, { replace: true });
  };

  const visibleRows = applyFilters(view.rows, filters);

  return (
    <div className="space-y-4" data-testid="insights-page">
      {/* Inner header: live updated-ago, the one window the engine derives,
          and the unit toggle that emphasizes its KPI card. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-[-0.03em] text-fw-heading">Insights</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs text-fw-bodyLight" data-testid="updated-ago">
            Updated {ago}s ago
          </span>
          <span className="h-4 w-px bg-fw-secondary" aria-hidden="true" />
          <span
            className="inline-flex items-center gap-1.5 px-1.5 text-xs font-medium text-fw-body"
            title="The engine derives one 24h window"
          >
            <Calendar className="h-4 w-4 text-fw-bodyLight" aria-hidden="true" />
            Last 24h
          </span>
          <div
            role="group"
            aria-label="Emphasize a figure"
            className="flex rounded-xl bg-fw-accent p-1"
          >
            {(['tokens', 'cost'] as const).map(u => (
              <button
                key={u}
                type="button"
                data-testid={`unit-${u}`}
                aria-pressed={emphasis === u}
                onClick={() => setEmphasis(u)}
                className={`h-7 rounded-lg px-2 text-figma-sm font-medium capitalize ${
                  emphasis === u
                    ? 'bg-fw-wash text-fw-heading shadow-[0px_1px_1.5px_0px_rgba(0,0,0,0.1)]'
                    : 'text-fw-body'
                }`}
              >
                {u === 'cost' ? 'Spend' : u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* data-tour: the guided tour's Insights beat spotlights the strip,
          not the whole page — a full-page cutout highlights nothing (see
          e2e/tour.spec.ts, the Discover spotlight finding). */}
      <div data-tour="insights-kpis">
        <KpiStrip kpis={view.kpis} emphasize={emphasis} />
      </div>

      <div role="tablist" aria-label="Insights sections" className="flex gap-1 border-b border-fw-secondary">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-testid={`tab-${t.id}`}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-10 px-4 text-figma-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-fw-cobalt-600 text-fw-cobalt-600'
                : 'border-transparent text-fw-bodyLight hover:text-fw-body'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'performance' && (
        <div className="space-y-4">
          <TrafficSankey graph={view.graph} />
          <PerformanceTab />
        </div>
      )}
      {tab === 'savings' && <SavingsTab />}
      {tab === 'security' && <SecurityTab />}

      <RequestDeepDive rows={view.rows} filters={filters} onFiltersChange={setFilters} />
      <details data-testid="raw-log">
        <summary className="cursor-pointer text-figma-sm font-medium text-fw-link">Show the raw log</summary>
        <div className="mt-3 space-y-3">
          <RequestsFilterBar rows={view.rows} filters={filters} onChange={setFilters} />
          <RequestsTable rows={visibleRows} />
        </div>
      </details>
    </div>
  );
}
