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
export function advisorDone(profile: string): boolean {
  try {
    return localStorage.getItem(advisorDoneKey(profile)) === '1';
  } catch {
    return false;
  }
}

/** Marks this profile done. Storage errors are swallowed — the button that
 *  called this still navigates; a flag that fails to persist just means the
 *  next visit sees the advisor again, not a broken click. */
export function markAdvisorDone(profile: string): void {
  try {
    localStorage.setItem(advisorDoneKey(profile), '1');
  } catch {
    /* private mode / storage unavailable — non-fatal */
  }
}
