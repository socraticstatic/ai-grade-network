// Ported verbatim (logic-for-logic) from ~/Developer/cloud-control/js/netops.js's
// signal(t) and drift(t). That file is the reference implementation for the
// NetOps for AI closed loop (Observe -> Diagnose -> Recommend -> Act) and the
// four capability panels. This module has no DOM/React dependency — it takes
// a telemetry snapshot (`t`, from `CC.telemetry(56)`) and the engine handle
// (`CC`) and returns plain data for NetOpsPage to render.
import type { CloudControl } from '../../engine';

export const STAGES = ['Observe', 'Diagnose', 'Recommend', 'Act'] as const;
export type NetOpsStage = (typeof STAGES)[number];

export interface NetOpsSignal {
  active: boolean;
  stage: NetOpsStage;
  title: string;
  /** trusted engine-generated HTML narrative (obsSummary() or anomaly.explain()) */
  diagnose: string;
  recLabel: string | null;
  apply: (() => void) | null;
  applied: () => boolean;
}

export interface DriftItem {
  name: string;
  delta: number;
}

/**
 * The live signal: a simulated onramp failure is the live incident that
 * opens the loop's Act stage with a real one-click mutation (restore the
 * path). Absent a live incident, the standing eu-west-1 transit anomaly is
 * observed and diagnosed in the panels below, and the shared postureCatalog
 * supplies the next hardening step as an informational Recommend hint — not
 * an armed Act, since standing governance backlog lives on the Posture/Govern
 * tab. Resolving the incident closes the loop back to steady.
 */
export function signal(t: any, CC: CloudControl): NetOpsSignal {
  const im = CC.simImpact();
  if (im) {
    return {
      active: true,
      stage: 'Act',
      title: im.onramp.name + ' down',
      diagnose: CC.obsSummary(),
      recLabel: 'Restore the failed path',
      apply: () => CC.clearSim(),
      applied: () => !CC.simImpact(),
    };
  }
  const rec = (CC.postureCatalog || [])
    .flatMap((c: any) => c.actions || [])
    .find((a: any) => a.apply && a.applied && !a.applied());
  const an = t.anomaly;
  return {
    active: false,
    stage: 'Observe',
    title: an.title,
    diagnose: an.explain(),
    recLabel: rec ? rec.label : null,
    apply: null,
    applied: () => true,
  };
}

/**
 * Drift: public-path regions whose latency series trends up across the
 * window (mean of last third vs first third). Reads the passed telemetry
 * snapshot only — no random values, no second recompute.
 */
export function drift(t: any): DriftItem[] {
  return t.regions
    .filter((r: any) => !r.attached)
    .map((r: any) => {
      const s: number[] = r.latency;
      const n = s.length;
      const third = Math.max(1, Math.floor(n / 3));
      const early = s.slice(0, third).reduce((a, b) => a + b, 0) / third;
      const late = s.slice(n - third).reduce((a, b) => a + b, 0) / third;
      return { name: r.cloudName + ' ' + r.name, delta: Math.round(late - early) };
    })
    .filter((d: DriftItem) => d.delta > 2)
    .sort((a: DriftItem, b: DriftItem) => b.delta - a.delta);
}
