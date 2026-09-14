import React from 'react';

interface ZoomIndicatorProps {
  zoomLevel: number;
}

export function ZoomIndicator({ zoomLevel }: ZoomIndicatorProps) {
  return (
    <div className="absolute bottom-20 right-4 z-50 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm px-3 py-1.5">
      <span className="text-xs font-medium text-gray-700">{Math.round(zoomLevel * 100)}%</span>
    </div>
  );
}