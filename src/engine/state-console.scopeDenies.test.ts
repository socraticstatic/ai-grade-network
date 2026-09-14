import { describe, test, expect } from 'vitest';
import { CC } from '../engine';

describe('CC.scopeDenies', () => {
  test('names the two scopes that deny an external model', () => {
    expect(CC.scopeDenies('no-external', 'gpt-class')).toMatch(/no external models/i);
    expect(CC.scopeDenies('self-hosted', 'gpt-class')).toMatch(/self-hosted/i);
  });

  test('the descriptive scopes deny nothing', () => {
    expect(CC.scopeDenies('external-allowed', 'gpt-class')).toBeNull();
    expect(CC.scopeDenies('private-only', 'gpt-class')).toBeNull();
  });

  test('a self-hosted model is never denied by scope', () => {
    for (const s of ['no-external', 'self-hosted', 'external-allowed', 'private-only']) {
      expect(CC.scopeDenies(s, 'helion-70b')).toBeNull();
    }
  });

  /* The contract that makes the preview honest: whatever this predicate says,
     promptTrace must actually do. Run the real trace and compare. */
  test('agrees with what promptTrace really decides', () => {
    const before = CC.tokenPolicy('shared-services');
    const prevScope = before ? before.scope : 'external-allowed';
    try {
      CC.setTokenPolicy('shared-services', { scope: 'no-external' });
      const predicted = CC.scopeDenies('no-external', 'gpt-class');
      const trace = CC.promptTrace('shared-services', 'gpt-class', 'probe') as { blocked: boolean };
      expect(!!predicted).toBe(trace.blocked);
    } finally {
      CC.setTokenPolicy('shared-services', { scope: prevScope });
    }
  });
});
