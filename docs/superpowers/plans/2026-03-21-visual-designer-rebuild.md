# Visual Designer Rebuild - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Network Designer to model Cloud_Designer functionality with Flywheel Design Library standards for the AT&T NetBond SDCI stakeholder prototype.

**Architecture:** Zustand store replaces local useState. Four custom hooks (useNetworkManager, useSelectionManager, useEdgeCreator, useNetworkHistory) encapsulate business logic. Canvas supports pan/zoom with SVG edge layer + HTML node overlay. Floating right panels replace bottom config tabs.

**Tech Stack:** React 18, TypeScript, Zustand 4, Tailwind CSS (Flywheel tokens), Lucide icons, jsPDF + html2canvas (Phase 4)

**Spec:** `docs/superpowers/specs/2026-03-21-visual-designer-rebuild-design.md`

**Cloud_Designer Reference:** `/Users/micahbos/Desktop/cloud-router-ui/Cloud_Designer/`

---

## File Structure

Files to **create**:

| Path | Responsibility |
|------|---------------|
| `src/components/network-designer/types/designer.ts` | NetworkNode, NetworkEdge, ValidationIssue interfaces |
| `src/components/network-designer/constants/nodeTypes.ts` | NODE_CATEGORIES taxonomy |
| `src/components/network-designer/constants/edgeTypes.ts` | EDGE_TYPE_COLORS, getEdgeDefaults() |
| `src/components/network-designer/constants/canvasBounds.ts` | CANVAS_BOUNDS, CANVAS_SAFE_AREA, getSafeCenter() |
| `src/components/network-designer/store/useDesignerStore.ts` | Zustand store with full state shape |
| `src/components/network-designer/hooks/useNetworkManager.ts` | Node/edge CRUD with cascade delete |
| `src/components/network-designer/hooks/useSelectionManager.ts` | Selection state + panel visibility |
| `src/components/network-designer/hooks/useEdgeCreator.ts` | Edge creation workflow |
| `src/components/network-designer/hooks/useNetworkHistory.ts` | Undo/redo snapshots |
| `src/components/network-designer/engine/validationEngine.ts` | 9 topology validation rules |
| `src/components/network-designer/ZoomControls.tsx` | +/- zoom buttons |
| `src/components/network-designer/panels/FloatingPanel.tsx` | Panel container with animation |
| `src/components/network-designer/panels/NodeConfigPanel.tsx` | Tabbed node properties |
| `src/components/network-designer/panels/EdgeConfigPanel.tsx` | Edge properties |
| `src/components/network-designer/templates/templateDefinitions.ts` | 6 pre-built topology data sets |
| `src/components/network-designer/templates/TemplateCard.tsx` | Preview card component |
| `src/components/network-designer/templates/SaveTemplateModal.tsx` | Save custom template modal |

Files to **rewrite** (preserve file path, replace contents):

| Path | What changes |
|------|-------------|
| `src/components/network-designer/NetworkDesigner.tsx` | Orchestrator using Zustand store + hooks. Preserve props interface. |
| `src/components/network-designer/Canvas.tsx` | Add pan/zoom, grid with dots, SVG+HTML layers, zoom-aware coordinates |
| `src/components/network-designer/Node.tsx` | 6 interaction states, zoom-aware drag, 5px threshold, double-click rename |
| `src/components/network-designer/Edge.tsx` | Straight lines with service-aware colors, arrow markers, inline labels |
| `src/components/network-designer/Toolbar.tsx` | Categorized add-node dropdown, connect toggle, action buttons |
| `src/components/network-designer/StatusBar.tsx` | Validation summary, node/edge counts, expandable details |
| `src/components/network-designer/TemplatesDrawer.tsx` | Template browser using new templateDefinitions |

Files to **delete** (Phase 2+):

| Path | Reason |
|------|--------|
| `src/components/network-designer/panels/ConfigurationPanel.tsx` | Replaced by floating NodeConfigPanel + EdgeConfigPanel |
| `src/components/network-designer/panels/AIRecommendationEngine.tsx` | Removed per spec |
| `src/components/network-designer/ScenarioConsole.tsx` | Removed per spec |
| `src/components/network-designer/templates/*.ts` (7 old templates) | Replaced by templateDefinitions.ts |

**Props contract to preserve** (from NetworkDesigner.tsx):

```typescript
interface NetworkDesignerProps {
  onComplete: (config: Connection[]) => void;
  onCancel: () => void;
  initialNodes?: NetworkNode[];
  initialEdges?: NetworkEdge[];
  editMode?: boolean;
  connectionId?: string;
}
```

**Call site:** `src/components/wizard/ConnectionWizard.tsx` (line ~457, lazy import)
**Lazy wrapper:** `src/components/network-designer/LazyNetworkDesigner.tsx` (preserve as-is)

---

## Phase 1: Foundation

### Task 1: Type Definitions

**Files:**
- Create: `src/components/network-designer/types/designer.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/components/network-designer/types/designer.ts

export interface NetworkNode {
  id: string;
  type: 'function' | 'destination' | 'network' | 'datacenter';
  functionType: string;
  subType?: string;
  cloudProvider?: string;
  dcProvider?: string;
  x: number;
  y: number;
  name: string;
  icon: string;
  status: 'active' | 'inactive';
  config: Record<string, any>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  bandwidth: string;
  status: 'active' | 'inactive';
  vlan?: number;
  metrics?: {
    latency?: string;
    throughput?: string;
    packetLoss?: string;
  };
  config?: {
    resilience?: 'single' | 'redundant' | 'ha' | 'dual-diverse';
    encrypted?: boolean;
    qosProfile?: string;
  };
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
}

export interface DesignerTemplate {
  id: string;
  name: string;
  description: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  nodeCount: number;
  edgeCount: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean (no errors referencing designer.ts)

- [ ] **Step 3: Commit**

```bash
git add src/components/network-designer/types/designer.ts
git commit -m "feat(designer): add type definitions for NetworkNode, NetworkEdge, ValidationIssue"
```

---

### Task 2: Constants

**Files:**
- Create: `src/components/network-designer/constants/canvasBounds.ts`
- Create: `src/components/network-designer/constants/edgeTypes.ts`
- Create: `src/components/network-designer/constants/nodeTypes.ts`

- [ ] **Step 1: Create canvasBounds.ts**

```typescript
// src/components/network-designer/constants/canvasBounds.ts

export const CANVAS_BOUNDS = {
  GRID_SIZE: 20,
  NODE_SIZE: 64,
  MAX_Y: 800,
  ZOOM_LIMITS: { MIN: 0.5, MAX: 3.0 },
  EDGE_SNAP_RADIUS: 50,
} as const;

export const CANVAS_SAFE_AREA = {
  TOP: 56,
  BOTTOM: 64,
  LEFT: 72,
  RIGHT: 56,
} as const;

export function getSafeCenter(canvasWidth: number, canvasHeight: number) {
  const safeWidth = canvasWidth - CANVAS_SAFE_AREA.LEFT - CANVAS_SAFE_AREA.RIGHT;
  const safeHeight = canvasHeight - CANVAS_SAFE_AREA.TOP - CANVAS_SAFE_AREA.BOTTOM;
  return {
    x: CANVAS_SAFE_AREA.LEFT + safeWidth / 2,
    y: CANVAS_SAFE_AREA.TOP + safeHeight / 2,
  };
}

export function getSafeBounds(canvasWidth: number, canvasHeight: number) {
  return {
    minX: CANVAS_SAFE_AREA.LEFT,
    minY: CANVAS_SAFE_AREA.TOP,
    maxX: canvasWidth - CANVAS_SAFE_AREA.RIGHT,
    maxY: canvasHeight - CANVAS_SAFE_AREA.BOTTOM,
  };
}

export function snapToGrid(value: number): number {
  return Math.round(value / CANVAS_BOUNDS.GRID_SIZE) * CANVAS_BOUNDS.GRID_SIZE;
}

export function clampPosition(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const bounds = getSafeBounds(canvasWidth, canvasHeight);
  return {
    x: Math.max(bounds.minX, Math.min(x, bounds.maxX - CANVAS_BOUNDS.NODE_SIZE)),
    y: Math.max(bounds.minY, Math.min(y, bounds.maxY - CANVAS_BOUNDS.NODE_SIZE)),
  };
}
```

- [ ] **Step 2: Create edgeTypes.ts**

```typescript
// src/components/network-designer/constants/edgeTypes.ts
import type { NetworkNode, NetworkEdge } from '../types/designer';

export const EDGE_TYPE_COLORS: Record<string, string> = {
  'MPLS': '#3b82f6',
  'Direct Connect': '#f97316',
  'ExpressRoute': '#6366f1',
  'Cloud Interconnect': '#8b5cf6',
  'FastConnect': '#ef4444',
  'Ethernet': '#06b6d4',
  'Dark Fiber': '#a855f7',
  'Wavelength': '#14b8a6',
  'Internet': '#6b7280',
  'VPN': '#22c55e',
} as const;

export const EDGE_TYPE_OPTIONS = [
  { value: 'MPLS', label: 'MPLS (AT&T AVPN)' },
  { value: 'Direct Connect', label: 'AWS Direct Connect' },
  { value: 'ExpressRoute', label: 'Azure ExpressRoute' },
  { value: 'Cloud Interconnect', label: 'GCP Cloud Interconnect' },
  { value: 'FastConnect', label: 'Oracle FastConnect' },
  { value: 'Ethernet', label: 'Ethernet (AT&T ASE)' },
  { value: 'Dark Fiber', label: 'Dark Fiber' },
  { value: 'Wavelength', label: 'AT&T Wavelength' },
  { value: 'Internet', label: 'Internet' },
  { value: 'VPN', label: 'VPN' },
] as const;

export const BANDWIDTH_OPTIONS = [
  '50 Mbps', '100 Mbps', '200 Mbps', '500 Mbps',
  '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps', '40 Gbps', '100 Gbps',
] as const;

const CLOUD_INTERCONNECT_MAP: Record<string, { type: string; description: string }> = {
  aws: { type: 'Direct Connect', description: 'AWS Direct Connect via NetBond' },
  azure: { type: 'ExpressRoute', description: 'Azure ExpressRoute via NetBond' },
  gcp: { type: 'Cloud Interconnect', description: 'GCP Partner Interconnect via NetBond' },
  oracle: { type: 'FastConnect', description: 'Oracle FastConnect via NetBond' },
};

export function getEdgeDefaults(
  source: NetworkNode,
  target: NetworkNode
): Partial<NetworkEdge> {
  const isCloudRouter = (n: NetworkNode) =>
    n.type === 'function' && n.functionType === 'router' && n.subType === 'cloud';
  const isIPE = (n: NetworkNode) =>
    n.type === 'network' && n.functionType === 'ipe';
  const isCloud = (n: NetworkNode) => n.type === 'destination' && n.cloudProvider;
  const isDC = (n: NetworkNode) => n.type === 'datacenter';
  const isFirewall = (n: NetworkNode) =>
    n.type === 'function' && n.functionType === 'firewall';
  const isSDWAN = (n: NetworkNode) =>
    n.type === 'function' && n.functionType === 'sdwan';

  // IPE <-> Cloud Router: MPLS backbone
  if ((isIPE(source) && isCloudRouter(target)) || (isCloudRouter(source) && isIPE(target))) {
    return { type: 'MPLS', bandwidth: '10 Gbps', config: { resilience: 'redundant' } };
  }

  // Cloud Router <-> Cloud Destination: provider-specific interconnect
  if (isCloudRouter(source) && isCloud(target)) {
    const mapping = CLOUD_INTERCONNECT_MAP[target.cloudProvider || ''];
    if (mapping) {
      return { type: mapping.type, bandwidth: '10 Gbps', config: { resilience: 'redundant' } };
    }
  }
  if (isCloud(source) && isCloudRouter(target)) {
    const mapping = CLOUD_INTERCONNECT_MAP[source.cloudProvider || ''];
    if (mapping) {
      return { type: mapping.type, bandwidth: '10 Gbps', config: { resilience: 'redundant' } };
    }
  }

  // Cloud Router <-> Datacenter: Ethernet
  if ((isCloudRouter(source) && isDC(target)) || (isDC(source) && isCloudRouter(target))) {
    return { type: 'Ethernet', bandwidth: '10 Gbps' };
  }

  // SD-WAN <-> IPE: MPLS underlay
  if ((isSDWAN(source) && isIPE(target)) || (isIPE(source) && isSDWAN(target))) {
    return { type: 'MPLS', bandwidth: '1 Gbps' };
  }

  // Firewall <-> Cloud Router: Ethernet
  if ((isFirewall(source) && isCloudRouter(target)) || (isCloudRouter(source) && isFirewall(target))) {
    return { type: 'Ethernet', bandwidth: '10 Gbps' };
  }

  // Default
  return { type: 'Ethernet', bandwidth: '1 Gbps' };
}
```

- [ ] **Step 3: Create nodeTypes.ts**

```typescript
// src/components/network-designer/constants/nodeTypes.ts

export const NODE_CATEGORIES = {
  function: {
    label: 'Network Functions',
    items: [
      { type: 'router', label: 'Router', subtypes: ['cloud', 'physical', 'virtual', 'edge', 'core'], icon: 'Router' },
      { type: 'firewall', label: 'Firewall', subtypes: ['ngfw', 'waf', 'stateful', 'ids-ips'], icon: 'Shield' },
      { type: 'vnf', label: 'VNF', subtypes: ['router', 'firewall', 'load-balancer', 'ids', 'wan-optimizer', 'multifunction'], icon: 'Cpu' },
      { type: 'sdwan', label: 'SD-WAN', subtypes: ['edge', 'controller', 'gateway'], icon: 'Waypoints' },
      { type: 'flexware', label: 'FlexWare (uCPE)', subtypes: [], icon: 'Server' },
    ],
  },
  network: {
    label: 'Network Types',
    items: [
      { type: 'internet', label: 'Internet', icon: 'Globe' },
      { type: 'avpn', label: 'AT&T AVPN (MPLS)', icon: 'Network' },
      { type: 'ase', label: 'AT&T ASE (L2 Ethernet)', icon: 'Cable' },
      { type: 'adi', label: 'AT&T ADI (Dedicated Internet)', icon: 'Wifi' },
      { type: 'wavelength', label: 'AT&T Wavelength', icon: 'Radio' },
      { type: 'ipe', label: 'AT&T Core (IPE)', icon: 'CircleDot' },
    ],
  },
  cloud: {
    label: 'Cloud Providers',
    items: [
      { provider: 'aws', label: 'AWS (Direct Connect)', icon: 'Cloud' },
      { provider: 'azure', label: 'Azure (ExpressRoute)', icon: 'Cloud' },
      { provider: 'gcp', label: 'Google Cloud (Interconnect)', icon: 'Cloud' },
      { provider: 'oracle', label: 'Oracle Cloud (FastConnect)', icon: 'Cloud' },
    ],
  },
  datacenter: {
    label: 'Data Centers',
    items: [
      { provider: 'equinix', label: 'Equinix', icon: 'Building2' },
      { provider: 'digital-realty', label: 'Digital Realty', icon: 'Building2' },
      { provider: 'cyrusone', label: 'CyrusOne', icon: 'Building2' },
      { provider: 'coresite', label: 'CoreSite', icon: 'Building2' },
      { provider: 'databank', label: 'DataBank', icon: 'Building2' },
    ],
  },
} as const;

export function getIconName(type: string, functionType: string): string {
  if (type === 'destination') return 'Cloud';
  if (type === 'datacenter') return 'Building2';
  if (type === 'network') {
    const networkItem = NODE_CATEGORIES.network.items.find(i => i.type === functionType);
    return networkItem?.icon || 'Network';
  }
  if (type === 'function') {
    const functionItem = NODE_CATEGORIES.function.items.find(i => i.type === functionType);
    return functionItem?.icon || 'Box';
  }
  return 'Box';
}

export function getDefaultNodeName(type: string, functionType: string, subType?: string): string {
  if (type === 'destination') return `Cloud (${functionType})`;
  if (type === 'datacenter') return functionType.charAt(0).toUpperCase() + functionType.slice(1);
  if (type === 'network') {
    const item = NODE_CATEGORIES.network.items.find(i => i.type === functionType);
    return item?.label || functionType;
  }
  const item = NODE_CATEGORIES.function.items.find(i => i.type === functionType);
  const base = item?.label || functionType;
  return subType ? `${base} (${subType})` : base;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 5: Commit**

```bash
git add src/components/network-designer/constants/
git commit -m "feat(designer): add constants for canvas bounds, edge types, and node taxonomy"
```

---

### Task 3: Zustand Store

**Files:**
- Create: `src/components/network-designer/store/useDesignerStore.ts`

- [ ] **Step 1: Create the store**

```typescript
// src/components/network-designer/store/useDesignerStore.ts
import { create } from 'zustand';
import type { NetworkNode, NetworkEdge } from '../types/designer';
import { snapToGrid } from '../constants/canvasBounds';

interface HistoryEntry {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

interface DesignerState {
  // Canvas
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  panOffset: { x: number; y: number };
  zoomLevel: number;

  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Modes
  isCreatingEdge: boolean;
  edgeStartNodeId: string | null;
  isMaximized: boolean;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Actions - Canvas
  setNodes: (nodes: NetworkNode[]) => void;
  setEdges: (edges: NetworkEdge[]) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setZoomLevel: (level: number) => void;

  // Actions - Nodes
  addNode: (node: NetworkNode) => void;
  updateNode: (id: string, updates: Partial<NetworkNode>) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;

  // Actions - Edges
  addEdge: (edge: NetworkEdge) => void;
  updateEdge: (id: string, updates: Partial<NetworkEdge>) => void;
  removeEdge: (id: string) => void;

  // Actions - Selection
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;

  // Actions - Edge Creation
  startEdgeCreation: () => void;
  setEdgeStartNode: (id: string | null) => void;
  cancelEdgeCreation: () => void;

  // Actions - History
  saveToHistory: () => void;
  undo: () => void;

  // Actions - Canvas
  clearCanvas: () => void;
  toggleMaximize: () => void;
  loadTemplate: (nodes: NetworkNode[], edges: NetworkEdge[]) => void;
}

export const useDesignerStore = create<DesignerState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  panOffset: { x: 0, y: 0 },
  zoomLevel: 1,
  selectedNodeId: null,
  selectedEdgeId: null,
  isCreatingEdge: false,
  edgeStartNodeId: null,
  isMaximized: false,
  history: [],
  historyIndex: -1,

  // Canvas
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  setZoomLevel: (level) => set({ zoomLevel: Math.max(0.5, Math.min(level, 3.0)) }),

  // Nodes
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
  updateNode: (id, updates) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    })),
  moveNode: (id, x, y) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, x: snapToGrid(x), y: snapToGrid(y) } : n
      ),
    })),

  // Edges
  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),
  updateEdge: (id, updates) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),
  removeEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
    })),

  // Selection
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  // Edge Creation
  startEdgeCreation: () => set({ isCreatingEdge: true, edgeStartNodeId: null }),
  setEdgeStartNode: (id) => set({ edgeStartNodeId: id }),
  cancelEdgeCreation: () => set({ isCreatingEdge: false, edgeStartNodeId: null }),

  // History
  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newEntry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const truncated = history.slice(0, historyIndex + 1);
    set({
      history: [...truncated, newEntry],
      historyIndex: truncated.length,
    });
  },
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      set({
        nodes: JSON.parse(JSON.stringify(prev.nodes)),
        edges: JSON.parse(JSON.stringify(prev.edges)),
        historyIndex: historyIndex - 1,
        selectedNodeId: null,
        selectedEdgeId: null,
      });
    }
  },

  // Canvas
  clearCanvas: () => {
    get().saveToHistory();
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isCreatingEdge: false,
      edgeStartNodeId: null,
    });
  },
  toggleMaximize: () => set((s) => ({ isMaximized: !s.isMaximized })),
  loadTemplate: (nodes, edges) => {
    get().saveToHistory();
    set({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/components/network-designer/store/useDesignerStore.ts
git commit -m "feat(designer): add Zustand store with full state shape and actions"
```

---

### Task 4: Custom Hooks

**Files:**
- Create: `src/components/network-designer/hooks/useNetworkHistory.ts`
- Create: `src/components/network-designer/hooks/useSelectionManager.ts`
- Create: `src/components/network-designer/hooks/useEdgeCreator.ts`
- Create: `src/components/network-designer/hooks/useNetworkManager.ts`

- [ ] **Step 1: Create useNetworkHistory.ts**

```typescript
// src/components/network-designer/hooks/useNetworkHistory.ts
import { useCallback } from 'react';
import { useDesignerStore } from '../store/useDesignerStore';

export function useNetworkHistory() {
  const saveToHistory = useDesignerStore((s) => s.saveToHistory);
  const undo = useDesignerStore((s) => s.undo);
  const historyIndex = useDesignerStore((s) => s.historyIndex);

  const canUndo = historyIndex > 0;

  return { saveToHistory, undo, canUndo };
}
```

- [ ] **Step 2: Create useSelectionManager.ts**

```typescript
// src/components/network-designer/hooks/useSelectionManager.ts
import { useCallback } from 'react';
import { useDesignerStore } from '../store/useDesignerStore';
import type { NetworkNode, NetworkEdge } from '../types/designer';

export function useSelectionManager() {
  const selectedNodeId = useDesignerStore((s) => s.selectedNodeId);
  const selectedEdgeId = useDesignerStore((s) => s.selectedEdgeId);
  const nodes = useDesignerStore((s) => s.nodes);
  const edges = useDesignerStore((s) => s.edges);
  const selectNode = useDesignerStore((s) => s.selectNode);
  const selectEdge = useDesignerStore((s) => s.selectEdge);

  const selectedNodeObject = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdgeObject = edges.find((e) => e.id === selectedEdgeId);

  const clearSelection = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  return {
    selectedNodeId,
    selectedEdgeId,
    selectedNodeObject,
    selectedEdgeObject,
    showNodeConfig: selectedNodeId !== null,
    showEdgeConfig: selectedEdgeId !== null,
    handleNodeSelection: selectNode,
    handleEdgeSelection: selectEdge,
    clearSelection,
  };
}
```

- [ ] **Step 3: Create useEdgeCreator.ts**

```typescript
// src/components/network-designer/hooks/useEdgeCreator.ts
import { useCallback } from 'react';
import { useDesignerStore } from '../store/useDesignerStore';
import { getEdgeDefaults } from '../constants/edgeTypes';
import type { NetworkEdge } from '../types/designer';

export function useEdgeCreator() {
  const isCreatingEdge = useDesignerStore((s) => s.isCreatingEdge);
  const edgeStartNodeId = useDesignerStore((s) => s.edgeStartNodeId);
  const nodes = useDesignerStore((s) => s.nodes);
  const edges = useDesignerStore((s) => s.edges);
  const startEdgeCreation = useDesignerStore((s) => s.startEdgeCreation);
  const setEdgeStartNode = useDesignerStore((s) => s.setEdgeStartNode);
  const cancelEdgeCreation = useDesignerStore((s) => s.cancelEdgeCreation);
  const addEdge = useDesignerStore((s) => s.addEdge);
  const saveToHistory = useDesignerStore((s) => s.saveToHistory);

  const toggleEdgeCreation = useCallback(() => {
    if (isCreatingEdge) {
      cancelEdgeCreation();
    } else {
      startEdgeCreation();
    }
  }, [isCreatingEdge, cancelEdgeCreation, startEdgeCreation]);

  const handleNodeClickForEdge = useCallback(
    (nodeId: string): boolean => {
      if (!isCreatingEdge) return false;

      if (!edgeStartNodeId) {
        setEdgeStartNode(nodeId);
        return true;
      }

      if (nodeId === edgeStartNodeId) {
        setEdgeStartNode(null);
        return true;
      }

      // Check for duplicate edge
      const exists = edges.some(
        (e) =>
          (e.source === edgeStartNodeId && e.target === nodeId) ||
          (e.source === nodeId && e.target === edgeStartNodeId)
      );
      if (exists) {
        cancelEdgeCreation();
        return true;
      }

      // Get service-aware defaults
      const sourceNode = nodes.find((n) => n.id === edgeStartNodeId);
      const targetNode = nodes.find((n) => n.id === nodeId);
      const defaults = sourceNode && targetNode
        ? getEdgeDefaults(sourceNode, targetNode)
        : {};

      saveToHistory();

      const newEdge: NetworkEdge = {
        id: `edge-${Date.now()}`,
        source: edgeStartNodeId,
        target: nodeId,
        type: defaults.type || 'Ethernet',
        bandwidth: defaults.bandwidth || '1 Gbps',
        status: 'active',
        config: defaults.config,
      };

      addEdge(newEdge);
      cancelEdgeCreation();
      return true;
    },
    [isCreatingEdge, edgeStartNodeId, edges, nodes, setEdgeStartNode, cancelEdgeCreation, addEdge, saveToHistory]
  );

  return {
    isCreatingEdge,
    edgeStartNodeId,
    toggleEdgeCreation,
    handleNodeClickForEdge,
    cancelEdgeCreation,
  };
}
```

- [ ] **Step 4: Create useNetworkManager.ts**

```typescript
// src/components/network-designer/hooks/useNetworkManager.ts
import { useCallback } from 'react';
import { useDesignerStore } from '../store/useDesignerStore';
import { getDefaultNodeName, getIconName } from '../constants/nodeTypes';
import { getSafeCenter, snapToGrid, CANVAS_BOUNDS } from '../constants/canvasBounds';
import type { NetworkNode } from '../types/designer';

export function useNetworkManager() {
  const nodes = useDesignerStore((s) => s.nodes);
  const edges = useDesignerStore((s) => s.edges);
  const addNodeToStore = useDesignerStore((s) => s.addNode);
  const updateNode = useDesignerStore((s) => s.updateNode);
  const removeNode = useDesignerStore((s) => s.removeNode);
  const moveNode = useDesignerStore((s) => s.moveNode);
  const removeEdge = useDesignerStore((s) => s.removeEdge);
  const updateEdge = useDesignerStore((s) => s.updateEdge);
  const clearCanvas = useDesignerStore((s) => s.clearCanvas);
  const loadTemplate = useDesignerStore((s) => s.loadTemplate);
  const saveToHistory = useDesignerStore((s) => s.saveToHistory);

  const addNode = useCallback(
    (
      nodeType: string,
      functionType: string,
      options?: {
        subType?: string;
        cloudProvider?: string;
        dcProvider?: string;
        position?: { x: number; y: number };
        canvasWidth?: number;
        canvasHeight?: number;
      }
    ) => {
      saveToHistory();

      // Smart positioning: offset from center based on existing nodes
      const center = getSafeCenter(
        options?.canvasWidth || 800,
        options?.canvasHeight || 600
      );
      const offset = nodes.length * 80;
      const position = options?.position || {
        x: snapToGrid(center.x + (offset % 400) - 200),
        y: snapToGrid(center.y + Math.floor(offset / 400) * 100 - 100),
      };

      const node: NetworkNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: nodeType as NetworkNode['type'],
        functionType,
        subType: options?.subType,
        cloudProvider: options?.cloudProvider,
        dcProvider: options?.dcProvider,
        x: position.x,
        y: position.y,
        name: getDefaultNodeName(nodeType, functionType, options?.subType),
        icon: getIconName(nodeType, functionType),
        status: 'inactive',
        config: {},
      };

      addNodeToStore(node);
      return node;
    },
    [nodes.length, addNodeToStore, saveToHistory]
  );

  const deleteNode = useCallback(
    (id: string) => {
      saveToHistory();
      removeNode(id); // Store handles cascade delete of edges
    },
    [removeNode, saveToHistory]
  );

  const deleteEdge = useCallback(
    (id: string) => {
      saveToHistory();
      removeEdge(id);
    },
    [removeEdge, saveToHistory]
  );

  return {
    nodes,
    edges,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    updateEdge,
    deleteEdge,
    clearCanvas,
    loadTemplate,
    saveToHistory,
  };
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 6: Commit**

```bash
git add src/components/network-designer/hooks/
git commit -m "feat(designer): add custom hooks for network management, selection, edge creation, and history"
```

---

### Task 5: Canvas with Pan/Zoom

**Files:**
- Rewrite: `src/components/network-designer/Canvas.tsx`

- [ ] **Step 1: Read the current Canvas.tsx**

Run: Read `src/components/network-designer/Canvas.tsx` to understand current interface

- [ ] **Step 2: Rewrite Canvas.tsx**

```typescript
// src/components/network-designer/Canvas.tsx
import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useDesignerStore } from './store/useDesignerStore';
import { CANVAS_BOUNDS } from './constants/canvasBounds';

interface CanvasProps {
  svgContent: ReactNode;
  children: ReactNode;
}

export function Canvas({ svgContent, children }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const panOffset = useDesignerStore((s) => s.panOffset);
  const zoomLevel = useDesignerStore((s) => s.zoomLevel);
  const setPanOffset = useDesignerStore((s) => s.setPanOffset);
  const setZoomLevel = useDesignerStore((s) => s.setZoomLevel);
  const selectNode = useDesignerStore((s) => s.selectNode);
  const selectEdge = useDesignerStore((s) => s.selectEdge);

  const [isPanning, setIsPanning] = useState(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  // Pan: middle-mouse or Alt+left-click
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      startPanRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      };
    }
    // Left click on canvas background: deselect
    if (e.button === 0 && !e.altKey && e.target === e.currentTarget) {
      selectNode(null);
      selectEdge(null);
    }
  }, [panOffset, selectNode, selectEdge]);

  useEffect(() => {
    if (!isPanning) return;

    const handleMove = (e: MouseEvent) => {
      setPanOffset({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
    };

    const handleUp = () => {
      setIsPanning(false);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isPanning, setPanOffset]);

  // Zoom: mouse wheel with Ctrl/Meta
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const delta = -Math.sign(e.deltaY) * 0.1;
      const rect = el.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
      const mouseY = (e.clientY - rect.top - panOffset.y) / zoomLevel;
      const newZoom = Math.max(0.5, Math.min(zoomLevel + delta, 3.0));

      if (newZoom !== zoomLevel) {
        setPanOffset({
          x: e.clientX - rect.left - mouseX * newZoom,
          y: e.clientY - rect.top - mouseY * newZoom,
        });
        setZoomLevel(newZoom);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [panOffset, zoomLevel, setPanOffset, setZoomLevel]);

  const gridSize = CANVAS_BOUNDS.GRID_SIZE * zoomLevel;

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${panOffset.x % gridSize}px ${panOffset.y % gridSize}px`,
        }}
      />

      {/* Transformed content layer */}
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0',
        }}
      >
        {/* SVG layer for edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '5000px', height: '5000px', overflow: 'visible' }}
        >
          {svgContent}
        </svg>

        {/* HTML layer for nodes */}
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/Canvas.tsx
git commit -m "feat(designer): rebuild Canvas with pan/zoom, grid dots, and SVG+HTML layers"
```

---

### Task 6: Node Component

**Files:**
- Rewrite: `src/components/network-designer/Node.tsx`

- [ ] **Step 1: Read the current Node.tsx**

Run: Read `src/components/network-designer/Node.tsx` to understand current interface

- [ ] **Step 2: Rewrite Node.tsx with 6 interaction states and zoom-aware drag**

```typescript
// src/components/network-designer/Node.tsx
import { useRef, useState, useCallback, memo } from 'react';
import * as LucideIcons from 'lucide-react';
import { useDesignerStore } from './store/useDesignerStore';
import type { NetworkNode } from './types/designer';

interface NodeProps {
  node: NetworkNode;
  isSelected: boolean;
  isEdgeTarget: boolean;
  hasValidationError: boolean;
  isCreatingEdge: boolean;
  onSelect: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
  onEdgeClick: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export const Node = memo(function Node({
  node,
  isSelected,
  isEdgeTarget,
  hasValidationError,
  isCreatingEdge,
  onSelect,
  onDrag,
  onDragEnd,
  onEdgeClick,
  onRename,
}: NodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const zoomLevel = useDesignerStore((s) => s.zoomLevel);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isCreatingEdge || !nodeRef.current) return;
      e.stopPropagation();

      const rect = nodeRef.current.getBoundingClientRect();
      const offset = {
        x: (e.clientX - rect.left) / zoomLevel,
        y: (e.clientY - rect.top) / zoomLevel,
      };
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      hasDraggedRef.current = false;

      let dragStarted = false;

      const handleMove = (me: MouseEvent) => {
        const dx = Math.abs(me.clientX - dragStartPos.current.x);
        const dy = Math.abs(me.clientY - dragStartPos.current.y);

        if (dx > 5 || dy > 5) {
          if (!dragStarted) {
            dragStarted = true;
            setIsDragging(true);
          }
          hasDraggedRef.current = true;

          const parentRect = nodeRef.current?.parentElement?.getBoundingClientRect();
          if (parentRect) {
            onDrag(
              node.id,
              (me.clientX - parentRect.left) / zoomLevel - offset.x,
              (me.clientY - parentRect.top) / zoomLevel - offset.y
            );
          }
        }
      };

      const handleUp = () => {
        if (dragStarted) {
          setIsDragging(false);
          onDragEnd();
        }
        if (!hasDraggedRef.current) {
          onSelect(node.id);
        }
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [node.id, zoomLevel, isCreatingEdge, onDrag, onDragEnd, onSelect]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCreatingEdge) {
        onEdgeClick(node.id);
      }
    },
    [node.id, isCreatingEdge, onEdgeClick]
  );

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditName(node.name);
  }, [node.name]);

  const handleRenameSubmit = useCallback(() => {
    if (editName.trim()) {
      onRename(node.id, editName.trim());
    }
    setIsEditing(false);
  }, [node.id, editName, onRename]);

  // Resolve Lucide icon by name string
  const IconComponent = (LucideIcons as Record<string, any>)[node.icon] || LucideIcons.Box;

  // Build class list for 6 states
  let borderClass = 'border-fw-secondary';
  let ringClass = '';
  let scaleClass = '';
  let shadowClass = 'shadow-sm';

  if (hasValidationError) {
    borderClass = 'border-red-500';
    ringClass = 'ring-2 ring-red-200';
  }
  if (isEdgeTarget) {
    ringClass = 'ring-2 ring-blue-300 animate-pulse';
  }
  if (isSelected) {
    borderClass = 'border-fw-active';
    ringClass = 'ring-2 ring-blue-200';
  }
  if (isDragging) {
    scaleClass = 'scale-105';
    shadowClass = 'shadow-2xl';
  }

  return (
    <div
      ref={nodeRef}
      className={`
        absolute flex flex-col items-center justify-center
        w-16 h-16 rounded-xl border bg-fw-base
        transition-shadow duration-150
        ${borderClass} ${ringClass} ${scaleClass} ${shadowClass}
        ${isCreatingEdge ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        hover:shadow-md
      `}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        zIndex: isDragging ? 50 : isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <IconComponent className="w-6 h-6 text-fw-heading" />

      {/* Node label */}
      {isEditing ? (
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="absolute -bottom-7 w-24 text-center text-figma-xs bg-fw-base border border-fw-secondary rounded px-1"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="absolute -bottom-6 text-figma-xs text-fw-body font-medium truncate max-w-[100px] text-center leading-tight">
          {node.name}
        </span>
      )}

      {/* Status dot */}
      <span
        className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${
          node.status === 'active' ? 'bg-emerald-400' : 'bg-gray-300'
        }`}
      />
    </div>
  );
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/Node.tsx
git commit -m "feat(designer): rebuild Node with 6 interaction states, zoom-aware drag, inline rename"
```

---

### Task 7: Edge Component

**Files:**
- Rewrite: `src/components/network-designer/Edge.tsx`

- [ ] **Step 1: Rewrite Edge.tsx**

```typescript
// src/components/network-designer/Edge.tsx
import { memo } from 'react';
import { EDGE_TYPE_COLORS } from './constants/edgeTypes';
import { CANVAS_BOUNDS } from './constants/canvasBounds';
import type { NetworkNode, NetworkEdge } from './types/designer';

interface EdgeProps {
  edge: NetworkEdge;
  nodes: NetworkNode[];
  isSelected: boolean;
  onClick: (id: string) => void;
}

export const Edge = memo(function Edge({ edge, nodes, isSelected, onClick }: EdgeProps) {
  const source = nodes.find((n) => n.id === edge.source);
  const target = nodes.find((n) => n.id === edge.target);
  if (!source || !target) return null;

  const half = CANVAS_BOUNDS.NODE_SIZE / 2;
  const sx = source.x + half;
  const sy = source.y + half;
  const tx = target.x + half;
  const ty = target.y + half;
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;

  const serviceColor = EDGE_TYPE_COLORS[edge.type] || '#9ca3af';
  const color = isSelected ? '#3b82f6' : edge.status === 'active' ? serviceColor : '#d1d5db';
  const strokeWidth = isSelected ? 3 : 2;

  // Arrow rotation
  const angle = Math.atan2(ty - sy, tx - sx);
  const angleDeg = angle * (180 / Math.PI);

  // Label rotation (keep readable)
  const labelAngle = (angleDeg > 90 || angleDeg < -90) ? angleDeg + 180 : angleDeg;

  // Label offset perpendicular to line
  const perpAngle = angle - Math.PI / 2;
  const offsetDist = 14;
  const labelX = mx + Math.cos(perpAngle) * offsetDist;
  const labelY = my + Math.sin(perpAngle) * offsetDist;

  const label = `${edge.type} - ${edge.bandwidth}`;

  return (
    <g style={{ pointerEvents: 'auto' }} onClick={() => onClick(edge.id)}>
      {/* Hit area - matches visible curve */}
      <path
        d={(() => {
          const dx = tx - sx;
          const dy = ty - sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const offset = Math.min(dist * 0.2, 50);
          const perpX = -dy / dist * offset;
          const perpY = dx / dist * offset;
          return `M ${sx} ${sy} Q ${mx + perpX} ${my + perpY} ${tx} ${ty}`;
        })()}
        stroke="transparent"
        strokeWidth={20}
        fill="none"
        style={{ cursor: 'pointer' }}
      />

      {/* Visible line - quadratic bezier */}
      <path
        d={(() => {
          const dx = tx - sx;
          const dy = ty - sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const offset = Math.min(dist * 0.2, 50);
          const perpX = -dy / dist * offset;
          const perpY = dx / dist * offset;
          return `M ${sx} ${sy} Q ${mx + perpX} ${my + perpY} ${tx} ${ty}`;
        })()}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={edge.type === 'VPN' ? '6,4' : undefined}
        style={{ pointerEvents: 'none' }}
      />

      {/* Arrow */}
      <polygon
        points="-10,-4 0,0 -10,4"
        fill={color}
        transform={`translate(${tx},${ty}) rotate(${angleDeg})`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Status dot at midpoint */}
      <circle
        cx={mx}
        cy={my}
        r={4}
        fill={edge.status === 'active' ? '#22c55e' : '#9ca3af'}
        stroke="white"
        strokeWidth={1.5}
        style={{ pointerEvents: 'none' }}
      />

      {/* Label */}
      <g transform={`translate(${labelX},${labelY}) rotate(${labelAngle})`}>
        <rect
          x={-label.length * 3}
          y={-8}
          width={label.length * 6}
          height={14}
          rx={3}
          fill="white"
          fillOpacity={0.95}
          stroke={isSelected ? '#3b82f6' : serviceColor}
          strokeWidth={0.5}
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight={500}
          fill={isSelected ? '#3b82f6' : '#374151'}
        >
          {label}
        </text>
      </g>
    </g>
  );
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/components/network-designer/Edge.tsx
git commit -m "feat(designer): rebuild Edge with service-aware colors, arrows, inline labels"
```

---

### Task 8: ZoomControls

**Files:**
- Create: `src/components/network-designer/ZoomControls.tsx`

- [ ] **Step 1: Create ZoomControls.tsx**

```typescript
// src/components/network-designer/ZoomControls.tsx
import { Plus, Minus, Maximize2 } from 'lucide-react';
import { useDesignerStore } from './store/useDesignerStore';

export function ZoomControls() {
  const zoomLevel = useDesignerStore((s) => s.zoomLevel);
  const setZoomLevel = useDesignerStore((s) => s.setZoomLevel);
  const setPanOffset = useDesignerStore((s) => s.setPanOffset);

  const zoomIn = () => setZoomLevel(Math.min(zoomLevel + 0.25, 3.0));
  const zoomOut = () => setZoomLevel(Math.max(zoomLevel - 0.25, 0.5));
  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="absolute bottom-20 right-4 flex flex-col gap-1 z-20">
      <button
        onClick={zoomIn}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-fw-base border border-fw-secondary shadow-sm hover:bg-fw-wash transition-colors"
        title="Zoom in"
      >
        <Plus className="w-4 h-4 text-fw-heading" />
      </button>
      <div className="text-center text-figma-xs text-fw-bodyLight font-medium">
        {Math.round(zoomLevel * 100)}%
      </div>
      <button
        onClick={zoomOut}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-fw-base border border-fw-secondary shadow-sm hover:bg-fw-wash transition-colors"
        title="Zoom out"
      >
        <Minus className="w-4 h-4 text-fw-heading" />
      </button>
      <button
        onClick={resetZoom}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-fw-base border border-fw-secondary shadow-sm hover:bg-fw-wash transition-colors mt-1"
        title="Reset zoom"
      >
        <Maximize2 className="w-3.5 h-3.5 text-fw-heading" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/network-designer/ZoomControls.tsx
git commit -m "feat(designer): add ZoomControls with +/- buttons and zoom percentage"
```

---

### Task 9: NetworkDesigner Orchestrator (Phase 1 wiring)

**Files:**
- Rewrite: `src/components/network-designer/NetworkDesigner.tsx`
- Rewrite: `src/components/network-designer/Toolbar.tsx` (minimal version)
- Rewrite: `src/components/network-designer/StatusBar.tsx` (minimal version)

- [ ] **Step 1: Read the current NetworkDesigner.tsx to preserve imports/interface**

Run: Read `src/components/network-designer/NetworkDesigner.tsx` lines 1-30

- [ ] **Step 2: Rewrite NetworkDesigner.tsx**

The orchestrator wires store + hooks + components together. Phase 1 version has minimal Toolbar and StatusBar; full versions come in Phase 2-3.

```typescript
// src/components/network-designer/NetworkDesigner.tsx
import { useEffect, useCallback } from 'react';
import { useDesignerStore } from './store/useDesignerStore';
import { useNetworkManager } from './hooks/useNetworkManager';
import { useSelectionManager } from './hooks/useSelectionManager';
import { useEdgeCreator } from './hooks/useEdgeCreator';
import { useNetworkHistory } from './hooks/useNetworkHistory';
import { Canvas } from './Canvas';
import { Node } from './Node';
import { Edge } from './Edge';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { ZoomControls } from './ZoomControls';
import type { NetworkNode, NetworkEdge } from './types/designer';

// Preserve existing props contract
interface NetworkDesignerProps {
  onComplete: (config: Connection[]) => void; // Connection type from src/types/connection.ts
  onCancel: () => void;
  initialNodes?: NetworkNode[];
  initialEdges?: NetworkEdge[];
  editMode?: boolean;
  connectionId?: string;
}

export function NetworkDesigner({
  onComplete,
  onCancel,
  initialNodes,
  initialEdges,
  editMode = false,
  connectionId,
}: NetworkDesignerProps) {
  const store = useDesignerStore();
  const { nodes, edges, addNode, deleteNode, moveNode, updateNode, deleteEdge, clearCanvas, loadTemplate, saveToHistory } =
    useNetworkManager();
  const { selectedNodeId, selectedEdgeId, handleNodeSelection, handleEdgeSelection, clearSelection } =
    useSelectionManager();
  const { isCreatingEdge, edgeStartNodeId, toggleEdgeCreation, handleNodeClickForEdge, cancelEdgeCreation } =
    useEdgeCreator();
  const { undo, canUndo } = useNetworkHistory();

  const isMaximized = useDesignerStore((s) => s.isMaximized);
  const toggleMaximize = useDesignerStore((s) => s.toggleMaximize);

  // Initialize with initial data
  useEffect(() => {
    if (initialNodes?.length) {
      store.setNodes(initialNodes);
    }
    if (initialEdges?.length) {
      store.setEdges(initialEdges);
    }
    store.saveToHistory();
  }, []); // Run once on mount

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          deleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          deleteEdge(selectedEdgeId);
        }
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
      }
      if (e.key === 'Escape') {
        if (isCreatingEdge) {
          cancelEdgeCreation();
        } else {
          clearSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, isCreatingEdge, deleteNode, deleteEdge, undo, cancelEdgeCreation, clearSelection]);

  const handleNodeDrag = useCallback(
    (id: string, x: number, y: number) => {
      moveNode(id, x, y);
    },
    [moveNode]
  );

  const handleNodeDragEnd = useCallback(() => {
    saveToHistory();
  }, [saveToHistory]);

  const handleNodeRename = useCallback(
    (id: string, name: string) => {
      saveToHistory();
      updateNode(id, { name });
    },
    [updateNode, saveToHistory]
  );

  const containerClass = isMaximized
    ? 'fixed inset-0 z-50 bg-fw-wash'
    : 'relative w-full h-[600px] bg-fw-wash rounded-2xl border border-fw-secondary overflow-hidden';

  return (
    <div className={containerClass}>
      <StatusBar nodeCount={nodes.length} edgeCount={edges.length} />

      <Canvas
        svgContent={
          <>
            {edges.map((edge) => (
              <Edge
                key={edge.id}
                edge={edge}
                nodes={nodes}
                isSelected={selectedEdgeId === edge.id}
                onClick={handleEdgeSelection}
              />
            ))}
          </>
        }
      >
        {nodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isEdgeTarget={isCreatingEdge && edgeStartNodeId !== null && edgeStartNodeId !== node.id}
            hasValidationError={false}
            isCreatingEdge={isCreatingEdge}
            onSelect={handleNodeSelection}
            onDrag={handleNodeDrag}
            onDragEnd={handleNodeDragEnd}
            onEdgeClick={handleNodeClickForEdge}
            onRename={handleNodeRename}
          />
        ))}
      </Canvas>

      <ZoomControls />

      <Toolbar
        onAddNode={addNode}
        onConnect={toggleEdgeCreation}
        isConnecting={isCreatingEdge}
        onUndo={undo}
        canUndo={canUndo}
        onClear={clearCanvas}
        onComplete={() => onComplete([])}
        onMaximize={toggleMaximize}
        isMaximized={isMaximized}
      />

      {/* Minimize button in maximized mode */}
      {isMaximized && (
        <button
          onClick={toggleMaximize}
          className="fixed top-4 right-4 z-[60] inline-flex items-center gap-2 h-9 px-4 bg-fw-base border border-fw-secondary rounded-full shadow-lg text-figma-base font-medium text-fw-heading hover:bg-fw-wash transition-colors"
        >
          Minimize
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write minimal Toolbar.tsx for Phase 1**

```typescript
// src/components/network-designer/Toolbar.tsx
import { Plus, Link, Undo2, Trash2, Check, Maximize2, Minimize2 } from 'lucide-react';

interface ToolbarProps {
  onAddNode: (type: string, functionType: string) => void;
  onConnect: () => void;
  isConnecting: boolean;
  onUndo: () => void;
  canUndo: boolean;
  onClear: () => void;
  onComplete: () => void;
  onMaximize: () => void;
  isMaximized: boolean;
}

export function Toolbar({
  onAddNode,
  onConnect,
  isConnecting,
  onUndo,
  canUndo,
  onClear,
  onComplete,
  onMaximize,
  isMaximized,
}: ToolbarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 h-12 px-4 bg-fw-base rounded-full shadow-lg border border-fw-secondary">
      {/* Add node - basic for Phase 1, categorized dropdown in Phase 2 */}
      <button
        onClick={() => onAddNode('function', 'router')}
        className="flex items-center gap-1.5 h-8 px-3 rounded-full text-figma-sm font-medium text-fw-heading hover:bg-fw-wash transition-colors"
        title="Add Router"
      >
        <Plus className="w-4 h-4" />
        Add Node
      </button>

      <div className="h-5 w-px bg-fw-secondary" />

      <button
        onClick={onConnect}
        className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-figma-sm font-medium transition-colors ${
          isConnecting
            ? 'bg-fw-active text-white'
            : 'text-fw-heading hover:bg-fw-wash'
        }`}
        title={isConnecting ? 'Cancel connect' : 'Connect nodes'}
      >
        <Link className="w-4 h-4" />
        Connect
      </button>

      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="h-8 w-8 flex items-center justify-center rounded-full text-fw-heading hover:bg-fw-wash disabled:opacity-30 transition-colors"
        title="Undo"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        onClick={onClear}
        className="h-8 w-8 flex items-center justify-center rounded-full text-fw-heading hover:bg-fw-wash transition-colors"
        title="Clear canvas"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <button
        onClick={onMaximize}
        className="h-8 w-8 flex items-center justify-center rounded-full text-fw-heading hover:bg-fw-wash transition-colors"
        title={isMaximized ? 'Minimize' : 'Maximize'}
      >
        {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      <div className="h-5 w-px bg-fw-secondary" />

      <button
        onClick={onComplete}
        className="flex items-center gap-1.5 h-8 px-4 rounded-full bg-fw-active text-white text-figma-sm font-medium hover:bg-fw-linkHover transition-colors"
      >
        <Check className="w-4 h-4" />
        Create
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Write minimal StatusBar.tsx for Phase 1**

```typescript
// src/components/network-designer/StatusBar.tsx
import { Activity } from 'lucide-react';

interface StatusBarProps {
  nodeCount: number;
  edgeCount: number;
}

export function StatusBar({ nodeCount, edgeCount }: StatusBarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 h-9 px-4 bg-fw-base rounded-full shadow-sm border border-fw-secondary">
      <Activity className="w-3.5 h-3.5 text-fw-bodyLight" />
      <span className="text-figma-sm text-fw-body font-medium">
        {nodeCount} nodes
      </span>
      <div className="h-3.5 w-px bg-fw-secondary" />
      <span className="text-figma-sm text-fw-body font-medium">
        {edgeCount} edges
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 6: Verify in browser**

Run: Navigate to a page that renders NetworkDesigner (via ConnectionWizard step 2)
Expected: Canvas renders with grid dots, can add nodes, drag them, connect with edges, undo works, maximize works

- [ ] **Step 7: Commit**

```bash
git add src/components/network-designer/NetworkDesigner.tsx src/components/network-designer/Toolbar.tsx src/components/network-designer/StatusBar.tsx
git commit -m "feat(designer): wire Phase 1 orchestrator with store, hooks, canvas, nodes, edges"
```

---

## Phase 2: Node Taxonomy & Toolbar

### Task 10: Categorized Add-Node Dropdown in Toolbar

**Files:**
- Modify: `src/components/network-designer/Toolbar.tsx`

- [ ] **Step 1: Rebuild Toolbar with categorized dropdown**

Replace the simple "Add Node" button with a dropdown menu that groups items by NODE_CATEGORIES. The dropdown opens on click, shows categories with headers, and each item click calls `onAddNode(type, functionType, { subType?, cloudProvider?, dcProvider? })`.

Include all toolbar actions: Add Node dropdown | Connect | Undo | Save Template | Export | Clear | divider | Create button.

- [ ] **Step 2: Verify in browser**

Navigate to the designer, click Add Node. Expected: categorized dropdown with Network Functions, Network Types, Cloud Providers, Data Centers sections.

- [ ] **Step 3: Commit**

```bash
git add src/components/network-designer/Toolbar.tsx
git commit -m "feat(designer): add categorized node dropdown with full taxonomy to Toolbar"
```

---

### Task 11: Delete Old Files

**Files:**
- Delete: `src/components/network-designer/panels/ConfigurationPanel.tsx`
- Delete: `src/components/network-designer/panels/AIRecommendationEngine.tsx`
- Delete: `src/components/network-designer/ScenarioConsole.tsx`

- [ ] **Step 1: Remove old files**

```bash
rm src/components/network-designer/panels/ConfigurationPanel.tsx
rm src/components/network-designer/panels/AIRecommendationEngine.tsx
rm src/components/network-designer/ScenarioConsole.tsx
```

Also remove old template files (7 files, replaced by templateDefinitions.ts in Task 17):
```bash
ls src/components/network-designer/templates/
# Delete all old .ts template files EXCEPT types.ts and TemplateLoader.ts (if present)
# The specific files: cloud-router.ts, vpn-to-cloud.ts, internet-to-cloud.ts,
# hybrid-multi-cloud.ts, datacenter-cloud.ts, cloud-to-cloud-local.ts,
# cloud-to-cloud-inter-region.ts, TemplateLoader.ts
```

Also check for and remove any `panels/configuration/` subdirectory with old tab components (ConnectivityTab, PerformanceTab, RoutingTab, SecurityTab).

- [ ] **Step 2: Remove any imports of deleted files**

Search for imports of ConfigurationPanel, AIRecommendationEngine, ScenarioConsole in remaining files. Remove them.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore(designer): remove ConfigurationPanel, AIRecommendationEngine, ScenarioConsole"
```

---

## Phase 3: Config Panels & Validation

### Task 12: FloatingPanel Container

**Files:**
- Create: `src/components/network-designer/panels/FloatingPanel.tsx`

- [ ] **Step 1: Create FloatingPanel.tsx**

A container component that slides in from the right when visible. Props: `isOpen`, `onClose`, `title`, `children`. Positioned absolute right-4 top-16, max-h with overflow scroll. Animated with CSS transition (transform translateX).

- [ ] **Step 2: Commit**

```bash
git add src/components/network-designer/panels/FloatingPanel.tsx
git commit -m "feat(designer): add FloatingPanel container with slide-in animation"
```

---

### Task 13: NodeConfigPanel

**Files:**
- Create: `src/components/network-designer/panels/NodeConfigPanel.tsx`

- [ ] **Step 1: Create NodeConfigPanel.tsx**

Tabbed config panel with 4 tabs: Overview, Routing, Security, Performance. Each tab shows type-appropriate form fields. Fields are demonstrative (no backend wiring). Node name is editable. Delete button in header.

Key fields per tab:
- **Overview:** Name, Type/SubType (badges), Location, Status toggle
- **Routing:** ASN, BGP neighbor, Routing Protocol dropdown, BFD toggle (shown for routers/VNFs)
- **Security:** Encryption toggle, DDoS protection, Inspection mode (shown for firewalls/VNFs)
- **Performance:** Latency target, QoS profile dropdown, Bandwidth allocation

- [ ] **Step 2: Wire into NetworkDesigner.tsx**

Import NodeConfigPanel. Render it when `selectedNodeId` is not null, passing the selected node object and update/delete callbacks.

- [ ] **Step 3: Verify in browser**

Click a node. Expected: panel slides in from right with tabbed config.

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/panels/NodeConfigPanel.tsx src/components/network-designer/NetworkDesigner.tsx
git commit -m "feat(designer): add NodeConfigPanel with tabbed config (Overview, Routing, Security, Performance)"
```

---

### Task 14: EdgeConfigPanel

**Files:**
- Create: `src/components/network-designer/panels/EdgeConfigPanel.tsx`

- [ ] **Step 1: Create EdgeConfigPanel.tsx**

Config panel for edges: Connection type dropdown (from EDGE_TYPE_OPTIONS), Bandwidth dropdown (from BANDWIDTH_OPTIONS), Resilience dropdown (single/redundant/HA/dual-diverse), Status toggle, VLAN ID input, read-only Metrics display (mock latency/throughput/packetLoss), Delete button.

- [ ] **Step 2: Wire into NetworkDesigner.tsx**

Render EdgeConfigPanel when `selectedEdgeId` is not null.

- [ ] **Step 3: Verify in browser**

Click an edge. Expected: panel slides in with edge properties.

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/panels/EdgeConfigPanel.tsx src/components/network-designer/NetworkDesigner.tsx
git commit -m "feat(designer): add EdgeConfigPanel with connection type, bandwidth, resilience, metrics"
```

---

### Task 15: Validation Engine

**Files:**
- Create: `src/components/network-designer/engine/validationEngine.ts`

- [ ] **Step 1: Create validationEngine.ts**

Implement 9 rules from spec:
- **Errors:** Orphan node, Cloud without Cloud Router, Cloud Router without IPE, DC direct to cloud
- **Warnings:** Single point of failure, No redundancy, No firewall
- **Info:** Suggest dual routers, Suggest SDWAN

Each rule returns `ValidationIssue[]`. Main export: `validateTopology(nodes, edges): ValidationIssue[]`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/network-designer/engine/validationEngine.ts
git commit -m "feat(designer): add validation engine with 9 topology rules"
```

---

### Task 16: StatusBar with Validation

**Files:**
- Modify: `src/components/network-designer/StatusBar.tsx`

- [ ] **Step 1: Enhance StatusBar**

Add validation summary display: "X errors, Y warnings" with colored badges. Click to expand dropdown showing categorized issues. Import and call `validateTopology()` with current nodes/edges. Add refresh button.

- [ ] **Step 2: Wire validation into NetworkDesigner.tsx**

Pass nodes and edges to StatusBar so it can run validation.

- [ ] **Step 3: Verify in browser**

Add nodes without connecting them. Expected: StatusBar shows "1 error" (orphan node). Click to see details.

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/StatusBar.tsx src/components/network-designer/NetworkDesigner.tsx
git commit -m "feat(designer): integrate validation engine into StatusBar with expandable details"
```

---

### Task 17: Templates

**Files:**
- Create: `src/components/network-designer/templates/templateDefinitions.ts`
- Create: `src/components/network-designer/templates/TemplateCard.tsx`
- Rewrite: `src/components/network-designer/TemplatesDrawer.tsx`

- [ ] **Step 1: Create templateDefinitions.ts**

Define 6 templates with node/edge data:
1. High Availability (dual Cloud Router to IPE)
2. Cloud-to-Cloud Local
3. Internet-to-Cloud
4. SD-WAN Hybrid
5. Dual Diverse HA
6. Simple VNF Chain

Each template: `{ id, name, description, nodes: NetworkNode[], edges: NetworkEdge[], nodeCount, edgeCount }`.

- [ ] **Step 2: Create TemplateCard.tsx**

Card showing: name, description, node/edge count badges. Click to load.

- [ ] **Step 3: Rewrite TemplatesDrawer.tsx**

Slides in from left or opens as modal. Shows grid of TemplateCards. Click loads template (with confirmation if canvas not empty).

- [ ] **Step 4: Wire into Toolbar and NetworkDesigner**

Add Templates button to Toolbar. Toggle TemplatesDrawer visibility in NetworkDesigner.

- [ ] **Step 5: Create SaveTemplateModal.tsx**

Modal with name input, description textarea, and Save/Cancel buttons. Captures current nodes/edges as a custom template. Stores in local state (no persistence needed for stakeholder demo).

- [ ] **Step 6: Verify in browser**

Click Templates in toolbar. Expected: drawer with 6 template cards. Click one to load topology. Click "Save Template" in toolbar. Expected: modal with name/description fields.

- [ ] **Step 7: Commit**

```bash
git add src/components/network-designer/templates/ src/components/network-designer/TemplatesDrawer.tsx src/components/network-designer/Toolbar.tsx src/components/network-designer/NetworkDesigner.tsx
git commit -m "feat(designer): add template system with 6 pre-built topologies, drawer UI, and save modal"
```

**Note:** The old `TemplateLoader.ts` dynamic import pattern is intentionally replaced by static imports in `templateDefinitions.ts`. Templates are static data for this stakeholder demo; lazy loading adds complexity without benefit here.

---

## Phase 4: Maximize & Polish

### Task 17.5: Wire Validation Errors to Node Components

**Files:**
- Modify: `src/components/network-designer/NetworkDesigner.tsx`

- [ ] **Step 1: Compute per-node validation state**

In NetworkDesigner, call `validateTopology(nodes, edges)` and build a `Set<string>` of node IDs with errors. Pass `hasValidationError={errorNodeIds.has(node.id)}` to each Node component instead of the hardcoded `false`.

- [ ] **Step 2: Verify in browser**

Add an orphan node (no connections). Expected: node shows red border/ring.

- [ ] **Step 3: Commit**

```bash
git add src/components/network-designer/NetworkDesigner.tsx
git commit -m "feat(designer): wire validation errors to individual Node components"
```

---

### Task 18: App-Level Maximize

**Files:**
- Modify: `src/components/network-designer/NetworkDesigner.tsx`

- [ ] **Step 1: Verify maximize behavior**

The maximize logic was wired in Task 9. Verify that when `isMaximized` is true, the designer takes over the full viewport with `fixed inset-0 z-50`. Verify the Minimize button appears and restores embedded view.

The parent app shell (MainNav, sidebar) should be hidden. Check if a CSS class or context flag on the app root is needed. If DashboardLayout needs a `designer-maximized` class, add it via a DOM class toggle or React context.

- [ ] **Step 2: Test maximize/minimize cycle**

Navigate to designer. Click Maximize. Expected: canvas fills viewport, nav/header hidden. Click Minimize. Expected: returns to embedded 600px view.

- [ ] **Step 3: Commit if changes needed**

```bash
git add -A
git commit -m "feat(designer): polish app-level maximize with full viewport takeover"
```

---

### Task 18.5: PDF Export

**Files:**
- Modify: `src/components/network-designer/Toolbar.tsx`
- Modify: `src/components/network-designer/NetworkDesigner.tsx`

- [ ] **Step 1: Install jsPDF and html2canvas**

Run: `npm install jspdf html2canvas`

- [ ] **Step 2: Add export handler to NetworkDesigner**

Create an `exportPDF` callback that:
1. Uses `html2canvas` to capture the canvas container element
2. Creates a new `jsPDF` instance (landscape, A4)
3. Adds the canvas image to the PDF
4. Adds a header with timestamp and node/edge counts
5. Triggers download with timestamped filename: `network-topology-YYYY-MM-DD.pdf`

- [ ] **Step 3: Wire Export button in Toolbar**

Add an Export button (Download icon) to the Toolbar. Pass `onExport` callback from NetworkDesigner.

- [ ] **Step 4: Verify in browser**

Add some nodes and edges. Click Export. Expected: PDF downloads with the topology diagram.

- [ ] **Step 5: Commit**

```bash
git add src/components/network-designer/Toolbar.tsx src/components/network-designer/NetworkDesigner.tsx package.json package-lock.json
git commit -m "feat(designer): add PDF export with jsPDF and html2canvas"
```

---

### Task 19: Keyboard Shortcuts & Polish

**Files:**
- Modify: `src/components/network-designer/NetworkDesigner.tsx`

- [ ] **Step 1: Verify keyboard shortcuts**

Keyboard shortcuts were wired in Task 9. Verify:
- Delete/Backspace: removes selected node or edge
- Ctrl+Z / Cmd+Z: undo
- Escape: cancel edge creation or deselect

- [ ] **Step 2: Add animated transitions**

Ensure Node transitions (shadow, scale) use `transition-all duration-150`. Ensure FloatingPanel uses `transition-transform duration-200`. Ensure StatusBar dropdown uses `transition-opacity duration-150`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(designer): verify keyboard shortcuts and add animated transitions"
```

---

### Task 20: Final Verification

- [ ] **Step 1: Verify LazyNetworkDesigner wrapper still works**

Read `src/components/network-designer/LazyNetworkDesigner.tsx`. Confirm it lazy-imports `NetworkDesigner` with the correct path and default export. If it uses named export, update the lazy import to match: `import('./NetworkDesigner').then(m => ({ default: m.NetworkDesigner }))`.

- [ ] **Step 2: TypeScript compile check**

Run: `npx tsc --noEmit`
Expected: Clean (zero errors)

- [ ] **Step 3: Full browser verification**

Check each feature:
1. Add nodes from each category (router, firewall, VNF, cloud, datacenter, network)
2. Drag nodes with snap-to-grid
3. Connect nodes with edge creation mode
4. Select node - config panel appears
5. Select edge - config panel appears
6. Undo works
7. Delete key removes selected
8. Escape cancels edge creation
9. Templates load correctly
10. Validation shows errors/warnings in StatusBar
11. Maximize/minimize works
12. Pan (Alt+drag) and zoom (Ctrl+scroll) work
13. Double-click node to rename
14. Edge labels show type and bandwidth

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(designer): Visual Designer rebuild complete - all 4 phases implemented"
```
