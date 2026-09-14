import React from 'react';
import { Settings } from 'lucide-react';
import { NetworkEdge, NetworkNode } from '../types';

interface EdgeControlsProps {
  edges: NetworkEdge[];
  nodes: NetworkNode[];
  selectedEdge: string | null;
  isReadOnly?: boolean;
  onEdgeClick: (edge: NetworkEdge) => void;
}

export function EdgeControls({ edges, nodes, selectedEdge, isReadOnly = false, onEdgeClick }: EdgeControlsProps) {
  // Helper to find node by id
  const getNode = (id: string) => nodes.find(n => n.id === id);
  
  // Calculate bandwidth utilization color
  const getBandwidthColor = (edge: NetworkEdge) => {
    const utilization = edge.metrics?.bandwidthUtilization || 0;
    if (utilization > 90) return '#ef4444'; // red-500
    if (utilization > 70) return '#f59e0b'; // amber-500
    return '#10b981'; // green-500
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {edges.map(edge => {
        const sourceNode = getNode(edge.source);
        const targetNode = getNode(edge.target);
        
        if (!sourceNode || !targetNode) return null;
        
        // Skip rendering gear for AT&T Core connections
        if (sourceNode?.config?.networkType === 'at&t core' || 
            targetNode?.config?.networkType === 'at&t core' ||
            sourceNode?.name === 'AT&T Core' || 
            targetNode?.name === 'AT&T Core') {
          return null;
        }
        
        // Calculate midpoint for the control
        const sourceX = sourceNode.x + 32;
        const sourceY = sourceNode.y + 32;
        const targetX = targetNode.x + 32;
        const targetY = targetNode.y + 32;
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;
        
        const isSelected = selectedEdge === edge.id;
        
        return (
          <div key={edge.id} style={{ pointerEvents: 'none' }}>
            {/* Large clickable control point */}
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-md flex items-center justify-center cursor-pointer"
              style={{
                left: `${midX}px`,
                top: `${midY}px`,
                width: '32px',
                height: '32px',
                backgroundColor: isSelected ? '#3b82f6' : 'white',
                border: `2px solid ${isSelected ? '#2563eb' : '#d1d5db'}`,
                zIndex: isSelected ? 1001 : 1000,
                pointerEvents: isReadOnly ? 'none' : 'auto', // Disable clicking in read-only mode
                transition: 'all 0.2s ease'
              }}
              onClick={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  onEdgeClick(edge);
                }
              }}
            >
              <Settings
                size={16}
                color={isSelected ? 'white' : '#6b7280'}
              />
            </div>
            
            {/* Status indicator */}
            <div
              className="absolute rounded-full shadow-sm border-2 border-white"
              style={{
                left: `${midX + 20}px`,
                top: `${midY - 20}px`,
                width: '16px',
                height: '16px',
                backgroundColor: edge.status === 'active' ? getBandwidthColor(edge) : '#9ca3af',
                zIndex: 1000,
                pointerEvents: 'none'
              }}
            />
          </div>
        );
      })}
    </div>
  );
}