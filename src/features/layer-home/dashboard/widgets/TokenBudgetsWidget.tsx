import { Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WidgetFrame } from '../WidgetFrame';
import type { LayerWidgetProps } from '../registry';
import { useCloudControlLive } from '../../../../engine/react/useCloudControl';
import { fmtTokens } from '../../../ai-fabric/aiSpend';

interface Policy { tag: string; budget: number; enforced: boolean }
interface Meter { tag: string; today: number; budget: number; pct: number }

/**
 * Per-identity token budgets, with what each has actually SPENT against them.
 *
 * This widget used to state a budget and nothing else — a ceiling with no
 * reading, which is not a budget, it is a number. The engine has carried the
 * consumption all along (`tokenMeterList`: today, budget, pct, the same
 * derivation the AI Fabric's own meter reads), so the widget now states both
 * and draws the fill.
 *
 * STATUS. It also used to render a bare "Enforced" the moment `enforced` was
 * true. That is the exact claim TokenPolicies' three-state pill exists to stop
 * making: an enforced policy with no enforce-mode cap intent covering its
 * identity denies NOTHING on budget — it is Armed, not Enforcing. Saying
 * "Enforced" here while the table one click away says "Armed" is the product
 * contradicting itself on the same fact, so this reads the same
 * `intentCapEnforced` the table and the gate read.
 */
export function TokenBudgetsWidget(_props: LayerWidgetProps) {
  const navigate = useNavigate();
  const rows = useCloudControlLive(c => {
    const meters = (c.tokenMeterList() as Meter[]);
    return (c.tokenPolicyList() as Policy[]).map(p => ({
      ...p,
      meter: meters.find(m => m.tag === p.tag) ?? null,
      capEnforced: c.intentCapEnforced(p.tag) as boolean,
    }));
  });

  return (
    <WidgetFrame title="Token budgets" icon={Coins}>
      <ul className="flex flex-col divide-y divide-fw-secondary">
        {rows.map(p => {
          const pct = p.meter ? p.meter.pct : 0;
          const status = !p.enforced ? 'Draft' : p.capEnforced ? 'Enforcing' : 'Armed';
          return (
            <li key={p.tag} data-testid="token-policy-row" className="py-2.5 first:pt-0 last:pb-0">
              <span className="flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="text-figma-sm font-medium text-fw-heading">{p.tag}</span>
                  <span className="block text-figma-xs text-fw-bodyLight tabular-nums">
                    {/* Row 11 of the phase-0 metric audit: "0 of 2.40B" led
                        with a raw token count, with the honest "0%" reading
                        trailing after a " · ". Reorder, not a new
                        derivation — the same meter pct and budget, pct
                        leading. */}
                    {/* Row 13: a budget with no meter used to render as a
                        bare ceiling, changing the row's shape mid-list and
                        reading as a different KIND of figure. It is absent
                        data, and now says so. */}
                    {p.meter
                      ? `${pct}% of a ${fmtTokens(p.budget)}/day budget`
                      : `no traffic metered yet · ${fmtTokens(p.budget)}/day budget`}
                  </span>
                </span>
                {p.enforced ? (
                  <span
                    data-testid="token-status"
                    title={
                      status === 'Armed'
                        ? 'Enforced, but no enforce-mode cap-token-spend intent covers this identity — the budget gate denies nothing until one is declared.'
                        : undefined
                    }
                    className={`text-figma-xs font-medium ${status === 'Enforcing' ? 'text-fw-success' : 'text-fw-warn'}`}
                  >
                    {status}
                  </span>
                ) : (
                  <button
                    data-testid="token-enforce"
                    // setTokenPolicy pushes no undo entry, so this stages the
                    // patch into the review tray (?draft=policy-<tag>, the same
                    // 'policy' StagedMove the engine's own repairs use) instead
                    // of mutating directly — the machine stages, never commits.
                    // (Contrast the proposal band, where the action DOES commit:
                    // enforceRule is undo-covered, so acting in place is safe.)
                    onClick={() => navigate(`/discover?draft=policy-${p.tag}`)}
                    className="rounded-full bg-fw-ctaPrimary px-3 py-1 text-figma-xs font-medium text-white hover:bg-fw-ctaPrimaryHover transition-colors"
                  >
                    Enforce
                  </button>
                )}
              </span>
              {/* The fill. aria-hidden because the figures above already say
                  it in words — a second announcement would be noise. */}
              <span className="mt-1.5 block h-1 rounded-full bg-fw-neutral overflow-hidden" aria-hidden="true">
                <span
                  className={`block h-full rounded-full ${pct >= 100 ? 'bg-fw-error' : pct >= 80 ? 'bg-fw-warn' : 'bg-fw-ctaPrimary'}`}
                  style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </WidgetFrame>
  );
}
