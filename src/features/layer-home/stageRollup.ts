import type { CloudControl } from '../../engine/types';
import { branchesOf, cloudRollup } from '../discover/discoveryModel';
import { moneyOnTheTable } from '../discover/stackFigures';
import { aiSpendTotals, fmtTokens, fmtUsd } from '../ai-fabric/aiSpend';
import type { Surface } from './dashboard/registry';

/**
 * The layer board as a meta-rollup of its own lifecycle.
 *
 * A layer home that states money and risk but says nothing about Discover,
 * Connect, Govern, Observe or Cost is not an overview of the layer - it is
 * one more screen with its own opinion. This gives each stage a row of its
 * own, and each row states the PROOF METRIC the deck's value map assigned
 * to that stage, not a number we found convenient:
 *
 *   Discover  - accounts, regions, workloads, tags discovered
 *   Connect   - path state: how much of the estate is actually attached
 *   Observe   - traffic coverage %, bottlenecks
 *   Govern    - policy gaps closed, public paths removed
 *   Cost      - avoidable egress, dollars saved
 *
 * Every figure is engine-derived and every row is a door into the stage
 * that owns it, so the board answers "where am I in the lifecycle" without
 * claiming to be the place the work happens.
 */

export interface StageCard {
  key: string;
  /** The verb, as the rail names it. */
  label: string;
  /** The stage's headline figure - its proof metric. */
  value: string;
  /** What that figure measures, in the customer's words. */
  caption: string;
  /** One supporting figure, or null when the stage has only one thing to say. */
  detail: string | null;
  to: string;
  /** Progress 0..1 where the stage has an honest denominator; else null. */
  progress: number | null;
  /** True when this stage is where the estate is currently losing. */
  alarm?: boolean;
}

const pct = (n: number) => `${Math.round(n)}%`;
const nf = new Intl.NumberFormat('en-US');

export function stageRollup(cc: CloudControl, surface: Surface): StageCard[] {
  const report = cc.assessmentReport() as { securityEvents: number; invisibleSharePct: number };
  const rules = (cc.ruleList?.() ?? []) as { id: string }[];
  const enforced = rules.filter(r => (cc.ruleEnforced?.(r) ?? false)).length;

  if (surface === 'ai') {
    const t = aiSpendTotals(cc);
    const governedPct = t.tokensToday > 0 ? (t.governedTokensToday / t.tokensToday) * 100 : 0;
    return [
      {
        key: 'discover',
        label: 'Discover',
        value: String(t.identityCount),
        caption: 'agent identities spending tokens',
        detail: `${fmtTokens(t.tokensToday)} tokens today`,
        to: '/discover',
        progress: null,
      },
      {
        key: 'connect',
        label: 'Connect',
        value: `${t.endpointReadyCount} of ${t.identityCount}`,
        caption: 'model endpoints ready',
        detail: t.publicPathCount > 0 ? `${t.publicPathCount} still on a public path` : 'all on a private path',
        to: '/ai/providers',
        progress: t.identityCount ? t.endpointReadyCount / t.identityCount : null,
        alarm: t.publicPathCount > 0,
      },
      {
        key: 'govern',
        label: 'Govern',
        value: pct(governedPct),
        caption: 'of tokens under a policy',
        detail: `${t.meteringCount} of ${t.identityCount} metered`,
        to: '/ai/govern',
        progress: governedPct / 100,
        alarm: governedPct < 100,
      },
      {
        key: 'observe',
        label: 'Observe',
        value: fmtTokens(t.ungovernedTokensToday),
        caption: 'tokens running unwatched today',
        detail: `${report.securityEvents} open security findings`,
        to: '/ai/observe',
        progress: null,
        alarm: t.ungovernedTokensToday > 0,
      },
      {
        key: 'cost',
        label: 'Cost',
        value: fmtUsd(t.spendToday),
        caption: 'token spend today',
        detail: t.savings > 0 ? `${fmtUsd(t.savings)} saved vs external rates` : null,
        to: '/ai/cost',
        progress: null,
      },
    ];
  }

  const fabric = cc.fabricModel();
  const regionsAttached = fabric.regions.filter(r => r.attached).length;
  const regionsTotal = fabric.regions.length;
  const egress = cc.egress() as { pub: number; priv: number; total: number };
  const privShare = egress.total > 0 ? (egress.priv / egress.total) * 100 : 0;
  const sites = branchesOf(cc);
  const onNet = sites.filter(b => b.onrampId).length;
  const clouds = cloudRollup(cc);
  const workloads = clouds.reduce((s, c) => s + c.workloads, 0);
  const table = moneyOnTheTable(cc);

  return [
    {
      key: 'discover',
      label: 'Discover',
      value: nf.format(sites.length),
      caption: 'sites across the estate',
      detail: `${clouds.length} clouds · ${nf.format(workloads)} workloads`,
      to: '/discover',
      progress: null,
    },
    {
      key: 'connect',
      label: 'Connect',
      value: `${regionsAttached} of ${regionsTotal}`,
      caption: 'cloud regions on the AT&T fabric',
      detail: `${nf.format(onNet)} of ${nf.format(sites.length)} sites reach us today`,
      to: '/naas/connect',
      progress: regionsTotal ? regionsAttached / regionsTotal : null,
      alarm: regionsAttached < regionsTotal,
    },
    {
      key: 'govern',
      label: 'Govern',
      value: `${enforced} of ${rules.length}`,
      caption: 'policies enforced, not just authored',
      detail: `${report.securityEvents} open security findings`,
      to: '/naas/govern',
      progress: rules.length ? enforced / rules.length : null,
      alarm: report.securityEvents > 0,
    },
    {
      key: 'observe',
      label: 'Observe',
      value: pct(privShare),
      caption: 'of egress on an AT&T path',
      detail: `${pct(report.invisibleSharePct)} of traffic still invisible`,
      to: '/naas/observe',
      progress: privShare / 100,
      alarm: privShare < 100,
    },
    {
      key: 'cost',
      label: 'Cost',
      value: `${fmtUsd(egress.pub)}/mo`,
      caption: 'egress still on public transit',
      detail: `${fmtUsd(table.savingsMo)}/mo recoverable`,
      to: '/naas/cost',
      progress: null,
      alarm: egress.pub > 0,
    },
  ];
}
