import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import styles from './Pagination.module.css';

export interface PaginationProps {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
}

/**
 * Table pagination controls — first/prev/next/last, current range, page size selector.
 */
export function Pagination({
  pageIndex,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const start = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalCount);

  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.info}>
        <span className={styles.countText}>
          {totalCount === 0 ? 'No results' : `${start}–${end} of ${totalCount}`}
        </span>
      </div>

      <div className={styles.controls}>
        {onPageSizeChange && (
          <div className={styles.pageSizeControl}>
            <span className={styles.pageSizeLabel}>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={styles.pageSizeSelect}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.pageButtons}>
          <button
            onClick={() => onPageChange(0)}
            disabled={pageIndex === 0}
            aria-label="First page"
            className={styles.pageBtn}
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
            aria-label="Previous page"
            className={styles.pageBtn}
          >
            <ChevronLeft size={14} />
          </button>
          <span className={styles.pageInfo}>
            Page {totalPages === 0 ? 0 : pageIndex + 1} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex >= totalPages - 1}
            aria-label="Next page"
            className={styles.pageBtn}
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => onPageChange(totalPages - 1)}
            disabled={pageIndex >= totalPages - 1}
            aria-label="Last page"
            className={styles.pageBtn}
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
