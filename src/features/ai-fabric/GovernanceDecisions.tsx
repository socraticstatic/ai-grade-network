import { AttIcon } from '../../components/icons/AttIcon';
import { useCloudControlLive } from '../../engine/react/useCloudControl';
import { CategoryBars } from '../../components/viz/kit';

/**
 * The three decision outcomes, in project-palette colours.
 *
 * Literal hex rather than `fill-fw-*` because SVG/Recharts `fill` props do not
 * resolve Tailwind classes — but the values are the palette's, not a private
 * set: cobalt #0057b8, green #00a862, and red #dc2626 held back for a TRUE
 * policy violation, which is precisely what a denied request is.
 *
 * This used to be Okabe-Ito bluish green / orange / vermillion. The orange was
 * amber, which the palette does not carry, and the route split promoted this
 * panel from behind a "Trace" tab onto the permanent /ai/observe screen — so
 * the off-palette block went from occasional to always-on.
 *
 * Okabe-Ito was chosen for colourblind safety, so dropping it needed more than
 * "the amber is gone". Measured as CIE76 ΔE between every pair under normal
 * vision and all three dichromacies (src/test/cvd.ts), the closest pair in the
 * worst vision goes from ΔE 14.9 on the old set to ΔE 28.4 on this one — the
 * repaint reads BETTER, not merely differently. GovernanceDecisions.palette
 * .test.tsx asserts that against the old set rather than a pinned figure.
 *
 * Colour is redundant regardless: the legend below spells each outcome out,
 * and the chart's X axis carries the same three category names.
 */
export const DECISION_COLORS = {
  Allowed: '#00a862',   // Flywheel green
  Guardrail: '#0057b8', // Cobalt 600 — the control colour; guarded, not denied
  Denied: '#dc2626',    // Reserved red — a request the token policy refused
} as const;

interface Decision {
  ts: number;
  allowed: boolean;
  guarded: boolean;
}

/**
 * The decision log, subscribed LIVE.
 *
 * `agentTick` writes a decision every 7s and emits `hits`; `useCloudControl`
 * drops `hits`, so this panel froze at its mount instant while the REQUESTS
 * KPI 400px above it — which reads `decisionLog().length` through the same
 * engine — kept counting. On a cold `/ai/observe` that rendered `REQUESTS 1`
 * over "0 traced requests", and later `REQUESTS 10` over "9 traced requests".
 * One derivation, one screen, two numbers.
 */
export function GovernanceDecisions() {
  const log = useCloudControlLive(cc => cc.decisionLog()) as Decision[];

  const allowed = log.filter(d => d.allowed && !d.guarded).length;
  const guardrail = log.filter(d => d.allowed && d.guarded).length;
  const denied = log.filter(d => !d.allowed).length;

  const data = [
    { name: 'Allowed', count: allowed, color: DECISION_COLORS.Allowed },
    { name: 'Guardrail', count: guardrail, color: DECISION_COLORS.Guardrail },
    { name: 'Denied', count: denied, color: DECISION_COLORS.Denied },
  ];

  return (
    <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
        <AttIcon name="apps" className="h-5 w-5 text-fw-body" />
        <span className="font-medium text-fw-heading">Governance decisions</span>
        <span className="text-figma-xs text-fw-bodyLight">{log.length} traced requests</span>
      </div>

      {/* Explicit Flywheel legend — real DOM text a test can assert against,
          independent of whether Recharts renders series labels in jsdom. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-5 pt-3" aria-label="Decision outcomes">
        {data.map(d => (
          <li key={d.name} className="inline-flex items-center gap-1.5 text-figma-xs text-fw-body">
            <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            {d.name} · {d.count}
          </li>
        ))}
      </ul>

      {log.length === 0 ? (
        <p className="px-5 py-6 text-figma-sm text-fw-bodyLight">
          No requests traced yet — run a trace above to populate this view.
        </p>
      ) : (
        <div className="px-5 pb-4 pt-2">
          <CategoryBars ariaLabel="Decision counts" items={data.map(d => ({ label: d.name, value: d.count, color: d.color }))} />
        </div>
      )}
    </div>
  );
}
