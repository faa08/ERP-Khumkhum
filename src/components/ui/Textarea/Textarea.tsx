import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import styles from './Textarea.module.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, helperText, fullWidth = false, resize = 'vertical', disabled, className, ...props }, ref) => {
    const hasError = Boolean(error);
    return (
      <div className={cn(styles.wrapper, fullWidth && styles['wrapper--full'])}>
        <textarea
          ref={ref}
          disabled={disabled}
          aria-invalid={hasError}
          className={cn(
            styles.textarea,
            hasError && styles['textarea--error'],
            disabled && styles['textarea--disabled'],
            className
          )}
          style={{ resize }}
          {...props}
        />
        {error && <p className={styles.errorText} role="alert">{error}</p>}
        {helperText && !error && <p className={styles.helperText}>{helperText}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
