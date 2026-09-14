import { CC } from '../../engine';
import type { CloudControl } from '../../engine';

/**
 * Builds a shareable replay link for the current engine state.
 *
 * Prefers the engine's own `shareUrl()` (state-share.ts), which encodes the
 * delta from the pristine model as a `?s=` query param — a top-level query
 * string that HashRouter (routes live at `#/discover` etc.) never reads, so
 * the payload survives client-side navigation untouched. Falls back to
 * building the link from `serialize()` directly if `shareUrl` isn't present
 * on the engine handle (e.g. a stub in an isolated test).
 */
export function buildShareLink(cc: CloudControl): string {
  if (typeof cc.shareUrl === 'function') {
    const link = cc.shareUrl();
    if (link) return link;
  }
  const payload = typeof cc.serialize === 'function' ? cc.serialize() : '';
  const { origin, pathname, hash } = window.location;
  return `${origin}${pathname}${payload ? `?s=${payload}` : ''}${hash}`;
}

/**
 * Restores a shared session from the current URL, once, on app mount.
 *
 * Delegates to the engine's `hydrate()` (state-share.ts), which reads the
 * `?s=` query param — router-safe, since HashRouter only ever inspects
 * `location.hash` — and falls back to a legacy `#s=` hash form for links
 * copied before this change. Returns whether a shared session was applied.
 * The engine guards `hydrate()` internally so calling this more than once
 * (e.g. a remount in dev StrictMode) can't double-apply the same payload.
 */
export function restoreFromLocation(): boolean {
  if (typeof CC.hydrate !== 'function') return false;
  try {
    return CC.hydrate();
  } catch (e) {
    console.warn('restoreFromLocation failed', e);
    return false;
  }
}
