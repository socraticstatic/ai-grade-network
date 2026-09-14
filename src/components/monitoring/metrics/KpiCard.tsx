interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  slaLabel: string;        // e.g. "SLA: <0.1%"
  status: 'healthy' | 'warning' | 'critical' | 'neutral';
  sparklineData: number[]; // last N values, length >= 2
  seriesColor: string;     // hex, e.g. chartColors.series.packetLoss
  isLive?: boolean;
}

const STATUS_DOT: Record<KpiCardProps['status'], string> = {
  healthy:  'bg-fw-success',
  warning:  'bg-amber-400',
  critical: 'bg-fw-error',
  neutral:  'bg-fw-bodyLight',
};

const STATUS_BORDER: Record<KpiCardProps['status'], string> = {
  healthy:  'border-fw-success',
  warning:  'border-amber-400',
  critical: 'border-fw-error',
  neutral:  'border-fw-secondary',
};

export function KpiCard({
  title,
  value,
  unit,
  slaLabel,
  status,
  sparklineData,
  seriesColor,
  isLive = true,
}: KpiCardProps) {
  const points = buildSparklinePoints(sparklineData);

  return (
    <div className={`bg-fw-base rounded-xl border-2 ${STATUS_BORDER[status]} p-4 flex flex-col gap-3`}>
      {/* Title row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-[0.08em]">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fw-link opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fw-link" />
            </span>
          )}
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-bold leading-none text-fw-heading tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-figma-sm font-medium text-fw-bodyLight">{unit}</span>
        )}
      </div>

      {/* SLA context */}
      <span className="text-[10px] text-fw-bodyLight">{slaLabel}</span>

      {/* Sparkline */}
      {sparklineData.length >= 2 && (
        <svg
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          className="w-full h-8"
          aria-hidden="true"
        >
          <polyline
            points={points}
            fill="none"
            stroke={seriesColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
}

function buildSparklinePoints(data: number[]): string {
  if (data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 30 - ((v - min) / range) * 26; // 2–28px range, leaving padding
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
