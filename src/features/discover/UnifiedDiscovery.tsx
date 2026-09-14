import { useEffect, useState } from 'react';
import { ChevronRight, Globe, Link2, MapPin, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { useRevealStagger } from './useRevealStagger';
import { AttentionTag } from '../../components/viz/AttentionTag';
import { ProviderLogo } from '../../components/brand/ProviderLogo';
import { VpcMap } from './VpcMap';
import { AttachmentMap } from './AttachmentMap';
import { DiscoveryWizard } from './DiscoveryWizard';
import { EstateFilterChips } from './EstateFilterChips';
import { EMPTY_ESTATE_FILTERS, regionMatches, branchMatches, connectionOf, regionOf } from './estateFilters';
import { cloudConnection, regionConnection, connMeta } from './connectionState';
import {
  allKeys,
  cloudRegionCount,
  cloudVpcCount,
  cloudKey,
  regionKey,
  vpcKey,
  estateDomains,
  openSummary,
  regionLatencyMap,
  regionLatencyPathMap,
  regionsOf,
  vpcsOf,
  tagHex,
  tagLabel,
  toggleKey,
  branchKey,
  branchesOf,
  selectionKind,
  selectionMemberIds,
  needsRollup,
  ROLLUP_THRESHOLD,
  CLASS_ORDER,
  SITE_CLASS_PLURAL,
  siteClassKey,
  isSiteClassKey,
  siteBreakdown,
  BREAKDOWN_LABEL,
  type BreakdownDim,
  type Branch,
  type Cloud,
  type Region,
  type Vpc,
  type Tag,
} from './discoveryModel';
import {
  ID_RENAME_WARNING,
  KIND_LABEL,
  groupIdFromName,
  kindNoun,
} from '../govern/groupLanguage';
import type { CloudControl } from '../../engine/types';

/** Shared once, not re-constructed per row/render — every comma-formatted
 *  count on this screen (rollup rows, the "more" overflow row, the sites
 *  panel's own premises count) reads through this one instance, so a count
 *  in the thousands is never rendered unformatted next to one that is. */
const nf = new Intl.NumberFormat('en-US');

/* ------------------------------ atoms ------------------------------ */

function StatTiles({ items }: { items: { v: React.ReactNode; l: string }[] }) {
  return (
    <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
      {items.map((it, i) => (
        <div key={i} className="min-w-[54px] rounded-lg border border-fw-secondary bg-fw-wash px-2.5 py-1 text-center">
          <div className="text-figma-sm font-semibold leading-tight text-fw-heading tabular-nums">{it.v}</div>
          <div className="whitespace-nowrap text-[10px] uppercase tracking-wide text-fw-bodyLight">{it.l}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Connection-state indicator for cloud & region rows (Pure Discovery D2).
 * Connected reads "via the AT&T fabric" (green, link); not-connected reads
 * "public internet" (slate, globe). The specific on-ramp is abstracted away.
 * This supersedes the older Private/Public badge on cloud & region rows so the
 * row conveys connected-state once, cleanly.
 */
function ConnIndicator({ cc, cloudId, regionId }: { cc: CloudControl; cloudId: string; regionId?: string }) {
  const state = regionId ? regionConnection(cc, cloudId, regionId) : cloudConnection(cc, cloudId);
  const meta = connMeta(state);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        meta.connected
          ? 'border-fw-success bg-fw-successLight text-fw-success'
          : 'border-fw-secondary bg-fw-wash text-fw-bodyLight'
      }`}
      title={meta.connected ? 'Reached over the AT&T fabric' : 'Reachable over the public internet'}
    >
      {meta.connected ? <Link2 size={12} aria-hidden="true" /> : <Globe size={12} aria-hidden="true" />}
      {meta.label}
    </span>
  );
}

/** Leaf (VPC) attach badge — the detailed Private/Public signal stays here. */
function Badge({ attached }: { attached: boolean }) {
  return attached ? (
    <span className="inline-flex items-center rounded-full border border-fw-success bg-fw-successLight px-2 py-0.5 text-[11px] font-medium text-fw-success">
      Private
    </span>
  ) : (
    <AttentionTag icon="globe">Public</AttentionTag>
  );
}

const AiFlag = () => (
  <span className="rounded-full border border-fw-primary/30 bg-fw-accent px-1.5 py-px text-[10px] font-medium text-fw-primary">
    GPU / AI
  </span>
);

const Chevron = ({ open }: { open: boolean }) => (
  <ChevronRight
    size={16}
    className={`shrink-0 text-fw-bodyLight transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    aria-hidden="true"
  />
);

/* --------------------------- selection --------------------------- */

/** The pick control. A checkbox, not a row click: expanding a node to look
 *  inside it and choosing it are different acts, and one control cannot
 *  honestly mean both. Sits OUTSIDE the disclosure button — a checkbox
 *  nested in a button is not operable. */
function SelectBox({
  id,
  name,
  selected,
  onToggle,
}: {
  id: string;
  name: string;
  selected: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={selected}
      onChange={() => onToggle(id)}
      aria-label={`Select ${name}`}
      className="h-4 w-4 shrink-0 rounded border-fw-secondary accent-fw-link"
    />
  );
}

/** One customer-premises card — the same row idiom whether it renders
 *  directly in the grid (at or under threshold) or inside an expanded
 *  rollup group (over threshold). */
function SiteRow({
  b,
  selected,
  onToggle,
}: {
  b: Branch;
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  const key = branchKey(b.id);
  const on = selected.has(key);
  return (
    <li
      data-testid="site-row"
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        on ? 'border-fw-active bg-fw-ctaGhost' : 'border-fw-secondary bg-fw-wash/40'
      }`}
    >
      <SelectBox id={key} name={b.name} selected={on} onToggle={onToggle} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-figma-sm font-medium text-fw-heading">{b.name}</div>
        <div className="truncate text-[11px] text-fw-bodyLight">
          {b.city} · <span className="font-mono">{(b.cidrs || []).join(', ')}</span>
        </div>
      </div>
    </li>
  );
}

/** A collapsed site class past the 50-row threshold — "2,840 branches ·
 *  1,988 on AT&T", drilling in to the same site-row cards a small estate
 *  renders directly. `onNet` reads AT&T reach the same way `siteRollup`
 *  does elsewhere (discoveryModel.ts) — an `onrampId` on the branch. */
function SiteRollupRow({
  rowKey,
  label,
  group,
  open,
  onToggleOpen,
  selected,
  onToggle,
}: {
  rowKey: string;
  label: string;
  group: Branch[];
  open: boolean;
  onToggleOpen: () => void;
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  const onNet = group.filter(b => b.onrampId).length;
  const overflow = group.length - ROLLUP_THRESHOLD;
  return (
    <li className="col-span-full rounded-xl border border-fw-secondary bg-fw-base">
      <button
        type="button"
        data-testid="site-rollup-row"
        onClick={onToggleOpen}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-fw-wash/60"
      >
        <Chevron open={open} />
        <span className="text-figma-sm font-medium text-fw-heading">
          {nf.format(group.length)} {label} · {nf.format(onNet)} on AT&amp;T
        </span>
      </button>
      {open && (
        <ul className="grid grid-cols-1 gap-1 border-t border-fw-secondary p-2 sm:grid-cols-2 lg:grid-cols-3">
          {group.slice(0, ROLLUP_THRESHOLD).map(b => (
            <SiteRow key={b.id} b={b} selected={selected} onToggle={onToggle} />
          ))}
          {overflow > 0 && (
            <li
              data-testid="rollup-more"
              className="col-span-full flex items-center justify-center rounded-xl border border-dashed border-fw-secondary px-3 py-2.5 text-figma-xs text-fw-bodyLight"
            >
              + {nf.format(overflow)} more - filter to narrow
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

/** Customer premises. Deliberately NOT inside the cloud tree: a branch is a
 *  building the customer owns, not a resource any hyperscaler holds, and
 *  nesting it under a cloud would assert a containment that is not true.
 *  It sits above the clouds because that is where the traffic starts.
 *
 *  `branches` arrives pre-narrowed by `branchMatches` (the siteClass facet) —
 *  a filter that scopes the panel out of existence for zero matches is the
 *  same "just render nothing" behavior the cloud tree already has for a
 *  filter that clears every cloud, not a special empty state invented here.
 *  Past `ROLLUP_THRESHOLD` (Meridian's 4,183 branches, never ACME's 6), the
 *  list collapses into one rollup row per site class instead of one card
 *  per site — the same open-set idiom (`site-class/${cls}` keys) the tree
 *  already uses for cloud/region/VPC drill-in, so Expand/Collapse-all's
 *  vocabulary extends here without a second state shape. */
function SitesPanel({
  branches,
  selected,
  onToggle,
  open,
  onToggleOpen,
  cc,
  dim,
  onDim,
}: {
  branches: Branch[];
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
  open: ReadonlySet<string>;
  onToggleOpen: (key: string) => void;
  cc: CloudControl;
  dim: BreakdownDim;
  onDim: (d: BreakdownDim) => void;
}) {
  const rollup = needsRollup(branches.length);
  /* Filtering decides WHICH sites are here; the breakdown decides how the
     survivors stack. Keeping them separate is what lets a viewer ask "the
     ATMs, by region" without either control knowing about the other. */
  const groups = siteBreakdown(branches, dim, {
    region: regionOf,
    connection: b => connectionOf(cc, b),
  });
  return (
    <div
      data-testid="discover-sites"
      data-tour="discover-sites"
      className="rounded-2xl border border-fw-secondary bg-fw-base"
    >
      <div className="flex items-center gap-2 border-b border-fw-secondary px-4 py-3">
        <MapPin size={16} className="shrink-0 text-fw-bodyLight" aria-hidden="true" />
        <span className="font-semibold text-fw-heading">Your sites</span>
        <span className="text-figma-xs text-fw-bodyLight">
          {nf.format(branches.length)} premises · your own buildings, not a cloud
        </span>
        {rollup && (
          <label className="ml-auto flex items-center gap-1.5 text-figma-xs text-fw-bodyLight">
            Break down by
            <select
              data-testid="site-breakdown"
              value={dim}
              onChange={e => onDim(e.target.value as BreakdownDim)}
              className="rounded-lg border border-fw-secondary bg-fw-base px-2 py-1 text-figma-xs font-medium text-fw-body"
            >
              {(Object.keys(BREAKDOWN_LABEL) as BreakdownDim[]).map(d => (
                <option key={d} value={d}>
                  {BREAKDOWN_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2 lg:grid-cols-3">
        {rollup
          ? groups.map(g => (
              <SiteRollupRow
                key={g.key}
                rowKey={g.key}
                label={g.label}
                group={g.members}
                open={open.has(siteClassKey(g.key as Branch['siteClass']))}
                onToggleOpen={() => onToggleOpen(siteClassKey(g.key as Branch['siteClass']))}
                selected={selected}
                onToggle={onToggle}
              />
            ))
          : branches.map(b => <SiteRow key={b.id} b={b} selected={selected} onToggle={onToggle} />)}
      </ul>
    </div>
  );
}

/** What the selection is, and the one thing you can do with it. Naming what
 *  you found is the only mutation Discover sanctions — there is no attach,
 *  fix or provision here, deliberately. */
/* id of the id-preview note — swapped into the name input's aria-describedby
   when the id is not taken. Same idiom as GroupBuilder's gb-id-note /
   ID_TAKEN_WARNING_ID (GroupBuilder.tsx:29-34): without this, the generated
   id and the "already taken" warning are visible only, and a screen-reader
   user typing a name never hears either. */
const ID_NOTE_ID = 'disc-id-note';
const ID_TAKEN_WARNING_ID = 'disc-id-taken-warning';

function SelectionBar({
  cc,
  selected,
  onClear,
  onCreated,
}: {
  cc: CloudControl;
  selected: ReadonlySet<string>;
  onClear: () => void;
  onCreated: (label: string, id: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [failed, setFailed] = useState(false);

  const kind = selectionKind(selected);
  const members = selectionMemberIds(selected);
  const id = groupIdFromName(name);
  const taken = !!id && (cc.groupList() as { id: string }[]).some(g => g.id === id);

  // Same engine function the saved group will use, so what the bar promises
  // and what the group holds cannot drift.
  const resolved = cc.resolveGroupSpec({ kind, members, predicates: [] }) as { count: number };

  const create = () => {
    if (!id || taken) return;
    const made = cc.addGroup({ id, label: name.trim(), kind, members, predicates: [], desc: 'Named from Discover' });
    if (!made) {
      setFailed(true);
      return;
    }
    setName('');
    setNaming(false);
    setFailed(false);
    onCreated(name.trim(), id);
  };

  // A failed create describes a specific, now-stale attempt (a specific id,
  // claimed the instant it was submitted). Editing the name or backing out
  // of the form makes that description belong to nothing that was actually
  // attempted, so both close the banner it would otherwise leave behind.
  const changeName = (next: string) => {
    setName(next);
    setFailed(false);
  };
  const cancelNaming = () => {
    setNaming(false);
    setFailed(false);
  };

  return (
    <div
      data-testid="discover-selection"
      className="sticky top-2 z-20 rounded-xl border border-fw-active bg-fw-base p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-figma-sm font-semibold text-fw-heading">
          {selected.size} selected
        </span>
        <span
          data-testid="selection-kind"
          className="inline-flex items-center rounded-full border border-fw-secondary bg-fw-wash px-2 py-0.5 text-[11px] font-medium text-fw-body"
        >
          {KIND_LABEL[kind]}
        </span>
        <span className="text-figma-xs text-fw-bodyLight">
          {resolved.count} {kindNoun(kind, resolved.count)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {!naming && (
            <button
              type="button"
              onClick={() => setNaming(true)}
              className="inline-flex h-8 items-center rounded-full bg-fw-active px-3.5 text-figma-xs font-medium text-white transition-colors hover:bg-fw-linkHover"
            >
              Group these
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-fw-secondary text-fw-bodyLight transition-colors hover:bg-fw-wash"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {naming && (
        <div className="mt-3 space-y-2 border-t border-fw-secondary pt-3">
          <div>
            <label className="block text-figma-xs text-fw-bodyLight" htmlFor="disc-group-name">
              Group name
            </label>
            <input
              id="disc-group-name"
              value={name}
              onChange={e => changeName(e.target.value)}
              aria-describedby={taken ? ID_TAKEN_WARNING_ID : ID_NOTE_ID}
              className="h-9 w-full max-w-sm rounded-lg border border-fw-secondary bg-fw-wash px-3 text-figma-sm"
            />
          </div>
          {/* The id, before the commit — it is what every policy stores, and
              showing it after saving would be showing it too late. */}
          <p id={ID_NOTE_ID} className="text-figma-xs text-fw-bodyLight">
            Policies will store this group as{' '}
            <code
              data-testid="discover-group-id"
              className="rounded bg-fw-neutral px-1.5 py-0.5 font-mono text-fw-heading"
            >
              {id || '—'}
            </code>
          </p>
          <p data-testid="discover-group-warning" className="text-figma-xs text-fw-bodyLight">
            {ID_RENAME_WARNING}
          </p>
          {taken && (
            <p id={ID_TAKEN_WARNING_ID} role="alert" className="text-figma-xs text-fw-body">
              “{id}” is already taken. Policies reference this id, so it has to be unique — pick a
              different name.
            </p>
          )}
          {failed && (
            <p role="alert" className="text-figma-xs text-fw-body">
              Could not create “{id}” — that id was claimed the instant this was submitted. Nothing
              was lost; pick a different name.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={create}
              disabled={!id || taken}
              aria-disabled={!id || taken}
              className="h-8 rounded-full bg-fw-active px-4 text-figma-xs font-medium text-white transition-colors hover:bg-fw-linkHover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-fw-active"
            >
              Create group
            </button>
            <button
              type="button"
              onClick={cancelNaming}
              className="h-8 rounded-full border border-fw-secondary px-4 text-figma-xs font-medium text-fw-body transition-colors hover:bg-fw-wash"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ view ------------------------------ */

export function UnifiedDiscovery() {
  const cc = useCloudControlActions();
  // Subscribe the whole tree to engine mutations (attach / fix / sim) so
  // badges, stat tiles and map violations re-render when posture changes.
  useCloudControl(() => 0);

  const clouds = cc.clouds as Cloud[];
  const tags = cc.TAGS as Record<string, Tag>;
  const domains = estateDomains(cc);
  /* The summary band's six headline figures — read off the same `domains`
     stats the full sections render, by (domain key, stat key). No second
     derivation: a figure that drifted between the two would be exactly the
     bug this reuse rules out. `clouds · regions` is the one composite —
     two of the Cloud section's own numbers on one tile, not a new count. */
  const stat = (domainKey: (typeof domains)[number]['key'], statKey: string) =>
    domains.find(d => d.key === domainKey)!.stats.find(s => s.key === statKey)!;
  const sitesStat = stat('network', 'sites');
  const cloudsStat = stat('cloud', 'clouds');
  const regionsStat = stat('cloud', 'regions');
  const workloadsStat = stat('cloud', 'workloads');
  const attachedStat = stat('cloud', 'attached');
  const aiExposedStat = stat('ai', 'aiExposed');
  // Row 21 of the phase-0 metric audit: "Active on-ramps" demoted off this
  // band — the figure is true but its denominator ("circuits on order")
  // needs the blurb the estate-breakdown disclosure's Network domain
  // already carries beside the same stat; the band tile had no room for
  // it. No new JSX: the disclosure below already states this stat.
  const summaryTiles: { key: string; value: React.ReactNode; of?: number; label: string }[] = [
    { key: 'sites', value: sitesStat.value, label: sitesStat.label },
    { key: 'cloudsRegions', value: `${cloudsStat.value} · ${regionsStat.value}`, label: 'Clouds · Regions' },
    { key: 'workloads', value: workloadsStat.value, label: workloadsStat.label },
    // Row 24 of the phase-0 metric audit: the shared "Attached" stat label
    // (also rendered inside the folded breakdown below, out of this row's
    // scope) reads as an unnamed count beside a regions tile and a
    // workloads tile. Override at this call site only — naming the unit
    // "VPCs" points straight at the Private/Public badges in the tree.
    { key: 'attached', value: attachedStat.value, label: 'Attached VPCs' },
    { key: 'aiExposed', value: aiExposedStat.value, label: aiExposedStat.label },
  ];
  /* Latency comes from `fabricModel()`, the one region-latency derivation this
     estate has. Rendering the raw seed `r.lat` here is what put Nebius at 44ms
     on this screen and 120ms on the next.

     The tile states the figure for the path the region is on and LABELS it,
     because a region has two figures and this tile has room for one: a bare
     "LATENCY 54ms" on a region riding public transit read as the same claim as
     /naas/observe's "92ms · Public internet" for that region. */
  const latencyOf = regionLatencyMap(cc);
  const latencyPathOf = regionLatencyPathMap(cc);

  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) => setOpen(o => toggleKey(o, key));
  const [view, setView] = useState<'tree' | 'map'>('tree');

  // Estate filters scope both the tree and the map from one control. Rollups
  // start collapsed (see `open` above) so the filter chips are the first
  // thing a viewer reaches for, not a wall of already-open regions.
  const [estateFilters, setEstateFilters] = useState(EMPTY_ESTATE_FILTERS);
  const fabricModel = cc.fabricModel();
  /* A cloud group (and every region/VPC under it) hides only when NONE of
     its regions match the active filters — matching one region is enough to
     keep the whole group in view, so drilling in still shows the region that
     earned it. A cloud with no fabric-shaped regions at all (nothing to test
     a filter against) stays visible rather than vanishing under an unrelated
     filter. */
  const cloudMatches = (cloudId: string): boolean => {
    const cloudRegions = fabricModel.regions.filter(r => r.cloudId === cloudId);
    return cloudRegions.length === 0 || cloudRegions.some(r => regionMatches(r, estateFilters));
  };

  /* Selection is its own set. toggleKey is reused for the immutable flip —
     the same operation on a different set — but the two sets never merge:
     expanding a region must not select it, and clearing a selection must
     not collapse the tree. */
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const toggleSelect = (key: string) => setSelected(s => toggleKey(s, key));
  const [named, setNamed] = useState<{ label: string; id: string } | null>(null);
  const branches = branchesOf(cc);
  // The siteClass facet — the one estate filter that narrows a branch
  // (`branchMatches`, estateFilters.ts) — scopes the sites panel the same
  // way `cloudMatches` above scopes the tree, so the chips actually filter
  // both surfaces from one control instead of only the cloud tree.
  const filteredBranches = branches.filter(b => branchMatches(b, estateFilters, cc));
  /* Which dimension the site rollups stack by. Page state, not filter
     state: it changes how the same set is READ, never which set it is. */
  const [breakdown, setBreakdown] = useState<BreakdownDim>('class');

  // "+ Connect a cloud" wizard + the "discovered just now" flash it triggers.
  const [wizardOpen, setWizardOpen] = useState(false);
  const [justDiscovered, setJustDiscovered] = useState<string | null>(null);
  useEffect(() => {
    if (!justDiscovered) return;
    const t = setTimeout(() => setJustDiscovered(null), 2800);
    return () => clearTimeout(t);
  }, [justDiscovered]);
  const onDiscovered = (cloudId: string) => {
    setOpen(o => new Set(o).add(cloudKey(cloudId)));
    setJustDiscovered(cloudId);
  };

  // Reveal stagger runs on the top-level cloud rows. (Row 33 of the phase-0
  // metric audit cut the public-workloads alert that used to claim the
  // trailing +1 slot here.)
  const stagger = useRevealStagger(clouds.length);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-figma-2xl font-semibold text-fw-heading">Discover</h1>
          <p className="text-figma-sm text-fw-bodyLight">
            Your estate across every cloud — connect an account, scan it, browse every region, VPC and subnet.
          </p>
        </div>
        <button
          type="button"
          data-tour="discover-connect"
          onClick={() => setWizardOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-fw-ctaPrimary px-4 text-figma-sm font-semibold text-white transition-colors hover:bg-fw-ctaPrimaryHover"
        >
          <Plus size={16} aria-hidden="true" /> Connect a cloud
        </button>
      </div>

      <div className="space-y-3">
        {/* Tree controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              role="group"
              aria-label="Estate view"
              className="flex items-center gap-0.5 rounded-lg border border-fw-secondary bg-fw-wash p-0.5"
            >
              {([['tree', 'Tree view', 'Tree'], ['map', 'Map view', 'Map']] as const).map(([v, name, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-label={name}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`h-6 rounded-md px-2.5 text-figma-xs font-medium transition-colors ${
                    view === v ? 'bg-fw-base text-fw-heading shadow-sm' : 'text-fw-bodyLight hover:text-fw-heading'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {view === 'tree' && (
              <span className="text-[11px] uppercase tracking-wide text-fw-bodyLight">{openSummary(open)}</span>
            )}
          </div>
          {view === 'tree' && (
            <div className="flex items-center gap-1.5">
              {/* Deliberately scoped to the CLOUD TREE only: `allKeys(cc)`
                  never contains `site-class/${cls}` keys (SitesPanel's own
                  rollup drill-in, Task 6), and these two buttons sit inside
                  the Tree-view-only controls, beside `openSummary` above —
                  not a "collapse everything on the page" action. Preserving
                  whatever site-class keys are already in `open` means
                  Expand all / Collapse all can't silently close a rollup a
                  viewer had drilled into (review finding C2) — each acts on
                  the tree's own keys and unions/filters around whatever
                  site-class keys happen to be open, leaving them alone. */}
              <button
                type="button"
                onClick={() => setOpen(o => new Set([...allKeys(cc), ...[...o].filter(isSiteClassKey)]))}
                className="h-7 rounded-full border border-fw-secondary bg-fw-base px-3 text-figma-xs font-medium text-fw-body transition-colors hover:bg-fw-wash"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={() => setOpen(o => new Set([...o].filter(isSiteClassKey)))}
                className="h-7 rounded-full border border-fw-secondary bg-fw-base px-3 text-figma-xs font-medium text-fw-body transition-colors hover:bg-fw-wash"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>

        {/* Estate filter chips — scope both the tree and the map from one
            control. Sits directly under the Tree/Map toggle row. */}
        <EstateFilterChips model={fabricModel} cc={cc} filters={estateFilters} onChange={setEstateFilters} />

        {/* Cloud tree */}
        {view === 'map' && <AttachmentMap filters={estateFilters} />}
        {view === 'tree' && (
        <div className="space-y-2.5">
          {clouds.filter(c => cloudMatches(c.id)).map((c, i) => {
            const ck = cloudKey(c.id);
            const cOpen = open.has(ck);
            const flash = justDiscovered === c.id;
            return (
              <div
                key={flash ? `${c.id}-flash` : c.id}
                style={stagger(i)}
                className={`rounded-2xl border border-fw-secondary bg-fw-base transition-all ${flash ? 'discovered-flash' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(ck)}
                  aria-expanded={cOpen}
                  aria-label={c.name}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-fw-wash/60"
                >
                  <Chevron open={cOpen} />
                  <ProviderLogo id={c.id} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fw-heading">{c.name}</span>
                      {c.ai && <AiFlag />}
                    </div>
                    <div className="text-figma-xs text-fw-bodyLight">
                      {cloudRegionCount(cc, c.id)} regions · {cloudVpcCount(cc, c.id)} VPC/VNet · {c.workloads} workloads
                    </div>
                  </div>
                  {/* Row 31 of the phase-0 metric audit: the same three
                      numbers cut from here — they render twice in one row,
                      once as this prose subtitle and once as stat tiles.
                      The prose (the readable half) stays. */}
                  <ConnIndicator cc={cc} cloudId={c.id} />
                </button>

                {cOpen && (
                  <div className="space-y-2 border-t border-fw-secondary py-2 pl-4 pr-2 sm:pl-6">
                    {regionsOf(cc, c.id).length === 0 && (
                      <div className="px-3 py-2 text-[11px] text-fw-bodyLight">No regions discovered in this cloud yet.</div>
                    )}
                    {regionsOf(cc, c.id).map((r: Region) => {
                      const rk = regionKey(c.id, r.id);
                      const rOpen = open.has(rk);
                      return (
                        <div
                          key={r.id}
                          className="rounded-xl border border-fw-secondary bg-fw-wash/40 transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => toggle(rk)}
                            aria-expanded={rOpen}
                            aria-label={r.name}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-fw-wash"
                          >
                            <Chevron open={rOpen} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-figma-sm font-medium text-fw-heading">{r.name}</span>
                                {r.ai && <AiFlag />}
                              </div>
                              <div className="text-[11px] text-fw-bodyLight">{r.sub}</div>
                            </div>
                            <StatTiles
                              items={[
                                { v: vpcsOf(cc, r.id).length, l: 'VPC/VNet' },
                                { v: r.subnets, l: 'Subnets' },
                                {
                                  v: `${latencyOf[r.id] ?? r.lat}ms`,
                                  // No path claim for a region the fabric model
                                  // does not carry — that figure is the raw seed.
                                  l: !latencyPathOf[r.id]
                                    ? 'Latency'
                                    : latencyPathOf[r.id] === 'private'
                                      ? 'Latency · fabric'
                                      : 'Latency · public',
                                },
                              ]}
                            />
                            <ConnIndicator cc={cc} cloudId={c.id} regionId={r.id} />
                          </button>

                          {rOpen && (
                            <div className="space-y-2 border-t border-fw-secondary px-2 py-2 sm:px-3">
                              {vpcsOf(cc, r.id).length === 0 && (
                                <div className="px-3 py-2 text-[11px] text-fw-bodyLight">No VPCs or VNets in this region yet.</div>
                              )}
                              {vpcsOf(cc, r.id).map((v: Vpc) => {
                                const vk = vpcKey(c.id, r.id, v.id);
                                const vOpen = open.has(vk);
                                const vSel = selected.has(vk);
                                return (
                                  <div
                                    key={v.id}
                                    className={`rounded-xl border bg-fw-base ${
                                      vSel ? 'border-fw-active' : 'border-fw-secondary'
                                    }`}
                                  >
                                    <div className={`flex items-center gap-2 pl-3 ${vSel ? 'bg-fw-ctaGhost' : ''} rounded-t-xl`}>
                                    <SelectBox id={vk} name={v.name} selected={vSel} onToggle={toggleSelect} />
                                    <button
                                      type="button"
                                      onClick={() => toggle(vk)}
                                      aria-expanded={vOpen}
                                      aria-label={v.name}
                                      className="flex flex-1 items-center gap-3 py-2.5 pr-3 text-left transition-colors hover:bg-fw-wash/60"
                                    >
                                      <Chevron open={vOpen} />
                                      <span className="inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-fw-secondary bg-fw-wash px-1.5 text-[10px] font-bold text-fw-body">
                                        {v.vnet ? 'VN' : 'VPC'}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-figma-sm font-medium text-fw-heading">{v.name}</span>
                                          {v.ai && <AiFlag />}
                                        </div>
                                        <div className="text-[11px] text-fw-bodyLight">
                                          {v.role} · <span className="font-mono">{v.cidr}</span>
                                        </div>
                                        {v.tags && v.tags.length > 0 && (
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {v.tags.map(t => {
                                              const hex = tagHex(t, tags);
                                              return (
                                                <span
                                                  key={t}
                                                  className="inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-medium"
                                                  style={{ color: hex, borderColor: `${hex}40`, background: `${hex}14` }}
                                                >
                                                  {tagLabel(t, tags)}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                      <StatTiles
                                        items={[
                                          { v: v.azs, l: 'AZs' },
                                          { v: v.subnets, l: 'Subnets' },
                                        ]}
                                      />
                                      <Badge attached={v.attached} />
                                    </button>
                                    </div>

                                    {vOpen && (
                                      <div className="px-3 pb-3">
                                        <VpcMap
                                          vpc={v}
                                          cloud={{ id: c.id, name: c.name, color: c.color }}
                                          region={{ id: r.id, name: r.name, sub: r.sub }}
                                          tags={tags}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
        {/* Row 33 of the phase-0 metric audit: this alert cut — the third
            rendering of the public-workloads count on this screen (the
            page-level FlowBar CTA states it with an action attached; a row in
            the AWS cloud coincidentally states the same number too). The
            CTA is the stronger rendering and stays. */}
      </div>

      {/* At-a-glance summary band: the six headline figures a viewer reaches
          for first, read off the same three domain derivations the full
          sections below compute (no new data paths). Landing pages are
          at-a-glance; the full Network / Cloud / AI workflows breakdown
          folds behind the <details> beneath it — Task 6's low-impact-metrics
          principle applied to this screen.

          This band, not any one domain section, carries the tour's
          `discover-estate` anchor now. The tour's Discover beat speaks about
          "clouds, regions, and VPCs" and "most of it reaches the world over
          public internet" (cloudConnectTour.ts:126) — previously anchored to
          the Cloud section alone (708px tall in an 812px viewport was the
          three-section wrapper's problem, not this one's). The section it
          used to point at now lives inside a closed <details>, and a
          collapsed disclosure is not a spotlight target a viewer can see —
          so the anchor moved up to this always-visible row. */}
      <div
        data-testid="estate-summary-band"
        data-tour="discover-estate"
        className="rounded-2xl border border-fw-secondary bg-fw-base p-3"
      >
        <div className="flex flex-wrap items-stretch gap-2">
          {summaryTiles.map(t => (
            <div
              key={t.key}
              className="min-w-[92px] flex-1 rounded-xl border border-fw-secondary bg-fw-wash px-3 py-2.5 text-center sm:min-w-[104px] sm:flex-none"
            >
              <div className="text-figma-lg font-semibold text-fw-heading tabular-nums">
                {t.value}
                {t.of !== undefined && <span className="text-fw-bodyLight"> / {t.of}</span>}
              </div>
              <div className="whitespace-nowrap text-[11px] uppercase tracking-wide text-fw-bodyLight">
                {t.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The full breakdown, on demand. Every existing `estate-*` testid, the
          per-domain heading/blurb/CTA, and every stat the three sections
          rendered survive unchanged inside the fold — only the anchor and
          the at-a-glance entry point moved. */}
      <details data-testid="estate-breakdown" className="group">
        <summary className="cursor-pointer text-figma-xs font-medium text-fw-link hover:underline">
          Show the breakdown
        </summary>
        <div className="mt-4 space-y-4">
        {domains.map(d => (
          <section
            key={d.key}
            data-testid={`estate-${d.key}`}
            className="space-y-2"
          >
            <div>
              <h2 className="text-figma-sm font-semibold text-fw-heading">{d.label}</h2>
              <p className="text-figma-xs text-fw-bodyLight">{d.blurb}</p>
              {/* The route out of the domain. Before this, every link in
                  Discover's body went to /naas/*: the AI section named a
                  security gap and the screens that close it had no way in. It
                  is also where the taxonomy becomes legible — Network and
                  Cloud are NaaS, AI workflows are the AI Fabric. */}
              <Link
                to={d.cta.to}
                data-testid={`estate-cta-${d.key}`}
                className="mt-1 inline-flex items-center gap-0.5 text-figma-xs font-medium text-fw-link hover:underline"
              >
                {d.cta.label}
                <ChevronRight size={12} aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {d.stats.map(s => (
                <div key={s.key} className="rounded-xl border border-fw-secondary bg-fw-base px-3 py-2.5">
                  <div className="text-figma-lg font-semibold text-fw-heading tabular-nums">
                    {s.value}
                    {s.of !== undefined && (
                      <span className="text-fw-bodyLight"> / {s.of}</span>
                    )}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-fw-bodyLight">{s.label}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
        </div>
      </details>

      <SitesPanel
        branches={filteredBranches}
        selected={selected}
        onToggle={toggleSelect}
        open={open}
        onToggleOpen={toggle}
        cc={cc}
        dim={breakdown}
        onDim={setBreakdown}
      />

      {selected.size > 0 && (
        <SelectionBar
          cc={cc}
          selected={selected}
          onClear={() => setSelected(new Set())}
          onCreated={(label, id) => {
            setSelected(new Set());
            setNamed({ label, id });
          }}
        />
      )}

      {/* Naming what you found is the only mutation Discover makes, and it
          changes nothing about the estate — so the confirmation points at
          where the group now lives rather than offering to act on it. */}
      {named && selected.size === 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-fw-secondary bg-fw-wash px-4 py-3 text-figma-sm text-fw-body"
        >
          <span>
            “{named.label}” is now a group. Nothing in the estate changed — you named what you
            found.
          </span>
          <Link
            to="/naas/govern?tab=groups"
            className="font-medium text-fw-link underline underline-offset-2"
          >
            See it in Govern → Groups
          </Link>
        </div>
      )}

      {wizardOpen && (
        <DiscoveryWizard onClose={() => setWizardOpen(false)} onDiscovered={onDiscovered} />
      )}
    </div>
  );
}
