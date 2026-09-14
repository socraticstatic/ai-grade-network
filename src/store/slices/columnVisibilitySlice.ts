import { StateCreator } from 'zustand';
import { safeGetItem, safeSetItem } from '../../utils/localStorageUtils';

/**
 * Column configuration per table
 * Key: tableId, Value: array of visible column IDs
 */
export type ColumnConfig = Record<string, string[]>;

export interface ColumnVisibilitySlice {
  columnConfig: ColumnConfig;
  getVisibleColumns: (tableId: string) => string[];
  initColumnConfig: (tableId: string) => void;
  setVisibleColumns: (tableId: string, columns: string[]) => void;
  toggleColumn: (tableId: string, columnId: string, allColumnIds?: string[]) => void;
  showAllColumns: (tableId: string, allColumnIds: string[]) => void;
  hideAllColumns: (tableId: string, allColumnIds: string[]) => void;
  resetToDefaults: (tableId: string) => void;
  isColumnVisible: (tableId: string, columnId: string) => boolean;
}

/**
 * Default column sets for each table
 */
const DEFAULT_COLUMNS: ColumnConfig = {
  'connections-list': ['name', 'provider', 'type', 'status', 'bandwidth', 'resiliency', 'location', 'hubs'],
  // Flat connections table — curated default column set (gear can toggle the rest).
  'connections-list-flat': ['name', 'provider', 'type', 'region', 'bandwidth', 'cost', 'utilization', 'sla', 'resiliency', 'status', 'health'],
  // Shared connection Fields scope: drives the large connection cards' fact strip AND the
  // per-type table columns (ConnectionTypeTable). Mini cards are a locked layout and ignore
  // this. Default is tuned to read well as both card facts and table columns.
  'conn-card': ['provider', 'bandwidth', 'cost', 'utilization', 'sla', 'resiliency'],
  // Hub card meta fields (drive both mini + large hub cards). Composition (connections
  // by type) leads by default — it already conveys the count, so 'connections' is left
  // off the default set (toggle it on via the gear). The rest are toggleable too.
  'gw-card': ['composition', 'utilization', 'providers', 'sla'],
  'groups-list': ['name', 'description', 'type', 'connections', 'members', 'status'],
  users: ['user', 'role', 'permissions', 'scope', 'department', 'status', 'sod'],
  vnf: ['name', 'type', 'vendor', 'model', 'version', 'throughput', 'status', 'hub'],
  hub: ['name', 'status', 'location', 'connections', 'utilization', 'sla', 'resources'],
  links: ['vlanId', 'name', 'status', 'hub'],
  vlans: ['vlanId', 'name', 'hub', 'bandwidth', 'status'],
  'configure-connections': ['select', 'name', 'type', 'status', 'bandwidth', 'location'],
  'connection-logs': ['logId', 'timestamp', 'type', 'category', 'message', 'source'],
  'cms-banners': ['title', 'status', 'position', 'startDate', 'endDate'],
  'group-connections': ['name', 'status', 'bandwidth', 'location'],
  'group-members': ['user', 'role', 'status'],
  tickets: ['ticketNumber', 'description', 'troubleType', 'status', 'bcOrgId', 'connection', 'asset'],
  'monitor-logs': ['time', 'type', 'severity', 'message', 'source', 'user'],
};

const STORAGE_KEY_PREFIX = 'columns_';
const MIN_VISIBLE_COLUMNS = 2;

/**
 * Load column config from localStorage
 */
function loadColumnConfig(tableId: string): string[] | null {
  try {
    const stored = safeGetItem<string[]>(`${STORAGE_KEY_PREFIX}${tableId}`);
    return stored;
  } catch (error) {
    console.error(`[ColumnVisibility] Error loading config for ${tableId}:`, error);
    return null;
  }
}

/**
 * Save column config to localStorage immediately
 */
function saveColumnConfig(tableId: string, columns: string[]): void {
  // Save immediately so storage events fire right away for cross-window sync
  safeSetItem(`${STORAGE_KEY_PREFIX}${tableId}`, columns);
}

/**
 * Get default columns for a table
 */
function getDefaultColumns(tableId: string): string[] {
  return DEFAULT_COLUMNS[tableId] || [];
}

/**
 * Create column visibility slice
 */
export const createColumnVisibilitySlice: StateCreator<ColumnVisibilitySlice> = (set, get) => {
  // Listen for storage changes from other windows
  if (typeof window !== 'undefined') {
    const handleStorageChange = (event: StorageEvent) => {

      if (event.key && event.key.startsWith(STORAGE_KEY_PREFIX)) {
        const tableId = event.key.substring(STORAGE_KEY_PREFIX.length);

        if (event.newValue) {
          try {
            const columns = JSON.parse(event.newValue);
            // Update the store with new column config
            set((state) => {
              const newState = {
                columnConfig: {
                  ...state.columnConfig,
                  [tableId]: columns
                }
              };
              return newState;
            });
          } catch (error) {
            console.error('[ColumnVisibility] Failed to parse storage event:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
  }

  return {
    columnConfig: {},

    getVisibleColumns: (tableId: string) => {
      const { columnConfig } = get();
      if (columnConfig[tableId]) return columnConfig[tableId];

      // Pure read — no set() during render. Fall back to localStorage then defaults.
      const stored = loadColumnConfig(tableId);
      if (stored && stored.length > 0) return stored;

      return getDefaultColumns(tableId);
    },

    // Call from useEffect (never during render) to populate columnConfig in the store.
    initColumnConfig: (tableId: string) => {
      const { columnConfig } = get();
      if (columnConfig[tableId]) return;

      const stored = loadColumnConfig(tableId);
      const columns = stored && stored.length > 0 ? stored : getDefaultColumns(tableId);
      if (columns.length > 0) {
        set((state) => ({
          columnConfig: { ...state.columnConfig, [tableId]: columns }
        }));
      }
    },

    setVisibleColumns: (tableId: string, columns: string[]) => {
      // Validate minimum columns
      if (columns.length < MIN_VISIBLE_COLUMNS) {
        console.warn(`[ColumnVisibility] Must have at least ${MIN_VISIBLE_COLUMNS} columns visible`);

        if (window.addToast) {
          window.addToast({
            type: 'warning',
            title: 'Minimum Columns',
            message: `You must keep at least ${MIN_VISIBLE_COLUMNS} columns visible`,
            duration: 3000
          });
        }
        return;
      }

      // Update state
      set((state) => ({
        columnConfig: {
          ...state.columnConfig,
          [tableId]: columns
        }
      }));

      // Save to localStorage (will trigger storage event in other windows)
      saveColumnConfig(tableId, columns);


    },

    toggleColumn: (tableId: string, columnId: string, allColumnIds?: string[]) => {
      const { getVisibleColumns, setVisibleColumns } = get();
      let current = getVisibleColumns(tableId);

      // If no config yet (empty = all visible), initialize with all columns
      if (current.length === 0 && allColumnIds) {
        current = [...allColumnIds];
      }

      if (current.includes(columnId)) {
        // Removing column
        const newColumns = current.filter(id => id !== columnId);

        // Check minimum
        if (newColumns.length < MIN_VISIBLE_COLUMNS) {
          if (window.addToast) {
            window.addToast({
              type: 'warning',
              title: 'Minimum Columns',
              message: `You must keep at least ${MIN_VISIBLE_COLUMNS} columns visible`,
              duration: 3000
            });
          }
          return;
        }

        setVisibleColumns(tableId, newColumns);
      } else {
        // Adding column
        const newColumns = [...current, columnId];
        setVisibleColumns(tableId, newColumns);
      }
    },

    showAllColumns: (tableId: string, allColumnIds: string[]) => {
      const { setVisibleColumns } = get();
      setVisibleColumns(tableId, allColumnIds);

      if (window.addToast) {
        window.addToast({
          type: 'success',
          title: 'All Columns Shown',
          message: `Showing all ${allColumnIds.length} columns`,
          duration: 2000
        });
      }
    },

    hideAllColumns: (tableId: string, allColumnIds: string[]) => {
      const { setVisibleColumns } = get();

      // Keep only first MIN_VISIBLE_COLUMNS
      const minimumColumns = allColumnIds.slice(0, MIN_VISIBLE_COLUMNS);
      setVisibleColumns(tableId, minimumColumns);

      if (window.addToast) {
        window.addToast({
          type: 'info',
          title: 'Columns Hidden',
          message: `Showing minimum ${MIN_VISIBLE_COLUMNS} columns`,
          duration: 2000
        });
      }
    },

    resetToDefaults: (tableId: string) => {
      const defaults = getDefaultColumns(tableId);

      if (defaults.length === 0) {
        console.warn(`[ColumnVisibility] No defaults defined for ${tableId}`);
        return;
      }

      const { setVisibleColumns } = get();
      setVisibleColumns(tableId, defaults);

      if (window.addToast) {
        window.addToast({
          type: 'success',
          title: 'Reset to Defaults',
          message: 'Column configuration has been reset',
          duration: 2000
        });
      }


    },

    isColumnVisible: (tableId: string, columnId: string) => {
      const { getVisibleColumns } = get();
      const visible = getVisibleColumns(tableId);
      // Empty array means no config - all columns visible
      if (visible.length === 0) return true;
      return visible.includes(columnId);
    }
  };
};

/**
 * Export default column configurations for reference
 */
export { DEFAULT_COLUMNS };
