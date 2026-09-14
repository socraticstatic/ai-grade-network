import { useCallback } from 'react';

interface UseZoomControlsProps {
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  locations: any[];
  hubRef: React.RefObject<HTMLDivElement>;
}

export function useZoomControls({
  zoomLevel,
  setZoomLevel,
  setPanOffset,
  locations,
  hubRef
}: UseZoomControlsProps) {
  const handleZoomIn = useCallback(() => {
    setZoomLevel(Math.min(zoomLevel + 0.2, 3));
  }, [zoomLevel, setZoomLevel]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(Math.max(zoomLevel - 0.2, 0.5));
  }, [zoomLevel, setZoomLevel]);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [setZoomLevel, setPanOffset]);

  const handleFitToScreen = useCallback(() => {
    if (locations.length === 0) {
      handleZoomReset();
      return;
    }

    const xs = locations.map(loc => loc.coordinates.x);
    const ys = locations.map(loc => loc.coordinates.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const width = maxX - minX + 100;
    const height = maxY - minY + 100;
    
    const hubWidth = hubRef.current?.clientWidth || 800;
    const hubHeight = hubRef.current?.clientHeight || 600;
    
    const widthRatio = hubWidth / width;
    const heightRatio = hubHeight / height;
    const newZoom = Math.min(widthRatio, heightRatio, 1.5);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const panX = (hubWidth / 2) - (centerX * newZoom);
    const panY = (hubHeight / 2) - (centerY * newZoom);
    
    setZoomLevel(newZoom);
    setPanOffset({ x: panX, y: panY });
  }, [locations, hubRef, setZoomLevel, setPanOffset, handleZoomReset]);

  return {
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleFitToScreen
  };
}