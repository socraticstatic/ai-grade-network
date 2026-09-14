import { useEffect } from 'react';

interface UsePanControlsProps {
  hubRef: React.RefObject<HTMLDivElement>;
  isPanning: boolean;
  setIsPanning: (panning: boolean) => void;
  startPanPosition: { x: number; y: number };
  setStartPanPosition: (position: { x: number; y: number }) => void;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number }) => void;
  zoomLevel: number;
}

export function usePanControls({
  hubRef,
  isPanning,
  setIsPanning,
  startPanPosition,
  setStartPanPosition,
  panOffset,
  setPanOffset,
  zoomLevel
}: UsePanControlsProps) {
  useEffect(() => {
    if (!hubRef.current) return;
    
    const element = hubRef.current;
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        setStartPanPosition({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(false);
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const newPanX = e.clientX - startPanPosition.x;
        const newPanY = e.clientY - startPanPosition.y;
        setPanOffset({ x: newPanX, y: newPanY });
        
        document.body.style.cursor = 'grabbing';
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isPanning) {
        e.preventDefault();
        setIsPanning(true);
        const mouseEvent = new MouseEvent('mousemove');
        setStartPanPosition({ 
          x: mouseEvent.clientX - panOffset.x, 
          y: mouseEvent.clientY - panOffset.y 
        });
        document.body.style.cursor = 'grab';
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(false);
        document.body.style.cursor = 'auto';
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY) * 0.1;
        
        const rect = element.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
        const mouseY = (e.clientY - rect.top - panOffset.y) / zoomLevel;
        
        const newZoomLevel = Math.max(0.5, Math.min(zoomLevel + delta, 3));
        
        if (newZoomLevel !== zoomLevel) {
          const newPanX = e.clientX - mouseX * newZoomLevel;
          const newPanY = e.clientY - mouseY * newZoomLevel;
          setPanOffset({ x: newPanX, y: newPanY });
        }
      }
    };
    
    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    element.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [hubRef, isPanning, panOffset, startPanPosition, zoomLevel]);
}