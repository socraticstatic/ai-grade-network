/**
 * @deprecated Use StandardTable instead.
 * This is a compatibility shim that maps DataTable props to StandardTable.
 */
import { ReactNode } from 'react';
import { StandardTable, StandardColumn } from './StandardTable';
import { OverflowMenu } from './OverflowMenu';

export interface DataTableColumn<T> {
  id: string;
  label: string;
  sortable?: boolean;
  render: (item: T) => ReactNode;
}

export interface DataTableAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'danger';
}

interface DataTableProps<T> {
  tableId: string;
  columns: DataTableColumn<T>[];
  data: T[];
  keyField: keyof T;
  toolbar?: ReactNode;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => DataTableAction[];
  emptyState?: ReactNode;
}

export function DataTable<T>({
  tableId,
  columns,
  data,
  keyField,
  toolbar,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  actions,
  emptyState,
}: DataTableProps<T>) {
  const standardColumns: StandardColumn<T>[] = columns.map(col => ({
    id: col.id,
    label: col.label,
    sortable: col.sortable,
    render: col.render,
  }));

  const mappedActions = actions
    ? (item: T) => <OverflowMenu items={actions(item)} />
    : undefined;

  return (
    <StandardTable
      tableId={tableId}
      columns={standardColumns}
      data={data}
      keyField={keyField}
      toolbar={toolbar}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
      onRowClick={onRowClick}
      actions={mappedActions}
      emptyState={emptyState}
    />
  );
}
