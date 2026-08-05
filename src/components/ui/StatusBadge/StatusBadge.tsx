import React from 'react';
import { cn, getInitials } from '@/lib/utils';
import type { SemanticColor } from '@/types/index';
import { STATUS_COLOR_MAP } from '@/lib/constants';
import styles from './StatusBadge.module.css';

export interface StatusBadgeProps {
  status: string;
  label?: string; // override display label
  className?: string;
}

/**
 * Dot + label badge for operational statuses.
 * Color is derived automatically from STATUS_COLOR_MAP.
 * Used in data tables and detail views for Production, Inventory, QC, etc.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const color: SemanticColor = STATUS_COLOR_MAP[status] ?? 'neutral';
  const displayLabel = label ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={cn(styles.badge, styles[`badge--${color}`], className)}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{displayLabel}</span>
    </span>
  );
}

// ─────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <div className={cn(styles.avatar, styles[`avatar--${size}`], className)} aria-label={name}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className={styles.avatarImg} />
      ) : (
        <span className={styles.avatarInitials} aria-hidden="true">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
