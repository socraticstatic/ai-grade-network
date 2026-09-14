import React from 'react';

interface Location {
  id: string;
  name: string;
  location: string;
  coordinates: { x: number; y: number };
  connections: string[];
  type: 'primary' | 'secondary' | 'cloud' | 'network';
  nodeType: string;
  provider?: string;
}

interface ConnectionLinesProps {
  locations: Location[];
  edges: any[];
  selectedLocation: string | null;
}

export function ConnectionLines({ 
  locations, 
  edges, 
  selectedLocation 
}: ConnectionLinesProps) {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 15, pointerEvents: 'none' }}>
      {locations.map(location =>
        location.connections.map(targetId => {
          const targetLocation = locations.find(loc => loc.id === targetId);
          if (!targetLocation) return null;
          
          const edge = edges.find(e => 
            (e.source === location.id && e.target === targetId) || 
            (e.target === location.id && e.source === targetId)
          );
          
          const isActive = edge?.status === 'active';
          const isHighCapacity = edge?.bandwidth && parseInt(edge.bandwidth.split(' ')[0]) > 50;
          const isSelected = selectedLocation === location.id || selectedLocation === targetId;
          
          return (
            <line 
              key={`${location.id}-${targetId}`}
              x1={location.coordinates.x + 20}
              y1={location.coordinates.y + 20}
              x2={targetLocation.coordinates.x + 20}
              y2={targetLocation.coordinates.y + 20}
              stroke={
                isSelected ? '#3b82f6' :
                isActive ? '#10b981' : 
                '#94a3b8'
              }
              strokeWidth={isSelected ? 3 : isHighCapacity ? 2 : 1.5}
              strokeOpacity={isSelected ? 0.9 : isActive ? 0.7 : 0.4}
              strokeDasharray={edge?.type === 'VPN' ? '5,5' : undefined}
            />
          );
        })
      )}
    </svg>
  );
}