import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EgressTrend } from './EgressTrend';
import { VIZ_HEX } from '../../components/viz/kit';

/** Parses the trailing y-coordinate out of an SVG path's `d` (an
 *  `M x y L x y ...` line, per computeTrendGeometry). */
const lastY = (d: string): number => {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)!;
  return Number(nums[nums.length - 1]);
};

describe('EgressTrend', () => {
  it('draws the two series on one shared y-scale, not each rescaled to its own max', () => {
    // A 2-point series (n floor 1 needs >=2 points to avoid the degenerate
    // single-point case). hyper is 10x actual, so on a shared scale the
    // hyper line sits near the top (small y) and the actual line sits far
    // below it (large y) - that gap IS the widening-gap story this chart
    // exists to tell.
    const { container } = render(<EgressTrend actual={[10, 10]} hyper={[100, 100]} />);
    const paths = [...container.querySelectorAll('path')];

    // The hyper line: stroke cobalt, no fill (the filled area path is a
    // separate <path> with fill and no stroke). VIZ_HEX entries are
    // `var(--viz-…, #hex)` strings now, so compare against the constant.
    const hyperLine = paths.find(p => p.getAttribute('stroke') === VIZ_HEX.cobalt);
    const actualLine = paths.find(p => p.getAttribute('stroke') === '#00a862');
    expect(hyperLine).toBeTruthy();
    expect(actualLine).toBeTruthy();

    const hyperY = lastY(hyperLine!.getAttribute('d')!);
    const actualY = lastY(actualLine!.getAttribute('d')!);

    // Were each series rescaled to its own max (the bug), both lines would
    // land at the same y - the top of their own range - and this chart
    // would never show a gap at all.
    expect(actualY).not.toBe(hyperY);
    expect(actualY).toBeGreaterThan(30);
    expect(actualY).toBeGreaterThan(hyperY);
  });
});
