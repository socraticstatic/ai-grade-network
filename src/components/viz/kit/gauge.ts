/**
 * Pure geometry for the two shapes a board needs and VizKit did not have:
 * a share ring (one figure against its whole) and a split bar (a total
 * broken into parts that sum to it).
 *
 * Geometry only, no React and no color - the same separation `trend.ts` and
 * `ribbon.ts` already keep, so the arithmetic is unit-testable and a
 * component decides what any of it means.
 */

const r1 = (n: number) => Math.round(n * 10) / 10;

/** A point on a circle, in SVG coordinates (12 o'clock = 0deg, clockwise). */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [r1(cx + r * Math.cos(rad)), r1(cy + r * Math.sin(rad))];
}

/**
 * An arc path for `share` (0..1) of a ring.
 *
 * Returns null at share <= 0 - a zero-length arc still paints a round line
 * cap, which reads as a small filled dot claiming progress that has not
 * happened. Callers render the track and skip the value arc.
 */
export function arcPath(cx: number, cy: number, r: number, share: number): string | null {
  const s = Math.max(0, Math.min(1, share));
  if (s <= 0) return null;
  // A full circle cannot be drawn as one arc (start == end): split in two.
  if (s >= 1) {
    const [sx, sy] = polar(cx, cy, r, 0);
    const [mx, my] = polar(cx, cy, r, 180);
    return `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${mx} ${my} A ${r} ${r} 0 0 1 ${sx} ${sy}`;
  }
  const end = s * 360;
  const [sx, sy] = polar(cx, cy, r, 0);
  const [ex, ey] = polar(cx, cy, r, end);
  return `M ${sx} ${sy} A ${r} ${r} 0 ${end > 180 ? 1 : 0} 1 ${ex} ${ey}`;
}

export interface Segment {
  key: string;
  value: number;
}

export interface LaidOutSegment extends Segment {
  /** Share of the total, 0..1. */
  share: number;
  /** Left edge as a percentage of the bar, for CSS width/left. */
  offsetPct: number;
  widthPct: number;
}

/**
 * Lay segments along a 100% bar in the order given.
 *
 * Zero-value segments are dropped rather than rendered at 0% - a segment
 * too thin to see is a segment a viewer cannot ask about, and leaving it in
 * makes the legend claim a band that isn't visible. An all-zero input
 * returns an empty array, which callers render as their own empty state.
 */
export function layoutSegments(segments: Segment[]): LaidOutSegment[] {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  if (total <= 0) return [];
  let offset = 0;
  return segments
    .filter(s => s.value > 0)
    .map(s => {
      const share = s.value / total;
      const out = { ...s, share, offsetPct: r1(offset * 100), widthPct: r1(share * 100) };
      offset += share;
      return out;
    });
}
