import React from 'react';
import { cn } from '@/lib/utils';
import type { SemanticColor } from '@/types/index';
import styles from './Badge.module.css';

export type BadgeVariant = SemanticColor | 'primary';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

/**
 * Inline label for categorization and status display.
 * Not for operational status — use StatusBadge for that.
 */
export function Badge({ variant = 'neutral', size = 'md', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        styles.badge,
        styles[`badge--${variant}`],
        styles[`badge--${size}`],
        className
      )}
    >
      {children}
    </span>
  );
}
