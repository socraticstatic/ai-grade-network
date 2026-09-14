import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { rankMoves } from './nextMove';

/**
 * The one recommended next step on Govern.
 *
 * PLACEMENT. This band sits INSIDE the rules card, between the card header
 * and the table head — not above the card as a panel of its own. Two reasons.
 * It is a statement about the table directly beneath it, and reading it as a
 * separate card would sever that. And the card header already carries the
 * screen's primary action ("New rule"); a second card would arrive with a
 * second header and a second primary, which is exactly the competing-blue
 * problem that was deliberately taken off this screen once already.
 *
 * WEIGHT. For the same reason the action here is a ghost-cobalt pill, not a
 * solid one. It is the more useful thing to press, but it must not out-shout
 * the header's create action, and two solid cobalt buttons a row apart read
 * as a toolbar rather than as a recommendation.
 *
 * Every figure is a live `CC` derivation taken through the SUBSCRIBING hook,
 * so enforcing anything — here, from a row menu, or from another surface —
 * re-ranks and re-renders. Nothing on this band is cached or hardcoded.
 */
interface NextMoveBandProps {
  /**
   * How this band enforces. RulesPanel passes the measured enforcer so the
   * band's action and the row menu's action produce the SAME consequence
   * panel — a viewer who presses the recommendation must not get a lesser
   * experience than one who opens the overflow menu.
   *
   * REQUIRED. This prop used to be optional with a bare `enforceAny`
   * fallback — an enforce that produced no consequence panel, a silent
   * third path nobody designed. The band recommends and routes; enforcing
   * is always the caller's measured act. Unit tests pass a stub.
   */
  onEnforce: (ruleId: string) => void;
}

export function NextMoveBand({ onEnforce }: NextMoveBandProps) {
  // One subscribing selector, so the recommendation and the figures it cites
  // are read at the same moment and move together. `rankMoves` walks the
  // whole estate (snapshot/restore per candidate rule via `previewFix`), so
  // it is called exactly once here and both `move` and `remaining` are
  // derived from that single result — calling it twice doubled every one of
  // those clone/restore cycles for no reason.
  const view = useCloudControl(cc => {
    const ranked = rankMoves(cc);
    return {
      move: ranked[0] ?? null,
      remaining: ranked.length,
      openViolations: cc.violations().length,
      posture: cc.posture(),
      totalRules: cc.ruleList().length,
    };
  });
  const { move, remaining, openViolations, posture, totalRules } = view;

  if (!move) {
    /* Everything enforced. A real state this demo reaches, so it is designed:
       it reports the finished position in the same currency the
       recommendation used, and says what would put a card back here. Green,
       because this is the good end — never red, which is reserved for true
       violations.

       `role="status" aria-live="polite"` on every branch below: the band
       replaces its content in place with no visible navigation, and a
       screen-reader user who presses "Enforce this rule" needs to hear that
       the recommendation re-pointed — that is the moment this component
       exists for. */
    return (
      <div
        data-testid="govern-next-move"
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 border-b border-l-2 border-b-fw-secondary border-l-fw-success bg-fw-successLight px-5 py-4"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-fw-success" aria-hidden="true" />
        <div>
          <div className="text-figma-sm font-medium text-fw-heading">
            Nothing left to enforce
          </div>
          <p className="mt-0.5 text-figma-sm text-fw-body">
            All {totalRules} rule{totalRules === 1 ? '' : 's'} are enforced and {openViolations} violation
            {openViolations === 1 ? ' is' : 's are'} open. Posture stands at {posture}. Author a new rule
            and the next recommended move appears here.
          </p>
        </div>
      </div>
    );
  }

  // A rule can genuinely clear ZERO open violations and still be the best
  // available move — that's not a bug, it's every remaining rule running
  // out of violations to clear at once. Telling a first-time viewer to
  // "START HERE" on an action the same sentence says clears nothing of
  // nothing is the defect this branch exists to avoid: this state gets its
  // own voice instead of squeezing "0 of 0" into the recommendation template.
  if (move.cleared === 0) {
    const lifts = typeof move.postureDelta === 'number' && move.postureDelta > 0;
    return (
      <div
        data-testid="govern-next-move"
        role="status"
        aria-live="polite"
        className="flex flex-col gap-3 border-b border-l-2 border-b-fw-secondary border-l-fw-secondary bg-fw-wash px-5 py-4 sm:flex-row sm:items-center"
      >
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-fw-bodyLight" aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <div className="text-figma-xs font-medium uppercase tracking-wide text-fw-bodyLight">
            Preventive
          </div>

          <p className="mt-1 text-figma-sm text-fw-body">
            No open violations left to clear. Enforcing{' '}
            <span className="font-medium text-fw-heading" data-testid="govern-next-move-rule">
              {move.ruleName}
            </span>{' '}
            guards against future drift
            {lifts ? (
              <>
                {' '}
                and still lifts posture {posture} → {posture + (move.postureDelta as number)}.
              </>
            ) : (
              <> — posture holds at {posture}.</>
            )}
          </p>

          <p className="mt-1 text-figma-xs text-fw-bodyLight">
            {remaining} rule{remaining === 1 ? '' : 's'} still unenforced, none tied to an open
            violation right now.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onEnforce(move.ruleId)}
          className="inline-flex h-8 shrink-0 items-center self-start rounded-full bg-fw-base px-3.5 text-figma-xs font-medium text-fw-body ring-1 ring-inset ring-fw-secondary transition-colors hover:bg-fw-neutral sm:self-auto"
        >
          Enforce this rule
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="govern-next-move"
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 border-b border-l-2 border-b-fw-secondary border-l-fw-active bg-fw-ctaGhost px-5 py-4 sm:flex-row sm:items-center"
    >
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-fw-link" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <div className="text-figma-xs font-medium uppercase tracking-wide text-fw-link">
          Start here
        </div>

        {/* The claim, in the currency of the list below it: violations. */}
        <p className="mt-1 text-figma-sm text-fw-body">
          Enforce{' '}
          <span className="font-medium text-fw-heading" data-testid="govern-next-move-rule">
            {move.ruleName}
          </span>{' '}
          — it clears{' '}
          <span className="font-medium text-fw-heading" data-testid="govern-next-move-cleared">
            {move.cleared}
          </span>{' '}
          of the {openViolations} open violation{openViolations === 1 ? '' : 's'}
          {/* Only claim movement when the engine actually projects a GAIN. A
              rule can clear a violation and still leave the rounded posture
              where it was, and "moves posture 60 → 60" reads as a broken
              number rather than as the true answer, which is "it doesn't".
              Guarding on `> 0` (not just truthy) also keeps a hypothetical
              negative delta from printing as a false lift — not reachable on
              the seeded estate today, but the check should say what it means. */}
          {typeof move.postureDelta === 'number' && move.postureDelta > 0 ? (
            <>
              {' '}
              and lifts posture {posture} → {posture + move.postureDelta}.
            </>
          ) : (
            '.'
          )}
        </p>

        {/* Why this one, said plainly — the ranking is not a black box, and a
            viewer who disagrees with the rule can see what to argue with. */}
        <p className="mt-1 text-figma-xs text-fw-bodyLight">
          Ranked by violations cleared, out of {remaining} unenforced rule
          {remaining === 1 ? '' : 's'}.
          {!move.projected
            ? " Posture effect can't be previewed for this rule."
            : move.postureDelta === 0 && ` Posture stays at ${posture}.`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onEnforce(move.ruleId)}
        className="inline-flex h-8 shrink-0 items-center self-start rounded-full bg-fw-base px-3.5 text-figma-xs font-medium text-fw-link ring-1 ring-inset ring-fw-active transition-colors hover:bg-fw-ctaGhost sm:self-auto"
      >
        Enforce this rule
      </button>
    </div>
  );
}
