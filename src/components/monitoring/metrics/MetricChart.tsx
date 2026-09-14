import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { chartColors } from '../../../utils/chartColors';

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

interface ThresholdConfig {
  warning: number;
  critical: number;
}

interface MetricChartProps {
  data: MetricDataPoint[];
  title: string;
  unit: string;
  seriesColor: string;
  seriesType?: 'area' | 'line';
  thresholds?: ThresholdConfig;
  slaTarget?: number;
  syncId?: string;
  height?: number;
}

// Recharts v3 compatible tooltip component
function MetricTooltip({
  active,
  payload,
  unit,
  seriesColor,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { ts: number } }>;
  label?: string | number;
  unit: string;
  seriesColor: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const ts = new Date(point.payload.ts);

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
      <div style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
        {ts.toLocaleTimeString()}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block',
            height: 8,
            width: 8,
            borderRadius: '50%',
            backgroundColor: seriesColor,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#ffffff' }}>
          {Number(point.value).toFixed(3)} {unit}
        </span>
      </div>
    </div>
  );
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MetricChart({
  data,
  title,
  unit,
  seriesColor,
  seriesType = 'area',
  thresholds,
  slaTarget,
  syncId = 'netbond-metrics',
  height = 220,
}: MetricChartProps) {
  const formatted = data.map(d => ({
    ts: d.timestamp.getTime(),
    value: d.value,
  }));

  const values = data.map(d => d.value);
  const dataMax = values.length > 0 ? Math.max(...values) : 100;
  const yMax = thresholds
    ? Math.max(dataMax * 1.25, thresholds.critical * 1.3)
    : dataMax * 1.25;

  const lastPoint = formatted.length > 0 ? formatted[formatted.length - 1] : null;

  return (
    <div className="bg-fw-base rounded-xl border border-fw-secondary p-4">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-figma-sm font-semibold text-fw-heading">{title}</span>
        {lastPoint && (
          <span
            className="text-figma-sm font-bold tabular-nums"
            style={{ color: seriesColor }}
          >
            {lastPoint.value.toFixed(2)} {unit}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={formatted}
          syncId={syncId}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            stroke={chartColors.neutral}
            strokeWidth={1}
            vertical={false}
          />

          <XAxis
            dataKey="ts"
            type="number"
            domain={['dataMin', 'dataMax']}
            scale="time"
            tickFormatter={formatTimestamp}
            tickCount={6}
            tick={{ fontSize: 10, fill: chartColors.bodyLight }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            domain={[0, yMax]}
            tickFormatter={(v: number) => `${v}${unit}`}
            tick={{ fontSize: 10, fill: chartColors.bodyLight }}
            axisLine={false}
            tickLine={false}
            width={52}
          />

          <Tooltip
            content={<MetricTooltip unit={unit} seriesColor={seriesColor} />}
            wrapperStyle={{ outline: 'none' }}
          />

          {/* Warning threshold zone */}
          {thresholds && (
            <ReferenceArea
              y1={thresholds.warning}
              y2={thresholds.critical}
              fill={chartColors.threshold.warningFill}
              stroke={chartColors.threshold.warnStroke}
              strokeWidth={0.5}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          )}

          {/* Critical threshold zone */}
          {thresholds && (
            <ReferenceArea
              y1={thresholds.critical}
              y2={yMax}
              fill={chartColors.threshold.criticalFill}
              stroke={chartColors.threshold.criticalStroke}
              strokeWidth={0.5}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          )}

          {/* SLA target reference line */}
          {slaTarget !== undefined && (
            <ReferenceLine
              y={slaTarget}
              stroke={chartColors.bodyLight}
              strokeDasharray="6 3"
              strokeWidth={1}
              label={{
                value: 'SLA',
                position: 'insideTopRight',
                fontSize: 9,
                fill: chartColors.bodyLight,
              }}
            />
          )}

          {/* Series */}
          {seriesType === 'area' ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke={seriesColor}
              strokeWidth={2}
              fill={seriesColor}
              fillOpacity={0.08}
              dot={false}
              activeDot={{ r: 4, fill: seriesColor, stroke: '#fff', strokeWidth: 2 }}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke={seriesColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: seriesColor, stroke: '#fff', strokeWidth: 2 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
