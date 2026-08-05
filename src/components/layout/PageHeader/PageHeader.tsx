import React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import type { BreadcrumbItem } from '@/types/index';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard page header. Use on every ERP page.
 * Contains: breadcrumb, page title (h1), optional description, optional action buttons.
 */
export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(styles.header, className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} className={styles.breadcrumb} />
      )}
      <div className={styles.row}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
