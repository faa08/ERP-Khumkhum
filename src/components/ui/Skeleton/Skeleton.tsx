import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  variant?: 'text' | 'block' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number; // for variant='text', render multiple lines
}

export function Skeleton({ variant = 'block', width, height, className, lines = 1 }: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className={styles.textGroup}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(styles.skeleton, styles['skeleton--text'], className)}
            style={{ width: i === lines - 1 ? '70%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        styles.skeleton,
        styles[`skeleton--${variant}`],
        className
      )}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
      aria-hidden="true"
    />
  );
}

// ─────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className, label = 'Loading...' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(styles.spinner, styles[`spinner--${size}`], className)}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}
