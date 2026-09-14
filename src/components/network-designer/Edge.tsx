import { memo } from 'react';
import { EDGE_TYPE_COLORS } from './constants/edgeTypes';
import { CANVAS_BOUNDS } from './constants/canvasBounds';
import type { NetworkNode, NetworkEdge } from './types/designer';

interface EdgeProps {
  edge: NetworkEdge;
  nodes: NetworkNode[];
  isSelected: boolean;
  onClick: (id: string) => void;
}

export const Edge = memo(function Edge({ edge, nodes, isSelected, onClick }: EdgeProps) {
  const source = nodes.find((n) => n.id === edge.source);
  const target = nodes.find((n) => n.id === edge.target);
  if (!source || !target) return null;

  const half = CANVAS_BOUNDS.NODE_SIZE / 2;
  const sx = source.x + half;
  const sy = source.y + half;
  const tx = target.x + half;
  const ty = target.y + half;
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;

  const serviceColor = EDGE_TYPE_COLORS[edge.type] || '#9ca3af';
  const color = isSelected
    ? '#3b82f6'
    : edge.status === 'active'
      ? serviceColor
      : edge.status === 'down'
        ? '#ef4444'
        : '#d1d5db';
  const isSimulating = edge.status === 'active' && (edge.metrics?.bandwidthUtilization ?? 0) > 0;
  const strokeWidth = isSelected ? 3 : isSimulating ? 2.5 : 2;
  const isInactiveOrDown = edge.status === 'inactive' || edge.status === 'down';

  // Quadratic bezier control point
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(dist * 0.2, 50);
  const perpX = dist > 0 ? (-dy / dist) * offset : 0;
  const perpY = dist > 0 ? (dx / dist) * offset : 0;
  const cx = mx + perpX;
  const cy = my + perpY;
  const curvePath = `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;

  // Arrow rotation
  const angle = Math.atan2(ty - sy, tx - sx);
  const angleDeg = angle * (180 / Math.PI);

  // Gear icon position - on the curve at midpoint (quadratic bezier at t=0.5)
  const gearX = 0.25 * sx + 0.5 * cx + 0.25 * tx;
  const gearY = 0.25 * sy + 0.5 * cy + 0.25 * ty;
  const gearR = 10;

  return (
    <g style={{ pointerEvents: 'auto' }} onClick={() => onClick(edge.id)}>
      {/* Hit area */}
      <path
        d={curvePath}
        stroke="transparent"
        strokeWidth={20}
        fill="none"
        style={{ cursor: 'pointer' }}
      />

      {/* Visible line - quadratic bezier */}
      <path
        d={curvePath}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={isSimulating ? '8,4' : edge.type === 'VPN' || isInactiveOrDown ? '6,4' : undefined}
        style={{
          pointerEvents: 'none',
          ...(isSimulating ? {
            animation: 'edge-flow 1s linear infinite',
          } : {}),
        }}
      />
      {isSimulating && (
        <style>{`@keyframes edge-flow { to { stroke-dashoffset: -24; } }`}</style>
      )}

      {/* Arrow */}
      <polygon
        points="-10,-4 0,0 -10,4"
        fill={color}
        transform={`translate(${tx},${ty}) rotate(${angleDeg})`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Gear icon - click to configure */}
      <g
        transform={`translate(${gearX},${gearY})`}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onClick(edge.id); }}
      >
        <circle
          r={gearR}
          fill="white"
          stroke={isSelected ? '#3b82f6' : serviceColor}
          strokeWidth={1.5}
        />
        {/* Gear SVG path (Lucide Settings icon scaled to fit) */}
        <g transform="translate(-6,-6) scale(0.5)">
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            fill="none"
            stroke={isSelected ? '#3b82f6' : serviceColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={12}
            cy={12}
            r={3}
            fill="none"
            stroke={isSelected ? '#3b82f6' : serviceColor}
            strokeWidth={2}
          />
        </g>
      </g>
    </g>
  );
});
