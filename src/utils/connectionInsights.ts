import type { Connection, Link } from '../types';
import type { Hub } from '../types/hub';
import type { VNF } from '../types/vnf';
import { getConnectionLegs } from './connectionLegs';

/**
 * "Shared objects" engine for the connection drawer. Given a connection and the full
 * fleet, it surfaces what this connection SHARES with others — the relationships a
 * network engineer actually cares about: which hub siblings ride the same router,
 * which IPE is a single point of failure, which VNFs protect it, which VLANs are
 * co-tenant, and which peers sit in the same pool / provider / metro. It also derives
 * a few risk/redundancy insights from those shares.
 */

export interface SharedPeerGroup {
  key: string;
  label: string;        // e.g. "AT&T Core West"
  sublabel?: string;    // e.g. "Hub · 4 other connections"
  peers: Connection[];
}

export interface SharedVNF {
  vnf: VNF;
  sharedWith: number;   // how many OTHER connections this VNF also serves
}

export type InsightTone = 'risk' | 'warn' | 'good' | 'info';
export interface Insight {
  tone: InsightTone;
  text: string;
}

export interface SharedObjects {
  hubGroups: SharedPeerGroup[];      // hub siblings (per hub)
  poolGroup?: SharedPeerGroup;       // same pool
  ipeGroup?: SharedPeerGroup;        // same IPE (single-point-of-failure lens)
  providerGroups: SharedPeerGroup[]; // same provider
  metroGroup?: SharedPeerGroup;      // same location/metro
  vnfs: SharedVNF[];                 // VNFs serving this connection
  vlans: Link[];                     // co-tenant VLANs on this connection's hub(s)
  insights: Insight[];
}

interface InsightContext {
  connections: Connection[];
  hubs: Hub[];
  vnfs: VNF[];
}

const id = (c: Connection) => String(c.id);
const providersOf = (c: Connection): string[] =>
  c.providers?.length ? c.providers : c.provider ? [c.provider] : getConnectionLegs(c).map((l) => l.provider);

export function getSharedObjects(connection: Connection, ctx: InsightContext): SharedObjects {
  const { connections, hubs, vnfs } = ctx;
  const others = connections.filter((c) => id(c) !== id(connection));
  const myHubIds = connection.hubIds ?? [];
  const myProviders = providersOf(connection);

  // --- Hub siblings (per hub) ---
  const hubGroups: SharedPeerGroup[] = myHubIds
    .map((hid) => hubs.find((h) => h.id === hid))
    .filter((h): h is Hub => !!h)
    .map((h) => {
      const peers = others.filter((c) => (c.hubIds ?? []).includes(h.id));
      return {
        key: `hub-${h.id}`,
        label: h.name,
        sublabel: `Hub · ${peers.length} other connection${peers.length !== 1 ? 's' : ''}`,
        peers,
      };
    });

  // --- Pool peers ---
  let poolGroup: SharedPeerGroup | undefined;
  if (connection.pool) {
    const peers = others.filter((c) => c.pool === connection.pool);
    if (peers.length) {
      poolGroup = {
        key: `pool-${connection.pool}`,
        label: connection.poolName ?? connection.pool,
        sublabel: `Pool · ${peers.length} connection${peers.length !== 1 ? 's' : ''}`,
        peers,
      };
    }
  }

  // --- IPE (single point of failure lens) ---
  let ipeGroup: SharedPeerGroup | undefined;
  const ipe = connection.primaryIPE;
  if (ipe && ipe !== 'Not provisioned' && ipe !== 'Not configured') {
    const peers = others.filter((c) => c.primaryIPE === ipe || c.secondaryIPE === ipe);
    ipeGroup = {
      key: `ipe-${ipe}`,
      label: ipe,
      sublabel: `IPE · ${peers.length} other connection${peers.length !== 1 ? 's' : ''}`,
      peers,
    };
  }

  // --- Provider peers ---
  const providerGroups: SharedPeerGroup[] = myProviders.map((p) => {
    const peers = others.filter((c) => providersOf(c).includes(p));
    return {
      key: `provider-${p}`,
      label: p,
      sublabel: `Provider · ${peers.length} connection${peers.length !== 1 ? 's' : ''}`,
      peers,
    };
  }).filter((g) => g.peers.length > 0);

  // --- Metro peers ---
  let metroGroup: SharedPeerGroup | undefined;
  if (connection.location) {
    const peers = others.filter((c) => c.location === connection.location);
    if (peers.length) {
      metroGroup = {
        key: `metro-${connection.location}`,
        label: connection.location,
        sublabel: `Metro · ${peers.length} connection${peers.length !== 1 ? 's' : ''}`,
        peers,
      };
    }
  }

  // --- VNFs serving this connection (by connectionId or shared hub) ---
  const servingVnfs = vnfs.filter(
    (v) => v.connectionId === id(connection) || (v.hubIds ?? []).some((h) => myHubIds.includes(h)),
  );
  const vnfShared: SharedVNF[] = servingVnfs.map((v) => {
    const servesIds = new Set<string>([v.connectionId]);
    // a VNF on a shared hub effectively serves every connection on that hub
    (v.hubIds ?? []).forEach((h) => connections.filter((c) => (c.hubIds ?? []).includes(h)).forEach((c) => servesIds.add(id(c))));
    servesIds.delete(id(connection));
    return { vnf: v, sharedWith: servesIds.size };
  });

  // --- Co-tenant VLANs on this connection's hub(s) ---
  const vlans: Link[] = myHubIds
    .map((hid) => hubs.find((h) => h.id === hid))
    .filter((h): h is Hub => !!h)
    .flatMap((h) => h.links ?? []);

  // --- Derived insights ---
  const insights: Insight[] = [];

  if (connection.ipeRedundancy && connection.primaryIPE && connection.secondaryIPE) {
    insights.push({ tone: 'good', text: `Dual-IPE redundant — primary ${connection.primaryIPE}, secondary ${connection.secondaryIPE}.` });
  } else if (ipeGroup && ipeGroup.peers.length >= 1 && !connection.ipeRedundancy) {
    insights.push({
      tone: 'risk',
      text: `${ipeGroup.peers.length + 1} connections terminate on a single IPE (${ipe}) with no redundancy — a failure takes them all down.`,
    });
  }

  // Blast radius of the primary hub
  const primaryHub = hubs.find((h) => h.id === myHubIds[0]);
  if (primaryHub) {
    const hubConns = connections.filter((c) => (c.hubIds ?? []).includes(primaryHub.id));
    const typeCount = new Set(hubConns.map((c) => ((c.providers?.length ?? 0) > 1 ? 'Cloud to Cloud' : c.type))).size;
    if (hubConns.length > 1) {
      insights.push({ tone: 'info', text: `Shares hub "${primaryHub.name}" with ${hubConns.length - 1} other connection${hubConns.length - 1 !== 1 ? 's' : ''} across ${typeCount} type${typeCount !== 1 ? 's' : ''}.` });
    }
  }

  // Provider concentration through this hub
  myProviders.forEach((p) => {
    const total = connections.filter((c) => providersOf(c).includes(p)).length;
    const throughHub = connections.filter((c) => providersOf(c).includes(p) && (c.hubIds ?? []).some((h) => myHubIds.includes(h))).length;
    if (total >= 3 && throughHub >= 2 && throughHub / total >= 0.5) {
      insights.push({ tone: 'warn', text: `${throughHub} of your ${total} ${p} connections route through this hub — concentration risk.` });
    }
  });

  // Only active path to a provider in this metro
  myProviders.forEach((p) => {
    if (connection.status !== 'Active') return;
    const sameMetroProvider = connections.filter(
      (c) => providersOf(c).includes(p) && c.location === connection.location,
    );
    const activeOnes = sameMetroProvider.filter((c) => c.status === 'Active');
    if (sameMetroProvider.length > 1 && activeOnes.length === 1) {
      insights.push({ tone: 'warn', text: `Only Active ${p} connection in ${connection.location} — others are pending/inactive.` });
    }
  });

  return { hubGroups, poolGroup, ipeGroup, providerGroups, metroGroup, vnfs: vnfShared, vlans, insights };
}
