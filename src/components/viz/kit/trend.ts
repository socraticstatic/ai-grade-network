const PAD = 2;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Pure trend geometry: values → an SVG polyline and its closed area.
 *  Deterministic; max value touches the top pad, zero sits on the baseline.
 *  Pass `opts.max` to scale against a shared ceiling (e.g. two series on one
 *  y-axis) instead of each call re-deriving its own max from its own values. */
export function computeTrendGeometry(values: number[], w: number, h: number, opts?: { max?: number }) {
  const max = opts?.max ?? Math.max(...values, 1);
  const n = Math.max(values.length - 1, 1);
  const x = (i: number) => r1((i / n) * w);
  const y = (v: number) => r1(h - PAD - (v / max) * (h - PAD * 2));
  const pts = values.map((v, i) => `${x(i)} ${y(v)}`);
  const line = `M ${pts[0]}${pts.slice(1).map(p => ` L ${p}`).join('')}`;
  const area = `${line} L ${x(values.length - 1)} ${h - PAD} L ${x(0)} ${h - PAD} Z`;
  return { line, area, x, y };
}
