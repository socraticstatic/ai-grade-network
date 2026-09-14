import { useLocation } from 'react-router-dom';
import { CC } from '../../engine';
import { useCloudControl } from '../../engine/react/useCloudControl';

export type FlowStageId = 'discover' | 'connect' | 'govern' | 'observe' | 'cost';
export type FlowStatus = 'done' | 'current' | 'upcoming';

export interface FlowStage {
  stage: FlowStageId;
  label: string;
  route: string;
}

export interface FlowStageProgress extends FlowStage {
  status: FlowStatus;
}

/** The flow spine, left → right. Order is canonical and stable.
 *
 *  This is the NaaS spine: Discover, then NaaS's own four verbs. The AI
 *  Fabric's verbs are deliberately absent — it is a separate domain with its
 *  own Connect/Govern/Observe/Cost, and its screens do not render this rail
 *  (see AiDomainPage). */
export const FLOW_STAGES: readonly FlowStage[] = [
  { stage: 'discover', label: 'Discover', route: '/discover' },
  { stage: 'connect', label: 'Connect', route: '/naas/connect' },
  { stage: 'govern', label: 'Govern', route: '/naas/govern' },
  { stage: 'observe', label: 'Observe', route: '/naas/observe' },
  { stage: 'cost', label: 'Cost', route: '/naas/cost' },
] as const;

/* Baselines captured once at module load, from the engine's initial state.
   Deterministic (no clock/random): they only shift when the user actually
   moves the fabric, which is exactly the "done" signal we want. */
const countAttControlled = (flows: { current: { attControlled: boolean } }[]) =>
  flows.filter(f => f.current.attControlled).length;

const BASELINE_ATTACHED = safe(() => CC.counts().attached, 0);
const BASELINE_STEERED = safe(() => countAttControlled(CC.routeFlows()), 0);

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * The five remediation flags that correspond to an enforced governance rule.
 * The `fixes` bag also holds two posture moves that are NOT rules —
 * `shiftAws` (rebalance onto NetBond headroom) and `renumbered` (fix a CIDR
 * collision) — so `Object.values(fixes).some(Boolean)` would wrongly mark
 * Govern done when only a posture move was applied. Count these keys only.
 */
const RULE_FIX_KEYS = ['isolateFinance', 'fwInspection', 'segmentHelion', 'dnsFirewall', 'dataPerimeter'] as const;

function anyRuleEnforced(cc: typeof CC): boolean {
  const fixes = cc.fixes || {};
  const anyRuleFix = RULE_FIX_KEYS.some(k => !!fixes[k]);
  const anyRule =
    typeof cc.ruleList === 'function' &&
    (cc.ruleList() as { enforced?: boolean }[]).some(r => !!r.enforced);
  return anyRuleFix || anyRule;
}

/**
 * Per-stage flow status for the five-stage spine, derived from engine state
 * where a real signal exists:
 *
 *  - Discover — always done (the footprint is always mapped).
 *  - Connect  — done once attached VPCs exceed the initial baseline, or two+
 *               on-ramps are active (a second circuit has been lit).
 *  - Govern   — done once any rule/fix is enforced.
 *  - Observe  — no dedicated engine flag; soft-derives from Govern being done,
 *               since enforcing a rule produces the impact there is to observe.
 *  - Cost     — no "captured steer" flag exists; done once the count of
 *               AT&T-controlled flows exceeds the initial baseline (a steer or
 *               attach beyond where the session started).
 *
 * `current` (the active route) always wins over a `done` derivation, so the
 * stage you are on renders as current, and earlier not-yet-done stages are
 * left as upcoming rather than force-completed.
 */
export function useFlowProgress(): FlowStageProgress[] {
  const { pathname } = useLocation();

  const attached = useCloudControl(cc => cc.counts().attached);
  const activeOnramps = useCloudControl(cc => (cc.activeOnramps ? cc.activeOnramps() : 0));
  const governed = useCloudControl(cc => anyRuleEnforced(cc));
  const steered = useCloudControl(cc => safe(() => countAttControlled(cc.routeFlows()), 0));

  const connectDone = attached > BASELINE_ATTACHED || activeOnramps >= 2;
  const governDone = governed;
  const observeDone = governDone;
  const costDone = steered > BASELINE_STEERED;

  const doneByStage: Record<FlowStageId, boolean> = {
    discover: true,
    connect: connectDone,
    govern: governDone,
    observe: observeDone,
    cost: costDone,
  };

  return FLOW_STAGES.map(s => {
    const isCurrent = pathname === s.route || pathname.startsWith(s.route + '/');
    const status: FlowStatus = isCurrent ? 'current' : doneByStage[s.stage] ? 'done' : 'upcoming';
    return { ...s, status };
  });
}
