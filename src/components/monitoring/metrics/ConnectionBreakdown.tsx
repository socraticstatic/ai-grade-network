import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from 'recharts';
import { chartColors } from '../../../utils/chartColors';
import type { Connection } from '../../../types/connection';
import { buildLegMetricRows, type LegMetricRow } from './legMetricRows';

const WARNING_MS  = 50;
const CRITICAL_MS = 100;

const BAR_COLOR = {
  healthy:  '#009E73', // Okabe-Ito Bluish Green
  warning:  '#E69F00', // Okabe-Ito Orange
  critical: '#D55E00', // Okabe-Ito Vermillion
} as const;

type Status = keyof typeof BAR_COLOR;

interface ConnectionPoint {
  connectionName: string; // used by YAxis dataKey — avoid 'label' (Recharts reserved)
  latency: number;
  status: Status;
}

/** Deterministic pseudo-random (FNV-1a) — stable across renders, no Date dependency. */
function pseudoRand(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff; // always in [0, 1]
}

function shorten(name: string): string {
  return name
    .replace(/NetBond\s+Max\s*[—–\-]\s*/i, '')
    .replace(/AWS\s+Max\s*[—–\-]\s*/i, 'AWS ')
    .replace(/AWS\s+Interconnect\s*[—–\-]\s*/i, 'AWS IC ')
    .replace(/\s+\d{1,2}:\d{2}\s*[AP]M\b/gi, '')  // strip any trailing timestamps
    .trim()
    .slice(0, 22);
}

/** Generates per-row latency. A C2C connection contributes one row per leg, so
 *  each cloud's latency is shown separately. A leg that is not Active is flagged
 *  critical regardless of latency. Slots 4 and 7 are deliberately degraded so the
 *  green/amber/red legend is exercised. */
function generateConnectionData(rows: LegMetricRow[]): ConnectionPoint[] {
  return rows.map((row, i) => {
    const r = pseudoRand(row.id);
    const latency =
      i === 4 ? 55 + r * 18   // warning zone: 55–73 ms
    : i === 7 ? 108 + r * 22  // critical zone: 108–130 ms
    : 4 + r * 17;              // healthy:         4–21 ms

    const latencyStatus: Status =
      latency >= CRITICAL_MS ? 'critical'
    : latency >= WARNING_MS  ? 'warning'
    : 'healthy';

    // A non-active leg is a problem regardless of latency.
    const status: Status = row.status !== 'Active' ? 'critical' : latencyStatus;

    return { connectionName: shorten(row.label), latency, status };
  });
}

// Custom bar tooltip — avoids Recharts wrapper color bleed
function BreakdownTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ConnectionPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const { connectionName, latency, status } = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: '#1d2329',
        color: '#ffffff',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 11,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>{connectionName}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block',
            height: 8,
            width: 8,
            borderRadius: 2,
            backgroundColor: BAR_COLOR[status],
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 700, color: '#ffffff' }}>
          {latency.toFixed(1)} ms
        </span>
      </div>
    </div>
  );
}

interface ConnectionBreakdownProps {
  connections: Connection[];
}

export function ConnectionBreakdown({ connections }: ConnectionBreakdownProps) {
  const data = generateConnectionData(buildLegMetricRows(connections));
  const chartHeight = Math.max(180, data.length * 26 + 24);

  return (
    <div className="bg-fw-base rounded-xl border border-fw-secondary p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-figma-sm font-semibold text-fw-heading">
          Per-Connection Latency
        </span>
        <div className="flex items-center gap-4 text-[10px] text-fw-bodyLight">
          {(['healthy', 'warning', 'critical'] as Status[]).map(s => (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: BAR_COLOR[s] }}
              />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke={chartColors.neutral}
            strokeWidth={1}
          />

          <XAxis
            type="number"
            domain={[0, 135]}
            tickFormatter={(v: number) => `${v}ms`}
            tick={{ fontSize: 10, fill: chartColors.bodyLight }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 25, 50, 75, 100, 125]}
          />

          <YAxis
            type="category"
            dataKey="connectionName"
            width={128}
            tick={{ fontSize: 10, fill: chartColors.bodyLight }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            content={<BreakdownTooltip />}
            wrapperStyle={{ outline: 'none' }}
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          />

          {/* Warning threshold */}
          <ReferenceLine
            x={WARNING_MS}
            stroke={BAR_COLOR.warning}
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{
              value: 'Warn',
              position: 'insideTopRight',
              fontSize: 9,
              fill: BAR_COLOR.warning,
              dy: -4,
            }}
          />

          {/* Critical threshold */}
          <ReferenceLine
            x={CRITICAL_MS}
            stroke={BAR_COLOR.critical}
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{
              value: 'Crit',
              position: 'insideTopRight',
              fontSize: 9,
              fill: BAR_COLOR.critical,
              dy: -4,
            }}
          />

          <Bar dataKey="latency" barSize={10} radius={[0, 2, 2, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={BAR_COLOR[entry.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

    </div>
  );
}
