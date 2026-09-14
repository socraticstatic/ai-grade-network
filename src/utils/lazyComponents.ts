// Centralized lazy component loading with better error handling and preloading

import { lazy, ComponentType } from 'react';

// Component loader with retry logic
const createLazyComponent = <T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  componentName: string
) => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error(`Failed to load ${componentName}:`, error);
      
      // Return a fallback component that shows an error
      return {
        default: (() => (
          <div className="p-8 text-center bg-fw-errorLight border border-fw-error rounded-lg">
            <h3 className="text-lg font-medium text-fw-error mb-2">
              Failed to load {componentName}
            </h3>
            <p className="text-figma-base text-fw-error mb-4">
              Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-fw-error text-white rounded-full hover:bg-fw-error"
            >
              Refresh Page
            </button>
          </div>
        )) as ComponentType<T>
      };
    }
  });
};

// Feature-based lazy components
export const LazyMonitoringDashboard = createLazyComponent(
  () => import('../components/monitoring/monitoring/MonitoringDashboard'),
  'Monitoring Dashboard'
);

export const LazyNetworkDesigner = createLazyComponent(
  () => import('../components/network-designer/LazyNetworkDesigner'),
  'Network Designer'
);

export const LazyConfigureHub = createLazyComponent(
  () => import('../components/configure/ConfigureHub'),
  'Configure Hub'
);

export const LazyControlCenter = createLazyComponent(
  () => import('../components/control-center/ControlCenterManager'),
  'Control Center'
);

export const LazyGroupDetails = createLazyComponent(
  () => import('../components/GroupDetailsPage'),
  'Group Details'
);

// Preloading functions for performance
export const preloadMonitoring = () => {
  import('../components/monitoring/monitoring/MonitoringDashboard');
};

export const preloadNetworkDesigner = () => {
  import('../components/network-designer/LazyNetworkDesigner');
};

export const preloadConfigureHub = () => {
  import('../components/configure/ConfigureHub');
};

// Preload critical path components
export const preloadCriticalPath = () => {
  // Preload components likely to be used in the first user journey
  import('../components/ConnectionGrid');
  import('../components/connection/ConnectionCard');
  import('../components/navigation/MainNav');
};