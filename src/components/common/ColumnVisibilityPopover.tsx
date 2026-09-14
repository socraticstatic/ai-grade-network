import { memo, useState, useRef, useEffect } from 'react';
import { Settings, X, Eye, EyeOff, RotateCcw, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';

export interface ColumnDefinition {
  id: string;
  label: string;
  required?: boolean;
}

interface ColumnVisibilityPopoverProps {
  tableId: string;
  allColumns: ColumnDefinition[];
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

function ColumnVisibilityPopoverComponent({
  tableId,
  allColumns,
  onClose,
  anchorEl
}: ColumnVisibilityPopoverProps) {
  const {
    getVisibleColumns,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    resetToDefaults,
    isColumnVisible
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const visibleColumns = getVisibleColumns(tableId);
  const allColumnIds = allColumns.map(col => col.id);

  // Filter columns based on search
  const filteredColumns = allColumns.filter(col =>
    col.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count visible - empty array means all visible
  const visibleCount = visibleColumns.length === 0 ? allColumns.length : visibleColumns.length;
  const totalCount = allColumns.length;

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Position popover near anchor element
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorEl && popoverRef.current) {
      const anchorRect = anchorEl.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let top = anchorRect.bottom + 8;
      let left = anchorRect.right - popoverRect.width;

      // Adjust horizontal position if off-screen
      if (left < 8) {
        left = 8;
      }
      if (left + popoverRect.width > viewportWidth - 8) {
        left = viewportWidth - popoverRect.width - 8;
      }

      // Adjust vertical position if off-screen
      if (top + popoverRect.height > viewportHeight - 8) {
        // Try positioning above the anchor
        const topAbove = anchorRect.top - popoverRect.height - 8;
        if (topAbove >= 8) {
          top = topAbove;
        } else {
          // If it doesn't fit above either, position it at the top of viewport
          top = 8;
        }
      }

      setPosition({ top, left });
    }
  }, [anchorEl]);

  return (
    <div
      ref={popoverRef}
      className="fixed bg-fw-base border border-fw-secondary rounded-lg shadow-2xl z-50 w-80"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="dialog"
      aria-label="Column visibility settings"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fw-secondary bg-fw-wash">
        <div className="flex items-center space-x-2">
          <Settings className="h-4 w-4 text-brand-blue" />
          <h3 className="text-figma-base font-medium text-fw-heading">Manage Columns</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-fw-neutral transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-fw-bodyLight" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 py-2 bg-brand-lightBlue/20 border-b border-fw-secondary">
        <div className="flex items-center justify-between text-figma-sm">
          <span className="text-fw-bodyLight">
            Showing <span className="font-medium text-brand-blue">{visibleCount}</span> of {totalCount} columns
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-fw-secondary">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fw-bodyLight" />
          <input
            type="text"
            placeholder="Search columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-figma-base border border-fw-secondary rounded-md focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            autoFocus
          />
        </div>
      </div>

      {/* Column List */}
      <div className="max-h-80 overflow-y-auto">
        {filteredColumns.length === 0 ? (
          <div className="px-4 py-8 text-center text-figma-base text-fw-bodyLight">
            No columns match your search
          </div>
        ) : (
          <div className="py-2">
            {filteredColumns.map((column) => {
              const isVisible = isColumnVisible(tableId, column.id);
              const isRequired = column.required || false;

              return (
                <label
                  key={column.id}
                  className={`
                    flex items-center px-4 py-2 cursor-pointer transition-colors
                    ${isRequired ? 'opacity-50 cursor-not-allowed' : 'hover:bg-fw-wash'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => !isRequired && toggleColumn(tableId, column.id, allColumnIds)}
                    disabled={isRequired}
                    className="h-4 w-4 text-brand-blue border-fw-secondary rounded focus:ring-brand-blue"
                  />
                  <span className="ml-3 text-figma-base text-fw-body flex-1">
                    {column.label}
                    {isRequired && (
                      <span className="ml-2 text-figma-sm text-fw-bodyLight">(Required)</span>
                    )}
                  </span>
                  {isVisible ? (
                    <Eye className="h-4 w-4 text-brand-blue" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-fw-bodyLight" />
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-fw-secondary bg-fw-wash">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => showAllColumns(tableId, allColumnIds)}
            className="flex-1 px-3 py-1.5 text-figma-sm font-medium text-brand-blue hover:bg-brand-lightBlue/30 rounded-md transition-colors"
          >
            Show All
          </button>
          <button
            onClick={() => hideAllColumns(tableId, allColumnIds)}
            className="flex-1 px-3 py-1.5 text-figma-sm font-medium text-fw-body hover:bg-fw-neutral rounded-md transition-colors"
          >
            Hide All
          </button>
          <button
            onClick={() => resetToDefaults(tableId)}
            className="flex items-center justify-center px-3 py-1.5 text-figma-sm font-medium text-fw-body hover:bg-fw-neutral rounded-md transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const ColumnVisibilityPopover = memo(ColumnVisibilityPopoverComponent);
