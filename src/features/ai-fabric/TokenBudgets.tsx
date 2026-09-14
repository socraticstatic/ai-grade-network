import { Link } from 'react-router-dom';
import { AttIcon } from '../../components/icons/AttIcon';
import { StatTile } from '../../components/viz';
import { useCloudControlLive } from '../../engine/react/useCloudControl';
import { aiSpendTotals, fmtTokens, fmtUsd, routeLabel, statesRealMoney } from './aiSpend';

/**
 * Token budgets and spend — cost control at the token layer.
 *
 * Every figure here is an `aiSpendTotals(cc)` derivation, which is the same
 * module the AI Fabric Observe screen's Cost and Savings KPI tiles read. The
 * two screens therefore agree by construction rather than by coincidence —
 * and, via `useCloudControlLive`, at the same instant: the meters tick while
 * a viewer is on the page, so a screen that froze at mount would state a
 * figure the screen beside it had already moved past.
 *
 * ## One derivation per claim, and two tenses kept apart
 *
 * Four engine facts look alike and are not — see the header of `aiSpend.ts`.
 * Every count that says "how many identities are metering" reads
 * `meteringCount`; every sentence about where the NEXT request goes reads
 * `publicPathCount`, which is `modelRoutes().path`; every sentence about where
 * today's tokens WENT reads `ungovernedTokensToday`, which the engine books at
 * meter time. Nothing on this screen re-counts, and nothing derives one of
 * those from another.
 *
 * That last split is why this screen used to lie. The route sentence used to
 * carry a spend clause — "All 3 route to a model endpoint attached to the
 * fabric, so none of that spend leaves over the public internet" — inferring
 * the fate of tokens already metered from the route they would take now. After
 * the tour's Connect beat that clause was flatly false: every route was
 * governed and most of the day's tokens had already gone out over the
 * internet. The clause is gone; the measured bucket says it instead.
 *
 * The route sentence also deliberately does NOT read `endpointReadyCount`.
 * Readiness additionally requires a governance fix (`fixes.segmentHelion`), so
 * this screen once said "1 of 3 … leave over the public internet" while
 * `/ai/connect` — one click away, and the very screen this sentence links to —
 * read "3 / 3 governed & ready" with nothing left to attach.
 */
export function TokenBudgets() {
  const spend = useCloudControlLive(aiSpendTotals);

  const budgetPct =
    spend.budgetTokens > 0 ? Math.round((spend.tokensToday / spend.budgetTokens) * 100) : 0;

  const { meteringCount, publicPathCount, identityCount, ungovernedTokensToday } = spend;

  /* The summary has to be true in every state the engine can reach: nothing
     metered, metering over the public internet (the seeded resting state),
     and metering on the fabric. Each clause states one derived count. */
  const meteringSentence =
    meteringCount === 0
      ? `No identity has metered a token yet. The ${identityCount} ceilings below are the budgets the token policies on AI Fabric · Govern set, and spend appears here the moment an agent issues its first request.`
      : `${meteringCount} of ${identityCount} identit${meteringCount === 1 ? 'y is' : 'ies are'} metering against ${meteringCount === 1 ? 'its' : 'their'} budget today.`;

  /* What already happened — the measured bucket, never an inference from the
     route. Only stated once something has metered; with nothing metered there
     is no spend to characterise and the route sentence carries the screen. */
  const governedSentence =
    meteringCount === 0
      ? ''
      : ungovernedTokensToday > 0
        ? ` ${fmtTokens(ungovernedTokensToday)} of the ${fmtTokens(spend.tokensToday)} tokens metered today rode the public internet, before their endpoint was attached.`
        : ` Every one of the ${fmtTokens(spend.tokensToday)} tokens metered today rode an AT&T-controlled path.`;

  /* What happens next — the route, and only the route. No spend clause: the
     sentence above owns that, and owning it in both places is how they came
     to disagree. */
  const pathSentence =
    publicPathCount === 0
      ? ` All ${identityCount} route to a model endpoint attached to the fabric.`
      : ` ${publicPathCount} of ${identityCount} route to a model endpoint that is not attached yet, so those requests leave over the public internet.`;

  /* Guarded on the FORMATTED saving, not the raw float: at $0.0015 a
     `savings > 0` test passes and the sentence prints "holds $0.00 back". */
  const savingsSentence =
    meteringCount > 0 && statesRealMoney(spend.savings)
      ? ` Keeping them off the external model instead of routing everything to it holds ${fmtUsd(spend.savings)} of that spend back.`
      : '';

  const summary = meteringSentence + governedSentence + pathSentence + savingsSentence;

  /* Govern lists every token policy; only the metered app tags appear here.
     Say so, in the reader's terms and with the count derived — otherwise this
     screen totals three budgets while Govern shows four, and the discrepancy
     is left for the audience to find. */
  const unmetered = spend.unmeteredPolicyTags;
  const unmeteredNote =
    unmetered.length === 0
      ? null
      : `${unmetered.length} further token polic${unmetered.length === 1 ? 'y' : 'ies'} on AI Fabric · Govern (${unmetered.join(', ')}) scope${unmetered.length === 1 ? 's' : ''} a group rather than a metered identity, so ${unmetered.length === 1 ? 'it carries' : 'they carry'} a ceiling but no meter here.`;

  return (
    <div className="space-y-4">
      <div data-testid="ai-cost-totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Tokens today" value={fmtTokens(spend.tokensToday)} />
        <StatTile label="Spend today" value={fmtUsd(spend.spendToday)} />
        <StatTile
          label="Budget used"
          value={`${budgetPct}%`}
          meter={{
            pct: budgetPct,
            label: `${fmtTokens(spend.tokensToday)} of ${fmtTokens(spend.budgetTokens)} tokens across ${identityCount} identities`,
          }}
        />
      </div>

      <div className="space-y-1">
        <p className="text-figma-sm text-fw-bodyLight">
          {summary}
          {publicPathCount > 0 && (
            <>
              {' '}
              <Link to="/ai/connect" className="font-medium text-fw-link hover:underline">
                Attach them in AI Fabric · Connect
              </Link>
              .
            </>
          )}
        </p>
        {unmeteredNote && <p className="text-figma-sm text-fw-bodyLight">{unmeteredNote}</p>}
      </div>

      <div className="rounded-xl border border-fw-secondary bg-fw-base overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
          <AttIcon name="bill" className="h-5 w-5 text-fw-body" />
          <span className="font-medium text-fw-heading">Token budgets</span>
          <span className="text-figma-xs text-fw-bodyLight">
            {meteringCount} / {identityCount} metering
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-figma-sm">
            <thead>
              <tr className="text-left text-figma-xs uppercase tracking-wide text-fw-bodyLight bg-fw-wash/60">
                <th className="px-5 py-2 font-medium">Identity</th>
                <th className="px-5 py-2 font-medium">Model</th>
                <th className="px-5 py-2 font-medium">Tokens today</th>
                <th className="px-5 py-2 font-medium">Budget</th>
                <th className="px-5 py-2 font-medium">Spend today</th>
                <th className="px-5 py-2 font-medium text-center">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fw-secondary">
              {spend.rows.map(r => (
                <tr key={r.tag} className="align-top">
                  <td className="px-5 py-3">
                    <div className="font-mono text-figma-xs text-fw-heading">{r.tag}</div>
                  </td>
                  <td className="px-5 py-3 text-fw-body">
                    {r.modelName}
                    <div className="mt-0.5 text-figma-xs text-fw-bodyLight tabular-nums">
                      ${r.price.toFixed(2)}/1M
                    </div>
                  </td>
                  <td className="px-5 py-3 text-fw-body tabular-nums">
                    {r.tokensToday.toLocaleString()}
                    <div className="mt-0.5 text-figma-xs text-fw-bodyLight tabular-nums">
                      {r.pct}% of budget
                    </div>
                  </td>
                  <td className="px-5 py-3 text-fw-body tabular-nums">
                    {r.budgetTokens.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-fw-body tabular-nums">{fmtUsd(r.spendToday)}</td>
                  {/* Three facts, three lines, each in its own tense. The pill
                      answers "is it spending?"; the line under it answers
                      "over what path, next?"; the last answers "how much of
                      today's spend already went out ungoverned?". Collapsing
                      any two is how this table came to read "Endpoint not
                      attached" beside a non-zero token count, and later
                      "AT&T private fabric" beside tokens that had crossed the
                      internet an hour earlier.

                      The path line is `routeLabel(routePath)` — the same
                      function, over the same engine value, that /ai/observe's
                      Route column renders, so the two tables cannot describe
                      one identity's path in two different words. */}
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`inline-flex items-center h-6 px-2.5 rounded-full text-figma-xs font-medium whitespace-nowrap ${
                        r.metering && !r.onPublicPath
                          ? 'bg-fw-successLight text-fw-success'
                          : 'bg-fw-neutral text-fw-bodyLight'
                      }`}
                    >
                      {r.metering ? 'Metering' : 'No spend yet'}
                    </span>
                    <div className="mt-1 text-figma-xs text-fw-bodyLight">
                      {routeLabel(r.routePath)}
                    </div>
                    {r.ungovernedToday > 0 && (
                      <div className="mt-0.5 text-figma-xs text-fw-bodyLight tabular-nums">
                        {fmtTokens(r.ungovernedToday)} ungoverned today
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
