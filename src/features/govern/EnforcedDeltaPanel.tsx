import { CheckCircle2, Minus } from 'lucide-react';
import { splitDelta, heldSentence, type EnforcementDelta } from './enforcementDelta';

/**
 * What just happened, stated where it happened.
 *
 * IDIOM. This is the second half of RuleBuilder's dry run and it is built to
 * be read as such: the same `rounded-xl border border-fw-secondary` result
 * surface, the same small-caps header line, the same "one claim in the header,
 * the evidence itemised beneath". The dry run says "Dry run · nothing has
 * changed yet". This says "Enforced · this is what changed". A toast would
 * have said neither — it would have said "Rule enforced" and vanished.
 *
 * PLACEMENT. Directly above NextMoveBand, inside the rules card: consequence
 * first, then the re-pointed recommendation. That is the order the two things
 * happen in, and it puts the answer immediately under the header whose
 * "N / M enforced" counter just moved. It does not duplicate the violation
 * list below the table — that list enumerates what is still open; this states
 * what changed.
 *
 * MOTION. A single 300ms fade-and-rise on the shared `cc-reveal` keyframe
 * (index.css), applied through the `motion-safe:` variant — i.e. inside
 * `@media (prefers-reduced-motion: no-preference)`, so under `reduce` the
 * animation is never applied at all.
 *
 * It has to be `motion-safe:`, not a bare utility leaning on the global
 * `prefers-reduced-motion: reduce` block in index.css. That block zeroes
 * `animation-duration` on the universal selector, but this project sets
 * `important: true` in tailwind.config.js, so a bare `[animation:...]`
 * utility emits `!important` on the animation SHORTHAND from a class
 * selector — which outranks an `!important` longhand on `*` and would have
 * silently kept animating for exactly the users who asked it not to.
 *
 * Either way the panel is fully rendered and fully readable; motion only
 * affects its arrival.
 *
 * COLOUR. Green for movement in the wanted direction, slate for everything
 * else. No amber anywhere. No red: red on this screen is reserved for true
 * policy violations (the list below), and neither an improvement nor an
 * unmoved figure is one.
 */
export function EnforcedDeltaPanel({ delta }: { delta: EnforcementDelta | null }) {
  return (
    <div
      data-testid="govern-enforced-delta"
      /* The band swaps in place with no visible navigation, and the whole
         point of it is that a person learns something changed — so it must
         announce, exactly as NextMoveBand does.

         LIFECYCLE. This live region mounts EMPTY on first render and stays
         mounted for the panel's whole life; only its contents change. Both
         halves of that matter: screen readers announce CHANGES to an
         existing live region, and commonly say nothing for a region that is
         inserted (or remounted) already populated. So the wrapper takes no
         key and no conditional — RulesPanel renders it unconditionally with
         `delta = null` — and the per-enforce remount that replays the
         reveal happens on the inner content div below, never here. All
         box styling lives on the content too, so the empty region costs no
         visible border or padding. */
      role="status"
      aria-live="polite"
    >
      {delta && <EnforcedDeltaContent key={delta.ruleId} delta={delta} />}
    </div>
  );
}

function EnforcedDeltaContent({ delta }: { delta: EnforcementDelta }) {
  const { moved, held } = splitDelta(delta);

  return (
    <div className="border-b border-fw-secondary bg-fw-base px-5 py-4 motion-safe:[animation:cc-reveal_300ms_ease-out]">
      <div className="rounded-xl border border-fw-secondary bg-fw-wash overflow-hidden">
        <div className="px-4 py-3 border-b border-fw-secondary">
          <div className="flex items-center gap-2 text-figma-xs uppercase tracking-wide text-fw-success">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Enforced · this is what changed
          </div>
          {/* A delta with no subject is a toast. Name the rule. */}
          <div className="mt-0.5 text-figma-base font-medium text-fw-heading">
            {delta.ruleName}
          </div>
        </div>

        <ul className="divide-y divide-fw-secondary">
          {moved.map(row => (
            <li key={row.key} className="flex items-center gap-3 px-4 py-2 text-figma-sm">
              <span className="text-fw-body">{row.label}</span>
              {/* The literal "→" glyph, not an icon: NextMoveBand already
                  writes "posture 60 → 64" this way, and a glyph keeps the
                  figure a single readable string rather than two numbers with
                  an SVG wedged between them. `aria-label` carries the spoken
                  form so the arrow is never read as punctuation. */}
              <span
                data-testid={`govern-enforced-${row.key}`}
                aria-label={`${row.label} ${row.before} to ${row.after}`}
                className="ml-auto shrink-0 tabular-nums font-medium text-fw-heading"
              >
                {row.before} → {row.after}
              </span>
              {/* rounded-full is correct HERE and only here: this is a compact
                  chip, not the panel. The panel is rounded-xl above. */}
              <span
                className={`shrink-0 inline-flex items-center h-5 px-2 rounded-full text-figma-xs font-medium tabular-nums ${
                  row.good
                    ? 'bg-fw-successLight text-fw-success'
                    : 'bg-fw-neutral text-fw-bodyLight'
                }`}
              >
                {row.change > 0 ? `+${row.change}` : row.change}
              </span>
            </li>
          ))}
        </ul>

        {/* An unmoved figure is reported, not padded. Saying "posture holds at
            60" is the honest answer; printing "60 → 60  +0" is the bug this
            screen has already shipped once. */}
        {held.length > 0 && (
          <div
            data-testid="govern-enforced-held"
            className="flex items-start gap-2 px-4 py-2 border-t border-fw-secondary text-figma-xs text-fw-bodyLight"
          >
            {/* Named, not "this rule": NextMoveBand renders directly beneath
                with "Enforcing <next rule> guards against future drift" about
                a DIFFERENT rule — a bare "this rule" here binds to whichever
                the eye lands on. Past tense, because here the act is done. */}
            <Minus className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            <span>
              {heldSentence(delta, held)}. {delta.ruleName} now guards against future drift.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
