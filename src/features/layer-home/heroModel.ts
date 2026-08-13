import type { CloudControl } from '../../engine/types';
import { moneyOnTheTable } from '../discover/stackFigures';
import { aiSpendTotals, fmtTokens, fmtUsd } from '../ai-fabric/aiSpend';
import type { Surface } from './dashboard/registry';

/**
 * What a layer's home screen leads with.
 *
 * The board it replaces opened on a product definition ("Network as a
 * service - the paths, the policy on them, and what they cost") and put its
 * biggest box around an EMPTY widget while the one number an exec came for
 * sat in the smallest. Two rules from the brainstorm fix that:
 *
 *   "value on top, evidence below" - lead with the answer, then the proof.
 *   "the right measurements with the right labels" - and only those.
 *
 * So a layer states one headline figure, three risks worth acting on, and
 * nothing else above the fold. Every figure carries the route to the screen
 * that resolves it: a number an exec cannot act on is a number that should
 * not be on an exec's screen.
 */

export interface HeroStat {
  label: string;
  value: string;
  /** Where this gets resolved. Every stat is a door. */
  to: string;
  /** True when this reads as exposure rather than progress. */
  alarm?: boolean;
}

/** The headline figure broken into the parts that sum to it. */
export interface HeroSplit {
  key: string;
  label: string;
  value: number;
  hex: string;
}

export interface LayerHero {
  /** The layer's argument, in one sentence. */
  verdict: string;
  headline: { value: string; label: string; to: string; cta: string };
  /** What the headline is made of - drawn as a SplitBar under it. */
  split: HeroSplit[];
  evidence: { label: string; value: string }[];
  source: string;
  risks: HeroStat[];
}

const pct = (n: number) => `${Math.round(n)}%`;
const nf = new Intl.NumberFormat('en-US');

export function layerHero(cc: CloudControl, surface: Surface): LayerHero {
  const report = cc.assessmentReport() as {
    securityEvents: number;
    invisibleSharePct: number;
  };

  if (surface === 'ai') {
    const t = aiSpendTotals(cc);
    const ungovernedPct = t.tokensToday > 0 ? (t.ungovernedTokensToday / t.tokensToday) * 100 : 0;
    return {
      verdict:
        t.ungovernedTokensToday > 0
          ? `${pct(ungovernedPct)} of today's tokens ran with no policy holding them.`
          : `Every token today ran under a policy.`,
      headline: {
        value: fmtUsd(t.spendToday),
        label: 'spent on tokens today',
        to: '/ai/cost',
        cta: 'See the spend',
      },
      split: [
        { key: 'ungoverned', label: 'No policy holding it', value: t.ungovernedTokensToday, hex: '#b3541e' },
        { key: 'governed', label: 'Under a policy', value: t.governedTokensToday, hex: '#0057b8' },
      ],
      evidence: [
        { label: 'Identities spending', value: String(t.identityCount) },
        { label: 'Metered by a policy', value: `${t.meteringCount} of ${t.identityCount}` },
        { label: 'Tokens today', value: fmtTokens(t.tokensToday) },
      ],
      source: "Read from this estate's own token meters - the same figures /ai/cost states per identity.",
      risks: [
        {
          label: 'ungoverned tokens today',
          value: fmtTokens(t.ungovernedTokensToday),
          to: '/ai/govern',
          alarm: t.ungovernedTokensToday > 0,
        },
        {
          label: 'model endpoints on a public path',
          value: String(t.publicPathCount),
          to: '/ai/connect',
          alarm: t.publicPathCount > 0,
        },
        {
          label: 'open security findings',
          value: String(report.securityEvents),
          to: '/ai/govern',
          alarm: report.securityEvents > 0,
        },
      ],
    };
  }

  const table = moneyOnTheTable(cc);
  const egressPub = (cc.egress() as { pub: number }).pub;
  return {
    verdict:
      /* Deliberately does NOT restate the headline dollar figure below it -
         the same number twice on one screen is what the phase-0 audit spent
         89 rows removing. The verdict frames; the figure states. */
      table.savingsMo > 0
        ? `${table.moves} priced ${table.moves === 1 ? 'move is' : 'moves are'} waiting on a decision, and ${pct(report.invisibleSharePct)} of your traffic is still invisible.`
        : `Every priced move on this estate has been taken.`,
    headline: {
      value: `${fmtUsd(table.savingsMo)}/mo`,
      label: `on the table across ${table.moves} ${table.moves === 1 ? 'move' : 'moves'} the advisor can act on now`,
      to: '/discover?draft=andi',
      cta: `Review ${table.moves} ${table.moves === 1 ? 'move' : 'moves'}`,
    },
    split: [
      { key: 'public', label: 'Public internet', value: egressPub, hex: '#94a3b8' },
      { key: 'private', label: 'AT&T fabric', value: (cc.egress() as { priv: number }).priv, hex: '#0057b8' },
    ],
    evidence: [
      { label: 'Regions to attach', value: String(table.attachMoves) },
      { label: 'Flows to steer onto the fabric', value: String(table.steerMoves) },
    ],
    source: "Priced from this estate's own egress and path data - the same figures the advisor quotes on Discover.",
    risks: [
      {
        label: 'egress on public transit',
        value: `${fmtUsd(egressPub)}/mo`,
        to: '/naas/cost',
        alarm: egressPub > 0,
      },
      {
        label: 'of traffic you cannot see',
        value: pct(report.invisibleSharePct),
        to: '/naas/observe',
        alarm: report.invisibleSharePct > 0,
      },
      {
        label: 'open security findings',
        value: String(report.securityEvents),
        to: '/naas/govern',
        alarm: report.securityEvents > 0,
      },
    ],
  };
}
