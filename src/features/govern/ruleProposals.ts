import type { CloudControl } from '../../engine/types';

/**
 * The proposal derivation: every behavioral finding the engine currently holds
 * active, joined to the preventive rule that answers it and priced by the same
 * dryRun the builder uses.
 *
 * A finding names an EXISTING rule id, not a new spec, so a proposal's primary
 * resolution is to enforce a rule that already exists. `active` is recomputed
 * from the flow table and the fixes flags on every read, so enforcing that rule
 * drains the finding and the proposal retires itself - nothing here stores or
 * dismisses anything.
 *
 * The engine's own `promote()` is deliberately not used: it calls enforceRule
 * immediately, and the machine stages, never commits.
 */

export interface RuleProposal {
  id: string;
  findingId: string;
  severity: 'crit' | 'high';
  source: string;
  title: string;
  detail: string;
  ruleId: string;
  ruleName: string;
  /** What enforcing the named rule would touch, from dryRun. */
  impact: { matched: number; gbps: number };
}

interface Finding {
  id: string; severity: string; source: string; title: string;
  detail: string; rule: string; active: boolean;
}
interface Rule { id: string; name: string }

const SEVERITY_RANK: Record<string, number> = { crit: 0, high: 1 };

export function ruleProposals(cc: CloudControl): RuleProposal[] {
  const findings = (cc.threatFindings?.() ?? []) as Finding[];
  const rules = cc.ruleList() as Rule[];

  const rows = findings.flatMap<RuleProposal>(f => {
    if (!f.active) return [];
    const rule = rules.find(r => r.id === f.rule);
    // A finding whose rule the estate does not carry is skipped rather than
    // rendered broken; one whose rule is already enforced IS the resolved state.
    if (!rule || cc.ruleEnforced(rule)) return [];
    const dry = cc.dryRun(rule) as { matched: unknown[]; gbps: number };
    return [{
      id: `finding-${f.id}`,
      findingId: f.id,
      severity: f.severity === 'crit' ? 'crit' : 'high',
      source: f.source,
      title: f.title,
      detail: f.detail,
      ruleId: rule.id,
      ruleName: rule.name,
      impact: { matched: dry.matched.length, gbps: dry.gbps },
    }];
  });

  return rows.sort((a, b) =>
    (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) || (b.impact.gbps - a.impact.gbps));
}
