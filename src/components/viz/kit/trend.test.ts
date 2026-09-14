import { describe, it, expect } from 'vitest';
import { computeTrendGeometry } from './trend';

describe('computeTrendGeometry', () => {
  it('maps points across the full width and values to inverted y', () => {
    const g = computeTrendGeometry([0, 5, 10], 100, 40);
    expect(g.x(0)).toBe(0);
    expect(g.x(2)).toBe(100);
    expect(g.y(10)).toBe(2);   // max value → top pad (2)
    expect(g.y(0)).toBe(38);   // zero → baseline (h - 2)
  });
  it('line visits every point; area closes to the baseline', () => {
    const g = computeTrendGeometry([0, 10], 100, 40);
    expect(g.line).toBe('M 0 38 L 100 2');
    expect(g.area).toBe('M 0 38 L 100 2 L 100 38 L 0 38 Z');
  });
  it('a flat all-zero series stays on the baseline without dividing by zero', () => {
    const g = computeTrendGeometry([0, 0, 0], 90, 40);
    expect(g.line).toBe('M 0 38 L 45 38 L 90 38');
  });
  it('opts.max scales against a shared ceiling instead of the series own max', () => {
    const g = computeTrendGeometry([0, 50], 100, 40, { max: 100 });
    expect(g.line).toBe('M 0 38 L 100 20');
  });
});
