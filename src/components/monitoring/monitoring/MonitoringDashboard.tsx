import { useState, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardTabs, MonitoringTabType } from '../navigation/DashboardTabs';
import { DashboardFilters } from '../components/DashboardFilters';
import { RefreshControls } from '../tabs/RefreshControls';
import { Connection } from '../../../types';
import { useStore } from '../../../store/useStore';
import { MonitoringProvider } from '../context/MonitoringContext';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { AsyncBoundary } from '../../common/AsyncBoundary';
import { sampleLinks, sampleVNFs } from '../../../data/sampleInfrastructure';

// Lazy load tabs for better performance
const OverviewTab = lazy(() => import('../tabs/OverviewTab').then(module => ({ default: module.OverviewTab })));
const MetricsTab = lazy(() => import('../tabs/MetricsTab').then(module => ({ default: module.MetricsTab })));
const AlertsTab = lazy(() => import('../tabs/AlertsTab').then(module => ({ default: module.AlertsTab })));
const LogsTab = lazy(() => import('../tabs/LogsTab').then(module => ({ default: module.LogsTab })));
const ReportingSection = lazy(() => import('../reporting/ReportingSection').then(module => ({ default: module.ReportingSection })));

interface MonitoringDashboardProps {
  connections: Connection[];
}

export function MonitoringDashboard({ connections }: MonitoringDashboardProps) {
  const location = useLocation();
  const groups = useStore(state => state.groups);
  const allRouters = useStore(state => state.hubs);
  const [activeTab, setActiveTab] = useState<MonitoringTabType>('overview');
  
  // Set initial active tab from location state
  useState(() => {
    const state = location.state as { defaultTab?: MonitoringTabType };
    if (state?.defaultTab) {
      setActiveTab(state.defaultTab);
    }
  });

  return (
    <MonitoringProvider
      allConnections={connections}
      allRouters={allRouters}
      allLinks={sampleLinks}
      allVNFs={sampleVNFs}
    >
      <div className="space-y-6">
        <DashboardTabs
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Filters */}
        <DashboardFilters
          connections={connections}
          groups={groups}
        />

        <AsyncBoundary>
          <Suspense fallback={
            <div className="p-8 flex justify-center">
              <LoadingSpinner size="lg" text="Loading data..." />
            </div>
          }>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'metrics' && <MetricsTab />}
            {activeTab === 'alerts' && <AlertsTab />}
            {activeTab === 'logs' && <LogsTab />}
            {activeTab === 'reports' && <ReportingSection selectedConnection="all" timeRange="1h" defaultTab="overview" />}
          </Suspense>
        </AsyncBoundary>
      </div>
    </MonitoringProvider>
  );
}

export default MonitoringDashboard;