import { ReactNode, useState, useEffect, useRef } from 'react';
import { Bell, Activity, Shield, Clock, Search, X, RefreshCw, Download, Filter } from 'lucide-react';
import { useAlerts } from '../../../hooks/useAlerts';
import { Connection } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../common/Button';
import { SearchFilterBar } from '../../common/SearchFilterBar';

interface BaseAlertsViewProps {
  connections: Connection[];
  selectedConnection: string;
  children: (props: {
    filteredAlerts: (connectionId?: string) => Array<any>;
    dismissAlert: ReturnType<typeof useAlerts>['dismissAlert'];
    activeFilters: ReturnType<typeof useAlerts>['activeFilters'];
  }) => ReactNode;
  isMobile?: boolean;
}

export function BaseAlertsView({ 
  connections, 
  selectedConnection, 
  children,
  isMobile = false
}: BaseAlertsViewProps) {
  const {
    alerts,
    activeFilters,
    updateFilters,
    resetFilters,
    dismissAlert,
    getFilteredAlerts
  } = useAlerts(connections);
  
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);
  
  // Get filtered alerts function to pass to children
  const filteredAlerts = getFilteredAlerts;
  
  // Clean up any timers on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  // Handle manual refresh
  const handleRefresh = () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    // Simulate data refresh - in real app this would fetch from backend
    refreshTimerRef.current = window.setTimeout(() => {
      setIsRefreshing(false);
      refreshTimerRef.current = null;
      
      window.addToast({
        type: 'success',
        title: 'Alerts Refreshed',
        message: 'Alert data has been updated',
        duration: 2000
      });
    }, 1000);
  };

  if (isMobile) {
    // Mobile version
    return (
      <div className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center py-2 px-4 bg-fw-base border border-fw-secondary rounded-lg shadow-sm text-fw-body hover:bg-fw-wash"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span className="text-figma-base font-medium">Filter Alerts</span>
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center py-2 px-4 bg-fw-base border border-fw-secondary rounded-lg shadow-sm text-fw-body hover:bg-fw-wash"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-figma-base font-medium">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-fw-base rounded-lg border border-fw-secondary overflow-hidden shadow-sm"
            >
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">Alert Filters</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div>
                  <label className="block text-figma-base font-medium text-fw-body mb-2">
                    Alert Types
                  </label>
                  <div className="space-y-2">
                    {['critical', 'warning', 'info'].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          const types = activeFilters.types.includes(type as any)
                            ? activeFilters.types.filter(t => t !== type)
                            : [...activeFilters.types, type as any];
                          updateFilters({ types });
                        }}
                        className={`
                          block w-full text-left px-3 py-2 rounded-md text-figma-base
                          ${activeFilters.types.includes(type as any)
                            ? type === 'critical'
                              ? 'bg-fw-errorLight text-fw-error'
                              : type === 'warning'
                                ? 'bg-fw-wash text-fw-bodyLight'
                                : 'bg-brand-lightBlue text-brand-blue'
                            : 'text-fw-body hover:bg-fw-wash'
                          }
                        `}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    onClick={resetFilters}
                    className="text-figma-base text-fw-bodyLight hover:text-fw-body"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-4 py-2 bg-brand-blue text-white rounded-lg text-figma-base font-medium hover:bg-brand-darkBlue"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters */}
        {(activeFilters.types.length > 0 || activeFilters.search) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.types.map((type) => (
              <span
                key={type}
                className={`inline-flex items-center px-2 py-1 rounded-full text-figma-sm font-medium ${
                  type === 'critical'
                    ? 'bg-fw-errorLight text-fw-error'
                    : type === 'warning'
                      ? 'bg-fw-wash text-fw-bodyLight'
                      : 'bg-brand-lightBlue text-brand-blue'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                <button
                  onClick={() => {
                    updateFilters({
                      types: activeFilters.types.filter(t => t !== type)
                    });
                  }}
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {activeFilters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-figma-sm font-medium bg-fw-neutral text-fw-body">
                "{activeFilters.search}"
                <button
                  onClick={() => updateFilters({ search: '' })}
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className="text-figma-sm text-fw-bodyLight hover:text-fw-body"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Render children with necessary props */}
        {children({
          filteredAlerts,
          dismissAlert,
          activeFilters
        })}
      </div>
    );
  }
  
  // Desktop version
  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-fw-base rounded-lg border border-fw-secondary p-4">
        <SearchFilterBar
          searchPlaceholder="Search alerts..."
          searchValue={activeFilters.search}
          onSearchChange={(value) => updateFilters({ search: value })}
          onExport={() => {
            window.addToast({
              type: 'success',
              title: 'Alerts Exported',
              message: 'Alert data has been exported successfully',
              duration: 3000
            });
          }}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          showFilter={false}
          actions={
            <div className="flex items-center space-x-2">
              {['critical', 'warning', 'info'].map((type) => (
                <Button
                  key={type}
                  variant={activeFilters.types.includes(type as any) ? 'primary' : 'ghost'}
                  size="sm"
                  className={
                    activeFilters.types.includes(type as any)
                      ? type === 'critical'
                        ? 'bg-fw-error'
                        : type === 'warning'
                          ? 'bg-fw-warn'
                          : undefined
                      : undefined
                  }
                  onClick={() => {
                    const types = activeFilters.types.includes(type as any)
                      ? activeFilters.types.filter(t => t !== type)
                      : [...activeFilters.types, type as any];
                    updateFilters({ types });
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          }
        />

        {/* Active Filters */}
        {(activeFilters.types.length > 0 || activeFilters.search) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {activeFilters.types.map((type) => (
              <span
                key={type}
                className={`inline-flex items-center px-2 py-1 rounded-full text-figma-sm font-medium ${
                  type === 'critical'
                    ? 'bg-fw-errorLight text-fw-error'
                    : type === 'warning'
                      ? 'bg-fw-wash text-fw-bodyLight'
                      : 'bg-brand-lightBlue text-brand-blue'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                <button
                  onClick={() => {
                    updateFilters({
                      types: activeFilters.types.filter(t => t !== type)
                    });
                  }}
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {activeFilters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-figma-sm font-medium bg-fw-neutral text-fw-body">
                "{activeFilters.search}"
                <button
                  onClick={() => updateFilters({ search: '' })}
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className="text-figma-sm text-fw-bodyLight hover:text-fw-body"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Render children with necessary props */}
      {children({
        filteredAlerts,
        dismissAlert,
        activeFilters
      })}
    </div>
  );
}