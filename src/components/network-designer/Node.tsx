import { useRef, useState, useCallback, memo } from 'react';
import * as LucideIcons from 'lucide-react';
import { attIcons } from '../icons/att-icons';
import { AttIcon } from '../icons/AttIcon';
import { useDesignerStore } from './store/useDesignerStore';
import { getNodeColors, STATUS_DOT_COLORS } from './constants/nodeColors';
import type { NetworkNode } from './types/designer';

interface NodeProps {
  node: NetworkNode;
  isSelected: boolean;
  isEdgeTarget: boolean;
  hasValidationError: boolean;
  isCreatingEdge: boolean;
  readOnly?: boolean;
  onSelect: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
  onEdgeClick: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export const Node = memo(function Node({
  node,
  isSelected,
  isEdgeTarget,
  hasValidationError,
  isCreatingEdge,
  readOnly = false,
  onSelect,
  onDrag,
  onDragEnd,
  onEdgeClick,
  onRename,
}: NodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const zoomLevel = useDesignerStore((s) => s.zoomLevel);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isCreatingEdge || readOnly) {
        // In read-only mode, just select on click
        if (readOnly) {
          e.stopPropagation();
          onSelect(node.id);
        }
        return;
      }
      e.stopPropagation();

      // Pure delta approach: no DOM measurement during drag.
      // Capture start positions once, compute deltas from mouse movement.
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startNodeX = node.x;
      const startNodeY = node.y;

      hasDraggedRef.current = false;
      let dragStarted = false;

      const handleMove = (me: MouseEvent) => {
        const dx = me.clientX - startMouseX;
        const dy = me.clientY - startMouseY;

        if (!dragStarted && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          dragStarted = true;
          setIsDragging(true);
        }

        if (dragStarted) {
          hasDraggedRef.current = true;
          onDrag(node.id, startNodeX + dx / zoomLevel, startNodeY + dy / zoomLevel);
        }
      };

      const handleUp = () => {
        if (dragStarted) {
          setIsDragging(false);
          onDragEnd();
        }
        if (!hasDraggedRef.current) {
          onSelect(node.id);
        }
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [node.id, node.x, node.y, zoomLevel, isCreatingEdge, readOnly, onDrag, onDragEnd, onSelect]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCreatingEdge) {
        onEdgeClick(node.id);
      }
    },
    [node.id, isCreatingEdge, onEdgeClick]
  );

  const handleDoubleClick = useCallback(() => {
    if (readOnly) return;
    setIsEditing(true);
    setEditName(node.name);
  }, [node.name, readOnly]);

  const handleRenameSubmit = useCallback(() => {
    if (editName.trim()) {
      onRename(node.id, editName.trim());
    }
    setIsEditing(false);
  }, [node.id, editName, onRename]);

  // Resolve icon: check AT&T registry first, then Lucide
  const isAttIcon = node.icon in attIcons;
  const IconComponent = isAttIcon ? null : ((LucideIcons as Record<string, any>)[node.icon] || LucideIcons.Box);

  // Node type colors from Figma spec
  const colors = getNodeColors(node.type, node.functionType);
  const isUnconfigured = node.status === 'unconfigured';
  const isActiveState = node.status === 'active' || node.status === 'active-down';

  // Border and background based on status
  const borderStyle = isUnconfigured ? 'dashed' : 'solid';
  const borderColor = isUnconfigured ? '#d1d5db' : colors.border;
  const bgColor = isActiveState ? colors.bg : 'var(--nd-bg-default, #ffffff)';

  // Interaction state overrides
  let ringClass = '';
  let shadowClass = 'shadow-sm';
  let borderOverride: string | undefined;

  if (hasValidationError) {
    borderOverride = '#ef4444';
    ringClass = 'ring-2 ring-red-200';
  }
  if (isEdgeTarget) {
    ringClass = 'ring-2 ring-blue-300 animate-pulse';
  }
  if (isSelected) {
    borderOverride = '#3b82f6';
    ringClass = 'ring-2 ring-blue-200';
  }
  if (isDragging) {
    shadowClass = 'shadow-2xl';
  }

  // Status dot color
  const dotColor = STATUS_DOT_COLORS[node.status] || '#d1d5db';

  return (
    <div
      ref={nodeRef}
      data-status={node.status}
      data-node-type={node.functionType}
      className={`
        absolute flex flex-col items-center justify-center
        w-16 h-16 rounded-xl
        transition-shadow duration-150
        ${ringClass} ${shadowClass}
        ${readOnly ? 'cursor-default' : isCreatingEdge ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        hover:shadow-md
      `}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)${isDragging ? ' scale(1.05)' : ''}`,
        zIndex: isDragging ? 50 : isSelected ? 10 : 1,
        borderWidth: '2px',
        borderStyle,
        borderColor: borderOverride || borderColor,
        backgroundColor: bgColor,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {isAttIcon
        ? <AttIcon name={node.icon as any} className="w-8 h-8 text-fw-heading" />
        : <IconComponent className="w-6 h-6 text-fw-heading" />
      }

      {/* Node label */}
      {isEditing ? (
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="absolute -bottom-7 w-24 text-center text-figma-xs bg-fw-base border border-fw-secondary rounded px-1"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="absolute -bottom-6 text-figma-xs text-fw-body font-medium truncate max-w-[100px] text-center leading-tight">
          {node.name}
        </span>
      )}

      {/* Metro badge */}
      {node.metro && (
        <span className="absolute -bottom-10 text-[8px] font-medium text-fw-link bg-fw-accent border border-fw-active/20 px-1.5 py-0.5 rounded truncate max-w-[80px]">
          {node.metro}
        </span>
      )}

      {/* Status dot */}
      <span
        data-testid="status-dot"
        className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
        style={{ backgroundColor: dotColor }}
      />
    </div>
  );
});
