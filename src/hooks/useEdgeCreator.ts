import { useState } from 'react';
import { NetworkNode, NetworkEdge } from '../types';

export function useEdgeCreator(
  edges: NetworkEdge[],
  setEdges: React.Dispatch<React.SetStateAction<NetworkEdge[]>>,
  onEdgeCreated: (edge: NetworkEdge) => void
) {
  const [isCreatingEdge, setIsCreatingEdge] = useState(false);
  const [edgeStart, setEdgeStart] = useState<string | null>(null);
  
  // Toggle edge creation mode
  const toggleEdgeCreation = () => {
    setIsCreatingEdge(!isCreatingEdge);
    if (isCreatingEdge) {
      setEdgeStart(null);
    }
  };
  
  // Handle node click during edge creation
  const handleNodeClickForEdge = (sourceId: string, targetId: string) => {
    if (!isCreatingEdge) return false;
    
    if (edgeStart) {
      if (edgeStart !== targetId) {
        // Create a new edge
        const newEdge: NetworkEdge = {
          id: `edge-${Date.now()}`,
          source: edgeStart,
          target: targetId,
          type: 'Internet to Cloud',
          bandwidth: '1 Gbps',
          status: 'inactive'
        };
        const newEdges = [...edges, newEdge];
        setEdges(newEdges);
        onEdgeCreated(newEdge);
      }
      setIsCreatingEdge(false);
      setEdgeStart(null);
      return true;
    } else {
      setEdgeStart(sourceId);
      return true;
    }
  };
  
  // Cancel edge creation
  const cancelEdgeCreation = () => {
    setIsCreatingEdge(false);
    setEdgeStart(null);
  };
  
  return {
    isCreatingEdge,
    edgeStart,
    toggleEdgeCreation,
    handleNodeClickForEdge,
    cancelEdgeCreation
  };
}