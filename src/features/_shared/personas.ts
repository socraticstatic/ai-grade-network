/**
 * The deck's value map, as data.
 *
 * Slide 2 named, per stage, WHO the screen serves and WHAT job they came to
 * do - and the brainstorm's note on it was blunt: "the persona column gives
 * the advisor its audiences: findings should speak the persona's language
 * per stage." A screen that states its own audience is also the cheapest
 * defence against the too-many-metrics critique, because "would this
 * persona pay for this number?" is a question you can only ask out loud
 * once the persona is written down.
 *
 * Job copy is the deck's own job-to-be-done phrasing, in the first person -
 * it reads as the visitor's sentence, not as a description of them.
 */

export type Stage = 'home' | 'discover' | 'connect' | 'observe' | 'govern';

export interface StagePersona {
  /** Who this screen is for, in their own title. */
  persona: string;
  /** Their job to be done, first person. */
  job: string;
}

export const STAGE_PERSONA: Record<Stage, StagePersona> = {
  /* The layer board is the sponsor's screen - the one person who reads it
     to decide, not to operate. The deck's value map covers the four verbs;
     this row is the board that sits above them. */
  home: {
    persona: 'the exec sponsor',
    job: 'Know what this estate is costing me, what is exposed, and what to do about it next.',
  },
  discover: {
    persona: 'Cloud & Platform Architect',
    job: 'See what I actually have across every cloud - one inventory, no console hopping.',
  },
  connect: {
    persona: 'Network Engineer / NetOps',
    job: 'Stand up a private path in minutes - no ticket, no hardware.',
  },
  observe: {
    persona: 'FinOps & SRE',
    job: 'Know where the traffic, the cost and the bottlenecks are - and what to do about them.',
  },
  govern: {
    persona: 'Security & Compliance',
    job: 'Enforce policy once across every cloud, and know the risk before it applies.',
  },
};

/** Which persona each advisor finding is speaking to. A finding that names
 *  its audience is a finding a reader can hand to the right colleague. */
export const FINDING_PERSONA: Record<string, string> = {
  'untracked-ai': 'Security & Compliance',
  'unattached-regions': 'FinOps & SRE',
  'egress-bleed': 'FinOps & SRE',
  'exposed-spof': 'Security & Compliance',
};
