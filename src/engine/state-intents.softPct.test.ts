import { describe, test, expect, afterEach } from 'vitest';
import { CC } from '../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

/** Drive a tag's meter to a known percentage by setting its budget. */
function pctFor(tag: string): number {
  const m = (CC.tokenMeterList() as { tag: string; pct: number }[]).find(x => x.tag === tag)!;
  return m.pct;
}

/*
 * setTokenPolicy shallow-merges into the LIVE policy object and never pushes
 * its own undo entry. declareIntent DOES push one, but it snapshots state
 * AFTER the policy patch above already ran - so the undo loop's restore()
 * later re-merges that same patched policy right back onto the live
 * object. Undoing "declare intent" therefore cannot revert a budget or
 * softPct set earlier in the same test; it reapplies it.
 *
 * So the tag's original policy is captured before the patch and reapplied
 * in a SECOND afterEach, registered after the undo-loop one above (vitest
 * runs afterEach hooks in registration order), so this restore always runs
 * last and genuinely wins regardless of what undo() just did.
 */
let pendingPolicyRestore: { tag: string; original: Record<string, unknown> } | null = null;
afterEach(() => {
  if (!pendingPolicyRestore) return;
  const { tag, original } = pendingPolicyRestore;
  const live = CC.tokenPolicy!(tag) as Record<string, unknown>;
  Object.keys(live).forEach(k => { delete live[k]; });
  Object.assign(live, original);
  pendingPolicyRestore = null;
});

function withRestoredPolicy(tag: string, run: () => void) {
  pendingPolicyRestore = { tag, original: { ...(CC.tokenPolicy!(tag) as Record<string, unknown>) } };
  run();
}

describe('cap-token-spend soft threshold', () => {
  test('a policy without softPct still drifts at 80', () => {
    const tag = (CC.tokenMeterList() as { tag: string }[])[0].tag;
    withRestoredPolicy(tag, () => {
      // The seeded estate metes nothing until an endpoint goes live, so
      // `today` starts at 0 for every tag - dividing by any ratio still
      // yields a 0 budget and a NaN pct. Meter real spend first so the
      // budget math below lands on an actual percentage.
      CC.meterTokens(tag, 500_000);
      const meter = (CC.tokenMeterList() as { tag: string; today: number }[]).find(m => m.tag === tag)!;
      // Budget chosen so today/budget lands between 80% and 99%.
      CC.setTokenPolicy(tag, { budget: Math.ceil(meter.today / 0.85) });
      expect(pctFor(tag)).toBeGreaterThanOrEqual(80);
      expect(pctFor(tag)).toBeLessThan(100);
      const entry = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
      const scope = entry.scopes().find((s: { id: string }) => s.id === tag)!;
      const declared = CC.declareIntent('cap-token-spend', scope, 'watch')!;
      const reading = CC.intentList().find(i => i.id === declared.id)!.reading;
      expect(reading.status).toBe('drifting');
      CC.removeIntent(declared.id);
    });
  });

  test('softPct moves the drift line', () => {
    const tag = (CC.tokenMeterList() as { tag: string }[])[0].tag;
    withRestoredPolicy(tag, () => {
      CC.meterTokens(tag, 500_000);
      const meter = (CC.tokenMeterList() as { tag: string; today: number }[]).find(m => m.tag === tag)!;
      // Land around 50%: below the default 80, at or above a softPct of 40.
      CC.setTokenPolicy(tag, { budget: Math.ceil(meter.today / 0.5), softPct: 40 });
      expect(pctFor(tag)).toBeLessThan(80);
      const entry = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
      const scope = entry.scopes().find((s: { id: string }) => s.id === tag)!;
      const declared = CC.declareIntent('cap-token-spend', scope, 'watch')!;
      expect(CC.intentList().find(i => i.id === declared.id)!.reading.status).toBe('drifting');
      CC.removeIntent(declared.id);
    });
  });
});
