import { Plus, Minus, RotateCcw } from 'lucide-react';
import { useDesignerStore } from './store/useDesignerStore';

export function ZoomControls() {
  const zoomLevel = useDesignerStore((s) => s.zoomLevel);
  const setZoomLevel = useDesignerStore((s) => s.setZoomLevel);
  const setPanOffset = useDesignerStore((s) => s.setPanOffset);

  const zoomIn = () => setZoomLevel(Math.min(zoomLevel + 0.25, 3.0));
  const zoomOut = () => setZoomLevel(Math.max(zoomLevel - 0.25, 0.5));
  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-1 z-20">
      <button
        onClick={zoomIn}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-fw-base border border-fw-secondary shadow-sm hover:bg-fw-wash transition-colors"
        title="Zoom in"
      >
        <Plus className="w-4 h-4 text-fw-heading" />
      </button>
      <div className="text-center text-figma-xs text-fw-bodyLight font-medium">
        {Math.round(zoomLevel * 100)}%
      </div>
      <button
        onClick={zoomOut}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-fw-base border border-fw-secondary shadow-sm hover:bg-fw-wash transition-colors"
        title="Zoom out"
      >
        <Minus className="w-4 h-4 text-fw-heading" />
      </button>
      <button
        onClick={resetZoom}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-fw-base border border-fw-secondary shadow-sm hover:bg-fw-wash transition-colors mt-1"
        title="Reset zoom & pan"
      >
        <RotateCcw className="w-3.5 h-3.5 text-fw-heading" />
      </button>
    </div>
  );
}
