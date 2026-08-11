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
/* In-memory fallback for contexts where localStorage throws (private mode,
 * quota, partitioned iframes). Without it, a failed write means advisorDone
 * stays false forever and /discover's gate re-enters the advisor on every
 * navigation — a soft-lock the final review reproduced. Session-scoped by
 * nature; that's fine, the flag only has to hold until storage recovers. */
const doneFallback = new Set<string>();

export function advisorDone(profile: string): boolean {
  if (doneFallback.has(profile)) return true;
  try {
    return localStorage.getItem(advisorDoneKey(profile)) === '1';
  } catch {
    return false;
  }
}

/** Marks this profile done. Storage errors fall back to the in-memory set —
 *  the button that called this still navigates, and the gate still honors
 *  the flag for the rest of the session. */
export function markAdvisorDone(profile: string): void {
  try {
    localStorage.setItem(advisorDoneKey(profile), '1');
  } catch {
    doneFallback.add(profile);
  }
}

/** The inverse of markAdvisorDone — clears this profile's flag. This is
 *  Discover rail's "Run the advisor" affordance: re-enter the first-run
 *  flow on demand without a second source of truth for what "done" means.
 *  Same error tolerance as markAdvisorDone: a storage failure here must not
 *  block the Link's navigation to /discover/advisor. */
export function resetAdvisorDone(profile: string): void {
  doneFallback.delete(profile);
  try {
    localStorage.removeItem(advisorDoneKey(profile));
  } catch {
    /* private mode / storage unavailable — non-fatal */
  }
}
