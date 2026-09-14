import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

/**
 * The one chart surface.
 *
 * Every chart in this product goes through here, so the registration list
 * below is a single greppable statement of what the bundle carries: add a
 * type here or it does not exist. SVG rather than canvas - crisp at any
 * zoom, inspectable in the DOM (which is what lets a test assert a chart
 * rendered), and no canvas implementation needed under jsdom.
 */
echarts.use([
  BarChart,
  LineChart,
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
  ariaLabel,
}: {
  option: EChartsOption;
  height?: number;
  onEvent?: (params: { name?: string; dataIndex?: number; seriesName?: string; data?: unknown }) => void;
  testid?: string;
  ariaLabel?: string;
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
    // notMerge: a board re-renders on every engine tick, and a merged option
    // accumulates stale series the moment a drill changes the data's shape.
    c.setOption(option, { notMerge: true });
    c.resize();
  }, [option]);

  useEffect(() => {
    const c = chart.current;
    if (!c || !onEvent) return;
    const handler = (p: { name?: string; dataIndex?: number; seriesName?: string; data?: unknown }) => onEvent(p);
    c.on('click', handler);
    return () => {
      c.off('click', handler);
    };
  }, [onEvent]);

  return (
    <div
      ref={host}
      data-testid={testid}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      style={{ height }}
      className="w-full"
    />
  );
}
