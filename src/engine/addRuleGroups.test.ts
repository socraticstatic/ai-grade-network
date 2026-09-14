import { describe, it, expect } from 'vitest';
import { CC } from './index';

/* addRule previously guarded dst with `DSTS[dst]`. For a structured group
   destination ({group:'west-workloads'}) that stringifies to the key
   '[object Object]', which is not in DSTS, so the guard rejected every
   group-to-group rule outright - the matching engine (ruleMatch/dryRun,
   see groupRules.test.ts) already understood group rules, but nothing
   could ever persist one. These tests prove addRule now accepts a
   structured dst, keeps rejecting genuinely invalid input, and produces
   a readable fallback name instead of "[object Object]" / "undefined". */
describe('addRule - group-to-group rules', () => {
  it('accepts a group-to-group rule instead of returning null', () => {
    const r = CC.addRule({
      src: { group: 'west-branches' },
      dst: { group: 'west-workloads' },
      action: 'allow',
    });
    expect(r).not.toBeNull();
  });

  it('carries src.group and dst.group unchanged onto the stored rule', () => {
    const r = CC.addRule({
      src: { group: 'west-branches' },
      dst: { group: 'west-workloads' },
      action: 'allow',
    }) as { src: { group: string }; dst: { group: string } };
    expect(r.src.group).toBe('west-branches');
    expect(r.dst.group).toBe('west-workloads');
  });

  it('dry-runs the stored group rule against a non-empty set of real flows', () => {
    const r = CC.addRule({
      src: { group: 'west-branches' },
      dst: { group: 'west-workloads' },
      action: 'allow',
    });
    const result = CC.dryRun(r) as { matched: unknown[] };
    expect(result.matched.length).toBeGreaterThan(0);
  });

  it('still rejects an unknown string dst', () => {
    const r = CC.addRule({ src: { tag: 'any' }, dst: 'not-a-real-destination', action: 'deny' });
    expect(r).toBeNull();
  });

  it('rejects a structured dst naming a group that does not exist', () => {
    const r = CC.addRule({ src: { tag: 'any' }, dst: { group: 'no-such-group' }, action: 'deny' });
    expect(r).toBeNull();
  });

  it('generates a fallback name with no [object Object] and no undefined', () => {
    const r = CC.addRule({
      src: { group: 'west-branches' },
      dst: { group: 'west-workloads' },
      action: 'allow',
    }) as { name: string };
    expect(r.name).not.toMatch(/\[object Object\]/);
    expect(r.name).not.toMatch(/undefined/);
  });
});
