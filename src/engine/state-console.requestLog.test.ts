import { describe, it, expect } from 'vitest';
import { CC } from './index';

/* The decision log used to record only {ts, allowed, guarded} — the verdict
   without the request it judged. promptTrace() holds every fact at the moment
   of the request (identity, model, tokens, the path the trace itself printed),
   so recording them is bookkeeping, not invention. The Insights requests table
   reads these fields; a log entry without them cannot render a row. */
describe('decisionLog request detail', () => {
  it('an allowed trace records tag, model, tokens, ttft and path', () => {
    const before = CC.decisionLog().length;
    CC.promptTrace('rd-helion', 'helion-70b', 'unit test prompt');
    const d = CC.decisionLog()[before] as {
      allowed: boolean; tag: string; modelId: string; tokens: number;
      ttftMs: number; path: string; reason: string | null;
    };
    expect(d.allowed).toBe(true);
    expect(d.tag).toBe('rd-helion');
    expect(d.modelId).toBe('helion-70b');
    expect(d.tokens).toBeGreaterThan(0);
    expect(d.ttftMs).toBeGreaterThan(0);
    expect(['private', 'governed egress', 'public']).toContain(d.path);
    expect(d.reason).toBeNull();
  });

  it('a denied trace records the denial reason and zero tokens', () => {
    const before = CC.decisionLog().length;
    // classified-helion is scope no-external; gpt-class is the external model.
    CC.promptTrace('classified-helion', 'gpt-class', 'unit test prompt');
    const d = CC.decisionLog()[before] as {
      allowed: boolean; tokens: number; reason: string | null;
    };
    expect(d.allowed).toBe(false);
    expect(d.tokens).toBe(0);
    expect(d.reason).toMatch(/no external/i);
  });
});
