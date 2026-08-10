import type { InsightKpi } from './insightsFigures';

/**
 * The four-card gateway KPI strip (Figma 1:5088, minus the Requests card the
 * phase-0 metric audit cut at row 80). Value 36px bold with the unit beside
 * it at 20px; the savings subtext is the one green sentence on the strip.
 * Alert red is deliberately absent here - the source comp keeps even the
 * Blocked value in heading ink, and so do we.
 */
export function KpiStrip({ kpis, emphasize }: { kpis: InsightKpi[]; emphasize?: InsightKpi['key'] }) {
  return (
    <div className="grid grid-cols-2 min-[1200px]:grid-cols-4 gap-4">
      {kpis.map(k => (
        <div
          key={k.key}
          data-testid={`kpi-${k.key}`}
          data-emphasized={emphasize === k.key ? 'true' : undefined}
          className={`rounded-2xl border bg-fw-base p-4 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] flex flex-col justify-center gap-2 min-h-[121px] ${
            emphasize === k.key ? 'border-fw-cobalt-600 ring-1 ring-fw-cobalt-600' : 'border-fw-secondary'
          }`}
        >
          <p className="text-figma-sm font-medium text-fw-heading px-0.5">{k.title}</p>
          <p className="text-fw-heading leading-10">
            <span className="text-4xl font-bold tracking-[-0.03em]">{k.value}</span>
            {k.unit && <span className="text-xl font-bold ml-0.5">{k.unit}</span>}
          </p>
          <p
            className={
              k.subTone === 'savings'
                ? 'text-xs font-medium text-fw-success'
                : 'text-xs text-fw-bodyLight'
            }
          >
            {k.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
