import { ReactNode } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface SearchFilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilter?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  filterContent?: ReactNode;
  /** Inline content rendered below the toolbar row (filter panel, active pills) */
  filterPanel?: ReactNode;
  /** Number of active filters - shows count badge on Filter button */
  activeFilterCount?: number;
  /** Whether the filter panel is currently open - styles the button as active */
  isFilterOpen?: boolean;
  actions?: ReactNode;
  showFilter?: boolean;
  showExport?: boolean;
  isRefreshing?: boolean;
}

export function SearchFilterBar({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  onFilter,
  onExport,
  onRefresh,
  filterContent,
  filterPanel,
  activeFilterCount = 0,
  isFilterOpen = false,
  actions,
  showFilter = true,
  showExport = true,
  isRefreshing = false,
}: SearchFilterBarProps) {
  return (
    <div>
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fw-bodyLight h-5 w-5" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="fw-input pl-10"
          />
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-fw-secondary" />

        {/* Filter */}
        {showFilter && (onFilter || filterContent) && (
          filterContent || (
            <Button
              variant="secondary"
              onClick={onFilter}
              size="md"
              className={isFilterOpen ? 'ring-1 ring-fw-active' : ''}
            >
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-fw-active text-white text-figma-sm font-medium leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )
        )}

        {/* Export */}
        {showExport && onExport && (
          <Button variant="secondary" onClick={onExport} size="md">
            Export
          </Button>
        )}

        {/* Refresh */}
        {onRefresh && (
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={onRefresh}
            size="md"
            disabled={isRefreshing}
            className={isRefreshing ? 'cursor-not-allowed' : ''}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}

        {/* Custom actions */}
        {actions}
      </div>

      {/* Inline filter panel (TableFilterPanel renders here) */}
      {filterPanel}
    </div>
  );
}
