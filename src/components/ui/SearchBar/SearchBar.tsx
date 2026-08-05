import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import styles from './SearchBar.module.css';

export interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  fullWidth?: boolean;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange, onClear, fullWidth = false, className, ...props }, ref) => {
    return (
      <div className={cn(styles.wrapper, fullWidth && styles['wrapper--fullWidth'], className)}>
        <Search size={16} className={styles.icon} aria-hidden="true" />
        <input
          type="search"
          ref={ref}
          value={value}
          onChange={onChange}
          className={styles.input}
          aria-label="Search"
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className={styles.clearBtn}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }
);
SearchBar.displayName = 'SearchBar';
