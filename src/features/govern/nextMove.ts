import type { CloudControl } from '../../engine/types';

/**
 * Govern's first move.
 *
 * Eight rules render with identical weight and nothing says where to start.
 * This module answers one question — "enforce which one first?" — and, just
 * as importantly, says why in a currency the viewer can check by counting
 * the violation list underneath.
 *
 * ── The impact rule ────────────────────────────────────────────────────────
 * Primary: VIOLATIONS CLEARED.
 *   Govern's unit of work is the open violation. It is the thing the screen
 *   already counts, in the header and in the list below the table, so a
 *   recommendation denominated in violations is one a viewer can verify
 *   without trusting us. Posture is a seven-category roll-up whose `policy`
 *   term is itself a function of violation count, so ranking on posture
 *   would lead with a derived number that mostly restates the plain one.
 *   Dollars are excluded outright: savings belong to Cost, and a governance
 *   screen that recommends by money is recommending the wrong thing.
 *
 * Tie 1: PROJECTED BEATS UNPROJECTED.
 *   The promise of this card is "here is what will happen before you commit".
 *   A rule whose after-state the engine can compute keeps that promise more
 *   fully than one whose it cannot, so at equal violations cleared the
 *   projectable rule leads.
 *
 * Tie 2: POSTURE POINTS, then RULE PRIORITY.
 *   Two rules can each clear one violation and still differ in exposure
 *   effect. Where both are projectable, posture separates them; where it
 *   cannot, the author's own stated priority order does.
 *
 * ── Rules with no bound remediation ────────────────────────────────────────
 * Three seeded rules (pol-pci, pol-internet-facing, pol-branch-finance) carry
 * no `fix` key, so `previewFix` has nothing to preview and returns nothing to
 * compare. They are NOT dropped and they are NOT floored to zero impact —
 * either would sort them last as if they were harmless, which they are not.
 * Instead their cleared-count is read from the same live source the violation
 * list renders from: the open violations stamped with their own policy id.
 * That number is exactly what enforcing them clears (`evalExample` returns no
 * violations once enforced), so it is a real projection, arrived at by a
 * different route. What we decline to invent is their posture delta — that
 * stays null and the card says the effect is not projected rather than
 * printing a number the engine never produced.
 *
 * On the seeded estate this lands them 4th, 5th and 6th of eight, ahead of
 * pol-dns and pol-perimeter — both fully previewable, both clearing nothing.
 */

export interface Move {
  ruleId: string;
  ruleName: string;
  /** Open violations this rule's enforcement removes. The ranking currency. */
  cleared: number;
  /** Posture points gained, or null when the engine cannot project it. */
  postureDelta: number | null;
  /** True when the figures came from `previewFix`. */
  projected: boolean;
  /** Author's priority order, the last tiebreak. */
  pri: number;
}

interface RuleShape {
  id: string;
  name: string;
  pri: number;
  fix?: string;
}

interface FixPreview {
  posture: number;
  violations: number;
}

interface ViolationShape {
  policy?: string;
}

/** Scores one unenforced rule. Read-only: `previewFix` projects and restores. */
function scoreMove(cc: CloudControl, rule: RuleShape, openNow: number): Move {
  const base: Omit<Move, 'cleared' | 'postureDelta' | 'projected'> = {
    ruleId: rule.id,
    ruleName: rule.name,
    pri: rule.pri,
  };

  if (rule.fix) {
    const preview = cc.previewFix(rule.fix) as FixPreview | null;
    // previewFix returns null for an already-applied fix. Unenforced rules
    // never hit that, but a null must not become NaN if the engine changes.
    if (preview) {
      return {
        ...base,
        cleared: openNow - preview.violations,
        postureDelta: preview.posture - cc.posture(),
        projected: true,
      };
    }
  }

  // No bound remediation: count this rule's own open violations, which is
  // precisely the set enforcement drains — but `violations()` (state.ts)
  // only stamps a `policy` id on entries from `_.customPolicies` and the
  // three example seed rules. A plain rule authored through "New rule" gets
  // no matching entry there, so `own` is always 0 for it here, even if the
  // rule genuinely matches live traffic. Safe — it never overclaims impact
  // — but this fallback is NOT a universal "this rule's real violation
  // count"; it only reads true for the two families `violations()` stamps.
  const own = (cc.violations() as ViolationShape[]).filter(v => v.policy === rule.id).length;
  return { ...base, cleared: own, postureDelta: null, projected: false };
}

/** Every unenforced rule, best first. Recomputed on each call — no caching. */
export function rankMoves(cc: CloudControl): Move[] {
  const openNow = cc.violations().length;
  return (cc.ruleList() as RuleShape[])
    // `CloudControl.ruleEnforced` resolves through the interface's catch-all
    // `[key: string]: any` (types.ts) rather than a typed signature, so it
    // accepts any argument shape already — no cast needed, and `as never`
    // read as a deliberate type-check suppression rather than what this is.
    .filter(r => !cc.ruleEnforced(r))
    .map(r => scoreMove(cc, r, openNow))
    .sort(
      (a, b) =>
        b.cleared - a.cleared ||
        Number(b.projected) - Number(a.projected) ||
        (b.postureDelta ?? 0) - (a.postureDelta ?? 0) ||
        a.pri - b.pri,
    );
}

/** The single recommended next step, or null when nothing is left to enforce. */
export function nextMove(cc: CloudControl): Move | null {
  return rankMoves(cc)[0] ?? null;
}
