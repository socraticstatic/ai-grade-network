import { StateCreator } from 'zustand';
import { Alert } from '../../types';

export interface AlertSlice {
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
}

export const createAlertSlice: StateCreator<AlertSlice> = (set) => ({
  alerts: [],
  addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, alert] })),
  removeAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) })),
  clearAlerts: () => set({ alerts: [] }),
});