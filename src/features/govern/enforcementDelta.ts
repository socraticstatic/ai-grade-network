import type { CloudControl } from '../../engine/types';

/**
 * The other half of the dry run.
 *
 * RuleBuilder's dry run states what WILL happen, over named flows, under
 * "Dry run · nothing has changed yet". This module produces the answer to the
 * question that beat leaves open: what DID happen. Enforcing a rule used to
 * flip a badge from Unenforced to Enforced and nothing else — the flattest
 * moment on a screen whose entire promise is that acting changes something.
 *
 * ── Where the figures come from ───────────────────────────────────────────
 * Posture, violations and egress already appear on Govern, Observe and Cost.
 * This is a FOURTH place they can be read, so it must agree with the other
 * three by construction rather than by luck. It does, because it does not
 * compute anything: it reads the live engine through the exact calls those
 * surfaces read, once before the mutation and once after, and subtracts.
 *
 *   posture     `cc.posture()`      — the same call PosturePanel and
 *                                     NextMoveBand render.
 *   violations  `cc.violations()`   — the same call the Rules card header,
 *                                     the violation list below the table and
 *                                     NextMoveBand all count.
 *   enforced    `cc.ruleList()` + `cc.ruleEnforced()` — literally the Rules
 *                                     card header's "N / M enforced".
 *
 * `SteerToSave` (features/cost) is the cited precedent for the shape: read
 * the engine's figure, mutate, read it again, and report the realized
 * difference rather than a re-normalized estimate.
 *
 * ── What is deliberately NOT shown ────────────────────────────────────────
 * MONEY. `cc.egress()` is readable here and would move on some rules, but
 * `nextMove.ts` already settled the house position for this screen: "savings
 * belong to Cost, and a governance screen that recommends by money is
 * recommending the wrong thing." Reporting a dollar delta on Govern would
 * also be the figure most likely to drift from how Cost presents it (total,
 * savings, arbitrage buckets — not a public-egress delta). Three honest
 * figures the viewer can verify by counting this very screen beat four that
 * need a second surface to check.
 */

export interface EnforcementReading {
  posture: number;
  violations: number;
  enforced: number;
  total: number;
}

export interface EnforcementDelta {
  ruleId: string;
  ruleName: string;
  before: EnforcementReading;
  after: EnforcementReading;
}

interface RuleShape {
  id: string;
  name: string;
}

/** One synchronous read of the three Govern-native figures. */
export function readEnforcement(cc: CloudControl): EnforcementReading {
  const rules = cc.ruleList() as RuleShape[];
  return {
    posture: cc.posture(),
    violations: cc.violations().length,
    // `ruleEnforced` takes the rule object, not the id — same as the header.
    enforced: rules.filter(r => cc.ruleEnforced(r)).length,
    total: rules.length,
  };
}

/**
 * Enforces `ruleId` and returns what moved, or null when nothing was enforced
 * (unknown id, or already enforced — `enforceAny` returns false for both).
 *
 * The two reads bracket the mutation with nothing in between, so the "before"
 * really is the state the viewer was looking at and the "after" really is the
 * state every other surface will now render. No projection, no `previewFix`:
 * the figures are the outcome, not a forecast of it.
 */
export function enforceAndMeasure(cc: CloudControl, ruleId: string): EnforcementDelta | null {
  const rule = (cc.ruleList() as RuleShape[]).find(r => r.id === ruleId);
  if (!rule) return null;
  const before = readEnforcement(cc);
  if (!cc.enforceAny(ruleId)) return null;
  return { ruleId, ruleName: rule.name, before, after: readEnforcement(cc) };
}

export interface DeltaRow {
  /** Stable testid suffix and React key. */
  key: 'violations' | 'posture' | 'rules';
  label: string;
  before: number;
  after: number;
  /** Signed change. Never zero — an unmoved figure is not a row. */
  change: number;
  /** True when the movement is in the direction the product wants. */
  good: boolean;
}

/** Label used in both the moved rows and the "held" sentence, so a figure
 *  reads the same whichever half of the panel it lands in. */
const LABELS: Record<DeltaRow['key'], string> = {
  violations: 'Open violations',
  posture: 'Security posture',
  rules: 'Rules enforced',
};

/**
 * Splits the reading into what moved and what held.
 *
 * A figure that did not move gets NO row. Padding the panel with a "0" or an
 * "X → X" is the exact defect the recommendation band shipped twice — a
 * "60 → 60" that read as a broken number, and a "clears 0 of the 0" that
 * recommended an action the same sentence said did nothing. An unmoved figure
 * is still worth saying, so it goes into `held` as plain prose instead.
 *
 * `rules` is always in `moved`: enforcement moves it by exactly one every
 * time, which is what keeps the panel from ever rendering empty.
 */
export function splitDelta(d: EnforcementDelta): { moved: DeltaRow[]; held: DeltaRow['key'][] } {
  const moved: DeltaRow[] = [];
  const held: DeltaRow['key'][] = [];

  const consider = (key: DeltaRow['key'], before: number, after: number, higherIsBetter: boolean) => {
    const change = after - before;
    if (change === 0) {
      held.push(key);
      return;
    }
    moved.push({
      key,
      label: LABELS[key],
      before,
      after,
      change,
      good: higherIsBetter ? change > 0 : change < 0,
    });
  };

  // Violations first: it is the currency the recommendation band ranks in and
  // the one the viewer can check by counting the list below the table.
  consider('violations', d.before.violations, d.after.violations, false);
  consider('posture', d.before.posture, d.after.posture, true);
  consider('rules', d.before.enforced, d.after.enforced, true);

  return { moved, held };
}

/** Verb conjugated per subject — "Open violations" and "Rules enforced" are
 *  plural, "Security posture" is singular. A hardcoded "holds" produced
 *  "Open violations holds at 3". */
const HOLD_VERB: Record<DeltaRow['key'], string> = {
  violations: 'hold',
  posture: 'holds',
  rules: 'hold',
};

/** "Open violations hold at 0 · Security posture holds at 72." */
export function heldSentence(d: EnforcementDelta, held: DeltaRow['key'][]): string {
  const at: Record<DeltaRow['key'], number> = {
    violations: d.after.violations,
    posture: d.after.posture,
    rules: d.after.enforced,
  };
  return held.map(k => `${LABELS[k]} ${HOLD_VERB[k]} at ${at[k]}`).join(' · ');
}
