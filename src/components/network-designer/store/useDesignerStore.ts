import { create } from 'zustand';
import type { NetworkNode, NetworkEdge, SimulationPhase, SimulationMetrics, SimulationScores, ResiliencyTier } from '../types/designer';

interface HistoryEntry {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface Draft {
  id: string;
  name: string;
  description: string;
  savedAt: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  thumbnail?: string;
  resiliencyTier?: ResiliencyTier | null;
  selectedProviders?: string[];
  selectedConnectionType?: string | null;
}

interface DesignerState {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  panOffset: { x: number; y: number };
  zoomLevel: number;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isCreatingEdge: boolean;
  edgeStartNodeId: string | null;
  isMaximized: boolean;
  viewMode: 'read' | 'edit';
  history: HistoryEntry[];
  historyIndex: number;
  drafts: Draft[];
  currentDraftId: string | null;
  simulationPhase: SimulationPhase;
  simulationProgress: number;
  simulationMetrics: SimulationMetrics;
  simulationScores: SimulationScores;
  isSimulationRunning: boolean;

  // Tier context from wizard
  resiliencyTier: ResiliencyTier | null;
  selectedProviders: string[];
  selectedConnectionType: string | null;

  setResiliencyContext: (tier: ResiliencyTier | null, providers: string[], connectionType: string | null) => void;
  setNodes: (nodes: NetworkNode[]) => void;
  setEdges: (edges: NetworkEdge[]) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setZoomLevel: (level: number) => void;
  addNode: (node: NetworkNode) => void;
  updateNode: (id: string, updates: Partial<NetworkNode>) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;
  addEdge: (edge: NetworkEdge) => void;
  updateEdge: (id: string, updates: Partial<NetworkEdge>) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  startEdgeCreation: () => void;
  setEdgeStartNode: (id: string | null) => void;
  cancelEdgeCreation: () => void;
  saveToHistory: () => void;
  undo: () => void;
  clearCanvas: () => void;
  toggleMaximize: () => void;
  setViewMode: (mode: 'read' | 'edit') => void;
  loadTemplate: (nodes: NetworkNode[], edges: NetworkEdge[]) => void;
  saveDraft: (name: string, description: string) => void;
  loadDraft: (id: string) => void;
  deleteDraft: (id: string) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  setSimulationData: (data: Partial<Pick<DesignerState, 'simulationPhase' | 'simulationProgress' | 'simulationMetrics' | 'simulationScores'>>) => void;
}

export const useDesignerStore = create<DesignerState>((set, get) => ({
  nodes: [],
  edges: [],
  panOffset: { x: 0, y: 0 },
  zoomLevel: 1,
  selectedNodeId: null,
  selectedEdgeId: null,
  isCreatingEdge: false,
  edgeStartNodeId: null,
  isMaximized: false,
  viewMode: 'edit',
  history: [],
  historyIndex: -1,
  currentDraftId: null,
  simulationPhase: 'idle',
  simulationProgress: 0,
  simulationMetrics: {
    bandwidth: { current: 0, max: 100 },
    latency: { current: 0, max: 100 },
    packets: { sent: 0, received: 0, errors: 0 },
  },
  simulationScores: { resiliency: 0, redundancy: 0, disaster: 0, security: 0, performance: 0 },
  isSimulationRunning: false,
  resiliencyTier: null,
  selectedProviders: [],
  selectedConnectionType: null,
  setResiliencyContext: (tier, providers, connectionType) => set({ resiliencyTier: tier, selectedProviders: providers, selectedConnectionType: connectionType }),
  drafts: [
    {
      id: 'seed-draft-1',
      name: 'US East Hub-and-Spoke',
      description: 'Hub-and-spoke topology anchored in US East with a central hub.',
      savedAt: '2026-03-20T14:30:00.000Z',
      nodes: [
        { id: 's1-n1', type: 'function', functionType: 'router', x: 300, y: 200, name: 'Hub', icon: 'hub', status: 'unconfigured', config: {} },
        { id: 's1-n2', type: 'destination', functionType: 'destination', cloudProvider: 'aws', x: 100, y: 100, name: 'AWS East', icon: 'Cloud', status: 'unconfigured', config: { cloudProvider: 'aws', region: 'us-east-1' } },
        { id: 's1-n3', type: 'destination', functionType: 'destination', cloudProvider: 'azure', x: 500, y: 100, name: 'Azure East', icon: 'Cloud', status: 'unconfigured', config: { cloudProvider: 'azure', region: 'eastus' } },
        { id: 's1-n4', type: 'datacenter', functionType: 'datacenter', dcProvider: 'equinix', x: 300, y: 350, name: 'Equinix NY5', icon: 'Database', status: 'unconfigured', config: { dcProvider: 'equinix' } },
      ],
      edges: [
        { id: 's1-e1', source: 's1-n1', target: 's1-n2', type: 'Ethernet', bandwidth: '10 Gbps', status: 'inactive' },
        { id: 's1-e2', source: 's1-n1', target: 's1-n3', type: 'Ethernet', bandwidth: '10 Gbps', status: 'inactive' },
        { id: 's1-e3', source: 's1-n4', target: 's1-n1', type: 'Ethernet', bandwidth: '1 Gbps', status: 'inactive' },
      ],
    },
    {
      id: 'seed-draft-2',
      name: 'Multi-Cloud Redundancy',
      description: 'Redundant multi-cloud design spanning AWS, Azure, and GCP with dual routers.',
      savedAt: '2026-03-21T09:15:00.000Z',
      nodes: [
        { id: 's2-n1', type: 'function', functionType: 'router', x: 200, y: 200, name: 'Router Primary', icon: 'hub', status: 'unconfigured', config: {} },
        { id: 's2-n2', type: 'function', functionType: 'router', x: 400, y: 200, name: 'Router Secondary', icon: 'hub', status: 'unconfigured', config: {} },
        { id: 's2-n3', type: 'destination', functionType: 'destination', cloudProvider: 'aws', x: 100, y: 80, name: 'AWS West', icon: 'Cloud', status: 'unconfigured', config: { cloudProvider: 'aws', region: 'us-west-2' } },
        { id: 's2-n4', type: 'destination', functionType: 'destination', cloudProvider: 'azure', x: 300, y: 80, name: 'Azure Central', icon: 'Cloud', status: 'unconfigured', config: { cloudProvider: 'azure' } },
        { id: 's2-n5', type: 'destination', functionType: 'destination', cloudProvider: 'gcp', x: 500, y: 80, name: 'GCP Central', icon: 'Cloud', status: 'unconfigured', config: { cloudProvider: 'gcp' } },
        { id: 's2-n6', type: 'network', functionType: 'wan', x: 300, y: 360, name: 'MPLS WAN', icon: 'Network', status: 'unconfigured', config: {} },
      ],
      edges: [
        { id: 's2-e1', source: 's2-n1', target: 's2-n3', type: 'Ethernet', bandwidth: '10 Gbps', status: 'inactive' },
        { id: 's2-e2', source: 's2-n1', target: 's2-n4', type: 'Ethernet', bandwidth: '10 Gbps', status: 'inactive' },
        { id: 's2-e3', source: 's2-n2', target: 's2-n4', type: 'Ethernet', bandwidth: '10 Gbps', status: 'inactive' },
        { id: 's2-e4', source: 's2-n2', target: 's2-n5', type: 'Ethernet', bandwidth: '10 Gbps', status: 'inactive' },
        { id: 's2-e5', source: 's2-n6', target: 's2-n1', type: 'Ethernet', bandwidth: '1 Gbps', status: 'inactive' },
        { id: 's2-e6', source: 's2-n6', target: 's2-n2', type: 'Ethernet', bandwidth: '1 Gbps', status: 'inactive' },
      ],
    },
  ],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  setZoomLevel: (level) => set({ zoomLevel: Math.max(0.5, Math.min(level, 3.0)) }),

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
        n.id === id ? { ...n, x, y } : n
      ),
    })),

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

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  startEdgeCreation: () => set({ isCreatingEdge: true, edgeStartNodeId: null }),
  setEdgeStartNode: (id) => set({ edgeStartNodeId: id }),
  cancelEdgeCreation: () => set({ isCreatingEdge: false, edgeStartNodeId: null }),

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
  setViewMode: (mode) => set({ viewMode: mode, isCreatingEdge: false, edgeStartNodeId: null }),

  saveDraft: (name, description) => {
    const { nodes, edges, resiliencyTier, selectedProviders, selectedConnectionType } = get();
    const draft: Draft = {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      description,
      savedAt: new Date().toISOString(),
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      resiliencyTier,
      selectedProviders: [...selectedProviders],
      selectedConnectionType,
    };
    set((s) => ({ drafts: [draft, ...s.drafts], currentDraftId: draft.id }));
  },
  loadDraft: (id) => {
    const { drafts } = get();
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    get().saveToHistory();
    set({
      nodes: JSON.parse(JSON.stringify(draft.nodes)),
      edges: JSON.parse(JSON.stringify(draft.edges)),
      selectedNodeId: null,
      selectedEdgeId: null,
      currentDraftId: id,
      panOffset: { x: 0, y: 0 },
      zoomLevel: 1,
      resiliencyTier: draft.resiliencyTier ?? null,
      selectedProviders: draft.selectedProviders ?? [],
      selectedConnectionType: draft.selectedConnectionType ?? null,
    });
  },
  deleteDraft: (id) => {
    set((s) => ({
      drafts: s.drafts.filter((d) => d.id !== id),
      currentDraftId: s.currentDraftId === id ? null : s.currentDraftId,
    }));
  },

  loadTemplate: (nodes, edges) => {
    get().saveToHistory();
    const clonedNodes = JSON.parse(JSON.stringify(nodes)) as NetworkNode[];

    // Fit topology centered in the visible canvas area
    const canvas = document.querySelector('[class*="overflow-hidden"][class*="select-none"]');
    const vpW = canvas ? canvas.clientWidth : 1000;
    const vpH = canvas ? canvas.clientHeight - 70 : 430; // toolbar + status bar
    const padding = 40; // breathing room around edges

    if (clonedNodes.length > 0) {
      const nodeSize = 64;
      const labelSpace = 30; // space for labels below nodes
      const minX = Math.min(...clonedNodes.map(n => n.x));
      const maxX = Math.max(...clonedNodes.map(n => n.x)) + nodeSize;
      const minY = Math.min(...clonedNodes.map(n => n.y));
      const maxY = Math.max(...clonedNodes.map(n => n.y)) + nodeSize + labelSpace;
      const topoW = maxX - minX;
      const topoH = maxY - minY;

      // Calculate zoom to fit, capped at 1.0 (never zoom in beyond 100%)
      const scaleX = (vpW - padding * 2) / topoW;
      const scaleY = (vpH - padding * 2) / topoH;
      const zoom = Math.min(scaleX, scaleY, 1.0);

      // Center with pan offset
      const scaledW = topoW * zoom;
      const scaledH = topoH * zoom;
      const panX = (vpW - scaledW) / 2 - minX * zoom;
      const panY = (vpH - scaledH) / 2 - minY * zoom;

      set({
        nodes: clonedNodes,
        edges: JSON.parse(JSON.stringify(edges)),
        selectedNodeId: null,
        selectedEdgeId: null,
        panOffset: { x: panX, y: panY },
        zoomLevel: zoom,
      });
    } else {
      set({
        nodes: clonedNodes,
        edges: JSON.parse(JSON.stringify(edges)),
        selectedNodeId: null,
        selectedEdgeId: null,
        panOffset: { x: 0, y: 0 },
        zoomLevel: 1,
      });
    }
  },

  startSimulation: () => set({
    isSimulationRunning: true,
    simulationPhase: 'initializing',
    simulationProgress: 0,
    simulationMetrics: {
      bandwidth: { current: 0, max: 100 },
      latency: { current: 0, max: 100 },
      packets: { sent: 0, received: 0, errors: 0 },
    },
    simulationScores: { resiliency: 0, redundancy: 0, disaster: 0, security: 0, performance: 0 },
  }),
  stopSimulation: () => set({
    isSimulationRunning: false,
    simulationPhase: 'idle',
    simulationProgress: 0,
    simulationMetrics: {
      bandwidth: { current: 0, max: 100 },
      latency: { current: 0, max: 100 },
      packets: { sent: 0, received: 0, errors: 0 },
    },
  }),
  setSimulationData: (data) => set(data),
}));
