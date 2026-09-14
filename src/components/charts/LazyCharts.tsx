import { lazy, Suspense, ComponentProps, memo } from 'react';

// Minimal loading placeholder
const ChartPlaceholder = memo(() => (
  <div className="w-full h-full flex items-center justify-center bg-fw-wash rounded-lg">
    <div className="h-4 w-4 border-2 border-fw-secondary border-t-fw-cobalt-600 rounded-full animate-spin"></div>
  </div>
));

// More efficient chart imports - only load what's needed
const LineChartComponent = lazy(() => 
  Promise.all([
    import('react-chartjs-2').then(m => m.Line),
    import('chart.js/auto') // Import auto registration
  ]).then(([Line]) => ({ default: Line }))
);

const BarChartComponent = lazy(() => 
  Promise.all([
    import('react-chartjs-2').then(m => m.Bar),
    import('chart.js/auto')
  ]).then(([Bar]) => ({ default: Bar }))
);

// Memoized chart wrappers to prevent unnecessary re-renders
export const LineChart = memo<any>((props) => (
  <Suspense fallback={<ChartPlaceholder />}>
    <LineChartComponent {...props} />
  </Suspense>
));

export const BarChart = memo<any>((props) => (
  <Suspense fallback={<ChartPlaceholder />}>
    <BarChartComponent {...props} />
  </Suspense>
));

// Export a lightweight preload function
export const preloadCharts = () => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      import('chart.js/auto');
      import('react-chartjs-2');
    });
  }
};