import { useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface TrafficChartProps {
  /** Seeds the mock series so each connection's chart is stable across renders. */
  connectionId: string;
  /** Committed bandwidth in Mbps — scales the series so traffic sits under the ceiling. */
  bandwidthMbps: number;
}

const POINTS = 48; // 24h at 30-minute samples
const W = 720;
const H = 180;
const PAD_L = 46;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 22;

function seededSeries(seed: string, scale: number, phase: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let s = h >>> 0;
  const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const base = 0.35 + rand() * 0.25;
  const out: number[] = [];
  for (let i = 0; i < POINTS; i++) {
    const daily = Math.sin(((i / POINTS) * 2 - 0.5 + phase) * Math.PI) * 0.22; // business-hours swell
    const noise = (rand() - 0.5) * 0.12;
    out.push(Math.max(0.02, base + daily + noise) * scale);
  }
  return out;
}

function fmtMbps(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} Gbps` : `${Math.round(v)} Mbps`;
}

function fmtGb(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} TB` : `${Math.round(v)} GB`;
}

function timeLabel(index: number): string {
  const hoursAgo = ((POINTS - 1 - index) / POINTS) * 24;
  if (hoursAgo < 0.5) return 'Now';
  return `${Math.round(hoursAgo)}h ago`;
}

/**
 * Bits in / bits out over the last 24 hours. Drag a box across the chart to zoom into
 * that window; Reset (or double-click) zooms back out. The Cumulative view keeps a
 * running level of data transferred instead of the instantaneous rate.
 */
export function TrafficChart({ connectionId, bandwidthMbps }: TrafficChartProps) {
  const [mode, setMode] = useState<'rate' | 'cumulative'>('rate');
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { inRate, outRate } = useMemo(() => ({
    inRate: seededSeries(`${connectionId}:in`, bandwidthMbps, 0),
    outRate: seededSeries(`${connectionId}:out`, bandwidthMbps * 0.6, 0.15),
  }), [connectionId, bandwidthMbps]);

  // Cumulative: GB transferred since window start (Mbps × 1800s ÷ 8 ÷ 1000 = GB per sample)
  const toCumulative = (rates: number[]) => {
    let sum = 0;
    return rates.map((r) => (sum += (r * 1800) / 8 / 1000));
  };

  const [lo, hi] = zoom ?? [0, POINTS - 1];
  const slice = (arr: number[]) => arr.slice(lo, hi + 1);
  const inData = slice(mode === 'rate' ? inRate : toCumulative(inRate));
  const outData = slice(mode === 'rate' ? outRate : toCumulative(outRate));
  const yMax = Math.max(...inData, ...outData) * 1.15;
  const n = inData.length;

  const x = (i: number) => PAD_L + (i / Math.max(1, n - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - v / yMax) * (H - PAD_T - PAD_B);
  const path = (data: number[]) => data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = (data: number[]) => `${path(data)} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

  const pxToIndex = (clientX: number): number => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const px = ((clientX - rect.left) / rect.width) * W;
    const frac = (px - PAD_L) / (W - PAD_L - PAD_R);
    return Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
  };

  const onMouseDown = (e: React.MouseEvent) => { const i = pxToIndex(e.clientX); setDrag([i, i]); };
  const onMouseMove = (e: React.MouseEvent) => { if (drag) setDrag([drag[0], pxToIndex(e.clientX)]); };
  const onMouseUp = () => {
    if (drag) {
      const [a, b] = [Math.min(...drag), Math.max(...drag)];
      if (b - a >= 2) setZoom([lo + a, lo + b]);
      setDrag(null);
    }
  };

  const fmt = mode === 'rate' ? fmtMbps : fmtGb;
  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => yMax * f);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h3 className="text-figma-base font-bold text-fw-heading">Traffic</h3>
          <span className="inline-flex items-center gap-1.5 text-figma-xs text-fw-body">
            <span className="h-1.5 w-1.5 rounded-full bg-fw-link shrink-0" /> In · {fmt(inData[n - 1])}
          </span>
          <span className="inline-flex items-center gap-1.5 text-figma-xs text-fw-body">
            <span className="h-1.5 w-1.5 rounded-full bg-fw-success shrink-0" /> Out · {fmt(outData[n - 1])}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {zoom && (
            <button
              onClick={() => setZoom(null)}
              className="inline-flex items-center gap-1 text-figma-xs font-medium text-fw-link hover:underline no-rounded"
            >
              <RotateCcw className="h-3 w-3" /> Reset zoom
            </button>
          )}
          <nav className="flex items-center gap-3 border-b border-transparent">
            {(['rate', 'cumulative'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`pb-1 text-figma-xs font-medium border-b-2 transition-colors no-rounded ${
                  mode === m ? 'border-fw-link text-fw-heading' : 'border-transparent text-fw-bodyLight hover:text-fw-body'
                }`}
              >
                {m === 'rate' ? 'Bits in/out' : 'Cumulative'}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => setDrag(null)}
        onDoubleClick={() => setZoom(null)}
      >
        {gridLines.map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-fw-secondary/60" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(v) + 3} textAnchor="end" className="fill-current text-fw-bodyLight" fontSize="9">
              {fmt(v)}
            </text>
          </g>
        ))}
        <path d={area(inData)} fill="#0057b8" opacity="0.10" />
        <path d={area(outData)} fill="#2d7e24" opacity="0.10" />
        <path d={path(inData)} fill="none" stroke="#0057b8" strokeWidth="1.8" />
        <path d={path(outData)} fill="none" stroke="#2d7e24" strokeWidth="1.8" />
        {drag && (
          <rect
            x={Math.min(x(drag[0]), x(drag[1]))}
            y={PAD_T}
            width={Math.abs(x(drag[1]) - x(drag[0]))}
            height={H - PAD_T - PAD_B}
            fill="#0057b8"
            opacity="0.12"
            stroke="#0057b8"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        )}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="fill-current text-fw-bodyLight" fontSize="9">
            {timeLabel(lo + i)}
          </text>
        ))}
      </svg>

      <p className="text-figma-xs text-fw-bodyLight mt-1">
        Last 24 hours. Drag across the chart to zoom into a window
        {mode === 'cumulative' ? ' — the level keeps counting from the window start.' : '.'}
      </p>
    </div>
  );
}
