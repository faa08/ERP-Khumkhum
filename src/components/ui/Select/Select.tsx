import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { SelectOption } from '@/types/index';
import styles from './Select.module.css';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, error, helperText, fullWidth = false, size = 'md', disabled, className, ...props }, ref) => {
    const hasError = Boolean(error);
    return (
      <div className={cn(styles.wrapper, fullWidth && styles['wrapper--full'])}>
        <div className={styles.selectWrapper}>
          <select
            ref={ref}
            disabled={disabled}
            aria-invalid={hasError}
            className={cn(
              styles.select,
              styles[`select--${size}`],
              hasError && styles['select--error'],
              disabled && styles['select--disabled'],
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className={styles.chevron} aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
        {error && <p className={styles.errorText} role="alert">{error}</p>}
        {helperText && !error && <p className={styles.helperText}>{helperText}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
