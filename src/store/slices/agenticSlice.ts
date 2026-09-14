import { StateCreator } from 'zustand';

export interface AgenticSettings {
  enabled: boolean;
  autoResolve: boolean;
  notificationPreference: 'all' | 'critical' | 'none';
  autoTicketCreation: boolean;
}

export interface AgenticSlice {
  agenticSettings: AgenticSettings;
  updateAgenticSettings: (settings: Partial<AgenticSettings>) => void;
  enableAgentic: () => void;
  disableAgentic: () => void;
}

export const createAgenticSlice: StateCreator<AgenticSlice> = (set) => ({
  agenticSettings: {
    enabled: true,
    autoResolve: false,
    notificationPreference: 'all',
    autoTicketCreation: false,
  },
  updateAgenticSettings: (settings) =>
    set((state) => ({
      agenticSettings: { ...state.agenticSettings, ...settings },
    })),
  enableAgentic: () =>
    set((state) => ({
      agenticSettings: { ...state.agenticSettings, enabled: true },
    })),
  disableAgentic: () =>
    set((state) => ({
      agenticSettings: { ...state.agenticSettings, enabled: false },
    })),
});
