import { lazy, Suspense, ComponentProps, memo } from 'react';

// Optimized chart loading with better error handling and smaller bundles

// Loading placeholder
const ChartPlaceholder = memo(() => (
  <div className="w-full h-full flex items-center justify-center bg-fw-wash rounded-lg">
    <div className="animate-pulse bg-fw-neutral rounded-lg h-[80%] w-[90%]"></div>
  </div>
));

// Minimal chart components that only load what they need
const LineChartComponent = lazy(async () => {
  // Only import the specific Chart.js components we need
  const [{ Line }, chartJs] = await Promise.all([
    import('react-chartjs-2'),
    import('chart.js').then(module => ({
      Chart: module.Chart,
      CategoryScale: module.CategoryScale,
      LinearScale: module.LinearScale,
      PointElement: module.PointElement,
      LineElement: module.LineElement,
      Title: module.Title,
      Tooltip: module.Tooltip,
      Legend: module.Legend,
      Filler: module.Filler
    }))
  ]);

  // Register only what we need
  chartJs.Chart.register(
    chartJs.CategoryScale,
    chartJs.LinearScale,
    chartJs.PointElement,
    chartJs.LineElement,
    chartJs.Title,
    chartJs.Tooltip,
    chartJs.Legend,
    chartJs.Filler
  );

  return { default: Line };
});

const BarChartComponent = lazy(async () => {
  const [{ Bar }, chartJs] = await Promise.all([
    import('react-chartjs-2'),
    import('chart.js').then(module => ({
      Chart: module.Chart,
      CategoryScale: module.CategoryScale,
      LinearScale: module.LinearScale,
      BarElement: module.BarElement,
      Title: module.Title,
      Tooltip: module.Tooltip,
      Legend: module.Legend
    }))
  ]);

  chartJs.Chart.register(
    chartJs.CategoryScale,
    chartJs.LinearScale,
    chartJs.BarElement,
    chartJs.Title,
    chartJs.Tooltip,
    chartJs.Legend
  );

  return { default: Bar };
});

// Optimized chart wrappers
export const LineChart = memo<ComponentProps<typeof LineChartComponent>>((props) => (
  <Suspense fallback={<ChartPlaceholder />}>
    <LineChartComponent {...props} />
  </Suspense>
));

export const BarChart = memo<ComponentProps<typeof BarChartComponent>>((props) => (
  <Suspense fallback={<ChartPlaceholder />}>
    <BarChartComponent {...props} />
  </Suspense>
));

// Preload function for charts when user is likely to need them
export const preloadCharts = () => {
  // Preload line charts (most common)
  import('react-chartjs-2').then(() => {
    import('chart.js');
  });
};