// The fold rule, in one place (2026-09-30). scripts/fold.mjs and
// scripts/demo-walk.mjs both read it; tests/fold-rule.test.mjs pins it.
//
// Every page fits 900 with no page scroll (dashboard-fits-the-fold,
// 2026-09-28). One exception, approved by Micah for the v2 home: the NaaS home
// repeats the Connect network map "below all the good stuff", so the home
// alone may scroll, and only by that map. Everything above the map fits the
// fold, the map starts below it, and nothing follows the map but the page's
// own bottom margin (TAIL).
//
// The map carries data-fold="below" on the home (naas-app.js heroFold); a
// marker anywhere else fails, so the allowance cannot spread.

/** The walk's name for the home: its rail group and label (fold.mjs railLinks). */
export const HOME_PAGE = 'home/NaaS';
/** What may follow the map: its 24px bottom margin (heroMb) and main's 16px bottom padding. */
export const TAIL = 40;

/**
 * The height problems on one measured page, as report lines; [] when it fits.
 * page: the walk's page name; scrollHeight: the document's; limit: the fold;
 * below: the map's { top, bottom } in document pixels, when a fold marker is on
 * the page; aboveBottom: the lowest bottom of anything in <main> before the map.
 */
export function heightProblems({ page, scrollHeight, limit, below = null, aboveBottom = 0 }) {
  if (!below) return scrollHeight > limit ? [`scroll ${scrollHeight}`] : [];
  if (page !== HOME_PAGE) return [...(scrollHeight > limit ? [`scroll ${scrollHeight}`] : []), 'a map below the fold off the home'];
  const out = [];
  // One line for what is above the map: past the fold, or else under the map's top.
  if (aboveBottom > limit) out.push(`above the map ${aboveBottom}`);
  else if (below.top < aboveBottom) out.push('the map overlaps what is above it');
  if (scrollHeight > below.bottom + TAIL) out.push(`past the map ${scrollHeight}`);
  return out;
}

/**
 * Runs in the page: the fold marker's box and the lowest bottom of what sits
 * above it in <main>, in document pixels, or { below: null } with no marker.
 * Fixed layers (drawers, Andi's dock) are not the page and are skipped.
 */
export function foldMarks() {
  const mark = document.querySelector('[data-fold="below"]');
  if (!mark) return { below: null, aboveBottom: 0 };
  const y = window.scrollY || 0;
  const r = mark.getBoundingClientRect();
  const main = document.querySelector('main') || document.body;
  const fixed = (el) => { for (let n = el; n && n !== main; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false; };
  let aboveBottom = 0;
  for (const el of main.querySelectorAll('*')) {
    if (el === mark || el.contains(mark) || mark.contains(el)) continue;
    if (!(mark.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height || fixed(el)) continue;
    aboveBottom = Math.max(aboveBottom, b.bottom + y);
  }
  return { below: { top: Math.floor(r.top + y), bottom: Math.ceil(r.bottom + y) }, aboveBottom: Math.ceil(aboveBottom) };
}
