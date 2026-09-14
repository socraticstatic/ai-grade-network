import { useState, useMemo, useCallback } from 'react';
import { Connection, ConnectionSummary } from '../types';
import { calculateConnectionSummary } from '../utils/connections';

/**
 * Hook for managing monitoring data state and operations
 */
export function useMonitoringData(initialConnections: Connection[]) {
  // Filter state
  const [selectedConnection, setSelectedConnection] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('1h');
  const [refreshInterval, setRefreshInterval] = useState(0); // Default: no auto refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Filtered connections based on current selection
  const filteredConnections = useMemo(() => {
    if (selectedConnection === 'all') {
      return initialConnections;
    }
    return initialConnections.filter(conn => conn.id === selectedConnection);
  }, [initialConnections, selectedConnection]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    return calculateConnectionSummary(filteredConnections);
  }, [filteredConnections]);

  // Generate hourly data for charts
  const generateHourlyData = useCallback(() => {
    const hours = 24;
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < hours; i++) {
      const date = new Date(now);
      date.setHours(now.getHours() - (hours - i));
      
      data.push({
        timestamp: date.toISOString(),
        latency: 3 + Math.random() * 4, // 3-7ms 
        packetLoss: Math.random() * 0.05, // 0-0.05%
        jitter: Math.random() * 1.5, // 0-1.5ms
        bandwidth: 65 + Math.random() * 25, // 65-90%
        errorRate: Math.random() * 0.01 // 0-0.01%
      });
    }
    
    return data;
  }, []);
  
  // Handle refresh action
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    
    // Simulate network request - in a real app, this would fetch fresh data
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed(new Date());
      
      // Show success notification
      window.addToast({
        type: 'success',
        title: 'Data Refreshed',
        message: 'Monitoring data has been updated successfully',
        duration: 3000
      });
    }, 1500);
  }, []);

  return {
    selectedConnection,
    setSelectedConnection,
    selectedGroup,
    setSelectedGroup,
    timeRange,
    setTimeRange,
    refreshInterval,
    setRefreshInterval,
    isRefreshing,
    lastRefreshed,
    filteredConnections,
    summary,
    generateHourlyData,
    handleRefresh
  };
}