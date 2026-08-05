import React from 'react';
import { cn } from '@/lib/utils';
import { Filter } from 'lucide-react';
import styles from './FilterBar.module.css';

export interface FilterBarProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({ children, onClearAll, className }: FilterBarProps) {
  return (
    <div className={cn(styles.wrapper, className)}>
      <div className={styles.label}>
        <Filter size={14} />
        <span>Filters:</span>
      </div>
      <div className={styles.filters}>
        {children}
      </div>
      {onClearAll && (
        <button type="button" onClick={onClearAll} className={styles.clearBtn}>
          Clear all
        </button>
      )}
    </div>
  );
}
