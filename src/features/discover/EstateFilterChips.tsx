import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { CloudControl } from '../../engine/types';
import type { FabricModel } from '../connect/FabricHero';
import {
  EMPTY_ESTATE_FILTERS,
  connectionOf,
  isUnfiltered,
  regionOf,
  unitOf,
  type EstateFilters,
} from './estateFilters';
import { branchesOf, regionsOf, vpcsOf, type SiteClass } from './discoveryModel';

/**
 * The estate filter bar.
 *
 * Seven facets — cloud, path, domain, site type, region, business unit,
 * connection — because the brainstorm asked for the customer's own mental
 * models ("by region, site type, business unit, connection type"). Seven
 * facets rendered as a flat chip row would be twenty-plus chips, which is
 * the exact "too busy" failure this program keeps being told about, so each
 * facet is one compact menu that opens on demand and states its own choice
 * when set. Unset facets read as a single quiet word; the row only grows
 * where a decision has actually been made.
 *
 * Every facet's OPTIONS come from the estate itself, and a facet with fewer
 * than two values never renders — a filter that cannot narrow anything is
 * noise wearing a control's clothes.
 */

interface Option {
  value: string;
  label: string;
}

function FacetMenu({
  name,
  options,
  value,
  onPick,
}: {
  name: string;
  options: Option[];
  value: string;
  onPick: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== 'all';
  const current = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid={`facet-${name.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-figma-xs font-medium transition-colors ${
          active
            ? 'border-fw-active bg-fw-ctaGhost text-fw-active'
            : 'border-fw-secondary bg-fw-base text-fw-body hover:bg-fw-wash'
        }`}
      >
        {active ? `${name}: ${current?.label ?? value}` : name}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-8 z-30 min-w-[11rem] rounded-xl border border-fw-secondary bg-fw-base p-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === 'all'}
            onClick={() => {
              onPick('all');
              setOpen(false);
            }}
            className="block w-full rounded-lg px-3 py-1.5 text-left text-figma-xs text-fw-bodyLight hover:bg-fw-wash"
          >
            All
          </button>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={value === o.value}
              onClick={() => {
                onPick(o.value);
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-figma-xs hover:bg-fw-wash ${
                value === o.value ? 'font-semibold text-fw-active' : 'text-fw-body'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const SITE_CLASS_LABEL: Record<SiteClass, string> = {
  dc: 'Data centers',
  office: 'Offices',
  branch: 'Branches',
  atm: 'ATMs',
};

const cap = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

export function EstateFilterChips({
  model,
  cc,
  filters,
  onChange,
}: {
  model: FabricModel;
  cc: CloudControl;
  filters: EstateFilters;
  onChange: (f: EstateFilters) => void;
}) {
  const clouds: Option[] = [];
  const seenCloud = new Set<string>();
  for (const r of model.regions) {
    if (seenCloud.has(r.cloudId)) continue;
    seenCloud.add(r.cloudId);
    clouds.push({ value: r.cloudId, label: r.cloudName });
  }

  const branches = branchesOf(cc);

  /* Options are the estate's own values, deduped and counted, so a facet
     never offers a choice that would return nothing. */
  const distinct = (vals: string[]): Option[] => {
    const counts = new Map<string, number>();
    for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => ({ value, label: value === 'off-net' ? 'Not on AT&T yet' : cap(value) }));
  };

  const siteClassOptions: Option[] = distinct(branches.map(b => b.siteClass)).map(o => ({
    value: o.value,
    label: SITE_CLASS_LABEL[o.value as SiteClass] ?? o.label,
  }));
  const regionOptions = distinct(branches.map(regionOf));
  const connectionOptions = distinct(branches.map(b => connectionOf(cc, b)));
  const unitOptions = distinct(
    (cc.clouds as { id: string }[] | undefined ?? [])
      .flatMap(c => regionsOf(cc, c.id))
      .flatMap(r => vpcsOf(cc, r.id))
      .map(unitOf),
  );

  const set = <K extends keyof EstateFilters>(k: K, v: string) =>
    onChange({ ...filters, [k]: v } as EstateFilters);

  return (
    <div data-testid="estate-filter-chips" className="flex flex-wrap items-center gap-1.5">
      {clouds.length > 1 && (
        <FacetMenu name="Cloud" options={clouds} value={filters.cloud} onPick={v => set('cloud', v)} />
      )}
      <FacetMenu
        name="Path"
        options={[
          { value: 'private', label: 'On the fabric' },
          { value: 'public', label: 'Public internet' },
        ]}
        value={filters.path}
        onPick={v => set('path', v)}
      />
      <FacetMenu
        name="Domain"
        options={[
          { value: 'network', label: 'Network' },
          { value: 'ai', label: 'AI' },
        ]}
        value={filters.domain}
        onPick={v => set('domain', v)}
      />
      {siteClassOptions.length > 1 && (
        <FacetMenu
          name="Site type"
          options={siteClassOptions}
          value={filters.siteClass}
          onPick={v => set('siteClass', v)}
        />
      )}
      {regionOptions.length > 1 && (
        <FacetMenu name="Region" options={regionOptions} value={filters.region} onPick={v => set('region', v)} />
      )}
      {unitOptions.length > 1 && (
        <FacetMenu name="Business unit" options={unitOptions} value={filters.unit} onPick={v => set('unit', v)} />
      )}
      {connectionOptions.length > 1 && (
        <FacetMenu
          name="Connection"
          options={connectionOptions}
          value={filters.connection}
          onPick={v => set('connection', v)}
        />
      )}
      {!isUnfiltered(filters) && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_ESTATE_FILTERS)}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-fw-secondary bg-fw-base px-3 text-figma-xs font-medium text-fw-bodyLight transition-colors hover:bg-fw-wash"
        >
          <X className="h-3 w-3" aria-hidden="true" /> Clear filters
        </button>
      )}
    </div>
  );
}
