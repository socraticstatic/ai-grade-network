import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { ruleProposals } from './ruleProposals';

/**
 * What Andi spotted, above the rules it concerns. Every row restates the
 * engine's own finding sentence and the dryRun figures for the rule that
 * answers it. A row disappears on its own once its rule is enforced, because
 * the finding's active predicate is recomputed from the estate.
 *
 * "Enforce it" ENFORCES. It used to navigate to /discover and stage a draft,
 * which meant pressing it left this row exactly where it was — the advice
 * survived being acted on, and only cleared after a separate Commit on
 * another page. The row already prints the price ("enforcing X would match N
 * flows carrying Y Gbps"), so the detour bought a step and no information,
 * and enforceRule pushes an undo entry, so it is reversible.
 *
 * "Tighten it" remains the review-first path: it opens the builder pre-filled
 * so the rule can be narrowed before anything is enforced.
 */
export function ProposalBand() {
  const cc = useCloudControl(c => c);
  const proposals = ruleProposals(cc);

  if (!proposals.length) {
    return (
      <p data-testid="proposal-band-empty" className="text-figma-sm text-fw-bodyLight mb-3">
        Nothing on the estate currently needs a new rule.
      </p>
    );
  }

  return (
    <section
      data-testid="proposal-band"
      className="mb-4 rounded-2xl border border-fw-secondary bg-fw-wash p-4"
    >
      <h3 className="flex items-center gap-2 text-figma-sm font-semibold text-fw-heading tracking-[-0.03em] mb-3">
        <ShieldAlert className="h-4 w-4 text-fw-warn" aria-hidden="true" />
        Andi spotted {proposals.length} thing{proposals.length === 1 ? '' : 's'} worth a rule
      </h3>
      <ul className="flex flex-col divide-y divide-fw-secondary">
        {proposals.map(p => (
          <li key={p.id} data-testid="proposal-row" className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className={`text-figma-xs font-semibold uppercase tracking-[0.08em] ${p.severity === 'crit' ? 'text-fw-warn' : 'text-fw-bodyLight'}`}>
                  {p.severity}
                </span>
                <span className="text-figma-sm font-medium text-fw-heading">{p.title}</span>
              </span>
              <span className="block text-figma-sm text-fw-body mt-0.5">{p.detail}</span>
              <span className="block text-figma-xs text-fw-bodyLight mt-1 tabular-nums">
                {p.source} · enforcing {p.ruleName} would match {p.impact.matched} flow
                {p.impact.matched === 1 ? '' : 's'} carrying {p.impact.gbps} Gbps
              </span>
            </span>
            <span className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                data-testid="proposal-enforce"
                onClick={() => cc.enforceAny(p.ruleId)}
                aria-label={`Enforce it: ${p.title}`}
                className="rounded-full bg-fw-ctaPrimary px-3 py-1.5 text-figma-xs font-medium text-white hover:bg-fw-ctaPrimaryHover transition-colors"
              >
                Enforce it
              </button>
              <Link
                data-testid="proposal-tighten"
                to={`/naas/govern?rule=${p.ruleId}`}
                aria-label={`Tighten it: ${p.title}`}
                className="rounded-full border border-fw-secondary bg-fw-base px-3 py-1.5 text-figma-xs font-medium text-fw-link hover:border-fw-active transition-colors"
              >
                Tighten it
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
