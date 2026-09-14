import { ReactNode, useState, useEffect, useRef } from 'react';
import { Activity, ArrowUpDown, Clock, Signal, TrendingUp, BarChart2, RefreshCw } from 'lucide-react';
import { Button } from '../../common/Button';
import { useTimeRange } from '../../../hooks/useTimeRange';
import { useMonitoringData } from '../../../hooks/useMonitoringData';
import { Connection } from '../../../types';

interface BaseMetricsViewProps {
  connections: Connection[];
  children: (props: {
    activeMetricView: string;
    hourlyData: any[];
    isRefreshing: boolean;
    timeRange: string;
  }) => ReactNode;
  isMobile?: boolean;
}

export function BaseMetricsView({ connections, children, isMobile = false }: BaseMetricsViewProps) {
  const { 
    timeRange, 
    setTimeRange, 
    isRefreshing, 
    handleRefresh,
    currentRangeOption
  } = useTimeRange('24h');
  
  const { generateHourlyData } = useMonitoringData(connections);
  const [activeMetricView, setActiveMetricView] = useState<string>('overview');
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  
  // Avoid auto-refresh setting at the component level - we'll handle this at a higher level
  const timerRef = useRef<number | null>(null);

  // Generate hourly data when component mounts or dependencies change
  useEffect(() => {
    setHourlyData(generateHourlyData());
    
    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        console.log('BaseMetricsView: Cleaning up timer on unmount');
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [generateHourlyData]);

  const metricTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'latency', label: 'Latency', icon: TrendingUp },
    { id: 'bandwidth', label: 'Bandwidth', icon: ArrowUpDown },
    { id: 'packet-loss', label: 'Packet Loss', icon: Signal },
    { id: 'errors', label: 'Errors', icon: BarChart2 }
  ];

  // Custom refresh handler that also updates the hourly data
  const handleMetricsRefresh = () => {
    handleRefresh();
    setHourlyData(generateHourlyData());
  };

  if (isMobile) {
    // Mobile version with grid of icons
    return (
      <div className="space-y-4">
        {/* Metric Selector */}
        <div className="bg-fw-base rounded-lg border border-fw-secondary p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            {metricTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMetricView(tab.id)}
                  className={`flex flex-col items-center p-2 rounded-lg ${
                    activeMetricView === tab.id
                      ? 'bg-brand-lightBlue text-brand-blue'
                      : 'bg-fw-wash text-fw-body hover:bg-fw-neutral'
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${
                    activeMetricView === tab.id ? 'text-brand-blue' : 'text-fw-bodyLight'
                  }`} />
                  <span className="text-figma-sm font-medium text-center">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Range Selector (simple for mobile) */}
        <div className="bg-fw-base rounded-lg border border-fw-secondary p-4 shadow-sm flex items-center justify-between">
          <span className="text-figma-base font-medium text-fw-body">Time Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="ml-3 border-fw-secondary rounded-md text-figma-base"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={handleMetricsRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Render children with necessary props */}
        {children({
          activeMetricView,
          hourlyData,
          isRefreshing,
          timeRange
        })}
      </div>
    );
  }

  // Desktop version with tabs
  return (
    <div className="space-y-6 w-full">
      {/* Top filter hub */}
      <div className="bg-fw-base rounded-lg border border-fw-secondary p-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-fw-heading tracking-[-0.03em]">Detailed Performance Metrics</h2>
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={handleMetricsRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        
        <div className="grid grid-cols-5 gap-4 mb-6">
          {metricTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveMetricView(tab.id)}
                className={`p-3 rounded-lg border transition-colors ${
                  activeMetricView === tab.id 
                    ? 'bg-brand-lightBlue border-brand-blue text-brand-blue' 
                    : 'border-fw-secondary hover:bg-fw-wash'
                }`}
              >
                <div className="flex flex-col items-center">
                  <Icon className={`h-5 w-5 mb-1 ${activeMetricView === tab.id ? 'text-brand-blue' : 'text-fw-bodyLight'}`} />
                  <span className="text-figma-base font-medium">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <label className="block text-figma-base font-medium text-fw-body mb-1">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="form-control"
            >
              {/* Simplified for example */}
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            {currentRangeOption && (
              <p className="mt-1 text-figma-sm text-fw-bodyLight">{currentRangeOption.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Render children with necessary props */}
      {children({
        activeMetricView,
        hourlyData,
        isRefreshing,
        timeRange
      })}
    </div>
  );
}