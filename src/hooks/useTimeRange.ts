import { useState, useCallback, useRef, useEffect } from 'react';

type TimeRangeOption = {
  value: string;
  label: string;
  description: string;
};

const DEFAULT_TIME_RANGES: TimeRangeOption[] = [
  { value: '15m', label: 'Last 15 Minutes', description: 'Very recent data' },
  { value: '1h', label: 'Last Hour', description: 'Most recent data' },
  { value: '6h', label: 'Last 6 Hours', description: 'Short-term trends' },
  { value: '24h', label: 'Last 24 Hours', description: 'Daily trends' },
  { value: '7d', label: 'Last 7 Days', description: 'Weekly trends' },
  { value: '30d', label: 'Last 30 Days', description: 'Monthly analysis' }
];

/**
 * Hook to manage time range selection and manual refresh
 */
export function useTimeRange(initialRange: string = '1h', customRanges?: TimeRangeOption[]) {
  const [timeRange, setTimeRange] = useState(initialRange);
  // Default to no auto-refresh (0 = disabled)
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Ref to store refresh timer ID for cleanup
  const refreshTimerRef = useRef<number | null>(null);

  // Available time ranges - use custom or default
  const timeRangeOptions = customRanges || DEFAULT_TIME_RANGES;

  // Get current time range option details
  const currentRangeOption = timeRangeOptions.find(option => option.value === timeRange);

  // Function to handle refresh
  const handleRefresh = useCallback(() => {
    // Don't allow multiple refresh operations at once
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    // Clear any existing refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // Simulate refresh delay - replace with actual data fetching
    refreshTimerRef.current = window.setTimeout(() => {
      setLastRefreshed(new Date());
      setIsRefreshing(false);
      
      // Show success notification
      window.addToast?.({
        type: 'success',
        title: 'Data Refreshed',
        message: 'Monitoring data has been updated successfully',
        duration: 3000
      });
      
      refreshTimerRef.current = null;
    }, 1000);
  }, [isRefreshing]);
  
  // Clean up any active timer when component unmounts
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  // Format the last refreshed timestamp
  const formattedLastRefreshed = lastRefreshed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return {
    timeRange,
    setTimeRange,
    refreshInterval,
    setRefreshInterval,
    isRefreshing,
    handleRefresh,
    timeRangeOptions,
    currentRangeOption,
    lastRefreshed,
    formattedLastRefreshed
  };
}