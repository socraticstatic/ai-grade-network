import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { CostChip } from '../../components/viz/CostChip';

interface RoutePath {
  id: string;
  label: string;
  sub?: string;
  latencyMs: number;
  egressPerGb: number;
  attControlled: boolean;
  diversityGroup: string;
  available: boolean;
}

interface RouteRow {
  id: string;
  kind: 'app' | 'c2c';
  label: string;
  gbps: number;
  viaPublic: boolean;
  paths: RoutePath[];
  defaultPathId: string;
  current: RoutePath & { via?: string | null; mechanism?: string };
  diverse: boolean;
  steered: boolean;
}

interface RoutingKpis {
  pctUnderControl: number;
  pctDiverse: number;
  flowsSteered: number;
  controlledGbps: number;
  totalGbps: number;
  eastWestGbps: number;
  eastWestControlledPct: number;
  northSouthControlledPct: number;
}

/**
 * The AT&T-controlled path the engine designates for this row, if any.
 * Steering onto a path the engine marks `available: false` (e.g. the
 * on-ramp reaching this region isn't active) is a no-op — `currentPath()`
 * immediately reroutes back off it — so only an *available* AT&T path
 * counts as steerable here.
 */
function attControlledPathFor(row: RouteRow): RoutePath | undefined {
  return row.paths.find(p => p.attControlled && p.available);
}

export function PathTable() {
  const rows = useCloudControl(cc => cc.routeFlows()) as RouteRow[];
  const kpis = useCloudControl(cc => cc.routingKpis()) as RoutingKpis;
  const actions = useCloudControlActions();

  return (
    <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
        <span className="font-medium text-fw-heading">Flows &amp; paths</span>
        <span className="text-figma-xs text-fw-bodyLight">
          {kpis.pctUnderControl}% under AT&amp;T control
        </span>
        <span className="text-fw-bodyLight">·</span>
        <span className="text-figma-xs text-fw-bodyLight">
          North-south {kpis.northSouthControlledPct}% · East-west {kpis.eastWestControlledPct}%
        </span>
        <span className="text-fw-bodyLight">·</span>
        <span className="text-figma-xs text-fw-bodyLight">{kpis.flowsSteered} steered</span>
        <button
          type="button"
          onClick={() => actions.routingRestore()}
          className="ml-auto inline-flex items-center h-8 px-3 rounded-full text-figma-xs font-medium border border-fw-secondary text-fw-body hover:bg-fw-wash transition-colors"
        >
          Restore all
        </button>
      </div>

      <table className="w-full text-figma-sm">
        <thead>
          <tr className="text-left text-figma-xs uppercase tracking-wide text-fw-bodyLight bg-fw-wash/60">
            <th className="px-5 py-2 font-medium">Flow</th>
            <th className="px-5 py-2 font-medium">Kind</th>
            <th className="px-5 py-2 font-medium">Gbps</th>
            <th className="px-5 py-2 font-medium">Latency</th>
            <th className="px-5 py-2 font-medium text-center">Control</th>
            <th className="px-5 py-2 font-medium">Diverse</th>
            <th className="px-5 py-2 font-medium text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-fw-secondary">
          {rows.map(row => {
            const attPath = attControlledPathFor(row);
            const canSteer = !row.current.attControlled && !!attPath;
            return (
              <tr key={row.id} className="align-top">
                <td className="px-5 py-3">
                  <div className="font-medium text-fw-heading">{row.label}</div>
                  <div className="text-figma-xs text-fw-bodyLight">
                    {row.current.label}
                    {row.current.sub ? ` · ${row.current.sub}` : ''}
                  </div>
                </td>
                <td className="px-5 py-3 text-fw-body">
                  {row.kind === 'c2c' ? 'Cloud-to-cloud' : 'App'}
                </td>
                <td className="px-5 py-3 text-fw-body">{row.gbps}</td>
                <td className="px-5 py-3 text-fw-body">
                  <div className="flex items-center gap-2">
                    <span>{row.current.latencyMs}ms</span>
                    <CostChip
                      perGb={row.current.egressPerGb ?? 0.09}
                      tone={row.current.attControlled ? 'controlled' : 'public'}
                    />
                  </div>
                </td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={`inline-flex items-center h-6 px-2.5 rounded-full text-figma-xs font-medium whitespace-nowrap ${
                      row.current.attControlled
                        ? 'bg-fw-successLight text-fw-success'
                        : 'bg-fw-neutral text-fw-bodyLight'
                    }`}
                  >
                    {row.current.attControlled ? 'AT&T-controlled' : 'Public'}
                  </span>
                </td>
                <td className="px-5 py-3 text-fw-body">{row.diverse ? 'Yes' : 'No'}</td>
                <td className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {canSteer && (
                      <button
                        type="button"
                        onClick={() => actions.steerFlow(row.id, attPath!.id)}
                        className="inline-flex items-center h-8 px-3 rounded-full text-figma-xs font-medium bg-fw-active text-white hover:bg-fw-linkHover transition-colors"
                      >
                        Steer
                      </button>
                    )}
                    {row.steered && (
                      <button
                        type="button"
                        onClick={() => actions.clearSteer(row.id)}
                        className="inline-flex items-center h-8 px-3 rounded-full text-figma-xs font-medium border border-fw-secondary text-fw-body hover:bg-fw-wash transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    {row.current.attControlled && (
                      <button
                        type="button"
                        onClick={() => actions.routingFailover(row.id)}
                        className="inline-flex items-center h-8 px-3 rounded-full text-figma-xs font-medium border border-fw-secondary text-fw-body hover:bg-fw-wash transition-colors"
                      >
                        Failover
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
