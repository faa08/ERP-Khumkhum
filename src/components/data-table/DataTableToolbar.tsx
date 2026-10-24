'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Table } from '@tanstack/react-table';
import type { RowSelectionState } from '@tanstack/react-table';
import type { BulkAction, DateFilterOption, DateSortOption } from '@/types/table';
import { Button } from '@/components/ui/Button';
import { SlidersHorizontal, Search, X, Calendar, ArrowDownUp, Check, Clock } from 'lucide-react';
import styles from './DataTable.module.css';

interface DataTableToolbarProps<TData> {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  table: Table<TData>;
  enableGlobalFilter: boolean;
  enableColumnVisibility: boolean;
  enableDateFilter?: boolean;
  dateFilter?: DateFilterOption;
  onDateFilterChange?: (filter: DateFilterOption) => void;
  dateSort?: DateSortOption;
  onDateSortChange?: (sort: DateSortOption) => void;
  selectedCount: number;
  bulkActions?: BulkAction[];
  rowSelection: RowSelectionState;
  toolbarActions?: React.ReactNode;
}

const DATE_FILTER_OPTIONS: { id: DateFilterOption; label: string }[] = [
  { id: 'ALL', label: 'Semua Waktu' },
  { id: 'TODAY', label: 'Hari Ini' },
  { id: 'THIS_WEEK', label: 'Minggu Ini' },
  { id: 'THIS_MONTH', label: 'Bulan Ini' },
  { id: 'LAST_MONTH', label: 'Bulan Lalu' },
];

export function DataTableToolbar<TData>({
  globalFilter,
  onGlobalFilterChange,
  table,
  enableGlobalFilter,
  enableColumnVisibility,
  enableDateFilter = false,
  dateFilter = 'ALL',
  onDateFilterChange,
  dateSort = 'NEWEST',
  onDateSortChange,
  selectedCount,
  bulkActions,
  rowSelection,
  toolbarActions,
}: DataTableToolbarProps<TData>) {
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);
  const showBulkActions = selectedCount > 0 && bulkActions && bulkActions.length > 0;

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target as Node)) {
        setIsDateMenuOpen(false);
      }
    }
    if (isDateMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDateMenuOpen]);

  const activeFilterLabel = DATE_FILTER_OPTIONS.find(o => o.id === dateFilter)?.label || 'Semua Waktu';
  const isFilterActive = dateFilter !== 'ALL';

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
              placeholder="Cari..."
              aria-label="Cari tabel"
              className={styles.searchInput}
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => onGlobalFilterChange('')}
                aria-label="Hapus pencarian"
                className={styles.searchClear}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {showBulkActions && (
          <div className={styles.bulkActions}>
            <span className={styles.selectedCount}>{selectedCount} terpilih</span>
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
        {toolbarActions}

        {/* ── DROPDOWN FILTER & SORTING WAKTU (PENGGANTI KOLOM UNTUK DATA OPERASIONAL) ── */}
        {enableDateFilter && (
          <div className={styles.columnToggle} ref={dateMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className={styles.columnToggleBtn}
              onClick={() => setIsDateMenuOpen(prev => !prev)}
              aria-label="Filter & Urutan Waktu"
              title="Filter & Urutkan Berdasarkan Waktu"
              style={{
                borderColor: isFilterActive ? 'var(--color-primary-400)' : undefined,
                backgroundColor: isFilterActive ? 'var(--color-primary-50)' : undefined,
                color: isFilterActive ? 'var(--color-primary-800)' : undefined,
                fontWeight: isFilterActive ? 600 : undefined,
                gap: '6px',
              }}
            >
              <Calendar size={14} className={isFilterActive ? 'text-[var(--color-primary-600)]' : undefined} />
              <span>{activeFilterLabel}</span>
              {dateSort === 'OLDEST' && (
                <span style={{ fontSize: '10px', opacity: 0.75 }}>↑ Lama</span>
              )}
            </button>

            {isDateMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 4px)',
                  zIndex: 250,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: '8px',
                  minWidth: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {/* HEADER FILTER WAKTU */}
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  padding: '2px 6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <Clock size={12} />
                  <span>Periode Waktu</span>
                </div>

                {DATE_FILTER_OPTIONS.map((opt) => {
                  const isSelected = dateFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onDateFilterChange?.(opt.id);
                        setIsDateMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        border: 'none',
                        background: isSelected ? 'var(--color-primary-50)' : 'transparent',
                        color: isSelected ? 'var(--color-primary-800)' : 'var(--text-primary)',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface-2)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={14} className="text-[var(--color-primary-600)]" />}
                    </button>
                  );
                })}

                {/* DIVIDER */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

                {/* HEADER SORTING WAKTU */}
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  padding: '2px 6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <ArrowDownUp size={12} />
                  <span>Urutan Waktu</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onDateSortChange?.('NEWEST');
                    setIsDateMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    border: 'none',
                    background: dateSort === 'NEWEST' ? 'var(--color-primary-50)' : 'transparent',
                    color: dateSort === 'NEWEST' ? 'var(--color-primary-800)' : 'var(--text-primary)',
                    fontWeight: dateSort === 'NEWEST' ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>Terbaru ke Terlama</span>
                  {dateSort === 'NEWEST' && <Check size={14} className="text-[var(--color-primary-600)]" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDateSortChange?.('OLDEST');
                    setIsDateMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    border: 'none',
                    background: dateSort === 'OLDEST' ? 'var(--color-primary-50)' : 'transparent',
                    color: dateSort === 'OLDEST' ? 'var(--color-primary-800)' : 'var(--text-primary)',
                    fontWeight: dateSort === 'OLDEST' ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>Terlama ke Terbaru</span>
                  {dateSort === 'OLDEST' && <Check size={14} className="text-[var(--color-primary-600)]" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TOMBOL KOLOM LAMA (HANYA AKTIF JIKA BUKAN TABEL DATE FILTER) ── */}
        {!enableDateFilter && enableColumnVisibility && (
          <div className={styles.columnToggle}>
            <button
              type="button"
              className={styles.columnToggleBtn}
              aria-label="Tampilkan/sembunyikan kolom"
              title="Kolom"
            >
              <SlidersHorizontal size={14} />
              <span>Kolom</span>
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
