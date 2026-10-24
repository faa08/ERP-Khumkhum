'use client';

import React, { useState, useMemo } from 'react';
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
import type { DataTableProps, DateFilterOption, DateSortOption } from '@/types/table';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Checkbox } from '@/components/ui/Checkbox';
import { Pagination } from '@/components/ui/Pagination';
import { DataTableToolbar } from './DataTableToolbar';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import styles from './DataTable.module.css';

function extractDateFromItem(item: any, specifiedField?: string): Date | null {
  if (!item || typeof item !== 'object') return null;
  if (specifiedField && item[specifiedField]) {
    const d = new Date(item[specifiedField]);
    return isNaN(d.getTime()) ? null : d;
  }
  const dateKeys = [
    'packed_at',
    'created_at',
    'date',
    'movement_date',
    'inspection_date',
    'entry_date',
    'order_date',
    'sorting_date',
    'timestamp',
    'updated_at',
  ];
  for (const k of dateKeys) {
    if (item[k]) {
      const d = new Date(item[k]);
      if (!isNaN(d.getTime())) return d;
    }
  }
  if (item.order?.created_at) {
    const d = new Date(item.order.created_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.production_order?.created_at) {
    const d = new Date(item.production_order.created_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (item.batch?.created_at) {
    const d = new Date(item.batch.created_at);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

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
  enableDateFilter,
  dateField,
  defaultDateFilter,
  defaultDateSort,
  bulkActions,
  emptyStateTitle = 'Tidak ada data ditemukan',
  emptyStateDescription = 'Tidak ada rekam jejak yang cocok dengan kriteria pencarian Anda.',
  stickyHeader = true,
  toolbarActions,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>(defaultDateFilter ?? 'ALL');
  const [dateSort, setDateSort] = useState<DateSortOption>(defaultDateSort ?? 'NEWEST');
  const [pagination, setPagination] = useState({
    pageIndex: controlledPageIndex ?? 0,
    pageSize: controlledPageSize ?? DEFAULT_PAGE_SIZE,
  });

  const pathname = usePathname();
  const isMasterPage = pathname?.includes('/master') ?? false;

  // Cek apakah tabel ini mendukung date filter (halaman operasional & transaksi otomatis dapat, master data dilewati)
  const shouldEnableDateFilter = useMemo(() => {
    if (enableDateFilter !== undefined) return enableDateFilter;
    if (isMasterPage) return false;
    return true;
  }, [enableDateFilter, isMasterPage]);

  // Filter & Sort Data berdasarkan Waktu
  const processedData = useMemo(() => {
    if (!shouldEnableDateFilter) return data;

    let result = [...data];

    // Filter Periode
    if (dateFilter !== 'ALL') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (dateFilter === 'TODAY') {
        startDate = startOfDay(now);
        endDate = endOfDay(now);
      } else if (dateFilter === 'THIS_WEEK') {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
      } else if (dateFilter === 'THIS_MONTH') {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
      } else if (dateFilter === 'LAST_MONTH') {
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
      }

      result = result.filter((item) => {
        const itemDate = extractDateFromItem(item, dateField);
        if (!itemDate) return true;
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    // Sorting Waktu
    if (dateSort) {
      result.sort((a, b) => {
        const dateA = extractDateFromItem(a, dateField);
        const dateB = extractDateFromItem(b, dateField);
        if (!dateA || !dateB) return 0;
        const diff = dateB.getTime() - dateA.getTime();
        return dateSort === 'NEWEST' ? diff : -diff;
      });
    }

    return result;
  }, [data, shouldEnableDateFilter, dateFilter, dateSort, dateField]);

  const allColumns = enableRowSelection
    ? [
        {
          id: 'select',
          header: ({ table }: { table: any }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={table.getIsSomePageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              aria-label="Select all rows"
            />
          ),
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
    data: processedData,
    columns: allColumns as typeof columns,
    getRowId: (row: any, index: number) => (row?.id != null ? String(row.id) : String(index)),
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
  const effectiveTotal = totalCount ?? processedData.length;

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
        enableColumnVisibility={enableColumnVisibility && !shouldEnableDateFilter}
        enableDateFilter={shouldEnableDateFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        dateSort={dateSort}
        onDateSortChange={setDateSort}
        selectedCount={selectedCount}
        bulkActions={bulkActions}
        rowSelection={rowSelection}
        toolbarActions={toolbarActions}
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
