import React from 'react';
import { Globe } from 'lucide-react';

interface InstructionsOverlayProps {
  selectedLocation: string | null;
  locationsLength: number;
  activePanel: 'none' | 'metrics' | 'performance';
}

export function InstructionsOverlay({ 
  selectedLocation, 
  locationsLength, 
  activePanel 
}: InstructionsOverlayProps) {
  if (selectedLocation || locationsLength === 0 || activePanel !== 'none') {
    return null;
  }

  return (
    <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-4 py-3" style={{ zIndex: 40 }}>
      <p className="text-sm text-gray-600 flex items-center">
        <Globe className="h-4 w-4 mr-2 text-blue-500" />
        Click on a location or region marker to see details
      </p>
    </div>
  );
}