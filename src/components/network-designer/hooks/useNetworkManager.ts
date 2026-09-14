import { useCallback } from 'react';
import { useDesignerStore } from '../store/useDesignerStore';
import { getDefaultNodeName, getIconName } from '../constants/nodeTypes';
import { getSafeCenter, snapToGrid } from '../constants/canvasBounds';
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
        status: 'unconfigured',
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
      removeNode(id);
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
