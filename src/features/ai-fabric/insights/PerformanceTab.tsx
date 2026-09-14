import { useCloudControlLive, useCloudControlActions } from '../../../engine/react/useCloudControl';
import type { CloudControl } from '../../../engine/types';
import { aiSpendRows, fmtUsd, routeLabel, EXTERNAL_MODEL_ID, type ModelRoutePath } from '../aiSpend';
import { toggleAndi } from '../../andi/AndiPanel';
import { providerShare } from './costFigures';
import { ProviderShareCard } from './SavingsTab';

const SERIES_POINTS = 24;

interface CatalogEntry {
  id: string;
  name: string;
  p50: number;
  cloud: string | null;
}
interface Route {
  tag: string;
  path: ModelRoutePath;
}

interface Incident {
  modelId: string;
  model: string;
  peakMs: number;
  p50: number;
  route: string;
}

/* A latency incident is a fact of the engine's own deterministic series:
   a model whose window peak stands at least 1.5x above its window median
   had a spike a viewer can also see in the TTFT chart. No threshold, no
   event feed - the series IS the record. */
function deriveIncidents(cc: CloudControl): Incident[] {
  const catalog = cc.modelCatalog() as CatalogEntry[];
  return catalog
    .map(m => {
      const series = cc.modelLatencySeries(m.id, SERIES_POINTS) as number[];
      const sorted = series.slice().sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      const peak = Math.max(...series, 0);
      return { m, median, peak };
    })
    .filter(({ median, peak }) => median > 0 && peak >= median * 1.5)
    .map(({ m, peak }) => ({
      modelId: m.id,
      model: m.name,
      peakMs: Math.round(peak),
      p50: m.p50,
      route: routeLabel(pathOfModel(cc, m.id)),
    }));
}

/** The path of the identity that invokes this model - modelRoutes is
 *  tag-keyed, agents' invoke scopes pair tag to model (aiSpend law). */
function pathOfModel(cc: CloudControl, modelId: string): ModelRoutePath {
  const agents = (cc.agentList?.() ?? []) as { app: string; scopes: string[] }[];
  const owner = agents.find(a => a.scopes.some(s => s === `invoke:${modelId}`));
  const routes = cc.modelRoutes() as Route[];
  return routes.find(r => r.tag === owner?.app)?.path ?? 'public';
}

export function PerformanceTab() {
  const actions = useCloudControlActions();
  const view = useCloudControlLive(cc => {
    const rows = aiSpendRows(cc);
    const catalog = cc.modelCatalog() as CatalogEntry[];
    const external = catalog.find(m => m.id === EXTERNAL_MODEL_ID);
    const spendTotal = rows.reduce((s, r) => s + r.spendToday, 0);
    /* Routed latency is spend-weighted: the p50 a dollar actually saw. Falls
       back to budget weighting before anything meters, same basis rule as
       the provider share card. */
    const weightOf = (r: { spendToday: number; budgetTokens: number; price: number }) =>
      spendTotal > 0 ? r.spendToday : (r.budgetTokens / 1_000_000) * r.price;
    const weightTotal = rows.reduce((s, r) => s + weightOf(r), 0);
    const routedP50 = weightTotal
      ? rows.reduce((s, r) => {
          const m = catalog.find(x => x.id === r.modelId);
          return s + (m?.p50 ?? 0) * weightOf(r);
        }, 0) / weightTotal
      : 0;
    return {
      incidents: deriveIncidents(cc),
      directP50: external?.p50 ?? 0,
      routedP50,
      undoLabel: cc.canUndo(),
      share: providerShare(cc),
    };
  });

  const gain =
    view.directP50 > 0
      ? Math.round(((view.directP50 - view.routedP50) / view.directP50) * 100)
      : 0;

  return (
    <div className="space-y-4" data-testid="performance-tab">
      {view.incidents.length > 0 ? (
        <div className="space-y-2" data-testid="incident-strip">
          {view.incidents.map(inc => (
            <div
              key={inc.modelId}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-fw-secondary bg-fw-base p-4"
            >
              <span className="h-2 w-2 rounded-full bg-fw-red-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-figma-sm font-medium text-fw-heading">
                  Latency spike on {inc.model}: {inc.peakMs}ms peak against a {inc.p50}ms P50
                </p>
                <p className="text-xs text-fw-bodyLight">
                  Requests ride {inc.route}. The window's TTFT series carries the same spike.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAndi}
                className="h-8 rounded-lg border border-fw-secondary bg-fw-base px-3 text-figma-sm font-medium text-fw-body hover:bg-fw-wash"
              >
                Ask Andi
              </button>
              {view.undoLabel && (
                <button
                  type="button"
                  data-testid="incident-rollback"
                  title={`Undo · ${view.undoLabel}`}
                  onClick={() => actions.undo()}
                  className="h-8 rounded-lg bg-fw-cobalt-600 px-3 text-figma-sm font-medium text-white hover:bg-fw-cobalt-700"
                >
                  Rollback
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-fw-secondary bg-fw-base p-4 text-figma-sm text-fw-bodyLight">
          No latency incidents in this window.
        </p>
      )}

      <div className="grid gap-4 min-[1024px]:grid-cols-2">
        <section className="rounded-2xl border border-fw-secondary bg-fw-base p-5">
          <h3 className="text-figma-base font-bold text-fw-body tracking-[-0.03em]">
            Latency with routing
          </h3>
          <p className="mt-1 text-xs text-fw-bodyLight">
            Direct is the external model's P50; with routing is the spend-weighted P50
            across the models identities actually call.
          </p>
          <div className="mt-4 space-y-3" data-testid="latency-savings">
            <LatencyBar label="Direct (external)" ms={view.directP50} max={Math.max(view.directP50, view.routedP50)} muted />
            <LatencyBar label="With routing" ms={Math.round(view.routedP50)} max={Math.max(view.directP50, view.routedP50)} />
          </div>
          {gain > 0 && (
            <p className="mt-3 text-figma-sm font-medium text-fw-success">
              {gain}% faster to first token on the routed path
            </p>
          )}
        </section>
        <ProviderShareCard share={view.share} />
      </div>
    </div>
  );
}

function LatencyBar({ label, ms, max, muted }: { label: string; ms: number; max: number; muted?: boolean }) {
  const pct = max > 0 ? Math.max(6, Math.round((ms / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-fw-bodyLight">
        <span>{label}</span>
        <span className="font-medium text-fw-heading">{ms}ms</span>
      </div>
      <div className="mt-1 h-3 rounded bg-fw-gray-200">
        <div
          className={`h-3 rounded ${muted ? 'bg-fw-gray-400' : 'bg-fw-blue'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
