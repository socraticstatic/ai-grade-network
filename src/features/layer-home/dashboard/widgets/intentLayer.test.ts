import { describe, test, expect } from 'vitest';
import { AI_INTENT_KEYS, isAiIntent } from './intentLayer';
import { CC } from '../../../../engine';

describe('isAiIntent', () => {
  test('the four AI-and-workload intents are AI; a network intent is not', () => {
    expect(isAiIntent('private-inference')).toBe(true);
    expect(isAiIntent('cap-token-spend')).toBe(true);
    expect(isAiIntent('optimize-data-gravity')).toBe(true);
    expect(isAiIntent('ai-flow-prediction')).toBe(true);
    expect(isAiIntent('minimize-latency')).toBe(false);
  });

  // AI_INTENT_KEYS is a hardcoded list, kept in sync with the engine catalog's
  // own 'AI and workload' taxonomy tag (src/engine/state-intents.ts) by hand.
  // This test is the tripwire: a fifth catalog entry tagged 'AI and workload'
  // (or one of these four being retagged) fails this instead of silently
  // drifting the layer split.
  test('matches exactly the catalog entries tagged "AI and workload"', () => {
    const fromCatalog = CC.intentCatalog()
      .filter(e => e.taxonomy === 'AI and workload')
      .map(e => e.key)
      .sort();
    expect([...AI_INTENT_KEYS].sort()).toEqual(fromCatalog);
  });
});
