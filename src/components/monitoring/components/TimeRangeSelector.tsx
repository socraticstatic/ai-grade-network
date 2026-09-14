import { useEffect } from 'react';
import { TimeRangeOption } from './TimeRangeOption';
import { useMonitoring } from '../context/MonitoringContext';

interface TimeRangeSelectorProps {
  onChange?: (value: string) => void;
  value?: string;
}

export function TimeRangeSelector({
  onChange,
  value
}: TimeRangeSelectorProps) {
  const { timeRange, setTimeRange } = useMonitoring();
  
  // Use the context value by default, but allow override via props
  const effectiveTimeRange = value !== undefined ? value : timeRange;
  
  // Sync with context when props change
  useEffect(() => {
    if (value !== undefined && value !== timeRange) {
      setTimeRange(value);
    }
  }, [value, timeRange, setTimeRange]);
  
  const handleChange = (newValue: string) => {
    // Update both local state and context
    if (onChange) {
      onChange(newValue);
    }
    setTimeRange(newValue);
  };

  const timeRanges = [
    { value: '15m', label: 'Last 15 Minutes', description: 'Very recent data' },
    { value: '1h', label: 'Last Hour', description: 'Most recent data' },
    { value: '6h', label: 'Last 6 Hours', description: 'Short-term trends' },
    { value: '7d', label: 'Last 7 Days', description: 'Weekly trends' },
    { value: '30d', label: 'Last 30 Days', description: 'Monthly analysis' },
    { value: '90d', label: 'Last 90 Days', description: 'Quarterly review' },
    { value: '180d', label: 'Last 180 Days', description: 'Half-year analysis' },
    { value: '365d', label: 'Last Year', description: 'Annual review' },
    { value: 'custom', label: 'Custom Range', description: 'Specific date range' }
  ];
  
  const currentRange = timeRanges.find(range => range.value === effectiveTimeRange);

  return (
    <div className="relative">
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <select
            value={effectiveTimeRange}
            onChange={(e) => {
              handleChange(e.target.value);
            }}
            className="form-control"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Time Range Description */}
      {currentRange && (
        <div className="mt-2 text-figma-base text-fw-bodyLight">
          {currentRange.description}
        </div>
      )}
    </div>
  );
}