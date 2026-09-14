import { Suspense } from 'react';
import { EnhancedMetricsTab } from '../metrics/EnhancedMetricsTab';
import { LoadingSpinner } from '../../common/LoadingSpinner';

export function MetricsTab() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading metrics..." />
      </div>
    }>
      <EnhancedMetricsTab />
    </Suspense>
  );
}

