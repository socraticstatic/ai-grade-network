import { StateCreator } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'error';
  title: string;
  message: string;
  duration: number | null;
}

export interface AlertConfig {
  title: string;
  reassurance: string;
  reason: string;
  fix: string;
  escalation: string;
  supportId: string;
  actionLabel: string;
  onAction?: () => void;
}

export interface WarningConfig {
  title: string;
  reassurance: string;
  reason: string;
  fix: string;
  escalation: string;
  supportId?: string;
  actionLabel: string;
  onAction?: () => void;
}

export interface ConfirmConfig {
  title: string;
  message: string;
  variant: 'standard' | 'destructive';
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

export interface BannerConfig {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface InAppNotificationSlice {
  activeAlert: AlertConfig | null;
  activeWarning: WarningConfig | null;
  activeConfirm: ConfirmConfig | null;
  activeBanner: BannerConfig | null;
  toasts: ToastItem[];

  showAlert: (config: AlertConfig) => void;
  dismissAlert: () => void;
  showWarning: (config: WarningConfig) => void;
  dismissWarning: () => void;
  showConfirm: (config: ConfirmConfig) => void;
  dismissConfirm: () => void;
  showBanner: (config: BannerConfig) => void;
  dismissBanner: () => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const MAX_TOASTS = 3;

export const createInAppNotificationSlice: StateCreator<InAppNotificationSlice> = (set) => ({
  activeAlert: null,
  activeWarning: null,
  activeConfirm: null,
  activeBanner: null,
  toasts: [],

  showAlert: (config) => set({ activeAlert: config }),
  dismissAlert: () => set({ activeAlert: null }),

  showWarning: (config) => set({ activeWarning: config }),
  dismissWarning: () => set({ activeWarning: null }),

  showConfirm: (config) => set({ activeConfirm: config }),
  dismissConfirm: () => set({ activeConfirm: null }),

  showBanner: (config) => set({ activeBanner: config }),
  dismissBanner: () => set({ activeBanner: null }),

  addToast: (toast) => set((state) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const next = [{ ...toast, id }, ...state.toasts].slice(0, MAX_TOASTS);
    return { toasts: next };
  }),

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
});
