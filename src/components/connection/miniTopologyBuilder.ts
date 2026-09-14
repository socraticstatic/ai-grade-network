import type { Connection } from '../../types/connection';
import type { Hub } from '../../types/hub';
import { getConnectionLegs } from '../../utils/connectionLegs';

/**
 * Pure topology builders shared by every surface that draws a connection or a
 * hub. There is ONE leg model (utils/connectionLegs) and ONE set of builders so
 * a C2C connection renders identically as a card, a detail diagram, or a hub
 * hub. The Hub is AT&T's Cloud Node and is always drawn as the hub.
 */
export interface MiniNode {
  id: string;
  x: number;
  y: number;
  label: string;
  sublabel?: string;
  icon: 'hub' | 'cloud' | 'ipe';
  isActive: boolean;
  cloudProvider?: string;
  /** Connection this node belongs to (set in hub mode for drill-down). */
  connectionId?: string;
}

export interface MiniEdge {
  from: string;
  to: string;
  isActive: boolean;
}

const CENTER_Y = 80;

function friendlyLoc(loc: string | undefined): string | undefined {
  if (!loc) return undefined;
  if (loc.startsWith('metro-sj')) return 'San Jose, CA';
  if (loc.startsWith('metro-la')) return 'Los Angeles, CA';
  if (loc.startsWith('metro-ashburn')) return 'Ashburn, VA';
  return loc;
}

/** Spread N cloud nodes vertically, centered on CENTER_Y. */
function cloudY(index: number, count: number): number {
  if (count <= 1) return CENTER_Y;
  return CENTER_Y + (index - (count - 1) / 2) * 50;
}

/**
 * Connection-centric topology: Core -> Hub hub -> one cloud per leg.
 * Used by connection cards and connection detail. Every leg of an active C2C
 * connection is drawn active.
 */
export function buildConnectionTopology(
  connection: Connection,
  opts: { hubsCount?: number } = {},
): { nodes: MiniNode[]; edges: MiniEdge[] } {
  const nodes: MiniNode[] = [];
  const edges: MiniEdge[] = [];
  const isAws = connection.provider === 'AWS' && connection.type !== 'Cloud to Cloud';
  const connActive = connection.status === 'Active';
  const legs = getConnectionLegs(connection);

  nodes.push({
    id: 'core',
    x: 60,
    y: CENTER_Y,
    label: isAws ? 'Your Network' : friendlyLoc(connection.location) || 'AT&T Core',
    sublabel: connection.type === 'Internet to Cloud' ? 'Internet' : 'MPLS',
    icon: 'ipe',
    isActive: connActive,
  });

  nodes.push({
    id: 'router',
    x: 260,
    y: CENTER_Y,
    label: 'Hub',
    sublabel: opts.hubsCount && opts.hubsCount > 0 ? `${opts.hubsCount} active` : undefined,
    icon: 'hub',
    isActive: connActive,
  });
  edges.push({ from: 'core', to: 'router', isActive: connActive });

  legs.forEach((leg, i) => {
    const legActive = leg.status === 'Active';
    const id = `cloud${i}`;
    nodes.push({
      id,
      x: 460,
      y: cloudY(i, legs.length),
      label: `${leg.provider} Cloud`,
      sublabel: leg.bandwidth,
      icon: 'cloud',
      isActive: legActive,
      cloudProvider: leg.provider.toLowerCase(),
    });
    edges.push({ from: 'router', to: id, isActive: legActive });
  });

  return { nodes, edges };
}

/**
 * Hub-centric topology: Core -> Hub hub -> the clouds of every connection
 * on that hub, expanded per leg. Used by the topology views and hub detail.
 * Caps the cloud count and reports overflow so multi-cloud hubs stay legible.
 */
export function buildHubTopology(
  router: Hub,
  connections: Connection[],
  opts: { maxClouds?: number } = {},
): { nodes: MiniNode[]; edges: MiniEdge[]; extraCount: number } {
  const maxClouds = opts.maxClouds ?? 4;
  const nodes: MiniNode[] = [];
  const edges: MiniEdge[] = [];
  const routerActive = router.status === 'active';

  nodes.push({ id: 'core', x: 60, y: CENTER_Y, label: 'AT&T Core', sublabel: router.location, icon: 'ipe', isActive: routerActive });
  nodes.push({ id: 'router', x: 260, y: CENTER_Y, label: router.name, sublabel: undefined, icon: 'hub', isActive: routerActive });
  edges.push({ from: 'core', to: 'router', isActive: routerActive });

  // Flatten every connection into its legs so a C2C contributes one node per cloud.
  const allLegs = connections.flatMap((conn) =>
    getConnectionLegs(conn).map((leg) => ({ leg, connActive: conn.status === 'Active', connectionId: conn.id })),
  );
  const shown = allLegs.slice(0, maxClouds);
  const extraCount = allLegs.length - shown.length;

  shown.forEach(({ leg, connActive, connectionId }, i) => {
    const id = `cloud${i}`;
    const legActive = connActive && leg.status === 'Active';
    nodes.push({
      id,
      x: 460,
      y: cloudY(i, shown.length),
      label: `${leg.provider} Cloud`,
      sublabel: leg.bandwidth,
      icon: 'cloud',
      isActive: legActive,
      cloudProvider: leg.provider.toLowerCase(),
      connectionId,
    });
    edges.push({ from: 'router', to: id, isActive: legActive });
  });

  return { nodes, edges, extraCount };
}
