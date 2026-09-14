import type { CloudControl } from '../../engine/types';

/**
 * What a proposed token policy would do, answered from getters the engine
 * already computes. Nothing here invents a figure and nothing mutates.
 *
 * The denial replay calls CC.scopeDenies - the SAME predicate promptTrace's
 * gate calls - so a preview cannot promise something the gate would not do.
 * Reimplementing that rule here would be a lie waiting to happen.
 */

export interface TokenPolicySpec {
  tag: string;
  scope: string;
  budget: number;
  softPct: number;
  guardrail: boolean;
  enforced: boolean;
  group?: string;
}

export interface TokenPolicyPreview {
  meter: { today: number; budget: number; pct: number } | null;
  proposedPct: number | null;
  wouldDeny: { count: number; total: number; reasons: string[] };
  boundAgents: string[];
  capIntentEnforced: boolean;
  unmetered: boolean;
}

interface Meter { tag: string; today: number; budget: number; pct: number }
interface Decision { tag: string | null; modelId: string | null }
interface Agent { name: string; app: string }

export function tokenPolicyPreview(cc: CloudControl, spec: TokenPolicySpec): TokenPolicyPreview {
  const meters = (cc.tokenMeterList?.() ?? []) as Meter[];
  const m = meters.find(x => x.tag === spec.tag) ?? null;

  // A group-scoped identity never meters: tokenMeterList iterates a fixed set.
  const unmetered = m === null;

  const log = (cc.decisionLog?.() ?? []) as Decision[];
  const mine = log.filter(d => d.tag === spec.tag);
  const denied = mine.filter(d => !!cc.scopeDenies(spec.scope, d.modelId ?? ''));
  const reasons = Array.from(new Set(
    denied.map(d => cc.scopeDenies(spec.scope, d.modelId ?? '') as string),
  ));

  const agents = (cc.agentList?.() ?? []) as Agent[];

  return {
    meter: m ? { today: m.today, budget: m.budget, pct: m.pct } : null,
    proposedPct: m && spec.budget > 0 ? Math.round((m.today / spec.budget) * 100) : null,
    wouldDeny: { count: denied.length, total: mine.length, reasons },
    boundAgents: agents.filter(a => a.app === spec.tag).map(a => a.name),
    capIntentEnforced: !!cc.intentCapEnforced?.(spec.tag),
    unmetered,
  };
}
