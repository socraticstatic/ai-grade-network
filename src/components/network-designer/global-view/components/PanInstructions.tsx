import React from 'react';

export function PanInstructions() {
  return (
    <div className="absolute bottom-4 right-4 z-50 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm px-3 py-2">
      <span className="text-xs text-gray-500">
        <span className="font-medium">Pan:</span> Middle-click or Alt+Drag | 
        <span className="font-medium ml-1">Zoom:</span> Ctrl+Wheel or buttons
      </span>
    </div>
  );
}