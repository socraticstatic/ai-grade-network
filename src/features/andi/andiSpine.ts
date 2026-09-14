import type { CloudControl } from '../../engine/types';
import type { AndiAnswer } from './andiBrain';
import type { FabricModel } from '../connect/FabricHero';
import { discoverVerdict } from '../discover/verdict';
import { connectVerdict } from '../connect/verdict';
import { buildVerdict } from '../observe/networkBinding';

/** Spine navigation, spoken in verdicts. Pure matcher: an utterance either
 *  is a spine phrase (answer = that screen's verdict + one navigate action)
 *  or it is not (null - the brain falls through to its other steps).
 *  Andi drafts; the human clicks.
 *
 *  ROUTES is checked in array order and the FIRST regex match wins - a
 *  query that names two spine topics ("show my connections and cost")
 *  resolves to whichever entry sits earlier in this list. Entries are
 *  ordered most-specific-first: discover ("what do i have") and connect
 *  ("fabric"/"attach") anchor on domain-specific jargon that is rarely
 *  said about anything else; observe's "traffic"/"observability" is
 *  similarly narrow; cost's words (saving/savings/spend/cost) are the
 *  most generic financial vocabulary in the table and so are ordered
 *  last, where they only win when nothing more specific also matched. */
const ROUTES: { match: RegExp; to: string; label: string; verdict: (cc: CloudControl) => string }[] = [
  {
    match: /\b(estate|discover|inventory|what do i have)\b/i,
    to: '/discover',
    label: 'Open Discover',
    verdict: cc => discoverVerdict(cc.fabricModel() as FabricModel),
  },
  {
    match: /\b(connections?|fabric|attach(ed|ments)?)\b/i,
    to: '/naas/connect',
    label: 'Open Connect',
    verdict: cc => connectVerdict(cc.fabricModel() as FabricModel),
  },
  {
    match: /\b(traffic|observe|observability|flows?)\b/i,
    to: '/naas/observe',
    label: 'Open Observe',
    verdict: cc => buildVerdict(cc),
  },
  {
    match: /\b(saving|savings|spend|cost)\b/i,
    to: '/naas/cost',
    label: 'See the savings',
    verdict: cc => buildVerdict(cc),
  },
];

/** Only phrases that read as "take me somewhere / show me" qualify - a bare
 *  keyword inside an action or metric question must fall through. */
const NAV_SHAPE = /\b(show|take me|open|go to|where|how('s| is| are)|what (do i have|am i saving))\b/i;

/** Navigation asks to GO somewhere; it never asks WHY, WHETHER, or WHAT TO
 *  DO about something. Any analytic marker disqualifies the utterance up
 *  front, before ROUTES is even consulted - "show me why egress cost is
 *  up" and "where is my attach order plan" are diagnostic questions the
 *  engine already answers specifically (state-share.ts answerFor), not
 *  requests to open a screen, and must fall through to it untouched. */
const ANALYTIC = /\b(why|should|when|how much|order|plan|forecast|up\b|down\b)\b/i;

export function spineAnswer(cc: CloudControl, query: string): AndiAnswer | null {
  const q = query.trim();

  // "connect <region>" - resolve against the estate; ANDI pre-fills the
  // drawn wizard, the human walks and confirms it. Runs BEFORE the
  // NAV_SHAPE/ANALYTIC gates below: a bare "connect us-west-2" carries none
  // of NAV_SHAPE's go-there words, and ANALYTIC's "order"/"plan" markers
  // (\border\b, \bplan\b in that regex) must not get a chance to swallow a
  // region name first.
  const connectMatch = q.match(/^\s*(?:connect|attach|provision)\s+(.+?)(\s+with\s+dual(?:\s+paths?)?)?\s*$/i);
  if (connectMatch) {
    const model = cc.fabricModel() as FabricModel;
    const namePart = connectMatch[1].trim().toLowerCase();
    const region = model.regions.find(
      r => r.regionId.toLowerCase() === namePart || r.name.toLowerCase() === namePart,
    );
    if (!region) {
      const publics = model.regions.filter(r => r.path === 'public').map(r => r.name).join(', ');
      return { text: `No region called "${connectMatch[1].trim()}" in the estate. Still on the public internet: ${publics}.`, actions: [] };
    }
    if (region.path === 'private') {
      return { text: connectVerdict(model), actions: [{ label: 'Open Connect', kind: 'navigate', to: '/naas/connect' }] };
    }
    const dual = connectMatch[2] ? 1 : 0;
    return {
      text: `${region.cloudName} ${region.name} rides the public internet today. I drafted the attach - walk the wizard and confirm it.`,
      actions: [{ label: `Provision ${region.name}${dual ? ' with dual paths' : ''}`, kind: 'navigate', to: `/naas/connect?provision=${region.regionId}&dual=${dual}` }],
    };
  }

  if (ANALYTIC.test(q)) return null;
  if (!NAV_SHAPE.test(q) && !/^\s*(discover|connect|observe|cost)\s*$/i.test(q)) return null;
  const route = ROUTES.find(r => r.match.test(q));
  if (!route) return null;
  // Belt-and-suspenders on top of ANALYTIC: if the engine's own answerFor
  // already grounds this exact utterance (e.g. "egress cost", "coreweave"),
  // that specific answer outranks the screen's generic verdict - defer to
  // it rather than hand-mirroring the engine's keyword list here.
  if (cc.answerFor(q)) return null;
  return {
    text: route.verdict(cc),
    actions: [{ label: route.label, kind: 'navigate', to: route.to }],
  };
}
