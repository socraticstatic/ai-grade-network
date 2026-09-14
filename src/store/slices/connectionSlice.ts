import { StateCreator } from 'zustand';
import { Connection } from '../../types';

export interface ConnectionSlice {
  connections: Connection[];
  selectedConnection: string | null;
  addConnection: (connection: Connection) => Promise<void>;
  deleteLmccConnection: (id: string) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  setSelectedConnection: (id: string | null) => void;
  fetchConnections: () => Promise<void>;
  completeProvisioning: (id: string) => void;
}

export const createConnectionSlice: StateCreator<ConnectionSlice> = (set, get) => ({
  connections: [],
  selectedConnection: null,

  fetchConnections: async () => {
    // No-op since we're using sample data
    return Promise.resolve();
  },

  addConnection: async (connection) => {
    try {
      // Auto-suffix the name on collisions so the customer never gets blocked.
      const existing = get().connections;
      const lower = (s: string) => s.trim().toLowerCase();
      let finalName = connection.name;
      if (existing.some(c => lower(c.name) === lower(finalName))) {
        let n = 2;
        while (existing.some(c => lower(c.name) === lower(`${connection.name} (${n})`))) n++;
        finalName = `${connection.name} (${n})`;
      }

      // Generate a unique ID if not provided
      const newId = connection.id || `conn-${Date.now()}`;
      
      // Respect explicit statuses: Pending (LMCC onboarding), Active (LMCC modal —
      // connection is already live when added to store), Inactive (wizard AT&T-first flow).
      // Everything else defaults to Provisioning.
      const EXPLICIT_STATUSES = ['Pending', 'Active', 'Inactive'] as const;
      const newConnection: Connection = {
        ...connection,
        id: newId,
        name: finalName,
        status: (EXPLICIT_STATUSES as readonly string[]).includes(connection.status ?? '')
          ? connection.status!
          : 'Provisioning',
        performance: {
          latency: '<10ms',
          packetLoss: '<0.1%',
          jitter: '<2ms',
          uptime: '99.9%',
          throughput: '0%',
          tunnels: 'Inactive',
          bandwidthUtilization: 0,
          currentUsage: '0 Gbps',
          utilizationTrend: [0, 0, 0, 0, 0, 0, 0]
        },
        features: {
          dedicatedConnection: true,
          redundantPath: connection.features?.redundantPath || false,
          autoScaling: connection.features?.autoScaling || false,
          loadBalancing: connection.features?.loadBalancing || false
        },
        security: {
          encryption: 'AES-256',
          firewall: true,
          ddosProtection: true,
          ipSecEnabled: true
        }
      };

      // Simulate network delay to make it more realistic
      await new Promise(resolve => setTimeout(resolve, 500));

      set((state) => ({
        connections: [newConnection, ...state.connections]
      }));

      // Hybrid hub model: connections group into hubs automatically by location + route domain.
      (get() as any).ensureHubFor?.(newConnection);

      // GA: a generated key expires 7 days out — put the date in the notification feed.
      if (newConnection.configuration?.isLmcc && newConnection.configuration?.lmccKeyCreatedAt && newConnection.status !== 'Active') {
        const expires = new Date(new Date(newConnection.configuration.lmccKeyCreatedAt).getTime() + 7 * 24 * 3600_000);
        (get() as any).addNotification?.({
          id: `lmcc-${newConnection.id}-key-expiry-${Date.now()}`,
          type: 'activity', priority: 'medium', status: 'unread',
          title: 'Activation key expires ' + expires.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          message: `${newConnection.name}: hand the key to AWS before it expires. An expired key carries no configuration, traffic, or billing — you would simply generate a new one.`,
          timestamp: new Date().toISOString(), read: false, archived: false,
          actionUrl: `/connections/${newConnection.id}`, actionLabel: 'View connection',
        });
      }

      // Suppress creation toast for AWS (Max) — the highlighted row pulse handles it
      if (newConnection.provider !== 'AWS') {
        window.addToast({
          type: newConnection.status === 'Pending' ? 'success' : 'info',
          title: newConnection.status === 'Pending' ? 'Connection Created' : 'Provisioning Started',
          message: newConnection.status === 'Pending'
            ? 'Connection created. Complete setup to activate.'
            : 'Your connection is being provisioned. This usually takes a few moments.',
          duration: 4000
        });
      }

    } catch (error) {
      console.error('Error adding connection:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create connection',
        duration: 3000
      });
      throw error;
    }
  },

  updateConnection: async (id, updates) => {
    try {
      const connection = get().connections.find(conn => conn.id === id);

      if (!connection) {
        throw new Error('Connection not found');
      }
      const wasStatus = connection.status;

      // Check if trying to modify configuration while connection is active
      // Allow status changes and provisioning updates, but prevent other modifications when active
      // Bandwidth is the ONE technical attribute changeable on a live LMCC connection (GA).
      const allowedLiveKeys = ['status', 'performance', ...(connection.configuration?.isLmcc ? ['bandwidth'] : [])];
      const isConfigChange = Object.keys(updates).some(key => !allowedLiveKeys.includes(key));
      if (connection.status === 'Active' && isConfigChange) {
        throw new Error('Cannot modify an active connection. Please deactivate the connection first.');
      }

      // If name is being updated and collides, auto-suffix instead of erroring
      if (updates.name) {
        const lower = (s: string) => s.trim().toLowerCase();
        const collides = (n: string) =>
          get().connections.some(c => c.id !== id && lower(c.name) === lower(n));
        if (collides(updates.name)) {
          let n = 2;
          let candidate = `${updates.name} (${n})`;
          while (collides(candidate)) { n++; candidate = `${updates.name} (${n})`; }
          updates = { ...updates, name: candidate };
        }
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        connections: state.connections.map((conn) =>
          conn.id === id ? { ...conn, ...updates } : conn
        ),
      }));

      // GA notifications for LMCC lifecycle moments. Copy stays honest about lag —
      // never promise real-time certainty.
      if (connection.configuration?.isLmcc) {
        const notify = (title: string, message: string, priority: 'high' | 'medium' | 'low' = 'medium') =>
          (get() as any).addNotification?.({
            id: `lmcc-${id}-${title.toLowerCase().replace(/[^a-z]+/g, '-')}-${Date.now()}`,
            type: 'activity', priority, status: 'unread', title, message,
            timestamp: new Date().toISOString(), read: false, archived: false,
            actionUrl: `/connections/${id}`, actionLabel: 'View connection',
          });
        if (updates.status === 'Active' && wasStatus !== 'Active') {
          notify('Connection is Live', `${connection.name}: both AT&T and AWS have confirmed your connection. Status can lag by a few minutes; AWS will notify you on their side as well.`);
        } else if (updates.status === 'Inactive' && wasStatus === 'Active') {
          notify('Connection needs attention', `${connection.name}: a change could not complete, or no path is passing traffic. Your configuration and contract are unchanged — see the connection for next steps.`, 'high');
        } else if (updates.bandwidth !== undefined) {
          notify('Bandwidth change complete', `${connection.name} is now ${String(updates.bandwidth)}. No outage occurred.`);
        }
      }

      window.addToast({
        type: 'success',
        title: 'Connection Updated',
        message: updates.status !== undefined
          ? `Connection is now ${connection.configuration?.isLmcc
              ? (updates.status === 'Active' ? 'Live' : updates.status === 'Inactive' ? 'Needs attention' : updates.status)
              : updates.status}`
          : 'Connection has been updated successfully',
        duration: 3000
      });
    } catch (error) {
      console.error('Error updating connection:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update connection',
        duration: 3000
      });
      throw error;
    }
  },

  // Delete is a commercial event for LMCC (GA): allowed while Live, shows Deleting → Deleted,
  // ends recurring billing, and may trigger an early-termination charge (billing system of record).
  deleteLmccConnection: (id: string) => {
    set((state) => ({
      connections: state.connections.map((c) => c.id === id ? { ...c, status: 'Deleting' as any } : c),
    }));
    (get() as any).logActivity?.({
      type: 'deleted',
      connectionId: id,
      message: 'Service ended by delete — recurring billing stopped; any early-termination charge comes from the billing system of record. AWS notified; everything underneath is being torn down automatically.',
    });
    setTimeout(() => {
      set((state) => ({
        connections: state.connections.map((c) => c.id === id ? { ...c, status: 'Deleted' as any } : c),
      }));
      const name = get().connections.find((c) => c.id === id)?.name ?? 'Connection';
      (get() as any).addNotification?.({
        id: `lmcc-${id}-delete-complete-${Date.now()}`,
        type: 'activity', priority: 'medium', status: 'unread',
        title: 'Delete complete',
        message: `${name}: your service has ended and everything underneath was torn down automatically. Recurring billing stopped at delete; any early-termination charge comes from the billing system of record.`,
        timestamp: new Date().toISOString(), read: false, archived: false,
      });
    }, 1800);
  },

  removeConnection: async (id) => {
    try {
      const connection = get().connections.find(conn => conn.id === id);

      if (!connection) {
        throw new Error('Connection not found');
      }

      if (connection.status === 'Active') {
        throw new Error('Cannot delete an active connection. Please deactivate the connection first.');
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set((state) => ({
        connections: state.connections.filter((conn) => conn.id !== id),
      }));

      window.addToast({
        type: 'success',
        title: 'Connection Deleted',
        message: 'Connection has been deleted successfully',
        duration: 3000
      });
    } catch (error) {
      console.error('Error removing connection:', error);
      window.addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete connection',
        duration: 3000
      });
      throw error;
    }
  },

  setSelectedConnection: (id) => set({ selectedConnection: id }),

  completeProvisioning: (id) => {
    const conn = get().connections.find((c) => c.id === id);
    if (conn?.configuration?.isLmcc && conn.status !== 'Active') {
      (get() as any).addNotification?.({
        id: `lmcc-${id}-live-${Date.now()}`,
        type: 'activity', priority: 'medium', status: 'unread',
        title: 'Connection is Live',
        message: `${conn.name}: both AT&T and AWS have confirmed your connection. Status can lag by a few minutes; AWS will notify you on their side as well.`,
        timestamp: new Date().toISOString(), read: false, archived: false,
        actionUrl: `/connections/${id}`, actionLabel: 'View connection',
      });
    }
    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.id === id
          ? {
              ...conn,
              status: 'Active' as const,
              configuration: conn.configuration?.isLmcc
                ? { ...conn.configuration, lmccActivePaths: 4, lmccPending: false }
                : conn.configuration,
              performance: {
                ...conn.performance!,
                throughput: conn.bandwidth || '1 Gbps',
                tunnels: 'Active',
                bandwidthUtilization: Math.floor(Math.random() * 25) + 5,
                currentUsage: `${Math.floor(Math.random() * 200) + 50} Mbps`,
                utilizationTrend: Array.from({ length: 7 }, () => Math.floor(Math.random() * 30) + 5),
              },
            }
          : conn
      ),
    }));

    window.addToast({
      type: 'success',
      title: conn?.configuration?.isLmcc ? 'Connection is Live' : 'Connection Active',
      message: conn?.configuration?.isLmcc
        ? 'Both AT&T and AWS confirmed your connection. Billing starts now.'
        : 'Connection active. BGP sessions established.',
      duration: 4000,
    });
  },
});