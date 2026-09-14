import { create } from 'zustand';
import { Connection, Alert, User } from '../types';
import { WidgetInstance } from '../components/control-center/types';
import { Group } from '../types/group';
import { createWidgetSlice, WidgetSlice } from './slices/widgetSlice';
import { createConnectionSlice, ConnectionSlice } from './slices/connectionSlice';
import { createAlertSlice, AlertSlice } from './slices/alertSlice';
import { createUserSlice, UserSlice } from './slices/userSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createGroupSlice, GroupSlice } from './slices/groupSlice';
import { createRuleSlice, RuleSlice } from './slices/ruleSlice';
import { createAgenticSlice, AgenticSlice } from './slices/agenticSlice';
import { createAPIToolboxSlice, APIToolboxSlice } from './slices/apiToolboxSlice';
import { createNotificationSlice, NotificationSlice } from './slices/notificationSlice';
import { createFontSizeSlice, FontSizeSlice } from './slices/fontSizeSlice';
import { createColumnVisibilitySlice, ColumnVisibilitySlice } from './slices/columnVisibilitySlice';
import { createDetachedWindowSlice, DetachedWindowSlice } from './slices/detachedWindowSlice';
import { createKeyboardShortcutsSlice, KeyboardShortcutsSlice } from './slices/keyboardShortcutsSlice';
import { createRoleSlice, RoleSlice } from './slices/roleSlice';
import { createBillingSlice, BillingSlice } from './slices/billingSlice';
import { createTenantContextSlice, TenantContextSlice } from './slices/tenantContextSlice';
import { createRbacSlice, RbacSlice } from './slices/rbacSlice';
import { createHubSlice, HubSlice } from './slices/hubSlice';
import { createVNFSlice, VNFSlice } from './slices/vnfSlice';
import { createInAppNotificationSlice, InAppNotificationSlice } from './slices/inAppNotificationSlice';
import { createTestLabSlice, TestLabSlice } from './slices/testLabSlice';
import { createActivityLogSlice, ActivityLogSlice } from './slices/activityLogSlice';
import { sampleConnections, sampleUsers, sampleGroups } from '../data/sampleData';
import { sampleRouters, sampleVNFs } from '../data/sampleInfrastructure';
import { safeJsonParse } from '../utils/errorHandling';

// Load persisted state from localStorage with error handling
const loadPersistedState = () => {
  try {
    const persistedState = localStorage.getItem('appState-v3');
    if (persistedState) {
      return safeJsonParse(persistedState, {});
    }
  } catch (error) {
    console.error('Failed to load persisted state:', error);
  }
  return {};
};

// Save state to localStorage with error handling
const persistState = (state: any) => {
  try {
    const stateToStore = {
      connections: state.connections,
      hubs: state.hubs,
      vnfs: state.vnfs,
      groups: state.groups,
      activeTab: state.activeTab
      // Add other state you want to persist
    };
    localStorage.setItem('appState-v3', JSON.stringify(stateToStore));
  } catch (error) {
    console.error('Failed to persist state:', error);
  }
};

interface Store extends
  ConnectionSlice,
  AlertSlice,
  UserSlice,
  UISlice,
  WidgetSlice,
  GroupSlice,
  RuleSlice,
  AgenticSlice,
  APIToolboxSlice,
  NotificationSlice,
  FontSizeSlice,
  ColumnVisibilitySlice,
  DetachedWindowSlice,
  KeyboardShortcutsSlice,
  RoleSlice,
  BillingSlice,
  TenantContextSlice,
  RbacSlice,
  HubSlice,
  VNFSlice,
  InAppNotificationSlice,
  TestLabSlice,
  ActivityLogSlice {}

// Create store with persisted or sample data
export const useStore = create<Store>((set, get) => {
  // Load persisted state
  const persistedState = loadPersistedState();

  // Merge connections: use persisted, but ensure new sample connections are added
  let connections = persistedState.connections ? [...persistedState.connections] : [];

  // If persisted connections exist, merge in new sample connections AND update existing ones
  if (persistedState.connections && persistedState.connections.length > 0) {
    const sampleMap = new Map(sampleConnections.map(sc => [sc.id, sc]));
    // Update existing connections with latest sample data (name, status, configuration, performance)
    connections = connections.map(c => {
      const sample = sampleMap.get(c.id);
      if (sample) {
        return {
          ...c,
          name: sample.name,
          status: sample.status,
          configuration: { ...c.configuration, ...sample.configuration },
          // Always refresh performance from sample so utilization bars stay accurate
          performance: sample.performance ?? c.performance,
        };
      }
      return c;
    });
    // Add any new sample connections not yet in persisted state
    const existingIds = new Set(connections.map(c => c.id));
    const newConnections = sampleConnections.filter(sc => !existingIds.has(sc.id));
    connections = [...newConnections, ...connections];

  } else {
    // No persisted state, use all sample connections
    connections = [...sampleConnections];

  }

  // Merge hubs the same way as connections: keep persisted (incl. wizard-created
  // hubs) and ensure sample hubs are always present. Without persisting
  // hubs, a reload would re-seed to the samples and orphan created connections.
  let hubs = persistedState.hubs ? [...persistedState.hubs] : [];
  if (persistedState.hubs && persistedState.hubs.length > 0) {
    const existingGwIds = new Set(hubs.map((g: any) => g.id));
    const newHubs = sampleRouters.filter(sr => !existingGwIds.has(sr.id));
    hubs = [...newHubs, ...hubs];
  } else {
    hubs = [...sampleRouters];
  }

  // Merge VNFs the same way: keep persisted (incl. wizard-created VNFs) and ensure the
  // sample VNFs are always present so a reload doesn't drop demo network functions.
  let vnfs = persistedState.vnfs ? [...persistedState.vnfs] : [];
  if (persistedState.vnfs && persistedState.vnfs.length > 0) {
    const existingVnfIds = new Set(vnfs.map((v: any) => v.id));
    const newVnfs = sampleVNFs.filter(sv => !existingVnfIds.has(sv.id));
    vnfs = [...newVnfs, ...vnfs];
  } else {
    vnfs = [...sampleVNFs];
  }

  // Merge with defaults
  const initialState = {
    connections,
    hubs,
    vnfs,
    users: [...sampleUsers],
    groups: persistedState.groups || [...sampleGroups],
    selectedConnection: null,
    selectedGroupId: null,
    activeTab: persistedState.activeTab || 'connections',
    alerts: [],
    widgets: []
  };

  const store = {
    ...createConnectionSlice(set, get),
    ...createAlertSlice(set),
    ...createUserSlice(set),
    ...createUISlice(set),
    ...createWidgetSlice(set),
    ...createGroupSlice(set, get),
    ...createRuleSlice(set, get),
    ...createAgenticSlice(set),
    ...createAPIToolboxSlice(set, get),
    ...createNotificationSlice(set),
    ...createFontSizeSlice(set, get),
    ...createColumnVisibilitySlice(set, get),
    ...createDetachedWindowSlice(set, get),
    ...createKeyboardShortcutsSlice(set, get),
    ...createRoleSlice(set, get),
    ...createBillingSlice(set),
    ...createTenantContextSlice(set, get),
    ...createRbacSlice(set, get),
    ...createHubSlice(set, get),
    ...createVNFSlice(set, get),
    ...createInAppNotificationSlice(set),
    ...createTestLabSlice(set as any, get as any),
    ...createActivityLogSlice(set as any, get as any, undefined as any),
    ...initialState,

    // Add a reset function to clear everything (useful for development/testing)
    reset: () => {
      localStorage.removeItem('appState-v3');
      set({
        connections: [...sampleConnections],
        users: [...sampleUsers],
        groups: [...sampleGroups],
        selectedConnection: null,
        selectedGroupId: null,
        activeTab: 'connections',
        alerts: [],
        widgets: [],
        rules: [],
        evaluationResults: [],
        isEvaluating: false
      });
    }
  };

  // Load sample rules on initialization
  setTimeout(() => {
    store.loadSampleRules();
  }, 0);

  return store;
});

// Subscribe to state changes to persist to localStorage - moved outside of store creation
useStore.subscribe((state) => {
  persistState(state);
});