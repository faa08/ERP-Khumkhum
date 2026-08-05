import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import styles from './Input.module.css';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  error?: string;
  success?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightElement?: React.ReactNode; // for buttons inside input (show/hide password)
  fullWidth?: boolean;
}

/**
 * Text input field. Supports validation states, icons, helper text.
 * All form fields use this as the base input.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      error,
      success,
      helperText,
      leftIcon,
      rightIcon,
      rightElement,
      fullWidth = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const hasSuccess = Boolean(success) && !hasError;

    return (
      <div
        className={cn(
          styles.wrapper,
          fullWidth && styles['wrapper--full']
        )}
      >
        <div className={styles.inputWrapper}>
          {leftIcon && (
            <span className={styles.leftIcon} aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error ? 'input-error' : helperText ? 'input-helper' : undefined
            }
            className={cn(
              styles.input,
              styles[`input--${size}`],
              leftIcon && styles['input--hasLeft'],
              (rightIcon || rightElement) && styles['input--hasRight'],
              hasError && styles['input--error'],
              hasSuccess && styles['input--success'],
              disabled && styles['input--disabled'],
              className
            )}
            {...props}
          />
          {rightElement ? (
            <span className={styles.rightElement}>{rightElement}</span>
          ) : rightIcon ? (
            <span className={styles.rightIcon} aria-hidden="true">
              {rightIcon}
            </span>
          ) : null}
        </div>
        {error && (
          <p id="input-error" className={styles.errorText} role="alert">
            {error}
          </p>
        )}
        {success && !error && (
          <p className={styles.successText}>{success}</p>
        )}
        {helperText && !error && !success && (
          <p id="input-helper" className={styles.helperText}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
