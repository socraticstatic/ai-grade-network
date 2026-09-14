import { StateCreator } from 'zustand';

export interface ShortcutDefinition {
  id: string;
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  category: 'navigation' | 'actions' | 'views' | 'global';
  action: string;
}

export interface KeyboardShortcutsSlice {
  shortcuts: ShortcutDefinition[];
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (enabled: boolean) => void;
  getShortcutsByCategory: (category: string) => ShortcutDefinition[];
}

// Default keyboard shortcuts
const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Global
  {
    id: 'help',
    key: '?',
    shift: true,
    description: 'Show keyboard shortcuts',
    category: 'global',
    action: 'showHelp'
  },
  {
    id: 'search',
    key: 'k',
    ctrl: true,
    description: 'Focus search',
    category: 'global',
    action: 'focusSearch'
  },
  {
    id: 'profile',
    key: 'p',
    ctrl: true,
    shift: true,
    description: 'Open profile',
    category: 'global',
    action: 'openProfile'
  },

  // Navigation
  {
    id: 'home',
    key: 'h',
    description: 'Go to home',
    category: 'navigation',
    action: 'navigateHome'
  },
  {
    id: 'connections',
    key: 'c',
    description: 'Go to connections',
    category: 'navigation',
    action: 'navigateConnections'
  },
  {
    id: 'groups',
    key: 'g',
    description: 'Go to pools',
    category: 'navigation',
    action: 'navigateGroups'
  },
  {
    id: 'monitoring',
    key: 'm',
    description: 'Go to monitoring',
    category: 'navigation',
    action: 'navigateMonitoring'
  },
  {
    id: 'configure',
    key: 'e',
    description: 'Go to configure',
    category: 'navigation',
    action: 'navigateConfigure'
  },

  // Actions
  {
    id: 'newConnection',
    key: 'n',
    ctrl: true,
    description: 'Create new connection',
    category: 'actions',
    action: 'createConnection'
  },
  {
    id: 'refresh',
    key: 'r',
    ctrl: true,
    description: 'Refresh data',
    category: 'actions',
    action: 'refreshData'
  },

  // Views
  {
    id: 'toggleGrid',
    key: '1',
    description: 'Switch to grid view',
    category: 'views',
    action: 'gridView'
  },
  {
    id: 'toggleList',
    key: '2',
    description: 'Switch to list view',
    category: 'views',
    action: 'listView'
  },
  {
    id: 'toggleTopology',
    key: '3',
    description: 'Switch to topology view',
    category: 'views',
    action: 'topologyView'
  }
];

export const createKeyboardShortcutsSlice: StateCreator<KeyboardShortcutsSlice> = (set, get) => ({
  shortcuts: DEFAULT_SHORTCUTS,
  shortcutsEnabled: true,

  setShortcutsEnabled: (enabled: boolean) => {
    set({ shortcutsEnabled: enabled });
  },

  getShortcutsByCategory: (category: string) => {
    const { shortcuts } = get();
    return shortcuts.filter(s => s.category === category);
  }
});
