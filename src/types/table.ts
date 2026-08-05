/**
 * KhumKhum ERP — Table Types
 */

import type { ColumnDef, SortingState, VisibilityState, RowSelectionState } from '@tanstack/react-table';

export type { ColumnDef, SortingState, VisibilityState, RowSelectionState };

export interface DataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  totalCount?: number;
  pageSize?: number;
  pageIndex?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  onGlobalFilterChange?: (value: string) => void;
  enableRowSelection?: boolean;
  enableGlobalFilter?: boolean;
  enableColumnVisibility?: boolean;
  enableSorting?: boolean;
  bulkActions?: BulkAction[];
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  stickyHeader?: boolean;
}

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  onClick: (selectedRowIds: string[]) => void;
}

export interface TablePaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface TableFilterState {
  id: string;
  value: unknown;
}
