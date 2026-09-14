import type { Connection } from '../types';
import type { Hub } from '../types/hub';
import { getParentHubs, getUtilization, getSlaThisMonth } from './connectionFacts';
import { getConnectionLegs, isC2C } from './connectionLegs';

/**
 * CSV export for a set of connections. Used by the grouped-table actions: export a
 * single type group, the current selection, or the whole (filtered) hub/context.
 */

const cell = (v: unknown): string => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const providersOf = (c: Connection): string =>
  c.providers?.join(' / ') ?? c.provider ?? getConnectionLegs(c).map((l) => l.provider).join(' / ');

export function connectionsToCSV(connections: Connection[], hubs: Hub[]): string {
  const headers = ['Connection', 'Type', 'Hub', 'Provider(s)', 'Status', 'Bandwidth', 'Location', 'Utilization (%)', 'SLA (mo)'];
  const rows = connections.map((c) =>
    [
      c.name,
      isC2C(c) ? 'Cloud to Cloud' : c.type,
      getParentHubs(String(c.id), hubs).map((h) => h.name).join('; '),
      providersOf(c),
      c.status,
      c.bandwidth,
      c.location ?? '',
      getUtilization(c),
      getSlaThisMonth(c),
    ].map(cell).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

/** Build a safe filename from a label, e.g. "VPN to Cloud" → "vpn-to-cloud". */
export function exportFilename(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `connections-${slug || 'export'}.csv`;
}
