import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { SankeyChart as EChartsSankey } from 'echarts/charts';
import { TooltipComponent, TitleComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { VIZ_HEX } from '../../components/viz/kit';
import type { SankeyModel, SankeyNode } from './sankeyModel';

/**
 * The flow diagram, on a real layout engine.
 *
 * The hand-rolled version positioned nodes by stacking them in the order
 * they happened to be collected, which is fine for nine flows and falls
 * apart at bank scale: crossing ribbons, labels on top of each other, and
 * no way to interrogate anything. ECharts' sankey does the actual layout
 * (depth assignment, node ordering to minimise crossings, iterative
 * relaxation) and gives us the interactions this screen has always needed
 * - hover to isolate one path's whole journey, click to drill, tooltips
 * that state the real Gbps rather than a title attribute.
 *
 * Only the sankey chart, tooltip and canvas renderer are imported, so the
 * bundle carries the layout engine and nothing else.
 */
/* SVG, not canvas: it stays crisp at any zoom, matches every other
   visual in this product, keeps the diagram inspectable in the DOM (which
   is also what lets a test assert the chart rendered), and needs no canvas
   implementation under jsdom. */
echarts.use([EChartsSankey, TooltipComponent, TitleComponent, SVGRenderer]);

const r1 = (n: number) => Math.round(n * 10) / 10;

export interface SankeyChartProps {
  model: SankeyModel;
  /** Fired when a rollup node is clicked - the drill affordance. */
  onNodeClick?: (node: SankeyNode) => void;
  /** Node names to render as drilled/active. */
  activeName?: string | null;
  height?: number;
}

export function SankeyChart({ model, onNodeClick, activeName = null, height = 380 }: SankeyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chart.current = echarts.init(ref.current, undefined, { renderer: 'svg' });
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

    /* Colour still carries exactly one meaning app-wide: cobalt is on the
       AT&T fabric, slate is the public internet. A node inherits the story
       of the band it sits in. */
    const nodeColor = (n: SankeyNode) => {
      if (n.band === 'path') return n.name.includes('fabric') ? VIZ_HEX.cobalt : VIZ_HEX.slate;
      if (n.rollup) return VIZ_HEX.ink;
      return VIZ_HEX.inkSoft;
    };

    c.setOption(
      {
        tooltip: {
          trigger: 'item',
          triggerOn: 'mousemove',
          backgroundColor: '#ffffff',
          borderColor: VIZ_HEX.line,
          textStyle: { color: VIZ_HEX.ink, fontSize: 12 },
          formatter: (p: { dataType: string; name?: string; data?: { source?: string; target?: string }; value?: number }) => {
            if (p.dataType === 'edge') {
              return `${p.data?.source} → ${p.data?.target}<br/><b>${r1(Number(p.value))} Gbps</b>`;
            }
            return `<b>${p.name}</b><br/>${r1(Number(p.value))} Gbps`;
          },
        },
        series: [
          {
            type: 'sankey',
            left: 8,
            right: 8,
            top: 12,
            bottom: 12,
            nodeWidth: 14,
            nodeGap: 10,
            nodeAlign: 'justify',
            /* Let the engine order nodes to minimise crossings, then keep
               that order stable across re-renders so a drill does not
               reshuffle the whole picture under the viewer. */
            layoutIterations: 24,
            emphasis: {
              focus: 'trajectory',
              lineStyle: { opacity: 0.62 },
            },
            blur: { itemStyle: { opacity: 0.22 }, lineStyle: { opacity: 0.06 } },
            data: model.nodes.map(n => ({
              name: n.name,
              itemStyle: {
                color: nodeColor(n),
                borderWidth: n.name === activeName ? 2 : 0,
                borderColor: VIZ_HEX.skyCursor,
              },
              label: {
                color: VIZ_HEX.ink,
                fontSize: 11,
                fontWeight: n.rollup ? 700 : 500,
                /* A rollup node is clickable; say so. */
                formatter: n.rollup ? `${n.name} ▸` : n.name,
              },
            })),
            links: model.links.map(l => ({
              source: model.nodes[l.source]?.name ?? '',
              target: model.nodes[l.target]?.name ?? '',
              value: l.value,
              lineStyle: {
                color: l.pathKind === 'private' ? VIZ_HEX.cobalt : VIZ_HEX.slate,
                opacity: 0.28,
                curveness: 0.5,
              },
            })),
          },
        ],
      },
      { notMerge: true },
    );

    const handler = (params: { dataType?: string; name?: string }) => {
      if (params.dataType !== 'node') return;
      const node = model.nodes.find(n => n.name === params.name);
      if (node?.rollup) onNodeClick?.(node);
    };
    c.off('click');
    c.on('click', handler);
    c.resize();
  }, [model, activeName, onNodeClick]);

  return <div ref={ref} data-testid="sankey-chart" style={{ height }} className="w-full" />;
}
