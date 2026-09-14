import { ReactNode } from 'react';
import { Activity, Wifi, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface PerformanceCardProps {
  title: string;
  value: string;
  change?: number;
  icon: ReactNode;
  status?: 'success' | 'warning' | 'error';
  description?: string;
  isMobile?: boolean;
}

export function PerformanceCard({
  title,
  value,
  change,
  icon,
  status = 'success',
  description,
  isMobile = false
}: PerformanceCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-fw-success';
      case 'warning':
        return 'text-fw-bodyLight';
      case 'error':
        return 'text-fw-error';
      default:
        return 'text-fw-bodyLight';
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'success':
        return 'bg-fw-successLight';
      case 'warning':
        return 'bg-fw-wash';
      case 'error':
        return 'bg-fw-error/10';
      default:
        return 'bg-fw-wash';
    }
  };
  
  if (isMobile) {
    return (
      <div className="bg-fw-base p-4 rounded-lg border border-fw-secondary shadow-sm">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-figma-sm font-medium text-fw-bodyLight">{title}</h3>
            {icon}
          </div>
          <div className="text-lg font-semibold text-fw-heading">{value}</div>
          {change !== undefined && (
            <div className={`mt-1 text-figma-sm flex items-center ${change < 0 ? 'text-fw-success' : 'text-fw-error'}`}>
              {change < 0 ? (
                <TrendingDown className="h-3 w-3 mr-1" />
              ) : (
                <TrendingUp className="h-3 w-3 mr-1" />
              )}
              <span>{Math.abs(change).toFixed(1)}% {change < 0 ? 'decrease' : 'increase'}</span>
            </div>
          )}
          {description && (
            <div className="mt-1 text-figma-sm text-fw-bodyLight">{description}</div>
          )}
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="bg-fw-base rounded-lg border border-fw-secondary overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4 p-4">
        <div>
          <h3 className="text-figma-base font-medium text-fw-heading">{title}</h3>
          {description && <p className="text-figma-sm text-fw-bodyLight mt-1">{description}</p>}
        </div>
        <div className={`p-2 rounded-lg ${getBackgroundColor()}`}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-center space-x-3 mb-4 px-4">
        <div className="text-2xl font-bold text-fw-heading">{value}</div>
        {change !== undefined && (
          <span className={`px-2 py-1 text-figma-sm font-medium rounded-full flex items-center ${
            change < 0 ? 'bg-fw-successLight text-fw-success' : 'bg-fw-error/10 text-fw-error'
          }`}>
            {change < 0 ? (
              <TrendingDown className="h-3 w-3 mr-1" />
            ) : (
              <TrendingUp className="h-3 w-3 mr-1" />
            )}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="h-24 w-full px-4 pb-4">
        {/* Chart placeholder - would be replaced with actual chart */}
        <div className="h-full w-full bg-fw-wash rounded-lg flex items-center justify-center">
          <span className="text-figma-sm text-fw-bodyLight">Chart Placeholder</span>
        </div>
      </div>
    </div>
  );
}