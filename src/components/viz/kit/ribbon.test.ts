import { describe, it, expect } from 'vitest';
import { ribbonPath } from './ribbon';

describe('ribbonPath', () => {
  it('emits the sankey ribbon path: top bezier, right edge, bottom bezier, close', () => {
    // sx=220, tx=494 → c1 = 220 + 274*0.45 = 343.3, c2 = 220 + 274*0.55 = 370.70000000000005
    // (SankeyPanel's inline template does not round c1/c2 — this is byte-identical
    // to its current output, floating-point artifact and all.)
    expect(ribbonPath(220, 100, 494, 140, 20, 30)).toBe(
      'M 220 100 C 343.3 100 370.70000000000005 140 494 140 L 494 170 C 370.70000000000005 170 343.3 120 220 120 Z',
    );
  });
  it('is deterministic', () => {
    expect(ribbonPath(0, 0, 100, 50, 10, 10)).toBe(ribbonPath(0, 0, 100, 50, 10, 10));
  });
});
