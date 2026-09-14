import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { Minimize2, ArrowLeft, AlertTriangle, X, Eye, Pencil } from 'lucide-react';
import { chartColors } from '../../utils/chartColors';
import type { Connection, NetworkNode as LegacyNetworkNode, NetworkEdge as LegacyNetworkEdge } from '../../types';
import type { NetworkNode, NetworkEdge } from './types/designer';
import { useDesignerStore } from './store/useDesignerStore';
import { useNetworkManager } from './hooks/useNetworkManager';
import { useSelectionManager } from './hooks/useSelectionManager';
import { useEdgeCreator } from './hooks/useEdgeCreator';
import { useNetworkHistory } from './hooks/useNetworkHistory';
import { validateTopology } from './engine/validationEngine';
import { Canvas } from './Canvas';
import { Node } from './Node';
import { Edge } from './Edge';
import { ZoomControls } from './ZoomControls';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { NodeConfigPanel } from './panels/NodeConfigPanel';
import { EdgeConfigPanel } from './panels/EdgeConfigPanel';
import { TemplatesDrawer } from './TemplatesDrawer';
import { ConnectionTypeIcon } from '../connection/icons/ConnectionTypeIcon';
import { SaveTemplateModal } from './templates/SaveTemplateModal';
import { SaveDraftModal } from './SaveDraftModal';
import { DraftsDrawer } from './DraftsDrawer';
import { WelcomeModal } from './WelcomeModal';
import { NetworkSimulation } from './simulation/NetworkSimulation';
import { runSimulation } from './simulation/runSimulation';

// Preserve the props interface so LazyNetworkDesigner and ConnectionWizard still work
interface NetworkDesignerProps {
  onComplete: (config: Connection[]) => void;
  onCancel: () => void;
  initialNodes?: LegacyNetworkNode[];
  initialEdges?: LegacyNetworkEdge[];
  editMode?: boolean;
  connectionId?: string;
  connectionStatus?: string;
  resiliencyLevel?: string;
  selectedProviders?: string[];
  selectedConnectionType?: string;
}

function legacyNodeToNew(n: LegacyNetworkNode): NetworkNode {
  return {
    id: n.id,
    type: n.type === 'source' || n.type === 'router' ? 'function' : (n.type as NetworkNode['type']),
    functionType: n.type,
    x: n.x,
    y: n.y,
    name: n.name,
    icon: 'Box',
    status: n.status === 'active' ? 'active' : 'inactive',
    config: n.config || {},
  };
}

function legacyEdgeToNew(e: LegacyNetworkEdge): NetworkEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type || 'Ethernet',
    bandwidth: e.bandwidth || '1 Gbps',
    status: e.status === 'active' ? 'active' : 'inactive',
  };
}

export function NetworkDesigner({
  onComplete,
  onCancel,
  initialNodes = [],
  initialEdges = [],
  editMode = false,
  connectionId,
  connectionStatus,
  resiliencyLevel,
  selectedProviders = [],
  selectedConnectionType,
}: NetworkDesignerProps) {
  const [showEditWarning, setShowEditWarning] = useState(editMode && connectionStatus === 'Active');

  // Tier context
  const setResiliencyContext = useDesignerStore((s) => s.setResiliencyContext);
  const resiliencyTier = useDesignerStore((s) => s.resiliencyTier);
  const storeProviders = useDesignerStore((s) => s.selectedProviders);
  const storeConnectionType = useDesignerStore((s) => s.selectedConnectionType);
  const isAwsMax = selectedConnectionType === 'AWS Last Mile';

  // Sync tier context to store on mount/change
  useEffect(() => {
    setResiliencyContext(
      (resiliencyLevel as any) || null,
      selectedProviders,
      selectedConnectionType || null
    );
  }, [resiliencyLevel, selectedProviders, selectedConnectionType]);

  // Store state
  const nodes = useDesignerStore((s) => s.nodes);
  const edges = useDesignerStore((s) => s.edges);
  const isMaximized = useDesignerStore((s) => s.isMaximized);
  const selectedNodeId = useDesignerStore((s) => s.selectedNodeId);
  const selectedEdgeId = useDesignerStore((s) => s.selectedEdgeId);
  const setNodes = useDesignerStore((s) => s.setNodes);
  const setEdges = useDesignerStore((s) => s.setEdges);
  const toggleMaximize = useDesignerStore((s) => s.toggleMaximize);
  const viewMode = useDesignerStore((s) => s.viewMode);
  const setViewMode = useDesignerStore((s) => s.setViewMode);
  const saveToHistoryStore = useDesignerStore((s) => s.saveToHistory);
  const isSimulationRunning = useDesignerStore((s) => s.isSimulationRunning);

  const isReadOnly = viewMode === 'read';

  // Hooks
  const { addNode, moveNode, updateNode, deleteNode, updateEdge, deleteEdge, clearCanvas } = useNetworkManager();
  const { handleNodeSelection, handleEdgeSelection, clearSelection } = useSelectionManager();
  const { isCreatingEdge, edgeStartNodeId, toggleEdgeCreation, handleNodeClickForEdge, cancelEdgeCreation } = useEdgeCreator();
  const { undo, canUndo } = useNetworkHistory();

  // UI state
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isSaveDraftOpen, setIsSaveDraftOpen] = useState(false);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(!editMode && initialNodes.length === 0 && !resiliencyLevel);

  // Canvas ref for PDF export
  const canvasRef = useRef<HTMLDivElement>(null);

  // Validation - compute error node IDs
  const errorNodeIds = useMemo(() => {
    const issues = validateTopology(nodes, edges, resiliencyTier, storeProviders[0] || null, storeConnectionType);
    const ids = new Set<string>();
    for (const issue of issues) {
      if (issue.severity === 'error' && issue.nodeId) {
        ids.add(issue.nodeId);
      }
    }
    return ids;
  }, [nodes, edges]);

  // Initialize store with initial nodes/edges on mount, or clear if fresh
  useEffect(() => {
    if (initialNodes.length > 0 || initialEdges.length > 0) {
      const converted = initialNodes.map(legacyNodeToNew);
      const convertedEdges = initialEdges.map(legacyEdgeToNew);
      setNodes(converted);
      setEdges(convertedEdges);
      saveToHistoryStore();
    } else if (!editMode) {
      // Fresh entry - clear stale state from previous sessions
      setNodes([]);
      setEdges([]);
    }
    // Always start in edit mode - user navigated here to work
    setViewMode('edit');
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (!isReadOnly && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedNodeId) deleteNode(selectedNodeId);
        else if (selectedEdgeId) deleteEdge(selectedEdgeId);
      }

      if (!isReadOnly && (e.ctrlKey || e.metaKey) && e.key === 'z') {
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
  }, [selectedNodeId, selectedEdgeId, isCreatingEdge, isReadOnly, deleteNode, deleteEdge, undo, cancelEdgeCreation, clearSelection]);

  // Node handlers
  const handleNodeSelect = useCallback((id: string) => {
    if (!isCreatingEdge) {
      handleNodeSelection(id);
    }
  }, [isCreatingEdge, handleNodeSelection]);

  const handleRunSimulation = useCallback(() => {
    if (!isSimulationRunning && edges.length > 0) {
      runSimulation();
    }
  }, [isSimulationRunning, edges.length]);

  const handleNodeDrag = useCallback((id: string, x: number, y: number) => {
    moveNode(id, x, y);
  }, [moveNode]);

  const handleNodeDragEnd = useCallback(() => {
    saveToHistoryStore();
  }, [saveToHistoryStore]);

  const handleNodeEdgeClick = useCallback((id: string) => {
    handleNodeClickForEdge(id);
  }, [handleNodeClickForEdge]);

  const handleNodeRename = useCallback((id: string, name: string) => {
    updateNode(id, { name });
  }, [updateNode]);

  // Edge handler
  const handleEdgeClick = useCallback((id: string) => {
    handleEdgeSelection(id);
  }, [handleEdgeSelection]);

  // Add a node from the categorized dropdown
  const handleAddNode = useCallback((type: string, subType?: string, meta?: Record<string, string>) => {
    addNode(type, subType || type, meta);
  }, [addNode]);

  // Load a template
  const storeLoadTemplate = useDesignerStore((s) => s.loadTemplate);
  const handleLoadTemplate = useCallback((templateNodes: NetworkNode[], templateEdges: NetworkEdge[]) => {
    storeLoadTemplate(templateNodes, templateEdges);
  }, [storeLoadTemplate]);

  // Save template handler (logs for now - real storage would be persisted)
  const handleSaveTemplate = useCallback((name: string, description: string) => {
    window.addToast?.({
      type: 'success',
      title: 'Template Saved',
      message: `"${name}" saved. (${description || 'No description'})`,
      duration: 3000,
    });
  }, []);

  // PDF export
  const exportPDF = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: chartColors.wash,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('network-topology.pdf');

      window.addToast?.({
        type: 'success',
        title: 'Export Complete',
        message: 'Network topology exported as PDF.',
        duration: 3000,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      window.addToast?.({
        type: 'error',
        title: 'Export Failed',
        message: 'Could not export PDF. Please try again.',
        duration: 3000,
      });
    }
  }, []);

  // Build connections from edges and call onComplete
  const handleCreateConnections = useCallback(() => {
    if (edges.length === 0) {
      window.addToast?.({
        type: 'warning',
        title: 'No Connections',
        message: 'Please create at least one connection before proceeding',
        duration: 3000,
      });
      return;
    }

    const connections: Connection[] = edges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      const metros = [...new Set(nodes.map(n => n.metro).filter(Boolean))];
      return {
        id: editMode && connectionId ? connectionId : `conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${sourceNode?.name || 'Source'} to ${targetNode?.name || 'Target'}`,
        type: (edge.type as Connection['type']) || 'Internet to Cloud',
        status: 'Inactive',
        bandwidth: edge.bandwidth,
        location: sourceNode?.metro || sourceNode?.config?.region || targetNode?.config?.region || 'US East',
        provider: targetNode?.config?.provider || targetNode?.cloudProvider,
        configuration: {
          resiliencyLevel: resiliencyTier || undefined,
          isLmcc: isAwsMax || undefined,
          lmccMetro: isAwsMax ? metros[0] : undefined,
          selectedProviders: storeProviders.length > 0 ? storeProviders : undefined,
          selectedConnectionType: storeConnectionType || undefined,
          designerGenerated: true,
        },
      };
    });

    onComplete(connections);
  }, [edges, nodes, editMode, connectionId, onComplete]);

  // Edge preview line: track mouse position when creating an edge
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isCreatingEdge || !edgeStartNodeId) {
      setMousePos(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Convert the cursor's screen position into canvas model space so the
      // preview line tracks the cursor after the canvas has been panned/zoomed.
      // The SVG layer is rendered inside the canvas's translate()/scale()
      // transform, so raw screen coords would be transformed a second time.
      const { panOffset, zoomLevel } = useDesignerStore.getState();
      setMousePos({
        x: (e.clientX - rect.left - panOffset.x) / zoomLevel,
        y: (e.clientY - rect.top - panOffset.y) / zoomLevel,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isCreatingEdge, edgeStartNodeId]);

  // Layout - flex column so banners push canvas down
  const hubClass = isMaximized
    ? 'fixed inset-0 z-50 bg-fw-wash flex flex-col'
    : 'relative w-full h-[600px] bg-fw-wash rounded-2xl border border-fw-secondary overflow-hidden flex flex-col';

  // Find source node position for edge preview
  const edgeSourceNode = edgeStartNodeId ? nodes.find(n => n.id === edgeStartNodeId) : null;

  // Render edges as SVG content, nodes as children
  const svgContent = (
    <>
      {edges.map((edge) => (
        <Edge
          key={edge.id}
          edge={edge}
          nodes={nodes}
          isSelected={edge.id === selectedEdgeId}
          onClick={handleEdgeClick}
        />
      ))}
      {/* Preview line from source node to cursor while creating edge */}
      {edgeSourceNode && mousePos && (
        <line
          x1={edgeSourceNode.x + 40}
          y1={edgeSourceNode.y + 30}
          x2={mousePos.x}
          y2={mousePos.y}
          stroke="#0057b8"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.6}
          pointerEvents="none"
        />
      )}
    </>
  );

  const nodeChildren = (
    <>
      {nodes.map((node) => (
        <Node
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          isEdgeTarget={isCreatingEdge && node.id !== edgeStartNodeId}
          hasValidationError={errorNodeIds.has(node.id)}
          isCreatingEdge={isCreatingEdge}
          readOnly={isReadOnly}
          onSelect={handleNodeSelect}
          onDrag={handleNodeDrag}
          onDragEnd={handleNodeDragEnd}
          onEdgeClick={handleNodeEdgeClick}
          onRename={handleNodeRename}
        />
      ))}
    </>
  );

  return (
    <div className={hubClass}>
      {/* Top banners - normal flow, push canvas down */}
      {(editMode || isAwsMax || showEditWarning) && (
        <div className="flex-shrink-0">
          {editMode && (
            <div className="flex items-center justify-between px-4 py-2 bg-fw-base border-b border-fw-secondary">
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 text-figma-base font-medium text-fw-link hover:text-fw-linkHover transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Connection detail
              </button>
            </div>
          )}
          {/* AWS Max auto-provision banner */}
          {isAwsMax && (
            <div className="flex items-center gap-3 px-4 py-3 bg-fw-accent border-b border-fw-active/20">
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" alt="AWS" className="w-8 h-4 object-contain" />
              <div className="text-figma-sm text-fw-heading">
                <span className="font-semibold">AWS Max - Auto-Provisioned by AT&T</span>
                <span className="text-fw-bodyLight ml-2">4 IPEs across 2 diverse sites. Manual edits may be overwritten by auto-provisioning.</span>
              </div>
            </div>
          )}
          {showEditWarning && (
            <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200">
              <div className="flex items-center gap-2 text-figma-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                Disconnecting an active connection may cause service interruption
              </div>
              <button onClick={() => setShowEditWarning(false)} className="text-amber-600 hover:text-amber-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Canvas area - flex-1 with relative positioning for overlays */}
      <div className="relative flex-1 min-h-0">
        {/* Floating minimize button when maximized */}
        {isMaximized && (
          <button
            onClick={toggleMaximize}
            className="fixed top-4 right-4 z-[60] inline-flex items-center gap-2 h-9 px-4 text-figma-base font-medium text-fw-heading bg-fw-base border border-fw-secondary rounded-full shadow-lg hover:bg-fw-wash transition-colors"
          >
            <Minimize2 className="h-4 w-4" />
            Minimize
          </button>
        )}

        {/* Connection-type context chip - top left */}
        {(() => {
          const ctType = isAwsMax ? 'AWS Last Mile' : (selectedConnectionType || storeConnectionType);
          const ctLabel = isAwsMax ? 'AWS Interconnect – Last Mile' : (selectedConnectionType || storeConnectionType);
          if (!ctType) return null;
          return (
            <div className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 h-9 pl-2.5 pr-3.5 rounded-full border border-fw-secondary bg-fw-base shadow-sm">
              <span className="text-fw-link shrink-0">
                <ConnectionTypeIcon type={ctType} size={18} />
              </span>
              <span className="text-figma-sm font-semibold text-fw-heading whitespace-nowrap">{ctLabel}</span>
            </div>
          );
        })()}

        {/* StatusBar - top center */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <StatusBar nodes={nodes} edges={edges} />
        </div>

        {/* Read/Edit mode toggle - top right */}
        <div className="absolute top-4 right-4 z-20 flex rounded-full border border-fw-secondary bg-fw-base shadow-sm overflow-hidden p-0.5 gap-0.5">
          <button
            onClick={() => setViewMode('read')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-figma-sm font-medium transition-colors ${
              isReadOnly ? 'bg-fw-primary text-white' : 'text-fw-body hover:bg-fw-wash'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Read
          </button>
          <button
            onClick={() => setViewMode('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-figma-sm font-medium transition-colors ${
              !isReadOnly ? 'bg-fw-primary text-white' : 'text-fw-body hover:bg-fw-wash'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>

        {/* Canvas - fills the canvas area */}
        <div ref={canvasRef} className="absolute inset-0">
          <Canvas svgContent={svgContent}>
            {nodeChildren}
          </Canvas>
        </div>

        {/* ZoomControls - bottom right */}
        <ZoomControls />

      {/* Templates drawer */}
      <TemplatesDrawer
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onLoadTemplate={handleLoadTemplate}
      />

      {/* Save template modal */}
      <SaveTemplateModal
        isOpen={isSaveTemplateOpen}
        onClose={() => setIsSaveTemplateOpen(false)}
        onSave={handleSaveTemplate}
      />

      {/* Save draft modal */}
      <SaveDraftModal
        isOpen={isSaveDraftOpen}
        onClose={() => setIsSaveDraftOpen(false)}
      />

      {/* Drafts drawer */}
      <DraftsDrawer
        isOpen={isDraftsOpen}
        onClose={() => setIsDraftsOpen(false)}
      />

      {/* Node config panel */}
      {selectedNodeId && (() => {
        const selectedNode = nodes.find((n) => n.id === selectedNodeId);
        if (!selectedNode) return null;
        return (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={updateNode}
            onDelete={isReadOnly ? undefined : (id) => { deleteNode(id); clearSelection(); }}
            onClose={clearSelection}
            readOnly={isReadOnly}
          />
        );
      })()}

      {/* Edge config panel */}
      {selectedEdgeId && (() => {
        const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
        if (!selectedEdge) return null;
        return (
          <EdgeConfigPanel
            edge={selectedEdge}
            onUpdate={updateEdge}
            onDelete={isReadOnly ? undefined : (id) => { deleteEdge(id); clearSelection(); }}
            onClose={clearSelection}
            readOnly={isReadOnly}
          />
        );
      })()}

      {/* Welcome modal - shown on first load */}
      {showWelcome && (
        <WelcomeModal
          onClose={() => setShowWelcome(false)}
          onCreate={() => {
            addNode('function', 'router');
            setShowWelcome(false);
          }}
          onLoadTemplate={(nodes, edges) => {
            handleLoadTemplate(nodes, edges);
            setShowWelcome(false);
          }}
        />
      )}

      {/* Toolbar - bottom center */}
      <Toolbar
        onAddNode={handleAddNode}
        onToggleEdgeCreation={toggleEdgeCreation}
        isCreatingEdge={isCreatingEdge}
        onUndo={undo}
        canUndo={canUndo}
        onClearCanvas={clearCanvas}
        onToggleMaximize={toggleMaximize}
        isMaximized={isMaximized}
        onCreateConnections={handleCreateConnections}
        hasConnections={edges.length > 0}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenSaveTemplate={() => setIsSaveTemplateOpen(true)}
        onSaveDraft={() => setIsSaveDraftOpen(true)}
        onOpenDrafts={() => setIsDraftsOpen(true)}
        onExportPDF={exportPDF}
        editMode={editMode}
        readOnly={isReadOnly}
        onSwitchToEdit={() => setViewMode('edit')}
        onRunSimulation={handleRunSimulation}
        isSimulationRunning={isSimulationRunning}
      />

      {/* Simulation Modal */}
      <NetworkSimulation />
      </div>{/* end canvas area */}
    </div>
  );
}
