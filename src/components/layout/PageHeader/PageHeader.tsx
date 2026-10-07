import React from 'react';
import { cn } from '@/lib/utils';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title?: string;
  description?: string;
  breadcrumbs?: any;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, actions, className }: PageHeaderProps) {
  if (!title && !actions) return null;

  return (
    <div className={cn(styles.header, className)}>
      <div className={styles.row}>
        {title && (
          <div className={styles.titleContainer}>
            <h1 className={styles.title}>{title}</h1>
          </div>
        )}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
