import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useDesignerStore } from './store/useDesignerStore';
import { CANVAS_BOUNDS } from './constants/canvasBounds';

interface CanvasProps {
  svgContent: ReactNode;
  children: ReactNode;
}

export function Canvas({ svgContent, children }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const panOffset = useDesignerStore((s) => s.panOffset);
  const zoomLevel = useDesignerStore((s) => s.zoomLevel);
  const setPanOffset = useDesignerStore((s) => s.setPanOffset);
  const setZoomLevel = useDesignerStore((s) => s.setZoomLevel);
  const selectNode = useDesignerStore((s) => s.selectNode);
  const selectEdge = useDesignerStore((s) => s.selectEdge);

  const [isPanning, setIsPanning] = useState(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  // Pan: right-click drag, middle-mouse, or Alt+left-click
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      startPanRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      };
    }
    // Left click on canvas background: deselect
    if (e.button === 0 && !e.altKey && e.target === e.currentTarget) {
      selectNode(null);
      selectEdge(null);
    }
  }, [panOffset, selectNode, selectEdge]);

  useEffect(() => {
    if (!isPanning) return;

    const handleMove = (e: MouseEvent) => {
      setPanOffset({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
    };

    const handleUp = () => {
      setIsPanning(false);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isPanning, setPanOffset]);

  // Zoom: mouse wheel with Ctrl/Meta
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const delta = -Math.sign(e.deltaY) * 0.1;
      const rect = el.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
      const mouseY = (e.clientY - rect.top - panOffset.y) / zoomLevel;
      const newZoom = Math.max(0.5, Math.min(zoomLevel + delta, 3.0));

      if (newZoom !== zoomLevel) {
        setPanOffset({
          x: e.clientX - rect.left - mouseX * newZoom,
          y: e.clientY - rect.top - mouseY * newZoom,
        });
        setZoomLevel(newZoom);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [panOffset, zoomLevel, setPanOffset, setZoomLevel]);

  const gridSize = CANVAS_BOUNDS.GRID_SIZE * zoomLevel;

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${panOffset.x % gridSize}px ${panOffset.y % gridSize}px`,
        }}
      />

      {/* Transformed content layer */}
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0',
        }}
      >
        {/* SVG layer for edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '5000px', height: '5000px', overflow: 'visible' }}
        >
          {svgContent}
        </svg>

        {/* HTML layer for nodes */}
        {children}
      </div>
    </div>
  );
}
