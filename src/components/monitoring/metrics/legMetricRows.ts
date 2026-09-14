import type { CloudProvider, Connection, ConnectionStatus } from '../../../types/connection';
import { getConnectionLegs, isC2C } from '../../../utils/connectionLegs';

/**
 * A single row in a per-connection monitoring view. A Cloud to Cloud connection
 * expands into one row per cloud leg so monitoring can show which leg is degraded;
 * everything else is one row. Built on the shared leg model (utils/connectionLegs).
 */
export interface LegMetricRow {
  /** Stable unique id (connectionId, or `${connectionId}:${provider}` for a leg). */
  id: string;
  /** Display label, e.g. "Multi-Cloud Production · AWS". */
  label: string;
  connectionId: string;
  provider?: CloudProvider;
  status: ConnectionStatus;
}

export function buildLegMetricRows(connections: Connection[]): LegMetricRow[] {
  return connections.flatMap((conn) => {
    if (!isC2C(conn)) {
      return [{ id: conn.id, label: conn.name, connectionId: conn.id, status: conn.status }];
    }
    // Provider-first so the distinguishing cloud survives label truncation in charts.
    return getConnectionLegs(conn).map((leg) => ({
      id: `${conn.id}:${leg.provider}`,
      label: `${leg.provider} · ${conn.name}`,
      connectionId: conn.id,
      provider: leg.provider,
      status: leg.status,
    }));
  });
}
