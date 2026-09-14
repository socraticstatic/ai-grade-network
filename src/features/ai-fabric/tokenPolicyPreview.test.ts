import { describe, test, expect, afterEach } from 'vitest';
import { tokenPolicyPreview, type TokenPolicySpec } from './tokenPolicyPreview';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

const meteredTag = () => (CC.tokenMeterList() as { tag: string }[])[0].tag;

const specFor = (tag: string, over: Partial<TokenPolicySpec> = {}): TokenPolicySpec => ({
  tag, scope: 'external-allowed', budget: 1_000_000, softPct: 80,
  guardrail: false, enforced: false, ...over,
});

describe('tokenPolicyPreview', () => {
  test('states the live meter and where the proposed budget would put it', () => {
    const tag = meteredTag();
    const m = (CC.tokenMeterList() as { tag: string; today: number; pct: number; budget: number }[])
      .find(x => x.tag === tag)!;
    const half = Math.max(1, Math.floor(m.today / 2));
    const p = tokenPolicyPreview(CC, specFor(tag, { budget: half }));
    expect(p.meter).not.toBeNull();
    expect(p.meter!.today).toBe(m.today);
    // today over half of today is ~200%.
    expect(p.proposedPct).toBe(Math.round((m.today / half) * 100));
    expect(p.unmetered).toBe(false);
  });

  test('replays the decision log against the proposed scope, agreeing with the engine', () => {
    const tag = meteredTag();
    // The decision log starts empty for this tag on a fresh estate (no
    // agent ticker runs under test) - a bare replay would compare 0 to 0,
    // which proves nothing about the replay actually calling the engine's
    // predicate. Seed two real, traced requests for this tag so the log
    // holds both a model the proposed scope denies (gpt-class, under
    // 'self-hosted') and one it does not (helion-70b), making the count
    // meaningfully distinguish the two.
    CC.promptTrace(tag, 'gpt-class', 'tokenPolicyPreview test probe');
    CC.promptTrace(tag, 'helion-70b', 'tokenPolicyPreview test probe');

    const log = CC.decisionLog() as { tag: string | null; modelId: string | null }[];
    const expected = log.filter(d => d.tag === tag && !!CC.scopeDenies('self-hosted', d.modelId ?? '')).length;
    const p = tokenPolicyPreview(CC, specFor(tag, { scope: 'self-hosted' }));
    expect(p.wouldDeny.count).toBe(expected);
    expect(p.wouldDeny.count).toBeGreaterThan(0);
    expect(p.wouldDeny.count).toBeLessThan(log.filter(d => d.tag === tag).length);
    expect(p.wouldDeny.total).toBe(log.filter(d => d.tag === tag).length);
  });

  test('a permissive scope denies nothing', () => {
    const p = tokenPolicyPreview(CC, specFor(meteredTag(), { scope: 'external-allowed' }));
    expect(p.wouldDeny.count).toBe(0);
  });

  test('names the agents the policy binds', () => {
    const agents = (CC.agentList() as { name: string; app: string }[]);
    const tag = agents[0].app;
    const p = tokenPolicyPreview(CC, specFor(tag));
    expect(p.boundAgents).toEqual(agents.filter(a => a.app === tag).map(a => a.name));
  });

  test('capIntentEnforced is false until an enforce-mode cap intent covers the tag', () => {
    const tag = meteredTag();
    expect(tokenPolicyPreview(CC, specFor(tag)).capIntentEnforced).toBe(false);
    const entry = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
    const scope = entry.scopes().find((s: { id: string }) => s.id === tag)!;
    const declared = CC.declareIntent('cap-token-spend', scope, 'enforce')!;
    expect(tokenPolicyPreview(CC, specFor(tag)).capIntentEnforced).toBe(true);
    CC.removeIntent(declared.id);
  });

  test('a group-scoped identity is reported unmetered rather than shown at zero', () => {
    const p = tokenPolicyPreview(CC, specFor('west-workloads', { group: 'west-workloads' }));
    expect(p.unmetered).toBe(true);
    expect(p.meter).toBeNull();
    expect(p.proposedPct).toBeNull();
  });
});
