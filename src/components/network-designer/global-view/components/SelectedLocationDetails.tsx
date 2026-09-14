import React from 'react';
import { NetworkNode } from '../../../types';
import { GlobalNodeDetails } from '../GlobalNodeDetails';

interface SelectedLocationDetailsProps {
  selectedLocation: string | null;
  nodes: NetworkNode[];
  onZoomIn: (datacenterId: string) => void;
}

export function SelectedLocationDetails({ 
  selectedLocation, 
  nodes, 
  onZoomIn 
}: SelectedLocationDetailsProps) {
  if (!selectedLocation) return null;

  const selectedNodeData = nodes.find(n => n.id === selectedLocation);
  if (!selectedNodeData) return null;

  return (
    <div className="absolute bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4" style={{ zIndex: 50 }}>
      <GlobalNodeDetails 
        node={selectedNodeData} 
        onZoomIn={() => onZoomIn(selectedLocation)}
      />
    </div>
  );
}