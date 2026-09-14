import { ReactNode, useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';

interface RealTimeMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: ReactNode;
  status: 'healthy' | 'warning' | 'critical' | 'neutral';
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    timeframe: string;
  };
  sparklineData?: number[];
  target?: {
    value: number;
    label: string;
  };
  lastUpdate?: Date;
  isLive?: boolean;
}

export function RealTimeMetricCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  status,
  trend,
  sparklineData = [],
  target,
  lastUpdate,
  isLive = true
}: RealTimeMetricCardProps) {
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setPulseActive(true);
        setTimeout(() => setPulseActive(false), 300);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const getStatusStyles = () => {
    switch (status) {
      case 'healthy':
        return {
          border: 'border-fw-success',
          bg: 'bg-fw-successLight',
          iconBg: 'bg-fw-successLight',
          iconColor: 'text-fw-success',
          badge: 'bg-fw-successLight text-fw-success'
        };
      case 'warning':
        return {
          border: 'border-fw-secondary',
          bg: 'bg-fw-wash',
          iconBg: 'bg-fw-wash',
          iconColor: 'text-fw-bodyLight',
          badge: 'bg-fw-wash text-fw-bodyLight'
        };
      case 'critical':
        return {
          border: 'border-fw-error',
          bg: 'bg-fw-errorLight',
          iconBg: 'bg-fw-errorLight',
          iconColor: 'text-fw-error',
          badge: 'bg-fw-errorLight text-fw-error'
        };
      default:
        return {
          border: 'border-fw-secondary',
          bg: 'bg-fw-wash',
          iconBg: 'bg-fw-neutral',
          iconColor: 'text-fw-body',
          badge: 'bg-fw-neutral text-fw-body'
        };
    }
  };

  const styles = getStatusStyles();

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-3.5 w-3.5" />;
      case 'down':
        return <TrendingDown className="h-3.5 w-3.5" />;
      case 'stable':
        return <Minus className="h-3.5 w-3.5" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    return trend.direction === 'up' ? 'text-fw-success' :
           trend.direction === 'down' ? 'text-fw-error' : 'text-fw-body';
  };

  const renderSparkline = () => {
    if (sparklineData.length === 0) return null;

    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;

    const points = sparklineData.map((value, index) => {
      const x = (index / (sparklineData.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-full h-12" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={status === 'healthy' ? 'text-fw-success' :
                     status === 'warning' ? 'text-fw-bodyLight' :
                     status === 'critical' ? 'text-fw-error' : 'text-fw-bodyLight'}
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points}
          fill="currentColor"
          fillOpacity="0.1"
          stroke="none"
          className={status === 'healthy' ? 'text-fw-success' :
                     status === 'warning' ? 'text-fw-bodyLight' :
                     status === 'critical' ? 'text-fw-error' : 'text-fw-bodyLight'}
        />
      </svg>
    );
  };

  return (
    <div className={`bg-fw-base rounded-lg border-2 ${styles.border} transition-all duration-300 hover:shadow-lg ${pulseActive ? 'ring-2 ring-fw-active ring-opacity-50' : ''}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-figma-lg font-medium text-fw-heading">{title}</h3>
              {isLive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fw-cobalt-600 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-fw-cobalt-600"></span>
                </span>
              )}
            </div>
            {lastUpdate && (
              <p className="text-figma-sm text-fw-bodyLight">
                Updated {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${styles.iconBg}`}>
            <div className={styles.iconColor}>
              {icon}
            </div>
          </div>
        </div>

        {/* Value */}
        <div className="mb-3">
          <div className="flex items-baseline space-x-2">
            <span className="text-figma-xl font-bold text-fw-heading">
              {typeof value === 'number' ? value.toFixed(5).replace(/\.?0+$/, '') : value}
            </span>
            {unit && <span className="text-figma-base font-medium text-fw-body">{unit}</span>}
          </div>
          {subtitle && (
            <p className="text-figma-xs text-fw-bodyLight mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Trend & Status */}
        <div className="flex items-center justify-between mb-3">
          {trend && (
            <div className={`flex items-center space-x-1 text-figma-sm font-medium ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{trend.percentage.toFixed(2)}%</span>
            </div>
          )}
          <div className={`px-2 py-1 text-figma-sm font-semibold ${styles.badge}`}>
            {status === 'healthy' && <CheckCircle className="inline h-3 w-3 mr-1 -mt-0.5" />}
            {status === 'warning' && <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5" />}
            {status === 'critical' && <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5" />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>

        {/* Sparkline */}
        {sparklineData.length > 0 && (
          <div className="mb-3">
            {renderSparkline()}
          </div>
        )}

        {/* Target Progress */}
        {target && (
          <div className="mt-3 pt-3 border-t border-fw-secondary">
            <div className="flex items-center justify-between text-figma-sm text-fw-body mb-1.5">
              <span>{target.label}</span>
              <span className="font-medium">{target.value}%</span>
            </div>
            <div className="h-1.5 bg-fw-neutral rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  status === 'healthy' ? 'bg-fw-success' :
                  status === 'warning' ? 'bg-fw-wash0' :
                  status === 'critical' ? 'bg-fw-error' : 'bg-fw-bodyLight'
                }`}
                style={{ width: `${Math.min(target.value, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
