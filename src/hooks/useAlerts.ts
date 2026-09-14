import { useState, useCallback } from 'react';
import { Connection, Alert } from '../types';

/**
 * Hook to manage alert data and operations
 */
export function useAlerts(initialConnections: Connection[]) {
  // Sample alerts - in a real app, these would come from your backend
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'critical',
      title: 'High Latency Detected',
      message: 'AWS Interconnect – last mile experiencing latency spikes above threshold',
      timestamp: new Date().toISOString(),
      connectionId: '1'
    },
    {
      id: '2',
      type: 'warning',
      title: 'Bandwidth Usage',
      message: 'Azure ExpressRoute approaching 80% bandwidth utilization',
      timestamp: new Date().toISOString(),
      connectionId: '2'
    },
    {
      id: '3',
      type: 'info',
      title: 'Maintenance Scheduled',
      message: 'Planned maintenance for AWS Interconnect – last mile in 48 hours',
      timestamp: new Date().toISOString(),
      connectionId: '1'
    }
  ]);
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState<{
    types: ('critical' | 'warning' | 'info')[];
    search: string;
    timeRange: string;
  }>({
    types: [],
    search: '',
    timeRange: '24h'
  });

  // Handle alert dismissal
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  // Filter alerts based on selected connection and active filters
  const getFilteredAlerts = useCallback((selectedConnection: string) => {
    return alerts.filter(alert => {
      // Filter by connection
      if (selectedConnection !== 'all' && alert.connectionId !== selectedConnection) {
        return false;
      }
      
      // Filter by alert type
      if (activeFilters.types.length > 0 && !activeFilters.types.includes(alert.type)) {
        return false;
      }
      
      // Filter by search term
      if (activeFilters.search) {
        const searchTerm = activeFilters.search.toLowerCase();
        return (
          alert.title.toLowerCase().includes(searchTerm) || 
          alert.message.toLowerCase().includes(searchTerm)
        );
      }
      
      return true;
    });
  }, [alerts, activeFilters]);
  
  // Update filters
  const updateFilters = useCallback((updates: Partial<typeof activeFilters>) => {
    setActiveFilters(prev => ({
      ...prev,
      ...updates
    }));
  }, []);
  
  // Reset filters
  const resetFilters = useCallback(() => {
    setActiveFilters({
      types: [],
      search: '',
      timeRange: '24h'
    });
  }, []);

  return {
    alerts,
    setAlerts,
    activeFilters,
    updateFilters,
    resetFilters,
    dismissAlert,
    getFilteredAlerts
  };
}