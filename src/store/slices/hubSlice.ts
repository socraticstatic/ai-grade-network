import { StateCreator } from 'zustand';
import { Hub } from '../../types/hub';
import { Connection } from '../../types';

export interface HubSlice {
  hubs: Hub[];
  addHub: (router: Hub) => void;
  updateHub: (id: string, updates: Partial<Hub>) => void;
  removeHub: (id: string) => void;
  getRoutersForConnection: (connectionId: string) => Hub[];
  /** Hybrid hub model: connections group automatically by location + route domain.
   *  Returns the hub id (existing or newly created); '' when the connection has no location. */
  ensureHubFor: (connection: Connection) => string;
}

const routeDomainOf = (connection: Connection): 'internet' | 'vpn' =>
  String(connection.type ?? '').toUpperCase().includes('VPN') ? 'vpn' : 'internet';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const createHubSlice: StateCreator<HubSlice> = (set, get) => ({
  hubs: [],

  addHub: (router) =>
    set((state) => ({ hubs: [...state.hubs, router] })),

  updateHub: (id, updates) =>
    set((state) => ({
      hubs: state.hubs.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  removeHub: (id) =>
    set((state) => ({
      hubs: state.hubs.filter((r) => r.id !== id),
    })),

  ensureHubFor: (connection) => {
    const location = (connection as any).location || (connection as any).configuration?.location;
    if (!location) return '';
    const domain = routeDomainOf(connection);
    const existing = get().hubs.find(
      (h) => h.location === location && (h.routeDomain ?? 'internet') === domain
    );
    if (existing) {
      if (!existing.connectionIds.includes(connection.id)) {
        set((state) => ({
          hubs: state.hubs.map((h) =>
            h.id === existing.id
              ? { ...h, connectionIds: [...h.connectionIds, connection.id] }
              : h
          ),
        }));
      }
      return existing.id;
    }
    const hub: Hub = {
      id: `hub-auto-${slug(location)}${domain === 'vpn' ? '-vpn' : ''}`,
      name: domain === 'vpn' ? `${location} (VPN)` : location,
      description: 'Grouped automatically by location',
      status: 'active',
      location,
      locations: [location],
      autoGrouped: true,
      routeDomain: domain,
      createdAt: new Date().toISOString(),
      connectionIds: [connection.id],
      links: [],
    };
    set((state) => ({ hubs: [...state.hubs, hub] }));
    return hub.id;
  },

  getRoutersForConnection: (connectionId) =>
    get().hubs.filter((r) => r.connectionIds.includes(connectionId)),
});
