import { useMemo } from 'react';
import { VIZ_HEX } from './palette';
import { computeTrendGeometry } from './trend';

const VIEW_W = 600;
const VIEW_H = 40;

/** The series band: one cobalt area with a line edge, time left→right.
 *  When a cursor index is set (the time machine), a marker dot and a
 *  hairline mark the instant; reviewing dims the band, not the marker. */
export function TrendBand({
  series,
  cursor = null,
  reviewing = false,
}: {
  series: { t: string; v: number }[];
  cursor?: number | null;
  reviewing?: boolean;
}) {
  const g = useMemo(() => computeTrendGeometry(series.map(p => p.v), VIEW_W, VIEW_H), [series]);
  const at = cursor != null && cursor >= 0 && cursor < series.length ? cursor : null;
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} data-testid="trend-band" className="w-full h-24" role="img" aria-label="Flow over the window">
      <path d={g.area} fill={VIZ_HEX.cobalt} fillOpacity={reviewing ? 0.06 : 0.1} />
      <path d={g.line} fill="none" stroke={VIZ_HEX.cobalt} strokeWidth={1.5} strokeOpacity={reviewing ? 0.5 : 1} />
      {at != null && (
        <g data-testid="trend-cursor">
          <line x1={g.x(at)} y1={0} x2={g.x(at)} y2={VIEW_H} stroke={VIZ_HEX.skyCursor} strokeWidth={1} />
          <circle cx={g.x(at)} cy={g.y(series[at].v)} r={3} fill={VIZ_HEX.skyCursor} />
        </g>
      )}
    </svg>
  );
}
