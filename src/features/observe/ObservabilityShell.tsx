import { useState } from 'react';
import type { ObservabilityBinding, RecordRow } from './ObservabilityBinding';
import { SankeyPanel } from './SankeyPanel';
import type { SiteClass } from '../discover/discoveryModel';
import type { SankeyDrill } from './sankeyModel';
import { TrendBand } from '../../components/viz/kit';

// Left-border tone indicator per record row. `ok` resolves against
// tailwind.config.js's `borderColor.fw-success`; the attention tone ("warn"/
// "bad") uses a neutral slate left-border (fw-primary) — no warm tone; meaning is
// carried by position + copy, not a warm hue.
function toneClass(tone: RecordRow['tone']): string {
  switch (tone) {
    case 'ok':
      return 'border-l-2 border-l-fw-success';
    case 'warn':
    case 'bad':
      return 'border-l-2 border-l-fw-primary';
    default:
      return '';
  }
}

const RECORD_LIMIT = 50;

export function ObservabilityShell({
  binding,
  sankeyDrill = null,
  onSankeyDrill,
  sankeyDrills,
  onSankeyDrills,
}: {
  binding: ObservabilityBinding;
  /** Sankey site-band drill state, owned by the page (it also owns the
   *  estate filters the same band reads). */
  sankeyDrill?: SiteClass | null;
  onSankeyDrill?: (cls: SiteClass | null) => void;
  sankeyDrills?: SankeyDrill;
  onSankeyDrills?: (d: SankeyDrill) => void;
}) {
  const tabs = binding.flowTabs();
  const groups = binding.groupByOptions();
  const [tab, setTab] = useState(tabs[0]?.id ?? '');
  /* Opens ROLLED UP, never flat. The brainstorm's rule for this product is
     the same on every surface - "aggregate first, never thousands of
     individual nodes... rollup-then-filter has to come before rendering
     entities" - and a records table defaulting to one row per flow is the
     one place that rule was still being broken. 'Path' is the grouping this
     screen's own argument is about. */
  const [groupBy, setGroupBy] = useState(
    groups.find(g => g.id === 'path')?.id ?? groups.find(g => g.id !== 'none')?.id ?? 'none',
  );
  // The time machine: null = live; an index reviews that instant of the
  // window. The readout restates the drawn series value verbatim — the
  // scrubber never re-derives a figure (see the spec's honesty invariants).
  const [cursor, setCursor] = useState<number | null>(null);
  const kpis = binding.kpis();
  const allRows = binding.records(groupBy);
  /* The same 50-row contract the estate tree honours: past it, say how many
     are hidden and how to reach them rather than printing a wall nobody
     scrolls. */
  const rows = allRows.slice(0, RECORD_LIMIT);
  const hiddenRecords = allRows.length - rows.length;
  const series = binding.flowSeries(tab);
  const brief = binding.briefing();
  const moments = binding.moments?.() ?? [];
  const hasSeries = series.length > 0 && !series.every(p => p.v === 0);
  const reviewing = cursor !== null && hasSeries;
  const at = reviewing ? Math.min(cursor, series.length - 1) : null;
  const activeTab = tabs.find(t => t.id === tab);
  const tabLabel = activeTab?.label ?? tab;
  const isSankey = activeTab?.view === 'sankey';
  // A moment "reaches" the cursor when it sits within 6% of the window.
  const nearMoment = at !== null && series.length > 1
    ? moments.find(m => Math.abs(m.at - at / (series.length - 1)) < 0.06) ?? null
    : null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-figma-2xl font-semibold text-fw-heading">{binding.title}</h1>
        {reviewing ? (
          <span className="inline-flex items-center gap-2 text-figma-xs font-medium text-fw-link">
            <span className="h-2 w-2 rounded-full bg-fw-active" /> Reviewing {series[at!].t}
            <button
              type="button"
              data-testid="tm-live"
              onClick={() => setCursor(null)}
              className="h-6 px-2.5 rounded-full border border-fw-secondary bg-fw-base text-figma-xs font-medium text-fw-body hover:border-fw-active hover:text-fw-link"
            >
              Back to live
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-figma-xs font-medium text-fw-success">
            <span className="h-2 w-2 rounded-full bg-fw-success" /> Live
          </span>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <div key={k.key} data-testid="kpi-tile" className="rounded-2xl border border-fw-secondary bg-fw-base p-4">
            <div className="text-figma-xs uppercase tracking-wide text-fw-bodyLight">{k.label}</div>
            <div className="mt-1 text-figma-2xl font-semibold text-fw-heading tabular-nums">
              {k.value}{k.unit ? <span className="text-figma-sm text-fw-bodyLight ml-1">{k.unit}</span> : null}
            </div>
            {k.sub ? <div className="text-figma-xs text-fw-bodyLight mt-0.5">{k.sub}</div> : null}
          </div>
        ))}
      </div>

      {/* Single column: the flow panel and records get the full page width —
          the chart is the money screen's centerpiece, and a side rail was
          squeezing it to two-thirds size. The briefing reads fine as a band
          below the data it narrates. */}
      <div className="space-y-4">
        {/* main column */}
        <div className="space-y-4">
          {/* flow panel */}
          <div data-tour="observe-telemetry" className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
            <div className="flex items-center gap-1 px-3 py-2 border-b border-fw-secondary bg-fw-wash">
              {tabs.map(t => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  className={`h-8 px-3 rounded-full text-figma-xs font-medium ${tab === t.id ? 'bg-fw-heading text-white' : 'text-fw-body hover:bg-fw-wash'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div data-testid="flow-panel" data-tab={tab} className="p-4">
              {isSankey ? (
                <SankeyPanel
                  model={binding.sankey!()}
                  scope={binding.sankeyScope?.()}
                  drill={sankeyDrill}
                  onDrill={onSankeyDrill}
                  drills={sankeyDrills}
                  onDrills={onSankeyDrills}
                />
              ) : series.length === 0 || series.every(p => p.v === 0) ? (
                <div data-testid="flow-empty" className="h-24 flex items-center justify-center text-figma-sm text-fw-bodyLight text-center px-4">
                  {binding.emptyHint ?? 'No flow in this window yet.'}
                </div>
              ) : (
                <TrendBand series={series} cursor={at} reviewing={reviewing} />
              )}

              {/* The time machine: scrub the window the charts already draw.
                  Markers sit only where the engine placed a moment. Series
                  tabs only — the sankey has no timeline to scrub. */}
              {!isSankey && hasSeries && (
                <div className="mt-3">
                  <div className="relative">
                    <input
                      type="range"
                      data-testid="tm-scrubber"
                      aria-label="Review the window"
                      min={0}
                      max={series.length - 1}
                      step={1}
                      value={at ?? series.length - 1}
                      onChange={e => setCursor(Number(e.target.value))}
                      className="w-full accent-fw-ctaPrimary"
                    />
                    {series.length > 1 && moments.map(m => (
                      <span
                        key={m.key}
                        data-testid="tm-moment"
                        title={m.label}
                        className="absolute -top-1 h-2 w-2 rounded-full bg-fw-heading/60 pointer-events-none"
                        style={{ left: `calc(${Math.min(Math.max(m.at, 0), 1) * 100}% - 4px)` }}
                      />
                    ))}
                  </div>
                  <p
                    data-testid="tm-readout"
                    aria-live="polite"
                    className="mt-1 text-figma-xs text-fw-bodyLight tabular-nums"
                  >
                    {reviewing
                      ? <>
                          <span className="font-semibold text-fw-heading">{series[at!].t}</span>
                          {' · '}{series[at!].v}{' · '}{tabLabel}
                          {nearMoment && <span className="text-fw-link font-medium"> — {nearMoment.label}</span>}
                        </>
                      : 'Live edge — drag to review the window.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* records table */}
          <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
              <span className="font-medium text-fw-heading">Records</span>
              <span className="flex-1 text-figma-xs text-fw-bodyLight">
                {allRows.length.toLocaleString()} {groupBy === 'none' ? 'flows' : 'groups'}
              </span>
              <label htmlFor="groupby-select" className="text-figma-xs text-fw-bodyLight">Group by</label>
              <select id="groupby-select" data-testid="groupby-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}
                className="h-8 px-2 rounded-md border border-fw-secondary bg-fw-base text-figma-xs text-fw-body">
                {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
            <table className="w-full text-figma-sm">
              <thead>
                <tr className="text-left text-figma-xs uppercase tracking-wide text-fw-bodyLight bg-fw-wash/60">
                  {binding.columns.map(c => <th key={c} className="px-5 py-2 font-medium">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-fw-secondary">
                {rows.map(r => (
                  <tr key={r.id} data-testid="record-row" className={toneClass(r.tone)}>
                    {r.cells.map((cell, i) => <td key={i} className="px-5 py-2.5 text-fw-body">{cell}</td>)}
                  </tr>
                ))}
                {hiddenRecords > 0 && (
                  <tr data-testid="record-overflow">
                    <td colSpan={binding.columns.length} className="px-5 py-2.5 text-figma-xs text-fw-bodyLight">
                      + {hiddenRecords.toLocaleString()} more — group or filter above to narrow them
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* briefing band — was a right rail; now reads as three columns
            under the data it narrates. */}
        <aside data-testid="briefing" className="rounded-2xl border border-fw-secondary bg-fw-wash p-4 space-y-3">
          <div className="text-figma-xs uppercase tracking-wide text-fw-bodyLight">{binding.layer === 'ai' ? 'Fabric briefing' : 'Network briefing'}</div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
            <div className="space-y-2 text-figma-sm text-fw-body lg:col-span-2">
              {brief.narrative.map((b, i) => (
                <p key={i} className={b.emphasis === 'risk' ? 'text-fw-bodyLight font-medium' : b.emphasis === 'strong' ? 'text-fw-heading font-medium' : ''}>{b.text}</p>
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {brief.actions.map(a => (
                  <button key={a.id} type="button" className="h-8 px-3 rounded-full border border-fw-secondary bg-fw-base text-figma-xs text-fw-body hover:bg-fw-wash">{a.label}</button>
                ))}
              </div>
              <div className="pt-2 border-t border-fw-secondary space-y-1">
                {brief.followups.map((q, i) => <div key={i} className="text-figma-xs text-fw-bodyLight">{q}</div>)}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
