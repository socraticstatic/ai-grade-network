import type { CloudControl } from '../../engine/types';
import type { FabricModel } from '../connect/FabricHero';
import { EMPTY_ESTATE_FILTERS, type EstateFilters } from './estateFilters';
import { siteRollup, type SiteClass } from './discoveryModel';

/**
 * The estate filter row — one chip per cloud present in the model, plus the
 * path and domain facets. Real buttons, toggle semantics: clicking an active
 * chip clears that facet back to `'all'` rather than requiring a separate
 * clear action per chip. `Clear filters` only appears once something is
 * active, so an unfiltered view shows no button that would do nothing.
 *
 * Layout leaves room beside this row for a future with/without-AT&T toggle
 * (a separate task) — nothing here reserves space for it, but the row is a
 * plain flex-wrap that a sibling control can join without reflow surprises.
 */

function Chip({
  label,
  ariaLabel,
  active,
  onClick,
}: {
  label: string;
  /** Overrides the accessible name when the visible label collides with
   *  something else on the page (a cloud's own tree row, e.g.) — the
   *  chip still reads `label` on screen. */
  ariaLabel?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`h-7 rounded-full border px-3 text-figma-xs font-medium transition-colors ${
        active
          ? 'border-fw-active bg-fw-ctaGhost text-fw-active'
          : 'border-fw-secondary bg-fw-base text-fw-body hover:bg-fw-wash'
      }`}
    >
      {label}
    </button>
  );
}

/** Fixed dc→office→branch→atm label order, matching `CLASS_ORDER` in
 *  discoveryModel.ts — the same order `siteRollup` already returns rows in.
 *  Unlike the cloud chips (filtered to clouds actually present, an open
 *  set), the four site classes are a closed taxonomy — the same fixed-set
 *  idiom `path` and `domain` already use — so every label renders whenever
 *  the group is shown, whether or not this tenant's estate happens to hold
 *  a site in that class today. */
const SITE_CLASS_LABEL: Record<SiteClass, string> = {
  dc: 'Data centers',
  office: 'Offices',
  branch: 'Branches',
  atm: 'ATMs',
};
const ALL_SITE_CLASSES = Object.keys(SITE_CLASS_LABEL) as SiteClass[];

export function EstateFilterChips({
  model,
  cc,
  filters,
  onChange,
}: {
  model: FabricModel;
  /** Site classes live outside the fabric model (branches, not regions), so
   *  the chip group reads them off the engine handle directly — the same
   *  handle `siteRollup` already takes everywhere else it's called. */
  cc: CloudControl;
  filters: EstateFilters;
  onChange: (f: EstateFilters) => void;
}) {
  const clouds: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const r of model.regions) {
    if (seen.has(r.cloudId)) continue;
    seen.add(r.cloudId);
    clouds.push({ id: r.cloudId, name: r.cloudName });
  }

  // The group itself stays hidden when there's nothing to narrow — one
  // class present has no "other" to filter against — but once shown it
  // offers all four classes, not just the ones this tenant happens to hold
  // today (see ALL_SITE_CLASSES above).
  const showSiteClasses = siteRollup(cc).length > 1;

  const isActive =
    filters.cloud !== 'all' || filters.path !== 'all' || filters.domain !== 'all' || filters.siteClass !== 'all';

  const toggleCloud = (id: string) =>
    onChange({ ...filters, cloud: filters.cloud === id ? 'all' : id });
  const togglePath = (p: 'private' | 'public') =>
    onChange({ ...filters, path: filters.path === p ? 'all' : p });
  const toggleDomain = (d: 'network' | 'ai') =>
    onChange({ ...filters, domain: filters.domain === d ? 'all' : d });
  const toggleSiteClass = (sc: SiteClass) =>
    onChange({ ...filters, siteClass: filters.siteClass === sc ? 'all' : sc });

  return (
    <div data-testid="estate-filter-chips" className="flex flex-wrap items-center gap-1.5">
      {clouds.map(c => (
        <Chip
          key={c.id}
          label={c.name}
          // Distinct from the cloud's own tree-row button, which carries the
          // bare cloud name as its accessible name — two buttons named "AWS"
          // on one page is a screen-reader trap, not just a test collision.
          ariaLabel={`Filter by ${c.name}`}
          active={filters.cloud === c.id}
          onClick={() => toggleCloud(c.id)}
        />
      ))}
      <Chip label="On the fabric" active={filters.path === 'private'} onClick={() => togglePath('private')} />
      <Chip label="Public internet" active={filters.path === 'public'} onClick={() => togglePath('public')} />
      <Chip label="Network" active={filters.domain === 'network'} onClick={() => toggleDomain('network')} />
      <Chip label="AI" active={filters.domain === 'ai'} onClick={() => toggleDomain('ai')} />
      {showSiteClasses &&
        ALL_SITE_CLASSES.map(sc => (
          <Chip
            key={sc}
            label={SITE_CLASS_LABEL[sc]}
            active={filters.siteClass === sc}
            onClick={() => toggleSiteClass(sc)}
          />
        ))}
      {isActive && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_ESTATE_FILTERS)}
          className="h-7 rounded-full border border-fw-secondary bg-fw-base px-3 text-figma-xs font-medium text-fw-bodyLight transition-colors hover:bg-fw-wash"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
