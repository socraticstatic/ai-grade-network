import type { EChartsOption } from 'echarts';
import type { CloudControl } from '../../engine/types';
import { VIZ_HEX } from '../../components/viz/kit';

/**
 * One chart grammar, repeated on every stage card.
 *
 * The first attempt gave each stage a different shape - treemap, gauge,
 * funnel, area, line - inside an 86px card. Small multiples only work when
 * the form REPEATS: the eye compares identical shapes and reads the
 * difference. Five different shapes at that size was a zoo, and each one
 * was too small to say anything its own caption did not already say.
 *
 * So every card gets the same two elements, in the same order:
 *
 *   1. A BULLET BAR - the canonical small-dashboard answer to "how far
 *      along is this, and is that good?". Actual as a solid bar, the
 *      target as a tick, and the qualitative range behind it. Comparable
 *      across cards, legible at 22px, and no wasted ink (Few, Tufte).
 *   2. A SPARKLINE, but only where a real 60-day series exists. Three of
 *      the five stages have no history in this engine, and inventing one
 *      to complete a pattern would be the exact dishonesty this product
 *      spends its whole design budget avoiding.
 */

/**
 * Progress toward the stage's own definition of done, 0..1.
 *
 * Every stage's bar means the same thing - "how much of this stage is
 * finished" - which is what makes them comparable. A card whose stage has
 * no honest denominator gets no bar rather than a made-up one.
 */
export function stageProgress(cc: CloudControl, key: string): number | null {
  const fabric = cc.fabricModel();
  const egress = cc.egress() as { pub: number; priv: number; total: number };
  switch (key) {
    case 'discover': {
      const branches = (cc.branches ?? []) as { onrampId?: string }[];
      if (branches.length === 0) return null;
      return branches.filter(b => b.onrampId).length / branches.length;
    }
    case 'connect': {
      if (fabric.regions.length === 0) return null;
      return fabric.regions.filter(r => r.attached).length / fabric.regions.length;
    }
    case 'govern': {
      const rules = (cc.ruleList?.() ?? []) as { id: string }[];
      if (rules.length === 0) return null;
      return rules.filter(r => cc.ruleEnforced?.(r) ?? false).length / rules.length;
    }
    case 'observe':
    case 'cost':
      return egress.total > 0 ? egress.priv / egress.total : null;
    default:
      return null;
  }
}

/**
 * The bullet bar. `share` is 0..1; the target is always 100% because every
 * stage's finished state is "all of it", and a target a viewer has to look
 * up is a target that fails at 22px.
 */
export function bulletOption(share: number, alarm: boolean): EChartsOption {
  const pct = Math.round(share * 100);
  return {
    animation: false,
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: { type: 'category', data: [''], show: false },
    series: [
      // The qualitative range behind the measure - what "the whole job"
      // looks like, so the bar is read against something.
      {
        type: 'bar',
        stack: 'bg',
        barWidth: 10,
        silent: true,
        itemStyle: { color: VIZ_HEX.line, borderRadius: 5 },
        data: [100],
        z: 1,
      },
      {
        type: 'bar',
        barWidth: 10,
        barGap: '-100%',
        itemStyle: { color: alarm ? '#b3541e' : VIZ_HEX.cobalt, borderRadius: 5 },
        data: [pct],
        z: 2,
        markLine: {
          silent: true,
          symbol: 'none',
          animation: false,
          lineStyle: { color: VIZ_HEX.ink, width: 2 },
          label: { show: false },
          data: [{ xAxis: 100 }],
        },
      },
    ],
  };
}

/** A 60-day sparkline. Only called where the engine actually has history. */
export function sparkOption(values: number[], alarm: boolean): EChartsOption {
  return {
    animation: false,
    grid: { left: 0, right: 0, top: 2, bottom: 0 },
    xAxis: { type: 'category', data: values.map((_, i) => i), show: false },
    yAxis: { type: 'value', show: true, axisLabel: { show: false }, axisLine: { show: false }, splitLine: { show: false } },
    series: [
      {
        type: 'line',
        symbol: 'none',
        smooth: true,
        lineStyle: { width: 1.5, color: alarm ? '#b3541e' : VIZ_HEX.cobalt },
        areaStyle: { color: alarm ? '#b3541e' : VIZ_HEX.cobalt, opacity: 0.12 },
        data: values,
      },
    ],
  };
}

/**
 * The 60-day series a stage can honestly draw, or null.
 *
 * Only egress carries history in this engine, so Observe and Cost get a
 * sparkline and the other three do not. That asymmetry is the honest
 * report, not an oversight.
 */
export function stageSeries(cc: CloudControl, key: string): number[] | null {
  if (key !== 'observe' && key !== 'cost') return null;
  const t = cc.telemetry(60) as { egress: { pub: number; priv: number }[] };
  if (!t?.egress?.length) return null;
  return key === 'observe'
    ? t.egress.map(e => Math.round(e.priv + e.pub))
    : t.egress.map(e => Math.round(e.pub));
}
