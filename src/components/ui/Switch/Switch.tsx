import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import styles from './Switch.module.css';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, helperText, className, id, disabled, ...props }, ref) => {
    const switchId = id || React.useId();

    return (
      <div className={cn(styles.wrapper, disabled && styles['wrapper--disabled'], className)}>
        <label htmlFor={switchId} className={styles.label}>
          <div className={styles.switchContainer}>
            <input
              type="checkbox"
              id={switchId}
              ref={ref}
              disabled={disabled}
              className={styles.input}
              role="switch"
              {...props}
            />
            <div className={styles.track}>
              <div className={styles.thumb} />
            </div>
          </div>
          {label && <span className={styles.labelText}>{label}</span>}
        </label>
        {helperText && <span className={styles.helperText}>{helperText}</span>}
      </div>
    );
  }
);
Switch.displayName = 'Switch';
