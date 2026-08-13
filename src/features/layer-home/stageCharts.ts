import type { EChartsOption } from 'echarts';
import type { CloudControl } from '../../engine/types';
import { VIZ_HEX } from '../../components/viz/kit';
import { branchesOf, siteRollup, cloudRollup, SITE_CLASS_PLURAL } from '../discover/discoveryModel';
import { moneyOnTheTable } from '../discover/stackFigures';

/**
 * A chart per lifecycle stage, each answering that stage's own question.
 *
 * The stage cards used to state one figure and a caption, which is a fine
 * summary and a poor dashboard: an exec reading "1 of 8" cannot tell
 * whether that is improving, where the estate is concentrated, or which
 * part is stuck. Each stage now gets the shape its question deserves -
 * an estate is a treemap, a share is a gauge, a policy pipeline is a
 * funnel, and anything with a history is a trend.
 *
 * Every option here is pure data-to-option; nothing touches the DOM, so a
 * test can assert the shape of what a stage will draw.
 */

const nf = new Intl.NumberFormat('en-US');
const AXIS = { color: VIZ_HEX.slateInk, fontSize: 10 };

/** Discover: where the estate actually is, by class then metro. */
export function discoverTreemapOption(cc: CloudControl): EChartsOption {
  const byClass = siteRollup(cc);
  const branches = branchesOf(cc);
  const data = byClass.map(row => {
    const metros = new Map<string, number>();
    for (const b of branches) {
      if (b.siteClass !== row.siteClass) continue;
      metros.set(b.city, (metros.get(b.city) ?? 0) + 1);
    }
    /* Top metros by name, the rest folded - a treemap with 200 leaves is a
       mosaic nobody can read or click. */
    const top = [...metros.entries()].sort((a, b) => b[1] - a[1]);
    const shown = top.slice(0, 6);
    const restCount = top.slice(6).reduce((s, [, n]) => s + n, 0);
    return {
      name: `${nf.format(row.count)} ${SITE_CLASS_PLURAL[row.siteClass]}`,
      value: row.count,
      children: [
        ...shown.map(([city, n]) => ({ name: city, value: n })),
        ...(restCount > 0 ? [{ name: `Other · ${nf.format(restCount)}`, value: restCount }] : []),
      ],
    };
  });

  return {
    tooltip: { formatter: (p: { name?: string; value?: number }) => `${p.name}<br/><b>${nf.format(Number(p.value))} sites</b>` },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        top: 2,
        bottom: 2,
        left: 2,
        right: 2,
        levels: [
          { itemStyle: { borderColor: '#ffffff', borderWidth: 2, gapWidth: 2 } },
          {
            colorSaturation: [0.25, 0.55],
            itemStyle: { borderColorSaturation: 0.6, gapWidth: 1, borderWidth: 1 },
          },
        ],
        color: [VIZ_HEX.cobalt, '#3374cc', '#7aa6d6', VIZ_HEX.slate],
        label: { fontSize: 10, color: '#ffffff', overflow: 'truncate' },
        upperLabel: { show: true, height: 16, fontSize: 10, color: '#ffffff' },
        data,
      },
    ],
  };
}

/** Connect: how much of the estate actually reaches AT&T. */
export function connectGaugeOption(cc: CloudControl): EChartsOption {
  const fabric = cc.fabricModel();
  const attached = fabric.regions.filter(r => r.attached).length;
  const total = fabric.regions.length || 1;
  const pct = Math.round((attached / total) * 100);
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        radius: '92%',
        center: ['50%', '68%'],
        progress: { show: true, width: 14, itemStyle: { color: pct < 100 ? '#b3541e' : VIZ_HEX.cobalt } },
        axisLine: { lineStyle: { width: 14, color: [[1, VIZ_HEX.line]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-4%'],
          fontSize: 26,
          fontWeight: 700,
          color: VIZ_HEX.ink,
          formatter: `${attached} of ${total}`,
        },
        data: [{ value: pct }],
      },
    ],
  };
}

/** Govern: the policy pipeline, and where it stalls. */
export function governFunnelOption(cc: CloudControl): EChartsOption {
  const rules = (cc.ruleList?.() ?? []) as { id: string }[];
  const enforced = rules.filter(r => cc.ruleEnforced?.(r) ?? false).length;
  return {
    tooltip: {
      formatter: (p: { name?: string }) =>
        p.name === 'Enforced' ? `Enforced<br/><b>${enforced} of ${rules.length}</b>` : `Authored<br/><b>${rules.length}</b>`,
    },
    series: [
      {
        type: 'funnel',
        top: 4,
        bottom: 4,
        left: '4%',
        right: '4%',
        minSize: '28%',
        gap: 3,
        label: { position: 'inside', fontSize: 10, color: '#ffffff', formatter: '{b}: {c}' },
        itemStyle: { borderWidth: 0 },
        /* Two stages, because a funnel claims SEQUENCE: a policy is
           authored, then enforced. Open findings are an outcome, not a
           step between them - putting them in the funnel implied every
           finding was a policy on its way to enforcement. They stay on the
           card's own detail line, where they already were. */
        sort: 'none',
        data: [
          { name: 'Authored', value: rules.length, itemStyle: { color: '#7aa6d6' } },
          {
            name: 'Enforced',
            // A zero stage still needs a visible sliver, or the funnel
            // renders as one block and the gap it is reporting disappears.
            value: Math.max(enforced, rules.length * 0.06),
            label: { formatter: `Enforced: ${enforced}` },
            itemStyle: { color: enforced === 0 ? '#b3541e' : VIZ_HEX.cobalt },
          },
        ],
      },
    ],
  };
}

/** Observe: 60 days of traffic, split by the path it took. */
export function observeTrendOption(cc: CloudControl): EChartsOption {
  const t = cc.telemetry(60) as { egress: { pub: number; priv: number }[] };
  const days = t.egress.map((_, i) => `D-${t.egress.length - i}`);
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 6, right: 6, top: 8, bottom: 4, containLabel: true },
    xAxis: { type: 'category', data: days, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { lineStyle: { color: VIZ_HEX.line } } },
    yAxis: { type: 'value', axisLabel: AXIS, splitLine: { lineStyle: { color: VIZ_HEX.line, type: 'dashed' } } },
    series: [
      {
        name: 'AT&T fabric',
        type: 'line',
        stack: 'total',
        areaStyle: { color: VIZ_HEX.cobalt, opacity: 0.55 },
        lineStyle: { width: 0 },
        symbol: 'none',
        data: t.egress.map(e => Math.round(e.priv)),
      },
      {
        name: 'Public internet',
        type: 'line',
        stack: 'total',
        areaStyle: { color: VIZ_HEX.slate, opacity: 0.5 },
        lineStyle: { width: 0 },
        symbol: 'none',
        data: t.egress.map(e => Math.round(e.pub)),
      },
    ],
  };
}

/** Cost: the widening gap between hyperscaler rates and the fabric. */
export function costTrendOption(cc: CloudControl): EChartsOption {
  const t = cc.telemetry(60) as { egress: { pub: number; priv: number }[] };
  const arb = cc.arbitrage() as { hyperscalerBill: number; cloudConnectBill: number };
  const actual = t.egress.map(e => Math.round(e.pub + e.priv));
  const ratio = arb.cloudConnectBill > 0 ? arb.hyperscalerBill / arb.cloudConnectBill : 1;
  const hyper = actual.map(v => Math.round(v * ratio));
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 6, right: 6, top: 8, bottom: 4, containLabel: true },
    xAxis: { type: 'category', data: actual.map((_, i) => i), axisLabel: { show: false }, axisTick: { show: false }, axisLine: { lineStyle: { color: VIZ_HEX.line } } },
    yAxis: { type: 'value', axisLabel: AXIS, splitLine: { lineStyle: { color: VIZ_HEX.line, type: 'dashed' } } },
    series: [
      {
        name: 'At hyperscaler rates',
        type: 'line',
        symbol: 'none',
        lineStyle: { color: VIZ_HEX.slate, width: 2 },
        /* The band between the lines IS the saving, so it is drawn as one
           shape rather than left for the reader to imagine. */
        areaStyle: { color: VIZ_HEX.cobalt, opacity: 0.12 },
        data: hyper,
      },
      {
        name: 'On the fabric',
        type: 'line',
        symbol: 'none',
        lineStyle: { color: VIZ_HEX.cobalt, width: 2 },
        areaStyle: { color: '#ffffff', opacity: 1 },
        data: actual,
      },
    ],
  };
}

/** The money split, for the hero. */
export function moneySplitOption(cc: CloudControl): EChartsOption {
  const t = moneyOnTheTable(cc);
  return {
    tooltip: { formatter: (p: { name?: string; value?: number }) => `${p.name}<br/><b>${p.value} moves</b>` },
    series: [
      {
        type: 'pie',
        radius: ['62%', '88%'],
        avoidLabelOverlap: false,
        label: { show: false },
        itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
        data: [
          { name: 'Regions to attach', value: t.attachMoves, itemStyle: { color: VIZ_HEX.cobalt } },
          { name: 'Flows to steer', value: t.steerMoves, itemStyle: { color: '#7aa6d6' } },
        ],
      },
    ],
  };
}
