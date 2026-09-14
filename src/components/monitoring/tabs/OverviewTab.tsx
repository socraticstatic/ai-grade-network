import { Suspense, lazy } from 'react';
import { Shield, Server, Wifi, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useMonitoring } from '../context/MonitoringContext';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { LazyLoadSection } from '../../common/layouts/LazyLoadSection';
import { SkeletonCard } from '../../common/SkeletonCard';
import { MOCK_LMCC_CONNECTIONS } from '../../../data/lmccService';

// Lazy load components
const AlertCards = lazy(() => 
  import('../alerts/AlertCards').then(module => ({ 
    default: module.default 
  }))
);

const MetricsOverview = lazy(() => 
  import('../components/MetricsOverview').then(module => ({ 
    default: module.MetricsOverview 
  }))
);

const NetworkMetrics = lazy(() => 
  import('../metrics/NetworkMetrics').then(module => ({ 
    default: module.NetworkMetrics 
  }))
);

const BillingMetrics = lazy(() => 
  import('../BillingMetrics').then(module => ({ 
    default: module.BillingMetrics 
  }))
);

const SummaryPanel = lazy(() => 
  import('../SummaryPanel').then(module => ({ 
    default: module.SummaryPanel 
  }))
);

export function OverviewTab() {
  const {
    selectedConnection,
    filteredConnections,
    filteredRouters,
    filteredLinks,
    filteredVNFs,
    resourceType,
    summary
  } = useMonitoring();

  return (
    <div className="space-y-6">
      {/* Resource Hierarchy Section */}
      {selectedConnection !== 'all' && (
        <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
          <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Resource Hierarchy</h3>
          <div className="space-y-4">
            {filteredConnections.map(connection => {
              const isLmcc = connection.configuration?.isLmcc;
              const lmccConn = isLmcc ? MOCK_LMCC_CONNECTIONS.find(c => c.status === 'active') : null;

              if (isLmcc && lmccConn) {
                // LMCC-specific resource hierarchy
                const activePaths = lmccConn.paths.filter(p => p.status === 'active').length;
                const dcGroups = lmccConn.paths.reduce<Record<string, typeof lmccConn.paths>>((acc, path) => {
                  if (!acc[path.datacenter]) acc[path.datacenter] = [];
                  acc[path.datacenter].push(path);
                  return acc;
                }, {});

                return (
                  <div key={connection.id} className="border border-fw-active/30 rounded-lg p-4 bg-fw-accent">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-fw-link" />
                        <span className="font-medium text-fw-heading">{connection.name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium" style={{ color: '#0057b8', backgroundColor: 'rgba(0,87,184,0.16)' }}>AWS Max</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium" style={{ color: '#2d7e24', backgroundColor: 'rgba(45,126,36,0.16)' }}>{activePaths}/4 paths</span>
                      </div>
                      <span className="text-figma-sm text-fw-bodyLight">{lmccConn.metro.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3 pl-4 border-l-2 border-fw-active">
                      {Object.entries(dcGroups).map(([dc, paths]) => (
                        <div key={dc} className="bg-fw-base rounded-lg p-3 border border-fw-secondary">
                          <div className="flex items-center gap-2 mb-2">
                            <Server className="h-3.5 w-3.5 text-fw-bodyLight" />
                            <span className="text-figma-sm font-semibold text-fw-heading">{dc}</span>
                          </div>
                          <div className="space-y-1.5">
                            {paths.map(path => (
                              <div key={path.id} className="flex items-center justify-between text-figma-xs">
                                <span className="text-fw-body">{path.ipeId}</span>
                                <div className="flex items-center gap-1.5">
                                  <Wifi className={`h-3 w-3 ${path.bgpState === 'established' ? 'text-fw-success' : 'text-fw-bodyLight'}`} />
                                  <span className={path.bgpState === 'established' ? 'text-fw-success' : 'text-fw-bodyLight'}>
                                    {path.bgpState}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="bg-fw-base rounded-lg p-2 text-center border border-fw-secondary">
                        <span className="text-figma-xs text-fw-bodyLight">BGP Sessions</span>
                        <p className="text-figma-sm font-semibold text-fw-heading">{activePaths}/4 Established</p>
                      </div>
                      <div className="bg-fw-base rounded-lg p-2 text-center border border-fw-secondary">
                        <span className="text-figma-xs text-fw-bodyLight">BFD</span>
                        <p className="text-figma-sm font-semibold text-fw-heading">3x300ms Active</p>
                      </div>
                      <div className="bg-fw-base rounded-lg p-2 text-center border border-fw-secondary">
                        <span className="text-figma-xs text-fw-bodyLight">Transport</span>
                        <p className="text-figma-sm font-semibold text-fw-heading">{lmccConn.transport.toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
              <div key={connection.id} className="border border-fw-secondary rounded-lg p-4 bg-fw-wash">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-fw-success"></div>
                    <span className="font-medium text-fw-heading">{connection.name}</span>
                  </div>
                  <span className="text-figma-sm text-fw-bodyLight">{connection.type}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pl-4 border-l-2 border-fw-active">
                  <div className="bg-fw-base rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-figma-base text-fw-bodyLight">Hubs</span>
                      <span className="text-lg font-semibold text-fw-link">
                        {filteredRouters.filter(r => r.connectionId === connection.id).length}
                      </span>
                    </div>
                    <div className="text-figma-sm text-fw-bodyLight mt-1">
                      {filteredRouters.filter(r => r.connectionId === connection.id && r.status === 'active').length} active
                    </div>
                  </div>

                  <div className="bg-fw-base rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-figma-base text-fw-bodyLight">Links</span>
                      <span className="text-lg font-semibold text-fw-success">
                        {filteredLinks.length}
                      </span>
                    </div>
                    <div className="text-figma-sm text-fw-bodyLight mt-1">
                      {filteredLinks.filter(l => l.status === 'active').length} active
                    </div>
                  </div>

                  <div className="bg-fw-base rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-figma-base text-fw-bodyLight">VNFs</span>
                      <span className="text-lg font-semibold text-fw-bodyLight">
                        {filteredVNFs.filter(v => v.connectionId === connection.id).length}
                      </span>
                    </div>
                    <div className="text-figma-sm text-fw-bodyLight mt-1">
                      {filteredVNFs.filter(v => v.connectionId === connection.id && v.status === 'active').length} active
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* Alerts Section */}
      <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Active Alerts</h3>
        <Suspense fallback={<LoadingSpinner size="md" text="Loading alerts..." />}>
          <AlertCards
            selectedConnection={selectedConnection}
            connections={filteredConnections}
          />
        </Suspense>
      </div>
      
      {/* Metrics Overview */}
      <LazyLoadSection
        placeholder={<SkeletonCard lines={4} />}
        className="w-full"
      >
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <MetricsOverview metrics={summary} />
        </Suspense>
      </LazyLoadSection>
      
      {/* Network Metrics */}
      <LazyLoadSection
        placeholder={<SkeletonCard lines={6} />}
        className="w-full"
      >
        <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
          <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Network Performance</h3>
          <Suspense fallback={<LoadingSpinner size="md" text="Loading network metrics..." />}>
            <NetworkMetrics metrics={summary} />
          </Suspense>
        </div>
      </LazyLoadSection>
      
      {/* Billing Metrics */}
      <LazyLoadSection
        placeholder={<SkeletonCard lines={8} />}
        className="w-full"
      >
        <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
          <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Billing Overview</h3>
          <Suspense fallback={<LoadingSpinner size="md" text="Loading billing data..." />}>
            <BillingMetrics connections={filteredConnections} />
          </Suspense>
        </div>
      </LazyLoadSection>
      
      {/* Summary Panel */}
      <LazyLoadSection
        placeholder={<SkeletonCard lines={4} />}
        className="w-full"
      >
        <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
          <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Usage Analysis</h3>
          <Suspense fallback={<LoadingSpinner size="md" text="Loading usage data..." />}>
            <SummaryPanel connections={filteredConnections} />
          </Suspense>
        </div>
      </LazyLoadSection>
    </div>
  );
}

