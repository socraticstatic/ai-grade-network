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

      const exists = edges.some(
        (e) =>
          (e.source === edgeStartNodeId && e.target === nodeId) ||
          (e.source === nodeId && e.target === edgeStartNodeId)
      );
      if (exists) {
        cancelEdgeCreation();
        return true;
      }

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
