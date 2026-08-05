import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import styles from './DatePicker.module.css';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean | string;
  fullWidth?: boolean;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ error, fullWidth = false, className, disabled, ...props }, ref) => {
    return (
      <div className={cn(styles.wrapper, fullWidth && styles['wrapper--fullWidth'], className)}>
        <input
          type="date"
          ref={ref}
          disabled={disabled}
          className={cn(
            styles.input,
            error && styles['input--error'],
            disabled && styles['input--disabled']
          )}
          {...props}
        />
        <Calendar size={14} className={styles.icon} aria-hidden="true" />
      </div>
    );
  }
);
DatePicker.displayName = 'DatePicker';
