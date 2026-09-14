import { Suspense, lazy } from 'react';
import { useMonitoring } from '../context/MonitoringContext';
import { SkeletonTable } from '../../common/SkeletonTable';
import { LazyLoadSection } from '../../common/layouts/LazyLoadSection';

// Load the logs content component lazily
const LogsContent = lazy(() => import('./LogsContent'));

export function LogsTab() {
  const { selectedConnection, filteredConnections } = useMonitoring();

  return (
    <div>
      <LazyLoadSection
        placeholder={<SkeletonTable rows={5} columns={6} />}
        className="w-full"
      >
        <Suspense fallback={<SkeletonTable rows={5} columns={6} />}>
          <LogsContent
            selectedConnection={selectedConnection}
            connections={filteredConnections}
          />
        </Suspense>
      </LazyLoadSection>
    </div>
  );
}

