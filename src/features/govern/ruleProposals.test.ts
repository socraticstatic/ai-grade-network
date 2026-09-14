import { describe, test, expect, afterEach } from 'vitest';
import { ruleProposals } from './ruleProposals';
import { CC } from '../../engine';

/* The seeded estate ships all four findings active and all four of their rules
   unenforced, so the derivation starts full and empties as rules enforce. */
afterEach(() => { while (CC.canUndo()) CC.undo(); });

describe('ruleProposals', () => {
  test('derives one proposal per active finding whose rule is unenforced', () => {
    const proposals = ruleProposals(CC);
    const findings = CC.threatFindings().filter(f => f.active);
    expect(proposals.length).toBe(findings.length);
    expect(proposals.length).toBeGreaterThan(0);
    for (const p of proposals) {
      expect(p.id).toBe(`finding-${p.findingId}`);
      expect(['crit', 'high']).toContain(p.severity);
      // The rule it names really exists and is really unenforced.
      const rule = CC.ruleList().find((r: { id: string }) => r.id === p.ruleId)!;
      expect(rule).toBeDefined();
      expect(CC.ruleEnforced(rule)).toBe(false);
      expect(p.ruleName).toBe(rule.name);
    }
  });

  test('states impact from dryRun, not from an invented figure', () => {
    const p = ruleProposals(CC)[0];
    const rule = CC.ruleList().find((r: { id: string }) => r.id === p.ruleId)!;
    const dry = CC.dryRun(rule) as { matched: unknown[]; gbps: number };
    expect(p.impact.matched).toBe(dry.matched.length);
    expect(p.impact.gbps).toBe(dry.gbps);
  });

  test('sorts crit before high', () => {
    const sev = ruleProposals(CC).map(p => p.severity);
    expect(sev.indexOf('high') === -1 || sev.lastIndexOf('crit') < sev.indexOf('high')).toBe(true);
  });

  test('drops a proposal once its rule is enforced - the finding retires itself', () => {
    const before = ruleProposals(CC);
    const target = before[0];
    CC.enforceRule(target.ruleId);
    const after = ruleProposals(CC);
    expect(after.map(p => p.id)).not.toContain(target.id);
    expect(after.length).toBe(before.length - 1);
  });
});
