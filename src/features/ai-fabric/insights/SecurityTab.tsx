import { useCloudControlLive } from '../../../engine/react/useCloudControl';
import { fmtTokens } from '../aiSpend';
import { aiSpendTotals } from '../aiSpend';
import { PromptTrace } from '../PromptTrace';
import { GovernanceDecisions } from '../GovernanceDecisions';
import { requestRows } from './insightsFigures';

/**
 * Security: what the gateway stopped and what left unguarded. The summary
 * strip derives from the same request rows the Requests table renders, so
 * the two can never disagree about a denial.
 *
 * Order below matters and is not cosmetic: GovernanceDecisions' empty state
 * reads "run a trace above to populate this view", so PromptTrace has to
 * render above it or that sentence stops being true.
 */
export function SecurityTab() {
  const view = useCloudControlLive(cc => {
    const rows = requestRows(cc);
    const denied = rows.filter(r => !r.ok);
    const totals = aiSpendTotals(cc);
    return {
      denied: denied.length,
      deniedIdentities: Array.from(new Set(denied.map(r => r.identity))),
      reasons: Array.from(new Set(denied.map(r => r.reason).filter(Boolean))) as string[],
      ungovernedTokens: totals.ungovernedTokensToday,
      ungovernedCount: totals.ungovernedCount,
      /* Watch-mode intents count what enforce would have done - stated
         here beside the denials that DID happen, same request log. */
      watchNotes: (cc.intentList?.() ?? [])
        .filter(i => i.reading.watch && i.reading.watch.events > 0)
        .map(i => ({ id: i.id, scope: i.scope.label, note: i.reading.watch!.note })),
    };
  });

  return (
    <div className="space-y-4" data-testid="security-tab">
      <div className="grid gap-4 min-[1024px]:grid-cols-2">
        <section className="rounded-2xl border border-fw-secondary bg-fw-base p-5">
          <h3 className="text-figma-base font-bold text-fw-body tracking-[-0.03em]">Blocked at the gate</h3>
          {view.denied > 0 ? (
            <>
              <p className="mt-2 text-2xl font-bold text-fw-heading tracking-[-0.03em]">{view.denied}</p>
              <p className="text-xs text-fw-bodyLight">
                requests denied by token policy · {view.deniedIdentities.join(', ')}
              </p>
              <ul className="mt-2 space-y-1">
                {view.reasons.map(r => (
                  <li key={r} className="text-figma-sm text-fw-body">{r}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-figma-sm text-fw-bodyLight">
              No denials recorded in this window.
            </p>
          )}
          {view.watchNotes.map(w => (
            <p key={w.id} data-testid={`watch-note-${w.id}`} className="mt-2 text-figma-sm text-fw-body">
              Watching {w.scope}: {w.note}
            </p>
          ))}
        </section>
        <section className="rounded-2xl border border-fw-secondary bg-fw-base p-5">
          <h3 className="text-figma-base font-bold text-fw-body tracking-[-0.03em]">Left unguarded</h3>
          {view.ungovernedTokens > 0 ? (
            <>
              <p className="mt-2 text-2xl font-bold text-fw-heading tracking-[-0.03em]">{fmtTokens(view.ungovernedTokens)}</p>
              <p className="text-xs text-fw-bodyLight">
                tokens metered over the public internet today, across {view.ungovernedCount}{' '}
                {view.ungovernedCount === 1 ? 'identity' : 'identities'}
              </p>
            </>
          ) : (
            <p className="mt-2 text-figma-sm text-fw-bodyLight">
              Every token metered today rode a private or governed path.
            </p>
          )}
        </section>
      </div>
      <PromptTrace />
      <GovernanceDecisions />
    </div>
  );
}
