import { useState } from 'react';
import { NetworkNode, NetworkEdge } from '../types';

export function useSelectionManager(nodes: NetworkNode[], edges: NetworkEdge[]) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [showEdgeConfig, setShowEdgeConfig] = useState(false);
  
  // Get selected objects
  const selectedNodeObject = nodes.find(node => node.id === selectedNode);
  const selectedEdgeObject = edges.find(edge => edge.id === selectedEdge);
  
  // Handle node selection
  const handleNodeSelection = (node: NetworkNode | null) => {
    if (!node) {
      clearSelection();
      return;
    }
    
    setSelectedNode(node.id);
    setSelectedEdge(null);
    setShowNodeConfig(true);
    setShowEdgeConfig(false);
  };
  
  // Handle edge selection
  const handleEdgeSelection = (edge: NetworkEdge | null) => {
    if (!edge) {
      setSelectedEdge(null);
      setShowEdgeConfig(false);
      return;
    }
    
    setSelectedEdge(edge.id);
    setSelectedNode(null);
    setShowNodeConfig(false);
    setShowEdgeConfig(true);
  };
  
  // Clear all selections
  const clearSelection = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setShowNodeConfig(false);
    setShowEdgeConfig(false);
  };
  
  return {
    selectedNode,
    selectedEdge,
    selectedNodeObject,
    selectedEdgeObject,
    showNodeConfig,
    showEdgeConfig,
    handleNodeSelection,
    handleEdgeSelection,
    clearSelection,
    setShowNodeConfig,
    setShowEdgeConfig
  };
}