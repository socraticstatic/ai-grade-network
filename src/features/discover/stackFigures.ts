import type { CloudControl } from '../../engine/types';
import { aiSpendTotals } from '../ai-fabric/aiSpend';
import { estimateMonthlySavings, publicGbps, toSavingsRec } from '../cost/costMath';
import type { TokenPolicySpec } from '../ai-fabric/tokenPolicyPreview';

/**
 * The cross-section's derivations. Every figure the stack panel states comes
 * through here, and everything here reads the SAME engine getters the verb
 * pages read — aiSpendTotals for /ai/cost's money, fabricModel/regionLatency
 * for /naas/connect's paths, egress/arbitrage for /naas/cost's. A staged
 * delta and the committed state it predicts are the same arithmetic, so the
 * twin cannot promise what the estate would later deny.
 *
 * No React in this file, and no formatting beyond token counts — the panel
 * formats, this module states.
 */

export interface AiStratumFigures {
  modelsReady: number;
  modelsTotal: number;
  tokensToday: number;
  ungovernedTokensToday: number;
  spendToday: number;
  identityCount: number;
}

export interface NaasStratumFigures {
  regionsAttached: number;
  regionsTotal: number;
  sites: number;
  /** $/mo egress riding the public internet — /naas/cost's own split. */
  egressPubMo: number;
  /** $/mo egress already on the fabric. */
  egressPrivMo: number;
  /** $/mo still on the table if every on-ramp attached (arbitrage). */
  availableSavingsMo: number;
}

export function aiStratum(cc: CloudControl): AiStratumFigures {
  const totals = aiSpendTotals(cc);
  const catalog = (cc.modelCatalog?.() ?? []) as { ready: boolean }[];
  return {
    modelsReady: catalog.filter(m => m.ready).length,
    modelsTotal: catalog.length,
    tokensToday: totals.tokensToday,
    ungovernedTokensToday: totals.ungovernedTokensToday,
    spendToday: totals.spendToday,
    identityCount: totals.identityCount,
  };
}

export function naasStratum(cc: CloudControl): NaasStratumFigures {
  const fabric = cc.fabricModel();
  const egress = cc.egress();
  const arb = cc.arbitrage();
  return {
    regionsAttached: fabric.regions.filter(r => r.attached).length,
    regionsTotal: fabric.regions.length,
    sites: fabric.sites.length,
    egressPubMo: egress.pub,
    egressPrivMo: egress.priv,
    availableSavingsMo: arb.availableSavings,
  };
}

/* ------------------------- design mode: the moves ------------------------- */

export interface AttachOpportunity {
  kind: 'attach';
  regionId: string;
  label: string;
  cloudName: string;
  /** Both sides of the latency arrow, from regionLatency — never restated. */
  publicMs: number;
  privateMs: number;
  /** The arbitrage bucket this attach would move onto the fabric, if the
   *  engine prices one for this region's on-ramp; null when it does not. */
  bucketSavingMo: number | null;
  bucketLabel: string | null;
}

export interface SteerOpportunity {
  kind: 'steer';
  flowId: string;
  pathId: string;
  label: string;
  detail: string;
  /** $/mo saved, computed by costMath.estimateMonthlySavings — the SAME
   *  arithmetic /naas/cost's Steer-to-save panel states for this rec; null
   *  when that arithmetic prices it at nothing it can stand behind. */
  egressSavingMo: number | null;
}

export interface RuleSpec {
  name: string;
  src: Record<string, string>;
  dst: unknown;
  ports: string;
  action: string;
  chain: string[];
}

/* A spec handed from the rule builder to the tray. Read-once, like the share
   proposal (cc.takeProposal()): the builder sets it, StackPanel takes it, and
   nothing persists, so a refresh cannot re-stage it. Encoding the spec in the
   URL instead was rejected as long and fragile — this module-level holder is
   the same idiom the engine already uses for its own read-once handoff. */
let pendingRuleSpec: RuleSpec | null = null;
export function setPendingRuleSpec(spec: RuleSpec) { pendingRuleSpec = spec; }
export function takePendingRuleSpec(): RuleSpec | null {
  const s = pendingRuleSpec; pendingRuleSpec = null; return s;
}

/* The same read-once handoff the rule builder uses, for a token policy spec:
   the builder sets it, StackPanel takes it, nothing persists, so a refresh
   cannot re-stage. */
let pendingPolicySpec: TokenPolicySpec | null = null;
export function setPendingPolicySpec(spec: TokenPolicySpec) { pendingPolicySpec = spec; }
export function takePendingPolicySpec(): TokenPolicySpec | null {
  const s = pendingPolicySpec; pendingPolicySpec = null; return s;
}

export type StagedMove =
  | { kind: 'attach'; regionId: string }
  | { kind: 'steer'; flowId: string; pathId: string }
  /* Phase: standing intents. Security and AI repairs ride the same tray as
     attach and steer - a fix, a rule enforcement, or a token-policy patch.
     Their deltas are stated in their own vocabulary (violations cleared,
     budget/guardrail changes), never as invented dollars. */
  | { kind: 'fix'; fixKey: string }
  | { kind: 'enforce'; ruleId: string }
  | {
      kind: 'policy';
      tag: string;
      /* Every field TokenPolicyBuilder's spec can carry and StackPanel spreads
         into the patch (see the policy-new branch below) - softPct and group
         included. setTokenPolicy shallow-merges whatever is here straight
         onto the estate, so a field missing from this type is a field that
         can be committed while never appearing in moveLabel's sentence
         below - staged without ever being reviewed. */
      patch: { scope?: string; budget?: number; softPct?: number; guardrail?: boolean; enforced?: boolean; group?: string };
    }
  /* A rule the human authored (or tightened from a proposal) and staged rather
     than committed. Its consequence is stated in dryRun's own figures; it never
     claims a dollar the engine does not price. */
  | { kind: 'rule'; spec: RuleSpec };

export function attachOpportunities(cc: CloudControl): AttachOpportunity[] {
  const fabric = cc.fabricModel();
  const buckets = cc.arbitrage().buckets;
  return fabric.regions
    .filter(r => !r.attached)
    .map(r => {
      const bucket = buckets.find(
        b => !b.attached && b.onrampId !== null && r.onrampIds.includes(b.onrampId),
      ) ?? null;
      const lat = cc.regionLatency(r.regionId);
      return {
        kind: 'attach' as const,
        regionId: r.regionId,
        label: r.name,
        cloudName: r.cloudName,
        publicMs: lat?.publicMs ?? r.publicMs,
        privateMs: lat?.privateMs ?? r.privateMs,
        bucketSavingMo: bucket ? bucket.saving : null,
        bucketLabel: bucket ? bucket.label : null,
      };
    });
}

export function steerOpportunities(cc: CloudControl): SteerOpportunity[] {
  const recs = cc.routeAdvisor().recommendations.filter(r => r.action === 'steer');
  const flows = cc.routeFlows();
  const pubSpendMo = cc.egress().pub;
  const pubGbps = publicGbps(flows);
  return recs.flatMap(rec => {
    const flow = flows.find(f => f.id === rec.flowId);
    if (!flow) return [];
    const target =
      (rec.pathId && flow.paths.find(p => p.id === rec.pathId)) ||
      flow.paths.find(p => p.attControlled && p.available);
    if (!target) return [];
    const saving = estimateMonthlySavings([toSavingsRec(rec, flows)], pubSpendMo, pubGbps);
    return [{
      kind: 'steer' as const,
      flowId: flow.id,
      pathId: target.id,
      label: flow.label,
      detail: rec.detail,
      egressSavingMo: saving > 0 ? saving : null,
    }];
  });
}

/* ------------------------------ staged deltas ----------------------------- */

export interface StagedDeltas {
  moves: number;
  /** Latency arrow for the worst staged attach (largest publicMs), stated in
   *  regionLatency's own figures; null when nothing staged attaches. */
  worstPath: { label: string; publicMs: number; privateMs: number } | null;
  /** Σ $/mo the staged moves keep, counting only moves the engine prices. */
  egressSavingMo: number;
  /** Moves whose saving the engine does not price — named, never summed. */
  unpricedMoves: string[];
  /** Violations the staged fixes/enforcements would clear — projected via
   *  the engine's own snapshot/restore, the same figure Govern states. */
  violationsCleared: number;
  /** One sentence per staged policy patch, in policy vocabulary. */
  policyNotes: string[];
}

/** How a fix/enforce/policy move renders in the tray — label + consequence,
 *  both engine-derived at call time. */
export function moveLabel(cc: CloudControl, move: StagedMove): { label: string; detail: string } {
  switch (move.kind) {
    case 'attach': {
      const r = cc.fabricModel().regions.find(x => x.regionId === move.regionId);
      return { label: `Attach ${r?.name ?? move.regionId}`, detail: r ? `${r.publicMs}ms → ${r.privateMs}ms` : '' };
    }
    case 'steer': {
      const f = cc.routeFlows().find(x => x.id === move.flowId);
      const p = f?.paths.find(x => x.id === move.pathId);
      return { label: `Steer ${f?.label ?? move.flowId}`, detail: p ? `to ${p.label}` : '' };
    }
    case 'fix': {
      const cleared = projectedViolationsCleared(cc, [move]);
      return {
        label: `Apply ${move.fixKey}`,
        detail: cleared > 0 ? `clears ${cleared} violation${cleared === 1 ? '' : 's'}` : 'a posture control',
      };
    }
    case 'enforce': {
      const rule = (cc.ruleList?.() ?? []).find((r: { id: string }) => r.id === move.ruleId);
      return { label: `Enforce ${rule?.name ?? move.ruleId}`, detail: 'policy goes from draft to enforced' };
    }
    case 'policy': {
      const parts: string[] = [];
      if (move.patch.budget !== undefined) parts.push(`budget ${move.patch.budget.toLocaleString()} tokens/day`);
      if (move.patch.softPct !== undefined) parts.push(`alert at ${move.patch.softPct}%`);
      if (move.patch.guardrail !== undefined) parts.push(move.patch.guardrail ? 'guardrail on' : 'guardrail off');
      if (move.patch.enforced !== undefined) parts.push(move.patch.enforced ? 'enforced' : 'draft');
      if (move.patch.scope !== undefined) parts.push(`scope ${move.patch.scope}`);
      if (move.patch.group !== undefined) parts.push(`group ${move.patch.group}`);
      return { label: `Token policy · ${move.tag}`, detail: parts.join(' · ') };
    }
    case 'rule': {
      const dry = cc.dryRun(move.spec) as { matched: unknown[]; gbps: number };
      const n = dry.matched.length;
      return {
        label: `Author rule · ${move.spec.name || 'unnamed rule'}`,
        detail: `${n} modelled flow${n === 1 ? '' : 's'} carrying ${dry.gbps} Gbps`,
      };
    }
  }
}

/* The violations delta for staged fixes, measured through the engine's own
   projection (previewFix = snapshot, apply, count, restore). Summed per fix
   and clamped at the current total: two fixes clearing overlapping rows must
   not claim more than the estate holds. Enforce moves carry no projection
   (the engine offers none), so they state their consequence in words and
   never join this count — a number the engine cannot stand behind is not
   stated as one. */
function projectedViolationsCleared(cc: CloudControl, moves: StagedMove[]): number {
  const fixes = moves.filter(m => m.kind === 'fix') as { kind: 'fix'; fixKey: string }[];
  if (!fixes.length) return 0;
  const before = cc.violations().length;
  let cleared = 0;
  for (const m of fixes) {
    const p = cc.previewFix(m.fixKey);
    if (p) cleared += Math.max(0, before - p.violations);
  }
  return Math.min(cleared, before);
}

export function stagedDeltas(cc: CloudControl, moves: StagedMove[]): StagedDeltas {
  const attaches = attachOpportunities(cc);
  const steers = steerOpportunities(cc);
  let egressSavingMo = 0;
  const unpriced: string[] = [];
  let worst: StagedDeltas['worstPath'] = null;

  const policyNotes: string[] = [];
  for (const move of moves) {
    if (move.kind === 'attach') {
      const opp = attaches.find(o => o.regionId === move.regionId);
      if (!opp) continue;
      if (opp.bucketSavingMo !== null) egressSavingMo += opp.bucketSavingMo;
      else unpriced.push(opp.label);
      if (!worst || opp.publicMs > worst.publicMs) {
        worst = { label: opp.label, publicMs: opp.publicMs, privateMs: opp.privateMs };
      }
    } else if (move.kind === 'steer') {
      const opp = steers.find(o => o.flowId === move.flowId && o.pathId === move.pathId);
      if (!opp) continue;
      if (opp.egressSavingMo !== null) egressSavingMo += opp.egressSavingMo;
      else unpriced.push(opp.label);
    } else if (move.kind === 'policy' || move.kind === 'enforce' || move.kind === 'rule') {
      const { label, detail } = moveLabel(cc, move);
      policyNotes.push(detail ? `${label}: ${detail}` : label);
    }
    // fix moves speak through violationsCleared below
  }
  return {
    moves: moves.length,
    worstPath: worst,
    egressSavingMo,
    unpricedMoves: unpriced,
    violationsCleared: projectedViolationsCleared(cc, moves),
    policyNotes,
  };
}

/**
 * The advisor's draft: every steer the engine already recommends and every
 * attach the arbitrage table prices. A derivation, not a daemon — its whole
 * authority is a pre-filled tray, and nothing commits without a human.
 */
export function advisorDraft(cc: CloudControl): { moves: StagedMove[]; deltas: StagedDeltas } {
  const moves: StagedMove[] = [
    ...attachOpportunities(cc)
      .filter(o => o.bucketSavingMo !== null)
      .map(o => ({ kind: 'attach' as const, regionId: o.regionId })),
    ...steerOpportunities(cc)
      .map(o => ({ kind: 'steer' as const, flowId: o.flowId, pathId: o.pathId })),
  ];
  return { moves, deltas: stagedDeltas(cc, moves) };
}

/**
 * THE money-on-the-table figure. One derivation, every surface.
 *
 * Two numbers used to compete for the same sentence, and a viewer reading
 * two screens in one sitting caught them disagreeing:
 *   - `arbitrage().availableSavings` = the egress BILL CEILING (what the
 *     invoice drops to if every bucket attaches). Attach-only; it cannot
 *     see a steer, because steering doesn't change which buckets exist.
 *   - `advisorDraft().deltas.egressSavingMo` = what the advisor can ACT on
 *     right now: every priced attach plus every recommended steer.
 * Both are true; only one answers "how much is on the table", because only
 * one is backed by moves a human can review and commit. That one wins, and
 * every "on the table" rendering reads it from here. The bill ceiling keeps
 * its own sentence on Cost, where the three-bill comparison needs it - but
 * it never again claims the same words.
 */
export function moneyOnTheTable(cc: CloudControl): {
  savingsMo: number;
  moves: number;
  attachMoves: number;
  steerMoves: number;
  /** Named regions/flows behind the total, for the evidence popover. */
  unpriced: string[];
} {
  const draft = advisorDraft(cc);
  return {
    savingsMo: draft.deltas.egressSavingMo,
    moves: draft.moves.length,
    attachMoves: draft.moves.filter(m => m.kind === 'attach').length,
    steerMoves: draft.moves.filter(m => m.kind === 'steer').length,
    unpriced: draft.deltas.unpricedMoves,
  };
}

/* Whether committing a move of this KIND pushes an undo entry - established
 * by reading, for each kind, the exact engine mutation `commitMoves` below
 * calls, and checking THAT function for a `pushUndo`/`_.pushUndo` call:
 *
 *   attach  -> cc.provisionRegion -> CC.activateOnramp(id)
 *              state.ts:174-188 (activateOnramp) - `if(!silent)pushUndo(...)`
 *              runs before the ramp is flipped active. provisionRegion never
 *              passes `silent`, and attachOpportunities() only ever offers a
 *              region with an inactive ramp to activate, so this path always
 *              pushes.                                              COVERED
 *
 *   steer   -> cc.steerFlow -> state-routing.ts `steerFlow`
 *              Reads `steered[rowId]=pathId;` then `_.emit(...)` - no
 *              `pushUndo` call anywhere in state-routing.ts, and `steered`
 *              is not part of state.ts's snapshot()/restore() pair either.
 *              Undo cannot revert this at any point.             NOT COVERED
 *
 *   fix     -> cc.applyFix -> state.ts:189-196 `applyFix`
 *              `if(!silent)pushUndo('Fix '+key);` before `fixes[key]=true`.
 *              commitMoves never passes `silent`.                   COVERED
 *
 *   enforce -> cc.enforceAny -> state-rules.ts:449-452 `enforceAny`
 *              Routes to `enforceRule` (pushes: state-rules.ts:413-416,
 *              unconditional on !silent) when the id names a RULE, or to
 *              `enforcePolicy` (state-rules.ts:88-94 - no pushUndo at all)
 *              when it does not. This tray's only source of an 'enforce'
 *              move's ruleId is ruleProposals() (ruleProposals.ts:41,57),
 *              which reads `rule.id` off `cc.ruleList()` itself - so the id
 *              always names a real rule and the enforcePolicy branch is
 *              never reached from here.                              COVERED
 *
 *   policy  -> cc.setTokenPolicy -> state-console.ts:95-99
 *              Shallow-merges the patch and emits - no pushUndo. The
 *              original finding this table exists to generalize.  NOT COVERED
 *
 *   rule    -> cc.addRule -> state-rules.ts:402-412 `addRule`
 *              `_.pushUndo('Author rule');` runs unconditionally, before
 *              `enforceNow` is even consulted - authoring is undo-covered
 *              regardless of whether enforcement follows immediately.
 *                                                                     COVERED
 *
 * A move kind added to StagedMove must get an explicit entry here - there is
 * no default and no fallback, so a forgotten kind is a type error rather
 * than a silent (and possibly wrong) "covered".
 */
const UNDO_COVERED: Record<StagedMove['kind'], boolean> = {
  attach: true,
  steer: false,
  fix: true,
  enforce: true,
  policy: false,
  rule: true,
};

/** True when actually committing this exact move pushes an undo entry - see
 *  UNDO_COVERED above for the per-kind truth table and how it was derived. */
export function isUndoCovered(move: StagedMove): boolean {
  return UNDO_COVERED[move.kind];
}

/** Apply staged moves through the real engine actions, in order. Returns the
 *  moves that failed — the caller states them, never swallows them. */
export function commitMoves(cc: CloudControl, moves: StagedMove[]): StagedMove[] {
  const failed: StagedMove[] = [];
  for (const move of moves) {
    let ok: boolean;
    switch (move.kind) {
      case 'attach':
        ok = cc.provisionRegion(move.regionId) !== null;
        break;
      case 'steer':
        ok = cc.steerFlow(move.flowId, move.pathId);
        break;
      case 'fix':
        ok = cc.applyFix(move.fixKey);
        break;
      case 'enforce':
        ok = cc.enforceAny ? cc.enforceAny(move.ruleId) : false;
        break;
      case 'policy':
        cc.setTokenPolicy(move.tag, move.patch);
        ok = true;
        break;
      case 'rule':
        ok = cc.addRule({ ...move.spec, enforceNow: false }) !== null;
        break;
    }
    if (!ok) failed.push(move);
  }
  return failed;
}
