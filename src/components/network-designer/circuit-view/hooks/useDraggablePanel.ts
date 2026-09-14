import { useState, useRef, useEffect } from 'react';
import { DraggablePanelPosition } from '../CircuitTypes';

export function useDraggablePanel(hubRef: React.RefObject<HTMLDivElement>) {
  const [panelPositions, setPanelPositions] = useState<Record<string, DraggablePanelPosition>>({});
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Start dragging a panel
  const startDragging = (e: React.MouseEvent, panelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get current position or use default
    const currentPos = panelPositions[panelId] || { x: 0, y: 0 };
    
    // Calculate offset from the current position to the mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    setIsDragging(panelId);
    
    // Add event listeners for drag and drop
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Handle mouse move during drag
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !hubRef.current) return;
    
    const hubRect = hubRef.current.getBoundingClientRect();
    
    // Calculate new position relative to hub
    const newX = e.clientX - hubRect.left - dragOffset.x;
    const newY = e.clientY - hubRect.top - dragOffset.y;
    
    // Update position
    setPanelPositions(prev => ({
      ...prev,
      [isDragging]: { x: newX, y: newY }
    }));
  };
  
  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Cleanup event listeners when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  return {
    panelPositions,
    isDragging: isDragging !== null,
    startDragging
  };
}