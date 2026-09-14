import { describe, it, expect } from 'vitest';
import { CC } from './index';

/**
 * The three example policies from the requirements doc must be present as
 * first-class, enforceable rules in the engine — visible in ruleList() and
 * enforceable through the same enforceRule path the seed rules use.
 */
describe('requirements-doc example policies', () => {
  it('exposes all three example policies in the rule list', () => {
    const rules = CC.ruleList() as { id: string; name: string }[];
    const ids = rules.map(r => r.id);
    expect(ids).toContain('pol-pci');
    expect(ids).toContain('pol-internet-facing');
    expect(ids).toContain('pol-branch-finance');

    const names = rules.map(r => r.name.toLowerCase()).join(' | ');
    expect(names).toContain('pci');
    expect(names).toContain('internet-facing');
    expect(names).toContain('finance');
  });

  // NOTE: tests in a file share one engine module (window.CC singleton). This
  // assertion must run BEFORE the enforce test below, which drains the three
  // violations permanently.
  it('surfaces each example policy violation in the global violation list until enforced', () => {
    const openIds = (CC.violations() as { policy?: string }[]).map(v => v.policy);
    expect(openIds).toContain('pol-pci');
    expect(openIds).toContain('pol-internet-facing');
    expect(openIds).toContain('pol-branch-finance');
  });

  it('each example policy matches ≥1 workload with ≥1 live violation, then enforces and clears it', () => {
    type Ev = { matched: unknown[]; violations: unknown[] };
    for (const id of ['pol-pci', 'pol-internet-facing', 'pol-branch-finance']) {
      const rule = (CC.ruleList() as { id: string }[]).find(r => r.id === id)!;
      expect(CC.ruleEnforced(rule)).toBe(false);

      // unenforced: real seeded workloads carry the tag and are in violation
      const before = CC.evalExample(rule) as Ev;
      expect(before.matched.length).toBeGreaterThanOrEqual(1);
      expect(before.violations.length).toBeGreaterThanOrEqual(1);

      // enforcing flips ruleEnforced and drains the violation to zero
      expect(CC.enforceRule(id)).toBe(true);
      const after = (CC.ruleList() as { id: string }[]).find(r => r.id === id)!;
      expect(CC.ruleEnforced(after)).toBe(true);
      expect((CC.evalExample(after) as Ev).violations.length).toBe(0);
    }
  });

  it('the internet-facing example names the Palo Alto NGFW in its chain', () => {
    const rule = (CC.ruleList() as { id: string; chain: string[] }[]).find(
      r => r.id === 'pol-internet-facing'
    )!;
    expect(rule.chain.join(' ')).toMatch(/palo alto/i);
  });
});
