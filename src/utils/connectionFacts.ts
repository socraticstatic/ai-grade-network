/**
 * Single source of truth for the connection/hub "facts" surfaced across cards,
 * tables, topology and detail pages. Several of these (cloud region, BGP state,
 * monthly SLA, resiliency) are not first-class fields on every mock record, so we
 * derive them deterministically from existing data — stable per connection id, and
 * honest about what's real (uptime, resiliencyLevel) vs synthesized for the demo.
 */
import type { Connection } from '../types/connection';
import type { Hub } from '../types/hub';
import { getConnectionLegs, isC2C } from './connectionLegs';

export type Resiliency = 'Standard' | 'Maximum' | 'Geodiversity';
export type BgpStatus = 'Up' | 'Down';

/** Stable, tiny string hash for deterministic synthesized values. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ── Resiliency ────────────────────────────────────────────────────────────────
export function getResiliency(c: Connection): Resiliency {
  const lvl = (c.configuration as any)?.resiliencyLevel as string | undefined;
  if (lvl) {
    const m: Record<string, Resiliency> = {
      standard: 'Standard',
      maximum: 'Maximum',
      geodiversity: 'Geodiversity',
    };
    return m[lvl.toLowerCase()] ?? 'Standard';
  }
  if (c.provider === 'AWS' || (c.configuration as any)?.isLmcc) return 'Maximum';
  if (isC2C(c) || (c.locations && c.locations.length > 1)) return 'Geodiversity';
  return 'Standard';
}

export function resiliencyTone(r: Resiliency): { text: string; bg: string; border: string } {
  switch (r) {
    case 'Maximum':
      return { text: 'text-fw-link', bg: 'bg-brand-lightBlue', border: 'border-fw-active/20' };
    case 'Geodiversity':
      return { text: 'text-fw-link', bg: 'bg-fw-purpleLight', border: 'border-fw-active/20' };
    default:
      return { text: 'text-fw-body', bg: 'bg-fw-wash', border: 'border-fw-secondary' };
  }
}

// ── BGP status ──────────────────────────────────────────────────────────────────
// Tracks operational status, but a deterministic subset of Active connections shows
// Down to represent a flapping/idle session — so the BGP signal isn't just a mirror
// of status and the column earns its place.
export function getBgpStatus(c: Connection): BgpStatus {
  if (c.status !== 'Active') return 'Down';
  return hash(c.id) % 7 === 0 ? 'Down' : 'Up';
}

/** Per-leg BGP, so C2C legs can diverge. */
export function getLegBgpStatus(c: Connection, legIndex: number): BgpStatus {
  const legs = getConnectionLegs(c);
  const leg = legs[legIndex];
  if (!leg || leg.status !== 'Active') return 'Down';
  return hash(c.id + ':' + legIndex) % 7 === 0 ? 'Down' : 'Up';
}

// ── SLA this month ──────────────────────────────────────────────────────────────
export function getSlaThisMonth(c: Connection): string {
  return c.performance?.uptime ?? '99.95%';
}

/** Hub SLA = the floor (worst) across its child connections. */
export function getHubSla(connections: Connection[]): string {
  const vals = connections
    .map((c) => parseFloat((c.performance?.uptime ?? '').replace('%', '')))
    .filter((n) => !Number.isNaN(n));
  if (vals.length === 0) return '99.99%';
  return `${Math.min(...vals).toFixed(2)}%`;
}

// ── Bandwidth utilization ─────────────────────────────────────────────────────────
export function getUtilization(c: Connection): number {
  return c.performance?.bandwidthUtilization ?? 0;
}

/** Hub utilization = mean of its connections' utilization. */
export function getHubUtilization(connections: Connection[]): number {
  const vals = connections.map((c) => c.performance?.bandwidthUtilization ?? 0);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** Hub PEAK utilization — the hottest connection. For a hub the peak matters
 *  more than the mean (a 90/10 pair averages to a misleading 50%). */
export function getHubPeakUtilization(connections: Connection[]): number {
  const vals = connections.map((c) => c.performance?.bandwidthUtilization ?? 0);
  return vals.length === 0 ? 0 : Math.max(...vals);
}

/** Tailwind bg class for a utilization meter, matching the card thresholds. */
export function utilizationColor(pct: number): string {
  if (pct > 90) return 'bg-fw-errorLight0';
  if (pct > 80) return 'bg-complementary-amber';
  if (pct > 60) return 'bg-brand-blue';
  return 'bg-complementary-green';
}

// ── Region / metro ────────────────────────────────────────────────────────────────
// Plausible cloud region per (provider, metro), plus a colo facility label, so the
// "us-east-1 · Chicago–Equinix CH2" treatment has real-looking parts to show.
const REGION_BY_METRO: Record<string, Partial<Record<string, string>>> = {
  ashburn: { aws: 'us-east-1', azure: 'eastus', google: 'us-east4', oracle: 'us-ashburn-1' },
  'san jose': { aws: 'us-west-1', azure: 'westus', google: 'us-west2', oracle: 'us-sanjose-1' },
  'council bluffs': { aws: 'us-east-2', azure: 'centralus', google: 'us-central1', oracle: 'us-chicago-1' },
  chicago: { aws: 'us-east-2', azure: 'northcentralus', google: 'us-central1', oracle: 'us-chicago-1' },
  dallas: { aws: 'us-east-1', azure: 'southcentralus', google: 'us-south1', oracle: 'us-dallas-1' },
  'new york': { aws: 'us-east-1', azure: 'eastus2', google: 'us-east4', oracle: 'us-ashburn-1' },
  'los angeles': { aws: 'us-west-2', azure: 'westus2', google: 'us-west2', oracle: 'us-sanjose-1' },
  london: { aws: 'eu-west-2', azure: 'uksouth', google: 'europe-west2', oracle: 'uk-london-1' },
};

const FACILITY_BY_METRO: Record<string, string> = {
  ashburn: 'Ashburn–Equinix DC2',
  'san jose': 'San Jose–Equinix SV1',
  'council bluffs': 'Council Bluffs–GCP',
  chicago: 'Chicago–Equinix CH2',
  dallas: 'Dallas–Digital Realty DFW',
  'new york': 'New York–Equinix NY9',
  'los angeles': 'Los Angeles–CoreSite LA1',
  london: 'London–Equinix LD5',
};

function metroKey(loc?: string): string {
  if (!loc) return '';
  return loc.toLowerCase().replace(/[,–-].*$/, '').trim();
}

export function getCloudRegion(provider?: string, location?: string): string | null {
  const key = metroKey(location);
  const entry = REGION_BY_METRO[key];
  if (!entry || !provider) return null;
  return entry[provider.toLowerCase()] ?? null;
}

export function getFacility(location?: string): string | null {
  const key = metroKey(location);
  return FACILITY_BY_METRO[key] ?? (location || null);
}

/** "us-east-1 · Ashburn–Equinix DC2" — region · facility, gracefully degrading. */
export function formatRegionMetro(provider?: string, location?: string): string {
  const region = getCloudRegion(provider, location);
  const facility = getFacility(location);
  if (region && facility) return `${region} · ${facility}`;
  return region || facility || (location ?? '—');
}

/**
 * Deduped region·metro labels across ALL of a connection's legs — so a multi-cloud
 * (C2C) connection shows every region it touches, not just the first leg's.
 */
export function getConnectionRegions(c: Connection): string[] {
  const legs = getConnectionLegs(c);
  const labels = (legs.length > 0
    ? legs.map((l) => formatRegionMetro(l.provider, l.location))
    : [formatRegionMetro(c.provider, c.location)]
  ).filter((s) => s && s !== '—');
  return [...new Set(labels)];
}

// ── Parent hub ──────────────────────────────────────────────────────────────
export function getParentHubs(connectionId: string, hubs: Hub[]): Hub[] {
  return hubs.filter((g) => g.connectionIds?.includes(connectionId));
}

// ── Hub spread (multi-connection) ───────────────────────────────────────────
/** Distinct cloud providers across a hub's connections (deduped, ordered). */
export function getHubProviders(connections: Connection[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  connections.forEach((c) =>
    getConnectionLegs(c).forEach((l) => {
      if (l.provider && !seen.has(l.provider)) {
        seen.add(l.provider);
        out.push(l.provider);
      }
    }),
  );
  return out;
}

/** Count of distinct cloud regions across a hub's connections. */
export function getHubRegionCount(connections: Connection[]): number {
  const set = new Set<string>();
  connections.forEach((c) =>
    getConnectionLegs(c).forEach((l) => {
      const r = getCloudRegion(l.provider, l.location);
      if (r) set.add(r);
    }),
  );
  return set.size;
}
