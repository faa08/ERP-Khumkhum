'use client';

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type RowSelectionState,
  type VisibilityState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import type { DataTableProps } from '@/types/table';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Checkbox } from '@/components/ui/Checkbox';
import { Pagination } from '@/components/ui/Pagination';
import { DataTableToolbar } from './DataTableToolbar';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import styles from './DataTable.module.css';

export function DataTable<TData extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  totalCount,
  pageSize: controlledPageSize,
  pageIndex: controlledPageIndex,
  onPageChange,
  onPageSizeChange,
  onSortingChange,
  onRowSelectionChange,
  onGlobalFilterChange,
  enableRowSelection = false,
  enableGlobalFilter = true,
  enableColumnVisibility = true,
  enableSorting = true,
  bulkActions,
  emptyStateTitle = 'No records found',
  emptyStateDescription = 'No records match your search criteria.',
  stickyHeader = true,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: controlledPageIndex ?? 0,
    pageSize: controlledPageSize ?? DEFAULT_PAGE_SIZE,
  });

  const allColumns = enableRowSelection
    ? [
        {
          id: 'select',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          header: ({ table }: { table: any }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={table.getIsSomePageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              aria-label="Select all rows"
            />
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cell: ({ row }: { row: any }) => (
            <Checkbox
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
              aria-label={`Select row ${row.index + 1}`}
            />
          ),
          size: 40,
          enableSorting: false,
        },
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: allColumns as typeof columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnFilters,
      globalFilter,
      pagination,
    },
    enableRowSelection,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next);
      onSortingChange?.(next);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      onRowSelectionChange?.(next);
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: (value) => {
      setGlobalFilter(value as string);
      onGlobalFilterChange?.(value as string);
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: Boolean(onPageChange),
    pageCount: onPageChange && totalCount
      ? Math.ceil(totalCount / pagination.pageSize)
      : undefined,
  });

  const selectedCount = Object.keys(rowSelection).length;
  const effectiveTotal = totalCount ?? data.length;

  // Skeleton rows during loading
  const skeletonRows = Array.from({ length: pagination.pageSize > 10 ? 10 : pagination.pageSize });

  return (
    <div className={styles.wrapper}>
      <DataTableToolbar
        globalFilter={globalFilter}
        onGlobalFilterChange={(val) => {
          setGlobalFilter(val);
          onGlobalFilterChange?.(val);
        }}
        table={table}
        enableGlobalFilter={enableGlobalFilter}
        enableColumnVisibility={enableColumnVisibility}
        selectedCount={selectedCount}
        bulkActions={bulkActions}
        rowSelection={rowSelection}
      />

      <div className={styles.tableContainer}>
        <table className={styles.table} aria-busy={isLoading}>
          <thead className={cn(styles.thead, stickyHeader && styles['thead--sticky'])}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = enableSorting && header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={styles.th}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      aria-sort={
                        sorted === 'asc' ? 'ascending' :
                        sorted === 'desc' ? 'descending' : 'none'
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(styles.thContent, canSort && styles['thContent--sortable'])}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          role={canSort ? 'button' : undefined}
                          tabIndex={canSort ? 0 : undefined}
                          onKeyDown={canSort ? (e) => { if (e.key === 'Enter') header.column.getToggleSortingHandler()?.(e); } : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className={styles.sortIcon} aria-hidden="true">
                              {sorted === 'asc' ? <ChevronUp size={12} /> :
                               sorted === 'desc' ? <ChevronDown size={12} /> :
                               <ChevronsUpDown size={12} className={styles.sortIconNeutral} />}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className={styles.tbody}>
            {isLoading ? (
              skeletonRows.map((_, i) => (
                <tr key={i} className={styles.tr}>
                  {allColumns.map((_, j) => (
                    <td key={j} className={styles.td}>
                      <Skeleton variant="text" height={14} />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length} className={styles.emptyCell}>
                  <EmptyState
                    title={emptyStateTitle}
                    description={emptyStateDescription}
                  />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(styles.tr, row.getIsSelected() && styles['tr--selected'])}
                  aria-selected={row.getIsSelected()}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={styles.td}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        totalCount={effectiveTotal}
        onPageChange={(page) => {
          setPagination((p) => ({ ...p, pageIndex: page }));
          onPageChange?.(page);
        }}
        onPageSizeChange={(size) => {
          setPagination({ pageIndex: 0, pageSize: size });
          onPageSizeChange?.(size);
        }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
      />
    </div>
  );
}

// Import cn locally to avoid issues
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
