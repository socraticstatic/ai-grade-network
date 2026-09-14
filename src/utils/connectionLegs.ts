import type { CloudProvider, Connection, ConnectionLegConfig } from '../types/connection';

/**
 * A C2C connection is a single AT&T Connection terminating on one Hub (AT&T's
 * Cloud Node) with two or more cloud destinations. Each destination is a "leg".
 * This module is the single source of truth for deriving legs from a Connection so
 * every surface (cards, tables, topology, monitoring, config, API export) renders
 * the same shape. See connection-builder skill for the domain model.
 */
export interface ConnectionLeg {
  provider: CloudProvider;
  location?: string;
  bandwidth: string;
  status: Connection['status'];
  /** Link ids attributed to this leg (requires provider-tagged links). */
  linkIds: string[];
}

/** A link carrying enough identity to attribute it to a leg. */
interface LegLink {
  id: string;
  provider?: CloudProvider;
}

/** True when the connection is an AT&T Cloud to Cloud connection. */
export function isC2C(connection: Pick<Connection, 'type'>): boolean {
  return connection.type === 'Cloud to Cloud';
}

/** Providers for a connection, normalized to a non-empty list when possible. */
function providersOf(connection: Connection): CloudProvider[] {
  if (connection.providers && connection.providers.length > 0) return connection.providers;
  if (connection.provider) return [connection.provider];
  return [];
}

/**
 * Derive the legs of a connection. A single-cloud connection yields one leg; a C2C
 * connection yields one leg per provider, each paired with its location by index.
 * Pass `links` (provider-tagged) to attribute links to their leg.
 */
export function getConnectionLegs(connection: Connection, links?: LegLink[]): ConnectionLeg[] {
  const linksFor = (provider: CloudProvider) =>
    (links ?? []).filter((l) => l.provider === provider).map((l) => l.id);

  // Prefer persisted per-leg config so legs can diverge (bandwidth/status per cloud).
  if (connection.legs && connection.legs.length > 0) {
    return connection.legs.map((leg) => ({
      provider: leg.provider,
      location: leg.location ?? connection.location,
      bandwidth: leg.bandwidth ?? connection.bandwidth,
      status: leg.status ?? connection.status,
      linkIds: linksFor(leg.provider),
    }));
  }

  // Fall back to deriving uniform legs from providers[].
  const providers = providersOf(connection);
  return providers.map((provider, i) => ({
    provider,
    location: connection.locations?.[i] ?? connection.location,
    bandwidth: connection.bandwidth,
    status: connection.status,
    linkIds: linksFor(provider),
  }));
}

/** Short label of a connection's clouds, e.g. "Azure · AWS". Hub is implied, never dropped. */
export function legSummary(connection: Connection): string {
  return providersOf(connection).join(' · ');
}

/**
 * Return a persistable legs array with `patch` applied to the leg at `legIndex`,
 * materializing legs from the derived model when none are stored yet. Use the result
 * as `updateConnection(id, { legs })` to edit a single leg's bandwidth/status/location.
 */
export function applyLegPatch(
  connection: Connection,
  legIndex: number,
  patch: Partial<ConnectionLegConfig>,
): ConnectionLegConfig[] {
  const base: ConnectionLegConfig[] = getConnectionLegs(connection).map((leg) => ({
    provider: leg.provider,
    location: leg.location,
    bandwidth: leg.bandwidth,
    status: leg.status,
  }));
  return base.map((leg, i) => (i === legIndex ? { ...leg, ...patch } : leg));
}
