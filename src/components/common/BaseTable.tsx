/**
 * @deprecated Use StandardTable instead.
 * This is a compatibility shim that maps BaseTable props to StandardTable.
 */
import { ReactNode } from 'react';
import { StandardTable, StandardColumn } from './StandardTable';

interface Column<T> {
  id: string;
  label: string;
  sortable?: boolean;
  sortKey?: keyof T;
  render: (item: T) => ReactNode;
  width?: string;
  exportValue?: (item: T) => string;
}

interface BaseTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  sortField?: keyof T;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: keyof T) => void;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  actions?: (item: T) => ReactNode;
  emptyState?: ReactNode;
  title?: string;
  tableId?: string;
  showColumnManager?: boolean;
  toolbar?: ReactNode;
}

export function BaseTable<T>({
  columns,
  data,
  keyField,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  rowClassName,
  actions,
  emptyState,
  tableId,
  showColumnManager = true,
  toolbar,
}: BaseTableProps<T>) {
  const standardColumns: StandardColumn<T>[] = columns.map(col => ({
    id: col.id,
    label: col.label,
    sortable: col.sortable,
    sortKey: col.sortKey,
    width: col.width,
    render: col.render,
    csvRender: col.exportValue,
  }));

  return (
    <StandardTable
      tableId={tableId || 'default'}
      columns={standardColumns}
      data={data}
      keyField={keyField}
      toolbar={toolbar}
      sortField={sortField ? String(sortField) : undefined}
      sortDirection={sortDirection}
      onSort={onSort ? (field: string) => onSort(field as keyof T) : undefined}
      onRowClick={onRowClick}
      rowClassName={rowClassName}
      actions={actions}
      emptyState={emptyState}
      showColumnManager={showColumnManager}
    />
  );
}
