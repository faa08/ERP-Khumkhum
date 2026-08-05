import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Card.module.css';

export interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

/**
 * Content container card.
 * Used for grouping related content in forms, detail pages, and dashboard widgets.
 */
export function Card({ children, header, footer, padding = 'md', className, headerClassName, bodyClassName, footerClassName }: CardProps) {
  return (
    <div className={cn(styles.card, className)}>
      {header && <div className={cn(styles.header, headerClassName)}>{header}</div>}
      <div className={cn(styles.body, styles[`body--${padding}`], bodyClassName)}>{children}</div>
      {footer && <div className={cn(styles.footer, footerClassName)}>{footer}</div>}
    </div>
  );
}
