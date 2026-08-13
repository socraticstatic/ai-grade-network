/**
 * The advisor page's phase machine — pure, no React, no engine. Four
 * phases, one-way: `observe` (the head-start card) → `intake` (wizard-
 * derived credential entry) → `scanning` (the scan theater) → `ready` (the
 * headline + findings). `advance` is total: an event that doesn't apply to
 * the current phase returns the SAME phase rather than throwing, so a
 * component can dispatch freely (e.g. a stray `scan-complete` while still
 * in `observe`) without a guard clause at every call site.
 *
 * Nothing here goes backward — there is no `ready → scanning` event. A
 * return visit re-mounts the page at `observe` (return visits get the
 * discovered tree per the roadmap, not this page at all — see
 * task-4-report.md).
 */

export type AdvisorPhase = 'observe' | 'intake' | 'scanning' | 'ready';

export type AdvisorEvent =
  | { type: 'start' } // observe -> intake, the head-start card's single CTA
  | { type: 'credential-valid' } // intake -> scanning, a shape-valid credential submitted
  | { type: 'scan-complete' }; // scanning -> ready, the precomputed step list exhausted

export function advance(state: AdvisorPhase, event: AdvisorEvent): AdvisorPhase {
  switch (state) {
    case 'observe':
      return event.type === 'start' ? 'intake' : state;
    case 'intake':
      return event.type === 'credential-valid' ? 'scanning' : state;
    case 'scanning':
      return event.type === 'scan-complete' ? 'ready' : state;
    case 'ready':
      return state;
    default:
      return state;
  }
}

/** localStorage key a profile's advisor-done flag lives under. Exported so
 *  a test can assert against the same key this module reads/writes rather
 *  than duplicating the string. */
export const advisorDoneKey = (profile: string) => `advisor:${profile}:done`;

/**
 * Whether this profile has already been through the advisor once — either
 * by accepting an offer tier or by using the "Skip to the estate" link.
 * localStorage errors (private browsing, quota) read as "not done" rather
 * than throwing, matching AuthContext's try/catch idiom.
 */
/* In-memory only, never persisted. Two jobs:
 *   1. The demo contract: Meridian must offer the advisor on EVERY page
 *      load. Remembering "you already saw it" across reloads would make the
 *      pitch a one-shot - the presenter reloads and the conversation is
 *      gone. Skipping still un-gates /discover for the rest of THIS page
 *      session (no soft-lock, the estate is one click away), and a reload
 *      brings the advisor back.
 *   2. Storage-failure tolerance: in private mode / quota-exceeded
 *      contexts where localStorage throws, this is the only store, so a
 *      failed write can't strand a user inside the gate.
 * ACME keeps the persisted flag (seeded at boot) so its familiar flows
 * never see the advisor uninvited. */
const doneThisSession = new Set<string>();

/** Profiles whose done-flag is deliberately never persisted - see above. */
const EPHEMERAL_PROFILES = new Set(['meridian']);

export function advisorDone(profile: string): boolean {
  if (doneThisSession.has(profile)) return true;
  if (EPHEMERAL_PROFILES.has(profile)) return false; // always fresh on load
  try {
    return localStorage.getItem(advisorDoneKey(profile)) === '1';
  } catch {
    return false;
  }
}

/** Marks this profile done for this page session. Ephemeral profiles stop
 *  there - nothing is written, so the next load starts over. */
export function markAdvisorDone(profile: string): void {
  doneThisSession.add(profile);
  if (EPHEMERAL_PROFILES.has(profile)) return;
  try {
    localStorage.setItem(advisorDoneKey(profile), '1');
  } catch {
    /* in-memory set above already holds it for this session */
  }
}

/** The inverse of markAdvisorDone — clears this profile's flag. This is
 *  Discover rail's "Run the advisor" affordance: re-enter the first-run
 *  flow on demand without a second source of truth for what "done" means.
 *  Same error tolerance as markAdvisorDone: a storage failure here must not
 *  block the Link's navigation to /discover/advisor. */
export function resetAdvisorDone(profile: string): void {
  doneThisSession.delete(profile);
  try {
    localStorage.removeItem(advisorDoneKey(profile));
  } catch {
    /* private mode / storage unavailable — non-fatal */
  }
}
