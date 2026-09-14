import { Link } from 'react-router-dom';
import { useCloudControlLive, useCloudControlActions } from '../../../engine/react/useCloudControl';
import { fmtUsd, statesRealMoney } from '../aiSpend';
import { toggleAndi } from '../../andi/AndiPanel';
import {
  CACHE_HIT_RATE,
  routingCard,
  cachingCard,
  budgetTrack,
  teamCards,
  providerShare,
  type ProviderShare,
} from './costFigures';

/**
 * The Savings tab (the Figma's Cost tab, renamed: this screen's job is what
 * routing and caching SAVE, and the copy leads with that). Two states per
 * card, decided by the engine's gateway flags: a warning footer with the
 * lever, or the achieved footer stating what the lever now holds back.
 * Monthly figures are the engine's day figures times 30, and every card
 * says so.
 */
export function SavingsTab() {
  const actions = useCloudControlActions();
  const view = useCloudControlLive(cc => ({
    routing: routingCard(cc),
    caching: cachingCard(cc),
    budget: budgetTrack(cc),
    teams: teamCards(cc),
    share: providerShare(cc),
  }));

  return (
    <div className="space-y-4" data-testid="savings-tab">
      <div className="grid gap-4 min-[1024px]:grid-cols-2">
        {/* Routing */}
        <section data-testid="cost-routing" className="rounded-2xl border border-fw-secondary bg-fw-base p-5 flex flex-col">
          <h3 className="text-figma-base font-bold text-fw-body tracking-[-0.03em]">
            Monthly savings with routing
          </h3>
          <p className="mt-1 text-xs text-fw-bodyLight">
            Today's engine figures, projected across 30 days. Current is every request
            priced at the external model; routed is what identities actually pay.
          </p>
          <div className="mt-4 space-y-3">
            <MoneyBar label="Current (all external)" value={view.routing.currentMonthly} max={view.routing.currentMonthly} muted />
            <MoneyBar label="With routing" value={view.routing.routedMonthly} max={view.routing.currentMonthly} />
          </div>
          {/* A money claim only when the figure survives formatting - a
              sub-cent saving stated as "$0.00/mo stays in budget" is the
              exact contradiction statesRealMoney exists to prevent. */}
          {statesRealMoney(view.routing.savingMonthly) ? (
            <p className="mt-3 text-figma-sm font-medium text-fw-success">
              {fmtUsd(view.routing.savingMonthly)}/mo stays in budget
            </p>
          ) : (
            <p className="mt-3 text-figma-sm text-fw-bodyLight">
              The saving grows as spend accrues; today's volume is still under a cent.
            </p>
          )}
          <CardFooter
            achieved={view.routing.achieved}
            flagKey="routing"
            warnText="Routing policy not configured"
            warnCta="Set policy"
            doneText={
              statesRealMoney(view.routing.savingMonthly)
                ? `Cost-aware routing is on. ${fmtUsd(view.routing.savingMonthly)}/mo of external spend is being held back.`
                : 'Cost-aware routing is on. Every new request is priced against the routed path.'
            }
            onEnable={() => actions.setGatewayFlag('routing', true)}
          />
        </section>

        {/* Caching */}
        <section data-testid="cost-caching" className="rounded-2xl border border-fw-secondary bg-fw-base p-5 flex flex-col">
          <h3 className="text-figma-base font-bold text-fw-body tracking-[-0.03em]">
            Monthly savings with caching ({Math.round(CACHE_HIT_RATE * 100)}% hit rate)
          </h3>
          <p className="mt-1 text-xs text-fw-bodyLight">
            Per model: this month's projected spend beside the same month with repeat
            completions served from cache.
          </p>
          <div className="mt-4 space-y-3">
            {view.caching.perModel.map(m => (
              <div key={m.model}>
                <div className="flex items-center justify-between text-xs text-fw-bodyLight">
                  <span>{m.model}</span>
                  <span className="font-medium text-fw-heading">
                    {fmtUsd(m.monthly)} <span className="text-fw-success">→ {fmtUsd(m.cachedMonthly)}</span>
                  </span>
                </div>
                <div className="mt-1 h-3 rounded bg-fw-gray-200">
                  <div className="h-3 rounded bg-fw-blue" style={{ width: `${m.monthly > 0 ? Math.max(6, Math.round((m.cachedMonthly / m.monthly) * 100)) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          {statesRealMoney(view.caching.savingMonthly) ? (
            <p className="mt-3 text-figma-sm font-medium text-fw-success">
              {fmtUsd(view.caching.savingMonthly)}/mo saved at the stated hit rate
            </p>
          ) : (
            <p className="mt-3 text-figma-sm text-fw-bodyLight">
              The saving grows as spend accrues; today's volume is still under a cent.
            </p>
          )}
          <CardFooter
            achieved={view.caching.achieved}
            flagKey="caching"
            warnText="Caching disabled"
            warnCta="Enable caching"
            doneText={
              statesRealMoney(view.caching.savingMonthly)
                ? `Response caching is on. Repeat completions stop leaving at ${fmtUsd(view.caching.savingMonthly)}/mo.`
                : 'Response caching is on. Repeat completions are served from cache instead of leaving.'
            }
            onEnable={() => actions.setGatewayFlag('caching', true)}
          />
        </section>
      </div>

      {/* Budget tracking */}
      <section data-testid="cost-budget" className="rounded-2xl border border-fw-secondary bg-fw-base p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-figma-base font-bold text-fw-body tracking-[-0.03em]">
            Budget tracking
          </h3>
          {view.budget.overBudget && (
            <Link
              to="/ai/govern"
              className="h-8 inline-flex items-center rounded-lg bg-fw-cobalt-600 px-3 text-figma-sm font-medium text-white hover:bg-fw-cobalt-700"
            >
              Add policy
            </Link>
          )}
        </div>
        <p className="mt-1 text-xs text-fw-bodyLight">
          Cumulative spend across the window against the monthly ceiling the token
          budgets imply ({fmtUsd(view.budget.budgetMonthly)}).
        </p>
        <BudgetLine series={view.budget.spentSeries} />
        {statesRealMoney(view.budget.predictedMonthly) ? (
          <p className={`mt-2 text-figma-sm font-medium ${view.budget.overBudget ? 'text-fw-red-600' : 'text-fw-success'}`}>
            {view.budget.overBudget
              ? `Predicted ${fmtUsd(view.budget.predictedMonthly)}/mo runs over the ${fmtUsd(view.budget.budgetMonthly)} ceiling`
              : `Predicted ${fmtUsd(view.budget.predictedMonthly)}/mo holds under the ${fmtUsd(view.budget.budgetMonthly)} ceiling`}
          </p>
        ) : (
          <p className="mt-2 text-figma-sm text-fw-bodyLight">
            The window has metered less than a cent so far; the prediction firms up as
            spend accrues.
          </p>
        )}
      </section>

      {/* Teams */}
      <div className="grid gap-4 min-[1024px]:grid-cols-3">
        {view.teams.map(t => (
          <section key={t.tag} data-testid={`cost-team-${t.tag}`} className="rounded-2xl border border-fw-secondary bg-fw-base p-5">
            <h4 className="text-figma-sm font-bold text-fw-heading">{t.tag}</h4>
            <p className="mt-2 text-2xl font-bold text-fw-heading tracking-[-0.03em]">{fmtUsd(t.spendToday)}</p>
            <p className="text-xs text-fw-bodyLight">
              today · {t.vsAvgPct === 0 ? 'at the identity average' : t.vsAvgPct > 0 ? `${t.vsAvgPct}% above the identity average` : `${Math.abs(t.vsAvgPct)}% below the identity average`}
            </p>
            <p className="mt-2 text-xs text-fw-bodyLight">
              Driver: <span className="font-medium text-fw-body">{t.driver}</span> · {t.budgetPct}% of budget
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                to="/ai/teams"
                className="h-8 inline-flex items-center rounded-lg border border-fw-secondary px-3 text-figma-sm font-medium text-fw-body hover:bg-fw-wash"
              >
                Update limits
              </Link>
              <button
                type="button"
                onClick={toggleAndi}
                className="h-8 rounded-lg px-3 text-figma-sm font-medium text-fw-cobalt-700 hover:bg-fw-wash"
              >
                Ask Andi
              </button>
            </div>
          </section>
        ))}
      </div>

      <ProviderShareCard share={view.share} />
    </div>
  );
}

function CardFooter({
  achieved,
  flagKey,
  warnText,
  warnCta,
  doneText,
  onEnable,
}: {
  achieved: boolean;
  flagKey: 'routing' | 'caching';
  warnText: string;
  warnCta: string;
  doneText: string;
  onEnable: () => void;
}) {
  return achieved ? (
    <p
      data-testid={`cost-footer-${flagKey}`}
      className="mt-4 rounded-lg bg-fw-successLight px-3 py-2 text-figma-sm font-medium text-fw-success"
    >
      {doneText}
    </p>
  ) : (
    <div
      data-testid={`cost-footer-${flagKey}`}
      className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-fw-secondary bg-fw-wash px-3 py-2"
    >
      <span className="text-figma-sm font-medium text-fw-heading">{warnText}</span>
      <button
        type="button"
        data-testid={`cost-flag-${flagKey}`}
        onClick={onEnable}
        className="h-8 rounded-lg bg-fw-cobalt-600 px-3 text-figma-sm font-medium text-white hover:bg-fw-cobalt-700"
      >
        {warnCta}
      </button>
    </div>
  );
}

function MoneyBar({ label, value, max, muted }: { label: string; value: number; max: number; muted?: boolean }) {
  const pct = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-fw-bodyLight">
        <span>{label}</span>
        <span className="font-medium text-fw-heading">{fmtUsd(value)}</span>
      </div>
      <div className="mt-1 h-3 rounded bg-fw-gray-200">
        <div className={`h-3 rounded ${muted ? 'bg-fw-gray-400' : 'bg-fw-blue'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BudgetLine({ series }: { series: number[] }) {
  const max = Math.max(...series, 0.0001);
  const points = series
    .map((v, i) => `${(i / (series.length - 1)) * 100},${40 - (v / max) * 36}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 42" className="mt-3 h-24 w-full" preserveAspectRatio="none" role="img" aria-label="Cumulative spend across the window">
      <polyline points={points} fill="none" stroke="#0057b8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function ProviderShareCard({ share }: { share: { shares: ProviderShare[]; basis: 'spend' | 'budget' } }) {
  return (
    <section data-testid="provider-share" className="rounded-2xl border border-fw-secondary bg-fw-base p-5">
      <h3 className="text-figma-base font-bold text-fw-body tracking-[-0.03em]">
        Share by provider
      </h3>
      <p className="mt-1 text-xs text-fw-bodyLight">
        {share.basis === 'spend'
          ? "Share of today's metered spend."
          : 'Nothing has metered yet; shares are of the budget ceilings.'}
      </p>
      <div className="mt-4 flex h-4 w-full overflow-hidden rounded" aria-hidden="true">
        {share.shares.map(s => (
          <div key={s.provider} style={{ width: `${Math.max(2, s.pct)}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-4">
        {share.shares.map(s => (
          <li key={s.provider} className="flex items-center gap-1.5 text-figma-sm text-fw-body">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {s.provider} · {s.pct}%
          </li>
        ))}
      </ul>
    </section>
  );
}
