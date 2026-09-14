import { useCallback } from 'react';
import { useDesignerStore } from '../store/useDesignerStore';

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
