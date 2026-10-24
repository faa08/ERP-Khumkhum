/**
 * KhumKhum ERP — Table Types
 */

import type { ColumnDef, SortingState, VisibilityState, RowSelectionState } from '@tanstack/react-table';

export type { ColumnDef, SortingState, VisibilityState, RowSelectionState };

export type DateFilterOption = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH';
export type DateSortOption = 'NEWEST' | 'OLDEST';

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
  enableDateFilter?: boolean;
  dateField?: string;
  defaultDateFilter?: DateFilterOption;
  defaultDateSort?: DateSortOption;
  bulkActions?: BulkAction[];
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  stickyHeader?: boolean;
  toolbarActions?: React.ReactNode;
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
