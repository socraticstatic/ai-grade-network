import { StateCreator } from 'zustand';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../../utils/localStorageUtils';

/**
 * Detached window metadata
 */
export interface DetachedWindow {
  id: string;
  tableId: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  timestamp: number;
}

/**
 * Window reference tracking (not persisted)
 */
interface WindowRef {
  id: string;
  windowRef: Window | null;
  lastHeartbeat: number;
}

export interface DetachedWindowSlice {
  detachedWindows: DetachedWindow[];
  openWindow: (tableId: string, config?: Partial<DetachedWindow>) => string | null;
  closeWindow: (id: string) => void;
  updateWindowState: (id: string, updates: Partial<DetachedWindow>) => void;
  isWindowOpen: (tableId: string) => boolean;
  getWindowById: (id: string) => DetachedWindow | undefined;
  getWindowByTableId: (tableId: string) => DetachedWindow | undefined;
  cleanupClosedWindows: () => void;
}

const STORAGE_KEY = 'detached_windows';
const MAX_WINDOWS = 15;
const HEARTBEAT_INTERVAL = 5000; // 5 seconds

// Track window references (not in Zustand to avoid memory leaks)
const windowRefs = new Map<string, WindowRef>();

/**
 * Load detached windows metadata from localStorage
 */
function loadDetachedWindows(): DetachedWindow[] {
  try {
    const stored = safeGetItem<DetachedWindow[]>(STORAGE_KEY);
    if (stored && Array.isArray(stored)) {
      // Filter out windows older than 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      return stored.filter(w => w.timestamp > oneDayAgo);
    }
    return [];
  } catch (error) {
    console.error('[DetachedWindows] Error loading:', error);
    return [];
  }
}

/**
 * Save detached windows metadata to localStorage
 */
function saveDetachedWindows(windows: DetachedWindow[]): void {
  safeSetItem(STORAGE_KEY, windows);
}

/**
 * Generate unique window ID
 */
function generateWindowId(): string {
  return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a window is still open
 */
function isWindowStillOpen(id: string): boolean {
  const ref = windowRefs.get(id);
  if (!ref || !ref.windowRef) return false;

  try {
    // Try to access window.closed
    return !ref.windowRef.closed;
  } catch {
    // Window is from different origin or closed
    return false;
  }
}

/**
 * Heartbeat check to clean up closed windows
 */
function startHeartbeatCheck(cleanupFn: () => void) {
  setInterval(() => {
    cleanupFn();
  }, HEARTBEAT_INTERVAL);
}

/**
 * Create detached window slice
 */
export const createDetachedWindowSlice: StateCreator<DetachedWindowSlice> = (set, get) => {
  // Load initial state
  const initialWindows = loadDetachedWindows();

  // Start heartbeat to clean up closed windows
  if (typeof window !== 'undefined') {
    startHeartbeatCheck(() => {
      const { cleanupClosedWindows } = get();
      cleanupClosedWindows();
    });
  }

  return {
    detachedWindows: initialWindows,

    openWindow: (tableId: string, config = {}) => {
      const { detachedWindows } = get();

      // Check if we've reached max windows
      if (detachedWindows.length >= MAX_WINDOWS) {
        if (window.addToast) {
          window.addToast({
            type: 'warning',
            title: 'Too Many Windows',
            message: `Maximum of ${MAX_WINDOWS} detached windows allowed`,
            duration: 5000
          });
        }
        return null;
      }

      // Check if window for this table already exists
      const existing = detachedWindows.find(w => w.tableId === tableId);
      if (existing) {
        // Focus existing window
        const ref = windowRefs.get(existing.id);
        if (ref?.windowRef && !ref.windowRef.closed) {
          ref.windowRef.focus();
          return existing.id;
        }
      }

      // Create new window
      const id = generateWindowId();
      const newWindow: DetachedWindow = {
        id,
        tableId,
        timestamp: Date.now(),
        ...config
      };

      // Calculate default window position (cascade)
      const defaultWidth = 1200;
      const defaultHeight = 800;
      const cascadeOffset = (detachedWindows.length % 10) * 30;

      const features = [
        `width=${config.size?.width || defaultWidth}`,
        `height=${config.size?.height || defaultHeight}`,
        `left=${(config.position?.x || 100) + cascadeOffset}`,
        `top=${(config.position?.y || 100) + cascadeOffset}`,
        'resizable=yes',
        'scrollbars=yes',
        'toolbar=no',
        'menubar=no',
        'location=no',
        'status=yes'
      ].join(',');

      // Open new window - parse tableId to get type and connectionId
      const [tableType, connectionId] = tableId.split('-');

      // Use BASE_URL from Vite to respect deployment path (e.g., GitHub Pages subdirectory)
      const basePath = import.meta.env.BASE_URL || '/';
      const cleanBase = basePath === '/' ? '' : basePath.replace(/\/$/, '');
      const windowUrl = `${cleanBase}/detached/${tableType}/${connectionId}/${id}`;

      try {
        const windowRef = window.open(windowUrl, `detached-${id}`, features);

        if (!windowRef) {
          // Popup blocked
          if (window.addToast) {
            window.addToast({
              type: 'error',
              title: 'Popup Blocked',
              message: 'Please allow popups for this site to use detached tables',
              duration: 7000
            });
          }
          return null;
        }

        // Store window reference
        windowRefs.set(id, {
          id,
          windowRef,
          lastHeartbeat: Date.now()
        });

        // Update state
        const updatedWindows = [...detachedWindows, newWindow];
        set({ detachedWindows: updatedWindows });
        saveDetachedWindows(updatedWindows);

        // Handle window close
        const checkClosed = setInterval(() => {
          if (windowRef.closed) {
            clearInterval(checkClosed);
            const { closeWindow } = get();
            closeWindow(id);
          }
        }, 1000);


        return id;

      } catch (error) {
        console.error('[DetachedWindows] Error opening window:', error);

        if (window.addToast) {
          window.addToast({
            type: 'error',
            title: 'Failed to Open Window',
            message: 'Unable to open detached table window',
            duration: 5000
          });
        }

        return null;
      }
    },

    closeWindow: (id: string) => {
      const { detachedWindows } = get();

      // Close actual window if still open
      const ref = windowRefs.get(id);
      if (ref?.windowRef && !ref.windowRef.closed) {
        try {
          ref.windowRef.close();
        } catch (error) {
          console.error('[DetachedWindows] Error closing window:', error);
        }
      }

      // Remove window reference
      windowRefs.delete(id);

      // Update state
      const updatedWindows = detachedWindows.filter(w => w.id !== id);
      set({ detachedWindows: updatedWindows });
      saveDetachedWindows(updatedWindows);


    },

    updateWindowState: (id: string, updates: Partial<DetachedWindow>) => {
      const { detachedWindows } = get();

      const updatedWindows = detachedWindows.map(w =>
        w.id === id ? { ...w, ...updates } : w
      );

      set({ detachedWindows: updatedWindows });
      saveDetachedWindows(updatedWindows);
    },

    isWindowOpen: (tableId: string) => {
      const { detachedWindows } = get();
      const window = detachedWindows.find(w => w.tableId === tableId);

      if (!window) return false;

      return isWindowStillOpen(window.id);
    },

    getWindowById: (id: string) => {
      const { detachedWindows } = get();
      return detachedWindows.find(w => w.id === id);
    },

    getWindowByTableId: (tableId: string) => {
      const { detachedWindows } = get();
      return detachedWindows.find(w => w.tableId === tableId);
    },

    cleanupClosedWindows: () => {
      const { detachedWindows, closeWindow } = get();

      detachedWindows.forEach(window => {
        if (!isWindowStillOpen(window.id)) {
          closeWindow(window.id);
        }
      });
    }
  };
};

/**
 * Export window refs for external access (if needed)
 */
export { windowRefs };
