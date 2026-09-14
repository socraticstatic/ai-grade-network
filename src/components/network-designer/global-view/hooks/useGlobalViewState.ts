import { useState, useRef } from 'react';

export function useGlobalViewState() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'none' | 'metrics' | 'performance'>('none');
  const hubRef = useRef<HTMLDivElement>(null);
  
  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
  const [contentBounds, setContentBounds] = useState({ minX: 0, minY: 0, maxX: 800, maxY: 600 });

  return {
    selectedLocation,
    setSelectedLocation,
    activePanel,
    setActivePanel,
    hubRef,
    zoomLevel,
    setZoomLevel,
    panOffset,
    setPanOffset,
    isPanning,
    setIsPanning,
    startPanPosition,
    setStartPanPosition,
    contentBounds,
    setContentBounds
  };
}