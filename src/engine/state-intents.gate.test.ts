import { describe, it, expect, beforeAll } from 'vitest';
import { CC } from './index';

/**
 * The budget gate and the share payload, on a fresh engine instance (vitest
 * isolates per file). Order matters: watch-mode counting is asserted before
 * enforce-mode denial, because the gate mutates nothing but the log.
 */

(CC.agentList() as { id: string; enabled: boolean }[])
  .filter(a => a.enabled)
  .forEach(a => CC.toggleAgent(a.id));

const TAG = 'rd-helion';
const MODEL = 'helion-70b';

function exhaustBudget() {
  const meter = () => (CC.tokenMeterList() as { tag: string; pct: number; budget: number }[])
    .find(m => m.tag === TAG)!;
  // meterTokens is exactly what a traced request does; drive it past the ceiling.
  while (meter().pct < 100) CC.meterTokens(TAG, meter().budget);
  return meter();
}

describe('the budget gate', () => {
  beforeAll(() => {
    exhaustBudget();
  });

  it('an exhausted budget alone does NOT deny - the gate needs the enforced policy AND the intent', () => {
    const res = CC.promptTrace!(TAG, MODEL, 'gate test, no intent');
    expect(res.blocked).toBe(false);
  });

  it('a watch-mode cap counts what enforce would have denied, and still denies nothing', () => {
    const scope = { kind: 'identity' as const, id: TAG, label: TAG };
    const declared = CC.declareIntent('cap-token-spend', scope, 'watch')!;
    const res = CC.promptTrace!(TAG, MODEL, 'gate test, watch mode');
    expect(res.blocked).toBe(false);

    const reading = CC.intentList().find(x => x.id === declared.id)!.reading;
    expect(reading.status).toBe('violated');
    expect(reading.watch).not.toBeNull();
    expect(reading.watch!.events).toBeGreaterThan(0);
    expect(reading.watch!.note).toMatch(/would have denied/);
    CC.removeIntent(declared.id);
  });

  it('enforce mode denies with the exact reason, meters nothing, and undo reopens the gate', () => {
    const scope = { kind: 'identity' as const, id: TAG, label: TAG };
    const before = (CC.tokenMeterList() as { tag: string; today: number }[]).find(m => m.tag === TAG)!.today;

    CC.declareIntent('cap-token-spend', scope, 'enforce')!;
    const res = CC.promptTrace!(TAG, MODEL, 'gate test, enforce mode');
    expect(res.blocked).toBe(true);

    const d = CC.decisionLog!().slice(-1)[0];
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe(`${TAG}: token budget exhausted — request DENIED`);
    expect(d.tokens).toBe(0);
    const after = (CC.tokenMeterList() as { tag: string; today: number }[]).find(m => m.tag === TAG)!.today;
    expect(after, 'a denied request must meter nothing').toBe(before);

    CC.undo(); // the declaration (and its standing control)
    expect(CC.intentList()).toHaveLength(0);
    expect(CC.promptTrace!(TAG, MODEL, 'gate reopened').blocked).toBe(false);
  });
});

describe('intents ride the share payload', () => {
  it('a declared intent travels, re-declares silently on apply, and re-evaluates locally', () => {
    const scope = { kind: 'estate' as const, id: 'ai', label: 'The token layer' };
    CC.declareIntent('private-inference', scope, 'watch')!;

    const s = CC.serialize();
    expect(s.length).toBeGreaterThan(0);

    // Simulate the recipient: drop the local declaration, then apply the payload.
    const id = CC.intentList()[0].id;
    CC.removeIntent(id);
    expect(CC.intentList()).toHaveLength(0);

    expect(CC.applyShareData(s)).not.toBe(false);
    const arrived = CC.intentList();
    expect(arrived).toHaveLength(1);
    expect(arrived[0].key).toBe('private-inference');
    expect(arrived[0].mode).toBe('watch');
    // The status is the RECIPIENT's derivation, not a carried flag.
    expect(['aligned', 'drifting', 'violated']).toContain(arrived[0].reading.status);
  });

  it('proposal moves round-trip the new kinds and drop malformed entries', () => {
    const url = CC.proposalUrl([
      { kind: 'fix', fixKey: 'dnsFirewall' },
      { kind: 'policy', tag: 'rd-helion', patch: { guardrail: true } },
      { kind: 'enforce', ruleId: 'pol-insp' },
    ] as never);
    const raw = new URL(url).searchParams.get('s')!;
    expect(CC.applyShareData(raw)).not.toBe(false);
    const staged = CC.takeProposal() as { kind: string }[];
    expect(staged.map(m => m.kind).sort()).toEqual(['enforce', 'fix', 'policy']);
    expect(CC.takeProposal(), 'read-once').toBeNull();
  });
});
