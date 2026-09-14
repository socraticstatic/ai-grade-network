export const CANVAS_BOUNDS = {
  GRID_SIZE: 20,
  NODE_SIZE: 64,
  MAX_Y: 800,
  ZOOM_LIMITS: { MIN: 0.5, MAX: 3.0 },
  EDGE_SNAP_RADIUS: 50,
} as const;

export const CANVAS_SAFE_AREA = {
  TOP: 56,
  BOTTOM: 64,
  LEFT: 72,
  RIGHT: 56,
} as const;

export function getSafeCenter(canvasWidth: number, canvasHeight: number) {
  const safeWidth = canvasWidth - CANVAS_SAFE_AREA.LEFT - CANVAS_SAFE_AREA.RIGHT;
  const safeHeight = canvasHeight - CANVAS_SAFE_AREA.TOP - CANVAS_SAFE_AREA.BOTTOM;
  return {
    x: CANVAS_SAFE_AREA.LEFT + safeWidth / 2,
    y: CANVAS_SAFE_AREA.TOP + safeHeight / 2,
  };
}

export function getSafeBounds(canvasWidth: number, canvasHeight: number) {
  return {
    minX: CANVAS_SAFE_AREA.LEFT,
    minY: CANVAS_SAFE_AREA.TOP,
    maxX: canvasWidth - CANVAS_SAFE_AREA.RIGHT,
    maxY: canvasHeight - CANVAS_SAFE_AREA.BOTTOM,
  };
}

export function snapToGrid(value: number): number {
  return Math.round(value / CANVAS_BOUNDS.GRID_SIZE) * CANVAS_BOUNDS.GRID_SIZE;
}

export function clampPosition(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const bounds = getSafeBounds(canvasWidth, canvasHeight);
  return {
    x: Math.max(bounds.minX, Math.min(x, bounds.maxX - CANVAS_BOUNDS.NODE_SIZE)),
    y: Math.max(bounds.minY, Math.min(y, bounds.maxY - CANVAS_BOUNDS.NODE_SIZE)),
  };
}
