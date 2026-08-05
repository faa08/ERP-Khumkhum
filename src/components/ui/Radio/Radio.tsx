import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import styles from './Radio.module.css';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: boolean;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, helperText, error, className, id, disabled, ...props }, ref) => {
    const radioId = id || React.useId();

    return (
      <div className={cn(styles.wrapper, disabled && styles['wrapper--disabled'], className)}>
        <label htmlFor={radioId} className={styles.label}>
          <input
            type="radio"
            id={radioId}
            ref={ref}
            disabled={disabled}
            className={cn(styles.radio, error && styles['radio--error'])}
            {...props}
          />
          {label && <span className={styles.labelText}>{label}</span>}
        </label>
        {helperText && !error && <span className={styles.helperText}>{helperText}</span>}
        {error && typeof error === 'string' && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }
);
Radio.displayName = 'Radio';
