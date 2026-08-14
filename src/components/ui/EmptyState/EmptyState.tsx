import React from 'react';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Empty state for data tables, lists, and pages with no content.
 * Always explain WHY it's empty and what the user can do about it.
 */
export function EmptyState({
  title = 'Tidak ada data',
  description = 'Tidak ada rekam jejak untuk ditampilkan.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(styles.container, className)} aria-label={title}>
      <div className={styles.iconWrapper} aria-hidden="true">
        {icon ?? <Package size={28} strokeWidth={1.5} />}
      </div>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick} className={styles.action}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
