import type { CloudControl } from '../../engine/types';
import { attachOpportunities, steerOpportunities } from '../discover/stackFigures';
import { THREADS } from '../discover/IntentThreads';

/**
 * The one task derivation: every priced move waiting for a human, tagged
 * with the lifecycle stage and layer it belongs to. The advisor chip,
 * Andi's Resolve and the /work office are all lenses over this list -
 * three doors, one queue. Derived per read from the same opportunity and
 * intent readings every other surface states; nothing here is a new fact.
 */

export type LifecycleStage = 'connect' | 'govern' | 'observe' | 'cost';

export interface WorkRow {
  id: string;
  stage: LifecycleStage;
  layer: 'naas' | 'ai' | 'estate';
  label: string;
  detail: string;
  /** $/mo the engine prices for this task; null when it prices nothing. */
  priceMo: number | null;
  source: 'advisor' | 'intent' | 'lifecycle';
  /** Present on intent rows: Synchronize navigates ?draft=intent-<id>. */
  intentId?: string;
  status?: 'drifting' | 'violated';
}

const STAGE_ORDER: LifecycleStage[] = ['connect', 'govern', 'observe', 'cost'];

/** The layer an intent's task belongs to, read off its thread map. */
function intentLayer(key: string): WorkRow['layer'] {
  const strata = THREADS[key] ?? [];
  if (strata.includes('ai')) return 'ai';
  if (strata.includes('naas') || strata.includes('transport')) return 'naas';
  return 'estate';
}

export function workQueue(cc: CloudControl): WorkRow[] {
  const rows: WorkRow[] = [];

  // Advisor attaches: putting a region on the fabric is Connect-stage work.
  for (const o of attachOpportunities(cc)) {
    rows.push({
      id: `attach-${o.regionId}`,
      stage: 'connect',
      layer: 'naas',
      label: `Attach ${o.label}`,
      detail: `${o.publicMs}ms to ${o.privateMs}ms on the fabric${o.bucketLabel ? ` · ${o.bucketLabel}` : ''}`,
      priceMo: o.bucketSavingMo,
      source: 'advisor',
    });
  }

  // Advisor steers: keeping egress money is Cost-stage work.
  for (const o of steerOpportunities(cc)) {
    rows.push({
      id: `steer-${o.flowId}`,
      stage: 'cost',
      layer: 'naas',
      label: `Steer ${o.label}`,
      detail: o.detail,
      priceMo: o.egressSavingMo,
      source: 'advisor',
    });
  }

  // Misaligned intents: a promise out of true is Govern-stage work.
  for (const i of cc.intentList()) {
    if (i.reading.status === 'aligned') continue;
    rows.push({
      id: `intent-${i.id}`,
      stage: 'govern',
      layer: intentLayer(i.key),
      label: i.scope.label,
      detail: i.reading.evidence,
      priceMo: null,
      source: 'intent',
      intentId: i.id,
      status: i.reading.status as 'drifting' | 'violated',
    });
  }

  // Provisioned-but-idle circuits: lifecycle debt, Connect-stage.
  for (const o of (cc.onramps as { id: string; name: string; active: boolean; sub?: string }[])
    .filter(o => !o.active && o.sub && o.sub.includes('ready to attach'))) {
    rows.push({
      id: `circuit-${o.id}`,
      stage: 'connect',
      layer: 'naas',
      label: `Attach ${o.name}`,
      detail: 'Provisioned and idle - paid for, carrying nothing.',
      priceMo: null,
      source: 'lifecycle',
    });
  }

  // Violated before drifting inside a stage; stages in lifecycle order;
  // priced rows lead the advisor set, largest saving first.
  return rows.sort((a, b) => {
    const stage = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
    if (stage !== 0) return stage;
    const sev = (r: WorkRow) => (r.status === 'violated' ? 0 : r.status === 'drifting' ? 1 : 2);
    if (sev(a) !== sev(b)) return sev(a) - sev(b);
    return (b.priceMo ?? -1) - (a.priceMo ?? -1);
  });
}

export function workByStage(rows: WorkRow[]): { stage: LifecycleStage; rows: WorkRow[] }[] {
  return STAGE_ORDER
    .map(stage => ({ stage, rows: rows.filter(r => r.stage === stage) }))
    .filter(g => g.rows.length > 0);
}
