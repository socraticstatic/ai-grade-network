import { StateCreator } from 'zustand';
import { VNF } from '../../types/vnf';

/**
 * VNFs (Virtual Network Functions) are first-class, store-backed entities — same as
 * connections and hubs — so anything created in the guided setup wizard persists and
 * shows up on the connection/hub detail pages. A VNF attaches to a Hub (its routing
 * node) and, optionally, specific Links within it.
 */
export interface VNFSlice {
  vnfs: VNF[];
  addVNF: (vnf: VNF) => void;
  updateVNF: (id: string, updates: Partial<VNF>) => void;
  removeVNF: (id: string) => void;
  getVNFsForConnection: (connectionId: string) => VNF[];
  getVNFsForHub: (hubId: string) => VNF[];
}

export const createVNFSlice: StateCreator<VNFSlice> = (set, get) => ({
  vnfs: [],

  addVNF: (vnf) => set((state) => ({ vnfs: [...state.vnfs, vnf] })),

  updateVNF: (id, updates) =>
    set((state) => ({
      vnfs: state.vnfs.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    })),

  removeVNF: (id) =>
    set((state) => ({ vnfs: state.vnfs.filter((v) => v.id !== id) })),

  getVNFsForConnection: (connectionId) =>
    get().vnfs.filter((v) => v.connectionId === connectionId),

  getVNFsForHub: (hubId) =>
    get().vnfs.filter((v) => v.hubIds?.includes(hubId)),
});
