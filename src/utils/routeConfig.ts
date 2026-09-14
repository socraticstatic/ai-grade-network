import { lazy } from 'react';

// Use named exports for each lazy-loaded component
// This prevents "Cannot convert object to primitive value" errors
// by ensuring components are properly exported

export const ConnectionWizard = lazy(() => 
  import('../components/wizard/ConnectionWizard').then(module => ({ 
    default: module.ConnectionWizard 
  }))
);

export const ConnectionDetails = lazy(() => 
  import('../components/connection/ConnectionDetails').then(module => {
    // Ensure we're exporting a component, not an object that needs conversion
    if (!module.ConnectionDetails) {
      throw new Error('ConnectionDetails component not found in module');
    }
    return { default: module.ConnectionDetails };
  })
);

export const MonitoringDashboard = lazy(() => 
  import('../components/monitoring/monitoring/MonitoringDashboard').then(module => ({ 
    default: module.MonitoringDashboard 
  }))
);

export const MobileMonitoringDashboard = lazy(() => 
  import('../components/monitoring/MobileMonitoringDashboard').then(module => ({ 
    default: module.MobileMonitoringDashboard 
  }))
);

export const ConfigureHub = lazy(() => 
  import('../components/configure/ConfigureHub').then(module => ({ 
    default: module.ConfigureHub 
  }))
);

export const UserProfile = lazy(() => 
  import('../components/profile/UserProfile').then(module => ({ 
    default: module.UserProfile 
  }))
);

export const NotificationsPage = lazy(() => 
  import('../components/pages/NotificationsPage').then(module => ({ 
    default: module.NotificationsPage 
  }))
);

export const HelpResourcesPage = lazy(() => 
  import('../components/pages/HelpResourcesPage').then(module => ({ 
    default: module.HelpResourcesPage 
  }))
);

export const ManageGroupsPage = lazy(() => 
  import('../components/ManageGroupsPage').then(module => ({ 
    default: module.ManageGroupsPage 
  }))
);

export const GroupDetailsPage = lazy(() => 
  import('../components/GroupDetailsPage').then(module => ({ 
    default: module.GroupDetailsPage 
  }))
);

// Explicitly make NetworkDesigner lazy-loaded at the route config level
// to ensure it's only loaded when directly requested
const NetworkDesigner = lazy(() => 
  import('../components/network-designer/LazyNetworkDesigner').then(module => ({ 
    default: module.default 
  }))
);