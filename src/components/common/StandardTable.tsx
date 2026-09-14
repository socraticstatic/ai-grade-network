import { useState, useMemo, useRef, useCallback, ReactNode } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Settings } from 'lucide-react';
import { downloadCSV } from '../../utils/downloadCSV';
import { ColumnVisibilityPopover, ColumnDefinition } from './ColumnVisibilityPopover';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { useStore } from '../../store/useStore';

/**
 * StandardTable - The single table component for the entire app.
 *
 * Enforces:
 * - Hub: rounded-lg border border-fw-secondary overflow-hidden
 * - Toolbar slot: px-6 py-4 border-b border-fw-secondary
 * - table-fixed, standard thead/tbody classes
 * - Dual sort arrows (both always visible)
 * - Gear icon + ColumnVisibilityPopover
 * - Actions column w-16 aligned with gear
 * - Optional pagination footer
 * - Optional CSV export
 */

export interface StandardColumn<T> {
  id: string;
  label: string;
  sortable?: boolean;
  sortKey?: keyof T;
  width?: string;
  render: (item: T) => ReactNode;
  csvRender?: (item: T) => string;
}

export interface StandardTableProps<T> {
  tableId: string;
  columns: StandardColumn<T>[];
  data: T[];
  keyField?: keyof T;
  keyExtractor?: (item: T) => string;

  // Sorting - external (onSort provided) or internal (omitted)
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;

  // Slots
  toolbar?: ReactNode;
  headerActions?: ReactNode;
  emptyState?: ReactNode;

  // Row behavior
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  actions?: (item: T) => ReactNode;

  // Opt-in features
  pageSize?: number;
  showPagination?: boolean;
  exportFilename?: string;
  showExport?: boolean;
  showColumnManager?: boolean;
  stickyHeader?: boolean;
}

export function StandardTable<T>({
  tableId,
  columns,
  data,
  keyField,
  keyExtractor,
  sortField: externalSortField,
  sortDirection: externalSortDirection,
  onSort,
  toolbar,
  headerActions,
  emptyState,
  onRowClick,
  rowClassName,
  actions,
  pageSize = 50,
  showPagination = false,
  exportFilename = 'export.csv',
  showExport = false,
  showColumnManager = true,
  stickyHeader = false,
}: StandardTableProps<T>) {
  const maintenanceFreeze = useStore(s => s.maintenanceFreeze);

  // Internal sort state (used when onSort is not provided)
  const [internalSortField, setInternalSortField] = useState<keyof T | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const columnButtonRef = useRef<HTMLButtonElement>(null);

  const isExternalSort = !!onSort;

  // Resolve active sort state
  const activeSortField = isExternalSort ? externalSortField : (internalSortField ? String(internalSortField) : undefined);
  const activeSortDirection = isExternalSort ? (externalSortDirection || 'asc') : internalSortDirection;

  // Key extraction
  const getKey = useCallback((item: T): string => {
    if (keyExtractor) return keyExtractor(item);
    if (keyField) return String(item[keyField]);
    return String((item as Record<string, unknown>)['id'] ?? Math.random());
  }, [keyExtractor, keyField]);

  // Column visibility
  const { visibleColumns, isVisible } = useColumnVisibility(tableId);

  const filteredColumns = useMemo(() => {
    if (visibleColumns.length === 0) return columns;
    const filtered = columns.filter(col => isVisible(col.id));
    return filtered.length === 0 ? columns : filtered;
  }, [columns, visibleColumns, isVisible]);

  const columnDefinitions: ColumnDefinition[] = useMemo(
    () => columns.map(col => ({ id: col.id, label: col.label })),
    [columns]
  );

  // Sort handler
  const handleSort = useCallback((columnId: string, sortKey?: keyof T) => {
    if (isExternalSort) {
      onSort!(columnId);
    } else if (sortKey) {
      if (internalSortField === sortKey) {
        setInternalSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setInternalSortField(sortKey);
        setInternalSortDirection('asc');
      }
      setCurrentPage(1);
    }
  }, [isExternalSort, onSort, internalSortField]);

  // Internal sorting
  const sortedData = useMemo(() => {
    if (isExternalSort || !internalSortField) return data;

    return [...data].sort((a, b) => {
      const aValue = a[internalSortField];
      const bValue = b[internalSortField];
      const modifier = internalSortDirection === 'asc' ? 1 : -1;

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * modifier;
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * modifier;
      }
      return String(aValue).localeCompare(String(bValue)) * modifier;
    });
  }, [data, isExternalSort, internalSortField, internalSortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayData = showPagination ? sortedData.slice(startIndex, endIndex) : sortedData;

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // CSV export
  const handleExport = useCallback(() => {
    const columnsToExport = filteredColumns;
    const headers = columnsToExport.map(col => col.label).join(',');
    const rows = sortedData.map(item => {
      return columnsToExport.map(col => {
        if (col.csvRender) {
          return `"${col.csvRender(item).replace(/"/g, '""')}"`;
        }
        const value = col.sortKey ? String(item[col.sortKey] ?? '') : '';
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csv = [headers, ...rows].join('\n');
    downloadCSV(csv, exportFilename);
  }, [filteredColumns, sortedData, exportFilename]);

  // Page number display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push('...', totalPages);
    }
    return pages;
  };

  // Check if a column is the active sort target
  const isSorted = (col: StandardColumn<T>): boolean => {
    if (!activeSortField) return false;
    // Match on column id (external mode) or sortKey (internal mode)
    return activeSortField === col.id || (!!col.sortKey && activeSortField === String(col.sortKey));
  };

  return (
    <div className="rounded-lg border border-fw-secondary overflow-hidden">
      {/* Toolbar (SearchFilterBar slot) */}
      {toolbar && (
        <div className="px-6 py-4 border-b border-fw-secondary">
          {toolbar}
        </div>
      )}

      {/* Export button (opt-in, rendered above table inside border) */}
      {showExport && sortedData.length > 0 && !toolbar && (
        <div className="flex justify-end px-6 py-3 border-b border-fw-secondary">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 h-9 text-[14px] font-medium text-fw-body bg-fw-base border border-fw-secondary rounded-full hover:bg-fw-wash transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      )}

      {/* Table */}
      <table className="w-full table-fixed">
        <thead className={`bg-fw-wash border-b border-fw-secondary ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
          <tr>
            {filteredColumns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={`px-6 h-12 text-left text-[14px] font-medium text-fw-heading whitespace-nowrap overflow-hidden text-ellipsis align-middle ${
                  col.sortable ? 'cursor-pointer select-none' : ''
                }`}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable ? () => handleSort(col.id, col.sortKey) : undefined}
              >
                {col.sortable ? (
                  <div className="group inline-flex items-center space-x-1">
                    <span>{col.label}</span>
                    <span className="flex flex-col">
                      <ChevronUp className={`h-3 w-3 ${
                        isSorted(col) && activeSortDirection === 'asc'
                          ? 'text-fw-body'
                          : 'text-fw-bodyLight group-hover:text-fw-body'
                      }`} />
                      <ChevronDown className={`h-3 w-3 -mt-1 ${
                        isSorted(col) && activeSortDirection === 'desc'
                          ? 'text-fw-body'
                          : 'text-fw-bodyLight group-hover:text-fw-body'
                      }`} />
                    </span>
                  </div>
                ) : (
                  col.label
                )}
              </th>
            ))}
            {/* Gear / Actions column */}
            <th scope="col" className="w-16 px-6 h-12 align-middle">
              <div className="flex items-center justify-end gap-1">
                {headerActions}
                {showColumnManager && (
                  <button
                    ref={columnButtonRef}
                    onClick={() => setShowColumnPopover(!showColumnPopover)}
                    className="p-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral transition-colors"
                    title="Manage Columns"
                    aria-label="Manage table columns"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                )}
              </div>
            </th>
          </tr>
        </thead>

        <tbody className="bg-fw-base divide-y divide-fw-secondary">
          {displayData.length === 0 ? (
            <tr>
              <td
                colSpan={filteredColumns.length + 1}
                className="px-6 py-8 text-center text-[14px] text-fw-bodyLight"
              >
                {emptyState || 'No data available'}
              </td>
            </tr>
          ) : (
            displayData.map((item) => (
              <tr
                key={getKey(item)}
                className={rowClassName ? rowClassName(item) : `hover:bg-fw-wash transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {filteredColumns.map((col) => (
                  <td
                    key={col.id}
                    className="px-6 py-4 text-[14px] text-fw-body whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {col.render(item)}
                  </td>
                ))}
                {actions && !maintenanceFreeze ? (
                  <td className="w-16 px-6 py-4">
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      {actions(item)}
                    </div>
                  </td>
                ) : (
                  <td className="w-16 px-6 py-4" />
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination footer */}
      {showPagination && totalPages > 1 && (
        <div className="px-6 py-3 border-t border-fw-secondary bg-fw-base">
          <div className="flex items-center justify-between">
            <div className="text-[14px] text-fw-body">
              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
              <span className="font-medium">{Math.min(endIndex, sortedData.length)}</span> of{' '}
              <span className="font-medium">{sortedData.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-md hover:bg-fw-wash disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-md hover:bg-fw-wash disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center space-x-1">
                {getPageNumbers().map((page, index) =>
                  typeof page === 'number' ? (
                    <button
                      key={index}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 rounded-md text-[14px] ${
                        currentPage === page
                          ? 'bg-fw-active text-white'
                          : 'hover:bg-fw-wash text-fw-body'
                      }`}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={index} className="px-2 text-fw-bodyLight">{page}</span>
                  )
                )}
              </div>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md hover:bg-fw-wash disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md hover:bg-fw-wash disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Visibility Popover */}
      {showColumnPopover && (
        <ColumnVisibilityPopover
          tableId={tableId}
          allColumns={columnDefinitions}
          onClose={() => setShowColumnPopover(false)}
          anchorEl={columnButtonRef.current}
        />
      )}
    </div>
  );
}
