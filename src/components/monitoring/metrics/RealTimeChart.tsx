import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RefreshCw } from 'lucide-react';
import { chartColors } from '../../../utils/chartColors';

interface DataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

interface RealTimeChartProps {
  data: DataPoint[];
  title: string;
  unit: string;
  color?: string;
  thresholds?: {
    warning: number;
    critical: number;
  };
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  updateInterval?: number;
  maxDataPoints?: number;
}

export function RealTimeChart({
  data,
  title,
  unit,
  color = chartColors.primary,
  thresholds,
  height = 300,
  showGrid = true,
  showLegend = true,
  updateInterval = 2000,
  maxDataPoints = 60
}: RealTimeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentData, setCurrentData] = useState<DataPoint[]>(data);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isPaused) {
      setCurrentData(data.slice(-maxDataPoints));
    }
  }, [data, isPaused, maxDataPoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 30, right: 50, bottom: 40, left: 60 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (currentData.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', rect.width / 2, rect.height / 2);
      return;
    }

    const values = currentData.map(d => d.value);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, thresholds?.critical || 100);
    const valueRange = maxValue - minValue || 1;

    const xScale = (index: number) => padding.left + (index / (currentData.length - 1 || 1)) * chartWidth;
    const yScale = (value: number) => padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;

      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        const gridValue = maxValue - (valueRange / 5) * i;
        ctx.fillStyle = '#6b7280';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(gridValue.toFixed(1), padding.left - 10, y + 4);
      }
    }

    // Draw threshold lines
    if (thresholds) {
      if (thresholds.warning) {
        ctx.strokeStyle = chartColors.warn;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const warningY = yScale(thresholds.warning);
        ctx.beginPath();
        ctx.moveTo(padding.left, warningY);
        ctx.lineTo(padding.left + chartWidth, warningY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = chartColors.warn;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`Warning: ${thresholds.warning}${unit}`, padding.left + chartWidth + 5, warningY + 4);
      }

      if (thresholds.critical) {
        ctx.strokeStyle = chartColors.error;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const criticalY = yScale(thresholds.critical);
        ctx.beginPath();
        ctx.moveTo(padding.left, criticalY);
        ctx.lineTo(padding.left + chartWidth, criticalY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = chartColors.error;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`Critical: ${thresholds.critical}${unit}`, padding.left + chartWidth + 5, criticalY + 4);
      }
    }

    // Draw area fill
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(0));
    currentData.forEach((point, index) => {
      ctx.lineTo(xScale(index), yScale(point.value));
    });
    ctx.lineTo(xScale(currentData.length - 1), yScale(0));
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}05`);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    currentData.forEach((point, index) => {
      const x = xScale(index);
      const y = yScale(point.value);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points on last data point
    const lastIndex = currentData.length - 1;
    const lastX = xScale(lastIndex);
    const lastY = yScale(currentData[lastIndex].value);

    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw X-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';

    const labelInterval = Math.max(Math.floor(currentData.length / 6), 1);
    currentData.forEach((point, index) => {
      if (index % labelInterval === 0 || index === currentData.length - 1) {
        const x = xScale(index);
        const timeStr = point.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        ctx.fillText(timeStr, x, rect.height - 10);
      }
    });

    // Draw title
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(title, padding.left, 20);

    // Draw current value
    const currentValue = currentData[currentData.length - 1]?.value;
    if (currentValue !== undefined) {
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`${currentValue.toFixed(2)} ${unit}`, rect.width - padding.right, 20);
    }

  }, [currentData, title, unit, color, thresholds, showGrid]);

  const handleReset = () => {
    setCurrentData(data.slice(-maxDataPoints));
  };

  return (
    <div className="bg-fw-base rounded-2xl border border-fw-secondary p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-lg hover:bg-fw-neutral transition-colors"
            title={isPaused ? 'Resume updates' : 'Pause updates'}
          >
            {isPaused ? (
              <Play className="h-4 w-4 text-fw-body" />
            ) : (
              <Pause className="h-4 w-4 text-fw-body" />
            )}
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-fw-neutral transition-colors"
            title="Reset view"
          >
            <RefreshCw className="h-4 w-4 text-fw-body" />
          </button>
        </div>
        <div className="flex items-center space-x-4 text-figma-sm text-fw-body">
          {isPaused && (
            <span className="px-2 py-1 bg-fw-wash text-fw-bodyLight rounded-full font-medium">
              Paused
            </span>
          )}
          <span>{currentData.length} data points</span>
          {!isPaused && (
            <span className="flex items-center space-x-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fw-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-fw-successLight0"></span>
              </span>
              <span>Live</span>
            </span>
          )}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="rounded"
      />
    </div>
  );
}
