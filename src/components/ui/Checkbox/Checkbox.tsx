import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  helperText?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, helperText, error, indeterminate, className, disabled, id, ...props }, ref) => {
    const checkboxRef = React.useCallback(
      (el: HTMLInputElement | null) => {
        if (el) el.indeterminate = indeterminate ?? false;
        if (typeof ref === 'function') ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      },
      [indeterminate, ref]
    );

    return (
      <div className={cn(styles.wrapper, disabled && styles['wrapper--disabled'])}>
        <label className={styles.label} htmlFor={id}>
          <input
            ref={checkboxRef}
            id={id}
            type="checkbox"
            disabled={disabled}
            aria-invalid={Boolean(error)}
            className={cn(styles.checkbox, error && styles['checkbox--error'], className)}
            {...props}
          />
          {label && <span className={styles.labelText}>{label}</span>}
        </label>
        {error && <p className={styles.errorText} role="alert">{error}</p>}
        {helperText && !error && <p className={styles.helperText}>{helperText}</p>}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
