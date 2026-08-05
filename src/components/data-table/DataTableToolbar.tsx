'use client';

import React from 'react';
import type { Table } from '@tanstack/react-table';
import type { RowSelectionState } from '@tanstack/react-table';
import type { BulkAction } from '@/types/table';
import { Button } from '@/components/ui/Button';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import styles from './DataTable.module.css';

interface DataTableToolbarProps<TData> {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  table: Table<TData>;
  enableGlobalFilter: boolean;
  enableColumnVisibility: boolean;
  selectedCount: number;
  bulkActions?: BulkAction[];
  rowSelection: RowSelectionState;
}

export function DataTableToolbar<TData>({
  globalFilter,
  onGlobalFilterChange,
  table,
  enableGlobalFilter,
  enableColumnVisibility,
  selectedCount,
  bulkActions,
  rowSelection,
}: DataTableToolbarProps<TData>) {
  const showBulkActions = selectedCount > 0 && bulkActions && bulkActions.length > 0;

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        {enableGlobalFilter && (
          <div className={styles.searchWrapper}>
            <Search size={14} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              value={globalFilter}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
              placeholder="Search..."
              aria-label="Search table"
              className={styles.searchInput}
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => onGlobalFilterChange('')}
                aria-label="Clear search"
                className={styles.searchClear}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {showBulkActions && (
          <div className={styles.bulkActions}>
            <span className={styles.selectedCount}>{selectedCount} selected</span>
            {bulkActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant === 'danger' ? 'danger' : 'secondary'}
                size="sm"
                leftIcon={action.icon}
                onClick={() => action.onClick(Object.keys(rowSelection))}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.toolbarRight}>
        {enableColumnVisibility && (
          <div className={styles.columnToggle}>
            <button
              type="button"
              className={styles.columnToggleBtn}
              aria-label="Toggle column visibility"
              title="Columns"
            >
              <SlidersHorizontal size={14} />
              <span>Columns</span>
            </button>
            <div className={styles.columnDropdown}>
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <label key={col.id} className={styles.columnOption}>
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                      className={styles.columnCheckbox}
                    />
                    <span>{typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}</span>
                  </label>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
