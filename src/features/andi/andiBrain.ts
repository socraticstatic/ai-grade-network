import type { CloudControl } from '../../engine/types';
import type { NavLayer } from '../../components/navigation/navItems';
import { parseIntent, type Command } from '../command/commandRegistry';
import { aiSpendRows, aiSpendTotals, fmtTokens, fmtUsd } from '../ai-fabric/aiSpend';
import { advisorDraft, attachOpportunities, steerOpportunities } from '../discover/stackFigures';
import { workQueue } from '../work/workQueue';
import { ruleProposals } from '../govern/ruleProposals';
import { spineAnswer } from './andiSpine';
import { advisorFindings, advisorHeadline } from '../advisor/advisorModel';
import { ladderFor } from '../advisor/offerCatalog';

/**
 * Andi's brain — a router over things the ENGINE can ground, never a
 * pretend LLM. Five sources, in order:
 *   1. typed intents (commandRegistry.parseIntent — cap/attach/steer),
 *      returned as a confirm-to-run action, never auto-executed;
 *   1.5. spine navigation (andiSpine.spineAnswer) — an utterance asking to
 *      GO to a spine screen (Discover/Connect/Observe/Cost) is answered
 *      with that screen's own verdict sentence and one navigate action;
 *      analytic phrasing of the same keywords ("why is egress cost up")
 *      falls through past this step;
 *   2. AI-layer questions answered from aiSpend derivations;
 *   3. the engine's own grounded answer engine (CC.answerFor) for the
 *      network questions it already recognizes;
 *   4. advisor questions (the /discover/advisor rail's three seeded chips —
 *      "Why this finding?", "How much do I save?", "What is NetBond Adv?" —
 *      and close phrasings of them) answered from advisorModel's findings/
 *      headline and offerCatalog's ladder, the same figures that screen
 *      itself states.
 * Anything else gets an honest "can't ground that" with live suggestions.
 * Every figure in every answer is computed at ask time from engine state.
 */

export interface AndiAction {
  label: string;
  kind: 'run' | 'navigate' | 'ask';
  /** For kind 'run': executes the command. For 'navigate': the destination.
   *  For 'ask': the prompt the panel re-asks. */
  run?: () => void;
  to?: string;
  prompt?: string;
}

export interface AndiAnswer {
  /** Plain text answer (preferred). */
  text?: string;
  /** Engine-authored HTML (CC.answerFor output only — never user input). */
  html?: string;
  actions: AndiAction[];
}

/** Suggested prompts for the current layer — each one answerable. */
export function andiSuggestions(layerKey: NavLayer['key'] | null): string[] {
  if (layerKey === 'ai') {
    return [
      'Which team is driving most spend?',
      'Summarize AI health',
      'Which model is most cost effective?',
    ];
  }
  if (layerKey === 'naas') {
    return [
      'Why is egress cost up?',
      'What is the 90-day forecast?',
      'What should the attach order be?',
    ];
  }
  return [
    'Which team is driving most spend?',
    'Why is egress cost up?',
    'What should the attach order be?',
  ];
}

export interface ResolveCard {
  title: string;
  detail: string;
  savingMo: number | null;
  /** 'draft' opens the advisor draft; an intent card synchronizes itself;
   *  a 'proposal' card stages the preventive rule for a live finding. */
  move: 'draft' | 'intent' | 'proposal';
  /** Intent cards only. */
  intentId?: string;
  status?: 'drifting' | 'violated';
  mode?: 'watch' | 'enforce';
  hasMoves?: boolean;
  /** Proposal cards only. */
  proposalId?: string;
  ruleName?: string;
  /** The rule "Enforce it" enforces. Without it the card could only navigate
   *  somewhere and hope; with it the button does what it says. */
  ruleId?: string;
  severity?: 'crit' | 'high';
}

/** Resolve cards: a LENS over the one work queue (workQueue.ts) - the same
 *  rows /work lists in full. Proposal cards (live findings joined to their
 *  preventive rule) lead, since they are the most severe attention the
 *  estate can ask for; intent rows follow (the queue already orders
 *  violated first); the top priced advisor rows follow as draft cards. */
export function andiResolveCards(cc: CloudControl): ResolveCard[] {
  const queue = workQueue(cc);
  const intents = cc.intentList?.() ?? [];
  const proposalCards: ResolveCard[] = ruleProposals(cc).map(p => ({
    title: p.title,
    detail: `${p.detail} Enforcing ${p.ruleName} would match ${p.impact.matched} flows carrying ${p.impact.gbps} Gbps.`,
    savingMo: null,
    move: 'proposal',
    proposalId: p.id,
    ruleName: p.ruleName,
    ruleId: p.ruleId,
    severity: p.severity,
  }));
  const intentCards: ResolveCard[] = queue
    .filter(r => r.source === 'intent' && r.intentId)
    .map(r => {
      const i = intents.find(x => x.id === r.intentId)!;
      return {
        title: r.detail,
        detail: `${r.label} · ${r.status} · ${i.mode} mode`,
        savingMo: null,
        move: 'intent' as const,
        intentId: r.intentId,
        status: r.status,
        mode: i.mode,
        hasMoves: i.reading.moves.length > 0,
      };
    });
  return [...proposalCards, ...intentCards, ...draftCards(cc)];
}

function draftCards(cc: CloudControl): ResolveCard[] {
  const attaches = attachOpportunities(cc)
    .filter(o => o.bucketSavingMo !== null)
    .sort((a, b) => (b.bucketSavingMo ?? 0) - (a.bucketSavingMo ?? 0))
    .slice(0, 2)
    .map(o => ({
      title: `Attach ${o.label}`,
      detail: `${o.publicMs}→${o.privateMs} ms on the fabric`,
      savingMo: o.bucketSavingMo,
      move: 'draft' as const,
    }));
  const steers = steerOpportunities(cc)
    .filter(o => o.egressSavingMo !== null)
    .slice(0, 1)
    .map(o => ({
      title: `Steer ${o.label} onto the fabric`,
      detail: o.detail,
      savingMo: o.egressSavingMo,
      move: 'draft' as const,
    }));
  return [...attaches, ...steers];
}

/** The rail's own $/mo formatting (advisorModel.ts's private `money`
 *  helper, restated here — advisorModel does not export it, and this
 *  module states its own copy of the figure end to end, same as
 *  advisorModel states its own copy of every finding's prose). */
const advisorMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;

/** The three seeded questions the /discover/advisor rail's chips offer —
 *  AdvisorRail sources its chip labels from this list so the label a user
 *  clicks always matches a question this brain can actually answer. */
export function advisorSuggestions(): string[] {
  return ['Why this finding?', 'How much do I save?', 'What is NetBond Adv?'];
}

/** Source 4 — advisor findings/headline/offer-ladder questions. Matches on
 *  keyword, not exact phrase, so close phrasings of the three seeded
 *  questions ("finding", "save", "netbond") answer the same way the chip
 *  does. Returns null for anything else, so the router falls through to
 *  its other sources unchanged. */
function advisorAnswer(cc: CloudControl, q: string): AndiAnswer | null {
  if (/finding/i.test(q)) {
    const flagship = advisorFindings(cc)[0];
    if (!flagship) return null;
    return {
      text: `${flagship.title} ${flagship.evidence}`,
      actions: [{ label: 'See the findings', kind: 'navigate', to: '/discover/advisor' }],
    };
  }
  if (/sav(e|ing)/i.test(q)) {
    const headline = advisorHeadline(cc);
    const word = headline.findings === 1 ? 'finding' : 'findings';
    return {
      text: `${advisorMoney(headline.savingsMo)}/mo, across ${headline.findings} live ${word} the estate carries right now.`,
      actions: [{ label: 'See the savings', kind: 'navigate', to: '/discover/advisor' }],
    };
  }
  if (/netbond/i.test(q)) {
    // Grounded to whichever LIVE finding actually offers a NetBond Adv
    // tier — the flagship if it carries one, else the next live finding
    // that does. Falls back to the catalog's own definition (unattached-
    // regions carries the tier for every estate) so the question stays
    // answerable even on an estate with no live finding of that kind.
    const fromLive = advisorFindings(cc)
      .map(f => ladderFor(f.kind).find(t => t.name === 'NetBond Adv'))
      .find(Boolean);
    const tier = fromLive ?? ladderFor('unattached-regions').find(t => t.name === 'NetBond Adv');
    if (!tier) return null;
    return {
      text: tier.tagline,
      actions: [{ label: tier.name, kind: 'navigate', to: tier.route }],
    };
  }
  return null;
}

function aiAnswer(cc: CloudControl, q: string): AndiAnswer | null {
  const totals = aiSpendTotals(cc);
  if (/team.*(spend|driv)|spend.*team|most spend/i.test(q)) {
    const rows = [...aiSpendRows(cc)].sort((a, b) => b.spendToday - a.spendToday);
    const top = rows[0];
    if (!top || totals.spendToday === 0) {
      return {
        text: `Nothing has metered spend today — ${totals.identityCount} identities carry budgets totalling ${fmtTokens(totals.budgetTokens)} tokens/day, all unspent.`,
        actions: [{ label: 'Open Teams & limits', kind: 'navigate', to: '/ai/teams' }],
      };
    }
    const share = Math.round((top.spendToday / totals.spendToday) * 100);
    return {
      text: `Top driver: ${top.tag} on ${top.modelName} — ${fmtUsd(top.spendToday)} today (≈${share}% of spend, ${fmtTokens(top.tokensToday)} tokens). Cap it in one line: type "cap ${top.tag} ${Math.max(1, Math.round(top.budgetTokens / 2e6))}m".`,
      actions: [{ label: 'Open Teams & limits', kind: 'navigate', to: '/ai/teams' }],
    };
  }
  if (/summari[sz]e.*(health|24h)|ai health/i.test(q)) {
    const parts = [
      `${totals.identityCount} identities · ${fmtTokens(totals.tokensToday)} tokens today · ${fmtUsd(totals.spendToday)} spend.`,
      totals.ungovernedTokensToday > 0
        ? `${fmtTokens(totals.ungovernedTokensToday)} tokens rode the public internet — that is the gap to close.`
        : 'No tokens rode the public internet today.',
      totals.unmeteredPolicyTags.length > 0
        ? `${totals.unmeteredPolicyTags.join(', ')}: budget with no meter (group-scoped).`
        : '',
    ].filter(Boolean);
    return {
      text: parts.join(' '),
      actions: [{ label: 'Open Insights', kind: 'navigate', to: '/ai/observe' }],
    };
  }
  if (/model.*(cost|cheap|effective)|cheapest model/i.test(q)) {
    const catalog = (cc.modelCatalog?.() ?? []) as { name: string; price: number; p50: number; ready: boolean }[];
    if (!catalog.length) return null;
    const cheapest = [...catalog].sort((a, b) => a.price - b.price)[0];
    return {
      text: `${cheapest.name} at $${cheapest.price.toFixed(2)}/1M tokens (P50 ${cheapest.p50} ms)${cheapest.ready ? ', ready now' : ', not attached yet'}. Full pricing is on Providers.`,
      actions: [{ label: 'Open Providers', kind: 'navigate', to: '/ai/providers' }],
    };
  }
  return null;
}

export function andiAnswer(
  cc: CloudControl,
  query: string,
  layerKey: NavLayer['key'] | null,
): AndiAnswer {
  const q = query.trim();

  // 1 — a typed intent: return it as a confirm-to-run action. Andi drafts;
  //     the human commits.
  const intents: Command[] = parseIntent(q, cc);
  if (intents.length > 0) {
    const declares = intents.every(c => c.kind === 'declare');
    return {
      text: declares
        ? 'That declares a standing intent in watch mode: it evaluates and counts, it changes nothing. Enforce is a separate toggle, and Undo reverts the declaration.'
        : 'That is an action the engine can run. Confirm to apply — Undo reverts it.',
      actions: intents.map(c => ({ label: c.label, kind: 'run' as const, run: c.run })),
    };
  }

  // 1.5 — spine navigation: an utterance that asks to SEE a spine screen is
  // answered with that screen's verdict and one navigate action.
  const spine = spineAnswer(cc, q);
  if (spine) return spine;

  // 2 — AI-layer grounded answers.
  const ai = aiAnswer(cc, q);
  if (ai) return ai;

  // 3 — the engine's own grounded answers (network questions).
  const html = cc.answerFor(q);
  if (html) {
    const draft = advisorDraft(cc);
    const actions: AndiAction[] =
      /attach order|plan|egress cost|cost up|forecast/i.test(q) && draft.moves.length > 0
        ? [{ label: `Draft it in the twin (${draft.moves.length} moves)`, kind: 'navigate', to: '/discover?draft=andi' }]
        : [];
    return { html, actions };
  }

  // 4 — advisor findings/headline/offer-ladder questions (the advisor
  // rail's three seeded chips, and close phrasings of them).
  const advisor = advisorAnswer(cc, q);
  if (advisor) return advisor;

  // 5 — honest fallback: say what CAN be grounded, live.
  return {
    text: 'I only answer what the engine can ground. Try one of these, or type an action like "cap shared-services 1m".',
    actions: andiSuggestions(layerKey).map(s => ({ label: s, kind: 'ask' as const, prompt: s })),
  };
}
