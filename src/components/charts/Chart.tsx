import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import {
  BarChart,
  FunnelChart,
  GaugeChart,
  LineChart,
  PieChart,
  TreemapChart,
} from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

/**
 * The one chart surface.
 *
 * Every chart in this product goes through here so the registration list is
 * a single, greppable statement of what the bundle carries - add a chart
 * type once, here, or it does not exist. SVG rather than canvas: crisp at
 * any zoom, inspectable in the DOM (which is also what lets a test assert a
 * chart rendered), and no canvas implementation needed under jsdom.
 *
 * Sizing is the caller's job via `height`; the chart fills its container's
 * width and re-measures on resize, so a card can grow without the chart
 * needing to know it did.
 */
echarts.use([
  BarChart,
  FunnelChart,
  GaugeChart,
  LineChart,
  PieChart,
  TreemapChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  SVGRenderer,
]);

export function Chart({
  option,
  height = 180,
  onEvent,
  testid,
}: {
  option: EChartsOption;
  height?: number;
  /** Click handler, for charts that drill. */
  onEvent?: (params: { name?: string; dataIndex?: number; seriesName?: string }) => void;
  testid?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!host.current) return;
    chart.current = echarts.init(host.current, undefined, { renderer: 'svg' });
    const onResize = () => chart.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    // notMerge: a board re-renders on every engine tick and a merged option
    // would accumulate stale series when a drill changes the data's shape.
    c.setOption(option, { notMerge: true });
    c.resize();
  }, [option]);

  useEffect(() => {
    const c = chart.current;
    if (!c || !onEvent) return;
    const handler = (p: { name?: string; dataIndex?: number; seriesName?: string }) => onEvent(p);
    c.on('click', handler);
    return () => {
      c.off('click', handler);
    };
  }, [onEvent]);

  return <div ref={host} data-testid={testid} style={{ height }} className="w-full" />;
}
