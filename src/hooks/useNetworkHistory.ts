import { useState, useRef } from 'react';
import { NetworkNode, NetworkEdge } from '../types';

interface HistoryState {
  nodes: NetworkNode[][];
  edges: NetworkEdge[][];
  currentIndex: number;
}

export function useNetworkHistory() {
  const [history, setHistory] = useState<HistoryState>({
    nodes: [[]],
    edges: [[]],
    currentIndex: 0
  });

  const undoRedoResult = useRef<{ nodes: NetworkNode[]; edges: NetworkEdge[] } | null>(null);

  const saveToHistory = (newNodes: NetworkNode[], newEdges: NetworkEdge[]) => {
    setHistory(prev => ({
      nodes: [...prev.nodes.slice(0, prev.currentIndex + 1), [...newNodes]],
      edges: [...prev.edges.slice(0, prev.currentIndex + 1), [...newEdges]],
      currentIndex: prev.currentIndex + 1
    }));
  };

  const undo = () => {
    undoRedoResult.current = null;
    setHistory(prev => {
      if (prev.currentIndex > 0) {
        const newIndex = prev.currentIndex - 1;
        undoRedoResult.current = {
          nodes: [...prev.nodes[newIndex]],
          edges: [...prev.edges[newIndex]]
        };
        return { ...prev, currentIndex: newIndex };
      }
      return prev;
    });
    return undoRedoResult.current;
  };

  const redo = () => {
    undoRedoResult.current = null;
    setHistory(prev => {
      if (prev.currentIndex < prev.nodes.length - 1) {
        const newIndex = prev.currentIndex + 1;
        undoRedoResult.current = {
          nodes: [...prev.nodes[newIndex]],
          edges: [...prev.edges[newIndex]]
        };
        return { ...prev, currentIndex: newIndex };
      }
      return prev;
    });
    return undoRedoResult.current;
  };

  const canUndo = history.currentIndex > 0;
  const canRedo = history.currentIndex < history.nodes.length - 1;

  return {
    saveToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    currentNodes: history.nodes[history.currentIndex],
    currentEdges: history.edges[history.currentIndex]
  };
}
