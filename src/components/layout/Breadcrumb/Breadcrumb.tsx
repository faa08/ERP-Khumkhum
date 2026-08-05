import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { BreadcrumbItem } from '@/types/index';
import { cn } from '@/lib/utils';
import styles from './Breadcrumb.module.css';

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn(styles.nav, className)}>
      <ol className={styles.list} role="list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className={styles.item}>
              {!isLast && item.href ? (
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(styles.label, isLast && styles['label--current'])}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight size={12} className={styles.separator} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
