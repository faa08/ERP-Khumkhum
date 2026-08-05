import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Primary interactive element. Used for all user actions.
 * Variant drives visual hierarchy. Only use `primary` for the most important action per view.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          styles.btn,
          styles[`btn--${variant}`],
          styles[`btn--${size}`],
          fullWidth && styles['btn--full'],
          loading && styles['btn--loading'],
          className
        )}
        {...props}
      >
        {loading && (
          <span className={styles.spinner} aria-hidden="true" />
        )}
        {!loading && leftIcon && (
          <span className={styles.icon} aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {children && <span className={styles.label}>{children}</span>}
        {!loading && rightIcon && (
          <span className={styles.icon} aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
