import { useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';

/**
 * Hook for managing column visibility for a specific table
 */
export function useColumnVisibility(tableId: string) {
  // Subscribe to the columnConfig state directly so we react to changes
  const columnConfig = useStore((state) => state.columnConfig);

  const {
    getVisibleColumns,
    setVisibleColumns,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    resetToDefaults,
    isColumnVisible
  } = useStore();

  // Get visible columns for this table - recalculate when columnConfig changes
  const visibleColumns = useMemo(
    () => getVisibleColumns(tableId),
    [getVisibleColumns, tableId, columnConfig]
  );

  // Toggle a column
  const toggle = useCallback(
    (columnId: string) => {
      toggleColumn(tableId, columnId);
    },
    [toggleColumn, tableId]
  );

  // Show all columns
  const showAll = useCallback(
    (allColumnIds: string[]) => {
      showAllColumns(tableId, allColumnIds);
    },
    [showAllColumns, tableId]
  );

  // Hide all columns (keep minimum)
  const hideAll = useCallback(
    (allColumnIds: string[]) => {
      hideAllColumns(tableId, allColumnIds);
    },
    [hideAllColumns, tableId]
  );

  // Reset to defaults
  const reset = useCallback(() => {
    resetToDefaults(tableId);
  }, [resetToDefaults, tableId]);

  // Check if column is visible
  const isVisible = useCallback(
    (columnId: string) => {
      return isColumnVisible(tableId, columnId);
    },
    [isColumnVisible, tableId, columnConfig]
  );

  // Set visible columns directly
  const setVisible = useCallback(
    (columns: string[]) => {
      setVisibleColumns(tableId, columns);
    },
    [setVisibleColumns, tableId]
  );

  return {
    visibleColumns,
    toggle,
    showAll,
    hideAll,
    reset,
    isVisible,
    setVisible
  };
}
