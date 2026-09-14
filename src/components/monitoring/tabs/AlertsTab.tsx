import { Suspense, lazy, useState } from 'react';
import { useMonitoring } from '../context/MonitoringContext';
import { SkeletonCard } from '../../common/SkeletonCard';
import { LazyLoadSection } from '../../common/layouts/LazyLoadSection';
import { Bell, Settings } from 'lucide-react';

// Lazy load components
const AlertCards = lazy(() => import('../alerts/AlertCards'));
const AlertHistory = lazy(() => import('../alerts/AlertHistory').then(module => ({ default: module.AlertHistory })));
const AlertRuleMaking = lazy(() => import('../alerts/AlertRuleMaking').then(module => ({ default: module.AlertRuleMaking })));

export function AlertsTab() {
  const { selectedConnection, timeRange } = useMonitoring();
  const [activeSubTab, setActiveSubTab] = useState<'alerts' | 'rules'>('alerts');

  const tabs = [
    { id: 'alerts', label: 'Alert Viewer', icon: Bell },
    { id: 'rules', label: 'Rule Making', icon: Settings }
  ];

  return (
    <div className="p-6">
      <div className="flex">
        {/* Vertical Tabs */}
        <div className="w-[186px] shrink-0 border-r border-fw-secondary pr-4">
          <nav className="space-y-1" aria-label="Alerts Navigation">
            {tabs.map((tab) => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
                  className={`
                    w-full flex items-center text-left px-4 py-3 text-figma-base font-medium no-rounded
                    transition-colors duration-200 border-l-2
                    ${activeSubTab === tab.id
                      ? 'border-fw-active text-fw-link'
                      : 'border-transparent text-fw-heading hover:text-fw-link hover:border-fw-secondary'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 pl-6">
          {activeSubTab === 'alerts' ? (
            <div className="space-y-6">
              <LazyLoadSection
                placeholder={<SkeletonCard lines={4} />}
                className="w-full"
              >
                <Suspense fallback={<SkeletonCard lines={4} />}>
                  <AlertCards selectedConnection={selectedConnection} />
                </Suspense>
              </LazyLoadSection>

              <LazyLoadSection
                placeholder={<SkeletonCard lines={8} />}
                className="w-full"
              >
                <Suspense fallback={<SkeletonCard lines={8} />}>
                  <AlertHistory selectedConnection={selectedConnection} />
                </Suspense>
              </LazyLoadSection>
            </div>
          ) : (
            <Suspense fallback={<SkeletonCard lines={8} />}>
              <AlertRuleMaking
                selectedConnection={selectedConnection}
                timeRange={timeRange}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

