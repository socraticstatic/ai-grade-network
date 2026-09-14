/**
 * @deprecated Use StandardTable instead.
 * This is a compatibility shim that maps EnhancedTable props to StandardTable.
 */
import { ReactNode, memo } from 'react';
import { StandardTable, StandardColumn } from './StandardTable';

export interface TableColumn<T> {
  id: string;
  label: string;
  sortable?: boolean;
  sortKey?: keyof T;
  width?: string;
  render: (item: T) => ReactNode;
  csvRender?: (item: T) => string;
}

interface EnhancedTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  pageSize?: number;
  showPagination?: boolean;
  stickyHeader?: boolean;
  rowActions?: (item: T) => ReactNode;
  exportFilename?: string;
  showExport?: boolean;
  tableId?: string;
  showColumnManager?: boolean;
  headerActions?: ReactNode;
  toolbar?: ReactNode;
  showFilter?: boolean;
}

function EnhancedTableComponent<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
  pageSize = 50,
  showPagination = true,
  stickyHeader = true,
  rowActions,
  exportFilename = 'export.csv',
  showExport = true,
  tableId,
  showColumnManager = true,
  headerActions,
  toolbar,
}: EnhancedTableProps<T>) {
  const standardColumns: StandardColumn<T>[] = columns.map(col => ({
    id: col.id,
    label: col.label,
    sortable: col.sortable,
    sortKey: col.sortKey,
    width: col.width,
    render: col.render,
    csvRender: col.csvRender,
  }));

  return (
    <StandardTable
      tableId={tableId || 'default'}
      columns={standardColumns}
      data={data}
      keyExtractor={keyExtractor}
      onRowClick={onRowClick}
      emptyState={emptyMessage}
      pageSize={pageSize}
      showPagination={showPagination}
      stickyHeader={stickyHeader}
      actions={rowActions}
      exportFilename={exportFilename}
      showExport={showExport}
      showColumnManager={showColumnManager}
      headerActions={headerActions}
      toolbar={toolbar}
    />
  );
}

export const EnhancedTable = memo(EnhancedTableComponent) as typeof EnhancedTableComponent;
